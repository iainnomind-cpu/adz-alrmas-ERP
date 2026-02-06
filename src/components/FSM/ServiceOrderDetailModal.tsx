import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ServiceOrderPhotos } from './ServiceOrderPhotos';
import { ServiceOrderComments } from './ServiceOrderComments';
import {
  X,
  MapPin,
  Clock,
  User,
  DollarSign,
  Camera,
  MessageSquare,
  Package,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Download,
  Mail,
  CreditCard,
  Timer,
  AlertTriangle
} from 'lucide-react';

interface ServiceOrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function ServiceOrderDetailModal({ orderId, onClose, onUpdate }: ServiceOrderDetailModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'photos' | 'materials' | 'comments' | 'payment'>('general');
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    is_paid: false,
    payment_amount: 0,
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  const loadOrderData = async () => {
    setLoading(true);

    const [orderData, materialsData] = await Promise.all([
      supabase
        .from('service_orders')
        .select(`
          *,
          customers (id, full_name, name, phone, email, address),
          assets:assets!service_orders_asset_id_fkey (alarm_model)
        `)
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('service_order_materials')
        .select(`
          *,
          price_list:inventory_item_id (name, code, price)
        `)
        .eq('service_order_id', orderId)
    ]);

    if (orderData.data) {
      setOrder(orderData.data);
      setPaymentData({
        is_paid: orderData.data.is_paid || false,
        payment_amount: orderData.data.payment_amount || 0,
        payment_method: orderData.data.payment_method || '',
        payment_date: orderData.data.payment_date
          ? new Date(orderData.data.payment_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      });
    }
    if (materialsData.data) setMaterials(materialsData.data);

    setLoading(false);
  };

  const handleCloseOrder = async () => {
    if (!confirm('¿Está seguro de cerrar esta orden? Se enviará automáticamente por correo al cliente.')) return;

    setClosing(true);

    const { error } = await supabase
      .from('service_orders')
      .update({
        status: 'cerrada',
        closed_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (!error) {
      onUpdate();
      onClose();
    } else {
      alert('Error al cerrar la orden');
    }

    setClosing(false);
  };

  const handleSavePayment = async () => {
    const { error } = await supabase
      .from('service_orders')
      .update(paymentData)
      .eq('id', orderId);

    if (!error) {
      setEditingPayment(false);
      loadOrderData();
    } else {
      alert('Error al actualizar el pago');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      levantada: 'Levantada',
      asignada: 'Asignada',
      en_proceso: 'En Proceso',
      atendida: 'Atendida',
      cerrada: 'Cerrada',
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completada',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      levantada: 'bg-blue-100 text-blue-800',
      asignada: 'bg-purple-100 text-purple-800',
      en_proceso: 'bg-yellow-100 text-yellow-800',
      atendida: 'bg-green-100 text-green-800',
      cerrada: 'bg-gray-100 text-gray-800',
      pending: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    };
    return colors[priority] || 'text-gray-500';
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const calculateTotalMaterials = () => {
    return materials.reduce((sum, m) => {
      const price = m.unit_cost || m.price_list?.price || 0;
      return sum + (price * (m.quantity_used || m.quantity || 1));
    }, 0);
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
    { id: 'general', label: 'General', icon: FileText },
    { id: 'photos', label: 'Fotos', icon: Camera },
    { id: 'materials', label: 'Materiales', icon: Package },
    { id: 'comments', label: 'Comentarios', icon: MessageSquare },
    { id: 'payment', label: 'Pago', icon: DollarSign }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-4 md:px-8 md:py-6 rounded-t-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
              <div className="w-full">
                <h2 className="text-xl md:text-2xl font-bold text-white break-words">Orden #{order.order_number}</h2>
                <p className="text-blue-100 break-words">{order.customers?.full_name || order.customers?.name}</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id
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

          <div className="p-4 md:p-8 max-h-[600px] overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cliente</label>
                      <p className="text-gray-900 font-medium">{order.customers?.full_name || order.customers?.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Teléfono</label>
                      <p className="text-gray-900">{order.customers?.phone || 'No especificado'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Dirección</label>
                      <p className="text-gray-900">{order.customers?.address || 'No especificada'}</p>
                    </div>

                    {order.monitoring_center_folio && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Folio Central de Monitoreo</label>
                        <p className="text-gray-900 font-mono">{order.monitoring_center_folio}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Prioridad</label>
                      <div className={`flex items-center gap-2 font-medium ${getPriorityColor(order.priority)}`}>
                        <AlertTriangle className="w-4 h-4" />
                        {getPriorityLabel(order.priority)}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Fecha de Creación</label>
                      <p className="text-gray-900">
                        {new Date(order.created_at).toLocaleString('es-MX')}
                      </p>
                    </div>

                    {order.scheduled_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha Programada</label>
                        <p className="text-gray-900">
                          {new Date(order.scheduled_date).toLocaleString('es-MX')}
                        </p>
                      </div>
                    )}

                    {order.time_spent_minutes > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tiempo Invertido</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Timer className="w-4 h-4" />
                          {formatTimeSpent(order.time_spent_minutes)}
                        </div>
                      </div>
                    )}

                    {order.closed_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Fecha de Cierre</label>
                        <p className="text-gray-900">
                          {new Date(order.closed_at).toLocaleString('es-MX')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Descripción del Servicio</label>
                  <p className="text-gray-900 mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {order.description || 'Sin descripción'}
                  </p>
                </div>

                {order.work_performed && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trabajo Realizado</label>
                    <p className="text-gray-900 mt-1 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {order.work_performed}
                    </p>
                  </div>
                )}

                {order.status !== 'cerrada' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={handleCloseOrder}
                      disabled={closing}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {closing ? 'Cerrando...' : 'Cerrar Orden'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'photos' && (
              <ServiceOrderPhotos
                serviceOrderId={orderId}
                readOnly={order.status === 'cerrada'}
              />
            )}

            {activeTab === 'materials' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Materiales Utilizados
                </h3>

                {materials.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay materiales registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((material) => {
                      const qty = material.quantity_used || material.quantity || 1;
                      const unitPrice = material.unit_cost || material.price_list?.price || 0;
                      return (
                        <div key={material.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {material.price_list?.name || 'Material'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Código: {material.price_list?.code || 'N/A'}
                            </p>
                            {material.serial_number && (
                              <p className="text-sm text-blue-600">
                                Serie: {material.serial_number}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              Cantidad: {qty}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              ${(unitPrice * qty).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">
                              ${unitPrice.toFixed(2)} c/u
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                      <span className="font-semibold text-blue-900">Total Materiales:</span>
                      <span className="text-xl font-bold text-blue-900">
                        ${calculateTotalMaterials().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <ServiceOrderComments
                serviceOrderId={orderId}
                readOnly={order.status === 'cerrada'}
              />
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Información de Pago
                  </h3>
                  {!editingPayment && order.status !== 'cerrada' && (
                    <button
                      onClick={() => setEditingPayment(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Editar
                    </button>
                  )}
                </div>

                {editingPayment ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentData.is_paid}
                          onChange={(e) => setPaymentData({ ...paymentData, is_paid: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Orden Pagada</span>
                      </label>
                    </div>

                    {paymentData.is_paid && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monto
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={paymentData.payment_amount}
                            onChange={(e) => setPaymentData({ ...paymentData, payment_amount: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Forma de Pago
                          </label>
                          <select
                            value={paymentData.payment_method}
                            onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="cheque">Cheque</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Pago
                          </label>
                          <input
                            type="date"
                            value={paymentData.payment_date}
                            onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleSavePayment}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingPayment(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Estado de Pago:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${order.is_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {order.is_paid ? 'Pagado' : 'No Pagado'}
                      </span>
                    </div>

                    {order.is_paid && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Monto:</span>
                          <span className="text-xl font-bold text-gray-900">
                            ${order.payment_amount.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Forma de Pago:</span>
                          <span className="font-medium text-gray-900 capitalize">
                            {order.payment_method}
                          </span>
                        </div>

                        {order.payment_date && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Fecha de Pago:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(order.payment_date).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {materials.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Total Materiales:</span>
                          <span className="font-bold text-gray-900">
                            ${calculateTotalMaterials().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {order.email_sent && (
                <div className="flex items-center gap-2 text-green-600">
                  <Mail className="w-4 h-4" />
                  <span>Correo enviado {order.email_sent_at && `el ${new Date(order.email_sent_at).toLocaleDateString('es-MX')}`}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
