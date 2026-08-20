import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code parameter required' },
        { status: 400 }
      );
    }

    // Basic sanitization — only allow alphanumeric + hyphen/underscore
    if (!/^[A-Za-z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Invalid code format' },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[get-passport] Missing Supabase env vars');
      return NextResponse.json(
        { success: false, error: 'Server not configured' },
        { status: 500 }
      );
    }

    const url = `${SUPABASE_URL}/rest/v1/passports?code=eq.${encodeURIComponent(code)}&select=*`;

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[get-passport] Supabase error:', response.status, text);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch passport' },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        passport: data[0],
      });
    }

    return NextResponse.json(
      { success: false, error: 'Passport not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[get-passport] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
