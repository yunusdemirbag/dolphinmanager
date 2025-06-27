import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeAdminApp();
    
    // Initialize AI system
    await aiTitleTagSystem.initialize();
    
    return NextResponse.json({
      success: true,
      message: 'AI Title-Tag System initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI System initialization error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}