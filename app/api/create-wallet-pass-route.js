import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { holderName, email, passportCode, city, date } = await request.json();

    const PASSKIT_API_KEY = '-yI0BEdB_sV4ncWdf-LhpDez0SMVozWBtCNYtSbGmqxFcQLcTV_qn9mKixUmKE7beODVDuqgyq2wdHZ-DJH-Vq7Yr44bsrHStzuRU8fdPsIOTmnum-7OKpimJI8Rq_RPKRJsCmEO4BPK7dfRdcL_WohPZAWTv3Z1k7qhRNZrIhhW5qANlL10_BFMFYGk4nDQyfjIPpQVOLFG03UF8roU0yc_xTUDMSU2wp9PsHxAmQf_fnOO9Bq6Lo-cHwmb4X9ndsX8vZZGYJdIopVBbVb0Z4CekIwhwx1AHQVEg6-cR-52ZIBo1P5mJOOmy82yWI2K';
    const TEMPLATE_ID = '3UP24IA4gIOZ7I2Iwm1ePY';

    // Create pass in PassKit
    const passKitResponse = await fetch(
      `https://api.pub1.passkit.io/members/member`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PASSKIT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: TEMPLATE_ID,
          person: {
            displayName: holderName,
            emailAddress: email
          },
          members: {
            tier: {
              name: 'Certificate of Authenticity'
            },
            program: {
              name: 'ColorOut™ Passport'
            }
          },
          universal: {
            info: `Preserving color as preserving humanity. Verified ColorOut™ tattoo by Patrick Cat. Visit coloroutpassport.com`
          },
          externalId: passportCode,
          meta: {
            passportCode: passportCode,
            city: city,
            date: date
          }
        })
      }
    );

    const passData = await passKitResponse.json();

    if (passKitResponse.ok) {
      // PassKit returns URLs for Apple Wallet and Google Wallet
      return NextResponse.json({
        success: true,
        passUrl: passData.url || passData.passUrl,
        appleWalletUrl: passData.appleWalletUrl,
        googleWalletUrl: passData.googleWalletUrl,
        passId: passData.id
      });
    } else {
      console.error('PassKit error:', passData);
      return NextResponse.json(
        { success: false, error: 'Failed to create wallet pass', details: passData },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error creating wallet pass:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
