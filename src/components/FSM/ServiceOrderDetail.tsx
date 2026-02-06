import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AddMaterialsForm } from './AddMaterialsForm';
import { ServiceOrderActions } from './ServiceOrderActions';
import { CompleteServiceForm } from './CompleteServiceForm';
import { ServiceOrderReport } from './ServiceOrderReport';
import { ServiceOrderPhotos } from './ServiceOrderPhotos';
import {
  X,
  MapPin,
  Clock,
  User,
  DollarSign,
  Camera,
  FileSignature,
  MessageSquare,
  History,
  Package,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Trash2,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface ServiceOrderDetailProps {
  orderId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function ServiceOrderDetail({ orderId, onClose, onUpdate }: ServiceOrderDetailProps) {
  const [order, setOrder] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [signature, setSignature] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'time' | 'materials' | 'comments' | 'history'>('details');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [copiedFolio, setCopiedFolio] = useState(false);

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  const loadOrderData = async () => {
    setLoading(true);

    const [
      orderData,
      photosData,
      commentsData,
      timeLogsData,
      materialsData,
      historyData,
      signatureData
    ] = await Promise.all([
      supabase
        .from('service_orders')
        .select(`
          *,
          customers (name, phone, address),
          assets:assets!service_orders_asset_id_fkey (alarm_model),
          folio_series (series_code, series_name)
        `)
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('service_order_photos')
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('service_order_comments')
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('service_order_time_logs')
        .select('*')
        .eq('service_order_id', orderId)
        .order('timestamp', { ascending: true }),
      supabase
        .from('service_order_materials')
        .select(`
          *,
          price_list:inventory_item_id (name, code)
        `)
        .eq('service_order_id', orderId),
      supabase
        .from('service_order_status_history')
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('service_order_signatures')
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (orderData.data) setOrder(orderData.data);
    if (photosData.data) setPhotos(photosData.data);
    if (commentsData.data) setComments(commentsData.data);
    if (timeLogsData.data) {
      console.log('📊 Time logs loaded:', timeLogsData.data);
      setTimeLogs(timeLogsData.data);
    }
    if (timeLogsData.error) {
      console.error('❌ Error loading time logs:', timeLogsData.error);
    }
    if (materialsData.data) setMaterials(materialsData.data);
    if (historyData.data) setStatusHistory(historyData.data);
    if (signatureData.data) setSignature(signatureData.data);

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-gray-100 text-gray-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'invoiced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const tabs = [
    { id: 'details', label: 'Detalles', icon: FileSignature },
    { id: 'photos', label: `Fotos (${photos.length})`, icon: Camera },
    { id: 'time', label: 'Tiempo', icon: Clock },
    { id: 'materials', label: `Materiales (${materials.length})`, icon: Package },
    { id: 'comments', label: `Comentarios (${comments.length})`, icon: MessageSquare },
    { id: 'history', label: 'Historial', icon: History }
  ];

  const handleCompleteSuccess = () => {
    setShowCompleteForm(false);
    loadOrderData();
    onUpdate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{order.full_folio || `Orden #${order.order_number}`}</h2>
                {order.folio_series && (
                  <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                    {order.folio_series.series_name}
                  </span>
                )}
              </div>
              <p className="text-blue-100">{order.customers?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(order.status)}`}>
                {order.status === 'in_progress' ? 'En Progreso' :
                  order.status === 'completed' ? 'Completado' :
                    order.status === 'paused' ? 'Pausado' :
                      order.status === 'requested' ? 'Solicitado' :
                        order.status === 'assigned' ? 'Asignado' :
                          order.status === 'paid' ? 'Pagado' :
                            order.status === 'invoiced' ? 'Facturado' : order.status}
              </span>
              <span className={`px-4 py-2 rounded-lg font-semibold ${getPriorityColor(order.priority)}`}>
                {order.priority === 'critical' ? 'Crítico' :
                  order.priority === 'urgent' ? 'Urgente' :
                    order.priority === 'high' ? 'Alta' :
                      order.priority === 'medium' ? 'Media' :
                        order.priority === 'low' ? 'Baja' : order.priority}
              </span>
            </div>

            <div className="border-b border-gray-200 mb-6">
              <div className="flex overflow-x-auto -mb-px">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-6 py-3 font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <ServiceOrderActions
                    orderId={orderId}
                    status={order.status}
                    isPaused={order.is_paused || false}
                    checkInTime={order.check_in_time}
                    checkOutTime={order.check_out_time}
                    onUpdate={loadOrderData}
                  />

                  {order.check_out_time && !order.completed_at && (
                    <button
                      onClick={() => setShowCompleteForm(true)}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Completar Servicio y Obtener Firma
                    </button>
                  )}

                  {order.status === 'completed' && (
                    <button
                      onClick={() => setShowReport(true)}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
                    >
                      <FileText className="w-5 h-5" />
                      Ver Reporte de Servicio
                    </button>
                  )}

                  {order.full_folio && (
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-blue-100">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileSignature className="w-5 h-5 text-blue-600" />
                        Información del Folio
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Folio Completo</span>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-lg font-bold text-blue-600">{order.full_folio}</p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.full_folio);
                                setCopiedFolio(true);
                                setTimeout(() => setCopiedFolio(false), 2000);
                              }}
                              className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                              title="Copiar folio"
                            >
                              {copiedFolio ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {order.folio_series && (
                          <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Serie Asignada</span>
                            <p className="text-lg font-semibold text-gray-900 mt-2">{order.folio_series.series_name}</p>
                            <p className="text-sm text-gray-500 mt-1">Código: {order.folio_series.series_code}</p>
                          </div>
                        )}

                        {order.folio_number && (
                          <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Número Consecutivo</span>
                            <p className="text-lg font-bold text-gray-900 mt-2">{String(order.folio_number).padStart(6, '0')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Información del Cliente
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Nombre:</span>
                          <span className="ml-2 font-medium">{order.customers?.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Teléfono:</span>
                          <span className="ml-2 font-medium">{order.customers?.phone}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Dirección:</span>
                          <span className="ml-2 font-medium">{order.customers?.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Tiempos
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Creado:</span>
                          <span className="ml-2 font-medium">{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        {order.check_in_time && (
                          <div>
                            <span className="text-gray-600">Check-in:</span>
                            <span className="ml-2 font-medium">{new Date(order.check_in_time).toLocaleString()}</span>
                          </div>
                        )}
                        {order.check_out_time && (
                          <div>
                            <span className="text-gray-600">Check-out:</span>
                            <span className="ml-2 font-medium">{new Date(order.check_out_time).toLocaleString()}</span>
                          </div>
                        )}
                        {order.total_time_minutes && (
                          <div>
                            <span className="text-gray-600">Duración:</span>
                            <span className="ml-2 font-medium">{order.total_time_minutes} minutos</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Descripción del Servicio</h3>
                    <p className="text-gray-700">{order.description}</p>
                    {order.notes && (
                      <>
                        <h4 className="font-semibold text-gray-900 mt-4 mb-2">Notas</h4>
                        <p className="text-gray-700">{order.notes}</p>
                      </>
                    )}
                  </div>

                  {order.service_type === 'installation' && materials.length > 0 && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5 text-amber-600" />
                        Equipo a Instalar
                      </h3>
                      <div className="space-y-2">
                        {materials.map((material: any) => (
                          <div
                            key={material.id}
                            className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {material.price_list?.name || 'Equipo'}
                              </p>
                              {material.price_list?.code && (
                                <p className="text-sm text-gray-600">
                                  Código: {material.price_list.code}
                                </p>
                              )}
                              {material.serial_number && (
                                <p className="text-sm text-blue-600 font-medium">
                                  Serie: {material.serial_number}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                                Cantidad: {material.quantity_used || 1}
                              </span>
                              <p className="text-sm text-gray-600 mt-1">
                                ${material.unit_cost?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-medium">Costo Total</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">${order.total_cost?.toFixed(2) || '0.00'}</p>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-sm font-medium">Mano de Obra</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">${order.labor_cost?.toFixed(2) || '0.00'}</p>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-2">
                        <Package className="w-5 h-5" />
                        <span className="text-sm font-medium">Materiales</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">${order.materials_cost?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  {signature && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileSignature className="w-5 h-5 text-blue-600" />
                        Firma del Cliente
                      </h3>
                      <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
                        <img src={signature.signature_data} alt="Firma" className="max-h-32" />
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Firmado por: {signature.signer_name}</p>
                          <p>Fecha: {new Date(signature.signed_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'photos' && (
                <div className="space-y-4">
                  <ServiceOrderPhotos
                    serviceOrderId={orderId}
                    readOnly={order.status === 'completed' || order.status === 'cancelled'}
                    onPhotoUpdate={loadOrderData}
                  />
                </div>
              )}

              {activeTab === 'time' && (
                <div className="space-y-3">
                  {timeLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No hay registros de tiempo</p>
                    </div>
                  ) : (
                    timeLogs.map((log, index) => (
                      <div key={log.id} className="bg-gray-50 rounded-xl p-4 flex items-start gap-4">
                        <div className="relative">
                          <div className={`p-2 rounded-lg ${log.action === 'check_in' ? 'bg-green-100 text-green-600' :
                            log.action === 'check_out' ? 'bg-red-100 text-red-600' :
                              log.action === 'pause' ? 'bg-yellow-100 text-yellow-600' :
                                log.action === 'resume' ? 'bg-blue-100 text-blue-600' :
                                  'bg-gray-100 text-gray-600'
                            }`}>
                            {log.action === 'check_in' && <Play className="w-5 h-5" />}
                            {log.action === 'check_out' && <CheckCircle2 className="w-5 h-5" />}
                            {log.action === 'pause' && <Pause className="w-5 h-5" />}
                            {log.action === 'resume' && <Play className="w-5 h-5" />}
                          </div>
                          {index < timeLogs.length - 1 && (
                            <div className="absolute left-1/2 top-full w-0.5 h-8 bg-gray-300 -translate-x-1/2"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 capitalize">{log.action.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600">{new Date(log.timestamp).toLocaleString()}</p>
                          {log.notes && <p className="text-sm text-gray-700 mt-1">{log.notes}</p>}
                          {log.latitude && log.longitude && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{log.latitude}, {log.longitude}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'materials' && (
                <div className="space-y-4">
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <AddMaterialsForm
                      serviceOrderId={orderId}
                      onSuccess={loadOrderData}
                    />
                  )}

                  {materials.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Materiales Utilizados</h3>
                      {materials.map((material) => (
                        <div key={material.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{material.price_list?.name || 'Producto'}</p>
                              <p className="text-sm text-gray-600">{material.price_list?.code || ''}</p>
                              {material.serial_number && (
                                <p className="text-sm text-blue-600">Serie: {material.serial_number}</p>
                              )}
                            </div>
                            <div className="text-right mr-4">
                              <p className="text-sm text-gray-600">Cantidad: {material.quantity_used}</p>
                              <p className="text-sm text-gray-600">
                                ${material.unit_cost?.toFixed(2) || '0.00'} c/u
                              </p>
                              <p className="font-semibold text-gray-900">${material.total_cost?.toFixed(2) || '0.00'}</p>
                            </div>
                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <button
                                onClick={async () => {
                                  if (confirm('¿Eliminar este material?')) {
                                    await supabase
                                      .from('service_order_materials')
                                      .delete()
                                      .eq('id', material.id);

                                    // Restaurar stock en price_list
                                    const { data: item } = await supabase
                                      .from('price_list')
                                      .select('stock_quantity')
                                      .eq('id', material.inventory_item_id)
                                      .single();

                                    if (item) {
                                      await supabase
                                        .from('price_list')
                                        .update({
                                          stock_quantity: item.stock_quantity + material.quantity_used
                                        })
                                        .eq('id', material.inventory_item_id);
                                    }

                                    loadOrderData();
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Add Comment Form */}
                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Agregar Comentario</h4>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;
                          const commentType = (form.elements.namedItem('commentType') as HTMLSelectElement).value;

                          if (!content.trim()) return;

                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          const { error } = await supabase
                            .from('service_order_comments')
                            .insert([{
                              service_order_id: orderId,
                              user_id: user.id,
                              content: content.trim(),
                              comment_type: commentType
                            }]);

                          if (!error) {
                            // Log activity to history
                            await supabase.from('service_order_status_history').insert([{
                              service_order_id: orderId,
                              previous_status: 'activity',
                              new_status: 'comment_added',
                              reason: `Se agregó un comentario ${commentType === 'internal' ? 'interno' : 'externo'}`
                            }]);
                            form.reset();
                            loadOrderData();
                          }
                        }}
                        className="space-y-3"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Comentario
                          </label>
                          <select
                            name="commentType"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            defaultValue="internal"
                          >
                            <option value="internal">Interno (Solo para el equipo)</option>
                            <option value="external">Externo (Visible para cliente)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comentario
                          </label>
                          <textarea
                            name="content"
                            rows={3}
                            placeholder="Escribe tu comentario aquí..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Agregar Comentario
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Comments List */}
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No hay comentarios</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className={`rounded-xl p-4 ${comment.comment_type === 'internal' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 'bg-blue-50 border-l-4 border-blue-500'
                          }`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${comment.comment_type === 'internal' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                              }`}>
                              {comment.comment_type === 'internal' ? 'Interno' : 'Externo'}
                            </span>
                            <span className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-gray-700">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {statusHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No hay historial disponible</p>
                    </div>
                  ) : (
                    statusHistory.map((history, index) => (
                      <div key={history.id} className="bg-gray-50 rounded-xl p-4 flex items-start gap-4">
                        <div className="relative">
                          <div className={`p-2 rounded-lg ${history.previous_status === 'activity'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                            }`}>
                            {history.previous_status === 'activity' ? (
                              history.new_status === 'photo_added' ? <Camera className="w-5 h-5" /> :
                                history.new_status === 'comment_added' ? <MessageSquare className="w-5 h-5" /> :
                                  history.new_status === 'material_added' ? <Package className="w-5 h-5" /> :
                                    <History className="w-5 h-5" />
                            ) : (
                              <History className="w-5 h-5" />
                            )}
                          </div>
                          {index < statusHistory.length - 1 && (
                            <div className="absolute left-1/2 top-full w-0.5 h-8 bg-gray-300 -translate-x-1/2"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {history.previous_status === 'activity' ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${history.new_status === 'photo_added' ? 'bg-purple-100 text-purple-800' :
                                history.new_status === 'comment_added' ? 'bg-blue-100 text-blue-800' :
                                  history.new_status === 'material_added' ? 'bg-amber-100 text-amber-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {history.new_status === 'photo_added' && <Camera className="w-3 h-3" />}
                                {history.new_status === 'comment_added' && <MessageSquare className="w-3 h-3" />}
                                {history.new_status === 'material_added' && <Package className="w-3 h-3" />}
                                {history.new_status === 'photo_added' ? 'Foto Agregada' :
                                  history.new_status === 'comment_added' ? 'Comentario Agregado' :
                                    history.new_status === 'material_added' ? 'Material Agregado' :
                                      'Actividad Registrada'}
                              </span>
                            ) : (
                              <>
                                {history.previous_status && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(history.previous_status)}`}>
                                    {history.previous_status}
                                  </span>
                                )}
                                <span className="text-gray-400">→</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(history.new_status)}`}>
                                  {history.new_status}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{new Date(history.created_at).toLocaleString()}</p>
                          {history.reason && <p className="text-sm text-gray-700 mt-1">{history.reason}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCompleteForm && (
        <CompleteServiceForm
          orderId={orderId}
          totalCost={order.total_cost || 0}
          onClose={() => setShowCompleteForm(false)}
          onSuccess={handleCompleteSuccess}
        />
      )}

      {showReport && (
        <ServiceOrderReport
          orderId={orderId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
