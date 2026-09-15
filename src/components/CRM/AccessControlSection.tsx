import React from 'react';

export interface AccessControlDetails {
  [sectionKey: string]: {
    enabled: boolean;
    [field: string]: any;
  }
}

interface Props {
  data: AccessControlDetails | null;
  onChange: (data: AccessControlDetails) => void;
}

const SECTIONS = [
  {
    id: 'aparato', title: 'Información del Control de Acceso', defaultEnabled: true,
    fields: [
      { name: 'tipo_control', label: 'Tipo de Control de Acceso', type: 'select', required: true, options: [
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
      { name: 'marca', label: 'Marca', type: 'text', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', required: true },
      { name: 'serie', label: 'Serie', type: 'text', required: true },
      { name: 'fact_tvc', label: 'Fact TVC', type: 'text', required: false, blue: true },
      { name: 'fecha_ftvc', label: 'Fecha FTVC', type: 'date', required: false, blue: true },
      { name: 'tc', label: 'TC', type: 'text', required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'software', label: 'Software', type: 'text', required: false },
      { name: 'modelo_software', label: 'Modelo (Soft)', type: 'text', required: false },
      { name: 'usuario_app', label: 'Usuario App', type: 'text', required: false },
      { name: 'email_app', label: 'Email App', type: 'email', required: false },
      { name: 'pwd_cliente', label: 'PWD Cliente', type: 'text', required: false },
      { name: 'usuario_adz', label: 'Usuario ADZ', type: 'text', required: false },
      { name: 'pwd_adz', label: 'PWD ADZ', type: 'text', required: false },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'fuente', title: 'Información de la Fuente de Poder', defaultEnabled: true,
    fields: [
      { name: 'tipo_fuente', label: 'Tipo Fuente', type: 'text', required: false },
      { name: 'marca', label: 'Marca', type: 'text', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', required: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'teclado', title: 'Información del Teclado', defaultEnabled: true,
    fields: [
      { name: 'marca', label: 'Marca', type: 'text', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', required: true },
      { name: 'serie', label: 'Serie', type: 'text', required: true },
      { name: 'tecnologia', label: 'Tecnología', type: 'text', required: true },
      { name: 'fact_tvc', label: 'Fact TVC', type: 'text', required: false, blue: true },
      { name: 'fecha_ftvc', label: 'Fecha FTVC', type: 'date', required: false, blue: true },
      { name: 'tc', label: 'TC', type: 'text', required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'chapa', title: 'Información de la Chapa', defaultEnabled: true,
    fields: [
      { name: 'tipo_chapa', label: 'Tipo Chapa', type: 'text', required: true },
      { name: 'marca', label: 'Marca', type: 'text', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', required: true },
      { name: 'serie', label: 'Serie', type: 'text', required: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'llaveros', title: 'Información de Llaveros de Acceso', defaultEnabled: false,
    fields: [
      { name: 'marca', label: 'Marca', type: 'text', required: true },
      { name: 'modelo', label: 'Modelo', type: 'text', required: true },
      { name: 'serie', label: 'Serie', type: 'text', required: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'tarjetas', title: 'Información de Tarjetas de Acceso', defaultEnabled: false,
    fields: [
      { name: 'marca', label: 'Marca', type: 'text', required: false },
      { name: 'tipo', label: 'Tipo', type: 'text', required: false },
      { name: 'modelo', label: 'Modelo', type: 'text', required: false },
      { name: 'cantidad', label: 'Cantidad', type: 'number', required: false },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'tags', title: 'Información de Tags Vehiculares', defaultEnabled: false,
    fields: [
      { name: 'marca', label: 'Marca', type: 'text', required: false },
      { name: 'tipo', label: 'Tipo', type: 'text', required: false },
      { name: 'modelo', label: 'Modelo', type: 'text', required: false },
      { name: 'cantidad', label: 'Cantidad', type: 'number', required: false },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'lectoras', title: 'Información de Lectoras RFID', defaultEnabled: false,
    fields: [
      { name: 'marca', label: 'Marca', type: 'text', required: false },
      { name: 'tipo', label: 'Tipo', type: 'text', required: false },
      { name: 'modelo', label: 'Modelo', type: 'text', required: false },
      { name: 'serie', label: 'Serie', type: 'text', required: false },
      { name: 'cantidad', label: 'Cantidad', type: 'number', required: false },
      { name: 'fact_tvc', label: 'Fact TVC', type: 'text', required: false, blue: true },
      { name: 'fecha_ftvc', label: 'Fecha FTVC', type: 'date', required: false, blue: true },
      { name: 'tc', label: 'TC', type: 'text', required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  },
  {
    id: 'barreras', title: 'Información de Barreras Vehiculares', defaultEnabled: false,
    fields: [
      { name: 'marca', label: 'Marca', type: 'text', required: false },
      { name: 'tipo', label: 'Tipo', type: 'text', required: false },
      { name: 'modelo', label: 'Modelo', type: 'text', required: false },
      { name: 'serie', label: 'Serie', type: 'text', required: false },
      { name: 'cantidad', label: 'Cantidad', type: 'number', required: false },
      { name: 'fact_tvc', label: 'Fact TVC', type: 'text', required: false, blue: true },
      { name: 'fecha_ftvc', label: 'Fecha FTVC', type: 'date', required: false, blue: true },
      { name: 'tc', label: 'TC', type: 'text', required: false, blue: true },
      { name: 'fecha_instalacion', label: 'Fecha Instalación', type: 'date', required: false, blue: true },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, blue: true },
    ]
  }
];

export const AccessControlSection: React.FC<Props> = ({ data, onChange }) => {
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
    <div className="md:col-span-3 space-y-6 mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="font-medium text-gray-900 border-b pb-2">Configuración de Control de Acceso</h3>
      
      {SECTIONS.map(section => {
        const sectionData = data?.[section.id] || { enabled: section.defaultEnabled };
        const isEnabled = sectionData.enabled;
        
        return (
          <div key={section.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id={`toggle-\${section.id}`}
                  checked={isEnabled}
                  onChange={(e) => handleToggle(section.id, e.target.checked)}
                  className="w-4 h-4 text-white bg-blue-700 border-blue-500 rounded focus:ring-blue-500"
                />
                <label htmlFor={`toggle-\${section.id}`} className="font-semibold text-white cursor-pointer select-none">
                  {section.title}
                </label>
              </div>
              {!isEnabled && <span className="text-blue-200 text-xs italic">Omitida</span>}
            </div>
            
            {isEnabled && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map(field => (
                  <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-600">*</span>}
                      {field.blue && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-blue-500" title="Nuevo campo"></span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={sectionData[field.name] || ''}
                        onChange={(e) => handleFieldChange(section.id, field.name, e.target.value)}
                        className={`w-full px-3 py-2 border rounded focus:ring-2 focus:border-transparent \${field.blue ? 'bg-blue-50 border-blue-200 focus:ring-blue-400' : 'border-gray-300 focus:ring-blue-500'}`}
                        required={field.required}
                        rows={2}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={sectionData[field.name] || ''}
                        onChange={(e) => handleFieldChange(section.id, field.name, e.target.value)}
                        className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:border-transparent \${field.blue ? 'bg-blue-50 border-blue-200 focus:ring-blue-400' : 'border-gray-300 focus:ring-blue-500'}`}
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
