import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';

// Default Digital Product Description Templates
const DIGITAL_DESCRIPTIONS = [
  `🖼️ DIGITAL DOWNLOAD ONLY - NO PHYSICAL ITEM WILL BE SHIPPED

▶︎ INSTANT DOWNLOAD - You'll receive 5 high-resolution JPG files (300 DPI)

▶︎ MULTIPLE SIZES INCLUDED - Ready to print in 20+ sizes including:
   • US Sizes: 5x7, 8x10, 11x14, 16x20, 18x24 inches
   • International: A5, A4, A3, A2, 50x70cm

▶︎ EASY TO USE - Download directly from your Etsy account or confirmation email

▶︎ PRINT ANYWHERE - At home on your printer, local print shop, or online services like Shutterfly

▶︎ PERFECT FOR - Home decor, gallery walls, gifts, office spaces, nurseries

▶︎ PERSONAL USE ONLY - Contact me for commercial licensing options

▶︎ COLORS MAY VARY slightly between screens and printers`,

  `📲 PRINTABLE WALL ART - INSTANT DIGITAL DOWNLOAD

▶︎ This is a DIGITAL DOWNLOAD ONLY - No physical product will be shipped

▶︎ You will receive 5 HIGH-RESOLUTION FILES:
   • 5 JPG files (300 DPI) for crystal clear printing
   • Multiple aspect ratios for perfect fitting in standard frames

▶︎ SIZES INCLUDED: 4x5, 5x7, 8x10, 11x14, 16x20, A5, A4, A3, and more

▶︎ HOW TO ACCESS: Files are available immediately after purchase in your Etsy account

▶︎ PRINTING OPTIONS: Print at home, at a local print shop, or upload to online printing services

▶︎ COPYRIGHT: For personal use only - Please contact for commercial licensing

▶︎ FRAMES AND PROPS in photos are for display purposes only and not included`,

  `🎨 DIGITAL WALL ART - PRINTABLE DOWNLOAD

▶︎ DIGITAL PRODUCT ONLY - Nothing will be shipped to you

▶︎ WHAT'S INCLUDED:
   • 5 High-Resolution JPG Files (300 DPI)
   • Multiple aspect ratios for versatile printing options
   • Instant download after purchase

▶︎ PRINT SIZES: Works with standard frame sizes including 5x7, 8x10, 11x14, 16x20, A4, A3, 50x70cm and more

▶︎ PERFECT FOR: Home decor, office spaces, gifts, gallery walls

▶︎ PRINTING: Print at home, local print shop, or online printing services

▶︎ COLORS may vary slightly between different screens and printers

▶︎ COPYRIGHT: For personal use only. Contact me for commercial licensing options`,

  `💻 PRINTABLE WALL ART - DIGITAL DOWNLOAD ONLY

▶︎ This listing is for a DIGITAL DOWNLOAD - No physical item will be shipped

▶︎ WHAT YOU'LL RECEIVE:
   • 5 High-Quality JPG Files (300 DPI)
   • Multiple aspect ratios for various frame sizes
   • Instant access after purchase

▶︎ COMPATIBLE SIZES: 5x7, 8x10, 11x14, 16x20, A5, A4, A3, 50x70cm and more

▶︎ HOW TO ACCESS: Download directly from your Etsy account or confirmation email

▶︎ PRINTING RECOMMENDATIONS: Use high-quality paper for best results

▶︎ USAGE RIGHTS: For personal use only - Contact for commercial licensing

▶︎ CUSTOMER SUPPORT: Message me if you need any assistance with your files`,

  `🖨️ DIGITAL WALL ART - INSTANT DOWNLOAD

▶︎ DIGITAL FILES ONLY - No physical product will be shipped

▶︎ FILE DETAILS:
   • 5 High-Resolution JPG Files (300 DPI)
   • Ready to print in multiple standard sizes
   • Instant download after purchase confirmation

▶︎ INCLUDED SIZES: Compatible with 5x7, 8x10, 11x14, 16x20, A5, A4, A3, 50x70cm frames and more

▶︎ DOWNLOAD INSTRUCTIONS: Access files immediately in your Etsy account or via email

▶︎ PRINTING OPTIONS: Print at home, local print shop, or online printing services

▶︎ COLOR NOTE: Actual colors may vary slightly depending on your screen settings and printer

▶︎ COPYRIGHT: For personal use only - Commercial use requires licensing`
];

