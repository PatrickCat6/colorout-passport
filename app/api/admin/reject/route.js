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
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing request id' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${config.SUPABASE_URL}/rest/v1/passport_requests?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          ...supabaseHeaders(config.SUPABASE_ANON_KEY),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'rejected' }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('[admin/reject]', res.status, text);
      return NextResponse.json(
        { success: false, error: 'Failed to reject request' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/reject]', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
