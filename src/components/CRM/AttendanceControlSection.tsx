import React from 'react';

export interface AttendanceControlDetails {
  [sectionKey: string]: {
    enabled: boolean;
    [field: string]: any;
  }
}

interface Props {
  data: AttendanceControlDetails | null;
  onChange: (data: AttendanceControlDetails) => void;
}

const SECTIONS = [
  {
    id: 'aparato',
    title: 'Información del Control de Asistencia',
    defaultEnabled: true,
    fields: [
      { name: 'tipo_control', label: 'Tipo de Control de Asistencia', type: 'select', required: true, options: [
        'Clave',
        'Biométrica Huella',
        'Biométrica Huella y Clave',
        'Biométrica Huella, Clave y Tarjeta',
        'Biométrica Iris',
        'Biométrica Palma de Mano',
        'Biométrica Rostro',
        'Biométrica Rostro y Clave',
        'Biométrica Rostro, Clave y Tarjeta',
        'Biométrica Rostro, Huella y Tarjeta',
        'Biométrica Rostro y Tarjeta',
        'Panel con Lectores Esclavos',
        'Stand Alone Clave',
        'Stand Alone Clave y Tarjeta',
        'Stand Alone Huella y Tarjeta'
      ] },
      { name: 'marca',         label: 'Marca',         type: 'text',     required: true  },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: true  },
      { name: 'serie',         label: 'Serie',         type: 'text',     required: true  },
      { name: 'fact_tvc',      label: 'Fact TVC',      type: 'text',     required: false, blue: true },
      { name: 'fecha_ftvc',    label: 'Fecha FTVC',    type: 'date',     required: false, blue: true },
      { name: 'tc',            label: 'TC',            type: 'text',     required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'software',      label: 'Software',      type: 'text',     required: false },
      { name: 'modelo_soft',   label: 'Modelo (Soft)', type: 'text',     required: false },
      { name: 'usuario_app',   label: 'Usuario App',   type: 'text',     required: false },
      { name: 'email_app',     label: 'Email App',     type: 'email',    required: false },
      { name: 'pwd_cliente',   label: 'PWD Cliente',   type: 'text',     required: false },
      { name: 'usuario_adz',   label: 'Usuario ADZ',   type: 'text',     required: true  },
      { name: 'pwd_adz',       label: 'PWD ADZ',       type: 'text',     required: true  },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'fuente',
    title: 'Información de la Fuente de Poder',
    defaultEnabled: true,
    fields: [
      { name: 'tipo_fuente',   label: 'Tipo Fuente',   type: 'text',     required: false },
      { name: 'marca',         label: 'Marca',         type: 'text',     required: true  },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: true  },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'teclado',
    title: 'Información del Teclado',
    defaultEnabled: true,
    fields: [
      { name: 'marca',         label: 'Marca',         type: 'text',     required: true  },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: true  },
      { name: 'serie',         label: 'Serie',         type: 'text',     required: true  },
      { name: 'tecnologia',    label: 'Tecnología',    type: 'text',     required: true  },
      { name: 'fact_tvc',      label: 'Fact TVC',      type: 'text',     required: false, blue: true },
      { name: 'fecha_ftvc',    label: 'Fecha FTVC',    type: 'date',     required: false, blue: true },
      { name: 'tc',            label: 'TC',            type: 'text',     required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'chapa',
    title: 'Información de la Chapa',
    defaultEnabled: true,
    fields: [
      { name: 'tipo_chapa',    label: 'Tipo Chapa',    type: 'text',     required: false },
      { name: 'marca',         label: 'Marca',         type: 'text',     required: true  },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: true  },
      { name: 'serie',         label: 'Serie',         type: 'text',     required: true  },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'llaveros',
    title: 'Información de Llaveros de Acceso',
    defaultEnabled: false,
    fields: [
      { name: 'marca',         label: 'Marca',         type: 'text',     required: true  },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: true  },
      { name: 'serie',         label: 'Serie',         type: 'text',     required: true  },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'tarjetas',
    title: 'Información de Tarjetas de Acceso',
    defaultEnabled: false,
    fields: [
      { name: 'marca',         label: 'Marca',         type: 'text',     required: false },
      { name: 'tipo',          label: 'Tipo',          type: 'text',     required: false },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: false },
      { name: 'cantidad',      label: 'Cantidad',      type: 'number',   required: false },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'tags',
    title: 'Información de Tags Vehiculares',
    defaultEnabled: false,
    fields: [
      { name: 'marca',         label: 'Marca',         type: 'text',     required: false },
      { name: 'tipo',          label: 'Tipo',          type: 'text',     required: false },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: false },
      { name: 'cantidad',      label: 'Cantidad',      type: 'number',   required: false },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'lectoras',
    title: 'Información de Lectoras RFID',
    defaultEnabled: false,
    fields: [
      { name: 'marca',         label: 'Marca',         type: 'text',     required: false },
      { name: 'tipo',          label: 'Tipo',          type: 'text',     required: false },
      { name: 'modelo',        label: 'Modelo',        type: 'text',     required: false },
      { name: 'serie',         label: 'Serie',         type: 'text',     required: false },
      { name: 'fact_tvc',      label: 'Fact TVC',      type: 'text',     required: false, blue: true },
      { name: 'fecha_ftvc',    label: 'Fecha FTVC',    type: 'date',     required: false, blue: true },
      { name: 'tc',            label: 'TC',            type: 'text',     required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
];

export const AttendanceControlSection: React.FC<Props> = ({ data, onChange }) => {
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
        <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
        <h3 className="font-semibold text-gray-900 text-base">Configuración — Control de Asistencia</h3>
        <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
          🔵 = Campo nuevo en BD
        </span>
      </div>

      {SECTIONS.map(section => {
        const sectionData = data?.[section.id] || { enabled: section.defaultEnabled };
        const isEnabled = sectionData.enabled !== false ? section.defaultEnabled || sectionData.enabled : false;
        // Determine actual enabled state
        const actualEnabled = data?.[section.id] !== undefined
          ? sectionData.enabled
          : section.defaultEnabled;

        return (
          <div key={section.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {/* Section header with toggle */}
            <div className={`px-4 py-3 flex items-center justify-between ${actualEnabled ? 'bg-cyan-700' : 'bg-gray-400'}`}>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`assist-toggle-${section.id}`}
                  checked={actualEnabled}
                  onChange={(e) => handleToggle(section.id, e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor={`assist-toggle-${section.id}`} className="font-semibold text-white cursor-pointer select-none text-sm">
                  {section.title}
                </label>
              </div>
              {!actualEnabled && <span className="text-white/70 text-xs italic">Omitida</span>}
            </div>

            {/* Section fields */}
            {actualEnabled && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map(field => (
                  <div
                    key={field.name}
                    className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}
                  >
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-600">*</span>}
                      {field.blue && (
                        <span
                          className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                          title="Nuevo campo (no existe en BD actual)"
                        ></span>
                      )}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={sectionData[field.name] || ''}
                        onChange={(e) => handleFieldChange(section.id, field.name, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none focus:border-transparent ${
                          field.blue
                            ? 'bg-blue-50 border-blue-200 focus:ring-blue-400'
                            : 'border-gray-300 focus:ring-cyan-500'
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
                          field.blue
                            ? 'bg-blue-50 border-blue-200 focus:ring-blue-400'
                            : 'border-gray-300 focus:ring-cyan-500'
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
