import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Mail, Calendar, Clock, Check, X, Edit, Trash2, Plus, Send, Settings } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface NotificationConfig {
  id: string;
  notification_type: string;
  is_enabled: boolean;
  trigger_condition: any;
  send_time: string;
}

interface NotificationHistory {
  id: string;
  customer_id: string;
  notification_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
}

export function NotificationsManager() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'config' | 'history'>('templates');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'custom' as string,
    subject: '',
    body: '',
    variables: [] as string[],
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<NotificationConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    send_time: '09:00:00',
    trigger_condition: {} as any,
    is_enabled: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [templatesData, configsData, historyData] = await Promise.all([
      supabase.from('notification_templates').select('*').order('type'),
      supabase.from('notification_config').select('*'),
      supabase.from('notification_history').select('*').order('sent_at', { ascending: false }).limit(50)
    ]);

    if (templatesData.data) setTemplates(templatesData.data);
    if (configsData.data) setConfigs(configsData.data);
    if (historyData.data) setHistory(historyData.data);
    setLoading(false);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      birthday: 'Cumpleaños',
      payment_reminder: 'Recordatorio de Pago',
      service_completed: 'Servicio Completado',
      annual_fee_due: 'Anualidad',
      suspension_notice: 'Aviso de Suspensión',
      custom: 'Personalizado'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      birthday: Calendar,
      payment_reminder: Bell,
      service_completed: Check,
      annual_fee_due: Clock,
      suspension_notice: X,
      custom: Mail
    };
    const Icon = icons[type] || Mail;
    return <Icon className="w-5 h-5" />;
  };

  const toggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('notification_templates')
      .update({ is_active: !isActive })
      .eq('id', templateId);

    if (!error) {
      setTemplates(prev => prev.map(t =>
        t.id === templateId ? { ...t, is_active: !isActive } : t
      ));
    }
  };

  const toggleConfigStatus = async (configId: string, isEnabled: boolean) => {
    const { error } = await supabase
      .from('notification_config')
      .update({ is_enabled: !isEnabled })
      .eq('id', configId);

    if (!error) {
      setConfigs(prev => prev.map(c =>
        c.id === configId ? { ...c, is_enabled: !isEnabled } : c
      ));
    }
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      type: 'custom',
      subject: '',
      body: '',
      variables: [],
      is_active: true
    });
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      body: template.body,
      variables: template.variables || [],
      is_active: template.is_active
    });
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject || !templateForm.body) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('notification_templates')
          .update({
            name: templateForm.name,
            type: templateForm.type,
            subject: templateForm.subject,
            body: templateForm.body,
            variables: templateForm.variables,
            is_active: templateForm.is_active
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;

        setTemplates(prev => prev.map(t =>
          t.id === editingTemplate.id ? { ...t, ...templateForm } : t
        ));
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('notification_templates')
          .insert([{
            name: templateForm.name,
            type: templateForm.type,
            subject: templateForm.subject,
            body: templateForm.body,
            variables: templateForm.variables,
            is_active: templateForm.is_active
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) setTemplates(prev => [...prev, data]);
      }

      setShowTemplateModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;

    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', templateId);

    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /{{(\w+)}}/g;
    const matches = text.matchAll(regex);
    const vars = new Set<string>();
    for (const match of matches) {
      vars.add(match[1]);
    }
    return Array.from(vars);
  };

  const updateTemplateField = (field: string, value: any) => {
    setTemplateForm(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-extract variables from subject and body
      if (field === 'subject' || field === 'body') {
        const subjectVars = extractVariables(updated.subject);
        const bodyVars = extractVariables(updated.body);
        updated.variables = Array.from(new Set([...subjectVars, ...bodyVars]));
      }

      return updated;
    });
  };

  const openConfigModal = (config: NotificationConfig) => {
    setEditingConfig(config);
    setConfigForm({
      send_time: config.send_time || '09:00:00',
      trigger_condition: config.trigger_condition || {},
      is_enabled: config.is_enabled
    });
    setShowConfigModal(true);
  };

  const saveConfig = async () => {
    if (!editingConfig) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_config')
        .update({
          send_time: configForm.send_time,
          trigger_condition: configForm.trigger_condition,
          is_enabled: configForm.is_enabled
        })
        .eq('id', editingConfig.id);

      if (error) throw error;

      setConfigs(prev => prev.map(c =>
        c.id === editingConfig.id ? { ...c, ...configForm } : c
      ));

      setShowConfigModal(false);
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateConfigField = (field: string, value: any) => {
    setConfigForm(prev => ({ ...prev, [field]: value }));
  };

  const updateTriggerCondition = (key: string, value: any) => {
    setConfigForm(prev => ({
      ...prev,
      trigger_condition: {
        ...prev.trigger_condition,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-8 h-8" />
          <h3 className="text-xl font-semibold">Gestión de Notificaciones</h3>
        </div>
        <p className="text-blue-100">
          Configure plantillas, envíos automáticos y revise el historial de notificaciones
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'templates'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Plantillas
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'config'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Configuración
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              Historial
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-gray-900">Plantillas de Correo</h4>
                <button
                  onClick={openNewTemplateModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Plantilla
                </button>
              </div>

              <div className="grid gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          {getTypeIcon(template.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-semibold text-gray-900">{template.name}</h5>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${template.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                              }`}>
                              {template.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{getTypeLabel(template.type)}</p>
                          <div className="text-sm">
                            <p className="font-medium text-gray-700">Asunto:</p>
                            <p className="text-gray-600">{template.subject}</p>
                          </div>
                          {template.variables && template.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.variables.map((variable, idx) => (
                                <code key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {`{{${variable}}}`}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                          className={`p-2 rounded-lg ${template.is_active
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                            : 'bg-green-100 hover:bg-green-200 text-green-600'
                            }`}
                          title={template.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {template.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditTemplateModal(template)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Envíos Automáticos</h4>

              <div className="grid gap-4">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-1">
                            {getTypeLabel(config.notification_type)}
                          </h5>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-600">
                              <span className="font-medium">Hora de envío:</span> {config.send_time}
                            </p>
                            {config.trigger_condition && (
                              <div className="text-gray-600">
                                <span className="font-medium">Condiciones:</span>
                                <pre className="mt-1 p-2 bg-gray-50 rounded text-xs">
                                  {JSON.stringify(config.trigger_condition, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openConfigModal(config)}
                          className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Configurar
                        </button>
                        <button
                          onClick={() => toggleConfigStatus(config.id, config.is_enabled)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${config.is_enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {config.is_enabled ? 'Habilitado' : 'Deshabilitado'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Historial de Envíos</h4>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Destinatario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Asunto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha de Envío
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.notification_type)}
                            <span className="text-sm font-medium text-gray-900">
                              {getTypeLabel(item.notification_type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.recipient_email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.subject}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {item.status === 'sent' ? 'Enviado' : item.status === 'failed' ? 'Fallido' : 'Rebotado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(item.sent_at).toLocaleString('es-MX')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Información sobre Envíos Automáticos
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Las notificaciones de cumpleaños se envían automáticamente el día del cumpleaños</li>
          <li>Los recordatorios de pago se envían cuando un cliente tiene más de X meses sin pagar</li>
          <li>Las notificaciones de anualidad se envían 30 días antes del vencimiento</li>
          <li>Los avisos de servicio completado se envían automáticamente al cerrar una orden</li>
        </ul>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Plantilla *
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => updateTemplateField('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Felicitación de Cumpleaños"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Notificación *
                </label>
                <select
                  value={templateForm.type}
                  onChange={(e) => updateTemplateField('type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="custom">Personalizado</option>
                  <option value="birthday">Cumpleaños</option>
                  <option value="payment_reminder">Recordatorio de Pago</option>
                  <option value="service_completed">Servicio Completado</option>
                  <option value="annual_fee_due">Anualidad</option>
                  <option value="suspension_notice">Aviso de Suspensión</option>
                </select>
              </div>

              {/* Asunto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto del Correo *
                </label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => updateTemplateField('subject', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: ¡Feliz Cumpleaños {{customer_name}}!"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Usa {'{{variable}}'} para insertar datos dinámicos
                </p>
              </div>

              {/* Cuerpo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuerpo del Mensaje *
                </label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => updateTemplateField('body', e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder={`Estimado/a {{customer_name}},\n\n¡Feliz cumpleaños! Desde todo el equipo de {{company_name}} queremos desearte un día maravilloso.\n\nSaludos,\nEquipo de {{company_name}}`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  El texto se convertirá automáticamente a HTML. Usa saltos de línea para párrafos.
                </p>
              </div>

              {/* Variables Detectadas */}
              {templateForm.variables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variables Detectadas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {templateForm.variables.map((variable, idx) => (
                      <code key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono">
                        {'{{' + variable + '}}'}
                      </code>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Variables comunes: customer_name, company_name, account_number, amount, due_date
                  </p>
                </div>
              )}

              {/* Estado Activo */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={templateForm.is_active}
                  onChange={(e) => updateTemplateField('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Plantilla Activa
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingTemplate ? 'Actualizar Plantilla' : 'Crear Plantilla'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && editingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Configurar: {getTypeLabel(editingConfig.notification_type)}
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Hora de Envío */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora de Envío
                </label>
                <input
                  type="time"
                  value={configForm.send_time}
                  onChange={(e) => updateConfigField('send_time', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Hora del día en que se enviarán las notificaciones automáticas
                </p>
              </div>

              {/* Condiciones según tipo */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Condiciones de Envío</h4>

                {editingConfig.notification_type === 'birthday' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Cumpleaños:</strong> Se envía automáticamente el día del cumpleaños del cliente.
                    </p>
                    <div className="mt-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={configForm.trigger_condition?.send_on_exact_date !== false}
                          onChange={(e) => updateTriggerCondition('send_on_exact_date', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Enviar el día exacto del cumpleaños</span>
                      </label>
                    </div>
                  </div>
                )}

                {editingConfig.notification_type === 'annual_fee_due' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-900 mb-3">
                      <strong>Anualidad:</strong> Se envía antes del vencimiento de la anualidad.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Días antes del vencimiento
                      </label>
                      <input
                        type="number"
                        value={configForm.trigger_condition?.days_before || 30}
                        onChange={(e) => updateTriggerCondition('days_before', parseInt(e.target.value))}
                        min="1"
                        max="90"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Número de días antes de la fecha de vencimiento
                      </p>
                    </div>
                  </div>
                )}

                {editingConfig.notification_type === 'payment_reminder' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
                    <p className="text-sm text-orange-900">
                      <strong>Recordatorio de Pago:</strong> Se envía cuando un cliente tiene pagos atrasados.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meses de mora para enviar
                      </label>
                      <input
                        type="number"
                        value={configForm.trigger_condition?.months_overdue || 2}
                        onChange={(e) => updateTriggerCondition('months_overdue', parseInt(e.target.value))}
                        min="1"
                        max="12"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enviar cuando el cliente tenga este número de meses sin pagar
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Repetir cada (días)
                      </label>
                      <input
                        type="number"
                        value={configForm.trigger_condition?.repeat_every_days || 15}
                        onChange={(e) => updateTriggerCondition('repeat_every_days', parseInt(e.target.value))}
                        min="1"
                        max="30"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Días mínimos entre recordatorios al mismo cliente
                      </p>
                    </div>
                  </div>
                )}

                {editingConfig.notification_type === 'service_completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900">
                      <strong>Servicio Completado:</strong> Se envía automáticamente cuando se cierra una orden de servicio.
                    </p>
                  </div>
                )}

                {editingConfig.notification_type === 'suspension_notice' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-900">
                      <strong>Aviso de Suspensión:</strong> Se envía cuando se suspende el servicio de un cliente.
                    </p>
                  </div>
                )}
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <input
                  type="checkbox"
                  id="config_is_enabled"
                  checked={configForm.is_enabled}
                  onChange={(e) => updateConfigField('is_enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="config_is_enabled" className="text-sm font-medium text-gray-700">
                  Notificación Habilitada
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveConfig}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
