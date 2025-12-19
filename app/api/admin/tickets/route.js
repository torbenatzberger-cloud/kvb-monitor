import { getSupabaseAdmin } from '../../../lib/supabase';
import { Resend } from 'resend';

// Admin-Passwort (einfache Lösung - später durch Auth ersetzen)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kvb-admin-2025';

function checkAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return false;
  }
  return true;
}

// GET: Alle Tickets abrufen
export async function GET(request) {
  if (!checkAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return Response.json({ error: 'Datenbankfehler' }, { status: 500 });
    }

    return Response.json({ tickets: data });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// PATCH: Ticket aktualisieren
export async function PATCH(request) {
  if (!checkAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, admin_notes, resolved_in_version, send_notification } = body;

    if (!id) {
      return Response.json({ error: 'Ticket-ID fehlt' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Ticket aktualisieren
    const updateData = {};
    if (status) updateData.status = status;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (resolved_in_version !== undefined) updateData.resolved_in_version = resolved_in_version;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return Response.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });
    }

    // E-Mail senden wenn gewünscht
    if (send_notification && ticket.notify_on_release && ticket.email && resolved_in_version) {
      try {
        await sendNotificationEmail(ticket, resolved_in_version);
        
        // Notified-Timestamp setzen
        await supabase
          .from('tickets')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', id);
          
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Fehler beim E-Mail-Versand nicht als Gesamtfehler behandeln
      }
    }

    return Response.json({ success: true, ticket });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// DELETE: Ticket löschen
export async function DELETE(request) {
  if (!checkAuth(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Ticket-ID fehlt' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return Response.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

// E-Mail-Benachrichtigung senden
async function sendNotificationEmail(ticket, version) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY nicht konfiguriert');
  }

  const resend = new Resend(resendApiKey);

  const typeLabels = {
    bug: 'Bug-Report',
    feature: 'Feature-Wunsch',
    feedback: 'Feedback'
  };

  const { error } = await resend.emails.send({
    from: 'KVB Monitor <noreply@kvb-monitor.de>',
    to: ticket.email,
    subject: `Dein ${typeLabels[ticket.type]} wurde umgesetzt! 🎉`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; margin: 0;">
          <div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header mit rotem Banner -->
            <div style="background: linear-gradient(90deg, #e30613 0%, #c10510 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">🚋 KVB Monitor</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px; color: #333333;">
              <p style="line-height: 1.6; margin: 0 0 16px;">Hallo${ticket.name ? ` ${ticket.name}` : ''}!</p>
              
              <p style="line-height: 1.6; margin: 0 0 16px;">Gute Nachrichten! Dein <strong>${typeLabels[ticket.type]}</strong> wurde umgesetzt und ist jetzt verfügbar:</p>
              
              <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #e30613;">
                <strong style="color: #333333;">${ticket.title}</strong>
              </div>
              
              <p style="line-height: 1.6; margin: 0 0 16px;">
                Verfügbar ab: <span style="display: inline-block; background: #00963f; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">Version ${version}</span>
              </p>
              
              <a href="https://kvb-monitor.de" style="display: inline-block; background: #e30613; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">Jetzt ansehen →</a>
              
              <p style="line-height: 1.6; margin: 24px 0 0;">Danke für dein Feedback – es hilft uns, die App besser zu machen. 💚</p>
            </div>
            
            <!-- Footer -->
            <div style="padding: 16px 24px; background: #f8f8f8; text-align: center; font-size: 12px; color: #666666;">
              KVB Monitor – Echtzeit-Abfahrten für Köln<br>
              <a href="https://kvb-monitor.de" style="color: #e30613;">kvb-monitor.de</a>
            </div>
            
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw error;
  }
}