// Default Prompts for Digital Products
const DEFAULT_TITLE_PROMPT = `
# CRITICAL INSTRUCTIONS
YOU MUST COPY THE EXACT FORMAT OF THESE EXAMPLES. DO NOT USE ELLIPSIS (...) OR ABBREVIATIONS.
ALWAYS END WITH "Digital Download" - NEVER SHORTEN OR USE "..." AT THE END.

# EXAMPLES TO COPY EXACTLY
"Lemons Art Print | Kitchen Lemon PRINTABLE Wall Art | Farmhouse Dining Room Painting | Yellow Lemons Wall Art | Digital Download"
"Mexican Snake Poster | Latin Folk Art Snake Wall Print | Colorful Floral Snake ArtWork | Boho Home Decor Modern Botanical Art | Digital Download"
"Ghosts in a Fall Landscape Print | Halloween PRINTABLE Wall Art | Cute Ghost Decor | Vintage Style Autumn Print | Digital Download"
"Did Someone Say Wine Altered Art | Humorous Quote Poster | Funny Retro Print | Typography Jesus Poster | Quirky Kitchen Decor | Digital Download"
"Skeleton Print | Halloween PRINTABLE Wall Art | Spooky Halloween Decor | Halloween Poster | Skeleton Peace Sign Digital Download"
"Swan Art Print | Vintage PRINTABLE Wall Art | Pastel Farmhouse Nursery Painting | Antique Swan Wall Art | Digital Download"
"Blue Stripe Floral Print | Pastel Blue PRINTABLE Wall Art | Soft Baby Blue Nursery Decor | Botanical Forget-Me-Not Flower Wall Art | Digital Download"
"Orange Fruit Print | Kitchen PRINTABLE Wall Art | Modern Farmhouse Kitchen Print | Orange & Green Decor | Vintage Minimalistic Art | Digital Download"
"Fashion Cheetah Art Print | Fashion Art Print | Home Decor | Digital Downloads | Wall Decoration | Gift For Her Kitchen | Bedroom and Living Room"
"Minimalist Abstract Printable Wall Art | Royal Blue Art Print | Modern Art Poster | Large Size Abstract Digital Print | Artwork Gift For Home"
"Royal Blue Minimalist Abstract Printable Wall Art | Bright Blue Modern Art Poster | Oversize Abstract Digital Art | Large Size Abstract Print"

# TASK
Generate ONE Etsy product title that EXACTLY matches the format of the examples above.

# TITLE STRUCTURE - MANDATORY
\`[Subject] Art Print | [Room/Theme] PRINTABLE Wall Art | [Style] [Room] [Type] | [Color/Detail] [Subject] Wall Art | Digital Download\`

# MANDATORY RULES
1. ALWAYS end with "Digital Download" - NEVER use ellipsis (...) or abbreviate
2. ALWAYS use pipes (|) to separate sections
3. ALWAYS include "PRINTABLE" in all caps
4. Include room keywords: Kitchen, Bedroom, Nursery, Living Room, Dining Room, Bathroom, Office
5. Include color descriptions
6. Include style descriptors: Modern, Minimalist, Vintage, Farmhouse, Boho, Abstract
7. Title Case for each word
8. FORBIDDEN: canvas, physical, shipped, shipping, print included, frame included, framed poster, ready to hang, stretched canvas

# OUTPUT
Return ONLY the final title line—no quotes, no explanations, no ellipsis.
`;

