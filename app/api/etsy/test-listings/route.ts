import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Firebase geçişi sonrası mock endpoint" });
}

export async function POST() {
  return NextResponse.json({ message: "Firebase geçişi sonrası mock endpoint" });
}
