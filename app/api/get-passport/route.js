import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Solo permitir GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  const { code } = req.query
  
  // Validar que el código existe
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Code parameter is required. Usage: /api/get-passport?code=CO-2026-0071' 
    })
  }

  // Validar formato del código (opcional pero recomendado)
  const codePattern = /^CO-(LEGACY-|20\d{2}-)\d{4}$/
  if (!codePattern.test(code)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid code format. Expected format: CO-2026-0071 or CO-LEGACY-0011' 
    })
  }

  try {
    // Crear cliente de Supabase con service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Buscar el passport en la base de datos
    const { data, error } = await supabase
      .from('passports')
      .select('code, holder_name, date, city, country, image_url, created_at')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + error.message 
      })
    }

    if (!data) {
      return res.status(404).json({ 
        success: false, 
        error: 'Passport not found' 
      })
    }

    // Retornar el passport encontrado
    return res.status(200).json({ 
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
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
}
