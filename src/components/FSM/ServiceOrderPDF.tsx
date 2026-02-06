import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Printer } from 'lucide-react';

interface ServiceOrderPDFProps {
  orderId: string;
}

export function ServiceOrderPDF({ orderId }: ServiceOrderPDFProps) {
  const [order, setOrder] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  const loadOrderData = async () => {
    const [orderData, materialsData, photosData, commentsData] = await Promise.all([
      supabase
        .from('service_orders')
        .select(`
          *,
          customers (full_name, name, phone, email, address),
          assets (alarm_model)
        `)
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('service_order_materials')
        .select(`
          *,
          price_list:inventory_item_id (name, code, price)
        `)
        .eq('service_order_id', orderId),
      supabase
        .from('service_order_photos')
        .select('*')
        .eq('service_order_id', orderId)
        .order('display_order', { ascending: true }),
      supabase
        .from('service_order_comments')
        .select('*')
        .eq('service_order_id', orderId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true })
    ]);

    if (orderData.data) setOrder(orderData.data);
    if (materialsData.data) setMaterials(materialsData.data);
    if (photosData.data) setPhotos(photosData.data);
    if (commentsData.data) setComments(commentsData.data);

    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = document.getElementById('order-pdf-content');
    if (!content) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Orden de Servicio ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 18px; margin-bottom: 10px; color: #1e40af; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-weight: bold; color: #666; }
            .info-value { color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
            .photo-item img { max-width: 100%; height: auto; border: 1px solid #ddd; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const calculateTotalMaterials = () => {
    return materials.reduce((sum, m) => {
      const price = m.unit_cost || m.price_list?.price || 0;
      return sum + (price * (m.quantity_used || m.quantity || 1));
    }, 0);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      levantada: 'Levantada',
      asignada: 'Asignada',
      en_proceso: 'En Proceso',
      atendida: 'Atendida',
      cerrada: 'Cerrada'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baja',
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 no-print">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar
        </button>
      </div>

      <div id="order-pdf-content" className="bg-white p-8 border border-gray-200 rounded-lg">
        <div className="header">
          <h1 className="text-3xl font-bold mb-2">ORDEN DE SERVICIO</h1>
          <p className="text-xl">#{order.order_number}</p>
          {order.monitoring_center_folio && (
            <p className="text-sm text-gray-600 mt-2">
              Folio Central de Monitoreo: {order.monitoring_center_folio}
            </p>
          )}
        </div>

        <div className="section">
          <div className="section-title">Información del Cliente</div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Nombre:</div>
              <div className="info-value">{order.customers?.full_name || order.customers?.name}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Teléfono:</div>
              <div className="info-value">{order.customers?.phone || 'No especificado'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Dirección:</div>
              <div className="info-value">{order.customers?.address || 'No especificada'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Email:</div>
              <div className="info-value">{order.customers?.email || 'No especificado'}</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Información de la Orden</div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Estado:</div>
              <div className="info-value">{getStatusLabel(order.status)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Prioridad:</div>
              <div className="info-value">{getPriorityLabel(order.priority)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Fecha de Creación:</div>
              <div className="info-value">{new Date(order.created_at).toLocaleString('es-MX')}</div>
            </div>
            {order.scheduled_date && (
              <div className="info-item">
                <div className="info-label">Fecha Programada:</div>
                <div className="info-value">{new Date(order.scheduled_date).toLocaleString('es-MX')}</div>
              </div>
            )}
            {order.closed_at && (
              <div className="info-item">
                <div className="info-label">Fecha de Cierre:</div>
                <div className="info-value">{new Date(order.closed_at).toLocaleString('es-MX')}</div>
              </div>
            )}
            {order.time_spent_minutes > 0 && (
              <div className="info-item">
                <div className="info-label">Tiempo Invertido:</div>
                <div className="info-value">
                  {order.time_spent_minutes < 60
                    ? `${order.time_spent_minutes} minutos`
                    : `${Math.floor(order.time_spent_minutes / 60)}h ${order.time_spent_minutes % 60}m`}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Descripción del Servicio</div>
          <div className="info-value" style={{ whiteSpace: 'pre-wrap' }}>
            {order.description || 'Sin descripción'}
          </div>
        </div>

        {order.work_performed && (
          <div className="section">
            <div className="section-title">Trabajo Realizado</div>
            <div className="info-value" style={{ whiteSpace: 'pre-wrap' }}>
              {order.work_performed}
            </div>
          </div>
        )}

        {materials.length > 0 && (
          <div className="section">
            <div className="section-title">Materiales Utilizados</div>
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Código</th>
                  <th>Cantidad</th>
                  <th>Precio Unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, idx) => {
                  const qty = material.quantity_used || material.quantity || 1;
                  const unitPrice = material.unit_cost || material.price_list?.price || 0;
                  return (
                    <tr key={idx}>
                      <td>{material.price_list?.name || 'Material'}</td>
                      <td>{material.price_list?.code || material.serial_number || 'N/A'}</td>
                      <td>{qty}</td>
                      <td>${unitPrice.toFixed(2)}</td>
                      <td>${(unitPrice * qty).toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                  <td style={{ fontWeight: 'bold' }}>${calculateTotalMaterials().toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {order.is_paid && (
          <div className="section">
            <div className="section-title">Información de Pago</div>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">Estado:</div>
                <div className="info-value">Pagado</div>
              </div>
              <div className="info-item">
                <div className="info-label">Monto:</div>
                <div className="info-value">${order.payment_amount.toFixed(2)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Forma de Pago:</div>
                <div className="info-value" style={{ textTransform: 'capitalize' }}>{order.payment_method}</div>
              </div>
              {order.payment_date && (
                <div className="info-item">
                  <div className="info-label">Fecha de Pago:</div>
                  <div className="info-value">{new Date(order.payment_date).toLocaleDateString('es-MX')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {comments.length > 0 && (
          <div className="section">
            <div className="section-title">Observaciones</div>
            {comments.map((comment, idx) => (
              <div key={idx} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f9fafb', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                  {new Date(comment.created_at).toLocaleString('es-MX')}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{comment.comment_text}</div>
              </div>
            ))}
          </div>
        )}

        {photos.length > 0 && (
          <div className="section">
            <div className="section-title">Evidencias Fotográficas</div>
            <div className="photo-grid">
              {photos.map((photo, idx) => (
                <div key={idx} className="photo-item">
                  <img src={photo.photo_url} alt={`Evidencia ${idx + 1}`} />
                  {photo.photo_description && (
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      {photo.photo_description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="footer">
          <p>Este documento fue generado electrónicamente y no requiere firma.</p>
          <p>Para cualquier aclaración, por favor contáctenos.</p>
        </div>
      </div>
    </div>
  );
}
