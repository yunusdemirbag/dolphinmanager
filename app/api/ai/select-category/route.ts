import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getPromptById } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { title, categoryNames } = await request.json();

    if (!title || !categoryNames || !Array.isArray(categoryNames)) {
      return NextResponse.json({ error: 'Title and categoryNames array are required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Get category prompt
    const categoryPromptConfig = getPromptById('category-prompt');
    let prompt = categoryPromptConfig?.prompt || 'Select the best category for this product title.';
    
    // Replace variables
    prompt = prompt.replace('${title}', title);
    prompt = prompt.replace('${categoryNames}', categoryNames.join('\n'));

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const selectedCategory = response.choices[0]?.message?.content?.trim();
    
    // Check if selected category is in the list
    if (selectedCategory && categoryNames.includes(selectedCategory)) {
      return new Response(selectedCategory, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Fallback: return first category
    return new Response(categoryNames[0] || 'Home', {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('Category selection error:', error);
    return NextResponse.json(
      { error: 'Failed to select category' },
      { status: 500 }
    );
  }
}