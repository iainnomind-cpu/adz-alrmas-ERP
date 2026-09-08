import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, X, Send, AlertTriangle, Edit2, Eye, ChevronDown, CheckCircle, Loader2 } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

interface CustomerInfo {
  id: string;
  name: string;
  email: string | null;
  pendingAmount: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  totalInvoices: number;
}

interface DebtReminderModalProps {
  customer: CustomerInfo;
  onClose: () => void;
}

const COMMON_VARIABLES = [
  { key: 'customer_name', label: 'Nombre del cliente' },
  { key: 'amount', label: 'Monto adeudado' },
  { key: 'due_date', label: 'Días de mora' },
  { key: 'company_name', label: 'Empresa' },
  { key: 'account_number', label: 'No. de cuenta' },
];

export function DebtReminderModal({ customer, onClose }: DebtReminderModalProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(customer.email || '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Build default variables for this customer
  const buildVariables = () => ({
    customer_name: customer.name,
    amount: `$${(customer.overdueAmount > 0 ? customer.overdueAmount : customer.pendingAmount).toFixed(2)}`,
    due_date: customer.maxDaysOverdue > 0 ? `${customer.maxDaysOverdue} días` : 'pendiente',
    company_name: 'Alarmas ADZ',
    account_number: customer.id.substring(0, 8).toUpperCase(),
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .in('type', ['payment_reminder', 'custom'])
      .order('type');

    if (data && data.length > 0) {
      setTemplates(data);
      // Auto-select first payment_reminder template
      const paymentTemplate = data.find((t: NotificationTemplate) => t.type === 'payment_reminder') || data[0];
      applyTemplate(paymentTemplate);
      setSelectedTemplateId(paymentTemplate.id);
    }
    setLoading(false);
  };

  const applyTemplate = (template: NotificationTemplate) => {
    const vars = buildVariables();
    setSubject(replaceVars(template.subject, vars));
    setBody(replaceVars(template.body, vars));
  };

  const replaceVars = (text: string, vars: Record<string, string>) => {
    let result = text;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) applyTemplate(template);
  };

  const generatePreviewHtml = () => {
    const htmlBody = body.replace(/\n/g, '<br/>');
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #f5f5f5; padding: 16px; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #DC2626, #B91C1C); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="margin:0; font-size:22px;">🛡️ ALARMAS ADZ</h2>
          <p style="margin:6px 0 0; font-size:13px; opacity:.85;">Sistemas de Seguridad Electrónica</p>
        </div>
        <div style="background: white; padding: 28px 24px; border-radius: 0 0 8px 8px; color: #374151; font-size:15px; line-height:1.7;">
          ${htmlBody}
        </div>
        <div style="text-align:center; padding: 12px; font-size:11px; color:#9ca3af;">
          Bustamante #1 Int. A, Col. Centro — Ciudad Guzmán, Jalisco, CP 49000<br/>
          📞 (341) 41 25850 | Este correo fue enviado automáticamente.
        </div>
      </div>
    `;
  };

  const handleSend = async () => {
    if (!recipientEmail) {
      setError('El cliente no tiene correo electrónico registrado. Por favor actualice su perfil.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('El asunto y el cuerpo del mensaje son obligatorios.');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-notification', {
        body: {
          templateId: selectedTemplateId || undefined,
          customerId: customer.id,
          customerEmail: recipientEmail,
          customerName: customer.name,
          notificationType: 'payment_reminder',
          // Pass the already-edited subject/body directly
          subject: subject,
          body: body,
          variables: buildVariables(),
        },
      });

      if (fnError) throw fnError;
      if (data && data.success === false) throw new Error(data.error || 'Error al enviar');

      setSent(true);
    } catch (err: any) {
      console.error('Error sending debt reminder:', err);
      setError(err.message || 'Error al enviar el correo. Verifique la configuración de Gmail.');
    } finally {
      setSending(false);
    }
  };

  // --- SUCCESS STATE ---
  if (sent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Recordatorio enviado!</h3>
          <p className="text-gray-600 mb-1">Se envió un recordatorio de adeudo a:</p>
          <p className="font-semibold text-blue-700 mb-1">{customer.name}</p>
          <p className="text-sm text-gray-500 mb-6">{recipientEmail}</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Mail className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Recordatorio de Adeudo</h3>
              <p className="text-sm text-gray-500">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Customer summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-orange-500 font-medium">Facturas</p>
                  <p className="text-gray-900 font-bold text-lg">{customer.totalInvoices}</p>
                </div>
                <div>
                  <p className="text-yellow-600 font-medium">Pendiente</p>
                  <p className="text-gray-900 font-bold text-lg">${customer.pendingAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-red-600 font-medium">Vencido</p>
                  <p className="text-gray-900 font-bold text-lg">${customer.overdueAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Template selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plantilla base</label>
                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white pr-10 text-sm"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.type === 'payment_reminder' ? 'Recordatorio de Pago' : 'Personalizado'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Puedes editar el asunto y cuerpo antes de enviar
                  </p>
                </div>
              )}

              {templates.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Sin plantillas de pago</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Ve a <strong>Configuración → Notificaciones</strong> y crea una plantilla de tipo
                      "Recordatorio de Pago" para poder seleccionarla aquí.
                    </p>
                  </div>
                </div>
              )}

              {/* Recipient email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo del destinatario
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    !recipientEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {!recipientEmail && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ El cliente no tiene email registrado. Agréguelo aquí o actualice su perfil.
                  </p>
                )}
              </div>

              {/* Editor / Preview tabs */}
              <div>
                <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      activeTab === 'editor'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      activeTab === 'preview'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Vista previa
                  </button>
                </div>

                {activeTab === 'editor' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Asunto *</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Ej: Recordatorio de pago vencido — Alarmas ADZ"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuerpo del mensaje *</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono resize-y"
                        placeholder="Estimado/a {{customer_name}}, le recordamos que tiene un saldo pendiente..."
                      />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {COMMON_VARIABLES.map(v => (
                          <button
                            key={v.key}
                            onClick={() => setBody(prev => prev + `{{${v.key}}}`)}
                            className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-mono transition-colors"
                            title={`Insertar ${v.label}`}
                          >
                            {`{{${v.key}}}`}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Haz clic en una variable para insertarla al final del texto
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs text-gray-500">
                      <strong>Asunto:</strong> {subject || '(sin asunto)'}
                    </div>
                    <div
                      className="p-4 bg-gray-50"
                      dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                    />
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || loading || !subject.trim() || !body.trim()}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar recordatorio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
