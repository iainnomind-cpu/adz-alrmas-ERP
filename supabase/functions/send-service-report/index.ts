import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ServiceReportRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
  reportData: {
    report_number: string;
    customer_name: string;
    customer_address: string | null;
    service_date: string;
    technician_name: string;
    service_description: string;
    work_performed: string | null;
    materials_used: Array<{
      name: string;
      sku: string;
      quantity: number;
      unit_cost: number;
      total_cost: number;
    }>;
    labor_hours: number;
    labor_cost: number;
    materials_cost: number;
    total_cost: number;
  };
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
    const { orderId, customerEmail, customerName, reportData }: ServiceReportRequest = await req.json();

    console.log(`Sending service report to: ${customerEmail}`);

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    // Generate email HTML
    const emailHtml = generateServiceReportEmail(reportData);

    // Send email using Nodemailer
    const info = await transporter.sendMail({
      from: `"Alarmas ADZ" <${gmailUser}>`,
      to: customerEmail,
      subject: `Reporte de Servicio - ${reportData.report_number}`,
      html: emailHtml,
    });

    console.log('Email sent successfully:', info.messageId);

    // Log to notification_history
    const { error: historyError } = await supabase
      .from('notification_history')
      .insert([{
        customer_id: orderId, // Using orderId as reference
        notification_type: 'service_report',
        recipient_email: customerEmail,
        subject: `Reporte de Servicio - ${reportData.report_number}`,
        body: `Reporte de servicio enviado a ${customerName}`,
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
    console.error('Error in send-service-report function:', error);
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

function generateServiceReportEmail(report: ServiceReportRequest['reportData']): string {
  const totalWithTax = report.total_cost * 1.16;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Servicio</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 10px;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 4px solid #DC2626;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-name {
      color: #DC2626;
      font-size: 32px;
      font-weight: bold;
      margin: 0;
    }
    .company-subtitle {
      color: #666;
      font-size: 14px;
      margin: 5px 0 15px 0;
    }
    .company-info {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }
    .report-badge {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .report-badge h2 {
      margin: 0;
      font-size: 24px;
    }
    .report-number {
      font-size: 14px;
      margin-top: 5px;
      opacity: 0.9;
    }
    .section {
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .section-title {
      color: #DC2626;
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .info-item {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .info-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 14px;
      color: #111;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      background: white;
      border-radius: 6px;
      overflow: hidden;
    }
    thead {
      background: #DC2626;
      color: white;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    tbody tr:hover {
      background-color: #f9fafb;
    }
    .total-row {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .cost-summary {
      background: white;
      padding: 20px;
      border-radius: 6px;
      border: 2px solid #e5e7eb;
    }
    .cost-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .cost-row:last-child {
      border-bottom: none;
    }
    .cost-label {
      color: #666;
      font-size: 14px;
    }
    .cost-value {
      font-weight: 600;
      font-size: 14px;
    }
    .total-final {
      border-top: 3px solid #DC2626;
      padding-top: 15px;
      margin-top: 10px;
    }
    .total-final .cost-label {
      font-size: 18px;
      font-weight: bold;
      color: #111;
    }
    .total-final .cost-value {
      font-size: 24px;
      color: #DC2626;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 4px solid #DC2626;
      text-align: center;
    }
    .footer-badge {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
    }
    .footer-title {
      color: #DC2626;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .footer-company {
      color: #DC2626;
      font-size: 16px;
      font-weight: bold;
      margin: 10px 0;
    }
    .footer-address {
      color: #666;
      font-size: 12px;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
      table {
        font-size: 12px;
      }
      th, td {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="company-name">ALARMAS ADZ</h1>
      <p class="company-subtitle">Sistemas de Seguridad Electrónica</p>
      <div class="company-info">
        <p><strong>Bustamante #1 Int. A, Col. Centro</strong><br>
        Ciudad Guzmán, Jalisco, CP 49000</p>
        <p>Tel: +52 (341) 41 25850 | +52 (341) 41 24070 | +52 (341) 41 29847</p>
      </div>
    </div>

    <div class="report-badge">
      <h2>REPORTE DE SERVICIO</h2>
      <p class="report-number">Folio: ${report.report_number}</p>
      <p class="report-number">Fecha: ${new Date(report.service_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    </div>

    <div class="section">
      <h3 class="section-title">📋 Información del Cliente</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Cliente</div>
          <div class="info-value">${report.customer_name}</div>
        </div>
        ${report.customer_address ? `
        <div class="info-item">
          <div class="info-label">Dirección</div>
          <div class="info-value">${report.customer_address}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">🔧 Detalles del Servicio</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Técnico Asignado</div>
          <div class="info-value">${report.technician_name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Tiempo de Trabajo</div>
          <div class="info-value">${report.labor_hours.toFixed(2)} horas</div>
        </div>
      </div>
      
      <div class="info-item" style="margin-top: 15px;">
        <div class="info-label">Descripción del Servicio</div>
        <div class="info-value" style="white-space: pre-wrap; margin-top: 8px;">${report.service_description}</div>
      </div>

      ${report.work_performed ? `
      <div class="info-item" style="margin-top: 15px; background-color: #f0fdf4; border-color: #86efac;">
        <div class="info-label" style="color: #166534;">Trabajo Realizado</div>
        <div class="info-value" style="white-space: pre-wrap; margin-top: 8px;">${report.work_performed}</div>
      </div>
      ` : ''}
    </div>

    ${report.materials_used && report.materials_used.length > 0 ? `
    <div class="section">
      <h3 class="section-title">📦 Materiales Utilizados</h3>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th style="text-align: center;">Cant.</th>
            <th style="text-align: right;">P. Unit.</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${report.materials_used.map(material => `
          <tr>
            <td>${material.sku}</td>
            <td><strong>${material.name}</strong></td>
            <td style="text-align: center;"><strong>${material.quantity}</strong></td>
            <td style="text-align: right;">$${material.unit_cost.toFixed(2)}</td>
            <td style="text-align: right;"><strong>$${material.total_cost.toFixed(2)}</strong></td>
          </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" style="text-align: right;">TOTAL MATERIALES:</td>
            <td style="text-align: right; color: #DC2626;">$${report.materials_cost.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="section">
      <h3 class="section-title">💰 Resumen de Costos</h3>
      <div class="cost-summary">
        <div class="cost-row">
          <span class="cost-label">Mano de Obra:</span>
          <span class="cost-value">$${report.labor_cost.toFixed(2)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Materiales:</span>
          <span class="cost-value">$${report.materials_cost.toFixed(2)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">SUBTOTAL:</span>
          <span class="cost-value">$${report.total_cost.toFixed(2)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">IVA (16%):</span>
          <span class="cost-value">$${(report.total_cost * 0.16).toFixed(2)}</span>
        </div>
        <div class="cost-row total-final">
          <span class="cost-label">TOTAL GENERAL:</span>
          <span class="cost-value">$${totalWithTax.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-badge">
        <p class="footer-title">Este reporte es válido como comprobante de servicio</p>
        <p class="footer-company">ALARMAS ADZ</p>
        <p class="footer-address">Bustamante #1 Int. A, Col. Centro, Ciudad Guzmán, Jalisco, CP 49000</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
