import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { holderName, passportCode, city, date } = await request.json();

    // Create SVG badge (Instagram Story size: 1080x1920)
    const svg = `
<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Rainbow gradient for background -->
    <linearGradient id="rainbowBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:#06B6D4;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:0.3" />
    </linearGradient>
    
    <!-- Rainbow gradient for ColorOut text -->
    <linearGradient id="rainbowText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FF0000" />
      <stop offset="16.666%" style="stop-color:#FF7F00" />
      <stop offset="33.333%" style="stop-color:#FFFF00" />
      <stop offset="50%" style="stop-color:#00FF00" />
      <stop offset="66.666%" style="stop-color:#0000FF" />
      <stop offset="83.333%" style="stop-color:#8B00FF" />
      <stop offset="100%" style="stop-color:#FF0000" />
    </linearGradient>
    
    <!-- Code box gradient -->
    <linearGradient id="codeBox" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2D1B69" />
      <stop offset="100%" style="stop-color:#0E7490" />
    </linearGradient>
  </defs>
  
  <!-- Black background -->
  <rect width="1080" height="1920" fill="#000000"/>
  
  <!-- Top section with rainbow gradient ColorOut -->
  <text x="540" y="400" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="url(#rainbowText)" text-anchor="middle">
    ColorOut™
  </text>
  
  <text x="540" y="510" font-family="Arial, sans-serif" font-size="48" font-weight="500" fill="#FFFFFF" text-anchor="middle">
  Certificate of Authenticity
</text>
  
  <!-- Divider line -->
  <line x1="140" y1="600" x2="940" y2="600" stroke="#333333" stroke-width="2"/>
  
  <!-- Code box -->
  <rect x="140" y="700" width="800" height="300" rx="20" fill="url(#codeBox)" stroke="#6366F1" stroke-width="3"/>
  
  <text x="540" y="800" font-family="Arial, sans-serif" font-size="32" fill="#A0A0A0" text-anchor="middle">
    PASSPORT CODE
  </text>
  
  <text x="540" y="920" font-family="Courier New, monospace" font-size="64" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    ${passportCode}
  </text>
  
  <!-- Holder info -->
  <text x="540" y="1150" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    ${holderName}
  </text>
  
  <text x="540" y="1230" font-family="Arial, sans-serif" font-size="32" fill="#999999" text-anchor="middle">
    ${city} • ${date}
  </text>
  
  <!-- Bottom text -->
  <text x="540" y="1500" font-family="Arial, sans-serif" font-size="36" fill="#CCCCCC" text-anchor="middle">
    Preserving color as
  </text>
  <text x="540" y="1560" font-family="Arial, sans-serif" font-size="36" fill="#CCCCCC" text-anchor="middle">
    preserving humanity
  </text>
  
  <text x="540" y="1700" font-family="Arial, sans-serif" font-size="32" fill="#666666" text-anchor="middle">
    Verified ColorOut™ tattoo by Patrick Cat
  </text>
  
  <text x="540" y="1780" font-family="Arial, sans-serif" font-size="28" fill="#8B5CF6" text-anchor="middle">
    coloroutpassport.com
  </text>
</svg>
    `;

    // Return SVG as response - the client can convert to PNG if needed
    // For now, we'll return the SVG data URL that can be used directly
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return NextResponse.json({
      success: true,
      badgeUrl: svgDataUrl,
      svg: svg
    });

  } catch (error) {
    console.error('Error generating badge:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
