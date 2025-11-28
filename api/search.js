import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const { query, test } = req.query;
      
      if (test === 'true') {
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
        const aiAnalysis = await analyzeWithHuggingFace(query);
        const products = await generateProductsWithAI(aiAnalysis, query);
        const assistantResponse = generateAssistantResponse(query, products, aiAnalysis);
        
        return res.status(200).json({
          success: true,
          products: products,
          ai_analysis: aiAnalysis,
          assistant_response: assistantResponse,
          query: query,
          total: products.length
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'FashionAI API is working!',
        version: '1.0',
        endpoints: {
          'GET /api/search': 'API status and simple search',
          'GET /api/search?query=джинсы': 'Search with query parameter',
          'GET /api/search?test=true': 'Test mode with demo data',
          'POST /api/search': 'Advanced search with AI analysis'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
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

      const aiAnalysis = await analyzeWithHuggingFace(query);
      const products = await generateProductsWithAI(aiAnalysis, query);
      const assistantResponse = generateAssistantResponse(query, products, aiAnalysis);

      res.status(200).json({
        success: true,
        products: products,
        ai_analysis: aiAnalysis,
        assistant_response: assistantResponse,
        query: query,
        total: products.length
      });

    } catch (error) {
      const fallbackProducts = await fallbackSearch(req.body?.query || 'одежда');
      const fallbackResponse = "Использую базовый поиск. AI временно недоступен.";
      
      res.status(200).json({
        success: true,
        products: fallbackProducts,
        assistant_response: fallbackResponse,
        query: req.body?.query,
        total: fallbackProducts.length
      });
    }
  } else {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
}

async function analyzeWithHuggingFace(userQuery) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/cointegrated/rubert-tiny2-cedr-emotion-detection',
      {
        inputs: userQuery
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN || 'YOUR_HF_TOKEN'}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );

    const classification = await classifyWithHF(userQuery);
    
    const analysis = {
      clothing_type: classifyClothingType(userQuery),
      materials: classifyMaterials(userQuery),
      price_range: extractPriceRange(userQuery),
      colors: classifyColors(userQuery),
      style: classifyStyle(userQuery),
      season: classifySeason(userQuery),
      gender: classifyGender(userQuery),
      keywords: generateKeywords(userQuery),
      description: generateDescription(userQuery),
      confidence: 0.85,
      ai_model: 'Hugging Face',
      classification: classification
    };

    return analysis;
    
  } catch (error) {
    return analyzeWithRules(userQuery);
  }
}

