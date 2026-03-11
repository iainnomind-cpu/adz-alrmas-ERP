import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import {
    ClipboardList,
    Check,
    X,
    Clock,
    CheckCircle,
    XCircle,
    User,
    MapPin,
    Plus,
    Package
} from 'lucide-react';
import { MaterialRequestForm } from './MaterialRequestForm';

interface RequestItem {
    id: string;
    product_id: string;
    quantity_requested: number;
    quantity_approved: number | null;
    product_name: string;
    product_code: string;
}

interface MaterialRequest {
    id: string;
    requested_by: string;
    requester_name: string;
    status: string;
    from_location_id: string | null;
    to_location_id: string | null;
    from_location_name: string;
    to_location_name: string;
    notes: string | null;
    admin_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
    items: RequestItem[];
}

export function MaterialRequests() {
    const { user } = useAuth();
    const { isAdmin } = usePermissions();
    const [requests, setRequests] = useState<MaterialRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

    useEffect(() => {
        loadRequests();
    }, [filter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            // Load requests
            let query = (supabase.from('inventory_material_requests') as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data: reqsData } = await query;

            if (!reqsData || reqsData.length === 0) {
                setRequests([]);
                setLoading(false);
                return;
            }

            // Load locations
            const { data: locsData } = await (supabase.from('inventory_locations') as any)
                .select('id, name');
            const locMap: Record<string, string> = {};
            (locsData || []).forEach((l: any) => { locMap[l.id] = l.name; });

            // Load user profiles
            const { data: usersData } = await (supabase.from('user_profiles') as any)
                .select('id, full_name');
            const userMap: Record<string, string> = {};
            (usersData || []).forEach((u: any) => { userMap[u.id] = u.full_name; });

            // Load items for each request
            const reqIds = reqsData.map((r: any) => r.id);
            const { data: itemsData } = await (supabase.from('inventory_material_request_items') as any)
                .select('*, price_list (code, name)')
                .in('request_id', reqIds);

            // Group items by request
            const itemsByReq: Record<string, RequestItem[]> = {};
            (itemsData || []).forEach((item: any) => {
                if (!itemsByReq[item.request_id]) itemsByReq[item.request_id] = [];
                itemsByReq[item.request_id].push({
                    id: item.id,
                    product_id: item.product_id,
                    quantity_requested: item.quantity_requested,
                    quantity_approved: item.quantity_approved,
                    product_name: item.price_list?.name || 'Producto',
                    product_code: item.price_list?.code || '',
                });
            });

            const built: MaterialRequest[] = reqsData.map((r: any) => ({
                ...r,
                requester_name: userMap[r.requested_by] || 'Usuario',
                from_location_name: r.from_location_id ? locMap[r.from_location_id] || '' : '',
                to_location_name: r.to_location_id ? locMap[r.to_location_id] || '' : '',
                items: itemsByReq[r.id] || [],
            }));

            setRequests(built);
        } catch (err) {
            console.error('Error loading requests:', err);
        }
        setLoading(false);
    };

    const handleApprove = async (req: MaterialRequest) => {
        setActionLoading(req.id);
        try {
            // Update request status
            const { error: updateError } = await (supabase.from('inventory_material_requests') as any)
                .update({
                    status: 'approved',
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: adminNotes[req.id] || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', req.id);

            if (updateError) throw new Error(updateError.message);

            // Auto-create transfer transactions for each item
            for (const item of req.items) {
                await (supabase.from('inventory_transactions') as any)
                    .insert({
                        product_id: item.product_id,
                        transaction_type: 'transfer',
                        quantity: item.quantity_requested,
                        unit_cost: 0,
                        total_cost: 0,
                        from_location_id: req.from_location_id,
                        to_location_id: req.to_location_id,
                        performed_by: req.requested_by,
                        notes: `Solicitud aprobada #${req.id.slice(0, 8)}`,
                        created_by: user?.id,
                    });
            }

            loadRequests();
        } catch (err: any) {
            console.error('Error approving request:', err);
        }
        setActionLoading(null);
    };

    const handleReject = async (req: MaterialRequest) => {
        setActionLoading(req.id);
        try {
            const { error: updateError } = await (supabase.from('inventory_material_requests') as any)
                .update({
                    status: 'rejected',
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: adminNotes[req.id] || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', req.id);

            if (updateError) throw new Error(updateError.message);
            loadRequests();
        } catch (err: any) {
            console.error('Error rejecting request:', err);
        }
        setActionLoading(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return { color: 'bg-amber-100 text-amber-800', icon: Clock, label: 'Pendiente' };
            case 'approved': return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Aprobada' };
            case 'rejected': return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rechazada' };
            default: return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                        <ClipboardList className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Solicitudes de Material</h3>
                        <p className="text-sm text-gray-500">
                            {isAdmin ? 'Aprueba o rechaza solicitudes de los técnicos' : 'Solicita material antes de salir'}
                        </p>
                    </div>
                </div>
                {!isAdmin && (
                    <button
                        onClick={() => setShowRequestForm(true)}
                        className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all flex items-center gap-2 font-medium shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Solicitud
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm ${filter === type ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {type === 'all' ? 'Todas' : type === 'pending' ? 'Pendientes' : type === 'approved' ? 'Aprobadas' : 'Rechazadas'}
                    </button>
                ))}
            </div>

            {/* Requests list */}
            <div className="space-y-4">
                {requests.map((req) => {
                    const statusInfo = getStatusBadge(req.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                        <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Request header */}
                            <div className="px-5 py-4 border-b border-gray-100">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-lg">
                                            <User className="w-4 h-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{req.requester_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(req.created_at).toLocaleDateString('es-MX', {
                                                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        {statusInfo.label}
                                    </span>
                                </div>

                                {/* Location flow */}
                                <div className="flex items-center gap-2 mt-3 text-sm">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{req.from_location_name}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{req.to_location_name}</span>
                                </div>

                                {req.notes && (
                                    <p className="mt-2 text-sm text-gray-600 italic">"{req.notes}"</p>
                                )}
                            </div>

                            {/* Items */}
                            <div className="px-5 py-3 bg-gray-50">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Productos solicitados</p>
                                <div className="space-y-1.5">
                                    {req.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-medium text-gray-900">{item.product_name}</span>
                                                <span className="text-gray-400">{item.product_code}</span>
                                            </div>
                                            <span className="font-semibold text-gray-700">{item.quantity_requested} uds</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Admin actions */}
                            {isAdmin && req.status === 'pending' && (
                                <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                                    <textarea
                                        value={adminNotes[req.id] || ''}
                                        onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                                        placeholder="Nota del administrador (opcional)..."
                                        rows={1}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => handleReject(req)}
                                            disabled={actionLoading === req.id}
                                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <X className="w-4 h-4" /> Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            disabled={actionLoading === req.id}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" /> Aprobar y Transferir
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Admin notes (if reviewed) */}
                            {req.admin_notes && req.status !== 'pending' && (
                                <div className="px-5 py-3 border-t border-gray-100 text-sm text-gray-600">
                                    <span className="font-medium">Nota del admin:</span> {req.admin_notes}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {requests.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay solicitudes {filter !== 'all' ? `${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}` : ''}</p>
                </div>
            )}

            {showRequestForm && (
                <MaterialRequestForm
                    onClose={() => setShowRequestForm(false)}
                    onSuccess={() => {
                        loadRequests();
                        setShowRequestForm(false);
                    }}
                />
            )}
        </div>
    );
}
