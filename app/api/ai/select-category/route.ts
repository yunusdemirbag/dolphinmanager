import { NextRequest, NextResponse } from "next/server"
import { selectCategory } from "@/lib/openai-yonetim"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // JSON veri alımı için
    const contentType = request.headers.get("content-type") || "";
    
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type application/json olmalı" },
        { status: 400 }
      );
    }
    
    const { title, categoryNames } = await request.json();
    
    if (!title || !categoryNames || !Array.isArray(categoryNames)) {
      return NextResponse.json(
        { error: "Başlık ve kategori listesi gerekli" },
        { status: 400 }
      );
    }

    console.log("Kategori seçimi için istek:", { title, categoryNames });
    
    const selectedCategory = await selectCategory({
      title,
      categoryNames
    });
    
    console.log("Seçilen kategori:", selectedCategory);
    
    // Sadece kategori adını döndür (JSON değil, plain text)
    return new NextResponse(selectedCategory, {
      headers: { "Content-Type": "text/plain" }
    });
    
  } catch (error) {
    console.error("Kategori seçimi hatası:", error);
    return NextResponse.json(
      { error: 'Kategori seçimi başarısız' },
      { status: 500 }
    );
  }
} 