const DEFAULT_TAG_PROMPT = `
# ENHANCED ETSY TAGS SEO PROMPT FOR DIGITAL PRODUCTS

## ROLE
You are the ULTIMATE ETSY SEO strategist creating hyper-optimized TAGS for **DIGITAL DOWNLOADABLE PRODUCTS** aimed at U.S. & global English-speaking buyers with ADVANCED recognition capabilities.

## INPUT
• The final product TITLE (English).  
  TITLE: {title}

## TASK
Generate **EXACTLY 13 long-tail Etsy tags** that maximize search reach and conversion.

## STAGE 1 · ADVANCED TAG INTELLIGENCE
### Digital Product Type Recognition & Tag Strategy
- **Printable Wall Art** → "printable art", "digital download", "wall art print"  
- **Digital Planner** → "digital planner", "planner pdf", "goodnotes planner"  
- **SVG Cut Files** → "svg bundle", "cricut files", "cutting files"  
- **Digital Paper** → "digital paper", "scrapbook paper", "printable paper"  
- **Templates** → "editable template", "digital template", "invitation template"  

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
8. Include **at least one trending Etsy search term** (e.g., "boho printable", "digital download").  
9. Balance broad appeal with niche specificity.

## FORBIDDEN WORDS
canvas, physical, shipped, shipping, print included, frame included, framed poster, ready to hang, stretched canvas, beautiful, nice, awesome, amazing, gorgeous, stunning, wonderful, cute, lovely, pretty, high quality, cheap, best price, sale, discount, free shipping, unique, perfect, special, exclusive, premium, luxury, professional, top quality, superior

## TAG MIX STRATEGY
• **3 product type tags** – main format & variations (e.g., "digital download", "printable art", "wall art pdf")  
• **2 style tags** – art style or design ("abstract digital", "minimalist print")  
• **2 color/theme tags** – dominant palette ("black white art", "botanical print")  
• **2 room / placement tags** – context ("living room", "office decor")  
• **2 format / benefit tags** – product value ("instant download", "home decor")  
• **2 audience / occasion or trending tags** – targeting or buzz ("gift idea", "home office")

## ETSY SEO TACTICS
- **Long-tail focus**: "modern printable art" > "printable".  
- **Search intent**: include buyer phrases like "wall decor", "home art".  
- **Seasonal awareness**: add seasonal tags when appropriate.  
- **Trending terms**: track current popular Etsy searches.  
- **Niche targeting**: balance mainstream reach with specific interests.

## OUTPUT FORMAT
Return **ONLY** the 13 tags, comma-separated, nothing else.

**Example Output:**  
\`digital wall art, printable art, instant download, home decor, wall art print, modern printable, bedroom decor, minimalist art, office wall art, abstract print, black white art, pdf download, living room art\`
`;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIDigitalTitleTagSystem {
  
  // Firebase Collections
  private TITLES_COLLECTION = 'ai_digital_titles';
  private TAGS_COLLECTION = 'ai_digital_tags';
  private LEARNING_COLLECTION = 'ai_digital_learning';
  
  /**
   * Generate title and tags for a digital product
   */
  /**
   * Generate a description for a digital product
   */
  generateDigitalDescription(): string {
    // Randomly select one of the description templates
    const randomIndex = Math.floor(Math.random() * DIGITAL_DESCRIPTIONS.length);
    return DIGITAL_DESCRIPTIONS[randomIndex];
  }

  /**
   * Generate title, tags, and description for a digital product
   */
  async generateTitleAndTags(imageBase64: string): Promise<{
    title: string;
    tags: string[];
    category: string;
    confidence: number;
    processing_time: number;
    description: string;
    shopSection?: number;
    shopSectionTitle?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Generate title
      const title = await this.generateTitle(imageBase64);
      
      // Generate tags based on title
      const tags = await this.generateTags(title);
      
      // Detect category
      const category = await this.detectCategory(title);
      
      const processingTime = Date.now() - startTime;
      
      // Generate description
      const description = this.generateDigitalDescription();
      
      return {
        title,
        tags,
        category,
        confidence: 0.9,
        processing_time: processingTime,
        description
      };
    } catch (error) {
      console.error('Error generating title and tags:', error);
      throw error;
    }
  }
  
  /**
   * Generate title for a digital product
   */
  private async generateTitle(imageBase64: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: [
              { type: "text", text: DEFAULT_TITLE_PROMPT },
              { 
                type: "image_url", 
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content?.trim() || 'Digital Wall Art Printable';
    } catch (error) {
      console.error('OpenAI title generation error:', error);
      return 'Digital Wall Art Printable';
    }
  }
  
  /**
   * Generate tags based on title
   */
  private async generateTags(title: string): Promise<string[]> {
    try {
      const prompt = DEFAULT_TAG_PROMPT.replace('{title}', title);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const tagsString = response.choices[0]?.message?.content?.trim() || '';
      return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } catch (error) {
      console.error('OpenAI tag generation error:', error);
      return [
        'digital wall art', 
        'printable art', 
        'instant download', 
        'wall art print', 
        'home decor', 
        'wall decor', 
        'modern printable', 
        'minimalist art', 
        'office wall art', 
        'abstract print', 
        'bedroom decor', 
        'pdf download', 
        'living room art'
      ];
    }
  }
  
  /**
   * Detect category from title
   */
  private async detectCategory(title: string): Promise<string> {
    const prompt = `
    Analyze this title and determine the digital product category:
    "${title}"
    
    Categories: printable, planner, svg, paper, template
    
    Return only the category name:
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content?.toLowerCase().trim() || 'printable';
    } catch (error) {
      console.error('Category detection error:', error);
      return 'printable';
    }
  }
  
  /**
   * Update templates from successful generation
   */
  async updateTemplatesFromSuccess(title: string, tags: string[], category: string) {
    if (!adminDb) {
      console.error('Firebase Admin not initialized');
      return;
    }
    
    try {
      // Update title template
      const titleRef = adminDb.collection(this.TITLES_COLLECTION).doc(category);
      await titleRef.update({
        success_count: FieldValue.increment(1),
        examples: FieldValue.arrayUnion(title)
      });
      
      // Update tag template
      const tagRef = adminDb.collection(this.TAGS_COLLECTION).doc(`${category}_tags`);
      await tagRef.update({
        success_count: FieldValue.increment(1),
        tags: tags
      });
      
      console.log(`✅ Updated digital templates for category: ${category}`);
    } catch (error) {
      console.error('Error updating templates:', error);
    }
  }
}

// Create and export instance
const aiDigitalTitleTagSystem = new AIDigitalTitleTagSystem();
export { aiDigitalTitleTagSystem };