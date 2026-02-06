import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building2, MapPin, Phone, Mail, Plus, X, Edit2, Trash2,
  Home, Store, Building, Warehouse, AlertCircle, CheckCircle2,
  Link as LinkIcon, Users, Calendar, Shield, Star, Navigation
} from 'lucide-react';

interface ServiceLocation {
  id: string;
  customer_id: string;
  master_account_id: string | null;
  location_name: string;
  location_type: string;
  is_primary: boolean;
  street_address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  active_services: string[] | null;
  service_orders_count: number;
  status: string;
  notes: string | null;
  access_instructions: string | null;
  created_at: string;
}

interface AccountRelationship {
  id: string;
  master_account_id: string;
  linked_account_id: string;
  relationship_type: string;
  location_name: string | null;
  location_type: string | null;
  street_address: string | null;
  services_provided: string[] | null;
  service_start_date: string | null;
  service_status: string;
  priority_order: number;
  created_at: string;
}

interface MasterAccountManagerProps {
  customerId: string;
  isMasterAccount: boolean;
  serviceCount: number;
  onUpdate: () => void;
}

export function MasterAccountManager({
  customerId,
  isMasterAccount,
  serviceCount,
  onUpdate
}: MasterAccountManagerProps) {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [relationships, setRelationships] = useState<AccountRelationship[]>([]);
  const [consolidatedAccounts, setConsolidatedAccounts] = useState<any[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newLocation, setNewLocation] = useState({
    location_name: '',
    location_type: 'casa',
    street_address: '',
    neighborhood: '',
    city: 'Ciudad Guzmán',
    state: 'Jalisco',
    postal_code: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    notes: '',
    access_instructions: '',
    is_primary: false
  });

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locationsData, relationshipsData, consolidatedData] = await Promise.all([
        supabase
          .from('service_locations')
          .select('*')
          .eq('customer_id', customerId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true }),
        isMasterAccount
          ? supabase
              .from('account_relationships')
              .select('*')
              .eq('master_account_id', customerId)
              .order('priority_order', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        isMasterAccount
          ? supabase
              .from('customers')
              .select('id, name, account_number, branch_name, is_single_branch, status, created_at')
              .eq('master_account_id', customerId)
              .eq('account_type', 'consolidated')
              .order('branch_name')
          : Promise.resolve({ data: [], error: null })
      ]);

      if (locationsData.data) setLocations(locationsData.data);
      if (relationshipsData.data) setRelationships(relationshipsData.data);
      if (consolidatedData.data) setConsolidatedAccounts(consolidatedData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    try {
      const { error } = await supabase
        .from('service_locations')
        .insert([{
          customer_id: customerId,
          master_account_id: isMasterAccount ? customerId : null,
          ...newLocation
        }]);

      if (error) throw error;

      setShowAddLocation(false);
      setNewLocation({
        location_name: '',
        location_type: 'casa',
        street_address: '',
        neighborhood: '',
        city: 'Ciudad Guzmán',
        state: 'Jalisco',
        postal_code: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
        access_instructions: '',
        is_primary: false
      });

      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error al agregar ubicación');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('¿Está seguro de eliminar esta ubicación?')) return;

    try {
      const { error } = await supabase
        .from('service_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error al eliminar ubicación');
    }
  };

  const handlePromoteToMaster = async () => {
    if (!confirm(`¿Desea promover esta cuenta a Cuenta Maestra? Esto consolidará la facturación de todas las ubicaciones.`)) return;

    try {
      const { error } = await supabase.rpc('link_accounts_to_master', {
        p_customer_id: customerId
      });

      if (error) throw error;

      alert('Cuenta promovida a Cuenta Maestra exitosamente');
      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error promoting to master:', error);
      alert('Error al promover a cuenta maestra');
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'casa':
        return <Home className="w-5 h-5" />;
      case 'negocio':
        return <Store className="w-5 h-5" />;
      case 'sucursal':
        return <Building className="w-5 h-5" />;
      case 'oficina':
        return <Building2 className="w-5 h-5" />;
      case 'bodega':
        return <Warehouse className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getLocationTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      casa: 'bg-blue-100 text-blue-800',
      negocio: 'bg-green-100 text-green-800',
      sucursal: 'bg-purple-100 text-purple-800',
      oficina: 'bg-orange-100 text-orange-800',
      bodega: 'bg-gray-100 text-gray-800',
      otro: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              {isMasterAccount ? <Star className="w-6 h-6 text-white" /> : <Users className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {isMasterAccount ? 'Cuenta Maestra' : 'Gestión de Servicios'}
                {isMasterAccount && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                    MASTER
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {isMasterAccount
                  ? 'Esta cuenta consolida la facturación de múltiples ubicaciones'
                  : 'Administra las ubicaciones de servicio del cliente'
                }
              </p>
            </div>
          </div>

          {!isMasterAccount && serviceCount >= 2 && (
            <button
              onClick={handlePromoteToMaster}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium text-sm"
            >
              <Star className="w-4 h-4" />
              Promover a Maestra
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium">Ubicaciones</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{locations.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {locations.filter(l => l.is_primary).length} principal
            </p>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Servicios Activos</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{serviceCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {locations.filter(l => l.status === 'active').length} activas
            </p>
          </div>

          <div className="bg-white rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <LinkIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Relaciones</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{relationships.length}</p>
            <p className="text-xs text-gray-500 mt-1">cuentas vinculadas</p>
          </div>
        </div>

        {!isMasterAccount && serviceCount < 2 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Se requieren 2 o más servicios para cuenta maestra
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Agregue más ubicaciones de servicio para habilitar la consolidación de facturación
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Ubicaciones de Servicio
        </h4>
        <button
          onClick={() => setShowAddLocation(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Ubicación
        </button>
      </div>

      {showAddLocation && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-gray-900">Nueva Ubicación</h5>
            <button
              onClick={() => setShowAddLocation(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Nombre de Ubicación *
              </label>
              <input
                type="text"
                value={newLocation.location_name}
                onChange={(e) => setNewLocation({ ...newLocation, location_name: e.target.value })}
                placeholder="Ej: Casa Principal, Sucursal Centro"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo *</label>
              <select
                value={newLocation.location_type}
                onChange={(e) => setNewLocation({ ...newLocation, location_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="casa">Casa</option>
                <option value="negocio">Negocio</option>
                <option value="sucursal">Sucursal</option>
                <option value="oficina">Oficina</option>
                <option value="bodega">Bodega</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Dirección *</label>
              <input
                type="text"
                value={newLocation.street_address}
                onChange={(e) => setNewLocation({ ...newLocation, street_address: e.target.value })}
                placeholder="Calle y número"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Colonia</label>
              <input
                type="text"
                value={newLocation.neighborhood}
                onChange={(e) => setNewLocation({ ...newLocation, neighborhood: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ciudad *</label>
              <input
                type="text"
                value={newLocation.city}
                onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Estado *</label>
              <input
                type="text"
                value={newLocation.state}
                onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Código Postal</label>
              <input
                type="text"
                value={newLocation.postal_code}
                onChange={(e) => setNewLocation({ ...newLocation, postal_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Contacto en Ubicación</label>
              <input
                type="text"
                value={newLocation.contact_name}
                onChange={(e) => setNewLocation({ ...newLocation, contact_name: e.target.value })}
                placeholder="Nombre del contacto"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Teléfono</label>
              <input
                type="tel"
                value={newLocation.contact_phone}
                onChange={(e) => setNewLocation({ ...newLocation, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={newLocation.contact_email}
                onChange={(e) => setNewLocation({ ...newLocation, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Instrucciones de Acceso
              </label>
              <textarea
                value={newLocation.access_instructions}
                onChange={(e) => setNewLocation({ ...newLocation, access_instructions: e.target.value })}
                rows={2}
                placeholder="Ej: Portón azul, tocar timbre, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Notas</label>
              <textarea
                value={newLocation.notes}
                onChange={(e) => setNewLocation({ ...newLocation, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newLocation.is_primary}
                  onChange={(e) => setNewLocation({ ...newLocation, is_primary: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Marcar como ubicación principal
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAddLocation(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddLocation}
              disabled={!newLocation.location_name || !newLocation.street_address || !newLocation.city || !newLocation.state}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar Ubicación
            </button>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay ubicaciones registradas</p>
          <p className="text-gray-500 text-sm mt-2">
            Agregue ubicaciones para gestionar múltiples servicios
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map((location, index) => (
            <div
              key={location.id}
              className={`bg-white rounded-xl p-5 border-2 transition-all hover:shadow-md ${
                location.is_primary
                  ? 'border-blue-400 bg-blue-50/50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    location.is_primary ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    {getLocationIcon(location.location_type)}
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold text-gray-900">{location.location_name}</h5>
                      {location.is_primary && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {index === 0 && isMasterAccount && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                          MAESTRA
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getLocationTypeColor(location.location_type)}`}>
                      {getLocationIcon(location.location_type)}
                      {location.location_type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteLocation(location.id)}
                  className="p-1 hover:bg-red-50 rounded-lg transition-colors group"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{location.street_address}</p>
                    {location.neighborhood && (
                      <p className="text-gray-600">{location.neighborhood}</p>
                    )}
                    <p className="text-gray-600">
                      {location.city}, {location.state}
                      {location.postal_code && ` ${location.postal_code}`}
                    </p>
                  </div>
                </div>

                {location.contact_name && (
                  <div className="flex items-center gap-2 text-gray-600 pt-2 border-t border-gray-200">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{location.contact_name}</p>
                      <div className="flex gap-3 text-xs mt-1">
                        {location.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {location.contact_phone}
                          </span>
                        )}
                        {location.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {location.contact_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {location.access_instructions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
                    <div className="flex items-start gap-2">
                      <Navigation className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-yellow-800">{location.access_instructions}</p>
                    </div>
                  </div>
                )}

                {location.notes && (
                  <div className="text-xs text-gray-500 italic pt-2 border-t border-gray-200">
                    {location.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    location.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {location.status === 'active' ? 'Activa' : location.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {location.service_orders_count} servicios realizados
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isMasterAccount && consolidatedAccounts.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              Cuentas Consolidadas ({consolidatedAccounts.length})
            </h4>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              Facturación unificada
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {consolidatedAccounts.map(account => (
              <div
                key={account.id}
                className="bg-white rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-900 mb-1">{account.name}</h5>

                    {account.branch_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Building className="w-4 h-4 text-purple-600" />
                        <span>{account.branch_name}</span>
                        {account.is_single_branch && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            Única
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 font-mono">
                      Cuenta #{account.account_number}
                    </p>
                  </div>

                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold whitespace-nowrap">
                    Consolidada
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    account.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.status === 'active' ? 'Activa' : account.status}
                  </span>

                  <span className="text-xs text-gray-500">
                    Desde {new Date(account.created_at).toLocaleDateString('es-MX')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> Estas cuentas no generan facturas individuales.
              Toda la facturación se consolida en esta cuenta maestra.
            </p>
          </div>
        </div>
      )}

      {isMasterAccount && consolidatedAccounts.length === 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300">
          <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No hay cuentas consolidadas vinculadas</p>
          <p className="text-gray-500 text-sm mt-1">
            Las cuentas consolidadas se crean desde el formulario de nuevo cliente
          </p>
        </div>
      )}
    </div>
  );
}
