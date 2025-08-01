import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type');
    let image, prompt;
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      const imageFile = formData.get('image') as File;
      prompt = formData.get('prompt') as string;
      
      if (!imageFile) {
        return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
      }
      
      // Convert image file to base64 data URL for OpenAI
      const buffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      image = `data:${imageFile.type};base64,${base64}`;
    } else {
      // Handle JSON
      const body = await request.json();
      image = body.image;
      prompt = body.prompt;
    }

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const defaultPrompt = `TASK: Generate a single, SEO-optimized, high-conversion Etsy product title for a physical canvas wall art print based on this image.

REQUIREMENTS:
- Maximum 140 characters
- Include primary keyword: "canvas wall art" or "wall decor"
- Include 2-3 relevant style descriptors (modern, minimalist, abstract, etc.)
- Include room/space keywords (living room, bedroom, office, etc.)
- Must be in English
- Focus on physical canvas prints, not digital downloads

OUTPUT FORMAT:
Return only the title, no quotes, no explanations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt || defaultPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const title = response.choices[0]?.message?.content?.trim() || 'Beautiful Canvas Wall Art Print - Modern Home Decor';

    return NextResponse.json({ title });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}