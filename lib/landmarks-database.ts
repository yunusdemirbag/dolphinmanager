// Landmark veri tipi tanımı
export interface Landmark {
  name: string;
  city: string;
  country: string;
  continent: string;
  keywords: string[];
  description: string;
}

// Landmark analiz sonucu için tip tanımı
export interface LandmarkAnalysisResult {
  isLandscape: boolean;
  landmark?: string;
  city?: string;
  country?: string;
  timeOfDay?: string;
  features?: string[];
  colors?: string[];
  confidence?: number;
}

// Ünlü landmark'ların listesi
export const FAMOUS_LANDMARKS: Landmark[] = [
  // Avrupa
  {
    name: "Eiffel Tower",
    city: "Paris",
    country: "France",
    continent: "Europe",
    keywords: ["eiffel", "paris", "tower", "france", "iron"],
    description: "Iconic iron tower in Paris, France"
  },
  {
    name: "Colosseum",
    city: "Rome",
    country: "Italy",
    continent: "Europe",
    keywords: ["colosseum", "rome", "italy", "roman", "ancient", "arena"],
    description: "Ancient Roman amphitheater in Rome, Italy"
  },
  {
    name: "Sagrada Familia",
    city: "Barcelona",
    country: "Spain",
    continent: "Europe",
    keywords: ["sagrada familia", "barcelona", "spain", "gaudi", "church", "cathedral"],
    description: "Unfinished basilica designed by Antoni Gaudí in Barcelona, Spain"
  },
  {
    name: "Big Ben",
    city: "London",
    country: "United Kingdom",
    continent: "Europe",
    keywords: ["big ben", "london", "uk", "clock", "tower", "parliament"],
    description: "Famous clock tower in London, United Kingdom"
  },
  {
    name: "Santorini",
    city: "Santorini",
    country: "Greece",
    continent: "Europe",
    keywords: ["santorini", "greece", "white", "blue", "dome", "island", "aegean"],
    description: "Greek island with iconic white buildings and blue domes"
  },
  {
    name: "Neuschwanstein Castle",
    city: "Schwangau",
    country: "Germany",
    continent: "Europe",
    keywords: ["neuschwanstein", "castle", "germany", "bavaria", "fairy tale"],
    description: "Romantic castle in Bavaria, Germany"
  },
  {
    name: "Leaning Tower of Pisa",
    city: "Pisa",
    country: "Italy",
    continent: "Europe",
    keywords: ["pisa", "tower", "leaning", "italy", "tilt"],
    description: "Famous leaning bell tower in Pisa, Italy"
  },
  {
    name: "Acropolis",
    city: "Athens",
    country: "Greece",
    continent: "Europe",
    keywords: ["acropolis", "athens", "greece", "parthenon", "ancient", "ruins"],
    description: "Ancient citadel in Athens, Greece"
  },
  
  // Asya
  {
    name: "Taj Mahal",
    city: "Agra",
    country: "India",
    continent: "Asia",
    keywords: ["taj mahal", "agra", "india", "marble", "mausoleum"],
    description: "Ivory-white marble mausoleum in Agra, India"
  },
  {
    name: "Great Wall of China",
    city: "Beijing",
    country: "China",
    continent: "Asia",
    keywords: ["great wall", "china", "wall", "beijing", "ancient"],
    description: "Ancient fortification in northern China"
  },
  {
    name: "Mount Fuji",
    city: "Fujinomiya",
    country: "Japan",
    continent: "Asia",
    keywords: ["mount fuji", "fuji", "japan", "mountain", "volcano"],
    description: "Iconic volcano in Japan"
  },
  {
    name: "Angkor Wat",
    city: "Siem Reap",
    country: "Cambodia",
    continent: "Asia",
    keywords: ["angkor wat", "cambodia", "temple", "ancient", "khmer"],
    description: "Temple complex in Cambodia"
  },
  {
    name: "Burj Khalifa",
    city: "Dubai",
    country: "United Arab Emirates",
    continent: "Asia",
    keywords: ["burj khalifa", "dubai", "uae", "skyscraper", "tall"],
    description: "World's tallest building in Dubai, UAE"
  },
  {
    name: "Hagia Sophia",
    city: "Istanbul",
    country: "Turkey",
    continent: "Asia",
    keywords: ["hagia sophia", "istanbul", "turkey", "mosque", "cathedral", "museum"],
    description: "Historic mosque and former cathedral in Istanbul, Turkey"
  },
  {
    name: "Blue Mosque",
    city: "Istanbul",
    country: "Turkey",
    continent: "Asia",
    keywords: ["blue mosque", "sultan ahmed", "istanbul", "turkey"],
    description: "Historic mosque in Istanbul, Turkey"
  },
  {
    name: "Bosphorus",
    city: "Istanbul",
    country: "Turkey",
    continent: "Asia",
    keywords: ["bosphorus", "istanbul", "turkey", "strait", "bridge", "water"],
    description: "Strait connecting Europe and Asia in Istanbul, Turkey"
  },
  
  // Amerika
  {
    name: "Statue of Liberty",
    city: "New York City",
    country: "United States",
    continent: "North America",
    keywords: ["statue of liberty", "new york", "usa", "liberty island"],
    description: "Colossal statue on Liberty Island in New York Harbor, USA"
  },
  {
    name: "Grand Canyon",
    city: "Arizona",
    country: "United States",
    continent: "North America",
    keywords: ["grand canyon", "arizona", "usa", "canyon", "colorado river"],
    description: "Steep-sided canyon in Arizona, USA"
  },
  {
    name: "Golden Gate Bridge",
    city: "San Francisco",
    country: "United States",
    continent: "North America",
    keywords: ["golden gate", "bridge", "san francisco", "california", "usa"],
    description: "Suspension bridge in San Francisco, California, USA"
  },
  {
    name: "Machu Picchu",
    city: "Cusco",
    country: "Peru",
    continent: "South America",
    keywords: ["machu picchu", "peru", "inca", "ruins", "ancient"],
    description: "Ancient Incan citadel in Peru"
  },
  {
    name: "Christ the Redeemer",
    city: "Rio de Janeiro",
    country: "Brazil",
    continent: "South America",
    keywords: ["christ the redeemer", "rio", "brazil", "statue", "corcovado"],
    description: "Art Deco statue of Jesus Christ in Rio de Janeiro, Brazil"
  },
  
  // Afrika
  {
    name: "Pyramids of Giza",
    city: "Giza",
    country: "Egypt",
    continent: "Africa",
    keywords: ["pyramids", "giza", "egypt", "ancient", "sphinx"],
    description: "Ancient Egyptian pyramids in Giza, Egypt"
  },
  {
    name: "Table Mountain",
    city: "Cape Town",
    country: "South Africa",
    continent: "Africa",
    keywords: ["table mountain", "cape town", "south africa", "mountain"],
    description: "Flat-topped mountain in Cape Town, South Africa"
  },
  
  // Avustralya/Okyanusya
  {
    name: "Sydney Opera House",
    city: "Sydney",
    country: "Australia",
    continent: "Oceania",
    keywords: ["sydney opera house", "sydney", "australia", "opera", "harbor"],
    description: "Performing arts center in Sydney, Australia"
  },
  {
    name: "Uluru",
    city: "Northern Territory",
    country: "Australia",
    continent: "Oceania",
    keywords: ["uluru", "ayers rock", "australia", "rock", "red"],
    description: "Large sandstone rock formation in Australia"
  }
];

