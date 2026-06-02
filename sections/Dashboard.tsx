import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';
import { IconClock, IconZap, IconTrendingUp, IconCalendar, IconTicket, IconPlay, IconList, IconChevronRight, IconAlertTriangle, IconCheckCircle, IconX, IconSend, IconMoreVertical, IconUser } from '../components/Icons';
import { ElevatedMetallicCard } from '../components/Surfaces';
import { getStatusCapsuleClasses } from '../components/Badge';
import { formatDeadlineDate, getTimeLeft, formatTime } from '../utils/formatter';
import { DatePicker } from '../components/DatePicker';
import { TimeSelect } from '../components/TimeSelect';

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
                        <span className="text-sm font-bold text-brand-primary uppercase tracking-wider">Project Velocity (All-Time)</span>
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

    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (headerRef.current) {
            headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }, []);

    return (
        <ElevatedMetallicCard
            title={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <IconList className="w-4 h-4 text-brand-primary" />
                        <span className="text-sm font-bold text-brand-primary uppercase tracking-wider">Urgent Tasks</span>
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
                <>
                    {/* Synchronized Header - Only Horizontal Sync */}
                    <div 
                        ref={headerRef}
                        className="flex-none overflow-hidden border-b border-surface-border relative z-30"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%), linear-gradient(115deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%)',
                            backgroundSize: '100% 100%',
                            backgroundColor: '#1A1A1A'
                        }}
                    >
                        <div className="min-w-[1200px]">
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-20 whitespace-nowrap text-center">S. NO.</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white text-left">TASK</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-32 whitespace-nowrap text-center">CREATED BY</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-32 whitespace-nowrap text-center">ASSIGNEE</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-32 whitespace-nowrap text-center">STATUS</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-40 whitespace-nowrap text-center">DEADLINE</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-40 whitespace-nowrap text-center">TIME LEFT</th>
                                        <th className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white w-28 whitespace-nowrap text-center">ACTIONS</th>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    </div>

                    {/* Scrollable Body - Vertical Scrollbar starts HERE */}
                    <div 
                        ref={bodyRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30 transition-colors min-h-0 relative overscroll-behavior-contain"
                    >
                        <div className="min-w-[1200px]">
                            <table className="w-full text-left border-collapse table-fixed">
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
                                                <td className="px-3.5 py-1.5 text-center w-32">
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
                                            <td className="px-3.5 py-1.5 text-center w-32">-</td>
                                            <td className="px-3.5 py-1.5 text-center w-40">-</td>
                                            <td className="px-3.5 py-1.5 text-center w-40">-</td>
                                            <td className="px-3.5 py-1.5 text-center w-28">-</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
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
        const roleLower = effectiveRole?.toLowerCase().trim();
        // Popup for TLs and independent Freelancers ONLY. Team Designers are managed by TLs.
        const shouldShowCapacityPopup = (roleLower === 'freelancer' || roleLower === 'team lead') && !roleLower.includes('team designer');
        
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
                .update({ status: 'Completed', updated_at: new Date().toISOString() })
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



    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {/* Capacity Management for Freelancers/Team Leads */}
            {(effectiveRole?.toLowerCase().trim() === 'freelancer' || effectiveRole?.toLowerCase().trim() === 'team lead' || effectiveRole?.toLowerCase().trim() === 'team designer') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                </div>
            )}

            {/* Main Dashboard Widgets for Management Roles */}
            {['super admin', 'admin', 'project manager'].includes(effectiveRole?.toLowerCase().trim() || '') && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                        <TaskWidget 
                            profile={profile} 
                            role={effectiveRole} 
                            onTaskClick={handleTaskClick}
                            onMarkComplete={handleMarkComplete}
                        />
                        </div>
                        <div className="lg:col-span-1">
                            <ProjectStatsWidget profile={profile} role={effectiveRole} />
                        </div>
                    </div>

                    {/* Placeholder for future modules */}
                    <div className="flex flex-col items-center justify-center min-h-[150px] text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">More Modules Coming Soon</p>
                        <p className="text-[11px] text-gray-500 max-w-sm uppercase font-medium tracking-widest">We are integrating Projects, Earnings, and Analytics widgets into your workspace.</p>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => {}} // User MUST set capacity
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
