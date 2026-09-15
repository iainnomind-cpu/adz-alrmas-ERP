import React from 'react';
import { X } from 'lucide-react';

export interface VpDetails {
  // Mandatory Kit
  frente_calle?: { marca?: string, modelo?: string, serie?: string, tecnologia?: string, fecha_instalacion?: string };
  pantalla_principal?: { marca?: string, modelo?: string, serie?: string, tecnologia?: string, fecha_instalacion?: string };
  fuente_poder?: { marca?: string, modelo?: string, serie?: string, tecnologia?: string, fecha_instalacion?: string };
  
  // Dynamic Screens (max 8)
  pantallas_adicionales?: Array<{ marca?: string, modelo?: string, serie?: string, tecnologia?: string, fecha_instalacion?: string, ubicacion?: string }>;
  
  // Optional Sections
  chapa?: { enabled?: boolean, tipo?: string, marca?: string, modelo?: string, serie?: string, fecha_instalacion?: string, observaciones?: string };
  llaveros?: { enabled?: boolean, marca?: string, modelo?: string, serie?: string, fecha_instalacion?: string, observaciones?: string };
}

interface Props {
  data: VpDetails | null;
  onChange: (data: VpDetails) => void;
}

export const VideoPorteroSection: React.FC<Props> = ({ data, onChange }) => {
  const d = data || {
    frente_calle: {}, pantalla_principal: {}, fuente_poder: {}, pantallas_adicionales: [], chapa: { enabled: false }, llaveros: { enabled: false }
  };

  const setKit = (section: 'frente_calle' | 'pantalla_principal' | 'fuente_poder', field: string, value: string) => {
    onChange({ ...d, [section]: { ...(d[section] || {}), [field]: value } });
  };

  const setOptional = (section: 'chapa' | 'llaveros', field: string, value: any) => {
    onChange({ ...d, [section]: { ...(d[section] || {}), [field]: value } });
  };

  // Pantallas Adicionales logic
  const pantallas = d.pantallas_adicionales || [];
  
  const addPantalla = () => {
    if (pantallas.length < 8) {
      onChange({ ...d, pantallas_adicionales: [...pantallas, {}] });
    }
  };

  const removePantalla = (index: number) => {
    const newP = [...pantallas];
    newP.splice(index, 1);
    onChange({ ...d, pantallas_adicionales: newP });
  };

  const updatePantalla = (index: number, field: string, value: string) => {
    const newP = [...pantallas];
    newP[index] = { ...newP[index], [field]: value };
    onChange({ ...d, pantallas_adicionales: newP });
  };

  const inputClass = (blue = false) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-none focus:border-transparent ${
      blue ? 'bg-blue-50 border-blue-200 focus:ring-blue-400' : 'border-gray-300 focus:ring-teal-500'
    }`;

  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';
  const BlueDot = () => <span className="inline-block w-2 h-2 rounded-full bg-blue-500 ml-1 flex-shrink-0" title="Nuevo campo en BD" />;

  const renderBasicKitForm = (section: 'frente_calle' | 'pantalla_principal' | 'fuente_poder') => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      <div>
        <label className={labelClass}>Marca <span className="text-red-600">*</span><BlueDot /></label>
        <input type="text" value={d[section]?.marca || ''} onChange={e => setKit(section, 'marca', e.target.value)}
          className={inputClass(true)} required />
      </div>
      <div>
        <label className={labelClass}>Modelo <span className="text-red-600">*</span><BlueDot /></label>
        <input type="text" value={d[section]?.modelo || ''} onChange={e => setKit(section, 'modelo', e.target.value)}
          className={inputClass(true)} required />
      </div>
      <div>
        <label className={labelClass}>Serie <span className="text-red-600">*</span><BlueDot /></label>
        <input type="text" value={d[section]?.serie || ''} onChange={e => setKit(section, 'serie', e.target.value)}
          className={inputClass(true)} required />
      </div>
      <div>
        <label className={labelClass}>Tecnología <BlueDot /></label>
        <input type="text" value={d[section]?.tecnologia || ''} onChange={e => setKit(section, 'tecnologia', e.target.value)}
          className={inputClass(true)} placeholder="Ej: IP, Analógico" />
      </div>
      <div>
        <label className={labelClass}>Instalación <BlueDot /></label>
        <input type="date" value={d[section]?.fecha_instalacion || ''} onChange={e => setKit(section, 'fecha_instalacion', e.target.value)}
          className={inputClass(true)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 border-b pb-3">
        <div className="w-3 h-3 rounded-full bg-teal-500"></div>
        <h3 className="font-semibold text-gray-900 text-base">Configuración — Video Portero</h3>
        <span className="ml-auto text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
          🔵 = Campo nuevo en BD
        </span>
      </div>

      {/* ── KIT BÁSICO OBLIGATORIO ────────────────────────────────────────── */}
      <div className="bg-white border border-teal-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-teal-700 px-4 py-2.5">
          <h4 className="font-semibold text-white text-sm">Kit Básico (Obligatorio)</h4>
        </div>
        
        <div className="divide-y divide-gray-100">
          {/* Frente de Calle */}
          <div className="p-4">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">1. Frente de Calle (Timbre con Cámara)</h5>
            {renderBasicKitForm('frente_calle')}
          </div>
          
          {/* Pantalla del Kit */}
          <div className="p-4 bg-gray-50/50">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">2. Pantalla Principal del Kit</h5>
            {renderBasicKitForm('pantalla_principal')}
          </div>
          
          {/* Fuente de Poder */}
          <div className="p-4">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">3. Fuente de Poder</h5>
            {renderBasicKitForm('fuente_poder')}
          </div>
        </div>
      </div>

      {/* ── PANTALLAS ADICIONALES ─────────────────────────────────────────── */}
      <div className="bg-white border border-teal-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-teal-600 px-4 py-2.5 flex justify-between items-center">
          <h4 className="font-semibold text-white text-sm">
            Pantallas Adicionales ({pantallas.length} / 8)
          </h4>
          {pantallas.length < 8 && (
            <button type="button" onClick={addPantalla}
              className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded transition-colors border border-white/30">
              + Agregar Pantalla
            </button>
          )}
        </div>
        
        <div className="p-4 space-y-4">
          {pantallas.length === 0 && (
            <div className="text-center py-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">Este cliente solo tiene la pantalla principal. Agrega más pantallas si es necesario (máx. 8).</p>
            </div>
          )}
          
          {pantallas.map((p, idx) => (
            <div key={idx} className="bg-gray-50 p-4 border border-gray-200 rounded-lg relative">
              <button type="button" onClick={() => removePantalla(idx)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500" title="Eliminar pantalla">
                <X className="w-4 h-4" />
              </button>
              <h5 className="text-xs font-semibold text-teal-600 mb-3 uppercase tracking-wider">
                Pantalla Adicional #{idx + 1}
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="lg:col-span-2">
                  <label className={labelClass}>Ubicación <span className="text-red-600">*</span><BlueDot /></label>
                  <input type="text" value={p.ubicacion || ''} onChange={e => updatePantalla(idx, 'ubicacion', e.target.value)}
                    className={inputClass(true)} placeholder="Ej: Segunda planta, Cocina..." required />
                </div>
                <div className="lg:col-span-1">
                  <label className={labelClass}>Marca <span className="text-red-600">*</span><BlueDot /></label>
                  <input type="text" value={p.marca || ''} onChange={e => updatePantalla(idx, 'marca', e.target.value)}
                    className={inputClass(true)} required />
                </div>
                <div className="lg:col-span-1">
                  <label className={labelClass}>Modelo <span className="text-red-600">*</span><BlueDot /></label>
                  <input type="text" value={p.modelo || ''} onChange={e => updatePantalla(idx, 'modelo', e.target.value)}
                    className={inputClass(true)} required />
                </div>
                <div className="lg:col-span-1">
                  <label className={labelClass}>Serie <span className="text-red-600">*</span><BlueDot /></label>
                  <input type="text" value={p.serie || ''} onChange={e => updatePantalla(idx, 'serie', e.target.value)}
                    className={inputClass(true)} required />
                </div>
                <div className="lg:col-span-1">
                  <label className={labelClass}>Instalación <BlueDot /></label>
                  <input type="date" value={p.fecha_instalacion || ''} onChange={e => updatePantalla(idx, 'fecha_instalacion', e.target.value)}
                    className={inputClass(true)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACCESORIOS OPCIONALES (Chapa / Llaveros) ──────────────────────── */}
      
      {/* Chapa */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className={`px-4 py-3 flex items-center justify-between ${d.chapa?.enabled ? 'bg-slate-700' : 'bg-gray-400'}`}>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="vp-chapa-toggle" checked={d.chapa?.enabled || false}
              onChange={(e) => setOptional('chapa', 'enabled', e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="vp-chapa-toggle" className="font-semibold text-white cursor-pointer select-none text-sm">
              Incluir Chapa (Eléctrica / Inteligente)
            </label>
          </div>
        </div>
        {d.chapa?.enabled && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Tipo de Chapa <span className="text-red-600">*</span></label>
              <select value={d.chapa?.tipo || ''} onChange={e => setOptional('chapa', 'tipo', e.target.value)}
                className={inputClass(true)} required>
                <option value="">Seleccionar...</option>
                <option value="Eléctrica">Eléctrica</option>
                <option value="Inteligente">Inteligente</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Marca <span className="text-red-600">*</span></label>
              <input type="text" value={d.chapa?.marca || ''} onChange={e => setOptional('chapa', 'marca', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Modelo <span className="text-red-600">*</span></label>
              <input type="text" value={d.chapa?.modelo || ''} onChange={e => setOptional('chapa', 'modelo', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Serie <span className="text-red-600">*</span></label>
              <input type="text" value={d.chapa?.serie || ''} onChange={e => setOptional('chapa', 'serie', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Instalación</label>
              <input type="date" value={d.chapa?.fecha_instalacion || ''} onChange={e => setOptional('chapa', 'fecha_instalacion', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div className="lg:col-span-3">
              <label className={labelClass}>Observaciones</label>
              <input type="text" value={d.chapa?.observaciones || ''} onChange={e => setOptional('chapa', 'observaciones', e.target.value)}
                className={inputClass(true)} />
            </div>
          </div>
        )}
      </div>

      {/* Llaveros */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className={`px-4 py-3 flex items-center justify-between ${d.llaveros?.enabled ? 'bg-slate-700' : 'bg-gray-400'}`}>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="vp-llaveros-toggle" checked={d.llaveros?.enabled || false}
              onChange={(e) => setOptional('llaveros', 'enabled', e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="vp-llaveros-toggle" className="font-semibold text-white cursor-pointer select-none text-sm">
              Incluir Llaveros
            </label>
          </div>
        </div>
        {d.llaveros?.enabled && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Marca <span className="text-red-600">*</span></label>
              <input type="text" value={d.llaveros?.marca || ''} onChange={e => setOptional('llaveros', 'marca', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Modelo <span className="text-red-600">*</span></label>
              <input type="text" value={d.llaveros?.modelo || ''} onChange={e => setOptional('llaveros', 'modelo', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Serie <span className="text-red-600">*</span></label>
              <input type="text" value={d.llaveros?.serie || ''} onChange={e => setOptional('llaveros', 'serie', e.target.value)}
                className={inputClass(true)} required />
            </div>
            <div>
              <label className={labelClass}>Instalación</label>
              <input type="date" value={d.llaveros?.fecha_instalacion || ''} onChange={e => setOptional('llaveros', 'fecha_instalacion', e.target.value)}
                className={inputClass(true)} />
            </div>
            <div className="lg:col-span-4">
              <label className={labelClass}>Observaciones</label>
              <input type="text" value={d.llaveros?.observaciones || ''} onChange={e => setOptional('llaveros', 'observaciones', e.target.value)}
                className={inputClass(true)} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
