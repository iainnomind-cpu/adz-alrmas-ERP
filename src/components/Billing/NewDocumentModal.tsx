import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    X, FileText, DollarSign, Search, Package, Plus, Trash2,
    AlertCircle, Loader2, AlertTriangle, Clock, CreditCard
} from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { useIvaRate, splitNetAmount, round2, formatPercent } from '../../lib/tax';
import { describeSupabaseError, isDuplicateError } from '../../lib/supabaseErrors';
// Los documentos creados a mano (sin orden de servicio) llevan folio APP-0001, APP-0002...
import { getNextAppFolio } from '../../lib/folios';


const VISIT_TYPES = [
    'Visita técnica',
    'Cambio de batería',
    'Mantenimiento',
    'Revisión / diagnóstico',
    'Instalación',
    'Otro'
];

// Grupos del inventario que se pueden agregar a un documento
const ITEM_GROUPS: { key: string; label: string; categories: string[] }[] = [
    { key: 'all', label: 'Todos', categories: [] },
    { key: 'materiales', label: 'Materiales de instalación', categories: ['material', 'accesorio'] },
    { key: 'dispositivos', label: 'Dispositivos', categories: ['dispositivo', 'sensor'] },
    { key: 'servicios', label: 'Servicios de monitoreo', categories: ['servicio'] },
    { key: 'tecnicos', label: 'Servicios técnicos', categories: ['mano_obra'] }
];

interface CatalogItem {
    id: string;
    code: string;
    name: string;
    category: string;
    base_price_mxn: number | null;
    price_with_tax_mxn: number | null;
    has_tax: boolean | null;
    tax_rate: number | null;
}

