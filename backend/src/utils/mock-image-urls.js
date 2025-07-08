/**
 * Mock image URLs for fallback when OpenAI API is unavailable
 * Comprehensive collection with detailed categorization and smart prompt matching
 */

const mockImages = {
  default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe', // Colorful abstract for default
  
  // Nature category
  nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', // Forest
  forest: 'https://images.unsplash.com/photo-1448375240586-882707db888b', // Dense forest
  mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', // Mountain peak
  ocean: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', // Beach
  waterfall: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d', // Waterfall
  flower: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946', // Flowers
  
  // City/Urban category
  city: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b', // City skyline
  building: 'https://images.unsplash.com/photo-1486718448742-163732cd1544', // Modern building
  street: 'https://images.unsplash.com/photo-1522083165195-3424ed129620', // Street scene
  architecture: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8', // Architecture
  
  // Animals category
  animal: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5', // Fox
  dog: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1', // Dog
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba', // Cat
  bird: 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f', // Bird
  wildlife: 'https://images.unsplash.com/photo-1471879832106-c7ab9e0cee23', // Deer
  
  // Food category
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836', // Food spread
  meal: 'https://images.unsplash.com/photo-1559847844-5315695dadae', // Pasta dish
  dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b', // Dessert
  fruit: 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7', // Fruit
  
  // Technology category
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475', // Tech devices
  computer: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97', // Computer
  robot: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e', // Robot
  gadget: 'https://images.unsplash.com/photo-1512686096451-a15c19314d59', // Gadgets
  
  // Space category
  space: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564', // Galaxy
  planet: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4', // Planet
  star: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0', // Night sky with stars
  universe: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a', // Deep space
  
  // Abstract & art
  abstract: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab', // Abstract art
  art: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b', // Painting
  pattern: 'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3', // Pattern
  
  // People
  portrait: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', // Portrait
  people: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac', // Group of people
  
  // Landscapes
  landscape: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', // Green landscape
  sunset: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869', // Sunset
  winter: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56', // Winter scene
  beach: 'https://images.unsplash.com/photo-1519046904884-53103b34b206', // Beach
  
  // Weather
  rain: 'https://images.unsplash.com/photo-1438449805896-28a666819a20', // Rain
  snow: 'https://images.unsplash.com/photo-1482355347873-95481c5e3b91', // Snow
  storm: 'https://images.unsplash.com/photo-1538126152220-f1f9b81c8ec7', // Storm
  
  // Locations
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34', // Paris/Eiffel Tower
  newyork: 'https://images.unsplash.com/photo-1522083165195-3424ed129620', // New York
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26', // Tokyo
  
  // Miscellaneous
  book: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66', // Books
  music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4', // Music
  sport: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402', // Sports
  car: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70' // Car
};

/**
 * Get a mock image URL based on the prompt with intelligent categorization
 * @param {string} prompt - The text prompt
 * @returns {string} Mock image URL
 */
