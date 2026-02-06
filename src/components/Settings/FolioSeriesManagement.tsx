import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Edit2, ToggleLeft, ToggleRight, X, Save, Loader2, AlertCircle } from 'lucide-react';

interface FolioSeries {
  id: string;
  series_code: string;
  series_name: string;
  document_type: string;
  location_type: string;
  prefix: string;
  next_number: number;
  is_active: boolean;
  created_at: string;
  order_count?: number;
}

interface NewSeriesFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface EditSeriesFormProps {
  series: FolioSeries;
  onClose: () => void;
  onSuccess: () => void;
}

function NewSeriesForm({ onClose, onSuccess }: NewSeriesFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    series_code: '',
    series_name: '',
    document_type: 'service_order',
    location_type: 'central',
    prefix: '',
    next_number: 1,
    is_active: true
  });

  useEffect(() => {
    if (formData.series_code) {
      const autoPrefix = formData.series_code.toUpperCase();
      if (!formData.prefix || formData.prefix === '') {
        setFormData(prev => ({ ...prev, prefix: autoPrefix }));
      }
    }
  }, [formData.series_code]);

  const validateSeriesCode = (code: string): boolean => {
    const regex = /^[a-zA-Z0-9-]+$/;
    return regex.test(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.series_code || !formData.series_name) {
      setError('El código de serie y nombre son obligatorios');
      setLoading(false);
      return;
    }

    if (!validateSeriesCode(formData.series_code)) {
      setError('El código de serie solo puede contener letras, números y guiones');
      setLoading(false);
      return;
    }

    try {
      const { data: existingSeries, error: checkError } = await supabase
        .from('folio_series')
        .select('series_code')
        .eq('series_code', formData.series_code.toUpperCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingSeries) {
        setError('Ya existe una serie con este código');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('folio_series')
        .insert([{
          series_code: formData.series_code.toUpperCase(),
          series_name: formData.series_name,
          document_type: formData.document_type,
          location_type: formData.location_type,
          prefix: formData.prefix.toUpperCase(),
          next_number: formData.next_number,
          is_active: formData.is_active
        }] as any);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la serie');
    } finally {
      setLoading(false);
    }
  };

  const getFolioPreview = () => {
    if (!formData.prefix || formData.next_number === null) return '';
    const paddedNumber = String(formData.next_number).padStart(6, '0');
    return `${formData.prefix}-${paddedNumber}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Nueva Serie de Folios</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Serie <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.series_code}
                  onChange={(e) => setFormData({ ...formData, series_code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="SRV-001"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras, números y guiones</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Descriptivo <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.series_name}
                  onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Órdenes de Servicio - Principal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento
                </label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="service_order">Orden de Servicio</option>
                  <option value="invoice">Factura</option>
                  <option value="quote">Cotización</option>
                  <option value="purchase_order">Orden de Compra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ubicación / Sucursal
                </label>
                <select
                  value={formData.location_type}
                  onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="central">Central</option>
                  <option value="sucursal">Sucursal</option>
                  <option value="area">Área</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prefijo de Folio
                </label>
                <input
                  type="text"
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  placeholder="SRV-001"
                />
                <p className="text-xs text-gray-500 mt-1">Se genera automáticamente del código</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número Inicial
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.next_number}
                  onChange={(e) => setFormData({ ...formData, next_number: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {getFolioPreview() && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Vista Previa del Folio:</p>
                <p className="text-2xl font-bold text-blue-600 tracking-wider">{getFolioPreview()}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Serie activa
              </label>
            </div>

            <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Crear Serie
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditSeriesForm({ series, onClose, onSuccess }: EditSeriesFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    series_name: series.series_name,
    is_active: series.is_active
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.series_name) {
      setError('El nombre es obligatorio');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('folio_series')
        .update({
          series_name: formData.series_name,
          is_active: formData.is_active
        })
        .eq('id', series.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la serie');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      // Verificar si hay órdenes asociadas
      const { count } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('folio_series_id', series.id);

      if (count && count > 0) {
        setError(`No se puede eliminar esta serie porque tiene ${count} orden(es) de servicio asociada(s). Por favor, desactívala en su lugar.`);
        setShowDeleteConfirm(false);
        setLoading(false);
        return;
      }

      // Eliminar la serie
      const { error: deleteError } = await supabase
        .from('folio_series')
        .delete()
        .eq('id', series.id);

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la serie');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Editar Serie de Folios</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Por seguridad, el código, prefijo y número consecutivo no pueden ser modificados
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600">Código de Serie</p>
                <p className="font-bold text-gray-900 text-lg">{series.series_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Prefijo de Folio</p>
                <p className="font-semibold text-gray-900">{series.prefix}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Último Número Asignado</p>
                <p className="font-semibold text-gray-900">{String(series.next_number - 1).padStart(6, '0')}</p>
              </div>
              {series.order_count !== undefined && (
                <div>
                  <p className="text-xs text-gray-600">Órdenes Asociadas</p>
                  <p className="font-semibold text-gray-900">{series.order_count}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Descriptivo <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.series_name}
                onChange={(e) => setFormData({ ...formData, series_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Serie activa
              </label>
            </div>

            <div className="flex gap-4 justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="px-6 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Eliminar Serie
              </button>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">¿Eliminar Serie?</h3>
            </div>

            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar la serie <span className="font-bold">{series.series_code}</span>?
              Esta acción no se puede deshacer.
            </p>

            {series.order_count !== undefined && series.order_count > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Advertencia:</strong> Esta serie tiene {series.order_count} orden(es) asociada(s).
                  No podrás eliminarla. Considera desactivarla en su lugar.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FolioSeriesManagement() {
  const [series, setSeries] = useState<FolioSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<FolioSeries | null>(null);

  useEffect(() => {
    loadSeries();
  }, [filter]);

  const loadSeries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('folio_series')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('is_active', filter === 'active');
      }

      const { data: seriesData, error: seriesError } = await query;

      if (seriesError) throw seriesError;

      const seriesWithCounts = await Promise.all(
        (seriesData || []).map(async (s) => {
          const { count } = await supabase
            .from('service_orders')
            .select('*', { count: 'exact', head: true })
            .eq('folio_series_id', s.id);

          return { ...s, order_count: count || 0 };
        })
      );

      setSeries(seriesWithCounts);
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeriesStatus = async (seriesId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('folio_series')
        .update({ is_active: !currentStatus })
        .eq('id', seriesId);

      if (error) throw error;

      await loadSeries();
    } catch (error) {
      console.error('Error toggling series status:', error);
    }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Gestión de Series de Folios</h3>
              <p className="text-blue-100">Configure las series para órdenes de servicio y otros documentos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'active', 'inactive'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {type === 'all' ? 'Todas' : type === 'active' ? 'Activas' : 'Inactivas'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewForm(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nueva Serie
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-xl shadow-sm border-2 p-5 hover:shadow-md transition-all ${s.is_active ? 'border-green-200' : 'border-gray-200'
              }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{s.series_code}</h3>
                  <p className="text-sm text-gray-600">{s.series_name}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                {s.is_active ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Formato de Folio</p>
                <p className="font-bold text-blue-900 text-lg tracking-wider">
                  {s.prefix}-{String(s.next_number).padStart(6, '0')}
                </p>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Último Asignado:</span>
                <span className="font-semibold text-gray-900">
                  {String(s.next_number - 1).padStart(6, '0')}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Próximo Número:</span>
                <span className="font-semibold text-blue-600">
                  {String(s.next_number).padStart(6, '0')}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Órdenes Creadas:</span>
                <span className="font-bold text-gray-900">{s.order_count || 0}</span>
              </div>

              <div className="text-sm">
                <span className="text-gray-600">Ubicación:</span>
                <span className="ml-2 font-medium text-gray-900 capitalize">{s.location_type}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => setEditingSeries(s)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => toggleSeriesStatus(s.id, s.is_active)}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium ${s.is_active
                  ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
              >
                {s.is_active ? (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    Activar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {series.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay series de folios registradas</p>
        </div>
      )}

      {showNewForm && (
        <NewSeriesForm
          onClose={() => setShowNewForm(false)}
          onSuccess={() => {
            loadSeries();
            setShowNewForm(false);
          }}
        />
      )}

      {editingSeries && (
        <EditSeriesForm
          series={editingSeries}
          onClose={() => setEditingSeries(null)}
          onSuccess={() => {
            loadSeries();
            setEditingSeries(null);
          }}
        />
      )}
    </div>
  );
}
