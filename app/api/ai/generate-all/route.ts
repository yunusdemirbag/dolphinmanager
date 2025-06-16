import { NextResponse } from "next/server";
import { generateAllFromImage } from "@/lib/openai-yonetim";

export const maxDuration = 300; // 5 dakika
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { imageBase64, imageType } = await request.json();

    if (!imageBase64 || !imageType) {
      return NextResponse.json(
        { error: "Resim verisi eksik" },
        { status: 400 }
      );
    }

    const result = await generateAllFromImage({
      imageBase64,
      imageType
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate All API hatası:", error);
    return NextResponse.json(
      { error: "İçerik üretme hatası" },
      { status: 500 }
    );
  }
} 