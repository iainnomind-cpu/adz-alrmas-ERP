import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, CheckCircle2, Package, ClipboardList, AlertTriangle } from 'lucide-react';

interface InventoryNotification {
    id: string;
    notification_type: string;
    title: string;
    message: string;
    priority: string;
    is_read: boolean;
    created_at: string;
    reference_type: string | null;
    reference_id: string | null;
}

export function InventoryNotificationsBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<InventoryNotification[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const [loading, setLoading] = useState(false);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!user) return;
        loadNotifications();

        // Real-time subscription
        const channel = supabase
            .channel(`inv-notif:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'inventory_notifications',
                    filter: `target_user_id=eq.${user.id}`
                },
                (payload) => {
                    setNotifications(prev => [payload.new as InventoryNotification, ...prev]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await (supabase.from('inventory_notifications') as any)
                .select('*')
                .eq('target_user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error loading inventory notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await (supabase.from('inventory_notifications') as any)
                .update({ is_read: true })
                .eq('id', id);

            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length === 0) return;

            await (supabase.from('inventory_notifications') as any)
                .update({ is_read: true })
                .in('id', unreadIds);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await (supabase.from('inventory_notifications') as any)
                .delete()
                .eq('id', id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'material_request': return <ClipboardList className="w-4 h-4 text-amber-600" />;
            case 'request_approved': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'request_rejected': return <X className="w-4 h-4 text-red-600" />;
            case 'low_stock': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
            case 'inconsistency': return <AlertTriangle className="w-4 h-4 text-red-600" />;
            default: return <Package className="w-4 h-4 text-blue-600" />;
        }
    };

    const getPriorityBorder = (priority: string) => {
        switch (priority) {
            case 'critical': return 'border-l-4 border-red-500 bg-red-50';
            case 'high': return 'border-l-4 border-orange-500 bg-orange-50';
            case 'medium': return 'border-l-4 border-amber-400 bg-amber-50';
            default: return 'border-l-4 border-gray-300 bg-gray-50';
        }
    };

    return (
        <>
            <button
                onClick={() => setShowPanel(!showPanel)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notificaciones de Inventario"
            >
                <Package className="w-5 h-5 text-gray-700" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showPanel && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900">Inventario</h3>
                            {unreadCount > 0 && (
                                <p className="text-xs text-gray-500">{unreadCount} sin leer</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Marcar todo
                                </button>
                            )}
                            <button
                                onClick={() => setShowPanel(false)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-6 text-center">
                                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Sin notificaciones</p>
                            </div>
                        ) : (
                            <div className="space-y-1 p-2">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${getPriorityBorder(n.priority)} ${!n.is_read ? 'ring-2 ring-amber-300' : ''
                                            }`}
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                                <div className="mt-0.5">{getIcon(n.notification_type)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                                                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(n.created_at).toLocaleTimeString('es-MX', {
                                                            hour: '2-digit', minute: '2-digit',
                                                            day: 'numeric', month: 'short'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                                className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0"
                                            >
                                                <X className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
