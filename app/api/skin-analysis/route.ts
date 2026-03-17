import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const RABT_PRODUCTS = `
Rabt Naturals Product Catalog:

MOONG MAGIC RANGE:
- Moong Magic Cleanser - gentle face wash for all skin types
- Moong Magic Toner - balancing toner with moong dal extract
- Moong Magic Serum - brightening serum with niacinamide, alpha arbutin, CICA
- Moong Magic Moisturizer - lightweight daily moisturizer
- Moong Magic Sunscreen - SPF protection with moong extracts

MASOOR GLOW RANGE:
- Masoor Glow Cleanser - exfoliating cleanser for dull skin
- Masoor Glow Toner - radiance-boosting toner
- Masoor Glow Serum - glow serum with masoor dal
- Masoor Glow Moisturizer - brightening moisturizer
- Masoor Glow Sunscreen - brightening SPF

OATS CARE RANGE:
- Oats Care Cleanser - soothing cleanser for sensitive skin
- Oats Care Toner - calming toner
- Oats Care Serum - soothing serum for sensitive/dry skin
- Oats Care Moisturizer - deep hydration moisturizer
- Oats Care Sunscreen - gentle SPF for sensitive skin

STANDALONE PRODUCTS:
- Eye Pulse Under Eye Cream - dark circles, puffiness
- Ratiol Facewash - retinol-based anti-aging facewash
- Ratiol Serum - retinol serum for fine lines and aging
`

export async function POST(req: NextRequest) {
  try {
    const { images, concern, age } = await req.json()
    
    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Images required' }, { status: 400 })
    }

    const imageContent = images.map((url: string) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'high' as const }
    }))

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: `You are a professional skin analyst for Rabt Naturals, an Indian skincare brand. Analyze this customer's skin from the photos.

Customer Info:
- Age: ${age || 'Unknown'}
- Main concern: ${concern || 'General skincare'}

${RABT_PRODUCTS}

Please analyze the skin and provide:
1. Skin type (oily/dry/combination/normal/sensitive)
2. Key skin concerns visible (acne, pigmentation, dryness, dullness, aging, dark circles, etc.)
3. Skin tone (fair/medium/dusky/dark)
4. Overall skin condition

Then recommend a personalized routine from ONLY Rabt Naturals products above.

Respond in this exact JSON format:
{
  "skinType": "...",
  "skinTone": "...",
  "skinConcerns": ["concern1", "concern2"],
  "skinCondition": "brief overall assessment in 1-2 lines",
  "amRoutine": [
    {"product": "exact product name from catalog", "step": 1, "reason": "why this product"}
  ],
  "pmRoutine": [
    {"product": "exact product name from catalog", "step": 1, "reason": "why this product"}
  ],
  "weeklyRoutine": [
    {"product": "exact product name from catalog", "frequency": "2x per week", "reason": "why"}
  ],
  "specialNotes": "any special advice for this customer"
}`
            }
          ]
        }
      ],
      max_tokens: 1500,
    })

    const content = response.choices[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })
    }
    
    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({ success: true, analysis })
    
  } catch (err: any) {
    console.error('Skin analysis error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
