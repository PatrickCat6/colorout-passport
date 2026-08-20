import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      console.error('[admin/login] ADMIN_PASSWORD not configured');
      return NextResponse.json(
        { success: false, error: 'Server not configured' },
        { status: 500 }
      );
    }

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
