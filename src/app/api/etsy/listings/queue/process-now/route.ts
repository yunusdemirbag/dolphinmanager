import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - kuyruk hemen işle",
      updated_count: 0,
      pending_count: 0
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Firebase geçişi sonrası mock endpoint', 
      details: 'Process now API Firebase ile entegre edilecek' 
    }, { status: 200 });
  }
}