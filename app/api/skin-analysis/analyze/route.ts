import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic'



const CATALOG: Record<string, { price: number; concern: string[] }> = {
  'Glow Serum 30ml':       { price: 899, concern: ['Dark Spots', 'Dullness', 'Pigmentation'] },
  'Vitamin C Serum':       { price: 799, concern: ['Dark Spots', 'Dullness', 'Pigmentation', 'Fine Lines'] },
  'Niacinamide Toner':     { price: 499, concern: ['Acne', 'Oily Skin', 'Large Pores'] },
  'Salicylic Acid Serum':  { price: 649, concern: ['Acne', 'Blackheads'] },
  'Clay Mask':             { price: 449, concern: ['Acne', 'Oily Skin'] },
  'Hydrating Cream':       { price: 699, concern: ['Dryness', 'Fine Lines'] },
  'Hyaluronic Acid Serum': { price: 749, concern: ['Dryness', 'Fine Lines', 'Dullness'] },
  'Retinol Night Cream':   { price: 999, concern: ['Fine Lines', 'Pigmentation', 'Dullness'] },
  'Calming Serum':         { price: 849, concern: ['Redness', 'Irritation', 'Sensitive'] },
  'Centella Cream':        { price: 599, concern: ['Redness', 'Irritation'] },
  'Gentle Cleanser':       { price: 349, concern: ['Sensitive', 'Dryness'] },
  'SPF 50 Sunscreen':      { price: 549, concern: ['All'] },
  'Keratin Hair Mask':     { price: 899, concern: ['Hairfall', 'Damage', 'Frizz'] },
  'Scalp Serum 50ml':      { price: 899, concern: ['Hairfall', 'Dandruff'] },
}

export async function POST(req: NextRequest) {
  try {
    const { answers, customerName, mode } = await req.json()

    const prompt = `You are an expert skin analysis AI for Rabt Naturals — an Indian skincare brand.

Customer: ${customerName}
Analysis Mode: ${mode === 'quiz' ? 'Quiz Answers' : 'Photo Upload'}

${answers ? `Quiz Answers:
- Skin feel after waking up: ${answers.type || 'Not specified'}
- Main concern: ${answers.concern || 'Not specified'}
- Age group: ${answers.age || 'Not specified'}
- City/Climate: ${answers.location || 'Not specified'}
- Current routine: ${answers.routine || 'Not specified'}` : 'Photo analysis mode'}

Based on this information, provide a skin analysis in JSON format:
{
  "skinType": "Normal/Dry/Oily/Combination/Sensitive",
  "hydrationLevel": "Low/Medium/Good",
  "oiliness": "Low/Medium/High",
  "sensitivity": "Low/Medium/High",
  "score": 72,
  "concerns": ["Primary Concern", "Secondary Concern"],
  "recommendations": [
    {
      "product": "Product Name from catalog",
      "reason": "Why this product for their skin (1 sentence)",
      "price": 799
    }
  ],
  "routine": [
    { "step": "Morning Step 1", "product": "Product Name", "when": "Morning" },
    { "step": "Evening Step 1", "product": "Product Name", "when": "Evening" }
  ],
  "tips": ["Tip 1 for their specific skin", "Tip 2"]
}

Match concerns to these catalog products: ${Object.keys(CATALOG).join(', ')}
Recommend 3-4 products max. Be specific to Indian skin and climate context.`

    const anthropic = await getAnthropicClient()
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let analysis = null

    if (jsonMatch) {
      try {
        analysis = JSON.parse(jsonMatch[0])
        // Ensure prices from catalog
        if (analysis.recommendations) {
          analysis.recommendations = analysis.recommendations.map((r: any) => ({
            ...r,
            price: CATALOG[r.product]?.price || r.price || 799,
          }))
        }
      } catch { /* fallback */ }
    }

    if (!analysis) {
      const concern = answers?.concern || 'Dullness'
      analysis = {
        skinType: answers?.type?.includes('dry') ? 'Dry' : answers?.type?.includes('oily') ? 'Oily' : 'Combination',
        hydrationLevel: 'Medium', oiliness: 'Medium', sensitivity: 'Low', score: 65,
        concerns: [concern, 'General Care'],
        recommendations: [{ product: 'Glow Serum 30ml', reason: 'Best for Indian skin glow', price: 899 }],
        routine: [{ step: 'Cleanse', product: 'Gentle Cleanser', when: 'Morning' }],
        tips: ['Drink plenty of water', 'Use SPF daily'],
      }
    }

    return NextResponse.json({ analysis })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
