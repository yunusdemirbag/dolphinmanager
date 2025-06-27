import { adminDb } from '@/lib/firebase-admin';
import OpenAI from 'openai';

// Default Prompts
const DEFAULT_TITLE_PROMPT = `
# SYSTEM
1. If **no image_file** → reply "Okay, please send the image." and stop.  
2. If the supplied image is **not suitable canvas wall art** → reply "Image isn't canvas wall art, please upload a proper one." and stop.  
3. Otherwise continue with TASK.

# ROLE
You are the **ULTIMATE ETSY SEO copywriter & conversion strategist** for PHYSICAL Canvas Wall Art Prints (no digital products) serving U.S. and global English-speaking buyers.

# INPUT
• **image_file** → Internally extract: primary subject, art style, emotional tone, 1–2 dominant colours.  
• Optional: orientation, size details, target audience/room, etc.

# TASK
Generate **ONE** SEO-optimised, high-conversion Etsy product title (125–140 characters, Title Case, English).

# STAGE 1 · ADVANCED IMAGE INSIGHT  *(internal only)*
### Artist / Movement Recognition & Format
- **Rothko Style** → \`Bold [Colour] Rothko Style Color Field Canvas Wall Art Print | [Room] Decor | Statement Piece\`
- **Frida Kahlo** → \`Vibrant Frida Kahlo Portrait Canvas Wall Art Print | [Theme] Bedroom Wall Decor | Luxury Gift\`
- **Jesus / Religious** → \`Radiant Jesus [Scene] Canvas Wall Art Print | [Tone] Living Room Decor | Statement Piece\`
- **African Heritage** → \`Bold African Women Portrait Canvas Wall Art Print | [Style] Living Room Decor | Statement Piece\`
- **Jazz / Music** → \`Powerful Jazz Singer Canvas Wall Art Print | [Colour] Bedroom Wall Decor | Luxury Gift\`
- **Black Woman Smoking Cigar** → \`Bold Black Woman Smoking Cigar Canvas Wall Art Print | [Style] Living Room Decor | Statement Piece\`
- **Black Woman Lifestyle** → \`Elegant Black Woman [Action] Canvas Wall Art Print | [Style] Living Room Decor | Statement Piece\`

### Additional Style/Theme Detection
• Abstract Expressionism (Pollock) • Pop Art (Warhol) • Street Art (Banksy) • Japanese (Hokusai)  
• Cultural/Spiritual themes: Zen, Native American, Mexican Día de Muertos, etc.

# STAGE 2 · TITLE BUILD  *(fallback if no specific format above)*
\`<Emotional Adjective> <Specific Subject> <Style> Canvas Wall Art Print | <Colour/Tone> <Room Keyword> Decor | <Value Phrase>\`

# MANDATORY RULES
1. Include **Canvas Wall Art Print** exactly once.  
2. Add **one** high-volume room keyword: *Living Room Decor, Bedroom Wall Decor, Office Artwork, Nursery Decor, Man Cave Art*.  
3. Add **one** value phrase: *Ready to Hang, Statement Piece, Luxury Gift, Limited Edition, Art Collectors, Modern Art Lovers*.  
4. Insert 2-3 style descriptors (modern, minimalist, abstract, boho, etc.).  
5. Optional size hint allowed (Large, 24x36, etc.).  
6. Max 140 chars; Title Case; no quotes, emojis, parentheses, ALL-CAPS, SKUs; no word repeated > 1 (except Art/Wall/Canvas).  
7. **Forbidden words** anywhere: digital, download, printable, instant, pdf, file, template, svg, vector, clipart, wallpaper, mockup, psd, poster, paper print, frame included, framed poster, diy, beautiful, nice, awesome, amazing, gorgeous, stunning, wonderful, cute, lovely, pretty, high quality, cheap, best price, sale, discount, free shipping, unique, perfect, special, exclusive, set, bundle.

# CRITICAL COPYRIGHT COMPLIANCE
🚨 NEVER use artist full names like "Mark Rothko" - use "Rothko Style" instead
🚨 This prevents DMCA takedown and legal issues
🚨 Always use "[Artist] Style" format for inspiration-based titles

# OUTPUT
Return **only** the final title line—no quotes, no explanations.
`;

const DEFAULT_TAG_PROMPT = `
# ENHANCED ETSY TAGS SEO PROMPT

## ROLE
You are the ULTIMATE ETSY SEO strategist creating hyper-optimized TAGS for **PHYSICAL canvas wall art** aimed at U.S. & global English-speaking buyers with ADVANCED recognition capabilities.

## INPUT
• The final product TITLE (English).  
  TITLE: {title}

## TASK
Generate **EXACTLY 13 long-tail Etsy tags** that maximize search reach and conversion.

## STAGE 1 · ADVANCED TAG INTELLIGENCE
### Artist / Theme Recognition & Tag Strategy
- **Mark Rothko Style** → "rothko style", "color field art", "abstract blocks"  
- **Frida Kahlo Style** → "frida kahlo art", "mexican folk art", "floral portrait"  
- **Jesus / Religious** → "christian wall art", "jesus painting", "religious decor"  
- **African Heritage** → "african art", "black women art", "cultural portrait"  
- **Jazz / Music** → "jazz art", "music poster", "singer portrait"  
- **Black Woman Smoking** → "smoking art", "cigar painting", "bold portrait"  
- **Abstract / Modern** → "abstract art", "modern painting", "contemporary art"

### ETSY COMPLIANCE CHECK
- Avoid trademark names (Disney, Nike, etc.).  
- Avoid irrelevant or misleading tags.  
- Avoid **irrelevant holiday tags** unless the artwork is seasonally themed.  
- No quality claims (high quality, premium, best).  
- No brand names you don't own.  
- No generic single words.

## MANDATORY RULES
1. **13 tags**, one line, **comma-separated**, all **lowercase**.  
2. Each tag **≤ 20 characters including spaces**.  
3. **No single-word tags** (use 2–3-word phrases).  
4. No word appears **more than twice in total**.  
5. Exclude all **FORBIDDEN WORDS**.  
6. Only commas and spaces; no quotes, emojis, ALL-CAPS, or SKU codes.  
7. Tags must be **directly relevant** to the actual artwork.  
8. Include **at least one trending Etsy search term** (e.g., "boho wall art", "modern abstract").  
9. Balance broad appeal with niche specificity.

## FORBIDDEN WORDS
digital, download, printable, instant, pdf, file, template, svg, vector, mockup, wallpaper, psd, poster, paper print, frame included, framed poster, diy, beautiful, nice, awesome, amazing, gorgeous, stunning, wonderful, cute, lovely, pretty, high quality, cheap, best price, sale, discount, free shipping, unique, perfect, special, exclusive, premium, luxury, professional, top quality, superior

## TAG MIX STRATEGY
• **3 subject tags** – main topic & variations (e.g., "lion wall art", "animal painting", "wildlife decor")  
• **2 style tags** – art style or movement ("abstract art", "modern style")  
• **2 color tags** – dominant palette ("black gold", "earth tones")  
• **2 room / placement tags** – context ("living room", "bedroom wall")  
• **2 format / benefit tags** – product value ("canvas art", "wall hanging")  
• **2 audience / occasion or trending tags** – targeting or buzz ("gift idea", "boho wall art")

## ETSY SEO TACTICS
- **Long-tail focus**: "modern abstract art" > "abstract".  
- **Search intent**: include buyer phrases like "wall decor", "home art".  
- **Seasonal awareness**: add seasonal tags when appropriate.  
- **Trending terms**: track current popular Etsy searches.  
- **Niche targeting**: balance mainstream reach with specific interests.

## OUTPUT FORMAT
Return **ONLY** the 13 tags, comma-separated, nothing else.

**Example Output:**  
\`modern abstract art, canvas wall decor, living room art, black gold painting, contemporary design, bedroom wall art, abstract canvas, home decoration, wall hanging art, modern home decor, geometric art, minimalist style, interior design\`
`;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface TitleTemplate {
  id: string;
  category: string;
  template: string;
  examples: string[];
  keywords: string[];
  created_at: Date;
  success_count: number;
}

