import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { holder_name, email, tattoo_date, city } = body;

    if (!holder_name?.trim() || !email?.trim() || !tattoo_date?.trim() || !city?.trim()) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[claim-passport] Missing Supabase env vars');
      return NextResponse.json(
        { success: false, error: 'Server not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/passport_requests`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        holder_name: holder_name.trim(),
        email: email.trim().toLowerCase(),
        tattoo_date: tattoo_date.trim(),
        city: city.trim(),
        status: 'pending',
      }),
    });

    if (response.ok) {
      return NextResponse.json({ success: true });
    }

    const text = await response.text();
    console.error('[claim-passport] Supabase error:', response.status, text);
    return NextResponse.json(
      { success: false, error: 'Failed to submit request' },
      { status: 502 }
    );
  } catch (error) {
    console.error('[claim-passport] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
