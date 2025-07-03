// Random Description Generator for Product Forms
// Her ürün için farklı kombinasyonlar oluşturur

interface DescriptionParts {
  headers: string[];
  mainDescriptions: string[];
  endings: string[];
  features: string[];
}

const descriptionParts: DescriptionParts = {
  headers: [
    "🌟👨‍👩‍👧‍👦 Made Just for You – Fast & Safe Delivery 🌟",
    "👶🌟 Crafted with Love – Quick & Reliable Delivery 🌟", 
    "💑🌟 Designed for Love – Fast & Secure Delivery 🌟",
    "🐾🖼️ Created with Passion – Quick & Safe Shipping 🌟",
    "🎨🌈 Bold Design – Quick & Reliable Delivery 🌟",
    "💭✨ Motivational Decor – Fast & Secure Delivery 🌟",
    "👩‍🎨🌟 Elegant Design – Quick & Safe Delivery 🌟",
    "🗺️🌟 Timeless Decor – Fast & Reliable Delivery 🌟",
    "🌿🎨 Nature Inspired – Quick & Secure Delivery 🌟",
    "💍🌟 Made for Memories – Fast & Safe Delivery 🌟"
  ],

  mainDescriptions: [
    "💡 Looking to celebrate your loved ones? Turn your family photo into a timeless canvas print with custom sizing options – perfect for birthdays 🎂, anniversaries 💖, Mother's Day 🌸 or Father's Day 👔 gifts.",
    "💡 Searching for the perfect nursery decor? Personalize your baby's name on our adorable canvas prints to brighten their room – perfect for baby showers 🎉, newborn gifts 🎁, or first birthdays 🎂.",
    "💡 Looking for a heartfelt and romantic gift? Turn your favourite couple photo into a stunning canvas print – perfect for anniversaries 💍, weddings 💒, Valentine's Day ❤️, or engagements 💎.",
    "💡 Celebrate your furry friend with a custom pet portrait canvas made from your photos. Perfect for pet birthdays 🎂, memorials 🌈, or gifts for animal lovers 🐶🐱.",
    "💡 Enhance your space with our unique abstract canvas prints, adding life and colour to your living room 🛋️, office 🏢, or creative studio 🎭.",
    "💡 Brighten your day with inspirational quotes beautifully printed on premium canvas – perfect for your home office 🖥️, study room 📚, or as gifts 🎁.",
    "💡 Looking for sophisticated minimalist decor? Our line art canvas prints add elegance to any bedroom 🛏️, living space 🛋️, or office 🏢.",
    "💡 Add a classic touch to your space with our beautiful vintage map canvases, ideal for studies 📚, offices 🏢, libraries 📖, or travel lovers ✈️.",
    "💡 Bring nature indoors with our beautiful botanical watercolor canvas prints, perfect for living rooms 🛋️, bedrooms 🛏️, kitchens 🍃, or gifts 🎁.",
    "💡 Turn your wedding vows into timeless art with our personalized canvas prints – perfect for anniversaries 💖, weddings 💒, engagements 💎, or gifts for couples 🎁."
  ],

  features: [
    "✨ Features:\n• Premium-quality canvas material ✨\n• Multiple sizes available 📏\n• Ready to hang with included hardware 🛠️\n• Ideal gift for parents, grandparents, weddings, or housewarming 🏠🎁",
    "✨ Features:\n• Soft-touch high-quality canvas ✨\n• Various sizing choices 📏\n• Includes hanging hardware 🛠️\n• Gentle and cute designs for baby rooms 🧸",
    "✨ Features:\n• Vivid colour premium canvas 🌈\n• Multiple size options 📏\n• Ready to hang with included hardware 🛠️\n• Beautiful keepsake for couples 💖",
    "✨ Features:\n• Museum-quality canvas print ✨\n• Size options to suit any space 📏\n• Hanging hardware included 🛠️\n• Great gift for pet owners or vet clinics 🏥",
    "✨ Features:\n• High-resolution premium canvas ✨\n• Multiple sizes offered 📏\n• Ready to hang with hardware included 🛠️\n• Striking colours and designs for modern interiors 🖼️",
    "✨ Features:\n• Durable high-quality canvas ✨\n• Multiple sizes available 📏\n• Comes ready to hang 🛠️\n• Great as daily reminders or workplace decor 💡",
    "✨ Features:\n• Fine art canvas material ✨\n• Multiple size selections 📏\n• Easy to hang with included hardware 🛠️\n• Modern gift for art lovers 🎁",
    "✨ Features:\n• Premium quality vintage-style canvas ✨\n• Multiple sizes to fit your wall 📏\n• Hanging hardware included 🛠️\n• Great gift for history buffs or travellers 🎁",
    "✨ Features:\n• Vibrant premium canvas ✨\n• Various sizes offered 📏\n• Ready to hang with hardware 🛠️\n• Refreshing decor for any space 🌸",
    "✨ Features:\n• Museum-quality canvas material ✨\n• Multiple size choices 📏\n• Hanging hardware included 🛠️\n• Romantic and meaningful gift 💕"
  ],

  endings: [
    "🎨 Want something extra special? Message us for custom designs, multiple family members, or personalised text additions – we love bringing your ideas to life! 💌",
    "🎨 Have a specific theme in mind? Contact us for custom orders, colours matching your nursery, or adding birth dates & weights. 💌✨",
    "🎨 Want a special design or quote? Message us anytime to add names, dates, love quotes or wedding vows – fully personalised for your love story! 💌",
    "🎨 Have multiple pets or want their names added? Message us for fully custom layouts, backgrounds, and text options! 💌✨",
    "🎨 Looking for a custom colour palette? Message us to match your branding or interior theme with fully custom abstract designs! 💌✨",
    "🎨 Have your own quote or brand slogan? Contact us for custom designs with your logo or message to inspire your team daily! 💌",
    "🎨 Want custom line art of yourself or loved ones? Message us with your photos for personalised one-line portraits! 💌✨",
    "🎨 Looking for a specific city, country, or custom antique style? Message us to create your tailored vintage map art! 💌",
    "🎨 Want a specific plant or flower? Message us for custom botanical designs matching your theme or brand colours! 💌✨",
    "🎨 Want to add names, dates, or special fonts? Message us for fully custom vow designs to cherish forever! 💌✨"
  ]
};

