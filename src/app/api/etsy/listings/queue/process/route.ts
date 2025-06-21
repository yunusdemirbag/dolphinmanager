import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - kuyruk işle",
      processed: 0,
      errors: [],
      total_items: 0
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Firebase geçişi sonrası mock endpoint', 
      details: 'Process queue API Firebase ile entegre edilecek' 
    }, { status: 200 });
  }
}