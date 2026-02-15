import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code parameter required' },
        { status: 400 }
      )
    }

    // Usar las credenciales desde las variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar el passport
    const { data, error } = await supabase
      .from('passports')
      .select('code, holder_name, date, city, country, image_url, created_at')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Database error: ' + error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Passport not found' },
        { status: 404 }
      )
    }

    // Retornar el passport
    return NextResponse.json({
      success: true,
      passport: {
        code: data.code,
        holder_name: data.holder_name,
        date: data.date,
        city: data.city,
        country: data.country,
        image_url: data.image_url,
        verified_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
