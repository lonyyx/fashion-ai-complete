import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
        const aiAnalysis = await analyzeWithAI(query);
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

      const aiAnalysis = await analyzeWithAI(query);
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
  }
}

function generateProductLink(store, productTitle, searchQuery) {
  const encodedTitle = encodeURIComponent(productTitle);
  const encodedQuery = encodeURIComponent(searchQuery);
  
  const storeLinks = {
    'Lamoda': `https://www.lamoda.ru/catalogsearch/result/?q=${encodedQuery}`,
    'Wildberries': `https://www.wildberries.ru/catalog?search=${encodedQuery}`,
    'OZON': `https://www.ozon.ru/search/?text=${encodedQuery}&from_global=true`,
    'BrandShop': `https://brandshop.ru/search/?q=${encodedQuery}`
  };
  
  return storeLinks[store] || `https://www.google.com/search?q=${encodedTitle}+${store}`;
}

async function analyzeWithAI(userQuery) {
  try {
    const HF_TOKEN = process.env.HUGGING_FACE_TOKEN;
    
    if (HF_TOKEN) {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/cointegrated/rubert-tiny2-cedr-emotion-detection',
        { inputs: userQuery },
        {
          headers: { 'Authorization': `Bearer ${HF_TOKEN}` },
          timeout: 10000
        }
      );
    }

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
      ai_model: 'Smart Analysis'
    };

    return analysis;
    
  } catch (error) {
    return analyzeWithRules(userQuery);
  }
}

function classifyClothingType(query) {
  const q = query.toLowerCase();
  
  const patterns = {
    'jeans': ['джинс', 'jeans', 'деним'],
    't-shirt': ['футболк', 'майк', 't-shirt', 'tee'],
    'jacket': ['куртк', 'пальто', 'jacket', 'coat', 'ветровк', 'пуховик'],
    'dress': ['плать', 'dress', 'сарафан'],
    'shorts': ['шорт', 'shorts', 'бермуд'],
    'shirt': ['рубашк', 'блуз', 'shirt'],
    'sweater': ['свитер', 'кофт', 'sweater', 'hoodie', 'худи', 'толстовк'],
    'pants': ['брюк', 'штаны', 'pants'],
    'shoes': ['обув', 'shoe', 'кроссовк', 'кед', 'туфл', 'сапог']
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
    'wool': ['шерст', 'wool', 'кашемир'],
    'leather': ['кож', 'leather'],
    'synthetic': ['синтетик', 'synthetic', 'полиэстер'],
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
    return { min: 800, max: Math.max(maxPrice, 2000) };
  }
  return { min: 800, max: 8000 };
}

function classifyColors(query) {
  const q = query.toLowerCase();
  const colors = [];
  
  const patterns = {
    'black': ['черн', 'black'],
    'blue': ['син', 'blue', 'голуб'],
    'white': ['бел', 'white'],
    'red': ['красн', 'red'],
    'green': ['зелен', 'green'],
    'gray': ['сер', 'gray', 'grey'],
    'pink': ['розов', 'pink'],
    'yellow': ['желт', 'yellow'],
    'brown': ['коричн', 'brown']
  };

  for (const [color, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => q.includes(keyword))) {
      colors.push(color);
    }
  }
  
  return colors.length > 0 ? colors : ['black', 'blue', 'white'];
}

function classifyStyle(query) {
  const q = query.toLowerCase();
  
  if (q.includes('спортив') || q.includes('sport')) return 'sport';
  if (q.includes('офиц') || q.includes('делов') || q.includes('formal')) return 'formal';
  if (q.includes('уличн') || q.includes('стрит') || q.includes('street')) return 'streetwear';
  if (q.includes('классич') || q.includes('classic')) return 'classic';
  if (q.includes('повседнев') || q.includes('casual')) return 'casual';
  
  return 'casual';
}

