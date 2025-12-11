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
    
    console.log('🎨 Generating title for image...');
    
    // Generate title using AI system
    const title = await aiTitleTagSystem.generateTitle(imageBase64);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Title generated in ${processingTime}ms: "${title}"`);
    
    return NextResponse.json({
      success: true,
      title,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Title generation error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      processing_time: processingTime
    }, { status: 500 });
  }
}