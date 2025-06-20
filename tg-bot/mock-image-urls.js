/// This file contains mock image URLs for demonstration purposes
// when the OpenAI API is unavailable or restricted

module.exports = {
  // A collection of public domain or Creative Commons images to use for fallback
  // Each key is a general category that might match user prompts
  mockImages: {
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
  },
  
  // Function to get a mock image URL based on the prompt
  getMockImageUrl: function(prompt) {
    if (!prompt) return this.mockImages.default;

    prompt = prompt.toLowerCase();
    
    // Check for specific categories first
    // Nature related
    if (prompt.includes('forest') || prompt.match(/dense trees|woods|woodland/)) {
      return this.mockImages.forest;
    } else if (prompt.match(/mountain|peak|hill|summit|alps|himalaya/)) {
      return this.mockImages.mountain;
    } else if (prompt.match(/ocean|sea|beach|coast|shore|sand|wave/)) {
      return this.mockImages.ocean;
    } else if (prompt.match(/waterfall|cascade|falling water/)) {
      return this.mockImages.waterfall;
    } else if (prompt.match(/flower|blossom|bloom|floral|garden|rose|tulip/)) {
      return this.mockImages.flower;
    } else if (prompt.match(/nature|tree|river|lake|natural|outdoor|green|plant|grass/)) {
      return this.mockImages.nature;
    }
    
    // City/Urban related
    else if (prompt.match(/building|skyscraper|tower|office|apartment/)) {
      return this.mockImages.building;
    } else if (prompt.match(/street|road|avenue|boulevard|sidewalk|pavement/)) {
      return this.mockImages.street;
    } else if (prompt.match(/architecture|architect|structure|design|build/)) {
      return this.mockImages.architecture;
    } else if (prompt.match(/city|urban|downtown|town|metropolis|skyline/)) {
      return this.mockImages.city;
    }
    
    // Animals
    else if (prompt.match(/dog|puppy|canine|hound/)) {
      return this.mockImages.dog;
    } else if (prompt.match(/cat|kitten|feline|meow/)) {
      return this.mockImages.cat;
    } else if (prompt.match(/bird|avian|feather|wing|fly|flying/)) {
      return this.mockImages.bird;
    } else if (prompt.match(/wildlife|wild animal|deer|fox|wolf/)) {
      return this.mockImages.wildlife;
    } else if (prompt.match(/animal|pet|creature|beast|mammal/)) {
      return this.mockImages.animal;
    }
    
    // Food
    else if (prompt.match(/dessert|cake|sweet|cookie|pastry|ice cream|chocolate/)) {
      return this.mockImages.dessert;
    } else if (prompt.match(/fruit|apple|orange|banana|grape|healthy/)) {
      return this.mockImages.fruit;
    } else if (prompt.match(/meal|dinner|lunch|breakfast|plate|dish/)) {
      return this.mockImages.meal;
    } else if (prompt.match(/food|cuisine|restaurant|cooking|baking|eat|eating/)) {
      return this.mockImages.food;
    }
    
    // Technology
    else if (prompt.match(/robot|automation|android|mechanical|robotic/)) {
      return this.mockImages.robot;
    } else if (prompt.match(/computer|laptop|pc|desktop|keyboard|screen/)) {
      return this.mockImages.computer;
    } else if (prompt.match(/gadget|device|tech tool|electronic device/)) {
      return this.mockImages.gadget;
    } else if (prompt.match(/tech|technology|digital|electronic|ai|device|future/)) {
      return this.mockImages.technology;
    }
    
    // Space
    else if (prompt.match(/planet|mars|jupiter|saturn|venus|earth/)) {
      return this.mockImages.planet;
    } else if (prompt.match(/star|sun|solar|constellation/)) {
      return this.mockImages.star;
    } else if (prompt.match(/universe|cosmos|cosmic|astronomical/)) {
      return this.mockImages.universe;
    } else if (prompt.match(/space|galaxy|nebula|astronaut|celestial|orbit/)) {
      return this.mockImages.space;
    }
    
    // Abstract & Art
    else if (prompt.match(/pattern|geometric|repeat|recurring|symmetry/)) {
      return this.mockImages.pattern;
    } else if (prompt.match(/art|painting|drawing|sculpture|artistic/)) {
      return this.mockImages.art;
    } else if (prompt.match(/abstract|conceptual|non-representational|modern art/)) {
      return this.mockImages.abstract;
    }
    
    // People
    else if (prompt.match(/portrait|face|headshot|profile|selfie/)) {
      return this.mockImages.portrait;
    } else if (prompt.match(/people|person|man|woman|child|group|crowd|human/)) {
      return this.mockImages.people;
    }
    
    // Landscapes
    else if (prompt.match(/sunset|dusk|evening|golden hour/)) {
      return this.mockImages.sunset;
    } else if (prompt.match(/winter|snow|cold|frost|ice|frozen/)) {
      return this.mockImages.winter;
    } else if (prompt.match(/beach|shore|coast|sand|ocean view/)) {
      return this.mockImages.beach;
    } else if (prompt.match(/landscape|scenery|vista|panorama|horizon|view|overlook/)) {
      return this.mockImages.landscape;
    }
    
    // Weather
    else if (prompt.match(/rain|rainy|downpour|shower|drizzle/)) {
      return this.mockImages.rain;
    } else if (prompt.match(/snow|snowy|snowfall|blizzard/)) {
      return this.mockImages.snow;
    } else if (prompt.match(/storm|thunder|lightning|hurricane|tornado|tempest/)) {
      return this.mockImages.storm;
    }
    
    // Locations
    else if (prompt.match(/paris|eiffel|france|french/)) {
      return this.mockImages.paris;
    } else if (prompt.match(/new york|nyc|manhattan|brooklyn|statue of liberty/)) {
      return this.mockImages.newyork;
    } else if (prompt.match(/tokyo|japan|japanese|fuji/)) {
      return this.mockImages.tokyo;
    }
    
    // Miscellaneous
    else if (prompt.match(/book|reading|library|novel|story|literature/)) {
      return this.mockImages.book;
    } else if (prompt.match(/music|instrument|song|melody|musical|concert|piano|guitar/)) {
      return this.mockImages.music;
    } else if (prompt.match(/sport|athletic|game|play|competition|football|soccer|basketball/)) {
      return this.mockImages.sport;
    } else if (prompt.match(/car|vehicle|automobile|drive|driving|transportation/)) {
      return this.mockImages.car;
    }
    
    // If no specific matches, return default
    return this.mockImages.default;
  }
};
