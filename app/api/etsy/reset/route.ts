import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    return NextResponse.json({
      success: true,
      message: "Firebase geçişi sonrası mock endpoint - Etsy reset"
    });

  } catch (error) {
    return NextResponse.json({
      error: "Firebase geçişi sonrası mock endpoint",
      details: "Etsy reset API Firebase ile entegre edilecek"
    }, { status: 200 });
  }
}