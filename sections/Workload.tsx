import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../contexts/NotificationContext';
import { Card } from '../components/Surfaces';
import { Input } from '../components/Input';
import Button from '../components/Button';
import { IconSearch, IconRefreshCw, IconUsers, IconCheckCircle, IconClock, IconAlertTriangle, IconZap, IconActivity } from '../components/Icons';
import { Table } from '../components/Table';
import { Avatar } from '../components/Avatar';
import { formatDisplayName } from '../utils/formatter';
import { getStatusCapsuleClasses } from '../components/Badge';
import { addToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { IconLock } from '../components/Icons';

interface FreelancerStats {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    daily_capacity: number;
    assigned_24h: number;
    done_24h: number;
    in_progress_24h: number;
    total_in_progress: number;
    in_progress_amount: number;
    total_in_revision: number;
    in_revision_amount: number;
    total_in_urgent: number;
    in_urgent_amount: number;
    remaining_capacity: number;
}

export default function Workload() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<FreelancerStats[]>([]);
    const [totalSystemInProgress, setTotalSystemInProgress] = useState(0);
    const [totalSystemInProgressAmount, setTotalSystemInProgressAmount] = useState(0);
    const [totalSystemInRevision, setTotalSystemInRevision] = useState(0);
    const [totalSystemInRevisionAmount, setTotalSystemInRevisionAmount] = useState(0);
    const [totalSystemUrgent, setTotalSystemUrgent] = useState(0);
    const [totalSystemUrgentAmount, setTotalSystemUrgentAmount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCapacity, setEditingCapacity] = useState<{ id: string, value: string } | null>(null);
    const { profile, effectiveRole, hasPermission } = useUser();
    const canEditCapacity = hasPermission('edit_workload');
    const roleLower = effectiveRole?.toLowerCase().trim();

    const [tlUnassignedCount, setTlUnassignedCount] = useState(0);
    const [tlUnassignedAmount, setTlUnassignedAmount] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const isTeamLead = roleLower === 'team lead';
            const isAdmin = roleLower === 'super admin' || roleLower === 'admin';

            let memberIds: string[] = [];
            if (isTeamLead && profile?.id) {
                // 1a. Get teams where user is leader (any type)
                const { data: teams } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('leader_id', profile.id);

                if (teams && teams.length > 0) {
                    const teamIds = teams.map(t => t.id);
                    // 1b. Get members for these teams
                    const { data: teamMembers } = await supabase
                        .from('team_members')
                        .select('member_id')
                        .in('team_id', teamIds);

                    if (teamMembers) {
                        const ids = teamMembers.map(tm => tm.member_id);
                        memberIds = [...new Set([...memberIds, ...ids])];
                    }
                }
            }

            // 1c. Fetch Freelancers and Designers + Revenue Data
            let profilesQuery = supabase.from('profiles')
                .select('id, name, email, role, daily_capacity, avatar_url')
                .or('role.ilike.%freelancer%,role.ilike.%designer%,role.ilike.%presentation%,role.ilike.%lead%');

            if (isTeamLead) {
                profilesQuery = profilesQuery.in('id', memberIds);
            }

            const [freelancersRes, commissionsRes, slabsRes] = await Promise.all([
                profilesQuery,
                supabase.from('platform_commissions')
                    .select('*, platform_commission_accounts(account_id)'),
                supabase.from('pricing_slabs')
                    .select('*')
                    .order('min_price', { ascending: true })
            ]);

            if (freelancersRes.error) throw freelancersRes.error;
            const freelancers = freelancersRes.data;

            const platformCommissions = (commissionsRes.data || []).map(item => ({
                ...item,
                assigned_account_ids: item.platform_commission_accounts?.map((r: any) => r.account_id) || []
            }));
            const pricingSlabs = slabsRes.data || [];

            // 2. Fetch Projects created TODAY (Calendar Day: 00:00 to 23:59)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select('project_id, assignee, assignee_id, team_designer_id, status, created_at, price, account_id, designer_fee, team_payout, team_designer_fee')
                .or(`created_at.gte.${todayStart.toISOString()},status.not.in.(Approved,Delivered,Cancelled)`)
                .lte('created_at', todayEnd.toISOString());

            if (projectsError) throw projectsError;

            // 3. Process the data
            const statsMap: Record<string, FreelancerStats> = {};
            const lookupMap: Record<string, FreelancerStats> = {}; // Maps BOTH name and email to the same object

            // Create a special entry for Unassigned / Non-Freelancer projects
            const unassignedStat: FreelancerStats = {
                id: 'unassigned',
                name: 'Unassigned / Others',
                email: 'system@internal',
                avatar_url: undefined,
                daily_capacity: 0,
                assigned_24h: 0,
                done_24h: 0,
                in_progress_24h: 0,
                total_in_progress: 0,
                in_progress_amount: 0,
                total_in_revision: 0,
                in_revision_amount: 0,
                total_in_urgent: 0,
                in_urgent_amount: 0,
                remaining_capacity: 0
            };

            (freelancers || []).forEach(f => {
                const displayName = f.name || f.email;
                const statObj: FreelancerStats = {
                    id: f.id,
                    name: displayName,
                    email: f.email,
                    avatar_url: f.avatar_url,
                    daily_capacity: f.daily_capacity || 5,
                    assigned_24h: 0,
                    done_24h: 0,
                    in_progress_24h: 0,
                    total_in_progress: 0,
                    in_progress_amount: 0,
                    total_in_revision: 0,
                    in_revision_amount: 0,
                    total_in_urgent: 0,
                    in_urgent_amount: 0,
                    remaining_capacity: f.daily_capacity || 5
                };
                statsMap[f.id] = statObj;

                // Map by both name and email for flexible lookup from projects
                if (f.name) lookupMap[f.name.toLowerCase()] = statObj;
                if (f.email) lookupMap[f.email.toLowerCase()] = statObj;
            });

            let systemInProgress = 0;
            const syncFixes: { project_id: string; assignee: string }[] = [];

            let currentTlUnassignedCount = 0;
            let currentTlUnassignedAmount = 0;

            // Map projects
            (projects || []).forEach(p => {
                const projectStatus = (p.status || 'in progress').toLowerCase().trim();
                const isFinished = ['done', 'approved', 'cancelled'].includes(projectStatus) || projectStatus.includes('done');
                const isProgress = ['in progress', 'urgent', 'sent for approval'].includes(projectStatus);
                const isRevision = ['revision', 'revision urgent'].includes(projectStatus);
                const isUrgent = projectStatus === 'urgent' || projectStatus === 'revision urgent';

                // 1. System-wide "In Progress" count
                if (isProgress) {
                    systemInProgress += 1;
                }

                // 2. Freelancer lookup with Auto-Heal (Prioritize UUID matches)
                let stat = null;

                if (p.assignee_id && statsMap[p.assignee_id]) {
                    stat = statsMap[p.assignee_id];
                } else if (p.team_designer_id && statsMap[p.team_designer_id]) {
                    stat = statsMap[p.team_designer_id];
                } else if (p.assignee) {
                    // Try exact DB match
                    stat = lookupMap[p.assignee.toLowerCase()];

                    if (!stat) {
                        // DB has dirty data (trailing spaces, case issues, etc.)
                        const normalizedStr = p.assignee.trim().toLowerCase();
                        stat = lookupMap[normalizedStr];

                        // If we successfully found them via normalization, schedule a background DB fix
                        if (stat) {
                            syncFixes.push({
                                project_id: p.project_id,
                                assignee: stat.name // The authoritative strict name
                            });
                        }
                    }
                }

                // Fallback to unassigned
                if (!stat) stat = unassignedStat;

                const createdAt = new Date(p.created_at);
                const isCreatedToday = createdAt >= todayStart && createdAt <= todayEnd;

                // 24h Metrics
                if (isCreatedToday) {
                    stat.assigned_24h += 1;
                    if (isFinished) {
                        stat.done_24h += 1;
                    } else if (isProgress || isRevision) {
                        stat.in_progress_24h += 1;
                    }
                }

                // Total Active Workload & Revisions
                if (isProgress || isRevision) {
                    // Calculate the specific payout value for THIS row based on viewer role
                    let rowVal = 0;

                    if (isTeamLead) {
                        // For Team Lead: Show the total Designer Fee (Gross for their team)
                        // This corresponds to what the TL considers "their" project amount
                        rowVal = Number(p.designer_fee) || 0;
                    } else {
                        // For Admin: Show Company Profit
                        const price = Number(p.price) || 0;
                        const accountId = p.account_id;
                        const commission = platformCommissions.find(pc => pc.assigned_account_ids.includes(accountId));
                        const commissionFactor = commission ? (Number(commission.commission_percentage) > 1 ? Number(commission.commission_percentage) / 100 : Number(commission.commission_percentage)) : 0;
                        const platformCut = price * commissionFactor;
                        const totalDesignerFee = Number(p.designer_fee) || 0;
                        rowVal = Math.max(0, price - platformCut - totalDesignerFee);
                    }

                    if (isProgress) {
                        stat.total_in_progress += 1;
                        stat.in_progress_amount += rowVal;
                    } else if (isRevision) {
                        stat.total_in_revision += 1;
                        stat.in_revision_amount += rowVal;
                    }

                    if (isUrgent) {
                        stat.total_in_urgent += 1;
                        stat.in_urgent_amount += rowVal;
                    }

                    // Track TL's specific unassigned queue (Held by TL but no designer yet)
                    if (isTeamLead && p.assignee_id === profile.id && !p.team_designer_id) {
                        currentTlUnassignedCount++;
                        currentTlUnassignedAmount += rowVal;
                    }
                }
            });

            // Execute Background Data Sync for dirty assignee strings
            if (syncFixes.length > 0) {
                console.log(`Auto-healing ${syncFixes.length} assignment records in background...`);
                // Run outside the main render blocking flow
                setTimeout(async () => {
                    const BATCH_SIZE = 10;
                    for (let i = 0; i < syncFixes.length; i += BATCH_SIZE) {
                        const batch = syncFixes.slice(i, i + BATCH_SIZE);
                        const { error: syncError } = await supabase
                            .from('projects')
                            .upsert(batch, { onConflict: 'project_id' });
                        if (syncError) console.error('Silent assignment sync failed:', syncError);
                    }
                }, 1000);
            }

            // Filter out empty unassigned row if it has no activity
            const finalStats = Object.values(statsMap);
            // Hide unassigned for Team Leads to keep it focused on their team only
            const showUnassigned = roleLower === 'super admin' || roleLower === 'admin';

            if (showUnassigned && (unassignedStat.total_in_progress > 0 || unassignedStat.assigned_24h > 0)) {
                finalStats.push(unassignedStat);
            }

            // Calculate remaining capacity
            finalStats.forEach(stat => {
                if (stat.id !== 'unassigned') {
                    stat.remaining_capacity = Math.max(0, stat.daily_capacity - stat.assigned_24h);
                }
            });

            const totalActiveLoad = finalStats.reduce((acc, curr) => acc + curr.total_in_progress, 0);
            const totalActiveAmount = finalStats.reduce((acc, curr) => acc + curr.in_progress_amount, 0);
            const totalRevisionLoad = finalStats.reduce((acc, curr) => acc + curr.total_in_revision, 0);
            const totalRevisionAmount = finalStats.reduce((acc, curr) => acc + curr.in_revision_amount, 0);
            const totalUrgentLoad = finalStats.reduce((acc, curr) => acc + curr.total_in_urgent, 0);
            const totalUrgentAmount = finalStats.reduce((acc, curr) => acc + curr.in_urgent_amount, 0);
            
            setTotalSystemInProgress(totalActiveLoad);
            setTotalSystemInProgressAmount(totalActiveAmount);
            setTotalSystemInRevision(totalRevisionLoad);
            setTotalSystemInRevisionAmount(totalRevisionAmount);
            setTotalSystemUrgent(totalUrgentLoad);
            setTotalSystemUrgentAmount(totalUrgentAmount);

            setTlUnassignedCount(currentTlUnassignedCount);
            setTlUnassignedAmount(currentTlUnassignedAmount);

            setStats(finalStats.sort((a, b) => {
                // Keep Unassigned at the bottom always
                if (a.id === 'unassigned') return 1;
                if (b.id === 'unassigned') return -1;
                return b.remaining_capacity - a.remaining_capacity;
            }));
        } catch (error) {
            console.error('Error fetching workload data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile?.id) {
            fetchData();

            // Real-time subscription for projects and profiles
            const channel = supabase
                .channel('nova-workload-global-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
                    console.log('Workload received project update:', payload);
                    fetchData();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
                    console.log('Workload received profile update:', payload);
                    fetchData();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Workload successfully subscribed to real-time');
                    }
                });

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [profile?.id, effectiveRole]);

    const handleSaveCapacity = async (id: string) => {
        if (!editingCapacity) return;
        const newCapacity = parseInt(editingCapacity.value);
        if (isNaN(newCapacity) || newCapacity < 0) return;

        // Check if value actually changed to avoid redundant re-renders
        const currentStat = stats.find(s => s.id === id);
        if (currentStat && currentStat.daily_capacity === newCapacity) {
            setEditingCapacity(null);
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ daily_capacity: newCapacity })
                .eq('id', id);

            if (error) throw error;

            // Updated locally without reloading the entire table
            setStats(prev => prev.map(stat =>
                stat.id === id
                    ? { ...stat, daily_capacity: newCapacity, remaining_capacity: Math.max(0, newCapacity - stat.assigned_24h) }
                    : stat
            ));
        } catch (error) {
            console.error('Error saving capacity:', error);
        } finally {
            setEditingCapacity(null);
        }
    };

    const filteredStats = stats.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: 'Freelancer',
            key: 'name',
            render: (stat: FreelancerStats) => (
                <div className="flex items-center gap-3 py-1">
                    <Avatar
                        src={stat.avatar_url}
                        initials={stat.name.charAt(0).toUpperCase()}
                        size="sm"
                        className="ring-1 ring-white/10 shadow-sm rounded-lg"
                    />
                    <div>
                        <p className="font-bold text-white tracking-tight leading-none">{formatDisplayName(stat.name)}</p>
                        <p className="text-[10px] text-gray-500 mt-1 font-medium">{stat.email}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Daily Capacity',
            key: 'daily_capacity',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center items-center gap-3">
                    {editingCapacity?.id === stat.id ? (
                        <Input
                            type="number"
                            variant="metallic"
                            size="sm"
                            value={editingCapacity.value}
                            onChange={(e) => setEditingCapacity({ ...editingCapacity, value: e.target.value })}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCapacity(stat.id);
                                if (e.key === 'Escape') setEditingCapacity(null);
                            }}
                            onBlur={() => handleSaveCapacity(stat.id)}
                            className="w-16"
                            inputClassName="text-center font-bold"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div
                            className={`bg-black/30 border border-white/10 text-white font-bold px-4 py-1.5 rounded-lg transition-[background-color,color,opacity,transform,filter,backdrop-filter] duration-300 shadow-nova min-w-[3rem] text-center flex items-center justify-center gap-2 ${canEditCapacity ? 'hover:border-brand-primary/50 cursor-pointer hover:shadow-brand-primary/10' : 'cursor-not-allowed opacity-60'}`}
                            onClick={(e) => {
                                if (!canEditCapacity) return;
                                e.stopPropagation();
                                setEditingCapacity({ id: stat.id, value: stat.daily_capacity.toString() });
                            }}
                        >
                            {stat.daily_capacity}
                            {!canEditCapacity && <IconLock size={10} className="text-gray-500" />}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Assigned (Today)',
            key: 'assigned_24h',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    <div className="bg-surface-border/40 text-white font-bold text-xs w-8 h-8 flex items-center justify-center rounded-lg border border-white/5">
                        {stat.assigned_24h}
                    </div>
                </div>
            )
        },
        {
            header: 'Total In Progress',
            key: 'total_in_progress',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    {stat.total_in_progress > 0 ? (
                        <div className={getStatusCapsuleClasses('in progress')}>
                            {stat.total_in_progress} Total
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">0</span>
                    )}
                </div>
            )
        },
        {
            header: 'In Progress Amount',
            key: 'in_progress_amount',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    {stat.in_progress_amount > 0 ? (
                        <div className="inline-flex items-center text-brand-success font-black text-[13px] tracking-tighter">
                            ${stat.in_progress_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">$0</span>
                    )}
                </div>
            )
        },
        {
            header: 'Total In Revision',
            key: 'total_in_revision',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    {stat.total_in_revision > 0 ? (
                        <div className={getStatusCapsuleClasses('revision')}>
                            {stat.total_in_revision} Total
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">0</span>
                    )}
                </div>
            )
        },
        {
            header: 'In Revision Amount',
            key: 'in_revision_amount',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    {stat.in_revision_amount > 0 ? (
                        <div className="inline-flex items-center text-brand-warning font-black text-[13px] tracking-tighter drop-shadow-sm">
                            ${stat.in_revision_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">$0</span>
                    )}
                </div>
            )
        },
        {
            header: 'In Progress (Today)',
            key: 'in_progress_24h',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    {stat.in_progress_24h > 0 ? (
                        <div className={getStatusCapsuleClasses('active')}>
                            {stat.in_progress_24h} Active
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">0</span>
                    )}
                </div>
            )
        },
        {
            header: 'Done',
            key: 'done_24h',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex justify-center">
                    {stat.done_24h > 0 ? (
                        <div className={getStatusCapsuleClasses('done')}>
                            {stat.done_24h} Done
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">0</span>
                    )}
                </div>
            )
        },
        {
            header: 'Remaining Capacity',
            key: 'remaining_capacity',
            className: 'text-center',
            render: (stat: FreelancerStats) => (
                <div className="flex flex-col items-center gap-1.5">
                    <span className={`text-xl font-black tracking-tighter ${stat.remaining_capacity > 2 ? 'text-brand-success drop-shadow-[0_0_10px_rgba(0,255,163,0.2)]' :
                        stat.remaining_capacity > 0 ? 'text-brand-warning drop-shadow-[0_0_10px_rgba(255,170,0,0.2)]' :
                            'text-brand-error animate-pulse'
                        }`}>
                        {stat.remaining_capacity}
                    </span>

                </div>
            )
        }
    ];

    const totalFreelancers = stats.length;
    const totalDailyCapacity = stats.reduce((acc, curr) => acc + curr.daily_capacity, 0);
    const totalRemaining = stats.reduce((acc, curr) => acc + curr.remaining_capacity, 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both pb-20">
            {/* Summary Cards */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${roleLower === 'team lead' ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-5'} gap-6`}>
                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-primary/30"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">Freelancers</p>
                                <p className="text-4xl font-bold text-white tracking-tight">{totalFreelancers}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary">
                                <IconUsers size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <span className={getStatusCapsuleClasses('active')}>Active Pool</span>
                        </div>
                    </div>
                </Card>

                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-primary/30"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">Daily Capacity</p>
                                <p className="text-4xl font-bold text-white tracking-tight">{totalDailyCapacity}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-info/10 group-hover:border-brand-info/20 group-hover:text-brand-info">
                                <IconClock size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <span className={getStatusCapsuleClasses('sent')}>Projects / Day</span>
                        </div>
                    </div>
                </Card>

                {roleLower === 'team lead' && (
                    <Card
                        isElevated={true}
                        className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-primary/30"
                        bodyClassName="h-full flex flex-col justify-between"
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,170,0,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">Unassigned</p>
                                    <p className="text-4xl font-bold text-white tracking-tight">{tlUnassignedCount}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-warning/10 group-hover:border-brand-warning/20 group-hover:text-brand-warning">
                                    <IconAlertTriangle size={24} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-4">
                                <span className={getStatusCapsuleClasses('revision')}>Pending Allocation</span>
                                <div className="text-right">
                                    <span className="text-sm font-black text-brand-warning tracking-tighter drop-shadow-sm">
                                        ${tlUnassignedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 shadow-sm">Value</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-primary/30"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">In Progress</p>
                                <p className="text-4xl font-bold text-white tracking-tight">{totalSystemInProgress}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary">
                                <IconActivity size={24} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-4">
                            <span className={getStatusCapsuleClasses('active')}>Active Orders</span>
                            <div className="text-right">
                                <span className="text-sm font-black text-brand-success tracking-tighter drop-shadow-sm">
                                    ${totalSystemInProgressAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 shadow-sm">Value</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-error/30"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,0,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">Urgent</p>
                                <p className="text-4xl font-bold text-brand-error tracking-tight">{totalSystemUrgent}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-error/10 group-hover:border-brand-error/20 group-hover:text-brand-error">
                                <IconZap size={24} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-4">
                            <span className={getStatusCapsuleClasses('urgent')}>Urgent Orders</span>
                            <div className="text-right">
                                <span className="text-sm font-black text-brand-error tracking-tighter drop-shadow-sm">
                                    ${totalSystemUrgentAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 shadow-sm">Value</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-primary/30"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">In Revision</p>
                                <p className="text-4xl font-bold text-white tracking-tight">{totalSystemInRevision}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-warning/10 group-hover:border-brand-warning/20 group-hover:text-brand-warning">
                                <IconAlertTriangle size={24} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-4">
                            <span className={getStatusCapsuleClasses('revision')}>Revision Orders</span>
                            <div className="text-right">
                                <span className="text-sm font-black text-brand-warning tracking-tighter drop-shadow-sm">
                                    ${totalSystemInRevisionAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1 shadow-sm">Total Value</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden group min-h-[140px] transition-all duration-300 hover:border-brand-primary/30"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-500">Free Slots</p>
                                <p className="text-4xl font-bold text-white tracking-tight">{totalRemaining}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center transition-all group-hover:bg-brand-warning/10 group-hover:border-brand-warning/20 group-hover:text-brand-warning">
                                <IconZap size={24} />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <span className={getStatusCapsuleClasses('pending')}>Remaining</span>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex items-center justify-between gap-4 px-2">
                <div className="w-full md:w-80">
                    <Input
                        placeholder="Search freelancer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        leftIcon={<IconSearch className="w-4 h-4 text-gray-500" />}
                        variant="metallic"
                    />
                </div>
            </div>

            <Table
                columns={columns}
                data={filteredStats}
                isLoading={loading}
                isMetallicHeader={true}
                emptyMessage="No freelancers matching your search were found."
            />
        </div>
    );
}
