import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Shield,
  User,
  MapPin,
  Phone,
  Calendar,
  Wrench,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Package,
  CheckCircle2,
  Save,
  Edit2,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

interface AssetDetailViewProps {
  assetId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function AssetDetailView({ assetId, onClose, onUpdate }: AssetDetailViewProps) {
  const { user } = useAuth();
  const [asset, setAsset] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssetData();
    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('roles(name)')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if ((data?.roles as any)?.name === 'admin') {
            setIsAdmin(true);
          }
        });
    }
  }, [assetId, user]);

  const loadAssetData = async () => {
    setLoading(true);

    const [assetData, serviceOrdersData, opportunitiesData, recommendationsData] = await Promise.all([
      supabase
        .from('assets')
        .select(`
          *,
          customers:customers!assets_customer_id_fkey (name, phone, address, email),
          technicians:technicians!assets_installed_by_fkey (full_name),
          asset_service_analytics (*)
        `)
        .eq('id', assetId)
        .maybeSingle(),
      supabase
        .from('service_orders')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('opportunities')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false }),
      supabase
        .from('asset_replacement_recommendations')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
    ]);

    if (assetData.data) {
      setAsset(assetData.data);
      setEditForm(assetData.data);
    }
    if (serviceOrdersData.data) setServiceOrders(serviceOrdersData.data);
    if (opportunitiesData.data) setOpportunities(opportunitiesData.data);
    if (recommendationsData.data) setRecommendations(recommendationsData.data);

    setLoading(false);
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

  if (!asset) return null;

  const handleSave = async () => {
    setSaving(true);
    const {
      customers, technicians, asset_service_analytics,
      id, created_at, updated_at, ...updateData
    } = editForm;

    const { error } = await supabase.from('assets').update(updateData).eq('id', assetId);
    setSaving(false);
    if (!error) {
      setIsEditing(false);
      loadAssetData();
      onUpdate();
    } else {
      alert('Error al guardar el equipo: ' + error.message);
    }
  };

  const handleChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const calculateWarranty = () => {
    const target = isEditing ? editForm : asset;
    if (!target.billing_date) return null;
    const billingDate = new Date(target.billing_date);
    const warrantyYears = target.has_extended_warranty ? 2 : 1;
    const expirationDate = new Date(billingDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + warrantyYears);
    const now = new Date();

    return {
      isValid: now <= expirationDate,
      expirationDate,
      warrantyYears
    };
  };

  const warranty = calculateWarranty();
  const formData = isEditing ? editForm : asset;

  const analytics = asset.asset_service_analytics?.[0];
  const opportunityScore = analytics?.opportunity_score || 0;
  const hasHighOpportunity = opportunityScore >= 40;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">
                    {formData.model || formData.alarm_model || 'Equipo'}
                  </h2>
                  {warranty && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${warranty.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {warranty.isValid ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      {warranty.isValid ? 'En Garantía' : 'Fuera de Garantía'}
                    </span>
                  )}
                </div>
                <p className="text-blue-100">{asset.customers?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={saving}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white font-medium flex items-center gap-2"
              >
                {saving ? 'Guardando...' : isEditing ? <><Save className="w-4 h-4" />Guardar</> : <><Edit2 className="w-4 h-4" />Editar</>}
              </button>
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(asset);
                  }}
                  className="px-4 py-2 hover:bg-white/20 rounded-lg transition-colors text-white font-medium"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {hasHighOpportunity && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-lg font-bold text-yellow-900">Oportunidad de Venta Proactiva</h3>
                </div>
                <p className="text-yellow-800 mb-4">
                  Este activo tiene un score de oportunidad de <span className="font-bold">{opportunityScore}</span>.
                  {asset.is_eol && ' El equipo está marcado como obsoleto (EOL).'}
                  {asset.service_ticket_count >= 5 && ` Ha generado ${asset.service_ticket_count} tickets de servicio.`}
                </p>
                {asset.recommended_replacement_model && (
                  <div className="bg-white rounded-lg p-4 border border-yellow-300">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Reemplazo Recomendado:</p>
                    <p className="text-lg font-bold text-blue-600">{asset.recommended_replacement_model}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Wrench className="w-5 h-5" />
                  <span className="text-sm font-medium">Tickets</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{asset.service_ticket_count || 0}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Costo Total</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${((asset.total_service_cost || 0) + (asset.installation_cost || 0)).toFixed(2)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Score</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{opportunityScore}</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Package className="w-5 h-5" />
                  <span className="text-sm font-medium">Oportunidades</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{opportunities.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Información del Activo
                </h3>

                <div className="space-y-4">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Categoría / Tipo de equipo</label>
                        <select
                          value={formData.equipment_category || ''}
                          onChange={(e) => handleChange('equipment_category', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white"
                        >
                          <option value="">Seleccione...</option>
                          <option value="Sensor PIR">Sensor PIR</option>
                          <option value="Disco Duro">Disco Duro</option>
                          <option value="Fuente de Poder">Fuente de Poder</option>
                          <option value="Cámara">Cámara</option>
                          <option value="DVR">DVR</option>
                          <option value="Videoportero">Videoportero</option>
                          <option value="Control de Acceso">Control de Acceso</option>
                          <option value="Control de Asistencia">Control de Asistencia</option>
                          <option value="Panel de Alarma">Panel de Alarma</option>
                          <option value="Teclado">Teclado</option>
                          <option value="Comunicador">Comunicador</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Marca</label>
                        <input
                          type="text"
                          value={formData.brand || ''}
                          onChange={(e) => handleChange('brand', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Modelo</label>
                        <input
                          type="text"
                          value={formData.model || ''}
                          onChange={(e) => handleChange('model', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Número de Serie</label>
                        <input
                          type="text"
                          value={formData.serial_number || ''}
                          onChange={(e) => handleChange('serial_number', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                      </div>

                      {formData.equipment_category === 'DVR' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Número de canales</label>
                          <input
                            type="number"
                            value={formData.channel_count || ''}
                            onChange={(e) => handleChange('channel_count', parseInt(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha de Instalación</label>
                        <input
                          type="date"
                          value={formData.installation_date ? new Date(formData.installation_date).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleChange('installation_date', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha de Facturación</label>
                        <input
                          type="date"
                          value={formData.billing_date ? new Date(formData.billing_date).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleChange('billing_date', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="has_extended_warranty"
                          checked={formData.has_extended_warranty || false}
                          onChange={(e) => handleChange('has_extended_warranty', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="has_extended_warranty" className="ml-2 block text-sm text-gray-900">
                          Garantía Extendida (+1 Año)
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Factura del Equipo</label>
                        <input
                          type="text"
                          value={formData.equipment_invoice_number || ''}
                          onChange={(e) => handleChange('equipment_invoice_number', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          placeholder="Ej: F-10203"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Tickets Relacionados</label>
                        <input
                          type="text"
                          value={formData.related_ticket_numbers || ''}
                          onChange={(e) => handleChange('related_ticket_numbers', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          placeholder="Ej: T-001, T-005"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Observaciones</label>
                        <textarea
                          rows={3}
                          value={formData.observations || ''}
                          onChange={(e) => handleChange('observations', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                      </div>

                      {isAdmin && (
                        <>
                          <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
                            <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Credenciales Administrativas</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Usuario</label>
                                <input
                                  type="text"
                                  value={formData.admin_user || ''}
                                  onChange={(e) => handleChange('admin_user', e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                                <input
                                  type="text"
                                  value={formData.admin_password || ''}
                                  onChange={(e) => handleChange('admin_password', e.target.value)}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.equipment_category && (
                        <div>
                          <p className="text-sm text-gray-600">Categoría / Tipo</p>
                          <p className="font-medium text-gray-900">{formData.equipment_category}</p>
                        </div>
                      )}
                      {(formData.brand || formData.model) && (
                        <div>
                          <p className="text-sm text-gray-600">Marca / Modelo</p>
                          <p className="font-medium text-gray-900">
                            {formData.brand} {formData.brand && formData.model ? '-' : ''} {formData.model}
                          </p>
                        </div>
                      )}

                      {formData.keyboard_model && !formData.model && (
                        <div>
                          <p className="text-sm text-gray-600">Teclado</p>
                          <p className="font-medium text-gray-900">{formData.keyboard_model}</p>
                        </div>
                      )}
                      {formData.communicator_model && !formData.model && (
                        <div>
                          <p className="text-sm text-gray-600">Comunicador</p>
                          <p className="font-medium text-gray-900">{formData.communicator_model}</p>
                        </div>
                      )}
                      {formData.serial_number && (
                        <div>
                          <p className="text-sm text-gray-600">Número de Serie</p>
                          <p className="font-medium text-gray-900 font-mono text-sm">{formData.serial_number}</p>
                        </div>
                      )}
                      {formData.channel_count && (
                        <div>
                          <p className="text-sm text-gray-600">Número de Canales</p>
                          <p className="font-medium text-gray-900">{formData.channel_count}</p>
                        </div>
                      )}
                      {formData.installation_date && (
                        <div>
                          <p className="text-sm text-gray-600">Fecha de Instalación original</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(formData.installation_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {formData.billing_date && (
                        <div>
                          <p className="text-sm text-gray-600">Fecha de Facturación</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-green-600" />
                            {new Date(formData.billing_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {formData.equipment_invoice_number && (
                        <div>
                          <p className="text-sm text-gray-600">Factura del Equipo</p>
                          <p className="font-medium text-gray-900">{formData.equipment_invoice_number}</p>
                        </div>
                      )}
                      {formData.related_ticket_numbers && (
                        <div>
                          <p className="text-sm text-gray-600">Tickets Relacionados</p>
                          <p className="font-medium text-gray-900">{formData.related_ticket_numbers}</p>
                        </div>
                      )}
                      {formData.observations && (
                        <div>
                          <p className="text-sm text-gray-600">Observaciones</p>
                          <p className="font-medium text-gray-900 whitespace-pre-wrap">{formData.observations}</p>
                        </div>
                      )}
                      {formData.technicians?.full_name && (
                        <div>
                          <p className="text-sm text-gray-600">Instalado por</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {formData.technicians.full_name}
                          </p>
                        </div>
                      )}

                      {isAdmin && (formData.admin_user || formData.admin_password) && (
                        <div className="pt-3 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Acceso Administrativo (Solo Admins)
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {formData.admin_user && (
                              <div>
                                <p className="text-xs text-gray-600">Usuario</p>
                                <p className="font-mono text-sm">{formData.admin_user}</p>
                              </div>
                            )}
                            {formData.admin_password && (
                              <div>
                                <p className="text-xs text-gray-600">Contraseña</p>
                                <p className="font-mono text-sm">{formData.admin_password}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {formData.is_eol && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-red-600 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-bold">Equipo Obsoleto (EOL)</span>
                          </div>
                          {formData.eol_reason && (
                            <p className="text-sm text-gray-700">{formData.eol_reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información del Cliente
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nombre</p>
                    <p className="font-medium text-gray-900">{asset.customers?.name}</p>
                  </div>
                  {asset.customers?.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Teléfono</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {asset.customers.phone}
                      </p>
                    </div>
                  )}
                  {asset.customers?.address && (
                    <div>
                      <p className="text-sm text-gray-600">Dirección</p>
                      <p className="font-medium text-gray-900 flex items-start gap-1">
                        <MapPin className="w-4 h-4 mt-1" />
                        <span>{asset.customers.address}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {recommendations.length > 0 && (
              <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
                <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Recomendaciones de Reemplazo
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{rec.recommended_model}</p>
                          <p className="text-sm text-gray-600">{rec.replacement_reason}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {rec.priority === 'critical' ? 'Crítico' :
                            rec.priority === 'high' ? 'Alto' : 'Medio'}
                        </span>
                      </div>
                      {rec.estimated_cost && (
                        <p className="text-sm font-semibold text-green-600">
                          Costo estimado: ${rec.estimated_cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {serviceOrders.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  Historial de Servicio (Últimos 10)
                </h3>
                <div className="space-y-3">
                  {serviceOrders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-lg p-4 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">#{order.order_number}</p>
                        <p className="text-sm text-gray-600">{order.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {order.status === 'completed' ? 'Completado' :
                            order.status === 'in_progress' ? 'En Progreso' : order.status}
                        </span>
                        {order.total_cost > 0 && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            ${order.total_cost.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
