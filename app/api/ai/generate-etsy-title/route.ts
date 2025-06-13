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

    // Başlık üretimi için görsel (multipart/form-data)
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
    
    // Promptu lib/prompts.ts'den al
    const prompt = titlePrompt.prompt;
    
    // OpenAI Vision API'ye istek at
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
          { role: "system", content: "You are a world-class Etsy canvas wall art title generator." },
          { role: "user", content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageData } }
          ]}
        ],
        max_tokens: 300,
      })
    });
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "Başlık üretilemedi.";
    return new Response(result, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ error: "Başlık üretilemedi", detail: String(e) }, { status: 500 })
  }
} 