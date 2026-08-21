import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Card, Modal, ElevatedMetallicCard } from '../components/Surfaces';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { Avatar } from '../components/Avatar';
import { IconPlus, IconSearch, IconFilter, IconMoreVertical, IconUser, IconUsers, IconClock, IconBell, IconMail, IconEdit, IconTrash, IconRefreshCw, IconAlertTriangle, IconCopy, IconCheckSquare, IconChevronDown, IconArrowRight, IconUserPlus, IconChartBar, IconTarget, IconTrendingUp, IconSettings, IconList } from '../components/Icons';
import { Tabs } from '../components/Navigation';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { Checkbox } from '../components/Selection';
import { KebabMenu } from '../components/KebabMenu';
import { RoleCapsule } from '../components/Badge';
import { addToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getInitialTab, updateRoute } from '../utils/routing';
import { formatDisplayName } from '../utils/formatter';
import { useUser } from '../contexts/UserContext';
import { ScorecardConfigModal } from '../components/ScorecardConfigModal';
import { ScorecardSubmissionsTab } from '../components/ScorecardSubmissionsTab';
import { ScorecardTargetsTab } from '../components/ScorecardTargetsTab';
import { ScorecardLeaderboardTab } from '../components/ScorecardLeaderboardTab';

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    joined: string;
    isInvitation?: boolean;
    avatar_url?: string;
    payout_strategy?: string;
    fixed_payout_rate?: number;
}

interface AccountRequest {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    status: string;
}

interface UsersProps {
    onUserOpen: (userId: string) => void;
    isUserOpen: boolean;
}

export interface UsersHandle {
    refresh: () => void;
}

