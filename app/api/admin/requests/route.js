import { NextResponse } from 'next/server';
import { requireAdmin, getSupabaseConfig, supabaseHeaders } from '../_auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
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
    const res = await fetch(
      `${config.SUPABASE_URL}/rest/v1/passport_requests?status=eq.pending&order=created_at.desc`,
      { headers: supabaseHeaders(config.SUPABASE_ANON_KEY) }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('[admin/requests]', res.status, text);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch requests' },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      requests: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    console.error('[admin/requests]', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
