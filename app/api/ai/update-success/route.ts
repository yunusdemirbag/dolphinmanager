import { NextRequest, NextResponse } from 'next/server';
import { aiTitleTagSystem } from '@/lib/ai-title-tag-system';
import { initializeAdminApp } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initializeAdminApp();
    
    const body = await request.json();
    const { title, tags, category } = body;
    
    if (!title || !tags || !category) {
      return NextResponse.json({
        success: false,
        error: 'Title, tags, and category are required'
      }, { status: 400 });
    }
    
    console.log(`📈 Updating success metrics for category: ${category}`);
    
    // Update templates based on successful generation
    await aiTitleTagSystem.updateTemplatesFromSuccess(title, tags, category);
    
    return NextResponse.json({
      success: true,
      message: 'Success metrics updated',
      category,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Success update error:', error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}