interface TagTemplate {
  id: string;
  category: string;
  tags: string[];
  title_patterns: string[];
  created_at: Date;
  success_count: number;
}

interface GenerationResult {
  title: string;
  tags: string[];
  category: string;
  confidence: number;
  processing_time: number;
}

class AITitleTagSystem {
  
  // Firebase Collections
  private TITLES_COLLECTION = 'ai_titles';
  private TAGS_COLLECTION = 'ai_tags';
  private LEARNING_COLLECTION = 'ai_learning';
  
  /**
   * Initialize Firebase collections and sync store data
   */
  async initialize() {
    console.log('🚀 AI Title-Tag System initializing...');
    
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    // Force update templates to ensure latest versions
    await this.forceUpdateTemplates();
    
    console.log('✅ AI Title-Tag System initialized');
  }

  /**
   * Force update templates (clear cache and recreate)
   */
  async forceUpdateTemplates() {
    console.log('🔄 Force updating Firebase templates...');
    
    // Delete existing templates
    try {
      const batch = adminDb.batch();
      
      // Delete old templates
      const titleRef = adminDb.collection(this.TITLES_COLLECTION).doc('rothko');
      const tagRef = adminDb.collection(this.TAGS_COLLECTION).doc('rothko_tags');
      
      batch.delete(titleRef);
      batch.delete(tagRef);
      
      await batch.commit();
      console.log('🗑️ Old templates deleted');
      
      // Recreate templates
      await this.createInitialCollections();
      console.log('✅ Templates force updated');
      
    } catch (error) {
      console.error('❌ Error force updating templates:', error);
    }
  }

