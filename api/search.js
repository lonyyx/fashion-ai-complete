import axios from 'axios';

// DeepSeek API настройки
const DEEPSEEK_API_KEY = process.env.sk-09cf035460ce4448bbd6357a9fbfb702;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Обрабатываем preflight запрос
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 🔥 ОБРАБОТКА GET ЗАПРОСОВ
  if (req.method === 'GET') {
    try {
      // Если есть query параметр, выполняем поиск
      const { query, test } = req.query;
      
      if (test === 'true') {
        // Тестовый режим - возвращаем демо-данные
        const demoProducts = await generateDemoProducts();
        return res.status(200).json({
          success: true,
          message: 'FashionAI API is working! Test mode.',
          products: demoProducts,
          query: query || 'test query',
          total: demoProducts.length
        });
      }
      
      if (query) {
        // Выполняем поиск по GET параметру
        console.log('🔍 GET Search query:', query);
        const aiAnalysis = await analyzeWithDeepSeek(query);
        const products = await generateProductsWithAI(aiAnalysis, query);
        const assistantResponse = await generateAssistantResponse(query, products, aiAnalysis);
        
        return res.status(200).json({
          success: true,
          products: products,
          ai_analysis: aiAnalysis,
          assistant_response: assistantResponse,
          query: query,
          total: products.length,
          message: 'GET search completed successfully'
        });
      }
      
      // Простой статус API
      return res.status(200).json({
        success: true,
        message: '🎯 FashionAI API is working!',
        version: '1.0',
        endpoints: {
          'GET /api/search': 'API status and simple search',
          'GET /api/search?query=джинсы': 'Search with query parameter',
          'GET /api/search?test=true': 'Test mode with demo data',
          'POST /api/search': 'Advanced search with AI analysis'
        },
        usage: {
          get: 'Send GET request with query parameter: /api/search?query=джинсы+до+5000',
          post: 'Send POST request with JSON body: {"query": "джинсы до 5000"}'
        },
        example: {
          query: "подбери джинсы до 5000 рублей"
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ GET handler error:', error);
      return res.status(500).json({
        success: false,
        error: 'API error',
        message: error.message
      });
    }
  }

  
  if (req.method === 'POST') {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ 
          success: false, 
          error: 'Введите запрос для поиска одежды' 
        });
      }

      console.log('🔍 POST Search query:', query);

      // 🔥 НАСТОЯЩИЙ ИИ АНАЛИЗ
      const aiAnalysis = await analyzeWithDeepSeek(query);
      console.log('🤖 AI Analysis:', aiAnalysis);

      // 🔥 ГЕНЕРАЦИЯ ТОВАРОВ НА ОСНОВЕ ИИ
      const products = await generateProductsWithAI(aiAnalysis, query);
      
      // 🔥 ОТВЕТ ПОМОЩНИКА С ИИ
      const assistantResponse = await generateAssistantResponse(query, products, aiAnalysis);

      res.status(200).json({
        success: true,
        products: products,
        ai_analysis: aiAnalysis,
        assistant_response: assistantResponse,
        query: query,
        total: products.length,
        message: 'AI поиск завершен успешно'
      });

    } catch (error) {
      console.error('❌ DeepSeek AI error:', error);
      
      // Fallback на обычный поиск
      const fallbackProducts = await fallbackSearch(req.body?.query || 'одежда');
      const fallbackResponse = "Использую базовый поиск. AI временно недоступен.";
      
      res.status(200).json({
        success: true,
        products: fallbackProducts,
        assistant_response: fallbackResponse,
        query: req.body?.query,
        total: fallbackProducts.length,
        message: 'Базовый поиск (AI недоступен)'
      });
    }
  } else {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
}

