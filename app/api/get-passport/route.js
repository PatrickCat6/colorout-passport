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
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3