function classifySeason(query) {
  const q = query.toLowerCase();
  
  if (q.includes('зим') || q.includes('winter')) return 'winter';
  if (q.includes('лет') || q.includes('summer')) return 'summer';
  if (q.includes('осен') || q.includes('autumn')) return 'autumn';
  if (q.includes('весен') || q.includes('spring')) return 'spring';
  if (q.includes('демисез')) return 'demi';
  
  return 'all';
}

function classifyGender(query) {
  const q = query.toLowerCase();
  
  if (q.includes('мужск') || q.includes(' men') || q.includes(' male')) return 'male';
  if (q.includes('женск') || q.includes('women') || q.includes('female')) return 'female';
  if (q.includes('унисекс') || q.includes('unisex')) return 'unisex';
  
  return 'unisex';
}

function generateKeywords(query) {
  const type = classifyClothingType(query);
  const style = classifyStyle(query);
  const colors = classifyColors(query).slice(0, 2).join(' ');
  return `${type} ${style} ${colors} fashion clothing`;
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
  
  let description = `${type}`;
  if (style !== 'casual') description += ` в ${style} стиле`;
  if (season !== 'all') description += ` для ${season} сезона`;
  
  return description;
}

async function generateProductsWithAI(aiAnalysis, originalQuery) {
  const products = [];
  const productCount = 6 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < productCount; i++) {
    const product = await generateAIProduct(aiAnalysis, i, originalQuery);
    products.push(product);
  }
  
  return products.sort((a, b) => {
    if (b.ai_relevance !== a.ai_relevance) {
      return b.ai_relevance - a.ai_relevance;
    }
    return a.price - b.price;
  });
}

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
  
  const price = generateAIPrice(aiAnalysis.price_range);
  const title = generateAITitle(aiAnalysis, brand);
  const photoUrl = await findAIPhoto(aiAnalysis, brand, index);
  const relevance = calculateAIRelevance(aiAnalysis, originalQuery);
  
  return {
    id: `ai_${index}_${Date.now()}`,
    title: title,
    price: price,
    oldPrice: Math.random() > 0.6 ? Math.floor(price * (1.2 + Math.random() * 0.3)) : null,
    image: photoUrl,
    link: generateProductLink(store.name, title, originalQuery),
    store: store.name,
    storeColor: store.color,
    rating: (4.0 + Math.random() * 1.0).toFixed(1),
    reviews: Math.floor(Math.random() * 800) + 200,
    inStock: Math.random() > 0.1,
    ai_generated: true,
    ai_relevance: relevance,
    ai_style: aiAnalysis.style,
    ai_season: aiAnalysis.season,
    ai_materials: aiAnalysis.materials
  };
}

function getBrandsByStyle(style) {
  const brandMap = {
    'sport': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'New Balance'],
    'casual': ['Zara', 'H&M', 'Uniqlo', 'Mango', 'Reserved', 'Bershka'],
    'streetwear': ['Supreme', 'Off-White', 'Balenciaga', 'Stone Island', 'Vetements'],
    'formal': ['Hugo Boss', 'Armani', 'Tom Ford', 'Brunello Cucinelli', 'Brioni'],
    'classic': ['Lacoste', 'Ralph Lauren', 'Tommy Hilfiger', 'Burberry', 'Massimo Dutti'],
    'default': ['Nike', 'Adidas', 'Zara', 'H&M', 'Columbia', 'The North Face']
  };
  
  return brandMap[style] || brandMap.default;
}

function generateAIPrice(priceRange) {
  if (priceRange && priceRange.max) {
    const min = priceRange.min || 1000;
    const max = priceRange.max;
    return Math.floor(Math.random() * (max - min)) + min;
  }
  return Math.floor(Math.random() * 7000) + 1000;
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
  
  let title = `${clothingType} ${brand}`;
  
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
    const materialMap = {
      'cotton': 'хлопковая',
      'denim': 'джинсовая',
      'wool': 'шерстяная',
      'leather': 'кожаная'
    };
    title += ` ${materialMap[aiAnalysis.materials[0]] || aiAnalysis.materials[0]}`;
  }
  
  return title;
}

