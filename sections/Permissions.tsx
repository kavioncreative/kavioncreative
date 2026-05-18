
import React, { useState, useEffect } from 'react';
import { Card, ElevatedMetallicCard } from '../components/Surfaces';
import Button from '../components/Button';
import { Tabs } from '../components/Navigation';
import { IconShield, IconUsers, IconChevronRight, IconLock, IconDatabase, IconCheck, IconEye, IconBuilding, IconSearch } from '../components/Icons';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { useAccounts } from '../contexts/AccountContext';

interface Permission {
    code: string;
    name: string;
    category: string;
    description: string;
}

interface Role {
    name: string;
    description: string;
}

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    accountCount?: number;
}

interface Account {
    id: string;
    name: string;
    prefix?: string;
}

type ActiveTab = 'page-access' | 'account-access';

interface PermissionsProps {
    onSimulate?: () => void;
    hideTabs?: boolean;
    activeTab?: ActiveTab;
    onTabChange?: (tab: ActiveTab) => void;
}

export const Permissions: React.FC<PermissionsProps> = ({ onSimulate, hideTabs, activeTab: externalTab, onTabChange }) => {
    const [localTab, setLocalTab] = useState<ActiveTab>('page-access');
    const activeTab = externalTab || localTab;
    const setActiveTab = (tab: ActiveTab) => {
        if (onTabChange) onTabChange(tab);
        else setLocalTab(tab);
    };

    // Role permissions state
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
    const [selectedRole, setSelectedRole] = useState<string>(() => {
        return localStorage.getItem('temp_selected_role') || 'Admin';
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const hasRestoredRef = React.useRef(false);

    // Account scoping state
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [userAccountAccess, setUserAccountAccess] = useState<string[]>([]);
    const [isScopingLoading, setIsScopingLoading] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [accountSearchQuery, setAccountSearchQuery] = useState('');

    const { setSimulatedRole, effectiveRole, refreshProfile, profile } = useUser();
    const { accounts, loading: loadingAccounts, fetchAccounts } = useAccounts(); // Use the unified account fetching

    useEffect(() => {
        fetchInitialData();
    }, []);

    const REQUIRED_PERMISSIONS = [
        { code: 'view_accounts', name: 'Accounts Directory', category: 'Accounts', description: 'Access to view the accounts listing' },
        { code: 'manage_accounts', name: 'Manage Accounts', category: 'Accounts', description: 'Full control over account creation and settings' },
        { code: 'view_dashboard', name: 'Dashboard Access', category: 'General', description: 'Access to the main dashboard' },
        { code: 'view_profile', name: 'My Profile', category: 'General', description: 'Access to personal profile page' },
        { code: 'view_personal_earnings', name: 'My Earnings', category: 'General', description: 'Access to personal earnings tracker' },
        { code: 'view_tasks', name: 'Tasks Board', category: 'Tasks', description: 'Access to the tasks management board' },
        { code: 'view_projects', name: 'Projects Directory', category: 'Projects', description: 'Access to view and manage projects' },
        { code: 'view_leads', name: 'Leads Directory', category: 'Leads', description: 'Access to view and manage sales leads' },
        { code: 'edit_projects', name: 'Edit Projects', category: 'Projects', description: 'Edit existing project properties and details' },
        { code: 'view_analytics', name: 'Analytics Page', category: 'Analytics', description: 'Main access to the Analytics module' },
        { code: 'view_gig_stats', name: 'Gig Statistics', category: 'Analytics', description: 'View detailed performance metrics for platform gigs' },
        { code: 'view_sales_analytics', name: 'Sales Analytics', category: 'Analytics', description: 'View revenue trends and sales volume data' },
        { code: 'view_finances', name: 'Finances Page', category: 'Finances', description: 'Main access to the financial records' },
        { code: 'manage_finance_config', name: 'Manage Finance Config', category: 'Finances', description: 'Configure platform/seller commissions and pricing slabs' },
        { code: 'view_company_earnings', name: 'Company Earnings', category: 'Finances', description: 'View company revenue and profit logs' },
        { code: 'view_freelancer_earnings', name: 'Freelancer Payouts', category: 'Finances', description: 'Manage designer payouts and history' },
        { code: 'access_assets', name: 'Cloud Assets', category: 'Assets', description: 'Access to the file management system' },
        { code: 'manage_assets', name: 'Manage Assets', category: 'Assets', description: 'Full control over file operations (upload/delete)' },
        { code: 'access_chats', name: 'Internal Chats', category: 'Communication', description: 'Access to team messaging' },
        { code: 'access_reminders', name: 'System Reminders', category: 'Communication', description: 'Access to task reminders' },
        { code: 'view_users', name: 'Users & Teams', category: 'Users', description: 'View the company directory and teams' },
        { code: 'view_workload', name: 'Workload & Capacity', category: 'Workload', description: 'View freelancer daily workload' },
        { code: 'view_capacity_tickets', name: 'Capacity Tickets', category: 'Workload', description: 'Review and manage freelancer capacity requests' },
        { code: 'edit_workload', name: 'Edit Capacity', category: 'Workload', description: 'Edit freelancer daily project capacity' },
        { code: 'create_users', name: 'Create Users', category: 'Users', description: 'Invite new users to the platform' },
        { code: 'edit_users', name: 'Edit Users', category: 'Users', description: 'Modify existing user profiles' },
        { code: 'delete_users', name: 'Delete Users', category: 'Users', description: 'Remove users from the system' },
        { code: 'manage_teams', name: 'Manage Teams', category: 'Users', description: 'Create and organize team structures' },

        { code: 'view_channels', name: 'Channels', category: 'Channels', description: 'Access to communication channels' },
        { code: 'view_forms', name: 'Forms', category: 'Forms', description: 'Access to the forms engine' },
        { code: 'access_integrations', name: 'Integrations', category: 'System', description: 'Manage external platform links' },
        { code: 'access_algorithm_studio', name: 'Algorithm', category: 'General', description: 'Advanced Logic Engine & Configuration' },
        { code: 'view_settings', name: 'Settings', category: 'General', description: 'Access to personal account settings' },
        { code: 'view_my_notes', name: 'My Notes', category: 'General', description: 'Access to personal notes and drafts' },
        { code: 'manage_team_slabs', name: 'Team Slabs', category: 'Team Economy', description: 'Manage custom pricing slabs for team designers' },
        { code: 'view_team_earnings', name: 'Team Earnings', category: 'Team Economy', description: 'View consolidated earnings for your team' },
        { code: 'view_team_designer_earnings', name: 'Team Designer Stats', category: 'Team Economy', description: 'View individual performance of team designers' },
        { code: 'view_my_team', name: 'My Team', category: 'Team Economy', description: 'View your assigned designers' },
        { code: 'view_training', name: 'Training Gallery', category: 'General', description: 'Access to the role-based video training gallery' },
    ];

    const REQUIRED_ROLES = [
        { name: 'Super Admin', description: 'Full system access and security control' },
        { name: 'Admin', description: 'Standard administrative operations' },
        { name: 'Project Manager', description: 'Project assignment and client management' },
        { name: 'Project Operations Manager', description: 'Operational oversight and capacity management' },
        { name: 'Finance Manager', description: 'Payouts, commissions, and slab management' },
        { name: 'ORM Manager', description: 'Review and reputation management' },
        { name: 'Team Lead', description: 'Managing a team of designers and payouts' },
        { name: 'Team Designer', description: 'Executing design tasks for a team lead' },
        { name: 'Freelancer', description: 'Independent designer on the platform' },
    ];

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            // Self-healing: Ensure all system permissions and roles exist
            if (effectiveRole === 'Super Admin' || effectiveRole === 'Admin') {
                const { error: upsertError } = await supabase.from('permissions').upsert(REQUIRED_PERMISSIONS, { onConflict: 'code' });
                if (upsertError) {
                    console.error('Self-healing upsert failed:', upsertError);
                }

                // Sync Roles
                const { error: upsertRoleError } = await supabase.from('roles').upsert(REQUIRED_ROLES, { onConflict: 'name' });
                if (upsertRoleError) console.error('Role sync failed:', upsertRoleError);

                // Codifying security: Super Admin must have every system permission
                if (effectiveRole === 'Super Admin') {
                    const saPerms = REQUIRED_PERMISSIONS.map(p => ({
                        role_name: 'Super Admin',
                        permission_code: p.code
                    }));
                    await supabase.from('role_permissions').upsert(saPerms, { onConflict: 'role_name,permission_code' });
                }
            }

            const [
                { data: pData },
                { data: rData },
                { data: rpData },
                { data: uData },
                { data: aData }
            ] = await Promise.all([
                supabase.from('permissions').select('*').order('category').order('name'),
                supabase.from('roles').select('*'),
                supabase.from('role_permissions').select('*'),
                supabase.from('profiles').select('id, name, email, role').in('role', ['Admin', 'Project Manager', 'Project Operations Manager', 'Finance Manager', 'ORM Manager']).order('name'),
                supabase.from('user_account_access').select('user_id'),
            ]);

            if (pData) {
                // Hard Injection: Ensure critical account permissions are present even if DB sync is slow
                const finalPerms = [...pData];
                REQUIRED_PERMISSIONS.forEach(req => {
                    const idx = finalPerms.findIndex(p => p.code === req.code);
                    if (idx === -1) {
                        finalPerms.push(req);
                    } else {
                        // Force update category and name to ensure they show up in the right place
                        finalPerms[idx] = { ...finalPerms[idx], ...req };
                    }
                });
                // Filter to only included required permissions to ensure old/removed permissions don't linger in UI
                const filteredPerms = finalPerms.filter(p => REQUIRED_PERMISSIONS.some(r => r.code === p.code));
                setPermissions(filteredPerms);

                // Store the raw DB permission codes to filter saves later
                const dbPermissionCodes = new Set(pData.map(p => p.code));
                (window as any)._dbPermissionCodes = dbPermissionCodes;

                if (rpData) {
                    const mapping: Record<string, string[]> = {};
                    rpData.forEach(rp => {
                        if (!mapping[rp.role_name]) mapping[rp.role_name] = [];
                        mapping[rp.role_name].push(rp.permission_code);
                    });

                    // Normalization: Ensure parents are checked if children are present
                    Object.keys(mapping).forEach(role => {
                        const codes = mapping[role];
                        const toAdd: string[] = [];
                        codes.forEach(code => {
                            const perm = finalPerms.find(p => p.code === code);
                            if (perm && getPermLevel(code) > 1) {
                                const parent = finalPerms.find(p => p.category === perm.category && getPermLevel(p.code) === 1);
                                if (parent && !codes.includes(parent.code) && !toAdd.includes(parent.code)) {
                                    toAdd.push(parent.code);
                                }
                            }
                        });
                        mapping[role] = [...codes, ...toAdd];
                    });

                    // Restoration Logic: If we just exited a simulation, restore the unsaved permissions
                    const tempPerms = localStorage.getItem('temp_preview_permissions');
                    if (tempPerms) {
                        try {
                            const parsed = JSON.parse(tempPerms);
                            mapping[selectedRole] = parsed;
                        } catch (e) {
                            console.error('Failed to restore preview permissions');
                        }
                    }

                    setRolePermissions(mapping);
                }
            }
            if (rData) setRoles(rData);
            if (uData) {
                const usersWithCounts = (uData as AdminUser[]).map(user => ({
                    ...user,
                    accountCount: aData?.filter(a => a.user_id === user.id).length || 0
                }));
                setAdminUsers(usersWithCounts);
            }

            fetchAccounts(); // Fetch accounts using the unified hook
        } catch (error) {
            console.error('Error fetching permissions:', error);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load permissions' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading) {
            // Delayed Cleanup: We wait 1 second before clearing temporary storage
            // to ensure React Strict Mode (double-render) doesn't lose the data.
            const timeout = setTimeout(() => {
                localStorage.removeItem('temp_selected_role');
                localStorage.removeItem('temp_preview_permissions');
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isLoading]);

    const fetchUserScope = async (userId: string) => {
        setIsScopingLoading(true);
        const { data } = await supabase
            .from('user_account_access')
            .select('account_id')
            .eq('user_id', userId);
        setUserAccountAccess(data?.map(d => d.account_id) || []);
        setIsScopingLoading(false);
    };

    useEffect(() => {
        if (selectedUserId) {
            fetchUserScope(selectedUserId);
        } else {
            setUserAccountAccess([]);
        }
    }, [selectedUserId]);

    const handleTogglePermission = (roleName: string, permissionCode: string) => {
        const current = rolePermissions[roleName] || [];
        const isCurrentlyActive = current.includes(permissionCode);
        const permItem = permissions.find(p => p.code === permissionCode);
        if (!permItem) return;

        const isParent = getPermLevel(permissionCode) === 1;
        let updated: string[];

        if (isCurrentlyActive) {
            // UNCHECKING
            updated = current.filter(c => c !== permissionCode);

            // CASCADING: If parent is unchecked, remove ALL permissions in this category
            if (isParent) {
                const categoryCodes = permissions
                    .filter(p => p.category === permItem.category)
                    .map(p => p.code);
                updated = updated.filter(c => !categoryCodes.includes(c));
            }
        } else {
            // CHECKING
            updated = [...current, permissionCode];

            // CASCADING: If child/action is checked, MUST check parent too
            const isChildOrAction = getPermLevel(permissionCode) > 1;
            if (isChildOrAction) {
                const parentInCat = permissions.find(p => p.category === permItem.category && getPermLevel(p.code) === 1);
                if (parentInCat && !updated.includes(parentInCat.code)) {
                    updated.push(parentInCat.code);
                }
            }
        }
        setRolePermissions({ ...rolePermissions, [roleName]: updated });
    };

    const handleSaveRolePermissions = async () => {
        setIsSaving(true);
        try {
            const { error: deleteError } = await supabase.from('role_permissions').delete().eq('role_name', selectedRole);
            if (deleteError) {
                console.error('Delete error:', deleteError);
                throw deleteError;
            }

            const dbCodes = (window as any)._dbPermissionCodes as Set<string>;
            const requiredCodes = new Set(REQUIRED_PERMISSIONS.map(p => p.code));

            const toInsert = (rolePermissions[selectedRole] || [])
                .filter(code => {
                    // Trust REQUIRED_PERMISSIONS even if not in DB yet (to avoid silent uncheck)
                    // If it's missing in DB, Supabase will throw 23503 error which is clearer
                    if (dbCodes && !dbCodes.has(code) && !requiredCodes.has(code)) {
                        console.warn(`Filtering out ${code}: not present in permissions table.`);
                        return false;
                    }
                    return true;
                })
                .map(code => ({
                    role_name: selectedRole,
                    permission_code: code
                }));

            if (toInsert.length > 0) {
                const { error: insertError } = await supabase.from('role_permissions').insert(toInsert);
                if (insertError) {
                    console.error('Insert error:', insertError);
                    throw insertError;
                }
            }

            addToast({ type: 'success', title: 'Saved', message: `Permissions updated for ${selectedRole}` });

            // Refresh local permissions if the updated role is currently being used or simulated
            await refreshProfile();
        } catch (error: any) {
            console.error('Core save error:', error);

            let message = error.message || 'Failed to save permissions';

            // Handle Foreign Key Violation (Permission code doesn't exist in permissions table)
            if (error.code === '23503') {
                message = 'Database desync detected. Some permission codes are missing from the system. Please run the fix_permissions.sql script in your Supabase SQL Editor.';
            }

            addToast({
                type: 'error',
                title: 'Database Sync Error',
                message: message
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateLocalUserAccountCount = (userId: string, count: number | ((prev: number) => number)) => {
        setAdminUsers(prev => prev.map(u => {
            if (u.id === userId) {
                return {
                    ...u,
                    accountCount: typeof count === 'function' ? count(u.accountCount || 0) : count
                };
            }
            return u;
        }));
    };

    const handleToggleAccountScope = async (accountId: string) => {
        if (!selectedUserId) return;
        const isAdding = !userAccountAccess.includes(accountId);
        setUserAccountAccess(prev => isAdding ? [...prev, accountId] : prev.filter(id => id !== accountId));
        try {
            if (isAdding) {
                const { error } = await supabase.from('user_account_access').insert({ user_id: selectedUserId, account_id: accountId });
                if (error) throw error;
            } else {
                const { error } = await supabase.from('user_account_access').delete().match({ user_id: selectedUserId, account_id: accountId });
                if (error) throw error;
            }
            updateLocalUserAccountCount(selectedUserId, prev => isAdding ? prev + 1 : Math.max(0, prev - 1));
            addToast({ type: 'success', title: 'Scope Updated', message: `Account access ${isAdding ? 'granted' : 'revoked'}.` });
        } catch {
            setUserAccountAccess(prev => isAdding ? prev.filter(id => id !== accountId) : [...prev, accountId]);
            addToast({ type: 'error', title: 'Error', message: 'Failed to update access scope' });
        }
    };

    const handleGrantAll = async () => {
        if (!selectedUserId) return;
        const toAdd = accounts.map(a => a.id).filter(id => !userAccountAccess.includes(id));
        if (!toAdd.length) return;
        setUserAccountAccess(accounts.map(a => a.id));
        try {
            const { error } = await supabase.from('user_account_access').insert(toAdd.map(account_id => ({ user_id: selectedUserId, account_id })));
            if (error) throw error;
            updateLocalUserAccountCount(selectedUserId, accounts.length);
            addToast({ type: 'success', title: 'All Granted', message: 'User now has access to all accounts.' });
        } catch {
            setUserAccountAccess(prev => prev.filter(id => !toAdd.includes(id)));
            addToast({ type: 'error', title: 'Error', message: 'Failed to grant all accounts.' });
        }
    };

    const handleRevokeAll = async () => {
        if (!selectedUserId) return;
        const prev = [...userAccountAccess];
        setUserAccountAccess([]);
        try {
            const { error } = await supabase.from('user_account_access').delete().eq('user_id', selectedUserId);
            if (error) throw error;
            updateLocalUserAccountCount(selectedUserId, 0);
            addToast({ type: 'success', title: 'Access Cleared', message: 'All account access revoked.' });
        } catch {
            setUserAccountAccess(prev);
            addToast({ type: 'error', title: 'Error', message: 'Failed to revoke access.' });
        }
    };

    const categories = Array.from(new Set(permissions.map(p => p.category))).sort();
    const selectedUser = adminUsers.find(u => u.id === selectedUserId);

    const filteredUsers = adminUsers.filter(u =>
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    const filteredAccounts = accounts.filter(acc =>
        acc.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
        (acc.prefix || '').toLowerCase().includes(accountSearchQuery.toLowerCase())
    );

    // Helper to determine permission level for sorting/styling within a category
    const getPermLevel = (code: string) => {
        const c = code.toLowerCase();
        // Level 1: Sidebar/Page entry
        if (c === 'view_accounts' || (c.startsWith('view_') && !['view_gig_stats', 'view_sales_analytics', 'view_company_earnings', 'view_freelancer_earnings'].includes(c)) || c.startsWith('access_') || c.startsWith('manage_team_')) return 1;
        // Level 2: Specific Dashboards/Tabs
        if (['view_gig_stats', 'view_sales_analytics', 'view_company_earnings', 'view_freelancer_earnings'].includes(c)) return 2;
        // Level 3: CRUD/Sensitive Actions
        return 3;
    };

    const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { id: 'page-access', label: 'Page Access', icon: <IconShield size={15} /> },
        { id: 'account-access', label: 'Account Access', icon: <IconBuilding size={15} /> },
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                <p className="text-gray-500 text-sm animate-pulse font-bold tracking-widest uppercase">Loading Permissions System...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* ── Tab Bar + Actions (Standalone Mode) ── */}
            {!hideTabs && (
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={(id) => setActiveTab(id as ActiveTab)}
                    />
                    {activeTab === 'page-access' && (
                        <div className="flex items-center gap-3 shrink-0">
                            <Button
                                variant="recessed"
                                size="sm"
                                onClick={() => {
                                    const currentLocalPerms = rolePermissions[selectedRole] || [];
                                    setSimulatedRole(selectedRole, currentLocalPerms);
                                    if (onSimulate) onSimulate();
                                }}
                                leftIcon={<IconEye size={16} />}
                            >
                                Simulate Role
                            </Button>
                            <Button variant="metallic" size="sm" isLoading={isSaving} onClick={handleSaveRolePermissions}>
                                Save Changes
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 1 — Page Access
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'page-access' && (
                <div className="space-y-6 text-left">
                    {hideTabs && (
                        <div className="flex items-center justify-end gap-3 px-1">
                            <Button
                                variant="recessed"
                                size="sm"
                                onClick={() => {
                                    const currentLocalPerms = rolePermissions[selectedRole] || [];
                                    setSimulatedRole(selectedRole, currentLocalPerms);
                                    if (onSimulate) onSimulate();
                                }}
                                leftIcon={<IconEye size={16} />}
                            >
                                Simulate Role
                            </Button>
                            <Button variant="metallic" size="sm" isLoading={isSaving} onClick={handleSaveRolePermissions}>
                                Save Changes
                            </Button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6 items-start">
                        {/* Role list sidebar */}
                        <div className="lg:col-span-3">
                            <ElevatedMetallicCard
                                title="System Roles"
                                bodyClassName="p-3"
                                className="shadow-2xl"
                            >
                                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin scrollbar-thumb-white/10">
                                    {roles.map(role => (
                                        <button
                                            key={role.name}
                                            onClick={() => setSelectedRole(role.name)}
                                            className={`w-full px-4 py-3 text-left transition-[color,background-color,transform,opacity] duration-200 flex items-center justify-between group relative overflow-hidden rounded-xl border outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0 border-none-instant ${selectedRole === role.name
                                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border-[#FF4D2D] shadow-[0_4px_12px_rgba(217,54,26,0.2),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                                : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border-transparent shadow-none-instant'
                                                }`}
                                        >
                                            {/* Metallic Shine Overlay for Active State */}
                                            {selectedRole === role.name && (
                                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-0" />
                                            )}

                                            <div className="min-w-0 relative z-10 flex flex-col">
                                                <span className={`text-sm font-bold transition-colors ${selectedRole === role.name ? 'text-white' : 'group-hover:text-white'}`}>
                                                    {role.name}
                                                </span>
                                                <span className={`text-[10px] truncate font-medium transition-colors ${selectedRole === role.name ? 'text-white/60' : 'text-gray-500 group-hover:text-gray-400'}`}>
                                                    {role.description || 'System Role'}
                                                </span>
                                            </div>
                                            <IconChevronRight size={14} className={`relative z-10 transition-all duration-300 ${selectedRole === role.name ? 'translate-x-1 text-white scale-110' : 'opacity-0 group-hover:opacity-100 -translate-x-1'}`} />
                                        </button>
                                    ))}
                                </div>
                            </ElevatedMetallicCard>
                        </div>

                        {/* Modules Area */}
                        <div className="lg:col-span-9 space-y-8">
                            {categories.map(category => {
                                const catPermissions = permissions.filter(p => p.category === category);
                                const level1 = catPermissions.filter(p => getPermLevel(p.code) === 1);
                                const level3 = catPermissions.filter(p => getPermLevel(p.code) === 3);
                                if (catPermissions.length === 0) return null;

                                return (
                                    <ElevatedMetallicCard key={category} title={`${category} Module`} bodyClassName="p-6">
                                        <div className="space-y-8">
                                            {level1.length > 0 && (
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Parent Page Access</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {level1.map(perm => {
                                                            const isActive = rolePermissions[selectedRole]?.includes(perm.code);
                                                            const isLocked = selectedRole === 'Super Admin' && profile?.role !== 'Super Admin';
                                                            return (
                                                                <button
                                                                    key={perm.code}
                                                                    onClick={() => !isLocked && handleTogglePermission(selectedRole, perm.code)}
                                                                    className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-hidden ${isActive
                                                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[0_8px_16px_rgba(217,54,26,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]'
                                                                        : 'bg-white/[0.05] border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.08] hover:border-white/10'
                                                                        }`}
                                                                >
                                                                    {isActive && <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-50 z-0" />}
                                                                    <div className="text-left relative z-10">
                                                                        <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{perm.name}</p>
                                                                        <p className={`text-[10px] ${isActive ? 'text-white/60' : 'text-gray-600'}`}>Main Sidebar Access</p>
                                                                    </div>
                                                                    <div className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center relative z-10 transition-all ${isActive ? 'bg-white/20 border-white/40' : 'border-white/10 bg-black/30'}`}>
                                                                        <IconCheck size={12} className={`transition-all ${isActive ? 'text-white scale-110 opacity-100' : 'text-gray-700 opacity-0'}`} />
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {catPermissions.filter(p => getPermLevel(p.code) === 2).length > 0 && (
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Specific Area Access</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {catPermissions.filter(p => getPermLevel(p.code) === 2).map(perm => {
                                                            const isActive = rolePermissions[selectedRole]?.includes(perm.code);
                                                            const isLocked = selectedRole === 'Super Admin' && profile?.role !== 'Super Admin';
                                                            return (
                                                                <button
                                                                    key={perm.code}
                                                                    onClick={() => !isLocked && handleTogglePermission(selectedRole, perm.code)}
                                                                    className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 overflow-hidden ${isActive
                                                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[0_8px_16px_rgba(217,54,26,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]'
                                                                        : 'bg-white/[0.05] border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.08] hover:border-white/10'
                                                                        }`}
                                                                >
                                                                    {isActive && <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-50 z-0" />}
                                                                    <div className="text-left relative z-10">
                                                                        <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{perm.name}</p>
                                                                        <p className={`text-[10px] ${isActive ? 'text-white/60' : 'text-gray-600'}`}>Module Subsection</p>
                                                                    </div>
                                                                    <div className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center relative z-10 transition-all ${isActive ? 'bg-white/20 border-white/40' : 'border-white/10 bg-black/30'}`}>
                                                                        <IconCheck size={12} className={`transition-all ${isActive ? 'text-white scale-110 opacity-100' : 'text-gray-700 opacity-0'}`} />
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {level3.length > 0 && (
                                                <div className="space-y-4">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Operational Capabilities</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {level3.map(perm => {
                                                            const isActive = rolePermissions[selectedRole]?.includes(perm.code);
                                                            const isLocked = selectedRole === 'Super Admin' && profile?.role !== 'Super Admin';
                                                            return (
                                                                <button
                                                                    key={perm.code}
                                                                    onClick={() => !isLocked && handleTogglePermission(selectedRole, perm.code)}
                                                                    className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left overflow-hidden ${isActive
                                                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[0_6px_12px_rgba(217,54,26,0.2),inset_0_1px_0_rgba(255,255,255,0.3)]'
                                                                        : 'bg-white/[0.05] border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.08] hover:border-white/10'
                                                                        }`}
                                                                >
                                                                    {isActive && <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-50 z-0" />}
                                                                    <div className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center relative z-10 transition-all ${isActive ? 'bg-white/20 border-white/40' : 'border-white/10 bg-black/30'}`}>
                                                                        <IconCheck size={10} className={`transition-all ${isActive ? 'text-white opacity-100' : 'text-gray-700 opacity-0'}`} />
                                                                    </div>
                                                                    <span className={`text-[11px] font-bold relative z-10 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{perm.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ElevatedMetallicCard>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════
                TAB 2 — Account Access
            ══════════════════════════════════════════════════════ */}
            {activeTab === 'account-access' && (
                <ElevatedMetallicCard
                    title="Account Scoping Command Center"
                    bodyClassName="p-0 flex flex-col lg:flex-row h-[700px] overflow-hidden"
                >
                    {/* Left Panel: User Directory */}
                    <div className="w-full lg:w-80 border-r border-white/5 flex flex-col bg-black/20">
                        <div className="p-4 space-y-4 border-b border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Professional Directory</p>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand-primary transition-colors">
                                    <IconSearch size={14} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Find professional..."
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    className="w-full bg-black/40 border border-white/[0.06] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/40 transition-all shadow-[inset_0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(0,0,0,0.3)]"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-2 space-y-2">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`w-full group flex items-start gap-3 p-4 rounded-xl transition-all relative overflow-hidden border ${selectedUserId === user.id
                                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[0_4px_12px_rgba(217,54,26,0.3),inset_0_1px_0_rgba(255,255,255,0.4)]'
                                            : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                                            }`}
                                    >
                                        {/* Metallic Shine Overlay for Active State */}
                                        {selectedUserId === user.id && (
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-50 z-0" />
                                        )}

                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ring-1 transition-all relative z-10 ${selectedUserId === user.id
                                            ? 'bg-white/20 text-white ring-white/40 shadow-inner'
                                            : 'bg-white/5 text-gray-500 ring-white/5 group-hover:ring-white/10 group-hover:bg-white/10 group-hover:text-gray-300'
                                            }`}>
                                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1 text-left relative z-10">
                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                <p className={`text-xs font-bold truncate ${selectedUserId === user.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{user.name}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <p className={`text-[10px] truncate ${selectedUserId === user.id ? 'text-white/70' : 'text-gray-600'}`}>{user.role}</p>

                                                {user.accountCount !== undefined && user.accountCount > 0 ? (
                                                    <span className={`shrink-0 text-[8px] px-3 py-1 rounded-md font-black uppercase tracking-wider border ${selectedUserId === user.id
                                                        ? 'bg-white/20 text-white border-white/20'
                                                        : (user.accountCount === accounts.length
                                                            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                                                            : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20')
                                                        }`}>
                                                        {user.accountCount === accounts.length ? 'Full Access' : `${user.accountCount} Scopes`}
                                                    </span>
                                                ) : (
                                                    <span className={`shrink-0 text-[8px] px-3 py-1 rounded-md font-black uppercase tracking-wider border ${selectedUserId === user.id
                                                        ? 'bg-white/10 text-white/60 border-white/10'
                                                        : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                                                        }`}>No Scopes</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-10 text-center space-y-2">
                                    <p className="text-xs text-gray-600 font-medium">No results found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Account Scoping Grid */}
                    <div className="flex-1 flex flex-col min-w-0 bg-black/40">
                        {selectedUserId ? (
                            <>
                                {/* Floating Header */}
                                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20 backdrop-blur-md">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-transparent flex items-center justify-center border border-brand-primary/20 shadow-inner">
                                            <IconShield className="text-brand-primary w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white leading-tight">{selectedUser?.name}</h3>
                                            <p className="text-xs text-gray-500 font-medium flex items-center gap-2">
                                                <span>{selectedUser?.role}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                <span className="text-brand-primary/80">{userAccountAccess.length} Accounts Assigned</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative mr-4 hidden xl:block">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                                                <IconSearch size={14} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Filter accounts..."
                                                value={accountSearchQuery}
                                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                                                className="bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-primary/30 w-48"
                                            />
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={handleRevokeAll} className="text-[10px] font-black uppercase tracking-widest hover:text-brand-error">Revoke All</Button>
                                        <Button variant="metallic" size="sm" onClick={handleGrantAll} className="px-4 text-[10px] font-black uppercase tracking-widest">Grant All</Button>
                                    </div>
                                </div>

                                {/* Multi-column Grid Section */}
                                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                                    {isScopingLoading ? (
                                        <div className="h-full flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-2 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] animate-pulse">Syncing permissions grid...</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-6">
                                            {filteredAccounts.length > 0 ? (
                                                filteredAccounts.map(acc => {
                                                    const isGranted = userAccountAccess.includes(acc.id);
                                                    return (
                                                        <button
                                                            key={acc.id}
                                                            onClick={() => handleToggleAccountScope(acc.id)}
                                                            className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${isGranted
                                                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[0_10px_20px_rgba(217,54,26,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]'
                                                                : 'bg-[#1A1A1A] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.3)] hover:border-brand-primary/30'
                                                                }`}
                                                        >
                                                            {/* Metallic Shine Overlay for Active State */}
                                                            {isGranted && (
                                                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-50 z-0" />
                                                            )}

                                                            <div className="min-w-0 relative z-10 mr-4">
                                                                <p className={`text-xs font-bold truncate transition-colors ${isGranted ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{acc.name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className={`text-[10px] font-black uppercase tracking-wider ${isGranted ? 'text-white/60' : 'text-gray-700 font-bold'}`}>{acc.prefix || 'Account'}</p>
                                                                    {isGranted && (
                                                                        <span className="w-1 h-1 rounded-full bg-white/40" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className={`shrink-0 w-6 h-6 rounded-xl border flex items-center justify-center transition-all duration-300 relative z-10 ${isGranted
                                                                ? 'bg-white/20 border-white/40 shadow-inner'
                                                                : 'border-white/10 bg-black/40 group-hover:border-white/20'
                                                                }`}>
                                                                <IconCheck size={12} className={`transition-all ${isGranted ? 'text-white scale-110' : 'text-gray-800 opacity-0'}`} />
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full py-20 text-center">
                                                    <p className="text-sm text-gray-500 font-medium">No accounts found matching your search</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                {/* Premium Static Icon Composition */}
                                <div className="relative mb-10">
                                    {/* Outer subtle ring */}
                                    <div className="absolute inset-0 rounded-3xl scale-150" />
                                    {/* Main icon container */}
                                    <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center">
                                        {/* Diagonal metallic sheen */}
                                        <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_50%,rgba(255,255,255,0.02)_100%)] pointer-events-none" />
                                        <IconUsers size={44} className="text-gray-600 relative z-10" />
                                    </div>
                                    {/* Badge: Building icon */}
                                    <div className="absolute -bottom-3 -right-3 w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-primary to-[#D9361A] border border-brand-primary/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.2)_0%,transparent_60%)] pointer-events-none" />
                                        <IconBuilding size={18} className="text-white relative z-10" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-400 mb-2">Initialize Security Boundary</h3>
                                <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
                                    Select a professional from the left directory to define their operational data boundaries and account access scopes.
                                </p>
                            </div>
                        )}
                    </div>
                </ElevatedMetallicCard>
            )}
        </div>
    );
};
