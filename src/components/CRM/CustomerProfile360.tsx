import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  X,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  FileText,
  Shield,
  Wrench,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Star,
  PauseCircle,
  MessageSquare,
  History,
  Eye,
  Plus
} from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { MasterAccountManager } from './MasterAccountManager';
import { CustomerObservations } from './CustomerObservations';
import { CustomerHistory } from './CustomerHistory';
import { SuspensionManager } from './SuspensionManager';
import { DigitalCardsManager } from './DigitalCardsManager';
import { AssetDetailView } from '../Assets/AssetDetailView';

type Customer = Database['public']['Tables']['customers']['Row'];
type Contact = Database['public']['Tables']['customer_contacts']['Row'];
type Equipment = Database['public']['Tables']['customer_equipment']['Row'] & {
  technicians: { full_name: string } | null;
};
type PaymentHistory = Database['public']['Tables']['customer_payment_history']['Row'];
type Subscription = Database['public']['Tables']['customer_monitoring_subscriptions']['Row'] & {
  monitoring_plans: { plan_name: string; price: number } | null;
};
type ServiceOrder = Database['public']['Tables']['service_orders']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Asset = Database['public']['Tables']['assets']['Row'] & {
  technicians: { full_name: string } | null;
};

interface CustomerProfile360Props {
  customerId: string;
  onClose: () => void;
  onEdit?: () => void;
}

