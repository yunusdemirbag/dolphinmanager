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
    "💍🌟 Made for Memories – Fast & Safe Delivery 🌟",
    // Yeni başlıklar
    "🏠🎨 Premium Wall Art – Fast & Secure Shipping 🌟",
    "🖼️✨ Gallery Quality Canvas – Quick & Safe Delivery 🌟",
    "🎭🌟 Artistic Excellence – Fast & Reliable Shipping 🌟",
    "🌅🎨 Stunning Wall Decor – Quick & Secure Delivery 🌟",
    "🏙️✨ Modern Home Decor – Fast & Safe Shipping 🌟",
    "🖌️🌟 Artist-Crafted Design – Quick & Reliable Delivery 🌟",
    "🎞️✨ Statement Wall Art – Fast & Secure Shipping 🌟",
    "🧩🌟 Perfect Room Accent – Quick & Safe Delivery 🌟",
    "🌄✨ Breathtaking Canvas – Fast & Reliable Shipping 🌟",
    "🏛️🌟 Museum Quality Art – Quick & Secure Delivery 🌟"
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
    "💡 Turn your wedding vows into timeless art with our personalized canvas prints – perfect for anniversaries 💖, weddings 💒, engagements 💎, or gifts for couples 🎁.",
    // Yeni ana açıklamalar
    "💡 Transform your living space with our premium canvas wall art prints, designed to make a statement in any room. Perfect for modern homes 🏠, apartments 🏙️, or as housewarming gifts 🎁.",
    "💡 Seeking the perfect focal point for your room? Our vibrant canvas prints instantly elevate any space – ideal for living rooms 🛋️, bedrooms 🛏️, hallways 🚪, or dining areas 🍽️.",
    "💡 Add a splash of color and personality to your walls with our designer canvas prints. Perfect for contemporary spaces 🏢, minimalist homes 🏠, or as standout gifts 🎁.",
    "💡 Looking to create a gallery wall? Our coordinated canvas print collections make it easy to design a professional-looking display – perfect for hallways 🚪, staircases 🪜, or feature walls ✨.",
    "💡 Upgrade your home decor with our premium canvas wall art – the perfect way to express your style and personality in living rooms 🛋️, bedrooms 🛏️, or home offices 🖥️.",
    "💡 Searching for statement art that sparks conversation? Our bold canvas prints become instant focal points in any room – perfect for modern interiors 🏠, creative spaces 🎭, or gifts 🎁.",
    "💡 Enhance your interior design with our carefully curated canvas art collection. Ideal for contemporary homes 🏙️, professional spaces 🏢, or design enthusiasts 🎨.",
    "💡 Create a luxurious atmosphere with our high-end canvas prints, featuring rich colors and striking designs – perfect for upscale interiors 🏛️, executive offices 💼, or as premium gifts 🎁.",
    "💡 Looking for art that complements your decor style? Our versatile canvas prints work beautifully with modern 🏙️, traditional 🏛️, bohemian 🧵, or minimalist ⬜ interiors.",
    "💡 Make a bold statement with our oversized canvas wall art – designed to create maximum impact in spacious rooms 🏠, open-concept living areas 🛋️, or commercial spaces 🏢."
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
    "✨ Features:\n• Museum-quality canvas material ✨\n• Multiple size choices 📏\n• Hanging hardware included 🛠️\n• Romantic and meaningful gift 💕",
    // Yeni özellikler
    "✨ Features:\n• Gallery-grade canvas material ✨\n• 8 different size options 📏\n• Fade-resistant premium inks 🌈\n• Ready to hang with pre-installed hardware 🛠️\n• Stunning addition to any room 🏠",
    "✨ Features:\n• 100% cotton artist-grade canvas ✨\n• Multiple framing options available 🖼️\n• UV-resistant archival inks 🌞\n• Sturdy wooden stretcher bars 🌳\n• Arrives ready to display 📦",
    "✨ Features:\n• Heavyweight premium canvas (400gsm) ✨\n• Hand-stretched on solid wood frames 🌲\n• Vibrant, long-lasting colors 🌈\n• Sealed with protective coating 🛡️\n• Easy wall mounting system included 🔨",
    "✨ Features:\n• Museum-quality giclée printing ✨\n• Acid-free, pH neutral canvas 🧪\n• Rich, true-to-life colors 🎨\n• Solid pine wood stretcher bars 🌲\n• Arrives with hanging kit included 📦",
    "✨ Features:\n• Professional artist canvas (380gsm) ✨\n• Eco-friendly water-based inks 🌱\n• Fade-resistant for 75+ years 🕰️\n• Sturdy 1.5-inch depth frame 📏\n• Includes wall mounting hardware 🔨",
    "✨ Features:\n• Exhibition-quality canvas material ✨\n• Archival-grade printing process 🖨️\n• Color-calibrated for accuracy 🎯\n• Handcrafted wooden frames 🪵\n• Arrives ready to hang with hardware 🛠️",
    "✨ Features:\n• Fine art textured canvas (410gsm) ✨\n• Lightfast, non-fading pigment inks 🌞\n• Gallery-wrapped edges (no frame needed) 🖼️\n• Kiln-dried pine wood stretchers 🌲\n• Professional hanging system included 🔨",
    "✨ Features:\n• Designer-grade canvas material ✨\n• Precision high-definition printing 🔍\n• Sealed with UV-protective varnish 🛡️\n• Solid hardwood internal frame 🪵\n• Arrives with mounting hardware 📦",
    "✨ Features:\n• Premium poly-cotton blend canvas ✨\n• Vibrant 12-color printing process 🌈\n• Handcrafted with care in our studio 👩‍🎨\n• Sturdy 1.25-inch profile frame 📏\n• Ready to hang right out of the box 📦",
    "✨ Features:\n• Museum-archival canvas (420gsm) ✨\n• Giclée printed with eco-solvent inks 🌱\n• Guaranteed not to fade for 100+ years ⏳\n• Hand-stretched on premium wood 🌳\n• Includes professional hanging kit 🛠️"
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
    "🎨 Want to add names, dates, or special fonts? Message us for fully custom vow designs to cherish forever! 💌✨",
    // Yeni sonlar
    "🎨 Need a specific size or custom dimensions? Message us for tailored canvas sizes to fit your exact wall space perfectly! 💌✨",
    "🎨 Want to create a coordinated gallery wall? Contact us for advice on complementary canvas prints that work beautifully together! 💌🖼️",
    "🎨 Looking for a specific color scheme to match your interior? Message us for custom color adjustments to complement your decor perfectly! 💌🎨",
    "🎨 Need rush shipping or a special delivery date? Contact us about expedited options to ensure your canvas arrives exactly when needed! 💌📦",
    "🎨 Interested in bulk ordering for your business, hotel, or office space? Message us for special wholesale pricing and custom branding options! 💌🏢",
    "🎨 Want to transform your own photo into canvas art? Send us your image for a free assessment and personalized recommendations! 💌📸",
    "🎨 Curious about different framing options? Message us to discuss black, white, floating frames, or unframed canvas options for your space! 💌🖼️",
    "🎨 Need help deciding which size works best for your wall? Send us your room dimensions for personalized recommendations from our design team! 💌📏",
    "🎨 Looking for a truly unique statement piece? Contact us about our limited edition artist collaborations and exclusive designs! 💌👩‍🎨",
    "🎨 Want to see how our canvas will look in your space? Message us with a photo of your room for a virtual mock-up before you purchase! 💌🏠"
  ]
};

