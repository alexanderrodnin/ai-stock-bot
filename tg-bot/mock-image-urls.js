// This file contains mock image URLs for demonstration purposes
// when the OpenAI API is unavailable or restricted

module.exports = {
  // A collection of public domain or Creative Commons images to use for fallback
  // Each key is a general category that might match user prompts
  mockImages: {
    default: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    nature: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
    city: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b',
    animal: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5',
    food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475',
    space: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564',
    abstract: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab',
    portrait: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    landscape: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'
  },
  
  // Function to get a mock image URL based on the prompt
  getMockImageUrl: function(prompt) {
    if (!prompt) return this.mockImages.default;
    
    prompt = prompt.toLowerCase();
    
    // Simple keyword matching to select a relevant image
    if (prompt.match(/nature|tree|forest|mountain|river|lake|ocean|sea|beach|flower/)) {
      return this.mockImages.nature;
    } else if (prompt.match(/city|urban|building|street|skyline|architecture/)) {
      return this.mockImages.city;
    } else if (prompt.match(/animal|dog|cat|bird|wildlife|pet|lion|tiger|bear|fish/)) {
      return this.mockImages.animal;
    } else if (prompt.match(/food|meal|dish|cuisine|restaurant|cooking|baking/)) {
      return this.mockImages.food;
    } else if (prompt.match(/tech|computer|digital|electronic|robot|ai|device/)) {
      return this.mockImages.technology;
    } else if (prompt.match(/space|galaxy|star|planet|universe|cosmic|astronaut/)) {
      return this.mockImages.space;
    } else if (prompt.match(/abstract|pattern|color|texture|art|design/)) {
      return this.mockImages.abstract;
    } else if (prompt.match(/person|man|woman|child|portrait|face|people/)) {
      return this.mockImages.portrait;
    } else if (prompt.match(/landscape|scenery|vista|panorama|horizon/)) {
      return this.mockImages.landscape;
    }
    
    return this.mockImages.default;
  }
};
