import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DigitalCardEmailRequest {
  cardId: string;
  customerEmail: string;
  customerName: string;
  cardNumber: string;
  cardImage: string; // base64 PNG
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
    const { cardId, customerEmail, customerName, cardNumber, cardImage }: DigitalCardEmailRequest = await req.json();

    console.log(`Sending digital card to: ${customerEmail}`);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Generate email HTML
    const emailHtml = generateDigitalCardEmail(customerName, cardNumber);

    // Convert base64 to Uint8Array for Deno (not Node.js Buffer)
    const base64Data = cardImage.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Send email using Nodemailer with embedded image
    const info = await transporter.sendMail({
      from: `"Alarmas ADZ" <${gmailUser}>`,
      to: customerEmail,
      subject: `Tu Tarjeta Digital - Alarmas ADZ`,
      html: emailHtml,
      attachments: [
        {
          filename: `ADZ-Card-${cardNumber}.png`,
          content: bytes,
          cid: 'digitalcard', // Content ID for embedding in HTML
        },
      ],
    });

    console.log('Email sent successfully:', info.messageId);

    // Log to notification_history
    const { error: historyError } = await supabase
      .from('notification_history')
      .insert([{
        customer_id: cardId,
        notification_type: 'digital_card',
        recipient_email: customerEmail,
        subject: `Tu Tarjeta Digital - Alarmas ADZ`,
        body: `Tarjeta digital enviada a ${customerName}`,
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
    console.error('Error in send-digital-card function:', error);
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

function generateDigitalCardEmail(customerName: string, cardNumber: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Tarjeta Digital - Alarmas ADZ</title>
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
      font-size: 32px;
      font-weight: bold;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 18px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .greeting strong {
      color: #DC2626;
    }
    .message {
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 30px;
      color: #555;
    }
    .card-container {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .card-image {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .instructions {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .instructions h3 {
      margin: 0 0 15px 0;
      color: #065f46;
      font-size: 18px;
    }
    .instructions ul {
      margin: 0;
      padding-left: 20px;
    }
    .instructions li {
      margin: 10px 0;
      color: #047857;
    }
    .benefits {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .benefits h3 {
      margin: 0 0 15px 0;
      color: #92400e;
      font-size: 18px;
    }
    .benefits ul {
      margin: 0;
      padding-left: 20px;
    }
    .benefits li {
      margin: 10px 0;
      color: #78350f;
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
      .header p {
        font-size: 16px;
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
      <p class="greeting">Hola <strong>${customerName}</strong>,</p>
      
      <p class="message">
        ¡Bienvenido a la familia de clientes protegidos de Alarmas ADZ! 
        Nos complace enviarte tu <strong>Tarjeta Digital de Cliente Protegido</strong>.
      </p>

      <div class="card-container">
        <img src="cid:digitalcard" alt="Tarjeta Digital ADZ" class="card-image">
        <p style="margin-top: 15px; color: #666; font-size: 14px;">
          <strong>Número de Tarjeta:</strong> ${cardNumber}
        </p>
      </div>

      <div class="instructions">
        <h3>📱 ¿Cómo usar tu tarjeta digital?</h3>
        <ul>
          <li><strong>Guarda la imagen</strong> en tu teléfono para tenerla siempre disponible</li>
          <li><strong>Presenta el código QR</strong> en nuestras instalaciones para identificarte</li>
          <li><strong>Muestra tu tarjeta</strong> al solicitar servicios o soporte técnico</li>
          <li><strong>Accede a descuentos</strong> y promociones exclusivas para clientes</li>
        </ul>
      </div>

      <div class="benefits">
        <h3>✨ Beneficios de tu tarjeta</h3>
        <ul>
          <li>Atención prioritaria en servicios técnicos</li>
          <li>Descuentos especiales en productos y servicios</li>
          <li>Acceso a promociones exclusivas</li>
          <li>Identificación rápida como cliente protegido</li>
        </ul>
      </div>

      <p class="message">
        Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos. 
        Estamos aquí para protegerte.
      </p>
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