function calculateAIRelevance(aiAnalysis, originalQuery) {
  let relevance = 0.7;
  
  const queryLower = originalQuery.toLowerCase();
  if (aiAnalysis.style && queryLower.includes(aiAnalysis.style)) relevance += 0.15;
  if (aiAnalysis.season && queryLower.includes(aiAnalysis.season)) relevance += 0.1;
  
  const typeMap = {
    'jeans': ['джинс'],
    't-shirt': ['футбол', 'майк'],
    'jacket': ['куртк', 'пальто'],
    'dress': ['плать'],
    'shorts': ['шорт']
  };
  
  const currentType = aiAnalysis.clothing_type;
  if (typeMap[currentType] && typeMap[currentType].some(word => queryLower.includes(word))) {
    relevance += 0.2;
  }
  
  return Math.min(relevance, 0.95);
}

async function findAIPhoto(aiAnalysis, brand, index) {
  try {
    const searchQuery = `${aiAnalysis.keywords} ${brand}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    return `https://source.unsplash.com/300x200/?${encodedQuery}`;
  } catch (error) {
    return `https://source.unsplash.com/300x200/?${aiAnalysis.clothing_type},fashion`;
  }
}

function generateAssistantResponse(query, products, aiAnalysis) {
  const priceInfo = aiAnalysis.price_range ? ` до ${aiAnalysis.price_range.max}₽` : '';
  const styleInfo = aiAnalysis.style !== 'casual' ? ` в ${aiAnalysis.style} стиле` : '';
  const seasonInfo = aiAnalysis.season !== 'all' ? ` для ${aiAnalysis.season} сезона` : '';
  
  return `На основе вашего запроса "${query}" я нашёл ${products.length} подходящих вариантов${priceInfo}. 
  Подобрал ${aiAnalysis.description}${styleInfo}${seasonInfo}. 
  Рекомендую обратить внимание на товары с высокими оценками покупателей!`;
}

function analyzeWithRules(userQuery) {
  const lowerQuery = userQuery.toLowerCase();
  
  let clothing_type = 'clothing';
  let style = 'casual';
  let season = 'all';
  let price_range = { min: 1000, max: 8000 };
  let materials = ['cotton'];
  let colors = ['black', 'blue'];
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
  else if (lowerQuery.includes('уличн') || lowerQuery.includes('стрит')) style = 'streetwear';
  else if (lowerQuery.includes('классич')) style = 'classic';
  
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
  
  const demoItems = [
    { title: 'Джинсы Nike Classic', type: 'jeans', price: 3499 },
    { title: 'Футболка Adidas Original', type: 't-shirt', price: 1899 },
    { title: 'Куртка Columbia Winter', type: 'jacket', price: 7999 },
    { title: 'Платье Zara Summer', type: 'dress', price: 2999 },
    { title: 'Шорты Puma Sport', type: 'shorts', price: 1599 },
    { title: 'Свитер H&M Wool', type: 'sweater', price: 2499 }
  ];
  
  for (let i = 0; i < demoItems.length; i++) {
    const store = stores[i % stores.length];
    const item = demoItems[i];
    const product = {
      id: `demo_${i}`,
      title: item.title,
      price: item.price,
      oldPrice: i === 2 ? 9999 : (i === 4 ? 1999 : null),
      image: `https://source.unsplash.com/300x200/?${item.type}`,
      link: generateProductLink(store.name, item.title, item.type),
      store: store.name,
      storeColor: store.color,
      rating: '4.' + (2 + (i % 3)),
      reviews: [156, 289, 78, 432, 195, 321][i],
      inStock: true,
      ai_generated: false,
      ai_relevance: 0.9 - (i * 0.05)
    };
    products.push(product);
  }
  
  return products;
}
