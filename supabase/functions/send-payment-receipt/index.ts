// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentReceiptRequest {
  to_email: string;
  customer_name: string;
  folio: string;
  payment_amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  previous_balance: number;
  new_balance: number;
  total_invoice: number;
  is_fully_paid: boolean;
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
    const requestData: PaymentReceiptRequest = await req.json();
    const {
      to_email,
      customer_name,
      folio,
      payment_amount,
      payment_method,
      payment_date,
      reference_number,
      previous_balance,
      new_balance,
      total_invoice,
      is_fully_paid
    } = requestData;

    console.log(`Sending payment receipt to: ${to_email} for document ${folio}`);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Generate email HTML
    const emailHtml = generatePaymentReceiptEmail(requestData);

    // Send email using Nodemailer
    const info = await transporter.sendMail({
      from: `"Alarmas ADZ - Facturación" <${gmailUser}>`,
      to: to_email,
      subject: `✅ Comprobante de Pago - ${folio} | Alarmas ADZ`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', info.messageId);

    // Log to notification_history
    // Note: We don't have an orderId directly here, so we'll use the folio or check if we can pass current document ID if needed.
    // Ideally we should pass customer_id or document_id from the frontend, but for now we log with basic info.
    const { error: historyError } = await supabase
      .from('notification_history')
      .insert([{
        // notification_history usually expects a customer_id (UUID). 
        // Since we don't have it in the request payload explicitly named customer_id, 
        // we assume the caller might want to send it or we skip strictly linking if not critical.
        // However, looking at the user's code: customer_id: orderId (which is a UUID).
        // For billing, we might fail foreign key constraints if we don't provide a valid UUID.
        // Let's check table definition later or make it robust. 
        // For now, I'll assume we can log using the folio in metadata or similar, 
        // but to match the pattern, I'll log what I can.
        // If notification_type is strict, we should be careful.
        // Let's create a generic log entry.
        notification_type: 'payment_receipt',
        recipient_email: to_email,
        subject: `Comprobante de Pago - ${folio}`,
        body: `Comprobante de pago por $${payment_amount} enviado a ${customer_name}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        // metadata is often a jsonb column
        metadata: {
          folio: folio,
          amount: payment_amount,
          new_balance: new_balance
        }
      }]);

    if (historyError) {
      console.error('Error logging to history:', historyError);
      // We don't fail the request if history logging fails, but it's good to know.
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
    console.error('Error in send-payment-receipt function:', error);
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

function generatePaymentReceiptEmail(data: PaymentReceiptRequest): string {
  const {
    customer_name,
    folio,
    payment_amount,
    payment_method,
    payment_date,
    reference_number,
    previous_balance,
    new_balance,
    total_invoice,
    is_fully_paid
  } = data;

  const formattedDate = new Date(payment_date).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const statusMessage = is_fully_paid
    ? '✅ <span style="color: #16a34a; font-weight: bold;">CUENTA LIQUIDADA</span>'
    : `⏳ <span style="color: #ea580c; font-weight: bold;">Saldo pendiente: $${new_balance.toFixed(2)}</span>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">ALARMAS ADZ</h1>
      <p style="color: #fecaca; margin: 5px 0 0 0; font-size: 14px;">Sistemas de Seguridad Electrónica</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: #dcfce7; color: #16a34a; padding: 15px 25px; border-radius: 50px; display: inline-block; font-size: 18px; font-weight: bold;">
          ✅ Pago Recibido
        </div>
      </div>

      <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">
        Estimado(a) <strong>${customer_name}</strong>,
      </p>
      
      <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">
        Hemos recibido su pago con los siguientes detalles:
      </p>

      <!-- Payment Details Box -->
      <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h3 style="color: #111827; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
          📋 Detalles del Pago
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Folio del Documento:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${folio}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Fecha de Pago:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Método de Pago:</td>
            <td style="padding: 10px 0; color: #111827; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">${payment_method}</td>
          </tr>
          ${reference_number ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Referencia:</td>
            <td style="padding: 10px 0; color: #111827; font-family: monospace; text-align: right; border-bottom: 1px solid #e5e7eb;">${reference_number}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Financial Summary -->
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h3 style="color: #1e40af; margin: 0 0 20px 0; font-size: 18px;">
          💰 Resumen Financiero
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #3b82f6;">Total de Factura:</td>
            <td style="padding: 8px 0; color: #1e40af; font-weight: bold; text-align: right;">$${total_invoice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #3b82f6;">Saldo Anterior:</td>
            <td style="padding: 8px 0; color: #1e40af; font-weight: bold; text-align: right;">$${previous_balance.toFixed(2)}</td>
          </tr>
          <tr style="background: #bbf7d0; border-radius: 8px;">
            <td style="padding: 12px 8px; color: #16a34a; font-weight: bold;">Monto Pagado:</td>
            <td style="padding: 12px 8px; color: #16a34a; font-weight: bold; font-size: 20px; text-align: right;">$${payment_amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: ${is_fully_paid ? '#16a34a' : '#ea580c'}; font-weight: bold; font-size: 16px;">Nuevo Saldo:</td>
            <td style="padding: 12px 0; color: ${is_fully_paid ? '#16a34a' : '#ea580c'}; font-weight: bold; font-size: 20px; text-align: right;">$${new_balance.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Status Badge -->
      <div style="text-align: center; margin-bottom: 25px; padding: 15px; background: ${is_fully_paid ? '#dcfce7' : '#fef3c7'}; border-radius: 12px; border: 2px solid ${is_fully_paid ? '#16a34a' : '#f59e0b'};">
        ${statusMessage}
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
        Este comprobante es generado automáticamente por el sistema de facturación de Alarmas ADZ.
      </p>
      
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Si tiene alguna duda, no dude en contactarnos.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 5px 0;"><strong>ALARMAS ADZ</strong> - Su seguridad de principio a fin</p>
      <p style="margin: 5px 0;">Bustamante #1 Int. A, Centro, Cd. Guzmán, Jal. CP 49000</p>
      <p style="margin: 5px 0;">Tel: (341) 41-25850 / 41-24070 / 41-29847</p>
    </div>
  </div>
</body>
</html>
  `;
}