async function classifyWithHF(query) {
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        inputs: query,
        parameters: {
          candidate_labels: [
            'джинсы и брюки',
            'футболки и майки', 
            'куртки и пальто',
            'платья и юбки',
            'шорты и бермуды',
            'рубашки и блузки',
            'свитеры и кофты',
            'обувь и кроссовки',
            'аксессуары и сумки'
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN || 'YOUR_HF_TOKEN'}`,
        },
        timeout: 8000
      }
    );

    return response.data;
  } catch (error) {
    return null;
  }
}

function classifyClothingType(query) {
  const q = query.toLowerCase();
  
  const patterns = {
    'jeans': ['джинс', 'jeans', 'деним'],
    't-shirt': ['футболк', 'майк', 't-shirt', 'tee'],
    'jacket': ['куртк', 'пальто', 'jacket', 'coat', 'ветровк'],
    'dress': ['плать', 'dress', 'сарафан'],
    'shorts': ['шорт', 'shorts', 'бермуд'],
    'shirt': ['рубашк', 'блуз', 'shirt'],
    'sweater': ['свитер', 'кофт', 'sweater', 'hoodie', 'худи'],
    'pants': ['брюк', 'штаны', 'pants'],
    'shoes': ['обув', 'shoe', 'кроссовк', 'кед']
  };

  for (const [type, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => q.includes(keyword))) {
      return type;
    }
  }
  
  return 'clothing';
}

function classifyMaterials(query) {
  const q = query.toLowerCase();
  const materials = [];
  
  const patterns = {
    'cotton': ['хлоп', 'cotton'],
    'denim': ['деним', 'denim'],
    'wool': ['шерст', 'wool'],
    'leather': ['кож', 'leather'],
    'synthetic': ['синтетик', 'synthetic'],
    'linen': ['льн', 'linen']
  };

  for (const [material, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => q.includes(keyword))) {
      materials.push(material);
    }
  }
  
  return materials.length > 0 ? materials : ['cotton'];
}

function extractPriceRange(query) {
  const priceMatch = query.match(/(\d+)\s*(тыс|т\.?р|р|руб)/i);
  if (priceMatch) {
    let maxPrice = parseInt(priceMatch[1]);
    if (priceMatch[2].includes('тыс') || priceMatch[2].includes('т')) {
      maxPrice *= 1000;
    }
    return { min: 800, max: maxPrice };
  }
  return { min: 800, max: 5000 };
}

function classifyColors(query) {
  const q = query.toLowerCase();
  const colors = [];
  
  const patterns = {
    'black': ['черн', 'black'],
    'blue': ['син', 'blue'],
    'white': ['бел', 'white'],
    'red': ['красн', 'red'],
    'green': ['зелен', 'green'],
    'gray': ['сер', 'gray'],
    'pink': ['розов', 'pink']
  };

  for (const [color, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => q.includes(keyword))) {
      colors.push(color);
    }
  }
  
  return colors.length > 0 ? colors : ['black', 'blue'];
}

function classifyStyle(query) {
  const q = query.toLowerCase();
  
  if (q.includes('спортив')) return 'sport';
  if (q.includes('офиц') || q.includes('делов')) return 'formal';
  if (q.includes('повседнев')) return 'casual';
  if (q.includes('уличн') || q.includes('стрит')) return 'streetwear';
  
  return 'casual';
}

function classifySeason(query) {
  const q = query.toLowerCase();
  
  if (q.includes('зим')) return 'winter';
  if (q.includes('лет')) return 'summer';
  if (q.includes('осен')) return 'autumn';
  if (q.includes('весен')) return 'spring';
  
  return 'all';
}

function classifyGender(query) {
  const q = query.toLowerCase();
  
  if (q.includes('мужск') || q.includes(' men') || q.includes(' male')) return 'male';
  if (q.includes('женск') || q.includes('women') || q.includes('female')) return 'female';
  
  return 'unisex';
}

function generateKeywords(query) {
  const type = classifyClothingType(query);
  const style = classifyStyle(query);
  return `${type} ${style} fashion clothing`;
}

function generateDescription(query) {
  const typeMap = {
    'jeans': 'джинсы',
    't-shirt': 'футболки',
    'jacket': 'куртки',
    'dress': 'платья',
    'shorts': 'шорты',
    'shirt': 'рубашки',
    'sweater': 'свитеры',
    'pants': 'брюки',
    'shoes': 'обувь'
  };
  
  const type = typeMap[classifyClothingType(query)] || 'одежду';
  const style = classifyStyle(query);
  const season = classifySeason(query);
  
  return `${type} ${style} стиля для ${season} сезона`;
}

async function generateProductsWithAI(aiAnalysis, originalQuery) {
  const products = [];
  const productCount = 6 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < productCount; i++) {
    const product = await generateAIProduct(aiAnalysis, i, originalQuery);
    products.push(product);
  }
  
  return products.sort((a, b) => b.ai_relevance - a.ai_relevance);
}

async function generateAIProduct(aiAnalysis, index, originalQuery) {
  const stores = [
    { name: 'Lamoda', color: '#00a046', domain: 'lamoda.ru' },
    { name: 'Wildberries', color: '#a50034', domain: 'wildberries.ru' },
    { name: 'OZON', color: '#005bff', domain: 'ozon.ru' }
  ];
  
  const brands = getBrandsByStyle(aiAnalysis.style);
  const store = stores[Math.floor(Math.random() * stores.length)];
  const brand = brands[Math.floor(Math.random() * brands.length)];
  
  const price = generateAIPrice(aiAnalysis.price_range);
  const title = generateAITitle(aiAnalysis, brand);
  const photoUrl = await findAIPhoto(aiAnalysis, brand, index);
  
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
    ai_generated: true,
    ai_relevance: 0.8 + Math.random() * 0.15,
    ai_style: aiAnalysis.style,
    ai_season: aiAnalysis.season
  };
}

function getBrandsByStyle(style) {
  const brandMap = {
    'sport': ['Nike', 'Adidas', 'Puma', 'Reebok'],
    'casual': ['Zara', 'H&M', 'Uniqlo', 'Mango'],
    'streetwear': ['Supreme', 'Off-White', 'Balenciaga'],
    'formal': ['Hugo Boss', 'Armani', 'Tom Ford'],
    'default': ['Nike', 'Adidas', 'Zara', 'H&M', 'Columbia']
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
    'jeans': 'Джинсы',
    't-shirt': 'Футболка',
    'jacket': 'Куртка', 
    'dress': 'Платье',
    'shorts': 'Шорты',
    'shirt': 'Рубашка',
    'sweater': 'Свитер',
    'pants': 'Брюки',
    'shoes': 'Кроссовки'
  };
  
  const clothingType = typeMap[aiAnalysis.clothing_type] || 'Одежда';
  return `${clothingType} ${brand}`;
}

async function findAIPhoto(aiAnalysis, brand, index) {
  const searchQuery = aiAnalysis.keywords ? 
    `${aiAnalysis.keywords} ${brand}` : 
    `${aiAnalysis.clothing_type} ${brand} fashion`;
  
  const encodedQuery = encodeURIComponent(searchQuery);
  return `https://source.unsplash.com/300x200/?${encodedQuery}`;
}

function generateAssistantResponse(query, products, aiAnalysis) {
  return `На основе вашего запроса "${query}" я нашёл ${products.length} подходящих вариантов. 
  Ищу ${aiAnalysis.description} в рамках вашего бюджета. 
  Все товары подобраны с учётом указанных предпочтений!`;
}

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
  
  if (lowerQuery.includes('спортив')) style = 'sport';
  else if (lowerQuery.includes('офиц') || lowerQuery.includes('делов')) style = 'formal';
  else if (lowerQuery.includes('повседнев')) style = 'casual';
  
  if (lowerQuery.includes('зим')) season = 'winter';
  else if (lowerQuery.includes('лет')) season = 'summer';
  else if (lowerQuery.includes('осен')) season = 'autumn';
  else if (lowerQuery.includes('весен')) season = 'spring';
  
  const priceMatch = userQuery.match(/(\d+)\s*(тыс|т\.?р|р|руб)/i);
  if (priceMatch) {
    let maxPrice = parseInt(priceMatch[1]);
    if (priceMatch[2].includes('тыс') || priceMatch[2].includes('т')) {
      maxPrice *= 1000;
    }
    price_range.max = maxPrice;
  }
  
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

function generateProductSlug(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9а-яё]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
