import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, AlertTriangle, Plus, Clock, User } from 'lucide-react';

interface Observation {
  id: string;
  observation_type: string;
  title: string;
  description: string;
  priority: string;
  is_visible_to_technicians: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CustomerObservationsProps {
  customerId: string;
}

export function CustomerObservations({ customerId }: CustomerObservationsProps) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newObservation, setNewObservation] = useState({
    observation_type: 'general',
    title: '',
    description: '',
    priority: 'normal',
    is_visible_to_technicians: false
  });

  useEffect(() => {
    loadObservations();
  }, [customerId]);

  const loadObservations = async () => {
    const { data, error } = await supabase
      .from('customer_observations')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (data) setObservations(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('customer_observations')
      .insert([{
        customer_id: customerId,
        ...newObservation,
        created_by: user.id
      }]);

    if (!error) {
      setNewObservation({
        observation_type: 'general',
        title: '',
        description: '',
        priority: 'normal',
        is_visible_to_technicians: false
      });
      setShowForm(false);
      loadObservations();
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      technical: 'Técnico',
      billing: 'Facturación',
      service: 'Servicio',
      complaint: 'Queja',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 text-blue-800',
      technical: 'bg-orange-100 text-orange-800',
      billing: 'bg-green-100 text-green-800',
      service: 'bg-cyan-100 text-cyan-800',
      complaint: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baja',
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Observaciones
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva Observación
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={newObservation.observation_type}
                onChange={(e) => setNewObservation({ ...newObservation, observation_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="general">General</option>
                <option value="technical">Técnico</option>
                <option value="billing">Facturación</option>
                <option value="service">Servicio</option>
                <option value="complaint">Queja</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                value={newObservation.priority}
                onChange={(e) => setNewObservation({ ...newObservation, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="low">Baja</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              value={newObservation.title}
              onChange={(e) => setNewObservation({ ...newObservation, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={newObservation.description}
              onChange={(e) => setNewObservation({ ...newObservation, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="visible-technicians"
              checked={newObservation.is_visible_to_technicians}
              onChange={(e) => setNewObservation({ ...newObservation, is_visible_to_technicians: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="visible-technicians" className="text-sm text-gray-700">
              Visible para técnicos
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {observations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay observaciones registradas</p>
          </div>
        ) : (
          observations.map((obs) => (
            <div
              key={obs.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(obs.observation_type)}`}>
                    {getTypeLabel(obs.observation_type)}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${getPriorityColor(obs.priority)}`}>
                    <AlertTriangle className="w-3 h-3" />
                    {getPriorityLabel(obs.priority)}
                  </span>
                  {obs.is_visible_to_technicians && (
                    <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs font-medium">
                      Visible para técnicos
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(obs.created_at).toLocaleDateString('es-MX')}
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-2">{obs.title}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{obs.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
