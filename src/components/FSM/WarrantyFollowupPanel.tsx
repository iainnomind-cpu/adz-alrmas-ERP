import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Save, Loader2, RefreshCw, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface WarrantyFollowupPanelProps {
  order: any;
  onUpdate: () => void;
}

export function WarrantyFollowupPanel({ order, onUpdate }: WarrantyFollowupPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    warranty_adz_review_date: order.warranty_adz_review_date || '',
    warranty_adz_comments: order.warranty_adz_comments || '',
    warranty_sent_to_supplier_date: order.warranty_sent_to_supplier_date || '',
    warranty_supplier_resolution: order.warranty_supplier_resolution || '',
    warranty_delivery_date: order.warranty_delivery_date || '',
    warranty_resolution_type: order.warranty_resolution_type || '',
  });

  const isFullyDelivered = !!order.warranty_followup_order_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let followupOrderId = order.warranty_followup_order_id;

      // Create a follow-up order if delivery date and type are provided and no follow-up order exists
      if (formData.warranty_delivery_date && formData.warranty_resolution_type && !followupOrderId) {
        // Find series for new service order
        const { data: seriesList } = await supabase
          .from('folio_series')
          .select('*')
          .eq('document_type', 'service_order')
          .eq('is_active', true)
          .limit(1);
          
        const series = seriesList && seriesList.length > 0 ? seriesList[0] : null;
        
        let newOrderNumber = `GAR-${order.order_number}-ENTREGA`;
        let seriesId = null;
        
        if (series) {
          seriesId = series.id;
          newOrderNumber = `${series.series_code}-${String(series.next_number).padStart(6, '0')}`;
          
          await supabase
            .from('folio_series')
            .update({ next_number: series.next_number + 1 } as any)
            .eq('id', series.id);
        }

        const now = new Date();
        const createdAtDisplay = now.toLocaleString('es-MX', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });

        const newOrderData: any = {
          order_number: newOrderNumber,
          full_folio: newOrderNumber,
          folio_series_id: seriesId,
          customer_id: order.customer_id,
          asset_id: order.asset_id,
          technician_id: order.technician_id,
          description: `Entrega de equipo por Garantía (${formData.warranty_resolution_type === 'repaired' ? 'Reparado' : 'Reemplazado'}). Viene de orden: ${order.full_folio}`,
          priority: 'high',
          service_type: 'installation',
          estimated_duration_minutes: 60,
          travel_zone: order.travel_zone,
          system_type: order.system_type,
          scheduled_date: formData.warranty_delivery_date,
          status: 'levantada',
          is_warranty: true,
          created_by_name: (user as any)?.user_metadata?.full_name || user?.email || 'Sistema',
          created_at_display: createdAtDisplay,
        };

        const { data: newOrder, error: insertError } = await supabase
          .from('service_orders')
          .insert([newOrderData] as any)
          .select()
          .single();

        if (insertError) throw insertError;
        followupOrderId = newOrder.id;
      }

      // Update current order
      const updateData = {
        ...formData,
        warranty_followup_order_id: followupOrderId,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('service_orders')
        .update(updateData as any)
        .eq('id', order.id);

      if (updateError) throw updateError;
      
      setSuccess('Seguimiento guardado correctamente');
      onUpdate();
      
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el seguimiento de garantía');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-600 rounded-lg">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Seguimiento de Garantía ADZ</h3>
          <p className="text-sm text-gray-600">
            Documentación post-cierre de diagnóstico y envío a proveedor
          </p>
        </div>
        {isFullyDelivered && (
          <div className="ml-auto px-4 py-2 bg-green-100 border border-green-300 text-green-800 rounded-lg font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Entregado - Orden generada
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revisión ADZ */}
          <div className="space-y-4 p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2">
              <Shield className="w-4 h-4" /> 1. Revisión Interna
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Revisión ADZ
              </label>
              <input
                type="date"
                value={formData.warranty_adz_review_date}
                onChange={e => setFormData({...formData, warranty_adz_review_date: e.target.value})}
                disabled={isFullyDelivered}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comentarios de Diagnóstico
              </label>
              <textarea
                value={formData.warranty_adz_comments}
                onChange={e => setFormData({...formData, warranty_adz_comments: e.target.value})}
                disabled={isFullyDelivered}
                rows={3}
                placeholder="Diagnóstico del equipo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Envío a Proveedor */}
          <div className="space-y-4 p-4 bg-white rounded-lg border border-purple-100">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 2. Trámite con Proveedor
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Envío
              </label>
              <input
                type="date"
                value={formData.warranty_sent_to_supplier_date}
                onChange={e => setFormData({...formData, warranty_sent_to_supplier_date: e.target.value})}
                disabled={isFullyDelivered}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolución del Proveedor
              </label>
              <textarea
                value={formData.warranty_supplier_resolution}
                onChange={e => setFormData({...formData, warranty_supplier_resolution: e.target.value})}
                disabled={isFullyDelivered}
                rows={3}
                placeholder="Resolución otorgada..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Entrega Final */}
        <div className="p-4 bg-purple-100 rounded-lg border border-purple-200">
          <h4 className="font-semibold text-purple-900 flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4" /> 3. Entrega al Cliente (Agendar)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Programada de Entrega
              </label>
              <input
                type="datetime-local"
                value={formData.warranty_delivery_date}
                onChange={e => setFormData({...formData, warranty_delivery_date: e.target.value})}
                disabled={isFullyDelivered}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolución Final
              </label>
              <select
                value={formData.warranty_resolution_type}
                onChange={e => setFormData({...formData, warranty_resolution_type: e.target.value})}
                disabled={isFullyDelivered}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Seleccione resolución...</option>
                <option value="repaired">Equipo Reparado</option>
                <option value="replaced">Equipo Reemplazado (Nuevo)</option>
              </select>
            </div>
          </div>
          {!isFullyDelivered && (
            <p className="text-sm text-purple-700 font-medium mt-3">
              * Al guardar la fecha de entrega y resolución, se generará y agendará automáticamente una nueva orden de servicio.
            </p>
          )}
        </div>

        {!isFullyDelivered && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Seguimiento
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
