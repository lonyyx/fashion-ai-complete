async function generateRealProducts(aiAnalysis, query) {
  const realProducts = getRealProductDatabase();
  
  // СТРОГАЯ фильтрация - только точные совпадения
  const filteredProducts = realProducts.filter(product => {
    const exactTypeMatch = product.type === aiAnalysis.clothing_type;
    const withinBudget = product.price <= aiAnalysis.price_range.max;
    
    return exactTypeMatch && withinBudget;
  });
  
  if (filteredProducts.length > 0) {
    return filteredProducts.slice(0, 6).map(product => ({
      ...product,
      ai_generated: false,
      ai_relevance: 0.95
    }));
  }
  
  // Если точных совпадений нет - возвращаем пустой массив
  // или можете оставить демо-товары только нужного типа
  return generateStrictDemoProducts(aiAnalysis);
}
