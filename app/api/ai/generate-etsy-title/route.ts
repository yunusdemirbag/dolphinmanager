import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
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

    // Promptu hazırla
    const prompt = [
      "TASK: Generate a single, SEO-optimized, high-conversion Etsy product title for a physical canvas wall art print based on the provided analysis.",
      "",
      "CRITICAL INSTRUCTIONS:",
      "1.  **MIMIC THE BENCHMARK:** The title's structure, adjective density, and rhythm MUST strictly imitate the style of the examples below. It should sound like it came directly from this library.",
      "2.  **STRUCTURE:** Follow this sequence: [Vivid Adjectives] → [Clear Subject] → [\"Canvas Wall Art\" or \"Canvas Painting\"] → [Art Style] → [Optional Hook for room/gift].",
      "3.  **CONSTRAINTS:**",
      "    - Maximum 135 characters.",
      "    - Use only '|' or '–' as a separator between phrases.",
      "    - FORBIDDEN WORDS: Do not use \"digital\", \"printable\", \"download\", \"Photo\", \"Horizontal\", \"Vertical\".",
      "",
      "---",
      "",
      "BENCHMARK LIBRARY (IMITATE THESE):",
      "*   Bold Modern Afro Art | Vibrant Cigar Smoker Canvas Print",
      "*   Graffiti Floral Woman Art | Bold Street Art Canvas Painting",
      "*   Minimalist Black and White Abstract Art | Modern Figurative Line Drawing",
      "*   Majestic Black Lion Canvas Art – Regal Animal Portrait with Gold Accents",
      "*   Japanese Crane Canvas Painting – Elegant Red Sun and Wave Wall Art",
      "*   Pop Art Wall Art, Comic Pop Art, Woman WOW, Omg Shock Comic Style",
      "",
      "---",
      "",
      "INPUT DATA FROM IMAGE ANALYSIS: (Analyze the attached image and fill below)",
      "-   **Subject:**",
      "-   **Style:**",
      "-   **Dominant Colors:**",
      "-   **Mood:**",
      "-   **Potential Hook:**",
      "",
      "---",
      "",
      "OUTPUT: Provide the title inside a markdown code block labeled \"TITLE\" and nothing else.",
      "",
      "**TITLE**",
      "```markdown",
      "[Generated English Title Here]",
      "```"
    ].join("\n");

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