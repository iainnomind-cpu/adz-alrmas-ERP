import { useState } from 'react';
import { X, Filter, ChevronDown } from 'lucide-react';
import { useCalendarSettings, type ActiveFilters } from '../../hooks/useCalendarSettings';

interface FilterBarProps {
  technicians: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
  serviceTypes: string[];
  statuses: string[];
  priorities: string[];
  onFilterChange: (filters: ActiveFilters) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja'
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
  installation: 'Instalación',
  maintenance: 'Mantenimiento',
  inspection: 'Inspección'
};

export function FilterBar({
  technicians,
  customers,
  serviceTypes,
  statuses,
  priorities,
  onFilterChange
}: FilterBarProps) {
  const { settings, updateActiveFilters, clearAllFilters } = useCalendarSettings();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleTechnicianToggle = async (techId: string) => {
    const newTechs = settings.activeFilters.technicians.includes(techId)
      ? settings.activeFilters.technicians.filter(t => t !== techId)
      : [...settings.activeFilters.technicians, techId];

    await updateActiveFilters({ technicians: newTechs });
    onFilterChange({ ...settings.activeFilters, technicians: newTechs });
  };

  const handleCustomerToggle = async (customerId: string) => {
    const newCustomers = settings.activeFilters.customers.includes(customerId)
      ? settings.activeFilters.customers.filter(c => c !== customerId)
      : [...settings.activeFilters.customers, customerId];

    await updateActiveFilters({ customers: newCustomers });
    onFilterChange({ ...settings.activeFilters, customers: newCustomers });
  };

  const handleServiceTypeToggle = async (serviceType: string) => {
    const newTypes = settings.activeFilters.serviceTypes.includes(serviceType)
      ? settings.activeFilters.serviceTypes.filter(t => t !== serviceType)
      : [...settings.activeFilters.serviceTypes, serviceType];

    await updateActiveFilters({ serviceTypes: newTypes });
    onFilterChange({ ...settings.activeFilters, serviceTypes: newTypes });
  };

  const handleStatusToggle = async (status: string) => {
    const newStatuses = settings.activeFilters.statuses.includes(status)
      ? settings.activeFilters.statuses.filter(s => s !== status)
      : [...settings.activeFilters.statuses, status];

    await updateActiveFilters({ statuses: newStatuses });
    onFilterChange({ ...settings.activeFilters, statuses: newStatuses });
  };

  const handlePriorityToggle = async (priority: string) => {
    const newPriorities = settings.activeFilters.priorities.includes(priority)
      ? settings.activeFilters.priorities.filter(p => p !== priority)
      : [...settings.activeFilters.priorities, priority];

    await updateActiveFilters({ priorities: newPriorities });
    onFilterChange({ ...settings.activeFilters, priorities: newPriorities });
  };

  const handlePriceRangeChange = async (min: number, max: number) => {
    await updateActiveFilters({ priceRange: [min, max] });
    onFilterChange({ ...settings.activeFilters, priceRange: [min, max] });
  };

  const hasActiveFilters =
    settings.activeFilters.technicians.length > 0 ||
    settings.activeFilters.customers.length > 0 ||
    settings.activeFilters.serviceTypes.length > 0 ||
    settings.activeFilters.statuses.length > 0 ||
    settings.activeFilters.priorities.length > 0 ||
    settings.activeFilters.priceRange[0] > 0 ||
    settings.activeFilters.priceRange[1] < 999999;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            showAdvanced
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros Avanzados
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => {
              clearAllFilters();
              onFilterChange({
                technicians: [],
                serviceTypes: [],
                statuses: [],
                priorities: [],
                customers: [],
                priceRange: [0, 999999]
              });
            }}
            className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-6">
          {technicians.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Técnicos</p>
              <div className="flex flex-wrap gap-2">
                {technicians.map(tech => (
                  <button
                    key={tech.id}
                    onClick={() => handleTechnicianToggle(tech.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      settings.activeFilters.technicians.includes(tech.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-500'
                    }`}
                  >
                    {tech.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {customers.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Clientes</p>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {customers.map(customer => (
                  <label key={customer.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.activeFilters.customers.includes(customer.id)}
                      onChange={() => handleCustomerToggle(customer.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{customer.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {serviceTypes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Tipo de Servicio</p>
              <div className="flex flex-wrap gap-2">
                {serviceTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => handleServiceTypeToggle(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      settings.activeFilters.serviceTypes.includes(type)
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-green-500'
                    }`}
                  >
                    {SERVICE_TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {statuses.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Estado</p>
              <div className="flex flex-wrap gap-2">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      settings.activeFilters.statuses.includes(status)
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-500'
                    }`}
                  >
                    {STATUS_LABELS[status] || status}
                  </button>
                ))}
              </div>
            </div>
          )}

          {priorities.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Prioridad</p>
              <div className="flex flex-wrap gap-2">
                {priorities.map(priority => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityToggle(priority)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      settings.activeFilters.priorities.includes(priority)
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-500'
                    }`}
                  >
                    {PRIORITY_LABELS[priority] || priority}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Rango de Importe</p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 font-medium">Mínimo</label>
                  <input
                    type="number"
                    value={settings.activeFilters.priceRange[0]}
                    onChange={(e) => handlePriceRangeChange(parseInt(e.target.value), settings.activeFilters.priceRange[1])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 font-medium">Máximo</label>
                  <input
                    type="number"
                    value={settings.activeFilters.priceRange[1]}
                    onChange={(e) => handlePriceRangeChange(settings.activeFilters.priceRange[0], parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {settings.activeFilters.technicians.length > 0 && (
            settings.activeFilters.technicians.map(techId => {
              const tech = technicians.find(t => t.id === techId);
              return (
                <div key={techId} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                  <span>{tech?.name}</span>
                  <button
                    onClick={() => handleTechnicianToggle(techId)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}

          {settings.activeFilters.serviceTypes.length > 0 && (
            settings.activeFilters.serviceTypes.map(type => (
              <div key={type} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                <span>{SERVICE_TYPE_LABELS[type] || type}</span>
                <button
                  onClick={() => handleServiceTypeToggle(type)}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}

          {settings.activeFilters.statuses.length > 0 && (
            settings.activeFilters.statuses.map(status => (
              <div key={status} className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                <span>{STATUS_LABELS[status] || status}</span>
                <button
                  onClick={() => handleStatusToggle(status)}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}

          {settings.activeFilters.priorities.length > 0 && (
            settings.activeFilters.priorities.map(priority => (
              <div key={priority} className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                <span>{PRIORITY_LABELS[priority] || priority}</span>
                <button
                  onClick={() => handlePriorityToggle(priority)}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
