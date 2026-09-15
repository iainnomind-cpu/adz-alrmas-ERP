import React from 'react';

export interface RedDetails {
  [sectionKey: string]: {
    enabled: boolean;
    [field: string]: any;
  }
}

interface Props {
  data: RedDetails | null;
  onChange: (data: RedDetails) => void;
}

const commonFields = [
  { name: 'marca', label: 'Marca', type: 'text', required: true },
  { name: 'modelo', label: 'Modelo', type: 'text', required: true },
  { name: 'serie', label: 'Serie', type: 'text', required: true },
  { name: 'tecnologia', label: 'Tecnología', type: 'text', required: false },
  { name: 'fecha_instalacion', label: 'Fecha de Instalación', type: 'date', required: false, blue: true },
  { name: 'factura', label: 'Factura', type: 'text', required: false, blue: true },
  { name: 'fecha_factura', label: 'Fecha de Factura', type: 'date', required: false, blue: true },
  { name: 'tipo_cambio', label: 'Tipo de Cambio', type: 'text', required: false, blue: true },
  { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
];

const SECTIONS = [
  { id: 'switch', title: 'Switch' },
  { id: 'switch_poe', title: 'Switch PoE' },
  { id: 'ruteador', title: 'Ruteador' },
  { id: 'access_point', title: 'Access Point' },
  { id: 'extensor_red', title: 'Extensor de Red' },
  { id: 'sistema_mesh', title: 'Sistema Mesh' },
  { id: 'enlace_ptp', title: 'Enlace Punto a Punto' },
  { id: 'starlink', title: 'StarLink' }
];

export const RedSection: React.FC<Props> = ({ data, onChange }) => {
  const handleToggle = (sectionId: string, checked: boolean) => {
    const current = data || {};
    onChange({
      ...current,
      [sectionId]: { ...(current[sectionId] || {}), enabled: checked }
    });
  };

  const handleFieldChange = (sectionId: string, field: string, value: any) => {
    const current = data || {};
    const sectionData = current[sectionId] || { enabled: true };
    onChange({
      ...current,
      [sectionId]: { ...sectionData, [field]: value }
    });
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 border-b pb-3">
        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
        <h3 className="font-semibold text-gray-900 text-base">Configuración — Red</h3>
        <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
          🔵 = Campo nuevo en BD
        </span>
      </div>

      {SECTIONS.map(section => {
        const sectionData = data?.[section.id] || { enabled: false };
        const isEnabled = sectionData.enabled;

        return (
          <div key={section.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className={`px-4 py-3 flex items-center justify-between ${isEnabled ? 'bg-indigo-700' : 'bg-gray-400'}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`red-toggle-${section.id}`}
                  checked={isEnabled}
                  onChange={(e) => handleToggle(section.id, e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor={`red-toggle-${section.id}`} className="font-semibold text-white cursor-pointer select-none text-sm">
                  {section.title}
                </label>
              </div>
              {!isEnabled && <span className="text-white/70 text-xs italic">Omitida</span>}
            </div>

            {isEnabled && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {commonFields.map(field => (
                  <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-600">*</span>}
                      {field.blue && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Nuevo campo"></span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={sectionData[field.name] || ''}
                        onChange={(e) => handleFieldChange(section.id, field.name, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none focus:border-transparent ${
                          field.blue ? 'bg-blue-50 border-blue-200 focus:ring-blue-400' : 'border-gray-300 focus:ring-indigo-500'
                        }`}
                        rows={2}
                        required={field.required}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={sectionData[field.name] || ''}
                        onChange={(e) => handleFieldChange(section.id, field.name, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none focus:border-transparent ${
                          field.blue ? 'bg-blue-50 border-blue-200 focus:ring-blue-400' : 'border-gray-300 focus:ring-indigo-500'
                        }`}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