// 🔥 ОСНОВНАЯ ФУНКЦИЯ ИИ АНАЛИЗА
async function analyzeWithDeepSeek(userQuery) {
  // Если API ключа нет, используем fallback
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-09cf035460ce4448bbd6357a9fbfb702') {
    console.log('⚠️ Using fallback analysis (no API key)');
    return analyzeWithRules(userQuery);
  }

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Ты - AI помощник для поиска одежды. Проанализируй запрос и верни ТОЛЬКО JSON.
          
          Структура JSON:
          {
            "clothing_type": "t-shirt/jeans/jacket/dress/shorts/shirt/sweater/shoes",
            "materials": ["хлопок", "деним", "шерсть", "синтетика"],
            "price_range": {"min": число, "max": число},
            "colors": ["черный", "синий", "белый", "серый"],
            "style": "casual/sport/formal/streetwear/classic",
            "season": "winter/summer/spring/autumn/all",
            "gender": "male/female/unisex",
            "keywords": "ключевые слова для фото на английском",
            "description": "краткое описание на русском"
          }
          
          Пример для "теплые джинсы для зимы до 5000":
          {
            "clothing_type": "jeans",
            "materials": ["деним", "хлопок"],
            "price_range": {"min": 1000, "max": 5000},
            "colors": ["синий", "черный"],
            "style": "casual", 
            "season": "winter",
            "gender": "unisex",
            "keywords": "warm jeans winter fashion",
            "description": "теплые джинсы для зимы"
          }`
        },
        {
          role: "user",
          content: userQuery
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" }
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const aiResponse = response.data.choices[0].message.content;
    console.log('📨 DeepSeek RAW response:', aiResponse);
    
    const parsedAnalysis = JSON.parse(aiResponse);
    return parsedAnalysis;
    
  } catch (error) {
    console.error('❌ DeepSeek API error:', error.response?.data || error.message);
    throw new Error('AI service unavailable');
  }
}

// 🔥 ГЕНЕРАЦИЯ ТОВАРОВ С ИИ
async function generateProductsWithAI(aiAnalysis, originalQuery) {
  const products = [];
  const productCount = 6 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < productCount; i++) {
    const product = await generateAIProduct(aiAnalysis, i, originalQuery);
    products.push(product);
  }
  
  // Сортируем по релевантности
  return products.sort((a, b) => b.ai_relevance - a.ai_relevance);
}

// 🔥 ГЕНЕРАЦИЯ ОДНОГО ТОВАРА С ИИ
async function generateAIProduct(aiAnalysis, index, originalQuery) {
  const stores = [
    { name: 'Lamoda', color: '#00a046', domain: 'lamoda.ru' },
    { name: 'Wildberries', color: '#a50034', domain: 'wildberries.ru' },
    { name: 'OZON', color: '#005bff', domain: 'ozon.ru' },
    { name: 'BrandShop', color: '#000000', domain: 'brandshop.ru' }
  ];
  
  const brands = getBrandsByStyle(aiAnalysis.style);
  const store = stores[Math.floor(Math.random() * stores.length)];
  const brand = brands[Math.floor(Math.random() * brands.length)];
  
  // Генерация данных на основе AI анализа
  const price = generateAIPrice(aiAnalysis.price_range);
  const title = generateAITitle(aiAnalysis, brand);
  const photoUrl = await findAIPhoto(aiAnalysis, brand, index);
  
  // Расчет релевантности ИИ
  const relevance = calculateAIRelevance(aiAnalysis, originalQuery);
  
  return {
    id: `ai_${index}_${Date.now()}`,
    title: title,
    price: price,
    oldPrice: Math.random() > 0.6 ? Math.floor(price * 1.3) : null,
    image: photoUrl,
    link: `https://${store.domain}/product/${generateProductSlug(title)}`,
    store: store.name,
    storeColor: store.color,
    rating: (4.0 + Math.random() * 1.0).toFixed(1),
    reviews: Math.floor(Math.random() * 800) + 200,
    inStock: Math.random() > 0.1,
    
    // 🔥 ИИ МЕТАДАННЫЕ
    ai_generated: true,
    ai_relevance: relevance,
    ai_style: aiAnalysis.style,
    ai_season: aiAnalysis.season,
    ai_description: aiAnalysis.description
  };
}

