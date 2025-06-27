import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize Firebase Admin
    initializeAdminApp();
    
    const body = await request.json();
    const { title } = body;
    
    if (!title) {
      return NextResponse.json({
        success: false,
        error: 'Title is required'
      }, { status: 400 });
    }
    
    console.log(`🏷️ Generating tags for title: "${title}"`);
    
    // Generate tags using AI system
    const tags = await aiTitleTagSystem.generateTags(title);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ ${tags.length} tags generated in ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      tags,
      count: tags.length,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Tag generation error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      processing_time: processingTime
    }, { status: 500 });
  }
}