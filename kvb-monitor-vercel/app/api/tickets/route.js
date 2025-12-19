import { getSupabaseAdmin } from '../../lib/supabase';
import { Resend } from 'resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, type, title, description, notify_on_release } = body;

    // Validierung
    if (!email || !type || !title || !description) {
      return Response.json(
        { success: false, error: 'Bitte alle Pflichtfelder ausfüllen' },
        { status: 400 }
      );
    }

    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { success: false, error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Typ prüfen
    if (!['bug', 'feature', 'feedback'].includes(type)) {
      return Response.json(
        { success: false, error: 'Ungültiger Ticket-Typ' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('tickets')
      .insert([
        {
          email,
          name: name || null,
          type,
          title,
          description,
          notify_on_release: notify_on_release !== false,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return Response.json(
        { success: false, error: 'Fehler beim Speichern' },
        { status: 500 }
      );
    }

    // Admin per E-Mail benachrichtigen
    try {
      await sendAdminNotification({ ...data, email, name, type, title, description });
    } catch (emailError) {
      console.error('Admin notification error:', emailError);
      // Fehler beim E-Mail-Versand nicht als Gesamtfehler behandeln
    }

    return Response.json({
      success: true,
      ticket: {
        id: data.id,
        type: data.type,
        title: data.title,
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { success: false, error: 'Serverfehler' },
      { status: 500 }
    );
  }
}

// Admin-Benachrichtigung bei neuem Ticket
async function sendAdminNotification(ticket) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY nicht konfiguriert');
  }

  const resend = new Resend(resendApiKey);

  const typeLabels = {
    bug: '🐛 Bug-Report',
    feature: '✨ Feature-Wunsch',
    feedback: '💬 Feedback'
  };

  const typeColors = {
    bug: '#ef4444',
    feature: '#8b5cf6',
    feedback: '#06b6d4'
  };

  await resend.emails.send({
    from: 'KVB Monitor <noreply@kvb-monitor.de>',
    to: 'torben.atzberger@outlook.de',
    subject: `${typeLabels[ticket.type]}: ${ticket.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; margin: 0; }
            .container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(90deg, #e30613 0%, #c10510 100%); color: #fff; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
            .badge { display: inline-block; background: ${typeColors[ticket.type]}; color: #fff; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 12px; }
            .content { padding: 24px; color: #333; }
            .content p { line-height: 1.6; margin: 0 0 12px; }
            .ticket-box { background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${typeColors[ticket.type]}; }
            .ticket-box h3 { margin: 0 0 8px; font-size: 16px; }
            .ticket-box p { margin: 0; color: #555; font-size: 14px; white-space: pre-wrap; }
            .meta { font-size: 13px; color: #666; background: #f8f8f8; padding: 12px 16px; border-radius: 8px; }
            .button { display: inline-block; background: #e30613; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
            .footer { padding: 16px 24px; background: #f8f8f8; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 Neues Ticket</h1>
              <div class="badge">${typeLabels[ticket.type]}</div>
            </div>
            <div class="content">
              <div class="ticket-box">
                <h3>${ticket.title}</h3>
                <p>${ticket.description}</p>
              </div>
              
              <div class="meta">
                <strong>Von:</strong> ${ticket.name || 'Anonym'}<br>
                <strong>E-Mail:</strong> ${ticket.email}<br>
                <strong>Benachrichtigung gewünscht:</strong> ${ticket.notify_on_release ? 'Ja' : 'Nein'}
              </div>
              
              <a href="https://kvb-monitor.de/admin" class="button">Im Admin-Panel öffnen →</a>
            </div>
            <div class="footer">
              KVB Monitor – Admin-Benachrichtigung
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