export function CustomerProfile360({ customerId, onClose, onEdit }: CustomerProfile360Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCardsCount, setActiveCardsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'contacts' | 'equipment' | 'services' | 'billing' | 'accounts' | 'suspension' | 'observations' | 'history' | 'cards'>('general');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    contact_type: 'Personal',
    is_primary: false
  });

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);


  const loadCustomerData = async () => {
    setLoading(true);

    const [
      customerData,
      contactsData,
      equipmentData,
      assetsData,
      paymentHistoryData,
      subscriptionData,
      serviceOrdersData,
      invoicesData,
      cardsData
    ] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
      supabase.from('customer_contacts').select('*').eq('customer_id', customerId).order('is_primary', { ascending: false }),
      supabase.from('customer_equipment').select('*, technicians:technicians!customer_equipment_installed_by_fkey(full_name)').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('assets').select('*, technicians:technicians!assets_installed_by_fkey(full_name)').eq('customer_id', customerId).order('installation_date', { ascending: false }),
      supabase.from('customer_payment_history').select('*').eq('customer_id', customerId).order('payment_date', { ascending: false }).limit(10),
      supabase.from('customer_monitoring_subscriptions').select('*, monitoring_plans(plan_name, price)').eq('customer_id', customerId).eq('status', 'active').maybeSingle(),
      supabase.from('service_orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(10),
      supabase.from('invoices').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(10),
      supabase.from('customer_digital_cards').select('id, is_active').eq('customer_id', customerId)
    ]);

    if (customerData.data) setCustomer(customerData.data);
    if (contactsData.data) setContacts(contactsData.data);
    if (equipmentData.data) setEquipment(equipmentData.data);
    if (assetsData.data) setAssets(assetsData.data);
    if (paymentHistoryData.data) setPaymentHistory(paymentHistoryData.data);
    if (subscriptionData.data) setSubscription(subscriptionData.data);
    if (serviceOrdersData.data) setServiceOrders(serviceOrdersData.data);
    if (invoicesData.data) setInvoices(invoicesData.data);

    const activeCards = cardsData.data?.filter(c => c.is_active).length || 0;
    setActiveCardsCount(activeCards);

    setLoading(false);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;

    setAddingContact(true);
    try {
      const { error } = await supabase.from('customer_contacts').insert([{
        customer_id: customerId,
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email || null,
        relationship: newContact.relationship || null,
        contact_type: newContact.contact_type,
        is_primary: newContact.is_primary
      }] as any);

      if (error) throw error;

      await loadCustomerData();
      setShowAddContactModal(false);
      setNewContact({
        name: '',
        phone: '',
        email: '',
        relationship: '',
        contact_type: 'Personal',
        is_primary: false
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Error al agregar contacto');
    } finally {
      setAddingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const getPropertyIcon = (type: string) => {
    switch (type) {
      case 'banco': return <Building2 className="w-4 h-4" />;
      case 'casa': return <User className="w-4 h-4" />;
      case 'comercio': return <Building2 className="w-4 h-4" />;
      case 'rancho': return <MapPin className="w-4 h-4" />;
      case 'gobierno': return <Building2 className="w-4 h-4" />;
      case 'pozo': return <MapPin className="w-4 h-4" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  const getCreditBadge = (classification: string) => {
    switch (classification) {
      case 'puntual': return { color: 'bg-green-100 text-green-800', label: 'Puntual' };
      case '15_dias': return { color: 'bg-yellow-100 text-yellow-800', label: '15 Días' };
      case 'moroso': return { color: 'bg-red-100 text-red-800', label: 'Moroso' };
      default: return { color: 'bg-gray-100 text-gray-800', label: classification };
    }
  };

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  const totalAssets = assets.length;
  const activeAssets = assets.filter(a => a.status === 'active').length;
  const eolAssets = assets.filter(a => a.is_eol).length;

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'accounts', label: 'Cuentas y Ubicaciones', icon: Star },
    { id: 'contacts', label: 'Contactos', icon: Users },
    { id: 'equipment', label: 'Equipos', icon: Shield },
    { id: 'services', label: 'Servicios', icon: Wrench },
    { id: 'billing', label: 'Facturación', icon: FileText },
    { id: 'cards', label: 'Tarjetas Digitales', icon: CreditCard },
    { id: 'suspension', label: 'Suspensión', icon: PauseCircle },
    { id: 'observations', label: 'Observaciones', icon: MessageSquare },
    { id: 'history', label: 'Historial', icon: History }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                {getPropertyIcon(customer.property_type)}
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{customer.name}</h2>
                  {activeCardsCount > 0 && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      {activeCardsCount} tarjeta{activeCardsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-blue-100">{customer.business_name || customer.owner_name || 'Sin nombre de negocio'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white flex items-center gap-2"
                  title="Editar Cliente"
                >
                  <Wrench className="w-6 h-6" />
                  <span className="hidden md:inline font-medium">Editar</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-8 max-h-[70vh] overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <CreditCard className="w-5 h-5" />
                      <span className="text-sm font-medium">Clasificación</span>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getCreditBadge(customer.credit_classification).color}`}>
                      {getCreditBadge(customer.credit_classification).label}
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <span className="text-sm font-medium">Total Pagado</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${totalPaid.toFixed(2)}</p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-600 mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">Pendientes</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{pendingInvoices}</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Vencidas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{overdueInvoices}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Información General</h3>

                    {customer.owner_name && (
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Propietario</p>
                          <p className="font-medium text-gray-900">{customer.owner_name}</p>
                        </div>
                      </div>
                    )}

                    {customer.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Teléfono</p>
                          <p className="font-medium text-gray-900">{customer.phone}</p>
                        </div>
                      </div>
                    )}

                    {customer.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{customer.email}</p>
                        </div>
                      </div>
                    )}

                    {customer.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Dirección</p>
                          <p className="font-medium text-gray-900">{customer.address}</p>
                        </div>
                      </div>
                    )}

                    {customer.gps_latitude && customer.gps_longitude && (
                      <div className="flex items-start gap-3">
                        <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Coordenadas GPS</p>
                          <p className="font-medium text-gray-900 font-mono text-sm">
                            {customer.gps_latitude}, {customer.gps_longitude}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Configuración de Cuenta</h3>

                    <div className="space-y-3">
                      {customer.is_master_account && (
                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
                            <p className="font-bold text-yellow-800">Cuenta Maestra</p>
                          </div>
                          <p className="text-xs text-yellow-700">
                            Esta cuenta consolida la facturación de {customer.service_count || 0} servicios
                          </p>
                          {customer.first_service_date && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Cuenta desde: {new Date(customer.first_service_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tipo de Propiedad</p>
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                          {getPropertyIcon(customer.property_type)}
                          {customer.property_type}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tipo de Cuenta</p>
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium capitalize">
                          {customer.account_type}
                          {customer.is_master_account && <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Servicios Activos</p>
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                          {customer.service_count || 0} servicios
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Preferencia de Pago</p>
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize">
                          {customer.billing_preference}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Ciclo de Facturación</p>
                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium capitalize">
                          {customer.billing_cycle}
                        </span>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tecnología de Comunicación</p>
                        <span className="inline-block px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium capitalize">
                          {customer.communication_tech}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {(customer.account_type !== 'normal' || customer.branch_name) && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-purple-600" />
                      Información de Cuenta Especial
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <span className="text-sm text-gray-600 block mb-2">Tipo de Cuenta</span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${customer.account_type === 'master' ? 'bg-yellow-100 text-yellow-800' :
                          customer.account_type === 'consolidated' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {customer.account_type === 'master' ? 'Cuenta Maestra' :
                            customer.account_type === 'consolidated' ? 'Cuenta Consolidada' :
                              'Cuenta Normal'}
                        </span>
                      </div>

                      {customer.branch_name && (
                        <div className="bg-white rounded-lg p-4">
                          <span className="text-sm text-gray-600 block mb-2">Sucursal</span>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-600" />
                            {customer.branch_name}
                            {customer.is_single_branch && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                Única
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {customer.account_type === 'consolidated' && (
                        <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-blue-700 font-medium mb-1">
                                Esta cuenta está consolidada
                              </p>
                              <p className="text-sm text-blue-600">
                                La facturación se realiza a través de la cuenta maestra vinculada.
                                No se generan facturas individuales para esta cuenta.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {customer.account_type === 'master' && (
                        <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Star className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-yellow-700 font-medium mb-1">
                                Cuenta Maestra
                              </p>
                              <p className="text-sm text-yellow-600">
                                Esta cuenta consolida la facturación de múltiples servicios.
                                Revisa la pestaña "Cuentas y Ubicaciones" para ver todas las cuentas vinculadas.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {subscription && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Plan de Monitoreo Activo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Plan</p>
                        <p className="font-semibold text-gray-900">{subscription.monitoring_plans?.plan_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Precio</p>
                        <p className="font-semibold text-gray-900">${subscription.monitoring_plans?.price.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fecha de Renovación</p>
                        <p className="font-semibold text-gray-900">{new Date(subscription.renewal_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'accounts' && (
              <MasterAccountManager
                customerId={customerId}
                isMasterAccount={customer.is_master_account || false}
                serviceCount={customer.service_count || 0}
                onUpdate={loadCustomerData}
              />
            )}

            {activeTab === 'contacts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-lg">Contactos</h3>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Contacto
                  </button>
                </div>
                {contacts.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No hay contactos registrados</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" />
                            <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                          </div>
                          <div className="flex gap-2">
                            {contact.is_primary && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                Principal
                              </span>
                            )}
                            {contact.is_validated && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{contact.phone}</span>
                          </div>
                          {contact.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                          {contact.relationship && (
                            <p className="text-gray-600">
                              <span className="font-medium">Relación:</span> {contact.relationship}
                            </p>
                          )}
                          <p className="text-gray-600">
                            <span className="font-medium">Tipo:</span> {contact.contact_type}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">Total Equipos</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalAssets}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Activos</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{activeAssets}</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">EOL</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{eolAssets}</p>
                    {eolAssets > 0 && (
                      <p className="text-xs text-red-600 mt-1">Requieren reemplazo</p>
                    )}
                  </div>
                </div>

                {assets.length > 0 ? (
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Equipos Instalados
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedAssetId(asset.id)}
                          className={`rounded-xl p-4 border-2 transition-all cursor-pointer group hover:shadow-lg ${asset.is_eol
                            ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300 hover:border-red-400'
                            : asset.status === 'active'
                              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:border-green-400'
                              : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Shield className={`w-5 h-5 ${asset.is_eol ? 'text-red-600' :
                                asset.status === 'active' ? 'text-green-600' :
                                  'text-gray-600'
                                }`} />
                              <h4 className="font-semibold text-gray-900">
                                {asset.alarm_model || asset.keyboard_model || asset.communicator_model || 'Equipo'}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${asset.is_eol
                                ? 'bg-red-100 text-red-800'
                                : asset.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}>
                                {asset.is_eol ? 'EOL' : asset.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                              <Eye className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            {asset.alarm_model && (
                              <div>
                                <p className="text-gray-600 text-xs">Panel</p>
                                <p className="text-gray-900 font-medium">{asset.alarm_model}</p>
                              </div>
                            )}
                            {asset.keyboard_model && (
                              <div>
                                <p className="text-gray-600 text-xs">Teclado</p>
                                <p className="text-gray-900 font-medium">{asset.keyboard_model}</p>
                              </div>
                            )}
                            {asset.communicator_model && (
                              <div>
                                <p className="text-gray-600 text-xs">Comunicador</p>
                                <p className="text-gray-900 font-medium">{asset.communicator_model}</p>
                              </div>
                            )}
                            {asset.serial_number && (
                              <p className="text-gray-600 font-mono text-xs">S/N: {asset.serial_number}</p>
                            )}
                            {asset.installation_date && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>Instalado: {new Date(asset.installation_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {asset.installation_cost !== null && asset.installation_cost !== undefined && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <DollarSign className="w-4 h-4" />
                                <span>Costo: ${asset.installation_cost.toFixed(2)}</span>
                              </div>
                            )}
                            {asset.technicians?.full_name && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <User className="w-4 h-4" />
                                <span className="truncate">Instalador: {asset.technicians.full_name}</span>
                              </div>
                            )}
                            {asset.is_eol && (
                              <div className="flex items-center gap-1 text-red-600 font-semibold mt-2 bg-red-100 rounded px-2 py-1">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">Requiere Reemplazo</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No hay equipos instalados</p>
                    <p className="text-sm text-gray-400 mt-2">Los equipos aparecerán aquí después de completar instalaciones</p>
                  </div>
                )}


              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 text-lg">Historial de Servicios</h3>
                {serviceOrders.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No hay órdenes de servicio registradas</p>
                ) : (
                  <div className="space-y-3">
                    {serviceOrders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">#{order.order_number}</p>
                            <p className="text-sm text-gray-600">{order.description}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          {order.total_cost > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>${order.total_cost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Facturas Recientes</h3>
                  {invoices.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No hay facturas registradas</p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div key={invoice.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">#{invoice.invoice_number}</p>
                              <p className="text-sm text-gray-600 capitalize">{invoice.invoice_type}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">${invoice.total_amount.toFixed(2)}</p>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Vencimiento: {new Date(invoice.due_date).toLocaleDateString()}</span>
                            {invoice.paid_date && (
                              <span>Pagada: {new Date(invoice.paid_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-4">Historial de Pagos</h3>
                  {paymentHistory.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No hay pagos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((payment) => (
                        <div key={payment.id} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{payment.payment_method}</p>
                            {payment.reference && (
                              <p className="text-xs text-gray-500 font-mono">Ref: {payment.reference}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{new Date(payment.payment_date).toLocaleDateString()}</p>
                            <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'suspension' && (
              <div>
                <SuspensionManager
                  customer={customer as any}
                  onUpdate={loadCustomerData}
                />
              </div>
            )}

            {activeTab === 'observations' && (
              <div>
                <CustomerObservations customerId={customerId} />
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <CustomerHistory customerId={customerId} />
              </div>
            )}

            {activeTab === 'cards' && (
              <DigitalCardsManager
                customerId={customerId}
                customerName={customer.name}
                accountNumber={customer.account_number || 0}
                onUpdate={loadCustomerData}
              />
            )}
          </div>
        </div>
      </div >

      {
        selectedAssetId && (
          <AssetDetailView
            assetId={selectedAssetId}
            onClose={() => setSelectedAssetId(null)}
            onUpdate={loadCustomerData}
          />
        )
      }

      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Nuevo Contacto</h3>
              <button
                onClick={() => setShowAddContactModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Teléfono *</label>
                <input
                  type="tel"
                  required
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Relación</label>
                  <input
                    type="text"
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                    placeholder="Ej. Esposo, Hija"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
                  <select
                    value={newContact.contact_type}
                    onChange={(e) => setNewContact({ ...newContact, contact_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Trabajo">Trabajo</option>
                    <option value="Emergencia">Emergencia</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={newContact.is_primary}
                  onChange={(e) => setNewContact({ ...newContact, is_primary: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">
                  Contacto Principal
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingContact}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {addingContact ? 'Guardando...' : 'Guardar Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
