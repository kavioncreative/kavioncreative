import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './Surfaces';
import { IconTarget, IconAlertTriangle, IconCheckCircle } from './Icons';
import { Dropdown } from './Dropdown';
import { useUser } from '../contexts/UserContext';

interface ScorecardTargetsTabProps {
    users: { id: string; name: string }[];
}

export const ScorecardTargetsTab: React.FC<ScorecardTargetsTabProps> = ({ users }) => {
    const { profile, effectiveRole } = useUser();
    const isAdmin = effectiveRole?.includes('admin') || effectiveRole?.includes('manager');
    
    const [targets, setTargets] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
    const [selectedUserId, setSelectedUserId] = useState<string>('all');

    useEffect(() => {
        // Enforce user scope
        if (!isAdmin && profile?.id) {
            setSelectedUserId(profile.id);
        }
    }, [isAdmin, profile?.id]);

    useEffect(() => {
        fetchTargetsData();
    }, [timeRange, selectedUserId, isAdmin, profile?.id]);

    const fetchTargetsData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Targets
            let targetsQuery = supabase.from('scorecard_targets').select('*').order('metric');
            
            // Note: Targets with user_id = null apply to ALL users. 
            // So we fetch targets where user_id is the selected user OR user_id is null.
            const targetUserId = !isAdmin ? profile?.id : (selectedUserId !== 'all' ? selectedUserId : null);
            if (targetUserId) {
                targetsQuery = targetsQuery.or(`user_id.eq.${targetUserId},user_id.is.null`);
            }
            
            const { data: targetsData, error: targetsError } = await targetsQuery;
            if (targetsError) throw targetsError;
            setTargets(targetsData || []);

            // 2. Fetch Submissions (Actuals)
            const now = new Date();
            let startDate = new Date();
            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'week') {
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                startDate = new Date(startDate.setDate(diff));
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            let subsQuery = supabase
                .from('scorecard_submissions')
                .select('*')
                .gte('created_at', startDate.toISOString());

            if (targetUserId) {
                subsQuery = subsQuery.eq('user_id', targetUserId);
            }
            const { data: subsData, error: subsError } = await subsQuery;
            if (subsError) throw subsError;
            setSubmissions(subsData || []);
            
        } catch (error) {
            console.error('Error fetching targets dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to get actionable name
    const actionTypeLabels: Record<string, string> = {
        'comment': 'Comments',
        'status_change': 'Status Changes',
        'file_sent': 'Files Sent',
        'new_chat': 'New Chats',
        'existing_client': 'Existing Client Dealing'
    };

    const timeOptions = [
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' }
    ];

    const userOptions = [
        { label: 'All Users', value: 'all' },
        ...users.map(u => ({ label: u.name, value: u.id }))
    ];

    // Grouping by User ID (if viewing all) or just listing targets
    // For simplicity, if viewing "All Users", we still just evaluate the targets collectively, 
    // but usually targets are per-user. We'll show an aggregated view if 'all' is selected.
    
    return (
        <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">User Targets & Progress</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {isAdmin && (
                        <div className="w-48">
                            <Dropdown
                                options={userOptions}
                                value={selectedUserId}
                                onChange={(val) => setSelectedUserId(val as string)}
                                placeholder="Select User"
                                showSearch
                            />
                        </div>
                    )}
                    <div className="w-40">
                        <Dropdown
                            options={timeOptions}
                            value={timeRange}
                            onChange={(val) => setTimeRange(val as any)}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20 text-gray-500">
                    Loading targets...
                </div>
            ) : selectedUserId === 'all' ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 border border-dashed border-white/10 rounded-xl">
                    <IconTarget size={32} className="text-gray-500" />
                    <p className="text-sm text-gray-500">Please select a specific user to view their target progress.</p>
                </div>
            ) : targets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 border border-dashed border-white/10 rounded-xl">
                    <IconTarget size={32} className="text-gray-500" />
                    <p className="text-sm text-gray-500">No targets assigned for the selected criteria.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {targets.map(target => {
                        // Calculate Actuals
                        // Metric is expected to be the action_type
                        const actualSubs = submissions.filter(s => s.action_type === target.metric);
                        const actualCount = actualSubs.length;
                        const targetValue = Number(target.target_value) || 1;
                        let progress = (actualCount / targetValue) * 100;
                        if (progress > 100) progress = 100;

                        // Visuals
                        let barColor = 'bg-brand-error'; // < 50%
                        let icon = <IconAlertTriangle size={16} className="text-brand-error" />;
                        
                        if (progress >= 100) {
                            barColor = 'bg-brand-success shadow-[0_0_15px_rgba(34,197,94,0.5)]';
                            icon = <IconCheckCircle size={16} className="text-brand-success" />;
                        } else if (progress >= 50) {
                            barColor = 'bg-brand-primary';
                            icon = <IconTarget size={16} className="text-brand-primary" />;
                        }

                        const labelName = actionTypeLabels[target.metric] || target.metric;
                        
                        // If target applies to specific user, show name
                        const assignedToName = target.user_id ? users.find(u => u.id === target.user_id)?.name : 'All Users';

                        return (
                            <div key={target.id} className="p-5 rounded-2xl bg-[#1A1A1A] border border-white/5 space-y-4 relative overflow-hidden group hover:border-white/10 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {icon}
                                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{labelName}</h4>
                                        </div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Assigned to: {assignedToName}</p>
                                    </div>
                                    <div className="text-right flex items-baseline gap-1">
                                        <p className="text-2xl font-black text-white">
                                            {actualCount} <span className="text-sm text-gray-500 font-medium">/ {targetValue}</span>
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">per {target.timeframe === 'weekly' ? 'week' : target.timeframe === 'monthly' ? 'month' : 'day'}</p>
                                    </div>
                                </div>
                                
                                <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5">
                                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};