interface DocumentLine {
    id: string;
    code: string;
    name: string;
    quantity: number;
    /** Precio unitario neto (IVA incluido) */
    unit_price: number;
}

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
        visit_type: '',
        net_amount: 0, // Precio neto, IVA incluido
        discount: 0,
        payment_status: 'pending' // Default pending
    });

    // Productos y servicios del inventario
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [itemSearch, setItemSearch] = useState('');
    const [itemGroup, setItemGroup] = useState('all');
    const [lines, setLines] = useState<DocumentLine[]>([]);

    // Se captura el precio NETO (IVA incluido) y el sistema hace el desglose.
    // Ejemplo: 350 neto → subtotal 301.72, IVA 48.28.
    const { percent: ivaPercent, rate: ivaRate } = useIvaRate();
    const linesTotal = round2(lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0));
    const netAmount = lines.length > 0 ? linesTotal : formData.net_amount;
    const total = Math.max(0, round2(netAmount - formData.discount));
    const { subtotal, tax } = splitNetAmount(total, ivaRate);

    const netPriceOf = (item: CatalogItem): number => {
        const withTax = Number(item.price_with_tax_mxn) || 0;
        if (withTax > 0) return round2(withTax);
        const base = Number(item.base_price_mxn) || 0;
        const itemRate = item.has_tax === false ? 0 : (Number(item.tax_rate) > 0 ? Number(item.tax_rate) / 100 : ivaRate);
        return round2(base * (1 + itemRate));
    };

    const addLine = (item: CatalogItem) => {
        setLines(prev => {
            const existing = prev.find(l => l.id === item.id);
            if (existing) {
                return prev.map(l => l.id === item.id ? { ...l, quantity: l.quantity + 1 } : l);
            }
            return [...prev, { id: item.id, code: item.code, name: item.name, quantity: 1, unit_price: netPriceOf(item) }];
        });
    };

    const updateLine = (id: string, changes: Partial<DocumentLine>) => {
        setLines(prev => prev.map(l => l.id === id ? { ...l, ...changes } : l));
    };

    const removeLine = (id: string) => {
        setLines(prev => prev.filter(l => l.id !== id));
    };

    const filteredCatalog = catalog.filter(item => {
        const group = ITEM_GROUPS.find(g => g.key === itemGroup);
        if (group && group.categories.length > 0 && !group.categories.includes(item.category)) return false;
        const term = itemSearch.trim().toLowerCase();
        if (!term) return true;
        return item.name.toLowerCase().includes(term) || (item.code || '').toLowerCase().includes(term);
    }).slice(0, 30);

    useEffect(() => {
        // Reset state when modal opens
        if (isOpen) {
            setFormData({
                folio: '',
                document_type: 'ticket_remision',
                issue_date: new Date().toISOString().split('T')[0],
                due_date: new Date().toISOString().split('T')[0],
                concept: '',
                description: '',
                visit_type: '',
                net_amount: 0,
                discount: 0,
                payment_status: 'pending'
            });
            setLines([]);
            setItemSearch('');
            setItemGroup('all');

            // Folio consecutivo APP-0001, APP-0002...
            getNextAppFolio()
                .then(folio => setFormData(prev => ({ ...prev, folio })))
                .catch(err => console.error('Error obteniendo folio APP:', err));

            // Catálogo de productos y servicios
            (supabase.from('price_list') as any)
                .select('id, code, name, category, base_price_mxn, price_with_tax_mxn, has_tax, tax_rate')
                .eq('is_active', true)
                .order('name')
                .then(({ data, error }: { data: CatalogItem[] | null; error: unknown }) => {
                    if (error) console.error('Error cargando inventario:', error);
                    setCatalog(data || []);
                });
            setSelectedCustomer(null);
            setSearchTerm('');
            setCustomers([]);
            setError(null);
            setPendingDebts([]);
        }
    }, [isOpen]);

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
        if (total <= 0 && lines.length === 0) {
            setError('Capture el precio neto o agregue al menos un producto o servicio');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // El detalle de productos y el tipo de visita se guardan en la descripción
            const descriptionParts: string[] = [];
            if (formData.visit_type) descriptionParts.push(`Tipo de visita: ${formData.visit_type}`);
            if (lines.length > 0) {
                descriptionParts.push(
                    lines.map(l => `${l.quantity} x ${l.name}${l.code ? ` [${l.code}]` : ''} — $${round2(l.quantity * l.unit_price).toFixed(2)}`).join('\n')
                );
            }
            if (formData.description.trim()) descriptionParts.push(formData.description.trim());

            const concept = formData.concept.trim()
                || formData.visit_type
                || lines.map(l => l.name).join(', ').slice(0, 200);

            let folio = formData.folio || await getNextAppFolio();
            let insertError: any = null;

            // Si alguien más tomó el folio mientras se llenaba el formulario, se pide el siguiente
            for (let attempt = 0; attempt < 3; attempt++) {
                const result = await supabase
                    .from('billing_documents')
                    .insert([{
                        customer_id: selectedCustomer.id,
                        folio,
                        document_type: formData.document_type,
                        issue_date: formData.issue_date,
                        due_date: formData.due_date,
                        concept,
                        description: descriptionParts.join('\n\n'),
                        subtotal,
                        tax,
                        discount: formData.discount,
                        total,
                        payment_status: formData.payment_status,
                        balance: total // Assuming simplified creation where balance = total initially for pending
                    }] as any);
                insertError = result.error;
                if (!isDuplicateError(insertError)) break;
                folio = await getNextAppFolio();
            }

            if (insertError) throw insertError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating document:', err);
            setError(describeSupabaseError(err, 'Error al crear el documento'));
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Folio</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.folio || 'Generando...'}
                                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg font-mono font-semibold text-gray-700 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500 mt-1">Consecutivo automático para documentos sin orden de servicio.</p>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Visita</label>
                            <select
                                value={formData.visit_type}
                                onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Sin especificar</option>
                                {VISIT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                            <input
                                type="text"
                                value={formData.concept}
                                onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                                placeholder="Si se deja vacío se usa el tipo de visita o los productos"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Productos y servicios del inventario */}
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            Productos y Servicios del Inventario
                        </h3>

                        <div className="flex flex-wrap gap-2">
                            {ITEM_GROUPS.map(group => (
                                <button
                                    key={group.key}
                                    type="button"
                                    onClick={() => setItemGroup(group.key)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${itemGroup === group.key
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {group.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                placeholder="Buscar por nombre o código..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>

                        <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                            {filteredCatalog.length === 0 ? (
                                <p className="text-sm text-gray-500 p-3">
                                    {catalog.length === 0 ? 'No hay productos activos en el inventario.' : 'Sin resultados.'}
                                </p>
                            ) : filteredCatalog.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => addLine(item)}
                                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-blue-50"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-sm font-medium text-gray-900 truncate">{item.name}</span>
                                        <span className="block text-xs text-gray-500">{item.code}</span>
                                    </span>
                                    <span className="flex items-center gap-2 flex-shrink-0 text-sm font-semibold text-gray-700">
                                        ${netPriceOf(item).toFixed(2)}
                                        <Plus className="w-4 h-4 text-blue-600" />
                                    </span>
                                </button>
                            ))}
                        </div>

                        {lines.length > 0 && (
                            <div className="space-y-2">
                                {lines.map(line => (
                                    <div key={line.id} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="flex-1 min-w-[10rem] text-sm font-medium text-gray-900">{line.name}</span>
                                        <label className="flex items-center gap-1 text-xs text-gray-500">
                                            Cant.
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(line.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                            />
                                        </label>
                                        <label className="flex items-center gap-1 text-xs text-gray-500">
                                            Neto $
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                                            />
                                        </label>
                                        <span className="w-24 text-right text-sm font-semibold text-gray-900">
                                            ${round2(line.quantity * line.unit_price).toFixed(2)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeLine(line.id)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            title="Quitar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Detalles Financieros
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Neto (IVA incluido) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        readOnly={lines.length > 0}
                                        value={lines.length > 0 ? linesTotal : formData.net_amount}
                                        onChange={(e) => setFormData({ ...formData, net_amount: parseFloat(e.target.value) || 0 })}
                                        className={`w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${lines.length > 0 ? 'bg-gray-100 text-gray-600' : ''}`}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {lines.length > 0
                                        ? 'Suma de los productos y servicios agregados.'
                                        : 'Capture el precio final que paga el cliente; el IVA se desglosa solo.'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.discount}
                                        onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-red-600"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-200 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>IVA ({formatPercent(ivaPercent)}%):</span>
                                <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-1">
                                <span className="text-gray-600">Total a Pagar:</span>
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
