import { NextRequest, NextResponse } from "next/server"
import { titlePrompt, generateTitle, generateTitleWithFocus } from "@/lib/openai-yonetim"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');
    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: "Resim gerekli" }, { status: 400 });
    }
    const focusKeyword = formData.get('focusKeyword') as string;
    const requestType = formData.get('requestType') as string;

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const imageType = imageFile.type.split('/')[1] || 'jpeg';

    let title: string;

    if (requestType === 'focus' && focusKeyword) {
      // Focus başlık üret
      const result = await generateTitleWithFocus({
        imageBase64: base64,
        imageType,
        focusKeyword: focusKeyword.trim()
      });
      title = result.title;
    } else {
      // Normal başlık üret  
      title = await generateTitle({
        imageBase64: base64,
        imageType
      });
    }

    return NextResponse.json({ 
      title: title.trim(),
      success: true 
    });

  } catch (error) {
    console.error("Başlık oluşturulamadı:", error);
    return NextResponse.json(
      { error: 'Başlık oluşturulamadı' },
      { status: 500 }
    );
  }
} 