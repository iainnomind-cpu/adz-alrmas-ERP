import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationRequest {
  templateId?: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  variables: Record<string, string>;
  // O datos directos:
  subject?: string;
  body?: string;
  notificationType: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gmail credentials from environment
    const gmailUser = Deno.env.get('GMAIL_USER')!;
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured');
    }

    // Parse request body
    const requestData: NotificationRequest = await req.json();
    const { templateId, customerId, customerEmail, customerName, variables, subject, body, notificationType } = requestData;

    console.log(`Sending notification to: ${customerEmail}, type: ${notificationType}`);

    let emailSubject = subject || '';
    let emailBody = body || '';

    // If templateId is provided, fetch template from database
    if (templateId) {
      console.log('Looking for template with ID:', templateId);

      const { data: template, error: templateError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      console.log('Template lookup result:', { template, templateError });

      if (templateError || !template) {
        console.error('Template not found. ID:', templateId, 'Error:', templateError);
        throw new Error('Template not found');
      }

      emailSubject = template.subject;
      emailBody = template.body;
    }

    // Replace variables in subject and body
    emailSubject = replaceVariables(emailSubject, variables);
    emailBody = replaceVariables(emailBody, variables);

    // Generate HTML email
    const emailHtml = generateNotificationEmail(emailSubject, emailBody, customerName);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Send email using Nodemailer
    const info = await transporter.sendMail({
      from: `"Alarmas ADZ" <${gmailUser}>`,
      to: customerEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log('Email sent successfully:', info.messageId);

    // Log to notification_history
    const { error: historyError } = await supabase
      .from('notification_history')
      .insert([{
        customer_id: customerId || null,
        notification_type: notificationType,
        recipient_email: customerEmail,
        subject: emailSubject,
        body: emailHtml,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }]);

    if (historyError) {
      console.error('Error logging to history:', historyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

// Helper function to replace variables in template
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

// Generate professional HTML email
function generateNotificationEmail(subject: string, body: string, customerName: string): string {
  // Convert line breaks to HTML
  const htmlBody = body.replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 15px 0;
      font-size: 16px;
      line-height: 1.8;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px 20px;
      text-align: center;
      border-top: 4px solid #DC2626;
    }
    .footer-company {
      color: #DC2626;
      font-size: 20px;
      font-weight: bold;
      margin: 0 0 10px 0;
    }
    .footer-subtitle {
      color: #666;
      font-size: 14px;
      margin: 0 0 15px 0;
    }
    .footer-address {
      color: #666;
      font-size: 13px;
      line-height: 1.6;
      margin: 10px 0;
    }
    .footer-contact {
      color: #DC2626;
      font-size: 13px;
      font-weight: 600;
      margin: 10px 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ ALARMAS ADZ</h1>
      <p>Sistemas de Seguridad Electrónica</p>
    </div>

    <div class="content">
      ${htmlBody}
    </div>

    <div class="footer">
      <p class="footer-company">ALARMAS ADZ</p>
      <p class="footer-subtitle">Sistemas de Seguridad Electrónica</p>
      <p class="footer-address">
        <strong>Dirección:</strong><br>
        Bustamante #1 Int. A, Col. Centro<br>
        Ciudad Guzmán, Jalisco, CP 49000
      </p>
      <p class="footer-contact">
        📞 Tel: +52 (341) 41 25850 | +52 (341) 41 24070 | +52 (341) 41 29847
      </p>
      <p style="margin-top: 20px; font-size: 12px; color: #999;">
        Este correo fue enviado automáticamente. Por favor no responder a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
