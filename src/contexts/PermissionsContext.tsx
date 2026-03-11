import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface PermissionEntry {
    module: string;
    action: string;
}

interface PermissionsContextType {
    permissions: PermissionEntry[];
    userRole: string | null;
    isAdmin: boolean;
    loading: boolean;
    hasPermission: (module: string, action: string) => boolean;
    hasModuleAccess: (module: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadPermissions(user.id);
        } else {
            setPermissions([]);
            setUserRole(null);
            setIsAdmin(false);
            setLoading(false);
        }
    }, [user]);

    const loadPermissions = async (userId: string) => {
        try {
            setLoading(true);

            // 1. Get the user's role
            const { data: userRoleData } = await (supabase
                .from('user_roles') as any)
                .select('role_id, roles (id, name)')
                .eq('user_id', userId)
                .limit(1);

            if (!userRoleData || userRoleData.length === 0) {
                // No role assigned — no permissions
                setPermissions([]);
                setUserRole(null);
                setIsAdmin(false);
                setLoading(false);
                return;
            }

            const role = userRoleData[0].roles;
            const roleName = role?.name || null;
            const roleId = userRoleData[0].role_id;
            setUserRole(roleName);

            // Admin gets all permissions automatically
            if (roleName === 'admin') {
                setIsAdmin(true);
                setPermissions([]);
                setLoading(false);
                return;
            }

            setIsAdmin(false);

            // 2. Get the role's permissions
            const { data: rolePermsData } = await (supabase
                .from('role_permissions') as any)
                .select('permission_id, permissions (module, action)')
                .eq('role_id', roleId);

            if (rolePermsData) {
                const perms: PermissionEntry[] = rolePermsData
                    .filter((rp: any) => rp.permissions)
                    .map((rp: any) => ({
                        module: rp.permissions.module,
                        action: rp.permissions.action
                    }));
                setPermissions(perms);
            }
        } catch (err) {
            console.error('Error loading permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (module: string, action: string): boolean => {
        if (isAdmin) return true;
        return permissions.some(p => p.module === module && p.action === action);
    };

    const hasModuleAccess = (module: string): boolean => {
        if (isAdmin) return true;
        return permissions.some(p => p.module === module && p.action === 'view');
    };

    return (
        <PermissionsContext.Provider value={{ permissions, userRole, isAdmin, loading, hasPermission, hasModuleAccess }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
