/**
 * Mock image URLs for fallback when OpenAI API is unavailable
 * Uses free stock photo services
 */

const mockImages = {
  // Nature and landscapes
  nature: [
    'https://picsum.photos/1024/1024?random=1',
    'https://picsum.photos/1024/1024?random=2',
    'https://picsum.photos/1024/1024?random=3'
  ],
  
  // Food and objects
  food: [
    'https://picsum.photos/1024/1024?random=10',
    'https://picsum.photos/1024/1024?random=11',
    'https://picsum.photos/1024/1024?random=12'
  ],
  
  // Abstract and art
  abstract: [
    'https://picsum.photos/1024/1024?random=20',
    'https://picsum.photos/1024/1024?random=21',
    'https://picsum.photos/1024/1024?random=22'
  ],
  
  // Animals
  animals: [
    'https://picsum.photos/1024/1024?random=30',
    'https://picsum.photos/1024/1024?random=31',
    'https://picsum.photos/1024/1024?random=32'
  ],
  
  // Technology
  technology: [
    'https://picsum.photos/1024/1024?random=40',
    'https://picsum.photos/1024/1024?random=41',
    'https://picsum.photos/1024/1024?random=42'
  ],
  
  // Default fallback
  default: [
    'https://picsum.photos/1024/1024?random=100',
    'https://picsum.photos/1024/1024?random=101',
    'https://picsum.photos/1024/1024?random=102'
  ]
};

/**
 * Get a mock image URL based on prompt content
 * @param {string} prompt - The text prompt
 * @returns {string} Mock image URL
 */
function getMockImageUrl(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Categorize based on keywords in prompt
  if (lowerPrompt.includes('nature') || lowerPrompt.includes('landscape') || 
      lowerPrompt.includes('mountain') || lowerPrompt.includes('forest') ||
      lowerPrompt.includes('sunset') || lowerPrompt.includes('ocean')) {
    return getRandomFromArray(mockImages.nature);
  }
  
  if (lowerPrompt.includes('food') || lowerPrompt.includes('apple') || 
      lowerPrompt.includes('fruit') || lowerPrompt.includes('cooking') ||
      lowerPrompt.includes('meal') || lowerPrompt.includes('restaurant')) {
    return getRandomFromArray(mockImages.food);
  }
  
  if (lowerPrompt.includes('abstract') || lowerPrompt.includes('art') || 
      lowerPrompt.includes('painting') || lowerPrompt.includes('creative') ||
      lowerPrompt.includes('artistic') || lowerPrompt.includes('design')) {
    return getRandomFromArray(mockImages.abstract);
  }
  
  if (lowerPrompt.includes('animal') || lowerPrompt.includes('cat') || 
      lowerPrompt.includes('dog') || lowerPrompt.includes('bird') ||
      lowerPrompt.includes('wildlife') || lowerPrompt.includes('pet')) {
    return getRandomFromArray(mockImages.animals);
  }
  
  if (lowerPrompt.includes('technology') || lowerPrompt.includes('computer') || 
      lowerPrompt.includes('robot') || lowerPrompt.includes('digital') ||
      lowerPrompt.includes('tech') || lowerPrompt.includes('ai')) {
    return getRandomFromArray(mockImages.technology);
  }
  
  // Default fallback
  return getRandomFromArray(mockImages.default);
}

/**
 * Get random item from array
 * @param {Array} array - Array to pick from
 * @returns {*} Random item
 */
function getRandomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
  getMockImageUrl,
  mockImages
};