  /**
   * Create initial Firebase collections
   */
  private async createInitialCollections() {
    const batch = adminDb.batch();
    
    // Create sample title templates
    const titleTemplates: TitleTemplate[] = [
      {
        id: 'rothko',
        category: 'rothko',
        template: '{adjective} {color} Rothko Style Color Field Canvas Wall Art Print | {room} Decor | {value}',
        examples: [
          'Bold Red Rothko Style Color Field Canvas Wall Art Print | Modern Living Room Decor | Statement Piece',
          'Serene Teal Rothko Style Color Field Canvas Wall Art Print | Minimalist Office Decor | Ready to Hang',
          'Vibrant Ochre Rothko Style Color Field Canvas Wall Art Print | Contemporary Bedroom Decor | Gallery Quality'
        ],
        keywords: ['rothko style', 'color field', 'abstract', 'canvas art', 'wall decor'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'frida',
        category: 'frida',
        template: 'Vibrant Frida Kahlo {theme} Canvas Wall Art Print | Bohemian {room} Decor | Luxury Gift',
        examples: ['Vibrant Frida Kahlo Portrait Canvas Wall Art Print | Bohemian Bedroom Wall Decor | Luxury Gift'],
        keywords: ['frida', 'kahlo', 'mexican', 'floral', 'portrait', 'bohemian'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'klimt',
        category: 'klimt',
        template: '{adjective} Golden Tears {style} Canvas Wall Art Print | {metallic} {room} Decor | {value}',
        examples: [
          'Elegant Golden Tears Woman Canvas Wall Art Print | Luxurious Living Room Decor | Statement Piece',
          'Mystical Golden Tears Portrait Canvas Wall Art Print | Art Deco Bedroom Decor | Gallery Quality',
          'Captivating Golden Tears Art Canvas Wall Art Print | Sophisticated Office Decor | Collector Item'
        ],
        keywords: ['golden tears', 'klimt style', 'art nouveau', 'portrait', 'luxury'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'religious',
        category: 'religious',
        template: '{adjective} Jesus {detail} Canvas Wall Art {separator} {description} {purpose} | {value}',
        examples: [
          'Sacred Jesus with Open Arms in a Flower Garden Canvas Wall Art — Spiritual Christian Painting for Home or Prayer Room Decor | Faith Gift',
          'Divine Jesus Surrounded by Flowers and Light Canvas Wall Art — Inspirational Christian Decor for Living Room or Faith Gift | Sacred Art',
          'Radiant Jesus Under Light Beam Canvas Wall Art — Religious Canvas Art for Christian Home and Spiritual Gift | Divine Gift',
          'Blessed Jesus Embraced by Light and Nature Canvas Wall Art — Faith-Based Wall Art for Prayer Room Wall Decor | Spiritual Art'
        ],
        keywords: ['jesus', 'christian', 'religious', 'spiritual', 'faith', 'divine', 'sacred'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'asian',
        category: 'asian',
        template: '{adjective} {subject} Canvas {separator} {style} {detail} | {theme} Wall Art {purpose} | {value}',
        examples: [
          'Bold Japanese Samurai Woman Canvas — Oriental Warrior with Dragon Tattoo | Asian Fantasy Wall Art for Living Room or Gift | Statement Piece',
          'Fierce Asian Warrior Canvas — Empowered Woman in Kimono with Katana | Japanese Art for Cultural Decor | Gallery Quality',
          'Mystical Oriental Lady Canvas — Traditional Woman with Cherry Blossoms | Asian Fantasy for Bedroom or Office | Art Lovers',
          'Powerful Samurai Girl Canvas — Bold Japanese Fighter with Sword | Oriental Wall Art for Modern Home | Collector Item'
        ],
        keywords: ['asian', 'japanese', 'samurai', 'oriental', 'warrior', 'kimono', 'dragon tattoo'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'jazz',
        category: 'jazz',
        template: '{adjective} {instrument} {performer} Canvas Wall Art {separator} {style} {detail} | {venue} Wall Decor {purpose} | {value}',
        examples: [
          'Vibrant Trumpet Player Canvas Wall Art — Bold Jazz Musician in Colorful Style | Musical Wall Decor for Living Room or Music Studio | Statement Piece',
          'Soulful Saxophone Artist Canvas Wall Art — Classic Jazz Performance in Blues Tones | Music Wall Decor for Home or Office | Art Lovers',
          'Dynamic Piano Player Canvas Wall Art — Energetic Jazz Pianist in Action | Musical Art for Bedroom or Studio | Gallery Quality',
          'Expressive Jazz Singer Canvas Wall Art — Powerful Vocalist in Vintage Style | Music Decor for Living Room or Bar | Collector Item'
        ],
        keywords: ['jazz', 'music', 'musician', 'trumpet', 'saxophone', 'piano', 'musical'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'woman',
        category: 'woman',
        template: '{adjective} {style} Woman {detail} Canvas Wall Art {separator} {theme} {purpose} | {value}',
        examples: [
          'Elegant Modern Woman Portrait Canvas Wall Art — Bold Female Art for Living Room or Bedroom Decor | Statement Piece',
          'Powerful African Woman with Natural Hair Canvas Wall Art — Empowering Female Art for Office or Home | Gallery Quality',
          'Graceful Woman in Flowing Dress Canvas Wall Art — Feminine Portrait for Bedroom or Bathroom Decor | Art Lovers',
          'Strong Business Woman Canvas Wall Art — Professional Female Art for Office or Study Room | Inspirational Decor'
        ],
        keywords: ['woman art', 'female portrait', 'empowering', 'feminine', 'strong woman', 'modern woman'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'animal',
        category: 'animal',
        template: '{adjective} {animal} {pose} Canvas Wall Art {separator} {style} Wildlife Art {purpose} | {value}',
        examples: [
          'Majestic Lion Portrait Canvas Wall Art — Bold Wildlife Art for Living Room or Office Decor | Statement Piece',
          'Graceful Elephant in Nature Canvas Wall Art — Safari Animal Art for Bedroom or Study Room | Gallery Quality',
          'Powerful Wolf Pack Canvas Wall Art — Wild Animal Art for Man Cave or Living Room | Collector Item',
          'Colorful Hummingbird in Flight Canvas Wall Art — Nature Bird Art for Kitchen or Bathroom | Art Lovers'
        ],
        keywords: ['animal art', 'wildlife', 'safari', 'nature', 'lion', 'elephant', 'wolf', 'bird'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'modern',
        category: 'modern',
        template: '{adjective} {style} {pattern} Canvas Wall Art {separator} {design} Art {purpose} | {value}',
        examples: [
          'Bold Geometric Abstract Canvas Wall Art — Contemporary Modern Art for Living Room or Office | Statement Piece',
          'Vibrant Minimalist Lines Canvas Wall Art — Sleek Modern Design for Bedroom or Study | Gallery Quality',
          'Dynamic Color Block Canvas Wall Art — Modern Contemporary Art for Kitchen or Bathroom | Art Lovers',
          'Elegant Abstract Shapes Canvas Wall Art — Sophisticated Modern Art for Dining Room or Entryway | Collector Item'
        ],
        keywords: ['modern art', 'contemporary', 'geometric', 'minimalist', 'abstract', 'design'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'zen',
        category: 'zen',
        template: '{adjective} {subject} {element} Canvas Wall Art {separator} {style} {purpose} | {value}',
        examples: [
          'Peaceful Buddha Meditation Canvas Wall Art — Zen Spiritual Art for Living Room or Meditation Space | Tranquil Decor',
          'Serene Zen Stones Balance Canvas Wall Art — Minimalist Spa Art for Bathroom or Bedroom | Peaceful Gift',
          'Tranquil Lotus Flower Canvas Wall Art — Buddhist Spiritual Art for Yoga Room or Study | Meditation Decor',
          'Calming Bamboo Forest Canvas Wall Art — Zen Nature Art for Office or Living Room | Relaxing Art'
        ],
        keywords: ['buddha', 'zen', 'meditation', 'spiritual', 'peaceful', 'tranquil', 'lotus', 'bamboo'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'nature',
        category: 'nature',
        template: '{adjective} {subject} {setting} Canvas Wall Art {separator} {style} Nature Art {purpose} | {value}',
        examples: [
          'Vibrant Sunflower Field Canvas Wall Art — Botanical Flower Art for Kitchen or Living Room | Cheerful Decor',
          'Serene Mountain Landscape Canvas Wall Art — Nature Scenic Art for Bedroom or Office | Peaceful Gift',
          'Delicate Rose Garden Canvas Wall Art — Floral Botanical Art for Bathroom or Dining Room | Romantic Decor',
          'Majestic Forest Path Canvas Wall Art — Woodland Nature Art for Living Room or Study | Gallery Quality'
        ],
        keywords: ['nature', 'botanical', 'flowers', 'landscape', 'forest', 'mountain', 'garden', 'scenic'],
        created_at: new Date(),
        success_count: 0
      }
    ];

    // Create sample tag templates
    const tagTemplates: TagTemplate[] = [
      {
        id: 'rothko_tags',
        category: 'rothko',
        tags: ['rothko style art', 'color field art', 'abstract canvas', 'modern wall', 'canvas print', 'living room', 'bedroom decor', 'statement art', 'bold color', 'minimalist', 'ready to hang', 'large wall art', 'contemporary'],
        title_patterns: ['rothko style', 'color field', 'abstract'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'frida_tags',
        category: 'frida',
        tags: ['frida kahlo art', 'mexican folk art', 'floral portrait', 'bohemian decor', 'cultural art'],
        title_patterns: ['frida', 'kahlo', 'mexican', 'floral'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'klimt_tags',
        category: 'klimt',
        tags: ['golden tears art', 'klimt style', 'art nouveau', 'portrait art', 'luxury decor', 'woman art', 'gold accent', 'elegant wall', 'sophisticated', 'gallery piece', 'metallic art', 'statement wall', 'premium decor'],
        title_patterns: ['golden tears', 'klimt', 'gold', 'portrait', 'woman'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'asian_tags',
        category: 'asian',
        tags: ['samurai woman art', 'asian fantasy print', 'dragon tattoo canvas', 'japanese warrior', 'oriental wall art', 'bold female art', 'geisha sword art', 'kimono wall decor', 'fantasy canvas', 'cultural art', 'statement wall', 'modern home decor', 'empowered woman'],
        title_patterns: ['japanese', 'samurai', 'asian', 'oriental', 'warrior', 'dragon'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'jazz_tags',
        category: 'jazz',
        tags: ['jazz musician art', 'trumpet player', 'music wall decor', 'saxophone art', 'piano player', 'musical canvas', 'jazz club art', 'music studio', 'blues art print', 'vintage music', 'musical gift', 'sound art', 'musician wall'],
        title_patterns: ['jazz', 'music', 'trumpet', 'saxophone', 'piano', 'musician'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'woman_tags',
        category: 'woman',
        tags: ['woman art', 'female portrait', 'empowering women', 'strong woman', 'modern woman', 'female power', 'woman decor', 'feminine art', 'lady portrait', 'girl power', 'business woman', 'confident woman', 'female beauty'],
        title_patterns: ['woman', 'female', 'lady', 'girl', 'portrait', 'empowering'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'animal_tags',
        category: 'animal',
        tags: ['animal art', 'wildlife decor', 'safari art', 'lion wall art', 'elephant print', 'wolf canvas', 'bird art', 'nature animal', 'wild life', 'zoo art', 'pet portrait', 'forest animal', 'jungle art', 'cat art', 'dog art', 'tiger print', 'horse art', 'deer art', 'bear art', 'eagle art', 'owl art', 'fish art', 'butterfly art', 'fox art', 'giraffe art', 'zebra art', 'panda art', 'monkey art', 'rabbit art', 'shark art', 'whale art', 'farm animal', 'domestic pet', 'marine life'],
        title_patterns: ['animal', 'wildlife', 'lion', 'elephant', 'wolf', 'bird', 'safari', 'cat', 'dog', 'tiger', 'horse', 'deer', 'bear', 'eagle', 'owl', 'fish', 'butterfly', 'fox', 'giraffe', 'zebra', 'panda', 'monkey', 'rabbit', 'shark', 'whale', 'pet', 'creature', 'wild', 'mammal', 'reptile', 'marine'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'modern_tags',
        category: 'modern',
        tags: ['modern art', 'contemporary', 'geometric art', 'minimalist', 'abstract design', 'sleek decor', 'color block', 'modern decor', 'clean lines', 'simple art', 'stylish wall', 'chic design', 'trendy art'],
        title_patterns: ['modern', 'contemporary', 'geometric', 'minimalist', 'abstract'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'zen_tags',
        category: 'zen',
        tags: ['buddha art', 'zen decor', 'meditation art', 'spiritual wall', 'peaceful art', 'tranquil decor', 'lotus flower', 'bamboo art', 'yoga decor', 'calm art', 'mindful decor', 'spa art', 'relaxing wall'],
        title_patterns: ['buddha', 'zen', 'meditation', 'spiritual', 'lotus', 'bamboo'],
        created_at: new Date(),
        success_count: 0
      },
      {
        id: 'nature_tags',
        category: 'nature',
        tags: ['nature art', 'botanical print', 'flower art', 'landscape art', 'forest decor', 'mountain art', 'garden wall', 'scenic art', 'outdoor decor', 'floral print', 'tree art', 'plant decor', 'natural beauty'],
        title_patterns: ['nature', 'botanical', 'flower', 'landscape', 'forest', 'mountain'],
        created_at: new Date(),
        success_count: 0
      }
    ];

    // Add to batch
    titleTemplates.forEach(template => {
      const ref = adminDb.collection(this.TITLES_COLLECTION).doc(template.id);
      batch.set(ref, template);
    });

    tagTemplates.forEach(template => {
      const ref = adminDb.collection(this.TAGS_COLLECTION).doc(template.id);
      batch.set(ref, template);
    });

    await batch.commit();
    console.log('📚 Initial templates created');
  }

  /**
   * Sync existing store titles to Firebase
   */
  async syncStoreToFirebase(shopId: string) {
    console.log(`🔄 Syncing store ${shopId} to Firebase...`);
    
    try {
      // Get all store listings from Etsy API
      const listings = await this.getStoreListings(shopId);
      
      for (const listing of listings) {
        await this.analyzeAndSaveTitle(listing.title, listing.images?.[0]);
      }
      
      console.log(`✅ Synced ${listings.length} titles to Firebase`);
    } catch (error) {
      console.error('❌ Error syncing store:', error);
      throw error;
    }
  }

  /**
   * Get store listings from Etsy API
   */
  private async getStoreListings(shopId: string) {
    // Get API credentials from Firebase
    const keyDoc = await adminDb.collection('etsy_api_keys').doc(shopId).get();
    if (!keyDoc.exists) {
      throw new Error('API keys not found');
    }

    const { api_key, access_token } = keyDoc.data()!;
    
    const response = await fetch(`https://openapi.etsy.com/v3/application/shops/${shopId}/listings/active`, {
      headers: {
        'x-api-key': api_key,
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Etsy API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Analyze title and save to Firebase
   */
  private async analyzeAndSaveTitle(title: string, imageUrl?: string) {
    // Analyze category using OpenAI
    const category = await this.detectCategory(title, imageUrl);
    
    // Save to Firebase
    const titleDoc = {
      title,
      category,
      imageUrl,
      created_at: new Date(),
      source: 'store_sync'
    };

    await adminDb.collection(this.LEARNING_COLLECTION).add(titleDoc);
  }

  /**
   * Detect category from title/image
   */
  private async detectCategory(title: string, imageUrl?: string): Promise<string> {
    const prompt = `
    Analyze this title and determine the art category:
    "${title}"
    
    Categories: rothko, frida, religious, african, jazz, abstract, modern, vintage, nature, portrait
    
    Return only the category name:
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content?.toLowerCase().trim() || 'general';
    } catch (error) {
      console.error('Category detection error:', error);
      return 'general';
    }
  }

  /**
   * Generate title using AI + Firebase templates
   */
  async generateTitle(imageBase64: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Step 1: Detect category from image
      const category = await this.detectImageCategory(imageBase64);
      console.log(`🎨 Detected category: ${category}`);
      
      // Step 2: Get template from Firebase
      const template = await this.getTitleTemplate(category);
      
      // Step 3: Generate title using template + OpenAI
      let prompt = DEFAULT_TITLE_PROMPT;
      
      if (template) {
        let randomVariables = '';
        
        // Common separator variety for all categories
        const separators = ['|', '—', '-'];
        const randomSeparator = separators[Math.floor(Math.random() * separators.length)];
        
        if (category === 'rothko') {
          // Rothko specific variables
          const adjectives = ['Bold', 'Dramatic', 'Vibrant', 'Serene', 'Elegant', 'Moody', 'Contemplative', 'Striking', 'Peaceful'];
          const colors = ['Red', 'Orange', 'Teal', 'Ochre', 'Burgundy', 'Navy', 'Rust', 'Crimson', 'Amber', 'Deep Blue'];
          const rooms = ['Modern Living Room', 'Minimalist Office', 'Contemporary Bedroom', 'Stylish Dining Room', 'Elegant Entryway'];
          const values = ['Statement Piece', 'Ready to Hang', 'Gallery Quality', 'Art Lovers', 'Museum Style', 'Collector Item'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", color="${randomColor}", room="${randomRoom}", value="${randomValue}", separator="${randomSeparator}"`;
          
        } else if (category === 'klimt') {
          // Klimt/Golden Tears specific variables
          const adjectives = ['Elegant', 'Mystical', 'Captivating', 'Luxurious', 'Sophisticated', 'Enchanting', 'Glamorous', 'Opulent', 'Refined'];
          const styles = ['Woman', 'Portrait', 'Art', 'Goddess', 'Beauty', 'Lady', 'Figure'];
          const metallics = ['Luxurious', 'Art Deco', 'Sophisticated', 'Premium', 'Elegant', 'Glamorous'];
          const rooms = ['Living Room', 'Bedroom', 'Office', 'Dining Room', 'Entryway', 'Study'];
          const values = ['Statement Piece', 'Gallery Quality', 'Collector Item', 'Luxury Gift', 'Museum Style', 'Premium Art'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomMetallic = metallics[Math.floor(Math.random() * metallics.length)];
          const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", style="${randomStyle}", metallic="${randomMetallic}", room="${randomRoom}", value="${randomValue}", separator="${randomSeparator}"`;
          
        } else if (category === 'religious') {
          // Religious/Jesus specific variables
          const adjectives = ['Divine', 'Sacred', 'Powerful', 'Radiant', 'Holy', 'Blessed', 'Spiritual', 'Heavenly', 'Glowing'];
          const details = ['in White Robe', 'Walking in Light', 'with Open Arms', 'Praying Christ with Halo', 'with Golden Halo', 'in Divine Light', 'with Sacred Heart', 'in Heavenly Glow', 'Embracing Light', 'in Prayer Pose', 'with Radiant Halo', 'Christ with Open Arms', 'Walking on Water', 'Back View of Christ Toward Light', 'Walking Toward Light', 'Christ Walking into Light', 'on Sacred Waters', 'with Divine Reflection', 'in a Flower Garden', 'Surrounded by Flowers and Light', 'Under Light Beam', 'Embraced by Light and Nature', 'in a Garden Setting', 'with Heavenly Garden', 'Among Blooming Flowers', 'in Divine Garden Light'];
          const descriptions = ['Spiritual Christian Painting', 'Divine Religious Artwork', 'Sacred Christian Art', 'Heavenly Wall Art', 'Inspirational Christian Decor', 'Faith-Based Wall Art', 'Religious Canvas Art', 'Christian Home Decor'];
          const purposes = ['for Home or Prayer Room Decor', 'for Living Room or Faith Gift', 'for Christian Home and Spiritual Gift', 'for Prayer Room Wall Decor', 'for Peaceful Home Decor', 'for Church or Religious Space', 'for Christian Family Home', 'for Spiritual Meditation Space', 'for Tranquil Living Space', 'for Sacred Interior Decor', 'for Devotional Home Setting'];
          const values = ['Statement Piece', 'Faith Gift', 'Spiritual Art', 'Religious Decor', 'Divine Gift', 'Sacred Art'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomDetail = details[Math.floor(Math.random() * details.length)];
          const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", detail="${randomDetail}", separator="${randomSeparator}", description="${randomDescription}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'asian') {
          // Asian/Japanese specific variables
          const adjectives = ['Bold', 'Fierce', 'Mystical', 'Powerful', 'Elegant', 'Empowered', 'Graceful', 'Warrior', 'Traditional'];
          const subjects = ['Japanese Samurai Woman', 'Asian Warrior', 'Oriental Lady', 'Samurai Girl', 'Geisha Fighter', 'Dragon Warrior Woman', 'Japanese Fighter', 'Oriental Warrior'];
          const styles = ['Oriental Warrior', 'Empowered Woman', 'Traditional Woman', 'Bold Japanese Fighter', 'Asian Fantasy Character', 'Cultural Warrior'];
          const details = ['with Dragon Tattoo', 'in Kimono with Katana', 'with Cherry Blossoms', 'with Sword', 'with Dragon Motif', 'in Traditional Dress', 'with Oriental Weapons', 'with Japanese Art'];
          const themes = ['Asian Fantasy', 'Japanese Art', 'Oriental', 'Cultural', 'Eastern Art', 'Fantasy'];
          const purposes = ['for Living Room or Gift', 'for Cultural Decor', 'for Bedroom or Office', 'for Modern Home', 'for Asian Theme Decor', 'for Fantasy Collection'];
          const values = ['Statement Piece', 'Gallery Quality', 'Art Lovers', 'Collector Item', 'Cultural Art', 'Fantasy Decor'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomDetail = details[Math.floor(Math.random() * details.length)];
          const randomTheme = themes[Math.floor(Math.random() * themes.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", subject="${randomSubject}", separator="${randomSeparator}", style="${randomStyle}", detail="${randomDetail}", theme="${randomTheme}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'jazz') {
          // Jazz/Music specific variables
          const adjectives = ['Vibrant', 'Soulful', 'Dynamic', 'Expressive', 'Energetic', 'Classic', 'Smooth', 'Bold', 'Passionate'];
          const instruments = ['Trumpet Player', 'Saxophone Artist', 'Piano Player', 'Jazz Singer', 'Blues Guitarist', 'Drums Player', 'Bass Player', 'Jazz Musician'];
          const performers = ['Canvas Wall Art', 'Art Print', 'Wall Decor', 'Canvas Print'];
          const styles = ['Bold Jazz Musician', 'Classic Jazz Performance', 'Energetic Jazz Pianist', 'Powerful Vocalist', 'Smooth Jazz Artist', 'Vintage Jazz Player'];
          const details = ['in Colorful Style', 'in Blues Tones', 'in Action', 'in Vintage Style', 'with Musical Notes', 'in Concert Mode', 'with Instrument'];
          const venues = ['Musical', 'Music', 'Jazz Club', 'Concert', 'Studio', 'Vintage Music'];
          const purposes = ['for Living Room or Music Studio', 'for Home or Office', 'for Bedroom or Studio', 'for Living Room or Bar', 'for Music Room or Den', 'for Studio or Lounge'];
          const values = ['Statement Piece', 'Art Lovers', 'Gallery Quality', 'Collector Item', 'Musical Gift', 'Jazz Decor'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomInstrument = instruments[Math.floor(Math.random() * instruments.length)];
          const randomPerformer = performers[Math.floor(Math.random() * performers.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomDetail = details[Math.floor(Math.random() * details.length)];
          const randomVenue = venues[Math.floor(Math.random() * venues.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", instrument="${randomInstrument}", performer="${randomPerformer}", separator="${randomSeparator}", style="${randomStyle}", detail="${randomDetail}", venue="${randomVenue}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'woman') {
          // Woman Art specific variables
          const adjectives = ['Elegant', 'Powerful', 'Graceful', 'Strong', 'Confident', 'Bold', 'Beautiful', 'Empowering', 'Modern', 'Sexy', 'Stunning', 'Gorgeous', 'Fierce', 'Divine', 'Alluring', 'Captivating'];
          const styles = ['Modern Woman', 'African Woman', 'Business Woman', 'Portrait', 'Fashion', 'Professional', 'Contemporary', 'Pin-up Girl', 'Goddess', 'Nude Art', 'Female Figure', 'Lady Portrait', 'Girl Art', 'Beauty Art'];
          const details = ['Portrait', 'with Natural Hair', 'in Flowing Dress', 'in Professional Attire', 'with Confident Pose', 'in Elegant Style', 'with Powerful Stance', 'in Artistic Pose', 'with Flowing Hair', 'in Natural Beauty', 'with Graceful Pose', 'in Feminine Style'];
          const themes = ['Bold Female Art', 'Empowering Female Art', 'Feminine Portrait', 'Professional Female Art', 'Contemporary Woman Art', 'Strong Woman Art', 'Beauty Art', 'Pin-up Art', 'Goddess Art', 'Female Power Art', 'Nude Figure Art', 'Sensual Art'];
          const purposes = ['for Living Room or Bedroom Decor', 'for Office or Home', 'for Bedroom or Bathroom Decor', 'for Office or Study Room', 'for Empowerment Space', 'for Beauty Salon', 'for Feminine Space', 'for Boudoir Decor'];
          const values = ['Statement Piece', 'Gallery Quality', 'Art Lovers', 'Inspirational Decor', 'Empowering Gift', 'Female Power', 'Beauty Gift', 'Feminine Art', 'Goddess Art'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomDetail = details[Math.floor(Math.random() * details.length)];
          const randomTheme = themes[Math.floor(Math.random() * themes.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", style="${randomStyle}", detail="${randomDetail}", separator="${randomSeparator}", theme="${randomTheme}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'animal') {
          // Animal Art specific variables
          const adjectives = ['Majestic', 'Graceful', 'Powerful', 'Colorful', 'Wild', 'Noble', 'Fierce', 'Beautiful', 'Strong', 'Elegant', 'Bold', 'Vibrant', 'Stunning', 'Dynamic'];
          const animals = ['Lion', 'Elephant', 'Wolf', 'Tiger', 'Eagle', 'Deer', 'Horse', 'Bear', 'Owl', 'Hummingbird', 'Cat', 'Dog', 'Bird', 'Fox', 'Giraffe', 'Zebra', 'Panda', 'Monkey', 'Rabbit', 'Butterfly', 'Shark', 'Whale', 'Fish'];
          const poses = ['Portrait', 'in Nature', 'Pack', 'in Flight', 'Family', 'in Action', 'at Rest', 'Hunting', 'Running', 'Sitting', 'Looking', 'Standing', 'Playing', 'Swimming'];
          const styles = ['Bold Wildlife Art', 'Safari Animal Art', 'Nature Bird Art', 'Wild Animal Art', 'Forest Animal Art', 'Jungle Wildlife Art', 'Pet Portrait Art', 'Marine Animal Art', 'Domestic Animal Art', 'Farm Animal Art'];
          const purposes = ['for Living Room or Office Decor', 'for Bedroom or Study Room', 'for Man Cave or Living Room', 'for Kitchen or Bathroom', 'for Nature Lover', 'for Wildlife Enthusiast', 'for Pet Lover', 'for Animal Lover', 'for Safari Theme'];
          const values = ['Statement Piece', 'Gallery Quality', 'Collector Item', 'Art Lovers', 'Nature Gift', 'Wildlife Decor', 'Animal Art', 'Pet Gift'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
          const randomPose = poses[Math.floor(Math.random() * poses.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", animal="${randomAnimal}", pose="${randomPose}", separator="${randomSeparator}", style="${randomStyle}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'modern') {
          // Modern Art specific variables
          const adjectives = ['Bold', 'Vibrant', 'Dynamic', 'Elegant', 'Sleek', 'Contemporary', 'Minimalist', 'Stylish', 'Chic'];
          const styles = ['Geometric', 'Minimalist', 'Abstract', 'Contemporary', 'Linear', 'Structural', 'Artistic'];
          const patterns = ['Abstract', 'Lines', 'Shapes', 'Blocks', 'Forms', 'Designs', 'Patterns', 'Elements'];
          const designs = ['Contemporary Modern Art', 'Sleek Modern Design', 'Modern Contemporary Art', 'Sophisticated Modern Art', 'Stylish Design'];
          const purposes = ['for Living Room or Office', 'for Bedroom or Study', 'for Kitchen or Bathroom', 'for Dining Room or Entryway', 'for Modern Home'];
          const values = ['Statement Piece', 'Gallery Quality', 'Art Lovers', 'Collector Item', 'Modern Decor', 'Contemporary Gift'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
          const randomDesign = designs[Math.floor(Math.random() * designs.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", style="${randomStyle}", pattern="${randomPattern}", separator="${randomSeparator}", design="${randomDesign}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'zen') {
          // Zen/Buddha specific variables
          const adjectives = ['Peaceful', 'Serene', 'Tranquil', 'Calming', 'Meditative', 'Spiritual', 'Harmonious', 'Relaxing', 'Mindful'];
          const subjects = ['Buddha', 'Zen Stones', 'Lotus Flower', 'Bamboo Forest', 'Meditation', 'Buddhist', 'Zen Garden'];
          const elements = ['Meditation', 'Balance', 'Enlightenment', 'Harmony', 'Serenity', 'Peace', 'Wisdom', 'Tranquility'];
          const styles = ['Zen Spiritual Art', 'Minimalist Spa Art', 'Buddhist Spiritual Art', 'Zen Nature Art', 'Peaceful Meditation Art'];
          const purposes = ['for Living Room or Meditation Space', 'for Bathroom or Bedroom', 'for Yoga Room or Study', 'for Office or Living Room', 'for Spa or Relaxation'];
          const values = ['Tranquil Decor', 'Peaceful Gift', 'Meditation Decor', 'Relaxing Art', 'Spiritual Gift', 'Zen Decor'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
          const randomElement = elements[Math.floor(Math.random() * elements.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", subject="${randomSubject}", element="${randomElement}", separator="${randomSeparator}", style="${randomStyle}", purpose="${randomPurpose}", value="${randomValue}"`;
          
        } else if (category === 'nature') {
          // Nature/Botanical specific variables
          const adjectives = ['Vibrant', 'Serene', 'Delicate', 'Majestic', 'Beautiful', 'Lush', 'Peaceful', 'Colorful', 'Fresh'];
          const subjects = ['Sunflower Field', 'Mountain Landscape', 'Rose Garden', 'Forest Path', 'Ocean View', 'Cherry Blossoms', 'Wildflowers'];
          const settings = ['Canvas Wall Art', 'Nature Print', 'Landscape Art', 'Botanical Art', 'Scenic Art', 'Garden Art'];
          const styles = ['Botanical Flower Art', 'Nature Scenic Art', 'Floral Botanical Art', 'Woodland Nature Art', 'Garden Flower Art'];
          const purposes = ['for Kitchen or Living Room', 'for Bedroom or Office', 'for Bathroom or Dining Room', 'for Living Room or Study', 'for Nature Lover'];
          const values = ['Cheerful Decor', 'Peaceful Gift', 'Romantic Decor', 'Gallery Quality', 'Natural Beauty', 'Fresh Decor'];
          
          const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
          const randomSetting = settings[Math.floor(Math.random() * settings.length)];
          const randomStyle = styles[Math.floor(Math.random() * styles.length)];
          const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
          const randomValue = values[Math.floor(Math.random() * values.length)];
          
          randomVariables = `adjective="${randomAdjective}", subject="${randomSubject}", setting="${randomSetting}", separator="${randomSeparator}", style="${randomStyle}", purpose="${randomPurpose}", value="${randomValue}"`;
        }
        
        prompt += `\n\n# FIREBASE TEMPLATE GUIDANCE\nBased on successful titles, use this pattern:\n"${template.template}"\nExamples: ${template.examples.join(', ')}`;
        if (randomVariables) {
          prompt += `\n\n# RANDOM VARIABLES FOR DIVERSITY\nUse these random selections: ${randomVariables}`;
        }
        prompt += `\n\n# CRITICAL COPYRIGHT COMPLIANCE - MANDATORY\n🚨 NEVER EVER use "Mark Rothko" in titles - ALWAYS use "Rothko Style" instead!\n🚨 Using "Mark Rothko" can result in DMCA takedown and legal action\n🚨 This is MANDATORY for all Rothko-inspired artwork\n🚨 Examples: "Rothko Style Color Field" NOT "Mark Rothko Color Field"`;
      }
      
      const title = await this.callOpenAI(prompt, imageBase64);
      
      // Step 4: Save to learning database
      await this.saveGeneratedTitle(title, category, imageBase64);
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Title generated in ${processingTime}ms`);
      
      return title;
      
    } catch (error) {
      console.error('❌ Title generation error:', error);
      throw error;
    }
  }

  /**
   * Generate tags using AI + Firebase templates
   */
  async generateTags(title: string): Promise<string[]> {
    const startTime = Date.now();
    
    try {
      // Step 1: Detect category from title
      const category = await this.detectCategory(title);
      console.log(`🏷️ Detected category for tags: ${category}`);
      
      // Step 2: Get tag template from Firebase
      const template = await this.getTagTemplate(category);
      
      // Step 3: Generate tags using template + OpenAI
      let prompt = DEFAULT_TAG_PROMPT.replace('{title}', title);
      
      if (template) {
        prompt += `\n\n# FIREBASE TAG GUIDANCE\nSuccessful tags for this category: ${template.tags.join(', ')}`;
      }
      
      const tagsString = await this.callOpenAIForTags(prompt);
      const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // Step 4: Save to learning database
      await this.saveGeneratedTags(tags, category, title);
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ Tags generated in ${processingTime}ms`);
      
      return tags.slice(0, 13); // Ensure exactly 13 tags
      
    } catch (error) {
      console.error('❌ Tag generation error:', error);
      throw error;
    }
  }

  /**
   * Detect image category using OpenAI Vision
   */
  private async detectImageCategory(imageBase64: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and determine the art category. Categories: rothko, klimt, frida, religious, african, jazz, asian, woman, animal, modern, zen, nature, abstract, vintage, portrait, general. Return only the category name. PRIORITY DETECTION RULES: 1. 'woman' - ANY female figure, woman, girl, lady, female portrait, female body, female silhouette, sexy woman, nude woman, pin-up, goddess, female face, women art MUST be detected as 'woman'. 2. 'animal' - ANY animal (cat, dog, bird, lion, elephant, tiger, horse, deer, wolf, bear, wildlife, pets, safari animals, sea creatures, insects, farm animals) MUST be detected as 'animal'. 3. 'klimt' for golden tears, art nouveau, or Klimt-style portraits with gold elements. 4. 'asian' for Japanese, Chinese, samurai, geisha, oriental art, dragon motifs, or Asian cultural themes. 5. 'jazz' for musicians, musical instruments, jazz performers, trumpet, saxophone, piano players, or music-themed art. 6. 'modern' for contemporary, geometric, minimalist, or sleek modern designs. 7. 'zen' for Buddha, meditation, lotus flowers, bamboo, zen stones, or spiritual/peaceful themes. 8. 'nature' for landscapes, flowers, botanical art, forests, mountains, or natural scenery. If you see ANY female figure or woman (including sexy, nude, pin-up, goddess), ALWAYS return 'woman'."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 20,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content?.toLowerCase().trim() || 'general';
    } catch (error) {
      console.error('Image category detection error:', error);
      return 'general';
    }
  }

  /**
   * Get title template from Firebase
   */
  private async getTitleTemplate(category: string): Promise<TitleTemplate | null> {
    try {
      const doc = await adminDb.collection(this.TITLES_COLLECTION).doc(category).get();
      return doc.exists ? doc.data() as TitleTemplate : null;
    } catch (error) {
      console.error('Error getting title template:', error);
      return null;
    }
  }

  /**
   * Get tag template from Firebase
   */
  private async getTagTemplate(category: string): Promise<TagTemplate | null> {
    try {
      const categoryDoc = await adminDb.collection(this.TAGS_COLLECTION).doc(`${category}_tags`).get();
      return categoryDoc.exists ? categoryDoc.data() as TagTemplate : null;
    } catch (error) {
      console.error('Error getting tag template:', error);
      return null;
    }
  }

  /**
   * Call OpenAI for title generation
   */
  private async callOpenAI(prompt: string, imageBase64: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }

  /**
   * Call OpenAI for tag generation
   */
  private async callOpenAIForTags(prompt: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.5
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }

  /**
   * Save generated title to learning database
   */
  private async saveGeneratedTitle(title: string, category: string, imageBase64: string) {
    try {
      await adminDb.collection(this.LEARNING_COLLECTION).add({
        type: 'generated_title',
        title,
        category,
        imageHash: this.hashImage(imageBase64),
        created_at: new Date(),
        source: 'ai_generation'
      });
    } catch (error) {
      console.error('Error saving generated title:', error);
    }
  }

  /**
   * Save generated tags to learning database
   */
  private async saveGeneratedTags(tags: string[], category: string, title: string) {
    try {
      await adminDb.collection(this.LEARNING_COLLECTION).add({
        type: 'generated_tags',
        tags,
        category,
        title,
        created_at: new Date(),
        source: 'ai_generation'
      });
    } catch (error) {
      console.error('Error saving generated tags:', error);
    }
  }

  /**
   * Hash image for caching
   */
  private hashImage(imageBase64: string): string {
    // Simple hash function for image caching
    let hash = 0;
    for (let i = 0; i < imageBase64.length; i++) {
      const char = imageBase64.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Generate both title and tags in one call
   */
  async generateTitleAndTags(imageBase64: string): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Generate title first
      const title = await this.generateTitle(imageBase64);
      
      // Then generate tags based on title
      const tags = await this.generateTags(title);
      
      // Detect final category
      const category = await this.detectCategory(title);
      
      const processingTime = Date.now() - startTime;
      
      return {
        title,
        tags,
        category,
        confidence: 0.85, // Could be calculated based on template match
        processing_time: processingTime
      };
      
    } catch (error) {
      console.error('❌ Title and tags generation error:', error);
      throw error;
    }
  }

  /**
   * Update templates based on successful titles
   */
  async updateTemplatesFromSuccess(title: string, tags: string[], category: string) {
    try {
      // Update title template success count
      const titleRef = adminDb.collection(this.TITLES_COLLECTION).doc(category);
      await titleRef.update({
        success_count: adminDb.FieldValue.increment(1),
        last_success: new Date()
      });

      // Update tag template success count
      const tagRef = adminDb.collection(this.TAGS_COLLECTION).doc(`${category}_tags`);
      await tagRef.update({
        success_count: adminDb.FieldValue.increment(1),
        last_success: new Date()
      });

      console.log(`✅ Updated templates for category: ${category}`);
    } catch (error) {
      console.error('Error updating templates:', error);
    }
  }
}

// Export singleton instance
export const aiTitleTagSystem = new AITitleTagSystem();

// Export types
export type { GenerationResult, TitleTemplate, TagTemplate };