function getMockImageUrl(prompt) {
  if (!prompt) return mockImages.default;

  const lowerPrompt = prompt.toLowerCase();
  
  // Check for specific categories first
  // Nature related
  if (lowerPrompt.includes('forest') || lowerPrompt.match(/dense trees|woods|woodland/)) {
    return mockImages.forest;
  } else if (lowerPrompt.match(/mountain|peak|hill|summit|alps|himalaya/)) {
    return mockImages.mountain;
  } else if (lowerPrompt.match(/ocean|sea|beach|coast|shore|sand|wave/)) {
    return mockImages.ocean;
  } else if (lowerPrompt.match(/waterfall|cascade|falling water/)) {
    return mockImages.waterfall;
  } else if (lowerPrompt.match(/flower|blossom|bloom|floral|garden|rose|tulip/)) {
    return mockImages.flower;
  } else if (lowerPrompt.match(/nature|tree|river|lake|natural|outdoor|green|plant|grass/)) {
    return mockImages.nature;
  }
  
  // City/Urban related
  else if (lowerPrompt.match(/building|skyscraper|tower|office|apartment/)) {
    return mockImages.building;
  } else if (lowerPrompt.match(/street|road|avenue|boulevard|sidewalk|pavement/)) {
    return mockImages.street;
  } else if (lowerPrompt.match(/architecture|architect|structure|design|build/)) {
    return mockImages.architecture;
  } else if (lowerPrompt.match(/city|urban|downtown|town|metropolis|skyline/)) {
    return mockImages.city;
  }
  
  // Animals
  else if (lowerPrompt.match(/dog|puppy|canine|hound/)) {
    return mockImages.dog;
  } else if (lowerPrompt.match(/cat|kitten|feline|meow/)) {
    return mockImages.cat;
  } else if (lowerPrompt.match(/bird|avian|feather|wing|fly|flying/)) {
    return mockImages.bird;
  } else if (lowerPrompt.match(/wildlife|wild animal|deer|fox|wolf/)) {
    return mockImages.wildlife;
  } else if (lowerPrompt.match(/animal|pet|creature|beast|mammal/)) {
    return mockImages.animal;
  }
  
  // Food
  else if (lowerPrompt.match(/dessert|cake|sweet|cookie|pastry|ice cream|chocolate/)) {
    return mockImages.dessert;
  } else if (lowerPrompt.match(/fruit|apple|orange|banana|grape|healthy/)) {
    return mockImages.fruit;
  } else if (lowerPrompt.match(/meal|dinner|lunch|breakfast|plate|dish/)) {
    return mockImages.meal;
  } else if (lowerPrompt.match(/food|cuisine|restaurant|cooking|baking|eat|eating/)) {
    return mockImages.food;
  }
  
  // Technology
  else if (lowerPrompt.match(/robot|automation|android|mechanical|robotic/)) {
    return mockImages.robot;
  } else if (lowerPrompt.match(/computer|laptop|pc|desktop|keyboard|screen/)) {
    return mockImages.computer;
  } else if (lowerPrompt.match(/gadget|device|tech tool|electronic device/)) {
    return mockImages.gadget;
  } else if (lowerPrompt.match(/tech|technology|digital|electronic|ai|device|future/)) {
    return mockImages.technology;
  }
  
  // Space
  else if (lowerPrompt.match(/planet|mars|jupiter|saturn|venus|earth/)) {
    return mockImages.planet;
  } else if (lowerPrompt.match(/star|sun|solar|constellation/)) {
    return mockImages.star;
  } else if (lowerPrompt.match(/universe|cosmos|cosmic|astronomical/)) {
    return mockImages.universe;
  } else if (lowerPrompt.match(/space|galaxy|nebula|astronaut|celestial|orbit/)) {
    return mockImages.space;
  }
  
  // Abstract & Art
  else if (lowerPrompt.match(/pattern|geometric|repeat|recurring|symmetry/)) {
    return mockImages.pattern;
  } else if (lowerPrompt.match(/art|painting|drawing|sculpture|artistic/)) {
    return mockImages.art;
  } else if (lowerPrompt.match(/abstract|conceptual|non-representational|modern art/)) {
    return mockImages.abstract;
  }
  
  // People
  else if (lowerPrompt.match(/portrait|face|headshot|profile|selfie/)) {
    return mockImages.portrait;
  } else if (lowerPrompt.match(/people|person|man|woman|child|group|crowd|human/)) {
    return mockImages.people;
  }
  
  // Landscapes
  else if (lowerPrompt.match(/sunset|dusk|evening|golden hour/)) {
    return mockImages.sunset;
  } else if (lowerPrompt.match(/winter|snow|cold|frost|ice|frozen/)) {
    return mockImages.winter;
  } else if (lowerPrompt.match(/beach|shore|coast|sand|ocean view/)) {
    return mockImages.beach;
  } else if (lowerPrompt.match(/landscape|scenery|vista|panorama|horizon|view|overlook/)) {
    return mockImages.landscape;
  }
  
  // Weather
  else if (lowerPrompt.match(/rain|rainy|downpour|shower|drizzle/)) {
    return mockImages.rain;
  } else if (lowerPrompt.match(/snow|snowy|snowfall|blizzard/)) {
    return mockImages.snow;
  } else if (lowerPrompt.match(/storm|thunder|lightning|hurricane|tornado|tempest/)) {
    return mockImages.storm;
  }
  
  // Locations
  else if (lowerPrompt.match(/paris|eiffel|france|french/)) {
    return mockImages.paris;
  } else if (lowerPrompt.match(/new york|nyc|manhattan|brooklyn|statue of liberty/)) {
    return mockImages.newyork;
  } else if (lowerPrompt.match(/tokyo|japan|japanese|fuji/)) {
    return mockImages.tokyo;
  }
  
  // Miscellaneous
  else if (lowerPrompt.match(/book|reading|library|novel|story|literature/)) {
    return mockImages.book;
  } else if (lowerPrompt.match(/music|instrument|song|melody|musical|concert|piano|guitar/)) {
    return mockImages.music;
  } else if (lowerPrompt.match(/sport|athletic|game|play|competition|football|soccer|basketball/)) {
    return mockImages.sport;
  } else if (lowerPrompt.match(/car|vehicle|automobile|drive|driving|transportation/)) {
    return mockImages.car;
  }
  
  // If no specific matches, return default
  return mockImages.default;
}

module.exports = {
  getMockImageUrl,
  mockImages
};
