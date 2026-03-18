import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const RABT_PRODUCTS = `
Rabt Naturals Product Catalog:
MOONG MAGIC RANGE (for Oily/Acne-Prone skin):
- Moong Magic Cleanser (mm-cleanser) ₹299
- Moong Magic Toner (mm-toner) ₹249
- Moong Magic Serum (mm-serum) ₹599
- Moong Magic Moisturizer (mm-mois) ₹349
- Moong Magic Sunscreen SPF50 (mm-spf) ₹399

MASOOR GLOW RANGE (for Dull/Pigmented skin):
- Masoor Glow Cleanser (ms-cleanser) ₹299
- Masoor Glow Toner (ms-toner) ₹249
- Masoor Glow Serum (ms-serum) ₹599
- Masoor Glow Moisturizer (ms-mois) ₹349
- Masoor Glow Sunscreen (ms-spf) ₹399

OATS CARE RANGE (for Dry/Sensitive skin):
- Oats Care Cleanser (oc-cleanser) ₹299
- Oats Care Toner (oc-toner) ₹249
- Oats Care Serum (oc-serum) ₹599
- Oats Care Moisturizer (oc-mois) ₹349
- Oats Care Sunscreen (oc-spf) ₹399

STANDALONE:
- Eye Pulse Under-Eye Cream (eye-pulse) ₹449
- Ratiol Facewash (ratiol-fw) ₹349
- Ratiol Serum (ratiol-serum) ₹649
`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { images, imageBase64, concern, age, skinType, concerns, customer, skinQ } = body

    // ── Photo-based analysis (GPT-4o Vision) ──
    if (imageBase64 || (images && images.length > 0)) {
      const imageContent = imageBase64
        ? [{ type: 'image_url' as const, image_url: { url: imageBase64, detail: 'high' as const } }]
        : images.map((url: string) => ({ type: 'image_url' as const, image_url: { url, detail: 'high' as const } }))

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: `You are a professional skin analyst for Rabt Naturals, an Indian skincare brand.
Analyze this customer's skin from the photo carefully.

Customer Info:
- Age: ${age || customer?.age || 'Unknown'}
- Main concern: ${concern || concerns?.join(', ') || 'General skincare'}
- Additional info: Water intake: ${skinQ?.waterIntake || 'Unknown'}, Sleep: ${skinQ?.sleep || 'Unknown'}, Diet: ${skinQ?.diet || 'Unknown'}

${RABT_PRODUCTS}

Analyze the skin visible in the photo and respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "skinScore": 72,
  "skinType": "Oily/Dry/Combination/Normal/Sensitive",
  "skinTone": "Fair/Medium/Dusky/Dark",
  "skinSummary": "2-3 sentence detailed assessment of what you see in the photo",
  "primaryConcern": "main visible concern",
  "skinCategory": "one of: Acne-Prone Oily | Dry Sensitive | Combination Normal | Pigmented Dull | Aging Mature",
  "skinConcerns": ["visible concern 1", "visible concern 2", "visible concern 3"],
  "recommendedRange": "one of: Moong Magic | Masoor Glow | Oats Care",
  "rangeReason": "why this range based on what you see",
  "amRoutine": [{"step":1,"product":"Product Name","instruction":"how to use","time":"30 seconds"}],
  "pmRoutine": [{"step":1,"product":"Product Name","instruction":"how to use","time":"30 seconds"}],
  "dietAdvice": ["advice 1","advice 2","advice 3"],
  "lifestyleAdvice": ["advice 1","advice 2","advice 3"],
  "ingredientsToLookFor": ["ingredient 1","ingredient 2","ingredient 3"],
  "ingredientsToAvoid": ["ingredient 1","ingredient 2"],
  "weeklyTreatment": "weekly treatment suggestion",
  "expectedResults": {"week4":"result","week8":"result","week12":"result"},
  "specialistNote": "note for specialist guiding this customer",
  "productRecommendations": [
    {"productId":"mm-serum","reason":"why","priority":"must have","howToUse":"how to apply"}
  ]
}`
            }
          ]
        }],
        max_tokens: 2000,
      })

      const content = response.choices[0]?.message?.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
      const analysis = JSON.parse(jsonMatch[0])
      return NextResponse.json({ success: true, analysis })
    }

    // ── Text-based analysis (Anthropic Claude) ──
    if (skinType && concerns?.length) {
      const prompt = `You are an expert Ayurvedic skincare specialist at Rabt Naturals.
Customer: ${customer?.name || 'Customer'}, Age: ${customer?.age || 'Unknown'}
Skin Type: ${skinType}
Main Concerns: ${concerns.join(', ')}
Water Intake: ${skinQ?.waterIntake || 'Unknown'} glasses/day
Sleep: ${skinQ?.sleep || 'Unknown'} hours
Diet: ${skinQ?.diet || 'Unknown'}
Stress Level: ${skinQ?.stress || 'Unknown'}
Sun Exposure: ${skinQ?.outdoor || 'Unknown'}
Skin Goal: ${skinQ?.skinGoal || 'General improvement'}

Respond ONLY in JSON (no markdown):
{
  "skinScore": 72,
  "skinSummary": "2-3 sentence summary",
  "primaryConcern": "main issue",
  "skinCategory": "one of: Acne-Prone Oily | Dry Sensitive | Combination Normal | Pigmented Dull | Aging Mature",
  "recommendedRange": "one of: Moong Magic | Masoor Glow | Oats Care",
  "rangeReason": "why this range",
  "amRoutine": [{"step":1,"product":"Product Name","instruction":"how to use","time":"30 seconds"}],
  "pmRoutine": [{"step":1,"product":"Product Name","instruction":"how to use","time":"30 seconds"}],
  "dietAdvice": ["advice 1","advice 2","advice 3"],
  "lifestyleAdvice": ["advice 1","advice 2","advice 3"],
  "ingredientsToLookFor": ["ingredient 1","ingredient 2","ingredient 3"],
  "ingredientsToAvoid": ["ingredient 1","ingredient 2"],
  "weeklyTreatment": "weekly treatment suggestion",
  "expectedResults": {"week4":"","week8":"","week12":""},
  "specialistNote": "note for specialist",
  "productRecommendations": [
    {"productId":"mm-serum","reason":"why","priority":"must have","howToUse":"how to apply"}
  ]
}`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const analysis = JSON.parse(clean)
      return NextResponse.json({ success: true, analysis })
    }

    return NextResponse.json({ error: 'Photo ya skin details required hai' }, { status: 400 })

  } catch (err: any) {
    console.error('Skin analysis error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}