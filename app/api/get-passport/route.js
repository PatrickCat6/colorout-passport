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

    const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

    const url = `${SUPABASE_URL}/rest/v1/passports?code=eq.${code}&select=*`;

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        passport: data[0]
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Passport not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching passport:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
