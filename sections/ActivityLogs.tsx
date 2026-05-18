import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IconActivity, IconUser, IconBriefcase, IconClock, IconMessageSquare, IconRefreshCw, IconTag, IconSearch, IconChevronRight, IconMaximize } from '../components/Icons';
import { formatTime, formatDeadlineDate } from '../utils/formatter';
import { Avatar } from '../components/Avatar';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { addToast } from '../components/Toast';

interface ActivityLog {
    id: string;
    project_id: string;
    user_id: string;
    user_name: string;
    action_type: string;
    old_value: any;
    new_value: any;
    metadata: any;
    created_at: string;
}

const ActivityLogs: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [profileData, setProfileData] = useState<Record<string, { avatar_url?: string }>>({});

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (filterAction !== 'all') {
                query = query.eq('action_type', filterAction);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);

            // Fetch profiles for avatars
            const userIds = Array.from(new Set((data || []).map(l => l.user_id).filter(Boolean)));
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, avatar_url')
                    .in('id', userIds);
                
                if (profiles) {
                    const map: Record<string, { avatar_url?: string }> = {};
                    profiles.forEach(p => {
                        map[p.id] = { avatar_url: p.avatar_url };
                    });
                    setProfileData(map);
                }
            }
        } catch (err: any) {
            console.error('Error fetching logs:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load activity logs' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        // Realtime subscription
        const channel = supabase
            .channel('activity_logs_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, (payload) => {
                setLogs(prev => [payload.new as ActivityLog, ...prev].slice(0, 100));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [filterAction]);

    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const next = new Set(expandedLogs);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedLogs(next);
    };

    const renderActionIcon = (type: string) => {
        switch (type) {
            case 'project_created': return <IconBriefcase className="text-brand-success" size={16} />;
            case 'status_change': return <IconRefreshCw className="text-brand-primary" size={16} />;
            case 'qa_status_change': return <IconActivity className="text-brand-primary" size={16} />;
            case 'comment': return <IconMessageSquare className="text-brand-primary" size={16} />;
            case 'qa_comment': return <IconMessageSquare className="text-brand-primary" size={16} />;
            case 'assignee_change': return <IconUser className="text-brand-primary" size={16} />;
            default: return <IconActivity className="text-brand-primary" size={16} />;
        }
    };

    const renderLogContent = (log: ActivityLog) => {
        const projectTitle = log.metadata?.project_title || log.project_id;
        const isExpanded = expandedLogs.has(log.id);
        
        switch (log.action_type) {
            case 'project_created':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <span>
                                created a new project <span className="text-white font-bold">"{projectTitle}"</span>
                            </span>
                            <button 
                                onClick={() => toggleExpand(log.id)}
                                className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-white transition-colors flex items-center gap-1 bg-brand-primary/10 px-2 py-1 rounded-lg border border-brand-primary/20"
                            >
                                {isExpanded ? 'Hide Details' : 'See more details'}
                                <IconChevronRight size={10} className={`transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        </div>
                        
                        {isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-black/40 rounded-xl border border-white/5 animate-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Assignee</span>
                                    <p className="text-sm text-white font-bold">{log.new_value?.assignee || 'Not assigned'}</p>
                                </div>
                                <div className="space-y-1 border-l border-white/5 pl-4">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Initial Price</span>
                                    <p className="text-sm text-white font-bold">${log.new_value?.price || '0'}</p>
                                </div>
                                <div className="space-y-1 border-l border-white/5 pl-4">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Status</span>
                                    <p className="text-sm text-white font-bold">{log.new_value?.status || 'Pending'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'status_change':
                return (
                    <span>
                        moved <span className="text-white font-bold">"{projectTitle}"</span> from <span className="text-gray-400 italic">{log.old_value?.status}</span> to <span className="text-brand-primary font-bold">{log.new_value?.status}</span>
                    </span>
                );
            case 'qa_status_change':
                return (
                    <span>
                        updated QA status for <span className="text-white font-bold">"{projectTitle}"</span> to <span className="text-brand-primary font-bold">{log.new_value?.qa_status?.replace('_', ' ')}</span>
                    </span>
                );
            case 'comment':
                return (
                    <span>
                        commented on <span className="text-white font-bold">"{projectTitle}"</span>: <span className="text-gray-400">"{log.new_value?.content?.substring(0, 100)}{log.new_value?.content?.length > 100 ? '...' : ''}"</span>
                    </span>
                );
            case 'qa_comment':
                return (
                    <span>
                        posted a <span className="text-brand-primary font-bold italic">QA feedback</span> on <span className="text-white font-bold">"{projectTitle}"</span>
                    </span>
                );
            case 'assignee_change':
                const assignee = log.new_value?.assignee;
                return (
                    <span>
                        assigned <span className="text-white font-bold">"{projectTitle}"</span> to <span className="text-brand-primary font-bold">{assignee || 'someone else'}</span>
                    </span>
                );
            default:
                return <span>performed an action on {projectTitle}</span>;
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.user_name?.toLowerCase().includes(q) ||
            log.project_id?.toLowerCase().includes(q) ||
            log.metadata?.project_title?.toLowerCase().includes(q) ||
            log.action_type?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="h-full flex flex-col bg-surface-bg p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-3">
                <Dropdown
                    value={filterAction}
                    onChange={setFilterAction}
                    variant="recessed"
                    options={[
                        { label: 'All Activities', value: 'all' },
                        { label: 'Project Created', value: 'project_created' },
                        { label: 'Status Changes', value: 'status_change' },
                        { label: 'QA Updates', value: 'qa_status_change' },
                        { label: 'Comments', value: 'comment' },
                        { label: 'Assignments', value: 'assignee_change' }
                    ]}
                    className="min-w-[180px]"
                />
                <Input
                    placeholder="Find activity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    variant="recessed"
                    leftIcon={<IconSearch size={18} />}
                    className="min-w-[240px]"
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />)}
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                        <IconActivity size={64} className="text-gray-600 mb-4" />
                        <p className="text-lg font-bold">No logs found</p>
                        <p className="text-sm">Try adjusting your filters or search query</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredLogs.map((log) => (
                            <div 
                                key={log.id} 
                                className="group relative p-6 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 flex items-start gap-5"
                            >
                                {/* Top Edge Highlight for Elevation */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                {/* Diagonal Metallic Shine Overlay */}
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] pointer-events-none opacity-40" />
                                {/* Center-weighted Shadow Depth Falloff */}
                                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-4 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none" />
                                
                                <div className="shrink-0 relative z-10">
                                    <Avatar 
                                        size="md" 
                                        src={profileData[log.user_id]?.avatar_url} 
                                        initials={log.user_name?.substring(0, 2).toUpperCase() || '??'} 
                                        className="border-2 border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                
                                <div className="flex-1 min-w-0 z-10">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-sm tracking-tight">{log.user_name || 'System'}</span>
                                            <div className="w-1 h-1 rounded-full bg-white/20" />
                                            <span className="text-[10px] uppercase font-black tracking-[0.15em] text-brand-primary opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                                                {renderActionIcon(log.action_type)}
                                                {log.action_type.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                                            <IconClock size={12} className="mr-1.5 opacity-60" />
                                            {formatDeadlineDate(log.created_at)} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    <div className="text-[13px] text-gray-300 leading-relaxed font-medium">
                                        {renderLogContent(log)}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => {
                                        if (log.project_id) {
                                            window.history.pushState(null, '', `/projects/${encodeURIComponent(log.project_id)}`);
                                            window.dispatchEvent(new PopStateEvent('popstate'));
                                        }
                                    }}
                                    className="shrink-0 self-center p-3 rounded-2xl bg-white/[0.03] text-gray-500 hover:text-white hover:bg-brand-primary/20 border border-white/5 transition-all opacity-0 group-hover:opacity-100 z-10 active:scale-95"
                                >
                                    <IconMaximize size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
