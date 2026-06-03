import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    X, FileText, DollarSign, Search,
    AlertCircle, Loader2, AlertTriangle, Clock, CreditCard
} from 'lucide-react';
import type { Database } from '../../lib/database.types';

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
        subtotal: 0,
        tax_rate: 0.16, // Default 16%
        tax: 0,
        discount: 0,
        payment_status: 'pending' // Default pending
    });

    // Derived Total
    const total = formData.subtotal + (formData.subtotal > 0 ? formData.tax : 0) - formData.discount;

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
                subtotal: 0,
                tax_rate: 0.16,
                tax: 0,
                discount: 0,
                payment_status: 'pending'
            });
            setSelectedCustomer(null);
            setSearchTerm('');
            setCustomers([]);
            setError(null);
            setPendingDebts([]);
        }
    }, [isOpen]);

    // Recalculate tax when subtotal or rate changes
    useEffect(() => {
        const calculatedTax = formData.subtotal * formData.tax_rate;
        setFormData(prev => ({ ...prev, tax: calculatedTax }));
    }, [formData.subtotal, formData.tax_rate]);

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
            const { error: insertError } = await supabase
                .from('billing_documents')
                .insert([{
                    customer_id: selectedCustomer.id,
                    folio: formData.folio,
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Folio *</label>
                            <input
                                type="text"
                                required
                                value={formData.folio}
                                onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                                placeholder="Ej. A-001"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
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
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            Detalles Financieros
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={formData.subtotal}
                                        onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    IVA ({formData.tax_rate * 100}%)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.tax}
                                        onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
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

                        <div className="flex justify-end pt-2 border-t border-gray-200">
                            <div className="text-right">
                                <span className="text-gray-600 mr-2">Total a Pagar:</span>
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
