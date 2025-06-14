import { NextRequest, NextResponse } from "next/server"
import { titlePrompt, descriptionPrompt, tagsPrompt, categoryPrompt } from "@/lib/prompts"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    // Açıklama üretimi için JSON body
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const prompt = body.prompt;
      if (!prompt) {
        return NextResponse.json({ error: "Prompt gerekli" }, { status: 400 });
      }
      const apiKey = process.env.OPENAI_API_KEY;
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a world-class Etsy product description generator." },
            { role: "user", content: prompt }
          ],
          max_tokens: 600,
        })
      });
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || "Açıklama üretilemedi.";
      return new Response(result, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Başlık ve renk analizi için görsel (multipart/form-data)
    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) {
      return NextResponse.json({ error: "Görsel dosyası gerekli" }, { status: 400 })
    }
    // Görseli base64'e çevir
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/png";
    const imageData = `data:${mimeType};base64,${base64Image}`;
    
    // Başlık promtu
    const titlePromptText = titlePrompt.prompt;
    
    // Renk analizi promtu
    const colorAnalysisPrompt = "Analyze this image and identify the two most dominant colors. Return your answer in the following JSON format only, without any additional text or explanation: {\"primaryColor\": \"color name\", \"secondaryColor\": \"color name\"}. Use simple, common color names in Turkish (like Mavi, Kırmızı, Yeşil, Siyah, Beyaz, Gri, Mor, Turuncu, Sarı, Pembe, Kahverengi, Bej, Altın, Gümüş, etc). The primary color should be the most dominant color in the image, and the secondary color should be the second most dominant color.";
    
    // OpenAI Vision API'ye istek at - Başlık için
    const apiKey = process.env.OPENAI_API_KEY;
    const titleResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a world-class Etsy canvas wall art title generator." },
          { role: "user", content: [
            { type: "text", text: titlePromptText },
            { type: "image_url", image_url: { url: imageData } }
          ]}
        ],
        max_tokens: 300,
      })
    });
    const titleData = await titleResponse.json();
    const titleResult = titleData.choices?.[0]?.message?.content || "Başlık üretilemedi.";
    
    // OpenAI Vision API'ye istek at - Renk analizi için
    const colorResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a color analysis expert." },
          { role: "user", content: [
            { type: "text", text: colorAnalysisPrompt },
            { type: "image_url", image_url: { url: imageData } }
          ]}
        ],
        max_tokens: 100,
      })
    });
    const colorData = await colorResponse.json();
    const colorResult = colorData.choices?.[0]?.message?.content || "{}";
    
    // Sonuçları birleştir
    const combinedResult = {
      title: titleResult,
      colors: JSON.parse(colorResult)
    };
    
    return NextResponse.json(combinedResult, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "İşlem başarısız", detail: String(e) }, { status: 500 })
  }
} 