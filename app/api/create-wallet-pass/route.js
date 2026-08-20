import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { holderName, email, passportCode, city, date } = await request.json();

    const PASSKIT_API_KEY = process.env.PASSKIT_API_KEY;
    const TEMPLATE_ID = process.env.PASSKIT_TEMPLATE_ID || '3UP24IA4gIOZ7I2Iwm1ePY';

    if (!PASSKIT_API_KEY) {
      console.error('[create-wallet-pass] PASSKIT_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Server not configured' },
        { status: 500 }
      );
    }

    if (!holderName || !email || !passportCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: holderName, email, passportCode' },
        { status: 400 }
      );
    }

    const passKitResponse = await fetch(
      'https://api.pub1.passkit.io/members/member',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PASSKIT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: TEMPLATE_ID,
          person: {
            displayName: holderName,
            emailAddress: email,
          },
          members: {
            tier: {
              name: 'Certificate of Authenticity',
            },
            program: {
              name: 'ColorOut™ Passport',
            },
          },
          universal: {
            info: 'Preserving color as preserving humanity. Verified ColorOut™ tattoo by Patrick Cat. Visit coloroutpassport.com',
          },
          externalId: passportCode,
          meta: {
            passportCode,
            city: city || '',
            date: date || '',
          },
        }),
      }
    );

    const passData = await passKitResponse.json();

    if (passKitResponse.ok) {
      return NextResponse.json({
        success: true,
        passUrl: passData.url || passData.passUrl,
        appleWalletUrl: passData.appleWalletUrl,
        googleWalletUrl: passData.googleWalletUrl,
        passId: passData.id,
      });
    }

    console.error('[create-wallet-pass] PassKit error:', passData);
    return NextResponse.json(
      { success: false, error: 'Failed to create wallet pass', details: passData },
      { status: 400 }
    );
  } catch (error) {
    console.error('[create-wallet-pass] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
