import React from 'react';

export interface GpsPersonalDetails {
  // GPS Info
  gps_marca?: string;
  gps_modelo?: string;
  gps_serie?: string;
  gps_factura?: string;
  gps_fecha_factura?: string;
  gps_tipo_cambio?: string;
  gps_fecha_instalacion?: string;

  // SIM type
  sim_type?: 'celular' | 'datos';

  // SIM Celular Normal
  sim_numero?: string;
  sim_sim?: string;
  sim_megas?: string;
  sim_alta_sim?: string;
  sim_imei?: string;
  sim_operador?: string;

  // SIM de Datos
  datos_icc?: string;
  datos_imei?: string;
  datos_ip?: string;
  datos_msisdn?: string;
  datos_apn?: string;
  datos_megas?: string;
  datos_alta_sim?: string;

  // Medical Info
  med_padecimientos?: string;
  med_alergias?: string;
  med_medicamentos?: string;
  med_contraindicados?: string;
  med_institucion?: string;
  med_num_afiliacion?: string;
  med_seguro_gmm?: boolean;
  med_aseguradora?: string;
}

interface Props {
  data: GpsPersonalDetails | null;
  onChange: (data: GpsPersonalDetails) => void;
}

export const GpsPersonalSection: React.FC<Props> = ({ data, onChange }) => {
  const d = data || {};

  const set = (field: keyof GpsPersonalDetails, value: any) => {
    onChange({ ...d, [field]: value });
  };

  const inputClass = (blue = false) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none focus:border-transparent ${
      blue
        ? 'bg-blue-50 border-blue-200 focus:ring-blue-400'
        : 'border-gray-300 focus:ring-violet-500'
    }`;

  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  const BlueDot = () => (
    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-1 flex-shrink-0" title="Nuevo campo en BD" />
  );

  return (
    <div className="space-y-5 bg-gray-50 p-4 rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-3">
        <div className="w-3 h-3 rounded-full bg-violet-500"></div>
        <h3 className="font-semibold text-gray-900 text-base">Configuración — GPS Personal</h3>
        <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
          🔵 = Campo nuevo en BD &nbsp;|&nbsp; <span className="text-red-600">*</span> = Obligatorio
        </span>
      </div>

      {/* ── GPS Info ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-violet-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-violet-700 px-4 py-2.5">
          <h4 className="font-semibold text-white text-sm">Información del GPS</h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca <span className="text-red-600">*</span></label>
            <input type="text" value={d.gps_marca || ''} onChange={e => set('gps_marca', e.target.value)}
              className={inputClass()} required />
          </div>
          <div>
            <label className={labelClass}>Modelo <span className="text-red-600">*</span></label>
            <input type="text" value={d.gps_modelo || ''} onChange={e => set('gps_modelo', e.target.value)}
              className={inputClass()} required />
          </div>
          <div>
            <label className={labelClass}>Serie <span className="text-red-600">*</span></label>
            <input type="text" value={d.gps_serie || ''} onChange={e => set('gps_serie', e.target.value)}
              className={inputClass()} required />
          </div>
          <div>
            <label className={labelClass}>Factura <BlueDot /></label>
            <input type="text" value={d.gps_factura || ''} onChange={e => set('gps_factura', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Fecha de Factura <BlueDot /></label>
            <input type="date" value={d.gps_fecha_factura || ''} onChange={e => set('gps_fecha_factura', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Tipo de Cambio <BlueDot /></label>
            <input type="text" value={d.gps_tipo_cambio || ''} onChange={e => set('gps_tipo_cambio', e.target.value)}
              placeholder="Ej: 17.50" className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Fecha de Instalación <BlueDot /></label>
            <input type="date" value={d.gps_fecha_instalacion || ''} onChange={e => set('gps_fecha_instalacion', e.target.value)}
              className={inputClass(true)} />
          </div>
        </div>
      </div>

      {/* ── SIM Section ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-violet-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-violet-700 px-4 py-2.5 flex items-center gap-6">
          <h4 className="font-semibold text-white text-sm">SIM / Conectividad</h4>
          {/* SIM type toggle */}
          <div className="flex items-center gap-4 ml-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="sim_type" value="celular"
                checked={d.sim_type === 'celular' || !d.sim_type}
                onChange={() => set('sim_type', 'celular')}
                className="accent-white" />
              <span className="text-white text-xs font-medium">SIM Celular Normal</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="sim_type" value="datos"
                checked={d.sim_type === 'datos'}
                onChange={() => set('sim_type', 'datos')}
                className="accent-white" />
              <span className="text-white text-xs font-medium">SIM de Datos (sin número)</span>
            </label>
          </div>
        </div>

        {/* SIM Celular Normal */}
        {(d.sim_type === 'celular' || !d.sim_type) && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>SIM <span className="text-red-600">*</span><BlueDot /></label>
              <input type="text" value={d.sim_sim || ''} onChange={e => set('sim_sim', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Número <span className="text-red-600">*</span><BlueDot /></label>
              <input type="text" value={d.sim_numero || ''} onChange={e => set('sim_numero', e.target.value)}
                className={inputClass(true)} required placeholder="10 dígitos o formato libre" />
            </div>
            <div>
              <label className={labelClass}>IMEI <span className="text-red-600">*</span><BlueDot /></label>
              <input type="text" value={d.sim_imei || ''} onChange={e => set('sim_imei', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Operador <span className="text-red-600">*</span><BlueDot /></label>
              <select value={d.sim_operador || ''} onChange={e => set('sim_operador', e.target.value)}
                className={inputClass(true)} required>
                <option value="">Seleccionar...</option>
                <option value="AT&T">AT&amp;T</option>
                <option value="Movistar">Movistar</option>
                <option value="Telcel">Telcel</option>
                <option value="Syscom">Syscom</option>
                <option value="WE">WE</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Megas <BlueDot /></label>
              <input type="text" value={d.sim_megas || ''} onChange={e => set('sim_megas', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div>
              <label className={labelClass}>Alta SIM <BlueDot /></label>
              <input type="date" value={d.sim_alta_sim || ''} onChange={e => set('sim_alta_sim', e.target.value)}
                className={inputClass(true)} />
            </div>
          </div>
        )}

        {/* SIM de Datos — NO tiene campo Número */}
        {d.sim_type === 'datos' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>ICC <span className="text-red-600">*</span><BlueDot /></label>
              <input type="text" value={d.datos_icc || ''} onChange={e => set('datos_icc', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>IMEI <span className="text-red-600">*</span><BlueDot /></label>
              <input type="text" value={d.datos_imei || ''} onChange={e => set('datos_imei', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>IP <BlueDot /></label>
              <input type="text" value={d.datos_ip || ''} onChange={e => set('datos_ip', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div>
              <label className={labelClass}>MSISDN <BlueDot /></label>
              <input type="text" value={d.datos_msisdn || ''} onChange={e => set('datos_msisdn', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div>
              <label className={labelClass}>APN <BlueDot /></label>
              <input type="text" value={d.datos_apn || ''} onChange={e => set('datos_apn', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div>
              <label className={labelClass}>Megas <BlueDot /></label>
              <input type="text" value={d.datos_megas || ''} onChange={e => set('datos_megas', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div>
              <label className={labelClass}>Alta SIM <BlueDot /></label>
              <input type="date" value={d.datos_alta_sim || ''} onChange={e => set('datos_alta_sim', e.target.value)}
                className={inputClass(true)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Información Médica ────────────────────────────────────────────── */}
      <div className="bg-white border border-rose-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-rose-700 px-4 py-2.5 flex items-center gap-2">
          <h4 className="font-semibold text-white text-sm">Información Médica del Usuario</h4>
          <span className="text-rose-200 text-xs">(Relevante para adultos mayores / rastreo personal)</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Padecimientos Crónicos <BlueDot /></label>
            <textarea rows={2} value={d.med_padecimientos || ''} onChange={e => set('med_padecimientos', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Alergias <BlueDot /></label>
            <textarea rows={2} value={d.med_alergias || ''} onChange={e => set('med_alergias', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Ingesta de Medicamentos <BlueDot /></label>
            <textarea rows={2} value={d.med_medicamentos || ''} onChange={e => set('med_medicamentos', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Medicamentos Contraindicados <BlueDot /></label>
            <textarea rows={2} value={d.med_contraindicados || ''} onChange={e => set('med_contraindicados', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Institución Médica de Atención <BlueDot /></label>
            <input type="text" value={d.med_institucion || ''} onChange={e => set('med_institucion', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div>
            <label className={labelClass}>Número de Afiliación <BlueDot /></label>
            <input type="text" value={d.med_num_afiliacion || ''} onChange={e => set('med_num_afiliacion', e.target.value)}
              className={inputClass(true)} />
          </div>
          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                checked={d.med_seguro_gmm === true}
                onChange={e => set('med_seguro_gmm', e.target.checked)}
                className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500" />
              <span className="text-sm font-medium text-gray-700">
                Seguro de Gastos Médicos Mayores <BlueDot />
              </span>
            </label>
          </div>
          {d.med_seguro_gmm && (
            <div>
              <label className={labelClass}>Compañía Aseguradora <BlueDot /></label>
              <input type="text" value={d.med_aseguradora || ''} onChange={e => set('med_aseguradora', e.target.value)}
                className={inputClass(true)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