// 🔥 ГЕНЕРАЦИЯ ОТВЕТА ПОМОЩНИКА С ИИ
async function generateAssistantResponse(userQuery, products, aiAnalysis) {
  // Если API ключа нет, используем простой ответ
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-09cf035460ce4448bbd6357a9fbfb702') {
    return `На основе вашего запроса "${userQuery}" я нашёл ${products.length} подходящих вариантов. Все товары соответствуют вашим критериям поиска.`;
  }

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Ты - полезный AI помощник по поиску одежды. Ответь пользователю естественно и дружелюбно на русском.
          Упомяни:
          - Что ты нашел based на его запросе
          - Ключевые параметры (стиль, сезон, бюджет)
          - Количество найденных товаров
          - Давай полезные советы по выбору
          
          Будь конкретным и полезным. Не говори что ты AI.`
        },
        {
          role: "user", 
          content: `Запрос пользователя: "${userQuery}"
          Найдено товаров: ${products.length}
          Параметры поиска: ${aiAnalysis.description}
          Стиль: ${aiAnalysis.style}
          Сезон: ${aiAnalysis.season}
          
          Ответь пользователю:`
        }
      ],
      temperature: 0.7,
      max_tokens: 400
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('❌ DeepSeek assistant error:', error);
    return generateFallbackResponse(userQuery, products, aiAnalysis);
  }
}

// 🛠 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ

function getBrandsByStyle(style) {
  const brandMap = {
    'sport': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour'],
    'casual': ['Zara', 'H&M', 'Uniqlo', 'Mango', 'Reserved'],
    'streetwear': ['Supreme', 'Off-White', 'Balenciaga', 'Stone Island'],
    'formal': ['Hugo Boss', 'Armani', 'Tom Ford', 'Brunello Cucinelli'],
    'classic': ['Lacoste', 'Ralph Lauren', 'Tommy Hilfiger', 'Burberry'],
    'default': ['Nike', 'Adidas', 'Zara', 'H&M', 'Columbia', 'The North Face']
  };
  
  return brandMap[style] || brandMap.default;
}

function generateAIPrice(priceRange) {
  if (priceRange && priceRange.max) {
    const min = priceRange.min || 800;
    return Math.floor(Math.random() * (priceRange.max - min)) + min;
  }
  return Math.floor(Math.random() * 5000) + 1000;
}

function generateAITitle(aiAnalysis, brand) {
  const typeMap = {
    't-shirt': 'Футболка',
    'jeans': 'Джинсы',
    'jacket': 'Куртка', 
    'dress': 'Платье',
    'shorts': 'Шорты',
    'shirt': 'Рубашка',
    'sweater': 'Свитер',
    'shoes': 'Кроссовки'
  };
  
  const clothingType = typeMap[aiAnalysis.clothing_type] || 'Одежда';
  
  let title = `${clothingType} ${brand}`;
  
  // Добавляем особенности из AI анализа
  if (aiAnalysis.style && aiAnalysis.style !== 'casual') {
    const styleMap = {
      'sport': 'спортивная',
      'formal': 'официальная',
      'streetwear': 'стритвир',
      'classic': 'классическая'
    };
    title += ` ${styleMap[aiAnalysis.style] || aiAnalysis.style}`;
  }
  
  if (aiAnalysis.materials && aiAnalysis.materials.length > 0) {
    title += ` из ${aiAnalysis.materials[0]}`;
  }
  
  return title;
}

function calculateAIRelevance(aiAnalysis, originalQuery) {
  let relevance = 0.7; // Базовая релевантность
  
  // Увеличиваем релевантность за совпадения
  const queryLower = originalQuery.toLowerCase();
  if (aiAnalysis.style && queryLower.includes(aiAnalysis.style)) relevance += 0.2;
  if (aiAnalysis.season && queryLower.includes(aiAnalysis.season)) relevance += 0.1;
  if (aiAnalysis.description && queryLower.includes(aiAnalysis.description)) relevance += 0.15;
  
  return Math.min(relevance, 0.95);
}

function generateProductSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9а-яё]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function findAIPhoto(aiAnalysis, brand, index) {
  try {
    // Используем ключевые слова от ИИ для поиска фото
    const searchQuery = aiAnalysis.keywords ? 
      `${aiAnalysis.keywords} ${brand}` : 
      `${aiAnalysis.clothing_type} ${brand} fashion`;
    
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Unsplash без API ключа
    const unsplashUrl = `https://source.unsplash.com/300x200/?${encodedQuery}`;
    return unsplashUrl;
    
  } catch (error) {
    console.log('📸 Photo search error, using fallback');
    return `https://source.unsplash.com/300x200/?fashion,${aiAnalysis.clothing_type}`;
  }
}

function generateFallbackResponse(query, products, aiAnalysis) {
  return `На основе вашего запроса "${query}" я нашёл ${products.length} подходящих вариантов. 
  Ищу ${aiAnalysis.description} в рамках вашего бюджета. 
  Рекомендую обратить внимание на товары с высокими оценками!`;
}

