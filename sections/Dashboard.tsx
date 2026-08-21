import React, { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { Modal, Card, ElevatedMetallicCard } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';
import { IconClock, IconZap, IconTrendingUp, IconCalendar, IconTicket, IconPlay, IconList, IconChevronRight, IconAlertTriangle, IconCheckCircle, IconX, IconSend, IconMoreVertical, IconUser, IconDollar, IconXCircle, IconChartBar, IconAward, IconStar, IconBell } from '../components/Icons';
import { getStatusCapsuleClasses } from '../components/Badge';
import { formatDeadlineDate, getTimeLeft, formatTime } from '../utils/formatter';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { TimeSelect } from '../components/TimeSelect';
import { Dropdown } from '../components/Dropdown';
import { useAccounts } from '../contexts/AccountContext';
import { BonusMilestonesWidget } from '../components/BonusMilestonesWidget';

interface Task {
    id: string;
    task: string;
    description: string;
    status: 'In Progress' | 'Completed';
    deadline_date: string;
    deadline_time: string;
    assignee_id: string;
    created_by: string;
    assignee_profile: { name: string } | null;
    creator_profile: { name: string } | null;
}

const ProjectStatsWidget = memo(({ profile, role }: { profile: any, role: string | null }) => {
    const zeroCounts = {
        done: 0,
        revisionDone: 0,
        urgentDone: 0,
        revisionUrgentDone: 0,
        finalFilesDone: 0,
        cancelled: 0,
        approved: 0,
        sentForApproval: 0
    };

    const [counts, setCounts] = useState(zeroCounts);
    const [loading, setLoading] = useState(true);

    const fetchCounts = async () => {
        if (!profile?.id) return;
        try {
            // Only show loading on initial fetch or if counts are empty
            const hasData = Object.values(counts).some(c => c > 0);
            if (!hasData) setLoading(true);
            const userRole = role?.toLowerCase().trim() || '';
            const isSuperAdmin = userRole === 'super admin';
            const isAdminUser = userRole === 'admin' || userRole === 'project operations manager';
            const isProjectManager = userRole.includes('manager');
            const isTeamLead = userRole.includes('team lead');
            const isFreelancer = userRole.includes('freelancer') || userRole.includes('designer') || userRole.includes('presentation') || isTeamLead;

            let query = supabase.from('projects').select('status').neq('status', 'Removed');

            if (isSuperAdmin) {
                // No filters needed
            } else if (isAdminUser) {
                const { data: access } = await supabase.from('user_account_access').select('account_id').eq('user_id', profile.id);
                const accountIds = access?.map(pa => pa.account_id) || [];
                const { data: collabs } = await supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id);
                const collabProjectIds = collabs?.map(c => c.project_id) || [];

                if (accountIds.length > 0 || collabProjectIds.length > 0) {
                    const orParts = [];
                    if (accountIds.length > 0) orParts.push(`account_id.in.(${accountIds.map(id => `"${id}"`).join(',')})`);
                    if (collabProjectIds.length > 0) orParts.push(`project_id.in.(${collabProjectIds.map(id => `"${id}"`).join(',')})`);
                    query = query.or(orParts.join(','));
                } else {
                    setCounts({ ...zeroCounts });
                    setLoading(false);
                    return;
                }
            } else if (isProjectManager) {
                const [{ data: collabs }, { data: userTeams }] = await Promise.all([
                    supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id),
                    supabase.from('team_members').select('team_id').eq('member_id', profile.id)
                ]);
                const collabProjectIds = collabs?.map(c => c.project_id) || [];
                let accountIds: string[] = [];
                if (userTeams && userTeams.length > 0) {
                    const teamIds = userTeams.map(t => t.team_id);
                    const { data: teamAccountLinks } = await supabase.from('team_accounts').select('account_id').in('team_id', teamIds);
                    if (teamAccountLinks) accountIds = [...new Set(teamAccountLinks.map(ta => ta.account_id))];
                }
                if (accountIds.length > 0 || collabProjectIds.length > 0) {
                    const orParts = [];
                    if (accountIds.length > 0) orParts.push(`account_id.in.(${accountIds.map(id => `"${id}"`).join(',')})`);
                    if (collabProjectIds.length > 0) orParts.push(`project_id.in.(${collabProjectIds.map(id => `"${id}"`).join(',')})`);
                    query = query.or(orParts.join(','));
                } else {
                    setCounts({ ...zeroCounts });
                    setLoading(false);
                    return;
                }
            } else if (isFreelancer) {
                const [{ data: collabs }, { data: userAccess }] = await Promise.all([
                    supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id),
                    isTeamLead ? supabase.from('user_account_access').select('account_id').eq('user_id', profile.id) : Promise.resolve({ data: [] })
                ]);
                const collabIds = collabs?.map(c => c.project_id) || [];
                const accIds = userAccess?.map(ua => ua.account_id) || [];
                const freelancerName = profile.name || profile.email;
                let filterStr = `assignee_id.eq.${profile.id},team_designer_id.eq.${profile.id},assignee.ilike."${freelancerName}",assignee.ilike."${profile.email}"`;
                if (collabIds.length > 0) filterStr += `,project_id.in.(${collabIds.map(id => `"${id}"`).join(',')})`;
                if (accIds.length > 0) filterStr += `,account_id.in.(${accIds.map(id => `"${id}"`).join(',')})`;
                query = query.or(filterStr);
            } else {
                const { data: collabs } = await supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id);
                const collabProjectIds = collabs?.map(c => c.project_id) || [];
                if (collabProjectIds.length > 0) {
                    query = query.in('project_id', collabProjectIds);
                } else {
                    setCounts({ ...zeroCounts });
                    setLoading(false);
                    return;
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            const newCounts = { ...zeroCounts };
            data?.forEach(p => {
                const s = p.status?.trim().toLowerCase();
                if (s === 'done') newCounts.done++;
                else if (s === 'revision done') newCounts.revisionDone++;
                else if (s === 'urgent done') newCounts.urgentDone++;
                else if (s === 'revision urgent done') newCounts.revisionUrgentDone++;
                else if (s === 'final files done') newCounts.finalFilesDone++;
                else if (s === 'cancelled') newCounts.cancelled++;
                else if (s === 'approved') newCounts.approved++;
                else if (s === 'sent for approval') newCounts.sentForApproval++;
            });
            setCounts(newCounts);
        } catch (err) {
            console.error('Error fetching project stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounts();

        // Real-time subscription
        const channel = supabase
            .channel('dashboard_project_stats')
            .on('postgres_changes', { event: '*', table: 'projects', schema: 'public' }, () => {
                fetchCounts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, role]);

    const StatCard = ({ label, count, color }: any) => (
        <div className="relative flex flex-col items-center justify-center p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] overflow-hidden group transition-all duration-500 hover:border-white/20 hover:bg-white/[0.04]">
            {/* Soft Metallic Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Color Accent Line (Full Vibrancy) */}
            <div className={`absolute top-0 inset-x-0 h-0.5 bg-${color} opacity-100 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />

            <div className="relative z-10 flex flex-col items-center gap-0.5">
                <p className={`text-4xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(0,0,0,0.4)]`}>{count}</p>
                <p className={`text-[9px] font-black text-${color} uppercase tracking-[0.25em] text-center mt-1`}>{label}</p>
            </div>

            {/* Inner Highlight */}
            <div className="absolute inset-px rounded-[11px] border border-white/[0.02] pointer-events-none" />
        </div>
    );

    return (
        <ElevatedMetallicCard
            title={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <IconZap className="w-4 h-4 text-brand-primary" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Project Velocity (All-Time)</span>
                    </div>
                    <a href="/projects/all" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                        View All <IconChevronRight className="w-3 h-3" />
                    </a>
                </div>
            }
            className="h-[360px]"
            bodyClassName="p-4"
        >
            {loading ? (
                <div className="h-full flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2 h-full">
                    <StatCard
                        label="Done"
                        count={counts.done}
                        color="green-500"
                    />
                    <StatCard
                        label="Revision Done"
                        count={counts.revisionDone}
                        color="amber-500"
                    />
                    <StatCard
                        label="Urgent Done"
                        count={counts.urgentDone}
                        color="red-500"
                    />
                    <StatCard
                        label="Rev. Urg Done"
                        count={counts.revisionUrgentDone}
                        color="orange-500"
                    />
                    <StatCard
                        label="Final Files"
                        count={counts.finalFilesDone}
                        color="blue-500"
                    />
                    <StatCard
                        label="Approved"
                        count={counts.approved}
                        color="emerald-500"
                    />
                    <StatCard
                        label="Sent for Approval"
                        count={counts.sentForApproval}
                        color="indigo-500"
                    />
                    <StatCard
                        label="Cancelled"
                        count={counts.cancelled}
                        color="gray-500"
                    />
                </div>
            )}
        </ElevatedMetallicCard>
    );
});

const TaskWidget = memo(({ profile, role, onTaskClick, onMarkComplete }: { profile: any, role: string | null, onTaskClick: (task: Task) => void, onMarkComplete: (taskId: string) => void }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentTasks = async () => {
            if (!profile?.id) return;
            try {
                // Only show loading on initial fetch
                if (tasks.length === 0) setLoading(true);
                let query = supabase
                    .from('tasks')
                    .select('*, creator_profile:profiles!tasks_created_by_fkey(name), assignee_profile:profiles!tasks_assignee_id_fkey(name)')
                    .eq('status', 'In Progress')
                    .order('deadline_date', { ascending: true })
                    .limit(20);

                if (role?.toLowerCase() !== 'super admin') {
                    query = query.or(`assignee_id.eq.${profile.id},created_by.eq.${profile.id}`);
                }

                const { data, error } = await query;
                if (error) throw error;
                setTasks(data || []);
            } catch (err) {
                console.error('Error fetching dashboard tasks:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentTasks();

        // Real-time subscription for tasks
        const channel = supabase
            .channel('dashboard_tasks_realtime')
            .on('postgres_changes', { event: '*', table: 'tasks', schema: 'public' }, () => {
                fetchRecentTasks();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, role]);

    return (
        <ElevatedMetallicCard
            title={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <IconList className="w-4 h-4 text-brand-primary" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider">Urgent Tasks</span>
                    </div>
                    <a href="/tasks/all" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                        View All <IconChevronRight className="w-3 h-3" />
                    </a>
                </div>
            }
            className="h-[362px]"
            bodyClassName="p-0 flex flex-col h-full overflow-hidden"
        >
            {loading ? (
                <div className="p-12 h-full flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Loading Tasks...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="p-12 h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] text-gray-600">
                        <IconCheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">All Caught Up!</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">No urgent tasks requiring your attention</p>
                    </div>
                </div>
            ) : (
                <div
                    className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 transition-colors min-h-0 relative overscroll-behavior-contain"
                >
                    <div className="min-w-[1200px] h-full">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead
                                className="sticky top-0 z-30 border-b border-surface-border relative"
                                style={{
                                    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%), linear-gradient(115deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%)',
                                    backgroundSize: '100% 100%',
                                    backgroundColor: '#1A1A1A'
                                }}
                            >
                                <tr>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-20 whitespace-nowrap text-center">S. NO.</th>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white text-left">TASK</th>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-32 whitespace-nowrap text-center">CREATED BY</th>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-32 whitespace-nowrap text-center">ASSIGNEE</th>
                                    <th className="px-2 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-40 whitespace-nowrap text-center">STATUS</th>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-40 whitespace-nowrap text-center">DEADLINE</th>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-40 whitespace-nowrap text-center">TIME LEFT</th>
                                    <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-28 whitespace-nowrap text-center">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border/40">
                                {tasks.map((task, index) => {
                                    const deadlineStr = task.deadline_date ? `${task.deadline_date}T${task.deadline_time || '00:00:00'}` : null;
                                    const timeLeft = getTimeLeft(deadlineStr, task.status);

                                    return (
                                        <tr
                                            key={task.id}
                                            className="hover:bg-white/[0.06] transition-all group cursor-pointer border-b border-surface-border/40"
                                            style={{ height: '48px' }}
                                            onClick={() => onTaskClick(task)}
                                        >
                                            <td className="px-3.5 py-1.5 text-xs font-bold text-gray-500 w-20 text-center">
                                                {index + 1}
                                            </td>
                                            <td className="px-3.5 py-1.5 bg-white/[0.02] text-left">
                                                <p className="text-xs font-bold text-white truncate max-w-full group-hover:text-brand-primary transition-colors text-left">
                                                    {task.task}
                                                </p>
                                            </td>
                                            <td className="px-3.5 py-1.5 text-xs text-gray-400 w-32 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                                {task.creator_profile?.name || 'System'}
                                            </td>
                                            <td className="px-3.5 py-1.5 text-xs text-gray-400 bg-white/[0.02] w-32 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                                {task.assignee_profile?.name || 'Unassigned'}
                                            </td>
                                            <td className="px-2 py-1.5 text-center w-40">
                                                <span className={`${getStatusCapsuleClasses(task.status)} whitespace-nowrap text-[10px]`}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-1.5 bg-white/[0.02] w-40 text-center">
                                                <div className="flex flex-col items-center whitespace-nowrap">
                                                    <span className="text-xs text-white font-bold">{formatDeadlineDate(task.deadline_date)}</span>
                                                    <span className="text-[9px] text-brand-primary font-black uppercase tracking-widest">
                                                        {task.deadline_time ? formatTime(task.deadline_time) : '12:00 AM'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3.5 py-1.5 text-center w-40">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${timeLeft.color} whitespace-nowrap`}>
                                                    {timeLeft.label || (task.status === 'Completed' ? 'Completed' : '')}
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-1.5 text-center bg-white/[0.02] w-28">
                                                <div className="flex justify-center gap-2 pr-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onMarkComplete(task.id);
                                                        }}
                                                        className="p-1 hover:bg-brand-success/10 rounded-lg text-gray-700 hover:text-brand-success transition-all group/btn"
                                                        title="Mark as Complete"
                                                    >
                                                        <IconCheckCircle className="w-4 h-4 transition-transform duration-200 group-hover/btn:scale-110" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTaskClick(task);
                                                        }}
                                                        className="p-1 hover:bg-white/5 rounded-lg text-gray-700 hover:text-white transition-all group/btn"
                                                        title="View Details"
                                                    >
                                                        <IconChevronRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tasks.length > 0 && tasks.length < 5 && Array.from({ length: 5 - tasks.length }).map((_, i) => (
                                    <tr
                                        key={`empty-${i}`}
                                        className="border-b border-surface-border/20 opacity-[0.12] pointer-events-none"
                                        style={{ height: '48px' }}
                                    >
                                        <td className="px-3.5 py-1.5 text-center text-xs font-bold text-gray-700 w-20">-</td>
                                        <td className="px-3.5 py-1.5 text-left text-xs text-gray-600">-</td>
                                        <td className="px-3.5 py-1.5 text-center text-xs text-gray-600 w-32">-</td>
                                        <td className="px-3.5 py-1.5 text-center text-xs text-gray-600 w-32">-</td>
                                        <td className="px-2 py-1.5 text-center w-40">-</td>
                                        <td className="px-3.5 py-1.5 text-center w-40">-</td>
                                        <td className="px-3.5 py-1.5 text-center w-40">-</td>
                                        <td className="px-3.5 py-1.5 text-center w-28">-</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </ElevatedMetallicCard>
    );
});



