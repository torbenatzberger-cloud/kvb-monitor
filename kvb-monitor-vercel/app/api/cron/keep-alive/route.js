import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  // Sicherheitscheck: Nur Vercel Cron darf das aufrufen
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Lazy-load Supabase client only when route is called
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing')
    return Response.json({
      success: false,
      error: 'Supabase not configured'
    }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

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
