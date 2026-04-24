import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    MapPin, Plus, Edit2, ToggleLeft, ToggleRight, 
    X, Loader2, Save, Store, Truck, Users, User
} from 'lucide-react';

interface Location {
    id: string;
    name: string;
    type: 'warehouse' | 'vehicle' | 'partner' | 'personal';
    description: string | null;
    is_active: boolean;
}

const LOCATION_TYPES = {
    warehouse: { label: 'Almacén Central', icon: Store, color: 'text-blue-600 bg-blue-100' },
    vehicle: { label: 'Vehículo', icon: Truck, color: 'text-green-600 bg-green-100' },
    partner: { label: 'Socio / Partner', icon: Users, color: 'text-purple-600 bg-purple-100' },
    personal: { label: 'Técnico', icon: User, color: 'text-orange-600 bg-orange-100' }
};

export function LocationManager() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingLoc, setEditingLoc] = useState<Location | null>(null);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'warehouse' as Location['type'],
        description: '',
        is_active: true
    });

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase.from('inventory_locations') as any)
                .select('*')
                .order('name');
            
            if (error) throw error;
            setLocations(data || []);
        } catch (error) {
            console.error('Error loading locations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (loc?: Location) => {
        if (loc) {
            setEditingLoc(loc);
            setFormData({
                name: loc.name,
                type: loc.type,
                description: loc.description || '',
                is_active: loc.is_active
            });
        } else {
            setEditingLoc(null);
            setFormData({
                name: '',
                type: 'warehouse',
                description: '',
                is_active: true
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingLoc(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingLoc) {
                const { error } = await (supabase.from('inventory_locations') as any)
                    .update({
                        name: formData.name,
                        type: formData.type,
                        description: formData.description || null,
                        is_active: formData.is_active
                    })
                    .eq('id', editingLoc.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from('inventory_locations') as any)
                    .insert([{
                        name: formData.name,
                        type: formData.type,
                        description: formData.description || null,
                        is_active: formData.is_active
                    }]);
                if (error) throw error;
            }
            await loadLocations();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Error al guardar la ubicación. Puede que el nombre ya exista.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (loc: Location) => {
        try {
            const { error } = await (supabase.from('inventory_locations') as any)
                .update({ is_active: !loc.is_active })
                .eq('id', loc.id);
            if (error) throw error;
            await loadLocations();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <MapPin className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Ubicaciones de Inventario</h3>
                            <p className="text-amber-100">{locations.length} ubicaciones registradas</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg shadow-sm transition-colors flex items-center gap-2 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Ubicación
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map((loc) => {
                    const TypeIcon = LOCATION_TYPES[loc.type as keyof typeof LOCATION_TYPES]?.icon || MapPin;
                    const typeColor = LOCATION_TYPES[loc.type as keyof typeof LOCATION_TYPES]?.color || 'bg-gray-100 text-gray-600';
                    const typeLabel = LOCATION_TYPES[loc.type as keyof typeof LOCATION_TYPES]?.label || 'Otro';

                    return (
                        <div key={loc.id} className={`bg-white rounded-xl shadow-sm border p-5 transition-all outline-2 outline-transparent hover:outline-amber-200 ${!loc.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-lg ${typeColor}`}>
                                    <TypeIcon className="w-6 h-6" />
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => handleOpenModal(loc)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Editar Ubicación"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => toggleStatus(loc)}
                                        className={`p-1.5 rounded transition-colors ${loc.is_active ? 'text-gray-500 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}
                                        title={loc.is_active ? 'Desactivar' : 'Reactivar'}
                                    >
                                        {loc.is_active ? <ToggleLeft className="w-5 h-5 text-gray-400" /> : <ToggleRight className="w-5 h-5 text-green-500" />}
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-1">{loc.name}</h4>
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${typeColor}`}>
                                    {typeLabel}
                                </span>
                                <p className="text-sm text-gray-600 line-clamp-2 min-h-10">
                                    {loc.description || 'Sin descripción adicional.'}
                                </p>
                            </div>
                            
                            {!loc.is_active && (
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-red-500 uppercase tracking-widest">Inactiva</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex flex-row items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex gap-2 items-center">
                                <MapPin className="w-5 h-5" /> 
                                {editingLoc ? 'Editar Ubicación' : 'Nueva Ubicación'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de Ubicación <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    placeholder="Ej: Almacén Norte"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo de Ubicación <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                >
                                    {Object.entries(LOCATION_TYPES).map(([val, {label}]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción (Opcional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                    placeholder="Detalles sobre esta ubicación..."
                                />
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Ubicación Activa
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.name}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg flex gap-2 items-center transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                                    ) : (
                                        <><Save className="w-5 h-5" /> Guardar</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