const EarningsBreakdownWidget = memo(({ profile, role }: { profile: any, role: string | null }) => {
    const { accounts, loading: accountsLoading } = useAccounts();
    const [selectedAccount, setSelectedAccount] = useState<string[]>(['all']);

    const handleAccountChange = (ids: string | string[]) => {
        let nextIds = Array.isArray(ids) ? ids : [ids];
        if (nextIds.length > 1) {
            const hasAll = nextIds.includes('all');
            const wasAll = selectedAccount.includes('all');
            if (hasAll && !wasAll) nextIds = ['all'];
            else if (hasAll && wasAll) nextIds = nextIds.filter(id => id !== 'all');
        }
        if (nextIds.length === 0) nextIds = ['all'];
        setSelectedAccount(nextIds);
    };

    // Filter toolbar states
    const [fromDate, setFromDate] = useState<Date | null>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    });
    const [toDate, setToDate] = useState<Date | null>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    });
    const [activeFilter, setActiveFilter] = useState<string | null>('month');
    const [platformCommissions, setPlatformCommissions] = useState<any[]>([]);
    const [pricingSlabs, setPricingSlabs] = useState<any[]>([]);
    const [commissionsLoading, setCommissionsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [projectsData, setProjectsData] = useState<any[]>([]);
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'all' | 'pipeline' | 'secured' | 'cancelled'>('all');

    const fetchPlatformCommissions = async () => {
        setCommissionsLoading(true);
        const { data, error } = await supabase
            .from('platform_commissions')
            .select(`
                *,
                platform_commission_accounts (
                    account_id
                )
            `);

        if (!error && data) {
            const mapped = data.map(item => ({
                ...item,
                assigned_account_ids: item.platform_commission_accounts?.map((r: any) => r.account_id) || []
            }));
            setPlatformCommissions(mapped);
            setCommissionsLoading(false);
            return mapped;
        }
        setCommissionsLoading(false);
        return [];
    };

    const fetchPricingSlabs = async () => {
        const { data, error } = await supabase
            .from('pricing_slabs')
            .select('*')
            .order('min_price', { ascending: true });

        if (!error && data) {
            setPricingSlabs(data);
            return data;
        }
        return [];
    };

    const fetchProjects = async (isInitial = false, passedCommissions?: any[], passedAccounts?: any[], passedSlabs?: any[]) => {
        try {
            if (isInitial) setLoading(true);
            const isSuperAdmin = role === 'Super Admin';
            const userRole = role?.toLowerCase().trim();

            let query = supabase
                .from('projects')
                .select('id, project_id, project_title, status, created_at, clearance_start_date, price, tip_amount, designer_fee, account_id, account, converted_by, order_type, cancellation_reason, client_name, updated_at, accounts(prefix)')
                .neq('status', 'Removed');

            // Apply account scoping for non-Super Admins
            const isAdminLike = ['admin', 'project manager', 'project operations manager'].includes(userRole || '');
            if (isAdminLike && !isSuperAdmin) {
                const { data: permittedAccounts } = await supabase
                    .from('user_account_access')
                    .select('account_id')
                    .eq('user_id', profile?.id);

                if (permittedAccounts && permittedAccounts.length > 0) {
                    const accountIds = permittedAccounts.map(pa => pa.account_id);
                    query = query.in('account_id', accountIds);
                } else {
                    setProjectsData([]);
                    return;
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                const enriched = data.map(p => {
                    const price = Number(p.price || 0);

                    // REVENUE MODEL: Integrated Platform Commissions + DB Trigger Logic
                    let accountId = p.account_id;

                    const activeAccounts = passedAccounts || accounts;
                    const activeCommissions = passedCommissions || platformCommissions;

                    // Fallback: If account_id is missing in data, find it by name/prefix from the accounts state
                    if (!accountId && p.account) {
                        const matchedAcc = activeAccounts.find(a => a.name === p.account || a.prefix === p.account);
                        if (matchedAcc) accountId = matchedAcc.id;
                    }

                    const commission = activeCommissions.find(pc => pc.assigned_account_ids.includes(accountId));
                    const commissionFactor = commission ? (Number(commission.commission_percentage) > 1 ? Number(commission.commission_percentage) / 100 : Number(commission.commission_percentage)) : 0;

                    const platformCut = price * commissionFactor;

                    // Fixed Salary Model: Designers do not get project cuts
                    const freelancerCut = 0;

                    // Company earning is the remainder (Gross Sale - Platform Fee)
                    const companyEarning = price - platformCut;

                    const prefix = (p as any).accounts?.prefix || 'Unassigned Account';

                    // FIX: Avoid prefix duplication and handle unassigned state
                    let formattedId = p.project_id;
                    if (prefix !== 'Unassigned Account' && !formattedId.startsWith(prefix)) {
                        formattedId = `${prefix} ${formattedId}`;
                    }

                    return {
                        ...p,
                        company_earning: companyEarning,
                        platform_cut: platformCut,
                        freelancer_cut: freelancerCut,
                        account_prefix: prefix,
                        formatted_project_id: formattedId,
                        client: p.client_name || 'General Client',
                        created_at_formatted: p.created_at ? systemFormatDate(new Date(p.created_at)) : 'N/A',
                        approved_on_formatted: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                        cancelled_at_formatted: p.updated_at ? systemFormatDate(new Date(p.updated_at)) : 'N/A',
                        date: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                        rawDate: p.clearance_start_date
                    };
                });

                setProjectsData(enriched);
            }
        } catch (err) {
            console.error('Error fetching company projects for widget:', err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const isFirstLoad = useRef(true);

    useEffect(() => {
        if (!role || !profile?.id || accountsLoading) return;

        const loadInitialData = async () => {
            const loadedCommissions = await fetchPlatformCommissions();
            const loadedSlabs = await fetchPricingSlabs();
            await fetchProjects(isFirstLoad.current, loadedCommissions, accounts, loadedSlabs);
            isFirstLoad.current = false;
        };
        loadInitialData();

        const channel = supabase
            .channel('dashboard_earnings_projects_changes')
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'projects' },
                () => {
                    fetchProjects();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [accounts, accountsLoading, role, profile?.id]);

    const derived = useMemo(() => {
        let filtered = [...projectsData];

        // 1. Date Filter
        if (fromDate || toDate) {
            filtered = filtered.filter(p => {
                const date = new Date(p.created_at);
                if (fromDate && date < fromDate) return false;
                if (toDate && date > toDate) return false;
                return true;
            });
        }

        // 2. Account Filter
        if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
            filtered = filtered.filter(p => selectedAccount.includes(p.account_id));
        }

        // Stats (before activeSummaryFilter filtering)
        const pipelineItems = filtered.filter(p =>
            p.status !== 'Completed' &&
            p.status !== 'Approved' &&
            p.status !== 'Removed' &&
            p.status !== 'Cancelled'
        );
        const securedItems = filtered.filter(p => p.status === 'Completed' || p.status === 'Approved');
        const cancelledItems = filtered.filter(p => p.status === 'Cancelled');

        const pipelineRevenue = pipelineItems.reduce((sum, p) => sum + p.company_earning, 0);
        const securedRevenue = securedItems.reduce((sum, p) => sum + p.company_earning, 0);
        const cancelledRevenue = cancelledItems.reduce((sum, p) => sum + p.company_earning, 0);

        const salesItems = [...pipelineItems, ...securedItems];
        const salesRevenue = salesItems.reduce((sum, p) => sum + Number(p.price || 0), 0);

        const pipelineCount = pipelineItems.length;
        const securedCount = securedItems.length;
        const cancelledCount = cancelledItems.length;
        const salesCount = salesItems.length;

        // Also prepare the specific active items for CSV export
        let activeCSVItems = [...filtered];
        if (activeSummaryFilter === 'pipeline') {
            activeCSVItems = [...pipelineItems];
        } else if (activeSummaryFilter === 'secured') {
            activeCSVItems = [...securedItems];
        } else if (activeSummaryFilter === 'cancelled') {
            activeCSVItems = [...cancelledItems];
        } else {
            activeCSVItems = [...salesItems];
        }

        return {
            activeCSVItems,
            pipelineRevenue,
            securedRevenue,
            cancelledRevenue,
            salesRevenue,
            pipelineCount,
            securedCount,
            cancelledCount,
            salesCount
        };
    }, [projectsData, fromDate, toDate, selectedAccount, activeSummaryFilter]);

    const {
        activeCSVItems,
        pipelineRevenue,
        securedRevenue,
        cancelledRevenue,
        salesRevenue,
        pipelineCount,
        securedCount,
        cancelledCount,
        salesCount
    } = derived;

    const handleQuickFilter = (type: string) => {
        const now = new Date();

        if (activeFilter === type) {
            const start = new Date(now);
            start.setDate(now.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);

            setFromDate(start);
            setToDate(end);
            setActiveFilter(null);
            return;
        }

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        let start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (type === 'today') {
            // Already set to start of today
        } else if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end.setTime(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime());
        }

        setFromDate(start);
        setToDate(end);
        setActiveFilter(type);
    };

    const handleExportCSV = () => {
        if (activeCSVItems.length === 0) return;

        const headers = ['Project ID', 'Project Title', 'Status', 'Client', 'Price', 'Platform Commission', 'Freelancer Cut', 'Company Earning', 'Account', 'Order Type', 'Converted By', 'Date'];
        const csvRows = [headers.join(',')];

        activeCSVItems.forEach(p => {
            const row = [
                `"${p.formatted_project_id}"`,
                `"${p.project_title || 'Untitled Project'}"`,
                `"${p.status}"`,
                `"${p.client}"`,
                `"${(p.price || 0).toFixed(2)}"`,
                `"${(p.platform_cut || 0).toFixed(2)}"`,
                `"${(p.freelancer_cut || 0).toFixed(2)}"`,
                `"${(p.company_earning || 0).toFixed(2)}"`,
                `"${p.account_prefix}"`,
                `"${p.order_type || 'Direct Order'}"`,
                `"${p.converted_by || '-'}"`,
                `"${p.date}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `dashboard_earnings_${activeSummaryFilter}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider px-2">Earnings Breakdown</h3>
            </div>

            {/* Toolbar Card */}
            <Card
                isElevated={true}
                disableHover={true}
                className="h-full flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova"
                bodyClassName="flex-1 h-full py-0 px-0 overflow-visible"
            >
                {/* Metallic Sheen Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="p-3 relative z-10 w-full h-full">
                    <div className="w-full h-full flex flex-col xl:flex-row items-center justify-between gap-4 py-1 px-2">
                        {/* Left Side: Date Pickers & Account */}
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                            <DatePicker
                                placeholder="From"
                                value={fromDate}
                                onChange={(date) => {
                                    setFromDate(date);
                                    setActiveFilter(null);
                                }}
                            >
                                <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <IconCalendar className="w-4 h-4 text-[#FF6B4B] group-hover:scale-110 transition-transform relative z-10" />
                                    <span className="min-w-[100px] whitespace-nowrap text-center relative z-10">{systemFormatDate(fromDate) || 'From Date'}</span>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {fromDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-[#FF6B4B] transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFromDate(null);
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>

                            <DatePicker
                                placeholder="To"
                                value={toDate}
                                onChange={(date) => {
                                    setToDate(date);
                                    setActiveFilter(null);
                                }}
                            >
                                <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <IconCalendar className="w-4 h-4 text-[#FF6B4B] group-hover:scale-110 transition-transform relative z-10" />
                                    <span className="min-w-[100px] whitespace-nowrap text-center relative z-10">{systemFormatDate(toDate) || 'To Date'}</span>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {toDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-[#FF6B4B] transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setToDate(null);
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>

                            <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                            <div className="w-44">
                                <Dropdown
                                    value={selectedAccount}
                                    onChange={handleAccountChange}
                                    options={[{ label: 'All Accounts', value: 'all' }, ...(accounts || []).map(a => ({
                                        label: a.name,
                                        description: a.prefix?.toUpperCase(),
                                        value: a.id
                                    }))]}
                                    placeholder="All Accounts"
                                    showSearch={true}
                                    isMulti={true}
                                    menuClassName="!w-[340px]"
                                >
                                    <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                        <span className="truncate relative z-10">
                                            {selectedAccount.includes('all') ? 'All Accounts' :
                                                selectedAccount.length === 1 ? (accounts.find(acc => acc.id === selectedAccount[0])?.prefix || 'Account') :
                                                    `${selectedAccount.length} Accounts`}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Right: Presets & Export */}
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end overflow-visible">
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'This Week' },
                                { id: 'month', label: 'This Month' }
                            ].map((filter) => (
                                <div
                                    key={filter.id}
                                    onClick={() => handleQuickFilter(filter.id)}
                                    className={`relative flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden min-w-[90px] ${activeFilter === filter.id
                                        ? 'border-brand-primary/40 bg-brand-primary/5'
                                        : 'hover:bg-black/50 hover:border-white/10'
                                        }`}
                                >
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <span className={`relative z-10 transition-colors ${activeFilter === filter.id ? 'text-[#FF6B4B]' : 'text-gray-400 group-hover:text-white'}`}>
                                        {filter.label}
                                    </span>
                                </div>
                            ))}
                            <Button
                                variant="metallic"
                                size="sm"
                                leftIcon={<IconChartBar className="w-4 h-4 block" />}
                                className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                                onClick={handleExportCSV}
                            >
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Summary Cards Grid */}
            {loading ? (
                <div className="flex items-center justify-center p-8 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl min-h-[150px]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Calculating Metrics...</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Gross Sales */}
                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'all'}
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'all'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                            }`}
                        bodyClassName="h-full"
                        onClick={() => setActiveSummaryFilter('all')}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="p-5 relative z-10 w-full">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'all' ? 'text-white/80' : 'text-gray-400'}`}>Gross Sales</p>
                                    <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'all' ? 'text-white' : 'text-white/90'}`}>${salesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={activeSummaryFilter === 'all' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10'}>
                                            {salesCount} Projects
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'all' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Gross Volume</span>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'all'
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconDollar className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Pipeline Revenue */}
                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'pipeline'}
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'pipeline'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                            }`}
                        bodyClassName="h-full"
                        onClick={() => setActiveSummaryFilter('pipeline')}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="p-5 relative z-10 w-full">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'pipeline' ? 'text-white/80' : 'text-gray-400'}`}>Pipeline Revenue</p>
                                    <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'pipeline' ? 'text-white' : 'text-brand-warning'}`}>${pipelineRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={activeSummaryFilter === 'pipeline' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('in progress')}>
                                            {pipelineCount} Projects
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'pipeline' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>In Pipeline</span>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'pipeline'
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconClock className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Secured Revenue */}
                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'secured'}
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'secured'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                            }`}
                        bodyClassName="h-full"
                        onClick={() => setActiveSummaryFilter('secured')}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="p-5 relative z-10 w-full">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'secured' ? 'text-white/80' : 'text-gray-400'}`}>Secured Revenue</p>
                                    <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'secured' ? 'text-white' : 'text-brand-success'}`}>${securedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={activeSummaryFilter === 'secured' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('approved')}>
                                            {securedCount} Projects
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'secured' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Revenue Approved</span>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'secured'
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconCheckCircle className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Cancelled Revenue */}
                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'cancelled'}
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'cancelled'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                            }`}
                        bodyClassName="h-full"
                        onClick={() => setActiveSummaryFilter('cancelled')}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="p-5 relative z-10 w-full">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'cancelled' ? 'text-white/80' : 'text-gray-400'}`}>Cancelled Revenue</p>
                                    <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'cancelled' ? 'text-white' : 'text-brand-error'}`}>${cancelledRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={activeSummaryFilter === 'cancelled' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('error')}>
                                            {cancelledCount} Projects
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'cancelled' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Revenue Cancelled</span>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'cancelled'
                                    ? 'bg-white/20 border-white/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                    }`}>
                                    <IconXCircle className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
});

