import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Returns a simple teal PNG icon for PWA
// Generates a minimal valid PNG with Rabt HQ branding
export async function GET(req: NextRequest) {
  const size = parseInt(req.nextUrl.searchParams.get('size') || '192')

  // Return SVG as image/svg+xml — browsers use this for PWA icons too
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#08090C"/>
  <rect x="${size*0.04}" y="${size*0.04}" width="${size*0.92}" height="${size*0.92}" rx="${size*0.13}" fill="#0d1117"/>
  <circle cx="${size/2}" cy="${size*0.42}" r="${size*0.22}" fill="none" stroke="#0197a6" stroke-width="${size*0.025}"/>
  <text x="${size/2}" y="${size*0.5}" font-family="Georgia,serif" font-size="${size*0.22}" font-weight="700" fill="#0197a6" text-anchor="middle" dominant-baseline="middle">R</text>
  <text x="${size/2}" y="${size*0.75}" font-family="Arial,sans-serif" font-size="${size*0.09}" font-weight="700" fill="#ffffff" text-anchor="middle">RABT HQ</text>
  <text x="${size/2}" y="${size*0.87}" font-family="Arial,sans-serif" font-size="${size*0.06}" fill="#0197a6" text-anchor="middle">Specialist</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}
