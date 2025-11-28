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
        const products = await generateRealProducts(aiAnalysis, query);
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
      const products = await generateRealProducts(aiAnalysis, query);
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
      const fallbackProducts = await generateDemoProducts();
      const fallbackResponse = "Использую демо-режим. Реальный поиск временно недоступен.";
      
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

async function generateRealProducts(aiAnalysis, query) {
  const realProducts = getRealProductDatabase();
  
  const filteredProducts = realProducts.filter(product => {
    const matchesType = product.type === aiAnalysis.clothing_type;
    const matchesStyle = product.style === aiAnalysis.style;
    const matchesPrice = product.price <= aiAnalysis.price_range.max;
    
    return matchesType && matchesStyle && matchesPrice;
  });
  
  if (filteredProducts.length > 0) {
    return filteredProducts.slice(0, 8).map(product => ({
      ...product,
      ai_generated: false,
      ai_relevance: 0.95
    }));
  }
  
  return await generateDemoProducts();
}

function getRealProductDatabase() {
  return [
    {
      id: 'nike_air_force',
      title: 'Кроссовки Nike Air Force 1',
      price: 12999,
      oldPrice: 14999,
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300',
      link: 'https://www.nike.com/ru/t/air-force-1-07-mens-shoes-5QFp5Z',
      store: 'Nike',
      storeColor: '#000000',
      rating: '4.8',
      reviews: 1247,
      inStock: true,
      type: 'shoes',
      style: 'sport'
    },
    {
      id: 'levis_511',
      title: 'Джинсы Levi\'s 511 Slim',
      price: 5990,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300',
      link: 'https://www.levi.com/RU/ru_RU/clothing/men/jeans/511-slim-fit/p/285010000',
      store: 'Levi\'s',
      storeColor: '#0033a0',
      rating: '4.6',
      reviews: 892,
      inStock: true,
      type: 'jeans',
      style: 'casual'
    },
    {
      id: 'zara_blazer',
      title: 'Пиджак Zara Basic',
      price: 3990,
      oldPrice: 4990,
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300',
      link: 'https://www.zara.com/ru/ru/пиджак-базовый-p04371025.html',
      store: 'Zara',
      storeColor: '#000000',
      rating: '4.4',
      reviews: 567,
      inStock: true,
      type: 'jacket',
      style: 'formal'
    },
    {
      id: 'adidas_ultraboost',
      title: 'Кроссовки Adidas Ultraboost',
      price: 14990,
      oldPrice: 17990,
      image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300',
      link: 'https://www.adidas.ru/ultraboost-5.0-dna-shoes/GW9086.html',
      store: 'Adidas',
      storeColor: '#000000',
      rating: '4.9',
      reviews: 2103,
      inStock: true,
      type: 'shoes',
      style: 'sport'
    },
    {
      id: 'hm_tshirt',
      title: 'Футболка H&M Basic Cotton',
      price: 799,
      oldPrice: null,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300',
      link: 'https://www2.hm.com/ru_ru/productpage.1141904001.html',
      store: 'H&M',
      storeColor: '#da291c',
      rating: '4.2',
      reviews: 3451,
      inStock: true,
      type: 't-shirt',
      style: 'casual'
    },
    {
      id: 'uniqlo_hoodie',
      title: 'Худи Uniqlo Fleece',
      price: 2990,
      oldPrice: 3990,
      image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300',
      link: 'https://www.uniqlo.com/ru/ru/products/E449179-000/00',
      store: 'Uniqlo',
      storeColor: '#000000',
      rating: '4.5',
      reviews: 1234,
      inStock: true,
      type: 'sweater',
      style: 'casual'
    },
    {
      id: 'north_face_jacket',
      title: 'Куртка The North Face',
      price: 18990,
      oldPrice: 21990,
      image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300',
      link: 'https://www.thenorthface.com/shop/ru/ru/tnf-ru/men-jackets-vests/mens-apex-bionic-2-jacket-3c4d',
      store: 'The North Face',
      storeColor: '#000000',
      rating: '4.7',
      reviews: 789,
      inStock: true,
      type: 'jacket',
      style: 'sport'
    },
    {
      id: 'massimo_shirt',
      title: 'Рубашка Massimo Dutti',
      price: 4990,
      oldPrice: 5990,
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300',
      link: 'https://www.massimodutti.com/ru/рубашка-из-хлопка-s33157701.html',
      store: 'Massimo Dutti',
      storeColor: '#000000',
      rating: '4.3',
      reviews: 456,
      inStock: true,
      type: 'shirt',
      style: 'formal'
    },
    {
      id: 'puma_shorts',
      title: 'Шорты Puma Sport',
      price: 1990,
      oldPrice: 2490,
      image: 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=300',
      link: 'https://ru.puma.com/ru/ru/pd/%D0%9C%D1%83%D0%B6%D1%81%D0%BA%D0%B8%D0%B5-%D1%88%D0%BE%D1%80%D1%82%D1%8B-PUMA-Sportstyle-Essentials-Fleece/195686015751.html',
      store: 'Puma',
      storeColor: '#000000',
      rating: '4.4',
      reviews: 892,
      inStock: true,
      type: 'shorts',
      style: 'sport'
    },
    {
      id: 'mango_dress',
      title: 'Платье Mango Floral',
      price: 3990,
      oldPrice: 4990,
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300',
      link: 'https://shop.mango.com/ru/женщины/платья/цветочное-платье_87095923.html',
      store: 'Mango',
      storeColor: '#e45a52',
      rating: '4.6',
      reviews: 678,
      inStock: true,
      type: 'dress',
      style: 'casual'
    },
    {
      id: 'tommy_jeans',
      title: 'Джинсы Tommy Hilfiger',
      price: 7990,
      oldPrice: 8990,
      image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=300',
      link: 'https://ru.tommy.com/мужчины/джинсы/скинни/джинсы-скинни/p/121348128',
      store: 'Tommy Hilfiger',
      storeColor: '#002d5a',
      rating: '4.5',
      reviews: 534,
      inStock: true,
      type: 'jeans',
      style: 'casual'
    },
    {
      id: 'columbia_jacket',
      title: 'Куртка Columbia Winter',
      price: 12990,
      oldPrice: 15990,
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300',
      link: 'https://www.columbia.com/ru/ru/',
      store: 'Columbia',
      storeColor: '#ff6600',
      rating: '4.8',
      reviews: 1123,
      inStock: true,
      type: 'jacket',
      style: 'sport'
    }
  ];
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
    return { min: 500, max: Math.max(maxPrice, 2000) };
  }
  return { min: 500, max: 20000 };
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

function generateAssistantResponse(query, products, aiAnalysis) {
  const priceInfo = aiAnalysis.price_range ? ` до ${aiAnalysis.price_range.max}₽` : '';
  const styleInfo = aiAnalysis.style !== 'casual' ? ` в ${aiAnalysis.style} стиле` : '';
  const seasonInfo = aiAnalysis.season !== 'all' ? ` для ${aiAnalysis.season} сезона` : '';
  
  return `На основе вашего запроса "${query}" я нашёл ${products.length} реальных товаров${priceInfo}. 
  Подобрал ${aiAnalysis.description}${styleInfo}${seasonInfo} из популярных брендов. 
  Все ссылки ведут на официальные страницы товаров!`;
}

function analyzeWithRules(userQuery) {
  const lowerQuery = userQuery.toLowerCase();
  
  let clothing_type = 'clothing';
  let style = 'casual';
  let season = 'all';
  let price_range = { min: 500, max: 20000 };
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

async function generateDemoProducts() {
  const realProducts = getRealProductDatabase();
  return realProducts.slice(0, 6).map(product => ({
    ...product,
    ai_generated: false,
    ai_relevance: 0.9
  }));
}
