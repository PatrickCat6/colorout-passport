import { NextResponse } from 'next/server';

/**
 * Verify admin password from request header.
 * Client sends: Authorization: Bearer <password>
 * Server checks against process.env.ADMIN_PASSWORD
 */
export function requireAdmin(request) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    console.error('[admin] ADMIN_PASSWORD not configured');
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Server not configured' },
        { status: 500 }
      ),
    };
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!token || token !== ADMIN_PASSWORD) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

export function getSupabaseConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

export function supabaseHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}