// Sabit kısımlar - Daha detaylı ve çeşitli
const shippingSections = [
  `📦 Fast Processing & Shipping:
• Orders processed within 1-3 business days 🚀
• Secure packaging for damage-free delivery 📦
• Framed or rolled canvas options available 🖼️`,

  `📦 Premium Shipping & Handling:
• Quick processing within 1-2 business days 🚀
• Triple-layer protective packaging 📦
• Tracking number provided with every order 🔍
• Insured shipping for peace of mind 🛡️`,

  `📦 Fast & Reliable Delivery:
• Orders prepared within 24-72 hours 🚀
• Custom protective packaging for safe transit 📦
• Real-time tracking available 🔍
• Multiple shipping options to choose from 🚚`,

  `📦 Shipping Information:
• Efficient 1-3 day processing time 🚀
• Professional art packaging standards 📦
• Careful handling by art shipping specialists 🧤
• International shipping available worldwide 🌎`
];

const bulkSections = [
  `🏢 Bulk & Corporate Orders: We welcome bulk and corporate orders for offices, events, or family reunions. Discounts available for large orders!`,

  `🏢 Corporate & Wholesale: Perfect for businesses, hotels, and interior designers. Substantial discounts on bulk orders with custom branding options available!`,

  `🏢 Volume Discounts: Decorating multiple spaces? We offer special pricing for orders of 5+ canvases. Ideal for offices, hotels, restaurants, or multi-room projects!`,

  `🏢 Interior Design & Commercial Projects: We partner with designers and businesses to provide premium art solutions at competitive wholesale prices. Contact us for a custom quote!`
];

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
  
  // Rastgele shipping ve bulk section seç
  const randomShippingSection = getRandomElement(shippingSections);
  const randomBulkSection = getRandomElement(bulkSections);

  // Tüm parçaları birleştir
  const fullDescription = `${randomHeader}

${randomMainDescription}

${randomFeatures}

${randomShippingSection}

${randomBulkSection}

${randomEnding}`;

  return fullDescription;
}

