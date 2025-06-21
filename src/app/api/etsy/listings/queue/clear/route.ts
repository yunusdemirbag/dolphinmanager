import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: "Firebase geçişi sonrası mock endpoint - kuyruk temizleme" });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Firebase geçişi sonrası mock endpoint - kuyruk temizleme" });
} 