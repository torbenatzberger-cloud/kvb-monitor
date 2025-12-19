import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  // Sicherheitscheck: Nur Vercel Cron darf das aufrufen
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Einfacher Query um die DB wach zu halten
    const { data, error } = await supabase
      .from('tickets')
      .select('id')
      .limit(1)

    if (error) throw error

    console.log('✅ Supabase Keep-Alive erfolgreich:', new Date().toISOString())
    
    return Response.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: 'Supabase is awake!' 
    })
  } catch (error) {
    console.error('❌ Keep-Alive fehlgeschlagen:', error)
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
