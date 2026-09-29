import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    X, FileText, DollarSign, Search,
    AlertCircle, Loader2, AlertTriangle, Clock, CreditCard,
    Package, Shield, Activity, Wrench, Car, Sparkles
} from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { useTaxRate } from '../../hooks/useTaxRate';

interface PendingDebt {
    id: string;
    folio: string;
    document_type: string;
    concept: string | null;
    total: number;
    balance: number;
    payment_status: string;
    issue_date: string;
    due_date: string | null;
}

type Customer = Database['public']['Tables']['customers']['Row'];

interface NewDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function NewDocumentModal({ isOpen, onClose, onSuccess }: NewDocumentModalProps) {
    const { taxRate, taxDecimal, taxMultiplier, calculateSubtotalFromNet, calculateTaxFromNet } = useTaxRate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Customer Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const [showResults, setShowResults] = useState(false);

    // Pending Debts State
    const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([]);
    const [loadingDebts, setLoadingDebts] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        folio: '',
        document_type: 'ticket_remision',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        concept: '',
        description: '',
        net_price: 0, // Precio neto con IVA incluido
        subtotal: 0,  // Precio neto ÷ (1 + tax_rate)
        tax_rate: taxDecimal, // Dinámico según configuración
        tax: 0,       // Precio neto − Subtotal
        discount: 0,
        payment_status: 'pending' // Default pending
    });

    // Inventory & Catalog State
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [loadingFolio, setLoadingFolio] = useState(false);

    // Derived Total (exactamente igual al precio neto capturado menos descuento)
    const total = Number(Math.max(0, (formData.net_price || (formData.subtotal + formData.tax)) - (formData.discount || 0)).toFixed(2));

    // Generador de folio consecutivo automático con prefijo APP-XXXX
    const getNextAppFolio = async (): Promise<string> => {
        try {
            const { data } = await supabase
                .from('billing_documents')
                .select('folio')
                .ilike('folio', 'APP%');

            let maxNumber = 0;
            if (data && data.length > 0) {
                for (const item of data) {
                    if (item.folio) {
                        const match = item.folio.match(/^APP[-]?(\d+)/i);
                        if (match && match[1]) {
                            const num = parseInt(match[1], 10);
                            if (!isNaN(num) && num > maxNumber) {
                                maxNumber = num;
                            }
                        }
                    }
                }
            }
            return `APP-${String(maxNumber + 1).padStart(4, '0')}`;
        } catch (e) {
            console.error('Error calculando folio APP consecutivo:', e);
            return 'APP-0001';
        }
    };

    const loadNextFolio = async () => {
        setLoadingFolio(true);
        const nextFolio = await getNextAppFolio();
        setFormData(prev => ({
            ...prev,
            folio: nextFolio
        }));
        setLoadingFolio(false);
    };

    useEffect(() => {
        // Reset state and load inventory when modal opens
        if (isOpen) {
            setFormData({
                folio: '',
                document_type: 'ticket_remision',
                issue_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                concept: '',
                description: '',
                net_price: 0,
                subtotal: 0,
                tax_rate: taxDecimal,
                tax: 0,
                discount: 0,
                payment_status: 'pending'
            });
            setSelectedCustomer(null);
            setSearchTerm('');
            setCustomers([]);
            setError(null);
            setPendingDebts([]);
            loadInventoryItems();
            loadNextFolio();
        }
    }, [isOpen, taxDecimal]);

    const loadInventoryItems = async () => {
        try {
            setLoadingInventory(true);
            const { data, error } = await supabase
                .from('price_list')
                .select('id, code, name, description, brand, model, category, base_price_mxn, price_with_tax_mxn, stock_quantity, is_active')
                .eq('is_active', true)
                .order('name');

            if (!error && data) {
                setInventoryItems(data);
            }
        } catch (err) {
            console.error('Error loading inventory items:', err);
        } finally {
            setLoadingInventory(false);
        }
    };

    // 1. Materiales de Instalación disponibles en inventario
    const installationMaterials = useMemo(() => {
        return inventoryItems.filter(item => {
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return ['material', 'materiales', 'accesorio', 'accesorios', 'consumible', 'insumo'].includes(cat) ||
                   (name.includes('cable') || name.includes('conector') || name.includes('tubo') || name.includes('cinta') || name.includes('taquete') || name.includes('tornillo') || name.includes('fuente') || name.includes('gabinete') || name.includes('bater'));
        });
    }, [inventoryItems]);

    // 2. Dispositivos disponibles en inventario
    const devices = useMemo(() => {
        return inventoryItems.filter(item => {
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return ['dispositivo', 'dispositivos', 'sensor', 'sensores', 'panel', 'paneles', 'alarm', 'alarma', 'teclado', 'sirena', 'camera', 'camara', 'comunicador', 'device', 'equipo', 'equipos'].includes(cat) ||
                   (name.includes('panel') || name.includes('sensor') || name.includes('sirena') || name.includes('teclado') || name.includes('cámara') || name.includes('camara') || name.includes('dvr') || name.includes('nvr') || name.includes('transmisor') || name.includes('control') || name.includes('chapa') || name.includes('foco') || name.includes('estrob'));
        });
    }, [inventoryItems]);

    // 3. Servicios de Monitoreo disponibles en inventario
    const monitoringServices = useMemo(() => {
        return inventoryItems.filter(item => {
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return ['monitoreo', 'monitoring', 'anualidad', 'mensualidad', 'servicio_monitoreo'].includes(cat) ||
                   (name.includes('monitoreo') || name.includes('anualidad') || name.includes('mensualidad') || name.includes('app alarma') || name.includes('vigilancia'));
        });
    }, [inventoryItems]);

    // 4. Servicios Técnicos disponibles en inventario
    const technicalServices = useMemo(() => {
        return inventoryItems.filter(item => {
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return (['servicio', 'servicios', 'service', 'services', 'servicio_tecnico', 'mano_obra', 'labor', 'mantenimiento', 'soporte', 'reparacion'].includes(cat) ||
                   (name.includes('servicio') || name.includes('mantenimiento') || name.includes('instalaci') || name.includes('mano de obra') || name.includes('soporte') || name.includes('revisi') || name.includes('programaci') || name.includes('configuraci'))) &&
                   !name.includes('monitoreo') && !name.includes('anualidad');
        });
    }, [inventoryItems]);

    // 5. Tipos de Visita disponibles (inventario y catálogo de tarifas)
    const visitTypes = useMemo(() => {
        const inventoryVisits = inventoryItems.filter(item => {
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return cat === 'visita' || cat === 'visit' || name.includes('visita');
        }).map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || 'Visita técnica registrada en inventario',
            price: Number(item.base_price_mxn) || Number(item.price) || 0
        }));

        const standardVisits = [
            {
                id: 'visit_express_30',
                name: 'Visita Express 3.0 (hasta 30 min)',
                description: 'Atención y revisión técnica rápida de hasta 30 minutos',
                price: 140
            },
            {
                id: 'visit_express_60',
                name: 'Visita Express 6.0 (hasta 60 min)',
                description: 'Atención técnica general de hasta 60 minutos',
                price: 280
            },
            {
                id: 'visit_diagnostico',
                name: 'Visita Técnica de Diagnóstico',
                description: 'Revisión general en sitio, detección de fallas y reporte técnico',
                price: 280
            },
            {
                id: 'visit_mantenimiento',
                name: 'Visita de Mantenimiento Preventivo',
                description: 'Limpieza, pruebas de comunicación, calibración de sensores y verificación de baterías',
                price: 350
            },
            {
                id: 'visit_reubicacion',
                name: 'Visita de Reubicación / Instalación de Equipos',
                description: 'Desmontaje, cableado y reinstalación de dispositivos en sitio',
                price: 450
            }
        ];

        const names = new Set(inventoryVisits.map(v => v.name.toLowerCase()));
        const combined = [...inventoryVisits];
        for (const v of standardVisits) {
            if (!names.has(v.name.toLowerCase())) {
                combined.push(v);
            }
        }
        return combined;
    }, [inventoryItems]);

    // Actualización de precio neto y cálculo automático de Subtotal e IVA
    const handleNetPriceChange = (netValue: number) => {
        const net = Math.max(0, netValue);
        const subtotal = calculateSubtotalFromNet(net);
        const tax = calculateTaxFromNet(net);

        setFormData(prev => ({
            ...prev,
            net_price: net,
            subtotal: subtotal,
            tax: tax,
            tax_rate: taxDecimal
        }));
    };

    // Selección automática y actualización del formulario con precio neto
    const handleSelectProductOrService = (item: any, isVisitType: boolean = false) => {
        const rawPrice = isVisitType
            ? (Number(item.price) || 0)
            : (Number(item.price_with_tax_mxn) || Number(item.base_price_mxn) || Number(item.price) || 0);

        const netPrice = Math.max(0, rawPrice);
        const subtotal = calculateSubtotalFromNet(netPrice);
        const tax = calculateTaxFromNet(netPrice);

        const description = item.description ||
            (!isVisitType && (item.brand || item.model) ? `${item.brand || ''} ${item.model || ''}`.trim() : '');

        setFormData(prev => ({
            ...prev,
            concept: item.name || prev.concept,
            description: description || prev.description,
            net_price: netPrice > 0 ? netPrice : prev.net_price,
            subtotal: netPrice > 0 ? subtotal : prev.subtotal,
            tax: netPrice > 0 ? tax : prev.tax,
            tax_rate: taxDecimal
        }));
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setSelectedCustomer(null); // Clear selection if typing

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearching(true);
        setShowResults(true);

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                let query = supabase
                    .from('customers')
                    .select('*')
                    .limit(10); // Show top 10 by default

                if (term) {
                    query = query.or(`name.ilike.%${term}%,business_name.ilike.%${term}%,phone.ilike.%${term}%`);
                } else {
                    query = query.order('created_at', { ascending: false });
                }

                const { data, error } = await query;

                if (error) throw error;
                setCustomers(data || []);
            } catch (err) {
                console.error('Error searching customers:', err);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const loadPendingDebts = async (customerId: string) => {
        setLoadingDebts(true);
        try {
            const { data, error } = await supabase
                .from('billing_documents')
                .select('id, folio, document_type, concept, total, balance, payment_status, issue_date, due_date')
                .eq('customer_id', customerId)
                .in('payment_status', ['pending', 'partial', 'overdue'])
                .order('due_date', { ascending: true });
            if (error) throw error;
            setPendingDebts((data as PendingDebt[]) || []);
        } catch (err) {
            console.error('Error loading pending debts:', err);
            setPendingDebts([]);
        } finally {
            setLoadingDebts(false);
        }
    };

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSearchTerm(customer.business_name || customer.name);
        setShowResults(false);
        setPendingDebts([]);
        loadPendingDebts(customer.id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) {
            setError('Por favor seleccione un cliente');
            return;
        }
        if (!formData.folio) {
            setError('Por favor ingrese un folio');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let finalFolio = formData.folio.trim();
            if (!finalFolio || finalFolio.toUpperCase().startsWith('APP')) {
                // Verificar si el folio actual ya existe en BD para evitar duplicados concurrentes
                const { data: existingWithFolio } = await supabase
                    .from('billing_documents')
                    .select('folio')
                    .ilike('folio', 'APP%');

                const isDuplicate = existingWithFolio?.some(
                    d => d.folio?.trim().toUpperCase() === finalFolio.toUpperCase()
                );

                if (isDuplicate || !finalFolio) {
                    let maxNum = 0;
                    if (existingWithFolio && existingWithFolio.length > 0) {
                        for (const item of existingWithFolio) {
                            if (item.folio) {
                                const match = item.folio.match(/^APP[-]?(\d+)/i);
                                if (match && match[1]) {
                                    const n = parseInt(match[1], 10);
                                    if (!isNaN(n) && n > maxNum) maxNum = n;
                                }
                            }
                        }
                    }
                    finalFolio = `APP-${String(maxNum + 1).padStart(4, '0')}`;
                }
            }

            const { error: insertError } = await supabase
                .from('billing_documents')
                .insert([{
                    customer_id: selectedCustomer.id,
                    folio: finalFolio,
                    document_type: formData.document_type,
                    issue_date: formData.issue_date,
                    due_date: formData.due_date,
                    concept: formData.concept,
                    description: formData.description,
                    subtotal: formData.subtotal,
                    tax: formData.tax,
                    discount: formData.discount,
                    total: total,
                    payment_status: formData.payment_status,
                    balance: total // Assuming simplified creation where balance = total initially for pending
                }] as any);

            if (insertError) throw insertError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating document:', err);
            setError(err.message || 'Error al crear el documento');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Nuevo Documento
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {/* Customer Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => {
                                    setShowResults(true);
                                    if (customers.length === 0) handleSearch('');
                                }}
                                placeholder="Buscar cliente..."
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${selectedCustomer ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            {searching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4 animate-spin" />
                            )}
                        </div>

                        {showResults && customers.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {customers.map(customer => (
                                    <button
                                        key={customer.id}
                                        type="button"
                                        onClick={() => handleSelectCustomer(customer)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                                    >
                                        <div className="font-medium text-gray-900">{customer.business_name || customer.name}</div>
                                        <div className="text-sm text-gray-500">{customer.phone} • {customer.email}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Debts Panel */}
                    {selectedCustomer && (loadingDebts ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando deudas pendientes...
                        </div>
                    ) : pendingDebts.length > 0 ? (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <span className="font-semibold text-amber-800">
                                    ⚠️ Este cliente tiene {pendingDebts.length} cargo{pendingDebts.length !== 1 ? 's' : ''} pendiente{pendingDebts.length !== 1 ? 's' : ''} sin cobrar
                                </span>
                            </div>
                            <div className="space-y-2 mb-3">
                                {pendingDebts.map(debt => {
                                    const isOverdue = debt.payment_status === 'overdue';
                                    const isPartial = debt.payment_status === 'partial';
                                    return (
                                        <div
                                            key={debt.id}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                                                isOverdue ? 'bg-red-100 border border-red-200' :
                                                isPartial ? 'bg-yellow-100 border border-yellow-200' :
                                                'bg-blue-50 border border-blue-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isOverdue ? (
                                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                                                ) : isPartial ? (
                                                    <CreditCard className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                                                ) : (
                                                    <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                )}
                                                <span className={`font-semibold ${
                                                    isOverdue ? 'text-red-700' : isPartial ? 'text-yellow-700' : 'text-blue-700'
                                                }`}>{debt.folio}</span>
                                                <span className="text-gray-600 truncate">{debt.concept || debt.document_type}</span>
                                                {debt.due_date && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                                        isOverdue ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'
                                                    }`}>
                                                        {isOverdue ? `Vencido: ` : `Vence: `}
                                                        {new Date(debt.due_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-2">
                                                <span className={`font-bold ${
                                                    isOverdue ? 'text-red-700' : isPartial ? 'text-yellow-700' : 'text-blue-700'
                                                }`}>${debt.balance.toFixed(2)}</span>
                                                {isPartial && (
                                                    <div className="text-xs text-gray-500">de ${debt.total.toFixed(2)}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-amber-300">
                                <span className="text-sm font-medium text-amber-800">Total pendiente por cobrar:</span>
                                <span className="text-lg font-bold text-amber-900">
                                    ${pendingDebts.reduce((sum, d) => sum + (d.balance || 0), 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <AlertCircle className="w-4 h-4 text-green-600" />
                            ✅ Sin deudas pendientes — cliente al corriente
                        </div>
                    ))}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                            <select
                                value={formData.document_type}
                                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ticket_remision">Ticket Remisión</option>
                                <option value="ticket_remision_foraneo">Ticket Remisión Foráneo</option>
                                <option value="ticket_whatsapp">Ticket WhatsApp</option>
                                <option value="ticket_contado">Ticket Contado</option>
                                <option value="factura_credito_local">Factura Crédito Local</option>
                                <option value="factura_credito_foraneo">Factura Crédito Foráneo</option>
                                <option value="factura_credito_maestra">Factura Crédito Maestra</option>
                                <option value="factura_credito_corporativa">Factura Crédito Corporativa</option>
                                <option value="anualidad">Anualidad</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Folio *</label>
                                <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                                    Prefijo APP (4 dígitos)
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.folio}
                                    onChange={(e) => setFormData({ ...formData, folio: e.target.value.toUpperCase() })}
                                    placeholder="APP-0001"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900 tracking-wide uppercase"
                                />
                                {loadingFolio && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Consecutivo automático con formato APP-0001, APP-0002...
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión *</label>
                            <input
                                type="date"
                                required
                                value={formData.issue_date}
                                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento *</label>
                            <input
                                type="date"
                                required
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Selectores dinámicos del Inventario y Servicios */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-semibold text-gray-800">
                                    Cargar desde Inventario y Servicios
                                </span>
                            </div>
                            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                                Asigna automáticamente Concepto, Descripción y Precio
                            </span>
                        </div>

                        {loadingInventory ? (
                            <div className="flex items-center justify-center py-4 text-xs text-gray-500 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                Cargando catálogo del inventario...
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* 1. Materiales de instalación */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-amber-600" />
                                        Materiales de Instalación
                                        <span className="text-gray-400 font-normal">({installationMaterials.length})</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const item = installationMaterials.find(i => i.id === e.target.value);
                                            if (item) handleSelectProductOrService(item, false);
                                            e.target.value = "";
                                        }}
                                        defaultValue=""
                                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    >
                                        <option value="" disabled>-- Seleccionar material --</option>
                                        {installationMaterials.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} {item.code ? `[${item.code}]` : ''} - ${(Number(item.base_price_mxn) || Number(item.price) || 0).toFixed(2)} (Stock: {item.stock_quantity ?? 0})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. Dispositivos */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-blue-600" />
                                        Dispositivos
                                        <span className="text-gray-400 font-normal">({devices.length})</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const item = devices.find(i => i.id === e.target.value);
                                            if (item) handleSelectProductOrService(item, false);
                                            e.target.value = "";
                                        }}
                                        defaultValue=""
                                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    >
                                        <option value="" disabled>-- Seleccionar dispositivo --</option>
                                        {devices.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} {item.code ? `[${item.code}]` : ''} - ${(Number(item.base_price_mxn) || Number(item.price) || 0).toFixed(2)} (Stock: {item.stock_quantity ?? 0})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Servicios de monitoreo */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                                        Servicios de Monitoreo
                                        <span className="text-gray-400 font-normal">({monitoringServices.length})</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const item = monitoringServices.find(i => i.id === e.target.value);
                                            if (item) handleSelectProductOrService(item, false);
                                            e.target.value = "";
                                        }}
                                        defaultValue=""
                                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    >
                                        <option value="" disabled>-- Seleccionar monitoreo --</option>
                                        {monitoringServices.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} {item.code ? `[${item.code}]` : ''} - ${(Number(item.base_price_mxn) || Number(item.price) || 0).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. Servicios técnicos */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Wrench className="w-3.5 h-3.5 text-purple-600" />
                                        Servicios Técnicos
                                        <span className="text-gray-400 font-normal">({technicalServices.length})</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const item = technicalServices.find(i => i.id === e.target.value);
                                            if (item) handleSelectProductOrService(item, false);
                                            e.target.value = "";
                                        }}
                                        defaultValue=""
                                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    >
                                        <option value="" disabled>-- Seleccionar servicio técnico --</option>
                                        {technicalServices.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} {item.code ? `[${item.code}]` : ''} - ${(Number(item.base_price_mxn) || Number(item.price) || 0).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 5. Tipo de visita */}
                                <div className="sm:col-span-2 lg:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                                        <Car className="w-3.5 h-3.5 text-indigo-600" />
                                        Tipo de Visita
                                        <span className="text-gray-400 font-normal">({visitTypes.length})</span>
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            const item = visitTypes.find(i => i.id === e.target.value);
                                            if (item) handleSelectProductOrService(item, true);
                                            e.target.value = "";
                                        }}
                                        defaultValue=""
                                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                                    >
                                        <option value="" disabled>-- Seleccionar tipo de visita --</option>
                                        {visitTypes.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} - ${item.price.toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                        <input
                            type="text"
                            required
                            value={formData.concept}
                            onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                Detalles Financieros (IVA {taxRate}% Incluido)
                            </h3>
                            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">
                                Captura en Precio Neto
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Precio Neto (IVA Inc.) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={formData.net_price || ''}
                                        placeholder="0.00"
                                        onChange={(e) => handleNetPriceChange(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-7 pr-3 py-2 border-2 border-blue-500 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-gray-900"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Monto final con IVA incluido
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Subtotal (sin IVA)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        readOnly
                                        disabled
                                        value={formData.subtotal}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-700 cursor-not-allowed font-medium"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Calculado: Precio ÷ {taxMultiplier.toFixed(2)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    IVA ({taxRate}%)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        readOnly
                                        disabled
                                        value={formData.tax}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-700 cursor-not-allowed font-medium"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Calculado: Precio − Subtotal
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descuento
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.discount || ''}
                                        placeholder="0.00"
                                        onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-red-600 font-medium"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Descuento aplicable
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-gray-200">
                            <div className="text-xs text-gray-500">
                                Desglose: <span className="font-medium text-gray-700">${formData.subtotal.toFixed(2)}</span> (Subtotal) + <span className="font-medium text-gray-700">${formData.tax.toFixed(2)}</span> (IVA) = <span className="font-semibold text-gray-900">${(formData.net_price || (formData.subtotal + formData.tax)).toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-600 mr-2 text-sm font-medium">Total a Pagar:</span>
                                <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                'Crear Documento'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
