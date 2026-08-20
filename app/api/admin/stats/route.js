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
    const res = await fetch(`${config.SUPABASE_URL}/rest/v1/passports?select=*`, {
      headers: {
        ...supabaseHeaders(config.SUPABASE_ANON_KEY),
        Prefer: 'count=exact',
      },
    });

    let total = 0;
    const range = res.headers.get('content-range');
    if (range) {
      const parsed = parseInt(range.split('/')[1], 10);
      if (!isNaN(parsed)) total = parsed;
    }

    return NextResponse.json({ success: true, totalApproved: total });
  } catch (error) {
    console.error('[admin/stats]', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