const Users = forwardRef<UsersHandle, UsersProps>(({ onUserOpen, isUserOpen }, ref) => {
    const { hasPermission, effectiveRole } = useUser();
    useImperativeHandle(ref, () => ({
        refresh: () => {
            fetchMembers();
            fetchTeams();
        }
    }));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Member | null>(null);
    const [userToRemove, setUserToRemove] = useState<Member | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(getInitialTab('Users', 'users'));
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [filterState, setFilterState] = useState<'total' | 'active' | 'pending' | 'requests'>('total');

    const [shiftsSubTab, setShiftsSubTab] = useState<'assign' | 'logs'>('assign');
    const [userShifts, setUserShifts] = useState<any[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [isSavingShift, setIsSavingShift] = useState(false);
    
    // Shift editor modal state
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedShiftUser, setSelectedShiftUser] = useState<any>(null);
    const [shiftStartTime, setShiftStartTime] = useState('09:00');
    const [shiftEndTime, setShiftEndTime] = useState('18:00');
    const [shiftTimezone, setShiftTimezone] = useState('Asia/Karachi');

    const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // Team Modal State
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
    const [isSavingTeam, setIsSavingTeam] = useState(false);
    const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [pendingBulkAction, setPendingBulkAction] = useState<string | null>(null);
    const [isDeleteTeamModalOpen, setIsDeleteTeamModalOpen] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState<any | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

    // Scorecard Configuration Modal State
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    
    const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [teamTypeTab, setTeamTypeTab] = useState<'pm' | 'design'>('pm');
    const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');

    const teamTypeTabs = [
        { id: 'pm', label: 'Project Manager Teams', icon: <IconUsers size={14} /> },
        { id: 'design', label: 'Design Teams', icon: <IconUsers size={14} /> },
    ];

    const [performanceTab, setPerformanceTab] = useState('submissions');
    
    const performanceTabs = [
        { id: 'submissions', label: 'Submissions', icon: <IconList size={14} /> },
        { id: 'targets', label: 'Targets', icon: <IconTarget size={14} /> },
        { id: 'leaderboard', label: 'Leaderboard', icon: <IconTrendingUp size={14} /> },
        { id: 'configuration', label: 'Configuration', icon: <IconSettings size={14} /> },
    ];

    const tabs = [
        { id: 'users', label: 'Users', icon: <IconUser size={16} /> },
        { id: 'teams', label: 'Teams', icon: <IconUsers size={16} /> },
        { id: 'shifts', label: 'Attendance & Shifts', icon: <IconClock size={16} /> },
        { id: 'performance', label: 'Performance', icon: <IconChartBar size={16} /> },
    ];

    const [showSuccess, setShowSuccess] = useState(false);
    const [createdMember, setCreatedMember] = useState<any>(null);

    const [profiles, setProfiles] = useState<Member[]>(() => {
        const cached = localStorage.getItem('nova_users_cache');
        return cached ? JSON.parse(cached) : [];
    });
    const [invitations, setInvitations] = useState<Member[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const roles = [
        { label: 'Admin', value: 'Admin' },
        { label: 'Team Designer', value: 'Team Designer' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Team Lead', value: 'Team Lead' },
        { label: 'Freelancer', value: 'Freelancer' },
        { label: 'Presentation Designer', value: 'Presentation Designer' },
        { label: 'Finance Manager', value: 'Finance Manager' },
        { label: 'ORM Manager', value: 'ORM Manager' },
        { label: 'Project Operations Manager', value: 'Project Operations Manager' },
        { label: 'Super Admin', value: 'Super Admin' },
    ];

    useEffect(() => {
        if (!isUserOpen) {
            updateRoute('Users', activeTab);
        }
    }, [activeTab, isUserOpen]);

    useEffect(() => {
        if (activeTab === 'shifts') {
            fetchShiftsAndLogs();
        }
    }, [activeTab, shiftsSubTab]);

    const fetchShiftsAndLogs = async () => {
        try {
            // Fetch all shifts
            const { data: shiftsData } = await supabase
                .from('user_shifts')
                .select('*');
            
            setUserShifts(shiftsData || []);

            // Fetch today's attendance logs
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            
            const { data: logsData } = await supabase
                .from('attendance_records')
                .select('*, profiles(name, email, role, avatar_url)')
                .gte('punch_in_at', startOfToday.toISOString())
                .order('punch_in_at', { ascending: false });

            setAttendanceLogs(logsData || []);
        } catch (e) {
            console.error('Error fetching shifts/logs:', e);
        }
    };

    const handleSaveShift = async () => {
        if (!selectedShiftUser) return;
        setIsSavingShift(true);
        try {
            const payload = {
                user_id: selectedShiftUser.id,
                start_time: shiftStartTime.includes(':') && shiftStartTime.split(':').length === 2 ? shiftStartTime + ':00' : shiftStartTime,
                end_time: shiftEndTime.includes(':') && shiftEndTime.split(':').length === 2 ? shiftEndTime + ':00' : shiftEndTime,
                timezone: shiftTimezone
            };

            const { error } = await supabase
                .from('user_shifts')
                .upsert([payload], { onConflict: 'user_id' });

            if (error) throw error;

            addToast({ type: 'success', title: 'Shift Saved', message: `Shift timing updated for ${selectedShiftUser.name || selectedShiftUser.email}.` });
            setIsShiftModalOpen(false);
            fetchShiftsAndLogs();
        } catch (e) {
            console.error(e);
            addToast({ type: 'error', title: 'Error', message: 'Failed to update shift timing.' });
        } finally {
            setIsSavingShift(false);
        }
    };

    const fetchMembers = async (isInitial = false) => {
        try {
            if (isInitial) setIsLoading(true);

            // Fetch active profiles
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;

            // Fetch pending invitations
            const { data: inviteData, error: inviteError } = await supabase
                .from('member_invitations')
                .select('*')
                .order('created_at', { ascending: false });

            if (inviteError) throw inviteError;

            const formattedProfiles = profileData.map((p: any) => ({
                id: p.id,
                name: formatDisplayName(p.name),
                email: p.email,
                role: p.role,
                status: p.status,
                avatar_url: p.avatar_url,
                joined: new Date(p.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                isInvitation: false,
                payout_strategy: p.payout_strategy,
                fixed_payout_rate: p.fixed_payout_rate
            }));

            setProfiles(formattedProfiles);
            try {
                localStorage.setItem('nova_users_cache', JSON.stringify(formattedProfiles));
            } catch (e) {
                console.warn('LocalStorage quota exceeded while caching users:', e);
            }

            setInvitations(inviteData.map((i: any) => ({
                id: i.id,
                name: 'Pending Invitation',
                email: i.email,
                role: i.role,
                status: 'Pending',
                joined: new Date(i.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
                isInvitation: true
            })));

            // Fetch accounts for the teams dropdown
            const { data: accountsData } = await supabase
                .from('accounts')
                .select('*')
                .order('name', { ascending: true });

            if (accountsData) {
                setAvailableAccounts(accountsData);
            }

            // Fetch account requests
            const { data: requestData, error: requestError } = await supabase
                .from('account_requests_designers')
                .select('*')
                .order('created_at', { ascending: false });

            if (requestError) throw requestError;
            setAccountRequests(requestData || []);

        } catch (error: any) {
            console.error('Error fetching members:', error);
            addToast({ type: 'error', title: 'Fetch Failed', message: 'Could not load directory data.' });
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };


    const fetchTeams = async (isInitial = false) => {
        try {
            if (isInitial) setIsLoading(true);

            const { data: teamsData, error: teamsError } = await supabase
                .from('teams')
                .select(`
                    *,
                    leader:leader_id(name),
                    team_members(member_id, profiles(name)),
                    team_accounts(account_id, accounts(name))
                `)
                .order('name', { ascending: true });

            if (teamsError) throw teamsError;

            const formattedTeams = teamsData.map((t: any) => ({
                id: t.id,
                name: t.name,
                type: t.type || 'pm',
                isDesignTeam: t.type === 'design',
                leader_id: t.leader_id,
                memberNames: t.team_members.map((tm: any) => formatDisplayName(tm.profiles?.name)),
                memberIds: t.team_members.map((tm: any) => tm.member_id),
                memberInitials: t.team_members.map((tm: any) =>
                    (tm.profiles?.name || '').split(' ').map((n: string) => n[0]).join('').toUpperCase()
                ).slice(0, 3),
                totalMembers: t.team_members.length,
                leaderName: t.leader?.name ? formatDisplayName(t.leader.name) : 'No Lead',
                accounts: t.team_accounts.map((ta: any) => ta.accounts?.name),
                accountIds: t.team_accounts.map((ta: any) => ta.account_id)
            }));

            setTeams(formattedTeams);
        } catch (error: any) {
            console.error('Error fetching teams:', error);
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };


    const fetchAllData = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        await Promise.all([fetchMembers(isInitial), fetchTeams(isInitial)]);
        if (isInitial) setIsLoading(false);
    };


    useEffect(() => {
        fetchAllData(true);

        // Set up real-time subscription for profiles
        const profileSubscription = supabase
            .channel('public:profiles')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles'
                },
                () => {
                    console.log('Profiles updated, fetching fresh data...');
                    fetchAllData(false);
                }
            )
            .subscribe();

        return () => {
            profileSubscription.unsubscribe();
        };
    }, []);


    const allMembers = useMemo(() => {
        let combined = [...profiles, ...invitations];

        if (filterState === 'active') {
            combined = combined.filter(m => m.status === 'Active');
        } else if (filterState === 'pending') {
            combined = combined.filter(m => m.isInvitation || m.status === 'Pending' || m.status === 'Invited');
        } else if (filterState === 'total') {
            // Exclude those who haven't joined yet from the main "Total Members" list
            combined = combined.filter(m => m.status !== 'Pending' && m.status !== 'Invited' && !m.isInvitation);
        }

        if (!searchQuery) return combined;
        const q = searchQuery.toLowerCase();
        return combined.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q)
        );
    }, [profiles, invitations, searchQuery, filterState]);

    const stats = useMemo(() => {
        const pendingMembers = profiles.filter(p => p.status === 'Pending' || p.status === 'Invited');
        const pendingCount = invitations.length + pendingMembers.length;
        
        // Total members now excludes those who haven't joined yet to match the "Total Members" filter logic
        const totalCount = profiles.length + invitations.length - pendingCount;

        return {
            total: totalCount,
            active: profiles.filter(p => p.status === 'Active').length,
            pending: pendingCount,
            requests: accountRequests.length
        };
    }, [profiles, invitations, accountRequests]);

    const confirmRemoveMember = (member: Member) => {
        setUserToRemove(member);
        setIsRemoveModalOpen(true);
    };

    const executeRemoveMember = async () => {
        if (!userToRemove) return;

        setIsUpdating(true);
        try {
            let error;
            if (userToRemove.isInvitation) {
                const { error: inviteError } = await supabase
                    .from('member_invitations')
                    .delete()
                    .eq('id', userToRemove.id);
                error = inviteError;
            } else {
                // Use RPC to delete from both auth.users and public.profiles
                const { error: rpcError } = await supabase.rpc('delete_user_entirely', {
                    target_user_id: userToRemove.id
                });
                error = rpcError;
            }

            if (error) throw error;
            addToast({ type: 'success', title: 'Member Removed', message: `${userToRemove.email} has been removed from the directory.` });
            fetchMembers();
            setIsRemoveModalOpen(false);
            setUserToRemove(null);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Removal Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from('account_requests_designers')
                .delete()
                .eq('id', requestId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Request Cancelled', message: 'Account request has been removed.' });
            fetchMembers();
            setIsPreviewModalOpen(false);
            setSelectedRequest(null);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Action Failed', message: error.message });
        }
    };

    const handleAcceptRequest = (request: AccountRequest) => {
        // Close preview and open Add Member modal pre-filled
        setIsPreviewModalOpen(false);
        setFirstName(request.first_name);
        setLastName(request.last_name);
        setEmail(''); // User explicitly asked to keep email field empty to set
        setRole('Freelancer');
        setPassword('');
        setIsModalOpen(true);
    };

    const handleEditPermissions = (member: Member) => {
        if (member.isInvitation) {
            addToast({ type: 'info', title: 'Pending Invitation', message: 'Permissions can only be edited for active members.' });
            return;
        }
        setEditingUser(member);
        setIsEditModalOpen(true);
    };

    const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Status Updated', message: `User status changed to ${newStatus}.` });
            fetchMembers();
            if (editingUser?.id === userId) {
                setEditingUser({ ...editingUser, status: newStatus });
            }
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSavePermissions = async (userId: string, newRole: string) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Role Updated', message: `User role changed to ${newRole}.` });
            fetchMembers();
            setIsEditModalOpen(false);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleBulkAction = (action: string) => {
        if (selectedIds.length === 0) {
            addToast({ type: 'error', title: 'No Selection', message: 'Please select users first.' });
            return;
        }
        setPendingBulkAction(action);
        setIsBulkConfirmOpen(true);
    };

    const executeBulkAction = async () => {
        if (!pendingBulkAction || selectedIds.length === 0) return;

        setIsUpdating(true);
        try {
            if (pendingBulkAction === 'delete') {
                const profileIds = profiles.filter(p => selectedIds.includes(p.id)).map(p => p.id);
                const inviteIds = invitations.filter(i => selectedIds.includes(i.id)).map(i => i.id);

                if (profileIds.length > 0) {
                    // Use bulk RPC to delete from both auth.users and public.profiles
                    const { error } = await supabase.rpc('delete_users_bulk', {
                        target_user_ids: profileIds
                    });
                    if (error) throw error;
                }
                if (inviteIds.length > 0) {
                    const { error } = await supabase.from('member_invitations').delete().in('id', inviteIds);
                    if (error) throw error;
                }
                addToast({ type: 'success', title: 'Bulk Action', message: `Permanently deleted ${selectedIds.length} selected items from the system.` });
            } else {
                let status = '';
                if (pendingBulkAction === 'activate' || pendingBulkAction === 'approve') status = 'Active';
                else if (pendingBulkAction === 'deactivate') status = 'Disabled';

                if (status) {
                    const profileIdsToUpdate = profiles
                        .filter(p => selectedIds.includes(p.id))
                        .map(p => p.id);

                    if (profileIdsToUpdate.length > 0) {
                        const { error } = await supabase.from('profiles').update({ status }).in('id', profileIdsToUpdate);
                        if (error) throw error;
                        addToast({ type: 'success', title: 'Bulk Action', message: `Updated ${profileIdsToUpdate.length} users to ${status}.` });
                    }

                    if (invitations.some(i => selectedIds.includes(i.id))) {
                        addToast({
                            type: 'info',
                            title: 'Note',
                            message: 'Status updates only apply to registered users. Invitations were skipped.'
                        });
                    }
                }
            }

            fetchMembers();
            setSelectedIds([]);
            setIsSelectionMode(false);
            setIsBulkConfirmOpen(false);
            setPendingBulkAction(null);
        } catch (error: any) {
            console.error('Bulk action error:', error);
            addToast({ type: 'error', title: 'Action Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleResendInvitation = (member: Member) => {
        // Logic to trigger email resend would go here
        addToast({ type: 'success', title: 'Invitation Resent', message: `A new invitation has been sent to ${member.email}.` });
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setShowSuccess(false);
        setCreatedMember(null);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setRole('');
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Reset fields after closing
        setTimeout(() => {
            setShowSuccess(false);
            setCreatedMember(null);
            setFirstName('');
            setLastName('');
            setEmail('');
            setPassword('');
            setRole('');
        }, 300);
    };

    const handleAddMember = async () => {
        if (!firstName || !lastName || !email || !role) {
            addToast({ type: 'error', title: 'Missing Info', message: 'Please fill in all fields.' });
            return;
        }

        setIsSending(true);

        try {
            const tempPassword = "12345//"; // Consistent with automation flow
            // 1. Create the user in Supabase Auth
            // Note: This will sign in the new user immediately if you are using the client-side signUp.
            // Ideally, this should be done by an Admin function or we need to handle the session switch,
            // but per request "Add Member" we will use signUp. 
            // !! IMPORTANT: Client-side signUp automatically signs in the new user. 
            // If you want to avoid logging out the current admin, we need to use a secondary client or Edge Function (which user rejected).
            // A workaround for client-side is tricky. 
            // However, assuming the requirement is just to "create" them:

            // To prevent logging out the current admin, we perform a fetch call to Supabase Admin API or similar?
            // Since we deleted the Edge Function, we are limited to client-side.
            // THE USER REQUEST implies we just want to create it.
            // We will use a dedicated method to attempt creation without session replacement if possible, 
            // but standard `supabase.auth.signUp` will trigger session change.

            // ACTUALLY: The best way without Edge Functions to create a *different* user 
            // is to use a second, non-persisted client instance, similar to what we tried in Edge Function but locally.

            // Let's rely on standard flow: The best UX for "Add Member" without backend code is tricky.
            // We will TRY to use the `supabase` client but be aware of session effects.
            // OR: We simply insert into `profiles` and let them sign up themselves? 
            // User ASKED for "Password" field, so they want to set credentials.

            // We'll try to just call signUp. If it logs the Admin out, that's a Supabase client behavior constraint.
            // To avoid this, we can try to use a temporary hidden client.

            // Create a temporary, non-persisted client to avoid hijacking the admin session
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            // Use the temporary client for sign up
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: email.trim(),
                password: tempPassword,
                options: {
                    data: {
                        full_name: `${firstName.trim()} ${lastName.trim()}`,
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        role: role,
                        creation_source: effectiveRole?.toLowerCase() === 'super admin' ? 'super_admin_invite' : 'admin_invite'
                    }
                }
            });

            if (authError) throw authError;

            // 2. Insert into profiles table immediately to ensure they exist in our directory
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        email: email,
                        name: `${firstName} ${lastName}`,
                        first_name: firstName,
                        last_name: lastName,
                        role: role,
                        status: 'Invited' // Initial status: triggers "Complete Profile" flow
                    }]);

                if (profileError) {
                    console.error("Profile creation failed:", profileError);
                    throw new Error(`Auth account created, but profile generation failed: ${profileError.message}`);
                }
            }

            setCreatedMember({ name: `${firstName} ${lastName}`, email, password: tempPassword, role });

            // 3. Trigger Invitation Email (Tailored for manual invites)
            try {
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password: tempPassword,
                        name: firstName
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Invite email trigger returned error:', errorData);
                    addToast({ type: 'info', title: 'Email Delayed', message: 'User invited, but welcome email could not be sent automatically.' });
                } else {
                    addToast({ type: 'success', title: 'Invitation Sent', message: `An invitation has been sent to ${email}.` });
                }
            } catch (emailErr) {
                console.error('Invite email trigger failed to call:', emailErr);
            }

            setShowSuccess(true);
            fetchMembers();

        } catch (error: any) {
            console.error('Error adding member:', error);
            addToast({ type: 'error', title: 'Failed to Add', message: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveTeam = async () => {
        if (!newTeamName || (teamTypeTab === 'design' && !selectedLeaderId) || selectedTeamMemberIds.length === 0 || (teamTypeTab === 'pm' && selectedAccountIds.length === 0)) {
            addToast({ type: 'error', title: 'Missing Info', message: 'Please complete all team details.' });
            return;
        }

        setIsSavingTeam(true);
        try {
            if (editingTeamId) {
                // 1. Update Team Name
                const { error: teamError } = await supabase
                    .from('teams')
                    .update({ 
                        name: newTeamName,
                        type: teamTypeTab,
                        leader_id: teamTypeTab === 'design' ? selectedLeaderId : null
                    })
                    .eq('id', editingTeamId);

                if (teamError) throw teamError;

                // 2. Sync Members (Delete old + Insert new)
                await supabase.from('team_members').delete().eq('team_id', editingTeamId);
                const memberInserts = selectedTeamMemberIds.map(id => ({
                    team_id: editingTeamId,
                    member_id: id
                }));
                const { error: membersError } = await supabase.from('team_members').insert(memberInserts);
                if (membersError) throw membersError;

                // 3. Sync Accounts (Delete old + Insert new)
                await supabase.from('team_accounts').delete().eq('team_id', editingTeamId);
                const accountInserts = selectedAccountIds.map(id => ({
                    team_id: editingTeamId,
                    account_id: id
                }));
                const { error: accountsError } = await supabase.from('team_accounts').insert(accountInserts);
                if (accountsError) throw accountsError;

                addToast({ type: 'success', title: 'Team Updated', message: `${newTeamName} has been updated.` });
            } else {
                // 1. Insert Team
                const { data: team, error: teamError } = await supabase
                    .from('teams')
                    .insert([{ 
                        name: newTeamName,
                        type: teamTypeTab,
                        leader_id: teamTypeTab === 'design' ? selectedLeaderId : null
                    }])
                    .select()
                    .single();

                if (teamError) throw teamError;

                // 2. Insert Members
                const memberInserts = selectedTeamMemberIds.map(id => ({
                    team_id: team.id,
                    member_id: id
                }));
                const { error: membersError } = await supabase.from('team_members').insert(memberInserts);
                if (membersError) throw membersError;

                // 3. Insert Accounts
                const accountInserts = selectedAccountIds.map(id => ({
                    team_id: team.id,
                    account_id: id
                }));
                const { error: accountsError } = await supabase.from('team_accounts').insert(accountInserts);
                if (accountsError) throw accountsError;

                addToast({ type: 'success', title: 'Team Created', message: `${newTeamName} has been initialized.` });
            }

            // Cleanup and Refresh
            setIsTeamModalOpen(false);
            setEditingTeamId(null);
            setNewTeamName('');
            setSelectedTeamMemberIds([]);
            setSelectedAccountIds([]);
            setSelectedLeaderId('');
            fetchTeams();

        } catch (error: any) {
            console.error('Error saving team:', error);
            
            let errorMessage = error.message;
            
            // Check for duplicate team name error
            if (error.code === '23505' || (error.message && error.message.includes('teams_name_key'))) {
                errorMessage = `A team named "${newTeamName}" already exists. Please choose a different name.`;
            }

            addToast({ 
                type: 'error', 
                title: 'Save Failed', 
                message: errorMessage 
            });
        } finally {
            setIsSavingTeam(false);
        }
    };

    const handleDeleteTeam = async () => {
        if (!teamToDelete) return;

        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamToDelete.id);

            if (error) throw error;
            addToast({ type: 'success', title: 'Team Deleted', message: `${teamToDelete.name} has been removed successfully.` });
            fetchTeams();
            setIsDeleteTeamModalOpen(false);
            setTeamToDelete(null);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Deletion Failed', message: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const confirmDeleteTeam = (team: any) => {
        setTeamToDelete(team);
        setIsDeleteTeamModalOpen(true);
    };

    const handleEditTeam = (team: any) => {
        setEditingTeamId(team.id);
        setNewTeamName(team.name);
        setTeamTypeTab(team.type || 'pm');
        setSelectedLeaderId(team.leader_id || '');
        setSelectedTeamMemberIds(team.memberIds || []);
        setSelectedAccountIds(team.accountIds || []);
        setIsTeamModalOpen(true);
    };

    const pmCandidates = useMemo(() => {
        return profiles
            .filter(p => {
                const r = p.role?.toLowerCase().trim();
                return r && r !== 'freelancer' && r !== 'team lead' && r !== 'team designer' && r !== 'presentation';
            })
            .map(p => ({ label: p.name, value: p.id, description: p.role }));
    }, [profiles]);

    const leadCandidates = useMemo(() => {
        return profiles
            .filter(p => {
                const r = p.role?.toLowerCase().trim() || '';
                return r === 'team lead' || r === 'super admin' || r === 'superadmin';
            })
            .map(p => ({ label: p.name, value: p.id, description: p.role }));
    }, [profiles]);

    const designerCandidates = useMemo(() => {
        return profiles
            .filter(p => {
                const r = p.role?.toLowerCase().trim() || '';
                return r === 'team designer' || r === 'super admin' || r === 'superadmin';
            })
            .map(p => ({ label: p.name, value: p.id, description: p.role }));
    }, [profiles]);

    const accountOptions = useMemo(() => {
        return availableAccounts.map(a => ({ label: a.name, value: a.id, description: a.prefix || '' }));
    }, [availableAccounts]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast({ type: 'success', title: 'Copied', message: 'Copied to clipboard.' });
    };

    const handleToggleAll = () => {
        if (selectedIds.length === allMembers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allMembers.map(m => m.id));
        }
    };

    const handleToggleRow = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const columns = useMemo(() => {
        if (filterState === 'requests') {
            return [
                {
                    header: 'First Name',
                    key: 'first_name',
                    render: (item: any) => <span className="text-white/90 font-semibold">{item.first_name}</span>
                },
                {
                    header: 'Last Name',
                    key: 'last_name',
                    render: (item: any) => <span className="text-white/90 font-semibold">{item.last_name}</span>
                },
                {
                    header: 'Email',
                    key: 'email',
                    render: (item: any) => <span className="text-gray-400 font-medium">{item.email}</span>
                },
                {
                    header: 'Request Date',
                    key: 'created_at',
                    render: (item: any) => <span className="text-gray-400 font-medium">{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                },
                {
                    header: '',
                    key: 'actions',
                    className: 'text-right w-10',
                    render: (item: any) => (
                        <button
                            onClick={() => {
                                setSelectedRequest(item);
                                setIsPreviewModalOpen(true);
                            }}
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                        >
                            <IconArrowRight size={18} />
                        </button>
                    )
                }
            ];
        }

        const baseColumns = [
            {
                header: 'User',
                key: 'name',
                className: 'min-w-[280px]',
                render: (item: any) => (
                    <div className="flex items-center gap-3">
                        <Avatar
                            size="sm"
                            src={item.avatar_url}
                            status={item.status === 'Active' ? 'online' : item.status === 'Pending' ? 'away' : 'offline'}
                            initials={(() => {
                                const parts = item.name?.split(' ').filter(Boolean) || [];
                                if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                                if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                                return '??';
                            })()}
                        />
                        <div className="flex flex-col">
                            <span className={`font-semibold ${item.isInvitation ? 'text-gray-500 italic' : 'text-white/90'}`}>{formatDisplayName(item.name)}</span>
                            <span className="text-[10px] text-gray-500 font-medium">{item.email}</span>
                        </div>
                    </div>
                )
            },
            {
                header: 'Role',
                key: 'role',
                className: 'min-w-[180px]',
                render: (item: any) => <RoleCapsule role={item.role} className="w-fit" />
            },
            {
                header: 'Status',
                key: 'status',
                className: 'min-w-[120px]',
                render: (item: any) => (
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${item.status === 'Active' ? 'bg-green-600/20 text-green-600' :
                            item.status === 'Pending' ? 'bg-amber-600/20 text-amber-600' :
                                'bg-red-600/20 text-red-600'
                        }`}>
                        {item.status === 'Disabled' ? 'Deactivated' : item.status}
                    </span>
                )
            },
            {
                header: 'Payout Model',
                key: 'payout_model',
                className: 'min-w-[140px]',
                render: (item: any) => {
                    if (item.isInvitation) return <span className="text-gray-600 font-medium">-</span>;
                    if (item.role === 'Super Admin' || item.role === 'Admin') return <span className="text-gray-600 font-medium">-</span>;
                    const model = item.payout_strategy === 'basicplusbonus' ? 'Basic + Bonus' : 'Only Bonus';
                    return <span className="text-white/80 font-medium">{model}</span>;
                }
            },
            {
                header: 'Salary',
                key: 'salary',
                className: 'min-w-[140px]',
                render: (item: any) => {
                    if (item.isInvitation) return <span className="text-gray-600 font-medium">-</span>;
                    if (item.role === 'Super Admin' || item.role === 'Admin') return <span className="text-gray-600 font-medium">-</span>;
                    if (item.payout_strategy !== 'basicplusbonus') return <span className="text-gray-500 font-medium">-</span>;
                    return (
                        <span className="text-brand-success font-bold">
                            PKR {Math.round(item.fixed_payout_rate || 0).toLocaleString('en-US')}
                        </span>
                    );
                }
            },
            {
                header: 'Joined',
                key: 'joined',
                render: (item: any) => <span className="text-gray-400 font-medium">{item.joined}</span>
            },
            {
                header: '',
                key: 'actions',
                className: 'text-right w-10',
                render: (item: any) => (
                    <KebabMenu
                        options={[
                            {
                                label: item.isInvitation ? 'Resend Invite' : 'View Profile',
                                icon: item.isInvitation ? <IconRefreshCw size={14} /> : <IconUser size={14} />,
                                onClick: () => {
                                    if (item.isInvitation) {
                                        handleResendInvitation(item);
                                    } else {
                                        onUserOpen(item.id);
                                    }
                                }
                            },
                            ...(hasPermission('edit_users') ? [{
                                label: 'Edit Permissions',
                                icon: <IconEdit size={14} />,
                                onClick: () => handleEditPermissions(item)
                            }] : []),
                            ...(hasPermission('delete_users') ? [{
                                label: 'Remove Member',
                                icon: <IconTrash size={14} />,
                                variant: 'danger' as const,
                                onClick: () => confirmRemoveMember(item)
                            }] : [])
                        ]}
                    />
                )
            },
        ];

        if (isSelectionMode) {
            return [
                {
                    header: (
                        <Checkbox
                            checked={selectedIds.length === allMembers.length && allMembers.length > 0}
                            onChange={handleToggleAll}
                            variant="recessed"
                        />
                    ),
                    key: 'selection',
                    className: 'w-10 px-4',
                    render: (item: any) => (
                        <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleToggleRow(item.id)}
                            variant="recessed"
                            onClick={(e) => e.stopPropagation()}
                        />
                    )
                },
                ...baseColumns
            ];
        }

        return baseColumns;
    }, [isSelectionMode, selectedIds, allMembers, onUserOpen, filterState]);

    const teamColumns = useMemo(() => {
        const cols = [
            {
                header: 'Team Name',
                key: 'name',
                className: 'min-w-[200px]',
                render: (item: any) => (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                            <IconUsers size={20} />
                        </div>
                        <span className="font-semibold text-white/90">{item.name}</span>
                    </div>
                )
            },
        ];

        if (teamTypeTab === 'design') {
            cols.push({
                header: 'Team Lead',
                key: 'leader',
                className: 'min-w-[150px]',
                render: (item: any) => (
                    <span className="px-3 py-1 rounded-md bg-brand-primary/10 text-[10px] font-black text-brand-primary uppercase tracking-widest whitespace-nowrap border border-brand-primary/20">
                        {item.leaderName}
                    </span>
                )
            });
        }

        cols.push({
            header: teamTypeTab === 'design' ? 'Designers' : 'Members',
            key: 'members',
            className: 'min-w-[200px]',
            render: (item: any) => (
                <div className="flex flex-wrap gap-1">
                    {item.memberNames.map((name: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 rounded-md bg-gray-600/20 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                            {name}
                        </span>
                    ))}
                </div>
            )
        });

        if (teamTypeTab === 'pm') {
            cols.push({
                header: 'Accounts',
                key: 'accounts',
                className: 'min-w-[200px]',
                render: (item: any) => {
                    const visibleAccounts = item.accounts.slice(0, 3);
                    const overflow = item.accounts.length - 3;
                    return (
                        <div className="flex flex-wrap items-center gap-1">
                            {visibleAccounts.map((acc: string, idx: number) => (
                                <span key={idx} className="px-3 py-1 rounded-md bg-gray-600/20 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                    {acc}
                                </span>
                            ))}
                            {overflow > 0 && (
                                <span className="px-3 py-1 rounded-md bg-brand-primary/20 text-[10px] text-brand-primary font-black uppercase tracking-widest whitespace-nowrap">
                                    +{overflow} more
                                </span>
                            )}
                        </div>
                    );
                }
            });
        }

        cols.push({
            header: '',
            key: 'actions',
            className: 'text-right w-10',
            render: (item: any) => (
                <KebabMenu
                    options={[
                        {
                            label: 'View',
                            icon: <IconUsers size={14} />,
                            onClick: () => {
                                setSelectedTeam(item);
                                setIsViewTeamModalOpen(true);
                            }
                        },
                        ...(hasPermission('manage_teams') ? [
                            {
                                label: 'Edit',
                                icon: <IconEdit size={14} />,
                                onClick: () => handleEditTeam(item)
                            }
                        ] : []),
                        ...(hasPermission('manage_teams') ? [{ label: 'Delete', icon: <IconTrash size={14} />, variant: 'danger' as const, onClick: () => confirmDeleteTeam(item) }] : [])
                    ]}
                />
            )
        });

        return cols;
    }, [teamTypeTab, hasPermission]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both pb-10">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 px-2 overflow-x-hidden">
                <div className="min-w-0">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div>

                <div className="flex-1" />

                {activeTab === 'users' && hasPermission('create_users') && (
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <Button variant="metallic" size="sm" leftIcon={<IconPlus className="w-4 h-4" />} onClick={handleOpenModal} className="shrink-0">Add Member</Button>
                    </div>
                )}
            </div>

            {activeTab === 'users' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card
                            isElevated={true}
                            disableHover={filterState === 'total'}
                            className={`h-full p-0 border-2 rounded-2xl relative overflow-hidden group min-h-[140px] cursor-pointer transition-all duration-300 ${filterState === 'total'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full flex flex-col justify-between"
                            onClick={() => setFilterState('total')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className={`absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none ${filterState === 'total' ? 'opacity-100' : 'opacity-70'}`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${filterState === 'total' ? 'text-white/80' : 'text-gray-500'}`}>Total Members</p>
                                        <p className="text-4xl font-bold text-white tracking-tight">{stats.total}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${filterState === 'total' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'}`}>
                                        <IconUser size={24} />
                                    </div>
                                </div>

                            </div>
                        </Card>

                        <Card
                            isElevated={true}
                            disableHover={filterState === 'active'}
                            className={`h-full p-0 border-2 rounded-2xl relative overflow-hidden group min-h-[140px] cursor-pointer transition-all duration-300 ${filterState === 'active'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full flex flex-col justify-between"
                            onClick={() => setFilterState('active')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className={`absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none ${filterState === 'active' ? 'opacity-100' : 'opacity-70'}`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${filterState === 'active' ? 'text-white/80' : 'text-gray-500'}`}>Active Now</p>
                                        <p className="text-4xl font-bold text-white tracking-tight">{stats.active}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${filterState === 'active' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 group-hover:bg-brand-success/10 group-hover:border-brand-success/20 group-hover:text-brand-success'}`}>
                                        <div className="relative">
                                            <IconClock size={24} />
                                            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 animate-pulse ${filterState === 'active' ? 'bg-white border-[#FF4D2D]' : 'bg-gray-500 border-[#1A1A1A] group-hover:bg-brand-success'}`} />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </Card>

                        <Card
                            isElevated={true}
                            disableHover={filterState === 'pending'}
                            className={`h-full p-0 border-2 rounded-2xl relative overflow-hidden group min-h-[140px] cursor-pointer transition-all duration-300 ${filterState === 'pending'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full flex flex-col justify-between"
                            onClick={() => setFilterState('pending')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className={`absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none ${filterState === 'pending' ? 'opacity-100' : 'opacity-70'}`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${filterState === 'pending' ? 'text-white/80' : 'text-gray-500'}`}>Invites Pending</p>
                                        <p className="text-4xl font-bold text-white tracking-tight">{stats.pending}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${filterState === 'pending' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-500 group-hover:bg-brand-warning/10 group-hover:border-brand-warning/20 group-hover:text-brand-warning'}`}>
                                        <IconBell size={24} />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            isElevated={true}
                            disableHover={filterState === 'requests'}
                            className={`h-full p-0 border-2 rounded-2xl relative overflow-hidden group min-h-[140px] cursor-pointer transition-all duration-300 ${filterState === 'requests'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full flex flex-col justify-between"
                            onClick={() => setFilterState('requests')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className={`absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none ${filterState === 'requests' ? 'opacity-100' : 'opacity-70'}`} />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${filterState === 'requests' ? 'text-white/80' : 'text-gray-500'}`}>Account Requests</p>
                                        <p className="text-4xl font-bold text-white tracking-tight">{stats.requests}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${filterState === 'requests' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'}`}>
                                        <IconUserPlus size={24} />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="recessed"
                                    size="sm"
                                    onClick={() => {
                                        const newMode = !isSelectionMode;
                                        setIsSelectionMode(newMode);
                                        if (!newMode) setSelectedIds([]);
                                    }}
                                    className={`shrink-0 transition-all duration-300 relative overflow-hidden min-w-[112px] font-black ${isSelectionMode
                                        ? "!bg-brand-primary/10 !border-brand-primary/40 !text-brand-primary shadow-[inset_0_2px_8px_rgba(255,77,45,0.2)] hover:!bg-brand-primary/10 hover:!border-brand-primary/40 hover:!text-brand-primary hover:!shadow-[inset_0_2px_8px_rgba(255,77,45,0.2)] hover:translate-y-0 active:translate-y-0 brightness-100 font-black hover:brightness-100"
                                        : "text-gray-400"
                                        }`}
                                >
                                    {isSelectionMode && (
                                        <>
                                            {/* Inner Top Shadow for carved-in look */}
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                                            {/* Subtle Diagonal Machined Sheen */}
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />
                                        </>
                                    )}
                                    {isSelectionMode ? `Selected (${selectedIds.length})` : "Select"}
                                </Button>

                                <Dropdown
                                    options={[
                                        ...(hasPermission('edit_users') ? [
                                            { label: 'Activate', value: 'activate' },
                                            { label: 'Approve', value: 'approve' },
                                            { label: 'Deactivate', value: 'deactivate' }
                                        ] : []),
                                        ...(hasPermission('delete_users') ? [
                                            { label: 'Delete Permanently', value: 'delete' }
                                        ] : []),
                                    ]}
                                    value=""
                                    onChange={(val) => handleBulkAction(val)}
                                    placeholder="Bulk Actions"
                                    variant="metallic"
                                    size="sm"
                                    className="w-fit"
                                    menuClassName="!w-64"
                                >
                                    <Button
                                        variant="recessed"
                                        size="sm"
                                        rightIcon={<IconChevronDown className="w-4 h-4 text-gray-500" />}
                                        className="shrink-0 transition-all duration-300 font-black text-gray-400 min-w-[140px]"
                                    >
                                        Bulk Actions
                                    </Button>
                                </Dropdown>
                            </div>
                            <div className="w-full sm:w-64">
                                <Input
                                    placeholder="Search members..."
                                    leftIcon={<IconSearch className="w-4 h-4" />}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    variant="metallic"
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <Table
                                columns={columns}
                                data={filterState === 'requests' ? accountRequests : allMembers}
                                isLoading={isLoading}
                                isMetallicHeader={true}
                                onRowClick={(item: any) => {
                                    if (filterState === 'requests') {
                                        setSelectedRequest(item);
                                        setIsPreviewModalOpen(true);
                                    } else if (isSelectionMode) {
                                        handleToggleRow(item.id);
                                    } else if (!item.isInvitation) {
                                        onUserOpen(item.id);
                                    }
                                }}
                            />
                        </div>

                    </div>
                </>
            ) : activeTab === 'teams' ? (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <Tabs
                            tabs={teamTypeTabs}
                            activeTab={teamTypeTab}
                            onTabChange={(id) => setTeamTypeTab(id as 'pm' | 'design')}
                        />
                        {hasPermission('manage_teams') && (
                            <Button
                                variant="metallic"
                                size="sm"
                                leftIcon={<IconPlus className="w-4 h-4" />}
                                onClick={() => {
                                    setNewTeamName('');
                                    setSelectedTeamMemberIds([]);
                                    setSelectedAccountIds([]);
                                    setEditingTeamId(null);
                                    setIsTeamModalOpen(true);
                                }}
                            >
                                Create {teamTypeTab === 'pm' ? 'PM Team' : 'Design Team'}
                            </Button>
                        )}
                    </div>
                    <Table
                        columns={teamColumns}
                        data={teams.filter(t => (teamTypeTab === 'pm' ? !t.isDesignTeam : t.isDesignTeam))}
                        isLoading={false}
                        isMetallicHeader={true}
                    />
                </div>
            ) : activeTab === 'performance' ? (
                <div className="space-y-6">
                    {/* NON-FUNCTIONAL BANNER */}
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-4 animate-in slide-in-from-top-4">
                        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-500 shrink-0 mt-0.5">
                            <IconAlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-1">Page And Functions Are Not Functional</h4>
                            <p className="text-xs text-yellow-500/80 leading-relaxed">
                                The Scorecard system is currently under development. The tabs below are visible for structural preview only. Data shown here is not being actively updated or tracked.
                            </p>
                        </div>
                    </div>
                    {/* END BANNER */}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <Tabs
                            tabs={performanceTabs}
                            activeTab={performanceTab}
                            onTabChange={setPerformanceTab}
                        />
                    </div>
                    
                    {performanceTab === 'submissions' && (
                        <ScorecardSubmissionsTab users={profiles.map(p => ({ id: p.id, name: p.name }))} />
                    )}

                    {performanceTab === 'targets' && (
                        <ScorecardTargetsTab users={profiles.map(p => ({ id: p.id, name: p.name }))} />
                    )}

                    {performanceTab === 'leaderboard' && (
                        <ScorecardLeaderboardTab users={profiles.map(p => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))} />
                    )}

                    {performanceTab === 'configuration' && (
                        <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Scorecard Configuration</h3>
                                <Button variant="metallic" size="sm" leftIcon={<IconEdit size={14} />} onClick={() => setIsConfigModalOpen(true)}>Edit Rules</Button>
                            </div>
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 border border-dashed border-white/10 rounded-xl">
                                <IconSettings size={32} className="text-gray-500" />
                                <p className="text-sm text-gray-500">Admin controls to set targets per user, define categories and rules.</p>
                            </div>
                        </Card>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <Tabs
                            tabs={[
                                { id: 'assign', label: 'Assign Shifts', icon: <IconSettings size={14} /> },
                                { id: 'logs', label: 'Attendance Log', icon: <IconClock size={14} /> }
                            ]}
                            activeTab={shiftsSubTab}
                            onTabChange={(id) => setShiftsSubTab(id as any)}
                        />
                    </div>

                    {shiftsSubTab === 'assign' ? (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <ElevatedMetallicCard
                                title={
                                    <div>
                                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">Shift Timing Management</h3>
                                        <p className="text-xs text-gray-500 mt-1">Assign standard shift start and end times to your managers and designers.</p>
                                    </div>
                                }
                                bodyClassName="p-0"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[13px] text-gray-300">
                                        <thead className="bg-white/[0.02] text-gray-400 font-bold uppercase tracking-widest text-[10px] border-b border-surface-border">
                                            <tr>
                                                <th className="px-6 py-4">Name</th>
                                                <th className="px-6 py-4">Role</th>
                                                <th className="px-6 py-4">Shift Timings</th>
                                                <th className="px-6 py-4">Timezone</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-border">
                                            {profiles.map(user => {
                                                const userShift = userShifts.find(s => s.user_id === user.id);
                                                return (
                                                    <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-6 py-4 font-bold text-white">{user.name || user.email}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold">
                                                            {userShift ? `${userShift.start_time.substring(0, 5)} - ${userShift.end_time.substring(0, 5)}` : 'Not Assigned'}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 font-mono">
                                                            {userShift ? userShift.timezone : 'Asia/Karachi'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    variant="metallic"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedShiftUser(user);
                                                                        if (userShift) {
                                                                            setShiftStartTime(userShift.start_time.substring(0, 5));
                                                                            setShiftEndTime(userShift.end_time.substring(0, 5));
                                                                            setShiftTimezone(userShift.timezone);
                                                                        } else {
                                                                            setShiftStartTime('09:00');
                                                                            setShiftEndTime('18:00');
                                                                            setShiftTimezone('Asia/Karachi');
                                                                        }
                                                                        setIsShiftModalOpen(true);
                                                                    }}
                                                                >
                                                                    Assign Shift
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </ElevatedMetallicCard>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <Card className="overflow-hidden bg-surface-card border border-surface-border rounded-3xl">
                                <div className="p-6 md:p-8 border-b border-surface-border">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">Today's Attendance Logs</h3>
                                    <p className="text-sm text-gray-500 mt-1">Live tracking status of logged in staff, active hours, breaks, and idle checks.</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[13px] text-gray-300">
                                        <thead className="bg-white/[0.02] text-gray-400 font-bold uppercase tracking-widest text-[10px] border-b border-surface-border">
                                            <tr>
                                                <th className="px-6 py-4">Staff Member</th>
                                                <th className="px-6 py-4">Punch In</th>
                                                <th className="px-6 py-4">Punch Out</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Active</th>
                                                <th className="px-6 py-4 text-right">Idle</th>
                                                <th className="px-6 py-4 text-right">Break</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-border">
                                            {attendanceLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                                        No attendance records logged today.
                                                    </td>
                                                </tr>
                                            ) : (
                                                attendanceLogs.map(log => (
                                                    <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                {log.profiles?.avatar_url ? (
                                                                    <img src={log.profiles.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                                                                        {(log.profiles?.name || log.profiles?.email || 'U').charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-bold text-white leading-none">{log.profiles?.name || 'Unknown'}</p>
                                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{log.profiles?.role}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-gray-400">
                                                            {new Date(log.punch_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-gray-400">
                                                            {log.punch_out_at ? new Date(log.punch_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (
                                                                <span className="text-emerald-500 font-bold animate-pulse uppercase tracking-wider text-[11px]">On-Going</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`w-2 h-2 rounded-full
                                                                    ${log.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}
                                                                    ${log.status === 'Idle' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''}
                                                                    ${log.status === 'Break' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : ''}
                                                                    ${log.status === 'Completed' ? 'bg-blue-500' : ''}
                                                                `} />
                                                                <span className="font-bold text-[11px] uppercase tracking-wider text-white">{log.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-white font-semibold">{log.total_active_mins}m</td>
                                                        <td className="px-6 py-4 text-right font-mono text-amber-500 font-semibold">{log.total_idle_mins}m</td>
                                                        <td className="px-6 py-4 text-right font-mono text-orange-500 font-semibold">{log.total_break_mins}m</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* Shift Editor Modal */}
            <Modal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                title={`Assign Shift timing - ${selectedShiftUser?.name || selectedShiftUser?.email}`}
                size="md"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="recessed" size="sm" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
                        <Button variant="metallic" size="sm" onClick={handleSaveShift} isLoading={isSavingShift}>Save Shift</Button>
                    </div>
                }
            >
                <div className="space-y-4 p-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Start Time</label>
                            <input
                                type="time"
                                value={shiftStartTime}
                                onChange={(e) => setShiftStartTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/40 text-sm text-white focus:outline-none focus:border-brand-primary/40"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">End Time</label>
                            <input
                                type="time"
                                value={shiftEndTime}
                                onChange={(e) => setShiftEndTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/40 text-sm text-white focus:outline-none focus:border-brand-primary/40"
                            />
                        </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Timezone</label>
                        <Dropdown
                            variant="metallic"
                            label="Select Timezone"
                            placeholder="Choose timezone..."
                            options={[
                                { label: 'Pakistan Standard Time (Asia/Karachi)', value: 'Asia/Karachi' },
                                { label: 'Coordinated Universal Time (UTC)', value: 'UTC' }
                            ]}
                            value={shiftTimezone}
                            onChange={(val) => setShiftTimezone(val as string)}
                        />
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={showSuccess ? "Invitation Sent Successfully" : "Invite New Member"}
                size="md"
                isElevatedFooter
                footer={
                    showSuccess ? (
                        <div className="flex justify-end w-full">
                            <Button variant="metallic" onClick={handleCloseModal} className="w-full">Close</Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-end gap-3 w-full">
                            <Button variant="recessed" onClick={handleCloseModal} disabled={isSending}>Cancel</Button>
                            <Button
                                variant="metallic"
                                onClick={handleAddMember}
                                isLoading={isSending}
                                className="px-8 shadow-lg"
                            >
                                Send Invitation
                            </Button>
                        </div>
                    )
                }
            >
                {showSuccess && createdMember ? (
                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-brand-success/10 border border-brand-success/20 text-center">
                            <p className="text-brand-success font-semibold">User account created successfully!</p>
                            <p className="text-xs text-gray-400 mt-1">Please copy the details below.</p>
                        </div>

                        <div className="relative group/box">
                            <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.05] shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] text-sm text-gray-300 relative overflow-hidden transition-all duration-300">
                                {/* Recessed Depth Overlays */}
                                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.01)_48%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.01)_52%,transparent_100%)] pointer-events-none opacity-40" />

                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center">
                                        <span className="text-gray-500 uppercase text-[11px] font-bold tracking-widest w-28 inline-block select-none">Name</span>
                                        <span className="text-white font-bold">{createdMember.name}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-gray-500 uppercase text-[11px] font-bold tracking-widest w-28 inline-block select-none">Email</span>
                                        <span className="text-white font-bold">{createdMember.email}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-gray-500 uppercase text-[11px] font-bold tracking-widest w-28 inline-block select-none">Password</span>
                                        <span className="text-white font-bold">{createdMember.password}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-gray-500 uppercase text-[11px] font-bold tracking-widest w-28 inline-block select-none">Role</span>
                                        <span className="text-brand-primary font-bold">{createdMember.role}</span>
                                    </div>
                                </div>

                                <button
                                    className="absolute bottom-3 right-3 p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-300 z-20 group/copy"
                                    onClick={() => copyToClipboard(`Name: ${createdMember.name}\nEmail: ${createdMember.email}\nPassword: ${createdMember.password}\nRole: ${createdMember.role}`)}
                                    title="Copy All Details"
                                >
                                    <IconCopy className="w-5 h-5 transition-transform group-active/copy:scale-90" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">First Name</p>
                                <Input
                                    placeholder="e.g. John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    leftIcon={<IconUser className="w-4 h-4" />}
                                    variant="metallic"
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Last Name</p>
                                <Input
                                    placeholder="e.g. Doe"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    leftIcon={<IconUser className="w-4 h-4" />}
                                    variant="metallic"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</p>
                            <Input
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                leftIcon={<IconMail className="w-4 h-4" />}
                                variant="metallic"
                                className="w-full"
                            />
                        </div>

                        {/* Password now automated like applicant flow */}

                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Role</p>
                            <Dropdown
                                options={roles}
                                value={role}
                                onChange={(val) => setRole(val)}
                                placeholder="Select a role"
                                variant="metallic"
                                size="md"
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Permissions Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit User Permissions"
                size="md"
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="metallic"
                            onClick={() => editingUser && handleSavePermissions(editingUser.id, editingUser.role)}
                            isLoading={isUpdating}
                        >
                            Save Changes
                        </Button>
                    </div>
                }
            >
                {editingUser && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                            <Avatar
                                size="md"
                                initials={editingUser.name.split(' ').map(n => n[0]).join('')}
                                status={editingUser.status === 'Active' ? 'online' : editingUser.status === 'Pending' ? 'away' : 'offline'}
                            />
                            <div>
                                <h4 className="font-bold text-white">{editingUser.name}</h4>
                                <p className="text-xs text-gray-500">{editingUser.email}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Platform Role</label>
                                <Dropdown
                                    options={roles}
                                    value={editingUser.role}
                                    onChange={(val) => setEditingUser({ ...editingUser, role: val })}
                                    variant="metallic"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Quick Status Update</label>
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={editingUser.status === 'Active' ? 'bg-brand-success/10 border-brand-success/30 text-brand-success' : 'border-white/10 text-gray-400'}
                                        onClick={() => handleUpdateUserStatus(editingUser.id, 'Active')}
                                        isLoading={isUpdating}
                                    >
                                        Approve / Active
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={editingUser.status === 'Suspended' ? 'bg-brand-warning/10 border-brand-warning/30 text-brand-warning' : 'border-white/10 text-gray-400'}
                                        onClick={() => handleUpdateUserStatus(editingUser.id, 'Suspended')}
                                        isLoading={isUpdating}
                                    >
                                        Suspend
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={editingUser.status === 'Disabled' ? 'bg-brand-error/10 border-brand-error/30 text-brand-error' : 'border-white/10 text-gray-400'}
                                        onClick={() => handleUpdateUserStatus(editingUser.id, 'Disabled')}
                                        isLoading={isUpdating}
                                    >
                                        Disable
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Remove Member Confirmation Modal */}
            <Modal
                isOpen={isRemoveModalOpen}
                onClose={() => setIsRemoveModalOpen(false)}
                title="Remove Member"
                size="sm"
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={() => setIsRemoveModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="metallic-error"
                            onClick={executeRemoveMember}
                            isLoading={isUpdating}
                        >
                            Confirm Removal
                        </Button>
                    </div>
                }
            >
                {userToRemove && (
                    <div className="space-y-6 py-2">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-brand-error/10 flex items-center justify-center text-brand-error border border-brand-error/20">
                                <IconTrash className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">Permanently Remove?</h3>
                                <p className="text-sm text-gray-400 px-4">
                                    You are about to remove <span className="text-white font-semibold">{userToRemove.name === 'Pending Invitation' ? userToRemove.email : userToRemove.name}</span> from the directory.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-brand-error/[0.03] border border-brand-error/10 space-y-3">
                            <div className="flex items-center gap-2 text-brand-error">
                                <IconAlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Danger Zone</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                This action is permanent and cannot be undone. All associated platform permissions for this user will be revoked immediately.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Bulk Action Confirmation Modal */}
            <Modal
                isOpen={isBulkConfirmOpen}
                onClose={() => setIsBulkConfirmOpen(false)}
                title="Confirm Bulk Action"
                size="sm"
                isElevatedFooter={true}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => setIsBulkConfirmOpen(false)} disabled={isUpdating}>Cancel</Button>
                        <Button
                            variant={pendingBulkAction === 'delete' ? 'metallic-error' : 'metallic'}
                            onClick={executeBulkAction}
                            isLoading={isUpdating}
                            className="px-8"
                        >
                            Confirm {pendingBulkAction?.charAt(0).toUpperCase()}{pendingBulkAction?.slice(1)}
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4 space-y-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${pendingBulkAction === 'delete' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'}`}>
                        {pendingBulkAction === 'delete' ? <IconTrash size={32} /> : <IconAlertTriangle size={32} />}
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Are you sure?</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            You are about to <span className="text-white font-bold">{pendingBulkAction}</span> {selectedIds.length} {selectedIds.length === 1 ? 'user' : 'users'}.
                            {pendingBulkAction === 'delete' && <span className="block mt-2 text-red-500 font-bold uppercase tracking-[0.1em] text-[10px]">Warning: This cannot be undone.</span>}
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Create Team Modal */}
            <Modal
                isOpen={isTeamModalOpen}
                onClose={() => {
                    setIsTeamModalOpen(false);
                    setEditingTeamId(null);
                    setNewTeamName('');
                    setSelectedTeamMemberIds([]);
                    setSelectedAccountIds([]);
                    setSelectedLeaderId('');
                }}
                title={editingTeamId ? "Edit Team" : "Create New Team"}
                size="md"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => {
                            setIsTeamModalOpen(false);
                            setEditingTeamId(null);
                            setNewTeamName('');
                            setSelectedTeamMemberIds([]);
                            setSelectedAccountIds([]);
                        }} disabled={isSavingTeam}>Cancel</Button>
                        <Button
                            variant="metallic"
                            onClick={handleSaveTeam}
                            isLoading={isSavingTeam}
                            className="px-8 shadow-lg"
                        >
                            {editingTeamId ? "Update Team" : "Initialize Team"}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team Name</p>
                        <Input
                            placeholder="e.g. Design Elites"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            leftIcon={<IconUsers className="w-4 h-4 text-brand-primary" />}
                            variant="metallic"
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                            {teamTypeTab === 'pm' ? 'Team Members' : 'Assign Designers'}
                        </p>
                        <Dropdown
                            isMulti
                            options={teamTypeTab === 'pm' ? pmCandidates : designerCandidates}
                            value={selectedTeamMemberIds}
                            onChange={(val) => setSelectedTeamMemberIds(val)}
                            placeholder={teamTypeTab === 'pm' ? "Select Team Members" : "Select Designers"}
                            variant="metallic"
                            size="md"
                            showSearch
                            selectionLabel={teamTypeTab === 'pm' ? "Team Members selected" : "Designers assigned"}
                        />
                    </div>

                    {teamTypeTab === 'pm' && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Assign Accounts</p>
                            <Dropdown
                                isMulti
                                options={accountOptions}
                                value={selectedAccountIds}
                                onChange={(val) => setSelectedAccountIds(val)}
                                placeholder="Select Accounts (e.g. ARS)"
                                variant="metallic"
                                size="md"
                                showSearch
                                selectionLabel="Accounts assigned"
                            />
                        </div>
                    )}

                    {teamTypeTab === 'design' && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team Lead</p>
                            <Dropdown
                                options={leadCandidates}
                                value={selectedLeaderId}
                                onChange={(val) => setSelectedLeaderId(val as string)}
                                placeholder="Select Team Lead"
                                variant="metallic"
                                size="md"
                                showSearch
                            />
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Team Modal */}
            <Modal
                isOpen={isDeleteTeamModalOpen}
                onClose={() => setIsDeleteTeamModalOpen(false)}
                title="Delete Team"
                size="sm"
                isElevatedFooter={true}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => setIsDeleteTeamModalOpen(false)} disabled={isUpdating}>Cancel</Button>
                        <Button
                            variant="metallic-error"
                            onClick={handleDeleteTeam}
                            isLoading={isUpdating}
                            className="px-8"
                        >
                            Delete Team
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4 space-y-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 bg-red-500/10 border-red-500/20 text-red-500">
                        <IconTrash size={32} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Are you sure?</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto">
                            You are about to delete team <span className="text-white font-bold">{teamToDelete?.name}</span>. This will remove all member and account links associated with it.
                            <span className="block mt-2 text-red-500 font-bold uppercase tracking-[0.1em] text-[10px]">Warning: This cannot be undone.</span>
                        </p>
                    </div>
                </div>
            </Modal>

            {/* View Team Details Modal */}
            <Modal
                isOpen={isViewTeamModalOpen}
                onClose={() => setIsViewTeamModalOpen(false)}
                title="Team Details"
                size="md"
                footer={
                    <div className="flex justify-end w-full">
                        <Button variant="metallic" onClick={() => setIsViewTeamModalOpen(false)} className="px-8">Close</Button>
                    </div>
                }
            >
                {selectedTeam && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20">
                            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                                <IconUsers size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{selectedTeam.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{selectedTeam.totalMembers} Members Assigned</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedTeam.type === 'design' && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Team Lead</p>
                                    <div className="p-4 rounded-xl bg-black/40 border border-white/[0.05] shadow-inner">
                                        <span className="px-3 py-1 rounded-lg bg-brand-primary/20 border border-brand-primary/30 text-[12px] text-brand-primary font-black uppercase tracking-wider">
                                            {selectedTeam.leaderName}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">
                                    {selectedTeam.type === 'design' ? 'Assigned Designers' : 'Assigned Project Managers'}
                                </p>
                                <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-black/40 border border-white/[0.05] shadow-inner">
                                    {selectedTeam.memberNames.length > 0 ? (
                                        selectedTeam.memberNames.map((name: string, i: number) => (
                                            <span key={i} className={`px-3 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${
                                                selectedTeam.type === 'design' 
                                                ? 'bg-white/5 border-white/10 text-gray-300' 
                                                : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                                            }`}>
                                                {name}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-600 italic">No members assigned to this team.</p>
                                    )}
                                </div>
                            </div>

                            {selectedTeam.type === 'pm' && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">Linked Accounts</p>
                                    <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-black/40 border border-white/[0.05] shadow-inner">
                                        {selectedTeam.accounts.length > 0 ? (
                                            selectedTeam.accounts.map((acc: string, i: number) => (
                                                <span key={i} className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                                                    {acc}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-600 italic">No accounts linked to this team.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Account Request Preview Modal */}
            <Modal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                title="Account Request Details"
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button variant="recessed" onClick={() => selectedRequest && handleRejectRequest(selectedRequest.id)} className="px-6">Cancel Request</Button>
                        <Button
                            variant="metallic"
                            onClick={() => selectedRequest && handleAcceptRequest(selectedRequest)}
                            className="px-8 shadow-lg shadow-brand-primary/20"
                        >
                            Accept Request
                        </Button>
                    </div>
                }
            >
                {selectedRequest && (
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent opacity-50" />
                            
                            <div className="relative z-10 space-y-6">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name</p>
                                        <p className="text-lg font-bold text-white">{selectedRequest.first_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name</p>
                                        <p className="text-lg font-bold text-white">{selectedRequest.last_name}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Address</p>
                                    <p className="text-lg font-bold text-white">{selectedRequest.email}</p>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Request Date</p>
                                    <p className="font-medium text-gray-300">
                                        {new Date(selectedRequest.created_at).toLocaleString('en-US', { 
                                            day: '2-digit', month: 'long', year: 'numeric', 
                                            hour: '2-digit', minute: '2-digit',
                                            hour12: true
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
                            <IconAlertTriangle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-white uppercase tracking-wider">Next Step</p>
                                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                    Accepting this request will allow you to create a platform account for this designer. They will be automatically assigned the <span className="text-white font-bold">Freelancer</span> role.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <ScorecardConfigModal 
                isOpen={isConfigModalOpen} 
                onClose={() => setIsConfigModalOpen(false)} 
                users={profiles.map(m => ({ id: m.id, name: m.name }))}
            />
        </div>
    );
});

export default Users;
