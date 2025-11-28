import axios from 'axios';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'FashionAI API is working!',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ 
          success: false, 
          error: 'Query is required' 
        });
      }

      const products = [
        {
          id: 1,
          title: "Джинсы Nike Classic",
          price: 3499,
          image: "https://source.unsplash.com/300x200/?jeans",
          store: "Lamoda",
          storeColor: "#00a046",
          rating: "4.5",
          reviews: 156,
          link: "https://lamoda.ru"
        },
        {
          id: 2, 
          title: "Футболка Adidas Original",
          price: 1899,
          image: "https://source.unsplash.com/300x200/?t-shirt",
          store: "Wildberries",
          storeColor: "#a50034", 
          rating: "4.3",
          reviews: 289,
          link: "https://wildberries.ru"
        }
      ];

      res.json({
        success: true,
        products: products,
        query: query,
        total: products.length,
        message: 'Search completed successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