// Debug için - hangi parçaları seçtiğini gösterir
export function generateRandomDescriptionWithDebug(): { 
  description: string; 
  parts: { 
    header: number; 
    main: number; 
    features: number; 
    ending: number;
    shipping: number;
    bulk: number;
  } 
} {
  const headerIndex = Math.floor(Math.random() * descriptionParts.headers.length);
  const mainIndex = Math.floor(Math.random() * descriptionParts.mainDescriptions.length);
  const featuresIndex = Math.floor(Math.random() * descriptionParts.features.length);
  const endingIndex = Math.floor(Math.random() * descriptionParts.endings.length);
  const shippingIndex = Math.floor(Math.random() * shippingSections.length);
  const bulkIndex = Math.floor(Math.random() * bulkSections.length);

  const randomHeader = descriptionParts.headers[headerIndex];
  const randomMainDescription = descriptionParts.mainDescriptions[mainIndex];
  const randomFeatures = descriptionParts.features[featuresIndex];
  const randomEnding = descriptionParts.endings[endingIndex];
  const randomShippingSection = shippingSections[shippingIndex];
  const randomBulkSection = bulkSections[bulkIndex];

  // Tüm parçaları birleştir
  const fullDescription = `${randomHeader}

${randomMainDescription}

${randomFeatures}

${randomShippingSection}

${randomBulkSection}

${randomEnding}`;

  return {
    description: fullDescription,
    parts: {
      header: headerIndex,
      main: mainIndex,
      features: featuresIndex,
      ending: endingIndex,
      shipping: shippingIndex,
      bulk: bulkIndex
    }
  };
}

// Spesifik kombinasyon için
export function generateDescriptionWithParts(
  headerIndex: number, 
  mainIndex: number, 
  featuresIndex: number, 
  endingIndex: number,
  shippingIndex: number = 0,
  bulkIndex: number = 0
): string {
  const header = descriptionParts.headers[headerIndex] || descriptionParts.headers[0];
  const main = descriptionParts.mainDescriptions[mainIndex] || descriptionParts.mainDescriptions[0];
  const features = descriptionParts.features[featuresIndex] || descriptionParts.features[0];
  const ending = descriptionParts.endings[endingIndex] || descriptionParts.endings[0];
  const shipping = shippingSections[shippingIndex] || shippingSections[0];
  const bulk = bulkSections[bulkIndex] || bulkSections[0];

  return `${header}

${main}

${features}

${shipping}

${bulk}

${ending}`;
}