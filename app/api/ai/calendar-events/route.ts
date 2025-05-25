import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.log("OpenAI API key not found, returning empty events")
      return NextResponse.json({ events: [] })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Sen bir e-ticaret uzmanısın. Canvas wall art ürünleri satan Etsy mağazaları için önemli tarihleri ve fırsatları analiz ediyorsun. Türkiye pazarına odaklan."
        },
        {
          role: "user", 
          content: "Canvas wall art ürünleri için önümüzdeki 12 ay içinde önemli tarihler, sezonlar ve satış fırsatları nelerdir? Her biri için tema önerileri, renkler ve iş etkisi analizi yap. JSON formatında döndür."
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ events: [] })
    }

    try {
      const aiResponse = JSON.parse(content)
      return NextResponse.json({ events: aiResponse.events || [] })
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
      return NextResponse.json({ events: [] })
    }

  } catch (error) {
    console.error("Calendar events API error:", error)
    return NextResponse.json({ events: [] })
  }
} 