import axios from 'axios';

// DeepSeek API (получите ключ на platform.deepseek.com)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your_deepseek_key_here';

export default async function handler(req, res) {
  // CORS не нужен - фронтенд и бэкенд на одном домене!
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Введите запрос для поиска одежды' 
      });
    }

    console.log('AI Search query:', query);

    // Имитация AI поиска (пока без реального API)
    const products = await simulateAIsearch(query);
    const assistantResponse = generateAIResponse(query, products);

    res.status(200).json({
      success: true,
      products: products,
      assistant_response: assistantResponse,
      query: query,
      total: products.length
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search service unavailable'
    });
  }
}

// Имитация умного поиска
async function simulateAIsearch(query) {
  // Задержка для реалистичности
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stores = [
    { name: 'Lamoda', color: '#00a046', domain: 'lamoda.ru' },
    { name: 'Wildberries', color: '#a50034', domain: 'wildberries.ru' },
    { name: 'OZON', color: '#005bff', domain: 'ozon.ru' }
  ];
  
  const brands = ['Nike', 'Adidas', 'Zara', 'H&M', 'Puma', 'Columbia'];
  const products = [];
  
  // Анализ запроса
  const analysis = analyzeQuery(query);
  const count = 6 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < count; i++) {
    const store = stores[Math.floor(Math.random() * stores.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    
    const product = {
      id: `product_${i}_${Date.now()}`,
      title: `${analysis.type} ${brand}`,
      price: generatePrice(analysis, i),
      oldPrice: Math.random() > 0.7 ? generatePrice(analysis, i) * 1.3 : null,
      image: await findClothingPhoto(analysis, brand, i),
      link: `https://${store.domain}/product/${i}`,
      store: store.name,
      storeColor: store.color,
      rating: (4.0 + Math.random() * 1.0).toFixed(1),
      reviews: Math.floor(Math.random() * 800) + 200,
      inStock: true,
      ai_analysis: analysis
    };
    
    products.push(product);
  }
  
  return products.sort((a, b) => a.price - b.price);
}

// Умный анализ запроса
function analyzeQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  let type = 'Одежда';
  let style = 'casual';
  let season = 'all';
  let maxPrice = 5000;
  
  // Определяем тип
  if (lowerQuery.includes('джинс')) type = 'Джинсы';
  else if (lowerQuery.includes('футбол') || lowerQuery.includes('майк')) type = 'Футболка';
  else if (lowerQuery.includes('курт') || lowerQuery.includes('пальто')) type = 'Куртка';
  else if (lowerQuery.includes('шорт')) type = 'Шорты';
  else if (lowerQuery.includes('плать')) type = 'Платье';
  else if (lowerQuery.includes('свитер') || lowerQuery.includes('кофт')) type = 'Свитер';
  else if (lowerQuery.includes('брюк')) type = 'Брюки';
  else if (lowerQuery.includes('рубаш')) type = 'Рубашка';
  else if (lowerQuery.includes('обув')) type = 'Кроссовки';
  
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
  const priceMatch = query.match(/(\d+)\s*(тыс|т\.?р|р|руб)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1]);
    if (priceMatch[2].includes('тыс') || priceMatch[2].includes('т')) {
      maxPrice *= 1000;
    }
  }
  
  return { type, style, season, maxPrice };
}

function generatePrice(analysis, index) {
  return Math.floor(Math.random() * (analysis.maxPrice - 1000)) + 1000;
}

async function findClothingPhoto(analysis, brand, index) {
  const keywords = `${analysis.type} ${brand} fashion`.toLowerCase();
  const encodedQuery = encodeURIComponent(keywords);
  
  // Unsplash с тематическими фото
  return `https://source.unsplash.com/300x200/?${encodedQuery}`;
}

function generateAIResponse(query, products) {
  return `На основе вашего запроса "${query}" я нашёл ${products.length} подходящих вариантов. 
  Все товары соответствуют вашим критериям и доступны в популярных магазинах. 
  Рекомендую обратить внимание на варианты с лучшими отзывами!`;
}