// Ülke bazlı Etsy hedef kitle önerileri
export const COUNTRY_AUDIENCE_MAPPING: Record<string, string[]> = {
  "France": ["Paris Lovers", "French Decor Fans", "Travel Enthusiasts", "European Art Collectors"],
  "Italy": ["Italy Lovers", "Mediterranean Decor", "Italian Art Fans", "European Travel Enthusiasts"],
  "Spain": ["Spain Lovers", "Mediterranean Style", "Spanish Decor Fans", "Travel Enthusiasts"],
  "United Kingdom": ["UK Lovers", "British Decor", "London Enthusiasts", "Travel Collectors"],
  "Greece": ["Greece Lovers", "Mediterranean Decor", "Island Life Fans", "Travel Enthusiasts"],
  "Germany": ["Germany Lovers", "European Decor", "Castle Enthusiasts", "Travel Collectors"],
  "Turkey": ["Turkey Lovers", "Mediterranean Decor", "Istanbul Enthusiasts", "Travel Collectors"],
  "India": ["India Lovers", "Asian Decor", "Cultural Art Fans", "Travel Enthusiasts"],
  "China": ["China Lovers", "Asian Decor", "Cultural Art Fans", "Travel Collectors"],
  "Japan": ["Japan Lovers", "Asian Decor", "Japanese Art Fans", "Travel Enthusiasts"],
  "Cambodia": ["Cambodia Lovers", "Asian Decor", "Temple Art Fans", "Travel Enthusiasts"],
  "United Arab Emirates": ["Dubai Lovers", "Modern Decor", "Luxury Lifestyle", "Travel Enthusiasts"],
  "United States": ["USA Lovers", "American Decor", "Patriotic Gifts", "Travel Enthusiasts"],
  "Peru": ["Peru Lovers", "South American Decor", "Ancient Culture Fans", "Travel Enthusiasts"],
  "Brazil": ["Brazil Lovers", "South American Decor", "Tropical Style", "Travel Enthusiasts"],
  "Egypt": ["Egypt Lovers", "Ancient History Fans", "Cultural Decor", "Travel Enthusiasts"],
  "South Africa": ["Africa Lovers", "Safari Decor", "Nature Enthusiasts", "Travel Collectors"],
  "Australia": ["Australia Lovers", "Oceanic Decor", "Down Under Fans", "Travel Enthusiasts"]
};

// Landmark'ları anahtar kelimelerle eşleştirme fonksiyonu
export function matchLandmarkByKeywords(text: string): Landmark | null {
  const lowerText = text.toLowerCase();
  
  for (const landmark of FAMOUS_LANDMARKS) {
    // Landmark adı veya anahtar kelimelerden herhangi biri eşleşirse
    if (
      lowerText.includes(landmark.name.toLowerCase()) ||
      landmark.keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
    ) {
      return landmark;
    }
  }
  
  return null;
}

// Ülke için hedef kitle önerisi getirme
export function getAudienceSuggestionsForCountry(country: string): string[] {
  return COUNTRY_AUDIENCE_MAPPING[country] || ["Travel Lovers", "Home Decor Enthusiasts", "Art Collectors", "Unique Gift Lovers"];
}