const LeaderboardWidget = memo(() => {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);

            // 1. Fetch profiles
            const { data: users, error: usersError } = await supabase
                .from('profiles')
                .select('id, name, role, avatar_url')
                .eq('status', 'Active');

            if (usersError) throw usersError;

            const deliveryRoles = ['freelancer', 'team lead', 'team designer', 'presentation designer'];
            const activeDeliverers = users?.filter(u => deliveryRoles.includes(u.role?.toLowerCase() || '')) || [];

            // 2. Fetch comments from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: comments, error: commentsError } = await supabase
                .from('project_comments')
                .select('content, author_id')
                .like('content', 'STATUS_CHANGED:%')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .limit(5000);

            if (commentsError) throw commentsError;

            // 3. Process scores
            const rawEntries = activeDeliverers.map(u => {
                const userComments = comments?.filter(c => c.author_id === u.id) || [];
                const total = userComments.length;
                const late = userComments.filter(c => {
                    const parts = c.content.split(':');
                    return parts[3] === 'LATE';
                }).length;
                const timely = total - late;
                const score = total > 0 ? Math.round((timely / total) * 100) : 100;
                return {
                    id: u.id,
                    name: u.name || 'Unknown User',
                    role: u.role || 'Freelancer',
                    avatar_url: u.avatar_url,
                    total,
                    late,
                    timely,
                    score
                };
            });

            // Filter out 0-delivery users if there's at least one active user
            const activeEntries = rawEntries.filter(e => e.total > 0);
            const finalEntries = activeEntries.length > 0 ? activeEntries : rawEntries;

            // Sort by score desc, then total desc, then name asc
            finalEntries.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (b.total !== a.total) return b.total - a.total;
                return a.name.localeCompare(b.name);
            });

            setEntries(finalEntries);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();

        // Subscribe to changes in project_comments to auto-update leaderboard
        const channel = supabase
            .channel('leaderboard_comments')
            .on('postgres_changes', { event: '*', table: 'project_comments', schema: 'public' }, () => {
                fetchLeaderboard();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const navigateToUser = (userId: string) => {
        window.history.pushState(null, '', `/users/${encodeURIComponent(userId)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const getRankStyle = (rank: number) => {
        if (rank === 1) return { bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]', icon: <IconAward size={14} className="text-yellow-500 fill-yellow-500/20" /> };
        if (rank === 2) return { bg: 'bg-slate-300/10 border-slate-300/30 text-slate-300', icon: <IconAward size={14} className="text-slate-300 fill-slate-300/10" /> };
        if (rank === 3) return { bg: 'bg-amber-700/15 border-amber-700/30 text-amber-600', icon: <IconAward size={14} className="text-amber-700 fill-amber-700/10" /> };
        return { bg: 'bg-white/5 border-white/10 text-gray-500', icon: null };
    };

    return (
        <ElevatedMetallicCard
            title={
                <div className="flex items-center gap-2">
                    <IconAward className="w-4 h-4 text-brand-primary" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">On-Time Delivery Leaderboard</span>
                </div>
            }
            bodyClassName="p-0 flex flex-col overflow-hidden"
            className="w-full"
        >
            <div className="p-6 border-b border-white/5 bg-white/[0.01]">
                <p className="text-xs text-gray-400 font-medium">
                    Leaderboard ranks active deliverers based on their rolling 30-day On-Time Delivery (OTD) score and volume.
                </p>
            </div>

            {loading ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Loading Leaderboard...</p>
                </div>
            ) : entries.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] text-gray-600">
                        <IconAward className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">No Active Deliverers</p>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">No deliveries logged in the last 30 days</p>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 w-20 text-center">Rank</th>
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 text-left">Member</th>
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 w-40 text-center">Role</th>
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 w-28 text-center">OTD Score</th>
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 w-32 text-center">Total Deliveries</th>
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 w-28 text-center">Timely</th>
                                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-white/50 w-24 text-center">Late</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {entries.map((entry, index) => {
                                const rank = index + 1;
                                const rankStyle = getRankStyle(rank);

                                return (
                                    <tr
                                        key={entry.id}
                                        onClick={() => navigateToUser(entry.id)}
                                        className="hover:bg-white/[0.03] transition-all group cursor-pointer"
                                    >
                                        <td className="px-6 py-4 text-center w-20">
                                            <div className="flex justify-center">
                                                <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black uppercase tracking-wider ${rankStyle.bg}`}>
                                                    {rankStyle.icon ? rankStyle.icon : rank}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-white/20 transition-all">
                                                    {entry.avatar_url ? (
                                                        <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-black text-gray-500 uppercase">
                                                            {entry.name.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-white group-hover:text-brand-primary transition-colors block">
                                                        {entry.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis w-40">
                                            {entry.role}
                                        </td>
                                        <td className="px-6 py-4 text-center w-28">
                                            <div className="flex justify-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${entry.score >= 90
                                                    ? 'bg-brand-success/10 text-brand-success border-brand-success/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                                    : entry.score >= 75
                                                        ? 'bg-brand-warning/10 text-brand-warning border-brand-warning/20'
                                                        : 'bg-brand-error/10 text-brand-error border-brand-error/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                                    }`}>
                                                    {entry.score}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-bold text-white w-32 bg-white/[0.01]">
                                            {entry.total}
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-bold text-brand-success w-28">
                                            {entry.timely}
                                        </td>
                                        <td className="px-6 py-4 text-center text-xs font-bold w-24">
                                            <span className={entry.late > 0 ? 'text-brand-error' : 'text-gray-500'}>
                                                {entry.late}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </ElevatedMetallicCard>
    );
});

const Dashboard: React.FC = () => {
    const { profile, effectiveRole, refreshProfile } = useUser();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [capacity, setCapacity] = useState('5');
    const [saving, setSaving] = useState(false);
    const [initialTicket, setInitialTicket] = useState<any>(null);
    const [isIncreaseModalOpen, setIsIncreaseModalOpen] = useState(false);
    const [isDecreaseModalOpen, setIsDecreaseModalOpen] = useState(false);
    const [newCapacity, setNewCapacity] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [startTime, setStartTime] = useState('');
    const [submittingTicket, setSubmittingTicket] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Penalties alerts states
    const [myPenalties, setMyPenalties] = useState<any[]>([]);
    const [loadingPenalties, setLoadingPenalties] = useState(false);

    const fetchMyPenalties = async () => {
        if (!profile?.id) return;
        setLoadingPenalties(true);
        try {
            const { data, error } = await supabase
                .from('user_penalties')
                .select('*')
                .eq('user_id', profile.id)
                .eq('status', 'Valid')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMyPenalties(data || []);
        } catch (err) {
            console.error('Error fetching my penalties:', err);
        } finally {
            setLoadingPenalties(false);
        }
    };

    // OTD Scorecard states for delivery roles
    const [otdScore, setOtdScore] = useState<number | null>(null);
    const [totalDeliveries, setTotalDeliveries] = useState(0);
    const [lateCount, setLateCount] = useState(0);
    const [timelyCount, setTimelyCount] = useState(0);
    const [isOtdLoading, setIsOtdLoading] = useState(false);

    const fetchMyOtdStats = async () => {
        if (!profile?.id) return;
        const roleLower = effectiveRole?.toLowerCase().trim() || '';
        const isDeliveryRole = ['freelancer', 'team lead', 'team designer', 'presentation designer'].includes(roleLower);
        if (!isDeliveryRole) return;

        setIsOtdLoading(true);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data, error } = await supabase
                .from('project_comments')
                .select('content')
                .eq('author_id', profile.id)
                .like('content', 'STATUS_CHANGED:%')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (error) throw error;

            let total = 0;
            let late = 0;
            let timely = 0;

            if (data) {
                data.forEach(item => {
                    total++;
                    const parts = item.content.split(':');
                    if (parts[3] === 'LATE') {
                        late++;
                    } else {
                        timely++;
                    }
                });
            }

            setTotalDeliveries(total);
            setLateCount(late);
            setTimelyCount(timely);
            // Score only unlocks after 5 deliveries — calculated silently until then
            setOtdScore(total >= 5 ? Math.round((timely / total) * 100) : null);
        } catch (err) {
            console.error('Error fetching OTD stats:', err);
        } finally {
            setIsOtdLoading(false);
        }
    };

    useEffect(() => {
        fetchMyOtdStats();

        const roleLower = effectiveRole?.toLowerCase().trim() || '';
        const isDeliveryRole = ['freelancer', 'team lead', 'team designer', 'presentation designer'].includes(roleLower);
        if (!profile?.id || !isDeliveryRole) return;

        const channel = supabase
            .channel('my_dashboard_comments')
            .on('postgres_changes', { event: '*', table: 'project_comments', schema: 'public' }, () => {
                fetchMyOtdStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, effectiveRole]);

    useEffect(() => {
        if (!profile?.id) return;
        
        fetchMyPenalties();

        // Realtime subscription for penalties
        const penaltyChannel = supabase
            .channel(`my_penalties_realtime_${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_penalties',
                    filter: `user_id=eq.${profile.id}`
                },
                () => {
                    fetchMyPenalties();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(penaltyChannel);
        };
    }, [profile?.id]);

    const fetchInitialTicket = async () => {
        const roleLower = effectiveRole?.toLowerCase().trim();
        if (!profile?.id || !(roleLower === 'freelancer' || roleLower === 'team lead')) return;

        try {
            const { data, error } = await supabase
                .from('freelancer_capacity_tickets')
                .select('start_datetime')
                .eq('freelancer_id', profile.id)
                .eq('ticket_type', 'initial_capacity')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching initial ticket:', error);
                return;
            }

            if (data) {
                setInitialTicket(data);
            }
        } catch (err) {
            console.error('Catch fetching initial ticket:', err);
        }
    };

    useEffect(() => {
        fetchInitialTicket();
    }, [profile?.id, effectiveRole, profile?.daily_capacity]);

    useEffect(() => {
        // Disabled since capacity widget is removed for freelancers and team leads
        const shouldShowCapacityPopup = false;

        if (shouldShowCapacityPopup && profile && profile.daily_capacity === null) {
            setIsModalOpen(true);
        }
    }, [profile, effectiveRole]);

    const handleSaveCapacity = async () => {
        if (!profile) return;
        const val = parseInt(capacity);
        if (isNaN(val) || val <= 0) {
            addToast({ type: 'error', title: 'Invalid Capacity', message: 'Please enter a valid number greater than 0.' });
            return;
        }

        if (!startDate || !startTime) {
            addToast({ type: 'error', title: 'Missing Info', message: 'Please specify start date and time.' });
            return;
        }

        setSaving(true);
        try {
            // Combine date and time into a proper ISO string based on user's local selection
            const dateStr = startDate.toLocaleDateString('en-CA'); // Gets YYYY-MM-DD consistently
            const startDateTime = new Date(`${dateStr} ${startTime}`).toISOString();

            // 1. Create approved ticket record
            const { error: ticketError } = await supabase
                .from('freelancer_capacity_tickets')
                .insert([{
                    freelancer_id: profile.id,
                    daily_capacity: val,
                    start_datetime: startDateTime,
                    ticket_type: 'initial_capacity',
                    status: 'approved'
                }]);

            if (ticketError) throw ticketError;

            // 2. Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    daily_capacity: val,
                    updated_at: new Date().toISOString()
                })
                .eq('id', profile.id);

            if (profileError) throw profileError;

            addToast({ type: 'success', title: 'Profile Updated', message: `Your daily capacity has been set to ${val} projects.` });
            setIsModalOpen(false);
            await refreshProfile();
            await fetchInitialTicket();
        } catch (error: any) {
            console.error('Error setting capacity:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to set capacity.' });
        } finally {
            setSaving(false);
        }
    };

    const handleRequestIncrease = async () => {
        if (!profile) return;
        const val = parseInt(newCapacity);
        if (isNaN(val) || val <= (profile.daily_capacity || 0)) {
            addToast({ type: 'error', title: 'Invalid capacity', message: `Please enter a value higher than your current capacity (${profile.daily_capacity || 0}).` });
            return;
        }

        setSubmittingTicket(true);
        try {
            const { error } = await supabase
                .from('freelancer_capacity_tickets')
                .insert([{
                    freelancer_id: profile.id,
                    daily_capacity: val,
                    start_datetime: new Date().toISOString(),
                    ticket_type: 'increase_capacity',
                    status: 'pending'
                }]);

            if (error) throw error;

            addToast({ type: 'success', title: 'Request Sent', message: 'Your capacity increase request has been submitted for approval.' });
            setIsIncreaseModalOpen(false);
            setNewCapacity('');
        } catch (error: any) {
            console.error('Error requesting increase:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to submit request.' });
        } finally {
            setSubmittingTicket(false);
        }
    };

    const handleRequestDecrease = async () => {
        if (!profile) return;
        const val = parseInt(newCapacity);
        if (isNaN(val) || val >= (profile.daily_capacity || 1) || val < 1) {
            addToast({ type: 'error', title: 'Invalid capacity', message: `Please enter a value lower than your current capacity (${profile.daily_capacity || 0}) and at least 1.` });
            return;
        }

        setSubmittingTicket(true);
        try {
            const { error } = await supabase
                .from('freelancer_capacity_tickets')
                .insert([{
                    freelancer_id: profile.id,
                    daily_capacity: val,
                    start_datetime: new Date().toISOString(),
                    ticket_type: 'decrease_capacity',
                    status: 'pending'
                }]);

            if (error) throw error;

            addToast({ type: 'success', title: 'Request Sent', message: 'Your capacity decrease request has been submitted for approval.' });
            setIsDecreaseModalOpen(false);
            setNewCapacity('');
        } catch (error: any) {
            console.error('Error requesting decrease:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to submit request.' });
        } finally {
            setSubmittingTicket(false);
        }
    };
    const handleMarkComplete = useCallback(async (taskId: string) => {
        try {
            setLoadingTasks(true);
            const { error } = await supabase
                .from('tasks')
                .update({ status: 'Completed' })
                .eq('id', taskId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Task Completed', message: 'The task has been marked as complete.' });
            // The real-time subscription will handle the UI update
        } catch (err: any) {
            console.error('Error marking task as complete:', err);
            addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to complete task.' });
        } finally {
            setLoadingTasks(false);
        }
    }, [supabase, addToast]);

    const handleTaskClick = useCallback((task: Task) => {
        setSelectedTask(task);
        setIsPreviewOpen(true);
    }, []);

    const roleLower = effectiveRole?.toLowerCase().trim() || '';
    const isEarningVisible = ['super admin', 'admin', 'finance manager'].includes(roleLower);
    const isDeliveryRole = ['freelancer', 'team lead', 'team designer', 'presentation designer'].includes(roleLower);
    const showTasks = !['freelancer', 'team lead', 'team designer'].includes(roleLower);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {/* Earnings Breakdown Widget (At the absolute top for Super Admin, Admin, and Finance Manager) */}
            {profile?.id && isEarningVisible && (
                <EarningsBreakdownWidget profile={profile} role={effectiveRole} />
            )}

            {/* Staff Bulletin & Alerts for Delivery Roles (Rendered at the top) */}
            {isDeliveryRole && (
                <div className="animate-in fade-in duration-500">
                    <ElevatedMetallicCard
                        title={
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <IconBell className="w-4 h-4 text-brand-primary" />
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Staff Bulletin & Alerts</span>
                                </div>
                                {!loadingPenalties && myPenalties.length > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error border border-brand-error/30 animate-pulse">
                                        {myPenalties.length} Active Alert{myPenalties.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        }
                        bodyClassName="p-5"
                    >
                        {loadingPenalties ? (
                            <div className="py-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                            </div>
                        ) : myPenalties.length > 0 ? (
                            <div className="max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2 space-y-3">
                                {myPenalties.map((penalty) => (
                                    <div key={penalty.id} className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-4 pl-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        {/* Accent Strip on Left */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-error shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                        
                                        <div className="flex items-start gap-3">
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-error/10 border border-brand-error/20 flex items-center justify-center text-brand-error mt-0.5">
                                                <IconAlertTriangle size={16} />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-brand-error uppercase tracking-wider">Disciplinary Penalty</span>
                                                    <span className="text-gray-600 font-mono text-[9px]">•</span>
                                                    <span className="text-gray-500 text-[9px] font-bold">
                                                        Issued on: {new Date(penalty.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <h4 className="text-sm font-bold text-white leading-snug">{penalty.reason}</h4>
                                                {penalty.details && (
                                                    <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[90%]">{penalty.details}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                                            <span className="px-2.5 py-1 rounded-lg bg-brand-error/15 border border-brand-error/30 text-brand-error text-[9px] font-black tracking-wider uppercase whitespace-nowrap animate-pulse">
                                                Bonus Blocked
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-6 text-gray-500">
                                <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
                                    <IconBell size={18} className="text-gray-600" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Notice Board Empty</p>
                                <p className="text-[10px] text-gray-600 mt-1 max-w-[80%]">No active alerts, penalties, or announcements at this time.</p>
                            </div>
                        )}
                    </ElevatedMetallicCard>
                </div>
            )}

            {/* Urgent Tasks (TaskWidget) - Hide for freelancer, team lead, and team designer */}
            {profile?.id && showTasks && (
                <TaskWidget
                    profile={profile}
                    role={effectiveRole}
                    onTaskClick={handleTaskClick}
                    onMarkComplete={handleMarkComplete}
                />
            )}

            {/* Delivery Performance and Capacity Section */}
            {isDeliveryRole && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Capacity Management - Only for Team Designer */}
                    {roleLower === 'team designer' && (
                        <div className="lg:col-span-1">
                            <ElevatedMetallicCard
                                title={
                                    <div className="flex items-center gap-2">
                                        <IconTicket className="w-4 h-4 text-brand-primary" />
                                        <span className="text-sm font-bold text-brand-primary uppercase tracking-wider">Daily Project Capacity</span>
                                    </div>
                                }
                                className="h-full"
                                bodyClassName="p-6"
                            >
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Limit</p>
                                            <p className="text-2xl font-black text-white">
                                                {profile?.daily_capacity || 0} <span className="text-sm font-medium text-gray-500">projects / day</span>
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                            <IconTrendingUp className="w-6 h-6" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 py-4 border-y border-white/5">
                                        <div className="p-2 rounded-lg bg-white/5 text-gray-400">
                                            <IconCalendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Allocation Start</p>
                                            <p className="text-sm font-bold text-white">
                                                {initialTicket?.start_datetime ? formatDeadlineDate(initialTicket.start_datetime) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="recessed"
                                            size="sm"
                                            className="flex-1 border-white/5 hover:bg-white/5"
                                            onClick={() => {
                                                setNewCapacity('');
                                                setIsDecreaseModalOpen(true);
                                            }}
                                        >
                                            Decrease Limit
                                        </Button>
                                        <Button
                                            variant="metallic"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                setNewCapacity('');
                                                setIsIncreaseModalOpen(true);
                                            }}
                                        >
                                            Increase Limit
                                        </Button>
                                    </div>
                                </div>
                            </ElevatedMetallicCard>
                        </div>
                    )}

                    {/* My On-Time Delivery Performance Scorecard */}
                    <div className={roleLower === 'team designer' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                        <ElevatedMetallicCard
                            title={
                                <div className="flex items-center gap-2">
                                    <IconAward className="w-4 h-4 text-brand-primary" />
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">My On-Time Delivery Scorecard</span>
                                </div>
                            }
                            className="h-full animate-in fade-in duration-500"
                            bodyClassName="p-0 h-full"
                        >
                            {isOtdLoading ? (
                                <div className="h-full flex items-center justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-stretch w-full gap-0">

                                    {/* Left Panel: Circular Score */}
                                    <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 sm:border-r border-white/[0.06] w-full sm:w-[200px] shrink-0 overflow-hidden rounded-xl">
                                        <div className={`absolute inset-0 opacity-[0.06] pointer-events-none ${otdScore === null ? '' : otdScore >= 90 ? 'bg-emerald-500' : otdScore >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ filter: 'blur(40px)' }} />

                                        {totalDeliveries < 5 ? (
                                            /* LOCKED STATE — under 5 deliveries */
                                            <div className="flex flex-col items-center gap-3 z-10 relative">
                                                <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                                                        {totalDeliveries}/5
                                                    </p>
                                                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Deliveries</p>
                                                </div>
                                                {/* Mini progress dots */}
                                                <div className="flex gap-1.5">
                                                    {[0,1,2,3,4].map(i => (
                                                        <div key={i} className={`w-2 h-2 rounded-full ${
                                                            i < totalDeliveries ? 'bg-brand-primary' : 'bg-white/10'
                                                        }`} />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            /* UNLOCKED STATE — 5+ deliveries */
                                            <>
                                                <div className="relative w-28 h-28 flex items-center justify-center">
                                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                        <circle cx="50" cy="50" r="42" className="stroke-white/[0.05]" strokeWidth="7" fill="transparent" />
                                                        <circle
                                                            cx="50" cy="50" r="42"
                                                            className={`transition-all duration-1000 ease-out ${otdScore >= 90 ? 'stroke-brand-success' : otdScore >= 75 ? 'stroke-brand-warning' : 'stroke-brand-error'}`}
                                                            strokeWidth="7" fill="transparent"
                                                            strokeDasharray={2 * Math.PI * 42}
                                                            strokeDashoffset={2 * Math.PI * 42 * (1 - (otdScore || 0) / 100)}
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute flex flex-col items-center justify-center">
                                                        <span className="text-xl font-black text-white tracking-tight leading-none">{otdScore}%</span>
                                                        <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">OTD Score</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-col items-center gap-1.5 z-10 relative">
                                                    {otdScore === 100 && totalDeliveries >= 5 ? (
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-success/15 text-brand-success border border-brand-success/30">✦ Flawless</span>
                                                    ) : otdScore >= 90 ? (
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-success/10 text-brand-success border border-brand-success/20">Reliable</span>
                                                    ) : otdScore >= 75 ? (
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-warning/10 text-brand-warning border border-brand-warning/20">Satisfactory</span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error border border-brand-error/30">⚠ At Risk</span>
                                                    )}
                                                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Last 30 Rolling Days</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Right Panel: Stats */}
                                    <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 min-w-0">
                                        <div>
                                            <h3 className="text-sm font-black text-white tracking-tight mb-1">On-Time Performance</h3>
                                            <p className="text-[11px] text-gray-400 leading-relaxed">
                                                Your delivery rating is calculated over a rolling 30-day window. Staying above 90% OTD maintains high eligibility for priority project allocations.
                                            </p>
                                        </div>

                                        {/* Progress Bar — only when score unlocked */}
                                        {otdScore !== null ? (
                                        <div className="my-5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">OTD Progress</span>
                                                <span className={`text-[9px] font-black uppercase tracking-wider ${(otdScore || 0) >= 90 ? 'text-brand-success' : (otdScore || 0) >= 75 ? 'text-brand-warning' : 'text-brand-error'}`}>{otdScore}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${ (otdScore || 0) >= 90 ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : (otdScore || 0) >= 75 ? 'bg-brand-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-brand-error shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}
                                                    style={{ width: `${otdScore || 0}%` }}
                                                />
                                            </div>
                                            <div className="relative mt-1 h-4">
                                                <div className="absolute flex flex-col items-center" style={{ left: '75%', transform: 'translateX(-50%)' }}>
                                                    <div className="w-px h-1.5 bg-white/20" />
                                                    <span className="text-[7px] text-gray-600 font-bold">75%</span>
                                                </div>
                                                <div className="absolute flex flex-col items-center" style={{ left: '90%', transform: 'translateX(-50%)' }}>
                                                    <div className="w-px h-1.5 bg-white/20" />
                                                    <span className="text-[7px] text-gray-600 font-bold">90%</span>
                                                </div>
                                            </div>
                                        </div>
                                        ) : (
                                        /* Locked progress bar placeholder */
                                        <div className="my-5 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] flex items-center gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                            <p className="text-[10px] text-gray-500 leading-snug">
                                                Complete <span className="text-white font-black">5 deliveries</span> to unlock your OTD score
                                            </p>
                                        </div>
                                        )}

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-black text-white leading-none">{totalDeliveries}</span>
                                                    <span className="text-[8px] text-gray-600 font-bold">tasks</span>
                                                </div>
                                            </div>
                                            <div className="bg-brand-success/[0.03] border border-brand-success/[0.08] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-brand-success/[0.06] hover:border-brand-success/20 transition-all">
                                                <span className="text-[8px] font-bold text-brand-success/60 uppercase tracking-widest">On-Time</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-black text-brand-success leading-none">{timelyCount}</span>
                                                    <span className="text-[8px] text-brand-success/40 font-bold">timely</span>
                                                </div>
                                            </div>
                                            <div className={`rounded-xl p-3.5 flex flex-col gap-1 transition-all border ${lateCount > 0 ? 'bg-brand-error/[0.03] border-brand-error/[0.12] hover:bg-brand-error/[0.06] hover:border-brand-error/25' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'}`}>
                                                <span className={`text-[8px] font-bold uppercase tracking-widest ${lateCount > 0 ? 'text-brand-error/60' : 'text-gray-500'}`}>Late</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-xl font-black leading-none ${lateCount > 0 ? 'text-brand-error' : 'text-gray-500'}`}>{lateCount}</span>
                                                    <span className={`text-[8px] font-bold ${lateCount > 0 ? 'text-brand-error/40' : 'text-gray-600'}`}>delay</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </ElevatedMetallicCard>
                    </div>
                </div>
                <div className="mt-6">
                    <BonusMilestonesWidget profile={profile} role={effectiveRole} />
                </div>
            </div>
            )}

            {/* Main Dashboard Widgets for Management Roles */}
            {['super admin', 'admin', 'project manager', 'finance manager'].includes(effectiveRole?.toLowerCase().trim() || '') && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            {/* Staff Bulletin & Alerts Widget */}
                            <ElevatedMetallicCard
                                title={
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <IconBell className="w-4 h-4 text-brand-primary" />
                                            <span className="text-sm font-bold text-white uppercase tracking-wider">Staff Bulletin & Alerts</span>
                                        </div>
                                        {!loadingPenalties && myPenalties.length > 0 && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error border border-brand-error/30 animate-pulse">
                                                {myPenalties.length} Active Alert{myPenalties.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                }
                                className="h-[360px]"
                                bodyClassName="p-5 h-full flex flex-col justify-between"
                            >
                                {!loadingPenalties && myPenalties.length > 0 ? (
                                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        {myPenalties.map((penalty) => (
                                            <div key={penalty.id} className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all p-4 pl-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                {/* Accent Strip on Left */}
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-error shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                                
                                                <div className="flex items-start gap-3">
                                                    <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-error/10 border border-brand-error/20 flex items-center justify-center text-brand-error mt-0.5">
                                                        <IconAlertTriangle size={16} />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-brand-error uppercase tracking-wider">Disciplinary Penalty</span>
                                                            <span className="text-gray-600 font-mono text-[9px]">•</span>
                                                            <span className="text-gray-500 text-[9px] font-bold">
                                                                Issued on: {new Date(penalty.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-white leading-snug">{penalty.reason}</h4>
                                                        {penalty.details && (
                                                            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[90%]">{penalty.details}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 self-stretch sm:self-auto flex items-center justify-end">
                                                    <span className="px-2.5 py-1 rounded-lg bg-brand-error/15 border border-brand-error/30 text-brand-error text-[9px] font-black tracking-wider uppercase whitespace-nowrap animate-pulse">
                                                        Bonus Blocked
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                                        <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3">
                                            <IconBell size={18} className="text-gray-600" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Notice Board Empty</p>
                                        <p className="text-[10px] text-gray-600 mt-1 max-w-[80%]">No active alerts, penalties, or announcements at this time.</p>
                                    </div>
                                )}
                            </ElevatedMetallicCard>
                        </div>
                        <div className="lg:col-span-1">
                            <ProjectStatsWidget profile={profile} role={effectiveRole} />
                        </div>
                    </div>
                    <LeaderboardWidget />

                    <div className="mt-6">
                        <BonusMilestonesWidget profile={profile} role={effectiveRole} />
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => { }} // User MUST set capacity
                title="Onboarding Project Capacity"
                size="md"
                isElevatedFooter
                isElevatedHeader
                closeOnOutsideClick={false}
                footer={
                    <div className="flex justify-center w-full">
                        <Button
                            variant="metallic"
                            onClick={handleSaveCapacity}
                            isLoading={saving}
                            className="px-8 min-w-[200px]"
                        >
                            Submit Ticket
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6 animate-pulse">
                        <IconClock className="w-8 h-8" />
                    </div>

                    <div className="space-y-2 mb-8">
                        <h3 className="text-xl font-bold text-white">Setup Your Initial Capacity</h3>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-[340px]">
                            Specify when you're ready to start receiving projects and your daily handle limit.
                        </p>
                    </div>

                    <div className="w-full space-y-4 px-6">
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <DatePicker
                                label="Start Date"
                                variant="metallic"
                                placeholder="Select Date"
                                value={startDate}
                                onChange={(date) => setStartDate(date)}
                                disabled={saving}
                            />
                            <TimeSelect
                                label="Start Time"
                                variant="metallic"
                                placeholder="Select Time"
                                value={startTime}
                                onChange={(time) => setStartTime(time)}
                                disabled={saving}
                                applyLabel="Apply Date"
                            />
                        </div>
                        <Input
                            label="Daily Projects"
                            type="number"
                            variant="metallic"
                            placeholder="How many projects can you handle a day?"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            className="text-center"
                            inputClassName="text-center text-2xl font-black"
                            min={1}
                        />
                    </div>
                </div>
            </Modal>

            {/* Increase Limit Modal */}
            <Modal
                isOpen={isIncreaseModalOpen}
                onClose={() => setIsIncreaseModalOpen(false)}
                title="Request Capacity Increase"
                size="sm"
                isElevatedFooter
                isElevatedHeader
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => setIsIncreaseModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handleRequestIncrease}
                            isLoading={submittingTicket}
                            className="px-8"
                        >
                            Submit Request
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6">
                        <IconTrendingUp className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Grow Your Workload</h3>
                    <p className="text-sm text-gray-400 leading-relaxed max-w-[280px] mb-8">
                        Ready for more? Request an increase to your daily project limit. Your request will be reviewed by the operations team.
                    </p>

                    <div className="w-full max-w-[200px]">
                        <Input
                            label="New Daily Limit"
                            type="number"
                            variant="metallic"
                            value={newCapacity}
                            onChange={(e) => setNewCapacity(e.target.value)}
                            className="text-center"
                            inputClassName="text-center text-2xl font-black"
                            placeholder={`${(profile?.daily_capacity || 0) + 5}`}
                            min={(profile?.daily_capacity || 0) + 1}
                        />
                    </div>
                    <p className="mt-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                        Current Limit: {profile?.daily_capacity || 0}
                    </p>
                </div>
            </Modal>

            {/* Decrease Limit Modal */}
            <Modal
                isOpen={isDecreaseModalOpen}
                onClose={() => setIsDecreaseModalOpen(false)}
                title="Request Capacity Decrease"
                size="sm"
                isElevatedFooter
                isElevatedHeader
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => setIsDecreaseModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handleRequestDecrease}
                            isLoading={submittingTicket}
                            className="px-8 !from-gray-700 !to-gray-800 border-white/10"
                        >
                            Submit Request
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center text-gray-400 mb-6">
                        <IconTrendingUp className="w-8 h-8 rotate-180" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Reduce Your Workload</h3>
                    <p className="text-sm text-gray-400 leading-relaxed max-w-[280px] mb-8">
                        Need a break or having a busy season? Request to lower your daily project limit.
                    </p>

                    <div className="w-full max-w-[200px]">
                        <Input
                            label="New Daily Limit"
                            type="number"
                            variant="metallic"
                            value={newCapacity}
                            onChange={(e) => setNewCapacity(e.target.value)}
                            className="text-center"
                            inputClassName="text-center text-2xl font-black"
                            placeholder={`${Math.max(1, (profile?.daily_capacity || 5) - 1)}`}
                            min={1}
                            max={(profile?.daily_capacity || 1) - 1}
                        />
                    </div>
                    <p className="mt-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                        Current Limit: {profile?.daily_capacity || 0}
                    </p>
                </div>
            </Modal>
            {/* Task Preview Modal (Dashboard Version) */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title={selectedTask?.status === 'Completed' ? (
                    <div className="flex items-center gap-2">
                        <IconCheckCircle className="w-5 h-5 text-brand-success" />
                        <span className="text-brand-success">Task Completed</span>
                    </div>
                ) : (
                    selectedTask?.task || 'Task Details'
                )}
                size="md"
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            onClick={() => setIsPreviewOpen(false)}
                            className="px-8"
                        >
                            Close
                        </Button>
                        {selectedTask?.status !== 'Completed' && (
                            <Button
                                variant="metallic"
                                onClick={() => {
                                    if (selectedTask) {
                                        handleMarkComplete(selectedTask.id);
                                        setIsPreviewOpen(false);
                                    }
                                }}
                                isLoading={loadingTasks}
                                className="px-8"
                            >
                                Mark Complete
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                            Description
                        </label>
                        <div className="bg-black/20 border border-white/5 rounded-2xl p-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]">
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                                {selectedTask?.description || 'No description provided.'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Assignee</p>
                            <p className="text-sm font-bold text-white">{selectedTask?.assignee_profile?.name || 'Unassigned'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Deadline</p>
                            <p className="text-sm font-bold text-white">
                                {selectedTask?.deadline_date ? formatDeadlineDate(selectedTask.deadline_date) : 'No date'}
                                {selectedTask?.deadline_time && <span className="text-brand-primary ml-2">@ {formatTime(selectedTask.deadline_time)}</span>}
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