// 🎯 FALLBACK ФУНКЦИИ (если ИИ недоступен)

function analyzeWithRules(userQuery) {
  const lowerQuery = userQuery.toLowerCase();
  
  let clothing_type = 'clothing';
  let style = 'casual';
  let season = 'all';
  let price_range = { min: 800, max: 5000 };
  let materials = ['хлопок'];
  let colors = ['черный', 'синий', 'белый'];
  let gender = 'unisex';
  let description = 'одежду';
  
  // Определяем тип одежды
  if (lowerQuery.includes('джинс')) {
    clothing_type = 'jeans';
    description = 'джинсы';
  } else if (lowerQuery.includes('футбол') || lowerQuery.includes('майк')) {
    clothing_type = 't-shirt';
    description = 'футболки';
  } else if (lowerQuery.includes('курт') || lowerQuery.includes('пальто')) {
    clothing_type = 'jacket';
    description = 'куртки';
  } else if (lowerQuery.includes('шорт')) {
    clothing_type = 'shorts';
    description = 'шорты';
  } else if (lowerQuery.includes('плать')) {
    clothing_type = 'dress';
    description = 'платья';
  } else if (lowerQuery.includes('свитер') || lowerQuery.includes('кофт')) {
    clothing_type = 'sweater';
    description = 'свитеры';
  } else if (lowerQuery.includes('рубаш')) {
    clothing_type = 'shirt';
    description = 'рубашки';
  } else if (lowerQuery.includes('обув') || lowerQuery.includes('кроссовк')) {
    clothing_type = 'shoes';
    description = 'обувь';
  }
  
  // Определяем стиль
  if (lowerQuery.includes('спортив')) style = 'sport';
  else if (lowerQuery.includes('офиц') || lowerQuery.includes('делов')) style = 'formal';
  else if (lowerQuery.includes('повседнев')) style = 'casual';
  
  // Определяем сезон
  if (lowerQuery.includes('зим')) season = 'winter';
  else if (lowerQuery.includes('лет')) season = 'summer';
  else if (lowerQuery.includes('осен')) season = 'autumn';
  else if (lowerQuery.includes('весен')) season = 'spring';
  
  // Определяем бюджет
  const priceMatch = userQuery.match(/(\d+)\s*(тыс|т\.?р|р|руб)/i);
  if (priceMatch) {
    let maxPrice = parseInt(priceMatch[1]);
    if (priceMatch[2].includes('тыс') || priceMatch[2].includes('т')) {
      maxPrice *= 1000;
    }
    price_range.max = maxPrice;
  }
  
  // Генерация ключевых слов для фото
  const keywords = `${clothing_type} ${style} fashion`.toLowerCase();
  
  return {
    clothing_type,
    materials,
    price_range,
    colors,
    style,
    season,
    gender,
    keywords,
    description
  };
}

async function fallbackSearch(query) {
  const analysis = analyzeWithRules(query);
  return generateProductsWithAI(analysis, query);
}

// 🎯 ДЕМО-ДАННЫЕ ДЛЯ ТЕСТИРОВАНИЯ
async function generateDemoProducts() {
  const stores = [
    { name: 'Lamoda', color: '#00a046', domain: 'lamoda.ru' },
    { name: 'Wildberries', color: '#a50034', domain: 'wildberries.ru' },
    { name: 'OZON', color: '#005bff', domain: 'ozon.ru' }
  ];
  
  const products = [];
  
  for (let i = 0; i < 4; i++) {
    const store = stores[i % stores.length];
    const product = {
      id: `demo_${i}`,
      title: i === 0 ? 'Джинсы Nike Classic' : 
             i === 1 ? 'Футболка Adidas Original' : 
             i === 2 ? 'Куртка Columbia Winter' : 'Платье Zara Summer',
      price: [3499, 1899, 7999, 2999][i],
      oldPrice: i === 2 ? 9999 : null,
      image: `https://source.unsplash.com/300x200/?${['jeans', 't-shirt', 'jacket', 'dress'][i]}`,
      link: `https://${store.domain}/product/demo-${i}`,
      store: store.name,
      storeColor: store.color,
      rating: '4.' + (2 + i),
      reviews: [156, 289, 78, 432][i],
      inStock: true,
      ai_generated: false,
      ai_relevance: 0.9 - (i * 0.1)
    };
    products.push(product);
  }
  
  return products;
}
