import { NextResponse } from 'next/server';
import { requireAdmin, getSupabaseConfig, supabaseHeaders } from '../_auth';

export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json(
      { success: false, error: 'Server not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { id, holder_name, email, tattoo_date, city } = body;

    if (!id || !holder_name || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const headers = {
      ...supabaseHeaders(config.SUPABASE_ANON_KEY),
      'Content-Type': 'application/json',
    };

    // Generate next code
    let newCode = `CO-${new Date().getFullYear()}-0001`;
    try {
      const codeRes = await fetch(
        `${config.SUPABASE_URL}/rest/v1/passports?select=code&order=created_at.desc&limit=1`,
        { headers: supabaseHeaders(config.SUPABASE_ANON_KEY) }
      );
      const codeData = await codeRes.json();
      if (Array.isArray(codeData) && codeData.length > 0) {
        const parts = codeData[0].code.split('-');
        if (parts.length === 3) {
          const next = parseInt(parts[2], 10) + 1;
          newCode = `CO-${new Date().getFullYear()}-${String(next).padStart(4, '0')}`;
        }
      }
    } catch (e) {
      console.error('[admin/approve] code generation fallback:', e.message);
    }

    // Create passport
    const createRes = await fetch(`${config.SUPABASE_URL}/rest/v1/passports`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        code: newCode,
        holder_name,
        date: tattoo_date || null,
        city: city || null,
        image_url: null,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('[admin/approve] create passport failed:', err);
      return NextResponse.json(
        { success: false, error: 'Failed to create passport', details: err },
        { status: 502 }
      );
    }

    // Mark request as approved
    const updateRes = await fetch(
      `${config.SUPABASE_URL}/rest/v1/passport_requests?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_passport_code: newCode,
        }),
      }
    );

    if (!updateRes.ok) {
      console.error('[admin/approve] update request failed');
      return NextResponse.json(
        {
          success: false,
          error: 'Passport created but failed to update request status',
          code: newCode,
        },
        { status: 502 }
      );
    }

    // Try to send email (non-blocking failure)
    let emailSent = false;
    try {
      const emailRes = await fetch(
        new URL('/api/send-email', request.url).toString(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            holderName: holder_name,
            passportCode: newCode,
            walletPassUrl: null,
          }),
        }
      );
      const emailData = await emailRes.json();
      emailSent = !!emailData.success;
    } catch (e) {
      console.error('[admin/approve] email error:', e.message);
    }

    return NextResponse.json({
      success: true,
      code: newCode,
      emailSent,
    });
  } catch (error) {
    console.error('[admin/approve]', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
