import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Initialize Firebase Admin
    initializeAdminApp();
    
    const body = await request.json();
    const { imageBase64 } = body;
    
    if (!imageBase64) {
      return NextResponse.json({
        success: false,
        error: 'Image data is required'
      }, { status: 400 });
    }
    
    console.log('🚀 Generating title and tags for image...');
    
    // Generate both title and tags using AI system
    const result = await aiTitleTagSystem.generateTitleAndTags(imageBase64);
    
    console.log(`✅ Title and ${result.tags.length} tags generated in ${result.processing_time}ms`);
    console.log(`📋 Title: "${result.title}"`);
    console.log(`🏷️ Tags: ${result.tags.join(', ')}`);
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Title and tags generation error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      processing_time: processingTime
    }, { status: 500 });
  }
}