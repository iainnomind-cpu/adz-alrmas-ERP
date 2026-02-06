import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { supabase } from '../../lib/supabase';
import {
  X,
  FileText,
  User,
  Package,
  DollarSign,
  CheckCircle2,
  Download,
  Mail,
  AlertCircle,
  Loader2,
  CreditCard
} from 'lucide-react';

interface ServiceOrderReportProps {
  orderId: string;
  onClose: () => void;
}

interface Report {
  id: string;
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
  payment_method: string | null;
  payment_terms: string | null;
  partial_payment: number | null;
  customer_signature_url: string | null;
  notes: string | null;
  generated_at: string;
}

export function ServiceOrderReport({ orderId, onClose }: ServiceOrderReportProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [orderId]);

  const loadReport = async () => {
    const { data, error } = await supabase
      .from('service_order_reports')
      .select('*')
      .eq('service_order_id', orderId)
      .maybeSingle();

    if (error) {
      console.error('Error loading report:', error);
    } else {
      setReport(data);
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!report) return;
    window.print();
  };

  const handleSendEmail = async () => {
    if (!report) return;

    setSendingEmail(true);
    setEmailError(null);

    try {
      const { data: orderData } = await supabase
        .from('service_orders')
        .select('customers(email, name)')
        .eq('id', orderId)
        .single();

      if (!orderData?.customers?.email) {
        setEmailError('El cliente no tiene un email registrado');
        setSendingEmail(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-service-report', {
        body: {
          orderId: orderId,
          customerEmail: orderData.customers.email,
          customerName: orderData.customers.name,
          reportData: report
        }
      });

      if (error) throw error;

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailError('Error al enviar el correo. Intenta de nuevo.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center no-print">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center no-print">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <p className="text-center text-gray-600">
            El reporte se generará automáticamente cuando el servicio sea completado.
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto no-print">
        <div className="min-h-screen px-4 py-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Reporte de Servicio</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Descargar/Imprimir PDF"
                >
                  <Download className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content (Detailed UI Preview) */}
            <div className="p-8 max-h-[70vh] overflow-y-auto no-print">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6 bg-gray-50 rounded-xl p-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reporte No.</p>
                    <p className="font-bold text-gray-900 text-lg">{report.report_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Fecha de Servicio</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(report.service_date).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-2 border-gray-300 rounded-xl p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-600" />
                    Información del Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Cliente</p>
                      <p className="font-semibold text-gray-900 text-base">{report.customer_name}</p>
                    </div>
                    {report.customer_address && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Dirección</p>
                        <p className="font-medium text-gray-900 text-sm">{report.customer_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-2 border-gray-300 rounded-xl p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    Detalles del Servicio
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Técnico Asignado</p>
                      <p className="font-semibold text-gray-900 text-base">{report.technician_name}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Fecha de Servicio</p>
                      <p className="font-semibold text-gray-900 text-base">
                        {new Date(report.service_date).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Tiempo de Trabajo</p>
                      <p className="font-semibold text-gray-900 text-base">{report.labor_hours.toFixed(2)} horas</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Descripción del Servicio:</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{report.service_description}</p>
                  </div>
                  {report.work_performed && (
                    <div className="bg-white rounded-lg p-4 border-2 border-green-200 bg-green-50">
                      <p className="text-sm font-semibold text-green-800 mb-2">Trabajo Realizado:</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{report.work_performed}</p>
                    </div>
                  )}
                </div>

                {report.materials_used && report.materials_used.length > 0 && (
                  <div className="space-y-4 border-2 border-gray-300 rounded-xl p-6 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                      <Package className="w-5 h-5 text-red-600" />
                      Materiales Utilizados
                    </h3>
                    <div className="overflow-x-auto bg-white rounded-lg border-2 border-gray-300">
                      <table className="w-full">
                        <thead className="bg-red-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-red-500">SKU</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase border-r border-red-500">Producto</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase border-r border-red-500">Cant.</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase border-r border-red-500">P. Unit.</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                          {report.materials_used.map((material, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">{material.sku}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium border-r border-gray-200">{material.name}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900 font-semibold border-r border-gray-200">{material.quantity}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900 border-r border-gray-200">${material.unit_cost.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">${material.total_cost.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={4} className="px-4 py-3 text-right text-base text-gray-900">TOTAL MATERIALES:</td>
                            <td className="px-4 py-3 text-right text-base text-red-600">${report.materials_cost.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="space-y-4 border-2 border-gray-300 rounded-xl p-6 bg-white">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b-2 border-gray-300 pb-3">
                    <DollarSign className="w-5 h-5 text-red-600" />
                    Resumen de Costos
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Mano de Obra:</span>
                      <span className="font-semibold text-gray-900">${report.labor_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Materiales:</span>
                      <span className="font-semibold text-gray-900">${report.materials_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-900">SUBTOTAL:</span>
                      <span className="font-semibold text-gray-900">${report.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">IVA (16%):</span>
                      <span className="font-semibold text-gray-900">${(report.total_cost * 0.16).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-4 border-t-2 border-red-600">
                      <span className="text-xl font-bold text-gray-900">TOTAL GENERAL:</span>
                      <span className="text-2xl font-bold text-red-600">${(report.total_cost * 1.16).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                {(report.payment_method || report.payment_terms) && (
                  <div className="space-y-4 border-2 border-blue-300 rounded-xl p-6 bg-blue-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 border-b-2 border-blue-300 pb-3">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      Información de Pago
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Método de Pago</p>
                        <p className="font-bold text-gray-900 text-lg">
                          {report.payment_method === 'cash' ? '💵 Contado' : '💳 Crédito'}
                        </p>
                      </div>
                      {report.payment_method === 'credit' && report.partial_payment && report.partial_payment > 0 && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-300">
                          <p className="text-xs text-green-700 uppercase font-semibold mb-1">Anticipo Recibido</p>
                          <p className="font-bold text-green-600 text-lg">${report.partial_payment.toFixed(2)}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Saldo pendiente: ${((report.total_cost * 1.16) - report.partial_payment).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {report.payment_terms && (
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                          <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Condiciones de Pago</p>
                          <p className="font-semibold text-gray-900">{report.payment_terms}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {report.customer_signature_url && (
                  <div className="space-y-4 mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 border-b-2 border-gray-300 pb-2">
                      Firma del Cliente
                    </h3>
                    <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-6">
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[150px] flex flex-col items-center justify-center">
                        <img
                          src={report.customer_signature_url}
                          alt="Firma del cliente"
                          className="max-h-40 mx-auto mb-4"
                        />
                        <div className="w-full border-t-2 border-gray-800 pt-2 text-center">
                          <p className="font-semibold text-gray-900 text-base">Nombre y Firma del Cliente</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex gap-4">
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PDF
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail || emailSent}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : emailSent ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Enviado
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Enviar por Email
                        </>
                      )}
                    </button>
                  </div>

                  {emailError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {emailError}
                    </div>
                  )}

                  {emailSent && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Correo enviado exitosamente
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actual Print Content rendered in a Portal outside #root */}
      {createPortal(
        <div className="print-portal-container">
          <div className="print-content">
            <div className="max-w-4xl mx-auto bg-white p-8">
              <div className="flex items-center justify-between border-b-2 border-red-600 pb-3 mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-red-600">ALARMAS ADZ</h1>
                    <p className="text-xs text-gray-600">Sistemas de Seguridad Electrónica</p>
                  </div>
                  <div className="text-xs text-gray-600 border-l border-gray-300 pl-4">
                    <p>Bustamante #1 Int. A, Centro, Cd. Guzmán, Jal. CP 49000</p>
                    <p>Tel: (341) 41-25850 / 41-24070 / 41-29847</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold mb-1">
                    REPORTE DE SERVICIO
                  </div>
                  <p className="text-xs text-gray-600">Folio: <span className="font-bold text-gray-900">{report.report_number}</span></p>
                  <p className="text-xs text-gray-600">Fecha: <span className="font-semibold text-gray-900">{new Date(report.service_date).toLocaleDateString('es-MX')}</span></p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4 border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-red-600" />
                    Información del Cliente
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Cliente</p>
                      <p className="font-semibold text-gray-900 text-sm">{report.customer_name}</p>
                    </div>
                    {report.customer_address && (
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Dirección</p>
                        <p className="font-medium text-gray-900 text-xs">{report.customer_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-600" />
                    Detalles del Servicio
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Técnico Asignado</p>
                      <p className="font-semibold text-gray-900 text-sm">{report.technician_name}</p>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Fecha de Servicio</p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {new Date(report.service_date).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Tiempo de Trabajo</p>
                      <p className="font-semibold text-gray-900 text-sm">{report.labor_hours.toFixed(2)} horas</p>
                    </div>
                  </div>
                  <div className="bg-white rounded p-3 border-2 border-gray-300">
                    <p className="text-xs font-bold text-gray-700 mb-2">Descripción del Servicio:</p>
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{report.service_description}</p>
                  </div>
                  {report.work_performed && (
                    <div className="bg-white rounded p-3 border-2 border-green-200 bg-green-50">
                      <p className="text-xs font-bold text-green-800 mb-2">Trabajo Realizado:</p>
                      <p className="text-gray-900 text-sm whitespace-pre-wrap">{report.work_performed}</p>
                    </div>
                  )}
                </div>

                {report.materials_used && report.materials_used.length > 0 && (
                  <div className="space-y-3 border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2 flex items-center gap-2">
                      <Package className="w-4 h-4 text-red-600" />
                      Materiales Utilizados
                    </h3>
                    <div className="bg-white rounded border-2 border-gray-300">
                      <table className="w-full text-sm">
                        <thead className="bg-red-600">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase border-r border-red-500">SKU</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase border-r border-red-500">Producto</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-white uppercase border-r border-red-500">Cant.</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-white uppercase border-r border-red-500">P. Unit.</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-white uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                          {report.materials_used.map((material, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-xs text-gray-600 border-r border-gray-200">{material.sku}</td>
                              <td className="px-3 py-2 text-xs text-gray-900 font-medium border-r border-gray-200">{material.name}</td>
                              <td className="px-3 py-2 text-xs text-center text-gray-900 font-semibold border-r border-gray-200">{material.quantity}</td>
                              <td className="px-3 py-2 text-xs text-right text-gray-900 border-r border-gray-200">${material.unit_cost.toFixed(2)}</td>
                              <td className="px-3 py-2 text-xs text-right font-bold text-gray-900">${material.total_cost.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={4} className="px-3 py-2 text-right text-sm text-gray-900">TOTAL MATERIALES:</td>
                            <td className="px-3 py-2 text-right text-sm text-red-600">${report.materials_cost.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="space-y-3 border-2 border-gray-300 rounded-lg p-4 bg-white">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b-2 border-gray-300 pb-2">
                    <DollarSign className="w-4 h-4 text-red-600" />
                    Resumen de Costos
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-700 text-sm">Mano de Obra:</span>
                      <span className="font-semibold text-gray-900 text-sm">${report.labor_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-700 text-sm">Materiales:</span>
                      <span className="font-semibold text-gray-900 text-sm">${report.materials_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-gray-300">
                      <span className="font-semibold text-gray-900 text-sm">SUBTOTAL:</span>
                      <span className="font-semibold text-gray-900 text-sm">${report.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-700 text-sm">IVA (16%):</span>
                      <span className="font-semibold text-gray-900 text-sm">${(report.total_cost * 0.16).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t-2 border-red-600">
                      <span className="text-base font-bold text-gray-900">TOTAL GENERAL:</span>
                      <span className="text-lg font-bold text-red-600">${(report.total_cost * 1.16).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information for Print */}
                {(report.payment_method || report.payment_terms) && (
                  <div className="space-y-2 border-2 border-blue-300 rounded-lg p-3 bg-blue-50">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-blue-300 pb-1">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Información de Pago
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded p-2 border border-blue-200">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Método de Pago</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {report.payment_method === 'cash' ? '💵 Contado' : '💳 Crédito'}
                        </p>
                      </div>
                      {report.payment_method === 'credit' && report.partial_payment && report.partial_payment > 0 && (
                        <div className="bg-green-50 rounded p-2 border border-green-300">
                          <p className="text-xs text-green-700 uppercase font-semibold">Anticipo Recibido</p>
                          <p className="font-bold text-green-600 text-sm">${report.partial_payment.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">
                            Saldo: ${((report.total_cost * 1.16) - report.partial_payment).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {report.payment_terms && (
                        <div className="bg-white rounded p-2 border border-blue-200">
                          <p className="text-xs text-gray-600 uppercase font-semibold">Condiciones de Pago</p>
                          <p className="font-semibold text-gray-900 text-sm">{report.payment_terms}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {report.customer_signature_url && (
                  <div className="space-y-3 mt-6">
                    <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                      Firma del Cliente
                    </h3>
                    <div className="bg-gray-50 border-2 border-gray-400 rounded p-4">
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded p-4 min-h-[120px] flex flex-col items-center justify-center">
                        <img
                          src={report.customer_signature_url}
                          alt="Firma del cliente"
                          className="max-h-32 mx-auto mb-3"
                        />
                        <div className="w-full border-t-2 border-gray-800 pt-2 text-center">
                          <p className="font-semibold text-gray-900 text-sm">Nombre y Firma del Cliente</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t-4 border-red-600">
                  <div className="bg-gray-50 rounded p-4 space-y-3 text-center">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">
                      Este reporte es válido como comprobante de servicio
                    </p>
                    <p className="font-bold text-red-600 text-sm mb-1">ALARMAS ADZ</p>
                    <p className="text-xs text-gray-700 font-semibold">Bustamante #1 Int. A, Col. Centro, Ciudad Guzmán, Jalisco, CP 49000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