// Rastgele element seçici
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Ana fonksiyon - rastgele açıklama üretir
export function generateRandomDescription(): string {
  const randomHeader = getRandomElement(descriptionParts.headers);
  const randomMainDescription = getRandomElement(descriptionParts.mainDescriptions);
  const randomFeatures = getRandomElement(descriptionParts.features);
  const randomEnding = getRandomElement(descriptionParts.endings);

  // Sabit kısımlar
  const shippingSection = `📦 Fast Processing & Shipping:
• Orders processed within 1-3 business days 🚀
• Secure packaging for damage-free delivery 📦
• Framed or rolled canvas options available 🖼️`;

  const bulkSection = `🏢 Bulk & Corporate Orders: We welcome bulk and corporate orders for offices, events, or family reunions. Discounts available for large orders!`;

  // Tüm parçaları birleştir
  const fullDescription = `${randomHeader}

${randomMainDescription}

${randomFeatures}

${shippingSection}

${bulkSection}

${randomEnding}`;

  return fullDescription;
}

// Debug için - hangi parçaları seçtiğini gösterir
export function generateRandomDescriptionWithDebug(): { description: string; parts: { header: number; main: number; features: number; ending: number } } {
  const headerIndex = Math.floor(Math.random() * descriptionParts.headers.length);
  const mainIndex = Math.floor(Math.random() * descriptionParts.mainDescriptions.length);
  const featuresIndex = Math.floor(Math.random() * descriptionParts.features.length);
  const endingIndex = Math.floor(Math.random() * descriptionParts.endings.length);

  const randomHeader = descriptionParts.headers[headerIndex];
  const randomMainDescription = descriptionParts.mainDescriptions[mainIndex];
  const randomFeatures = descriptionParts.features[featuresIndex];
  const randomEnding = descriptionParts.endings[endingIndex];

  // Sabit kısımlar
  const shippingSection = `📦 Fast Processing & Shipping:
• Orders processed within 1-3 business days 🚀
• Secure packaging for damage-free delivery 📦
• Framed or rolled canvas options available 🖼️`;

  const bulkSection = `🏢 Bulk & Corporate Orders: We welcome bulk and corporate orders for offices, events, or family reunions. Discounts available for large orders!`;

  // Tüm parçaları birleştir
  const fullDescription = `${randomHeader}

${randomMainDescription}

${randomFeatures}

${shippingSection}

${bulkSection}

${randomEnding}`;

  return {
    description: fullDescription,
    parts: {
      header: headerIndex,
      main: mainIndex,
      features: featuresIndex,
      ending: endingIndex
    }
  };
}

// Spesifik kombinasyon için
export function generateDescriptionWithParts(headerIndex: number, mainIndex: number, featuresIndex: number, endingIndex: number): string {
  const header = descriptionParts.headers[headerIndex] || descriptionParts.headers[0];
  const main = descriptionParts.mainDescriptions[mainIndex] || descriptionParts.mainDescriptions[0];
  const features = descriptionParts.features[featuresIndex] || descriptionParts.features[0];
  const ending = descriptionParts.endings[endingIndex] || descriptionParts.endings[0];

  const shippingSection = `📦 Fast Processing & Shipping:
• Orders processed within 1-3 business days 🚀
• Secure packaging for damage-free delivery 📦
• Framed or rolled canvas options available 🖼️`;

  const bulkSection = `🏢 Bulk & Corporate Orders: We welcome bulk and corporate orders for offices, events, or family reunions. Discounts available for large orders!`;

  return `${header}

${main}

${features}

${shippingSection}

${bulkSection}

${ending}`;
}