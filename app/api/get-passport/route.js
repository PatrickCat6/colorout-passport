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
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNDI0MDAsImV4cCI6MjA1NDkxODQwMH0.ps8L1LCoabe9ijNe3r2ZoJScdE7xqVBXYJmZJtct-ww';

    const url = `${SUPABASE_URL}/rest/v1/passports?code=eq.${code}&select=*`;
    console.log('Fetching URL:', url);

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);

    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        passport: data[0]
      });
    } else {
      // Devolver info de debug
      return NextResponse.json(
        { 
          success: false, 
          error: 'Passport not found',
          debug: {
            searchedCode: code,
            responseLength: data?.length || 0,
            rawResponse: data
          }
        },
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
