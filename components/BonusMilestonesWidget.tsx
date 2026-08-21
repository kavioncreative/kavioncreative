import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, ElevatedMetallicCard } from './Surfaces';
import { IconAward } from './Icons';

interface BonusMilestonesWidgetProps {
    profile: any;
    role: string | null;
    dateFrom?: Date | null;
    dateTo?: Date | null;
}

export const BonusMilestonesWidget: React.FC<BonusMilestonesWidgetProps> = ({ profile, role, dateFrom, dateTo }) => {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [progressStats, setProgressStats] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (profile?.id && role) {
            fetchMilestonesAndProgress();
        }
    }, [profile?.id, role, dateFrom, dateTo]);

    const fetchMilestonesAndProgress = async () => {
        // Only show skeleton on very first load, not on background refreshes
        if (milestones.length === 0) setIsLoading(true);
        try {
            const { data: allStructures, error } = await supabase
                .from('bonus_structures')
                .select('*');

            if (error) throw error;

            const bonusData = (allStructures || []).filter(b => {
                const roles = (b.role || '').split(',').map((r: string) => r.trim().toLowerCase());
                return roles.includes((role || '').toLowerCase());
            });

            if (!bonusData || bonusData.length === 0) {
                setMilestones([]);
                setIsLoading(false);
                return;
            }

            setMilestones(bonusData);

            // 2. Fetch selected or current month's boundaries
            const startOfMonth = dateFrom ? new Date(dateFrom) : new Date();
            if (!dateFrom) {
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
            }
            const endOfMonth = dateTo ? new Date(dateTo) : new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

            const stats: any = {};

            // Loop and fetch progress stats on demand
            for (const bonus of bonusData) {
                let currentVal = 0;

                if (bonus.calc_type === 'Volume') {
                    // Count completed projects this month
                    const isPm = role.toLowerCase().includes('manager') || role.toLowerCase().includes('admin');
                    let query = supabase
                        .from('projects')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'Approved')
                        .gte('created_at', startOfMonth.toISOString())
                        .lte('created_at', endOfMonth.toISOString());
                    
                    if (isPm) {
                        query = query.eq('primary_manager_id', profile.id);
                    } else {
                        query = query.eq('assignee', profile.id);
                    }

                    const { count } = await query;
                    currentVal = count || 0;

                } else if (bonus.calc_type === 'Percentage') {
                    // Count converted leads vs total leads this month
                    const { data: leads } = await supabase
                        .from('leads')
                        .select('status')
                        .eq('assigned_to', profile.id)
                        .gte('created_at', startOfMonth.toISOString())
                        .lte('created_at', endOfMonth.toISOString());

                    if (leads && leads.length > 0) {
                        const converted = leads.filter(l => l.status === 'Converted').length;
                        currentVal = Math.round((converted / leads.length) * 100);
                    } else {
                        currentVal = 0;
                    }

                } else if (bonus.calc_type === 'Rating') {
                    // Average rating of reviews this month
                    const { data: reviews } = await supabase
                        .from('reviews')
                        .select('rating')
                        .eq('user_id', profile.id)
                        .gte('created_at', startOfMonth.toISOString())
                        .lte('created_at', endOfMonth.toISOString());

                    if (reviews && reviews.length > 0) {
                        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                        currentVal = Math.round((sum / reviews.length) * 10) / 10;
                    } else {
                        currentVal = 0;
                    }

                } else if (bonus.calc_type === 'Punctuality') {
                    // Count of on-time attendance records this month
                    const { data: attendance } = await supabase
                        .from('attendance_records')
                        .select('punch_in_at')
                        .eq('user_id', profile.id)
                        .gte('punch_in_at', startOfMonth.toISOString())
                        .lte('punch_in_at', endOfMonth.toISOString());

                    let onTimeCount = 0;
                    if (attendance && attendance.length > 0) {
                        // Fetch shift timing to check boundary
                        const { data: shift } = await supabase
                            .from('user_shifts')
                            .select('start_time')
                            .eq('user_id', profile.id)
                            .single();

                        const shiftStartStr = shift?.start_time || '09:00:00';
                        const [sH, sM] = shiftStartStr.split(':').map(Number);

                        attendance.forEach(rec => {
                            const pIn = new Date(rec.punch_in_at);
                            const checkTime = pIn.getHours() * 60 + pIn.getMinutes();
                            const limitTime = sH * 60 + sM + 15; // 15-minute grace limit
                            if (checkTime <= limitTime) {
                                onTimeCount++;
                            }
                        });
                    }
                    currentVal = onTimeCount;
                } else if (bonus.calc_type === 'Penalties') {
                    // Count of active (Valid) user penalties this month
                    const { count } = await supabase
                        .from('user_penalties')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', profile.id)
                        .eq('status', 'Valid')
                        .gte('created_at', startOfMonth.toISOString())
                        .lte('created_at', endOfMonth.toISOString());

                    currentVal = count || 0;
                }

                stats[bonus.id] = currentVal;
            }

            setProgressStats(stats);
        } catch (e) {
            console.error('Error fetching dashboard bonus progress:', e);
        } finally {
            setIsLoading(false);
        }
    };



    const achievedCount = milestones.reduce((count, milestone) => {
        const currentVal = progressStats[milestone.id] || 0;
        let resolvedTarget = milestone.target;
        if (milestone.calc_type === 'Punctuality' && milestone.target === 0) {
            const now = new Date();
            resolvedTarget = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        }
        let percent = 0;
        if (milestone.calc_type === 'Penalties') {
            percent = currentVal === 0 ? 100 : 0;
        } else {
            percent = resolvedTarget > 0 ? Math.min((currentVal / resolvedTarget) * 100, 100) : 0;
        }
        return percent >= 100 ? count + 1 : count;
    }, 0);

    if (isLoading) {
        return (
            <Card className="p-6 md:p-8 animate-pulse bg-surface-card border border-surface-border">
                <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
                <div className="h-4 bg-white/5 rounded w-2/3 mb-2" />
                <div className="h-8 bg-white/5 rounded w-full mt-4" />
            </Card>
        );
    }

    if (milestones.length === 0) return null;

    return (
        <ElevatedMetallicCard
            title={
                <div 
                    className="flex items-center justify-between w-full cursor-pointer select-none"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <IconAward className="w-4 h-4 text-brand-primary shrink-0" />
                        <span className="text-sm font-bold text-white uppercase tracking-wider truncate">My Milestone Bonuses</span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-success/15 border border-brand-success/20 text-brand-success ml-2 whitespace-nowrap">
                            Achieved {achievedCount} / {milestones.length}
                        </span>
                    </div>
                    <button className="p-1 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white shrink-0 ml-4">
                        {isExpanded ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                    </button>
                </div>
            }
            headerClassName="px-8 py-5"
            bodyClassName={`p-8 ${isExpanded ? 'block' : 'hidden'}`}
        >
            <p className="text-xs text-gray-500 font-medium leading-relaxed -mt-2 mb-6">
                Real-time target trackers for your role's monthly bonus payouts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {milestones.map((milestone) => {
                    const currentVal = progressStats[milestone.id] || 0;

                    let resolvedTarget = milestone.target;
                    if (milestone.calc_type === 'Punctuality' && milestone.target === 0) {
                        const now = new Date();
                        resolvedTarget = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    }

                    let percent = 0;
                    if (milestone.calc_type === 'Penalties') {
                        percent = currentVal === 0 ? 100 : 0;
                    } else {
                        percent = resolvedTarget > 0 ? Math.min((currentVal / resolvedTarget) * 100, 100) : 0;
                    }

                    const isAchieved = percent >= 100;
                    const progressColor = isAchieved
                        ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                        : 'bg-gradient-to-r from-brand-primary to-[#D9361A]';

                    const currentLabel = milestone.calc_type === 'Penalties'
                        ? (currentVal === 0 ? 'Zero Penalties' : `${currentVal} Penalty`)
                        : milestone.calc_type === 'Percentage'
                        ? `${currentVal}%`
                        : milestone.calc_type === 'Rating'
                        ? `${currentVal} ★`
                        : `${currentVal} / ${resolvedTarget}`;

                    return (
                        <div
                            key={milestone.id}
                            className={`flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                                isAchieved
                                    ? 'bg-brand-success/[0.03] border-brand-success/15 hover:border-brand-success/25'
                                    : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03]'
                            }`}
                        >
                            {/* Top Row: Name + Amount */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest leading-tight truncate">
                                        {milestone.name}
                                    </h4>
                                    {milestone.description && (
                                        <p className="text-[10px] text-gray-500 mt-1 leading-snug line-clamp-2">
                                            {milestone.description}
                                        </p>
                                    )}
                                </div>
                                <span className={`shrink-0 text-[10px] font-black tracking-wider px-2.5 py-1.5 rounded-lg border ${
                                    isAchieved
                                        ? 'bg-brand-success/10 border-brand-success/20 text-brand-success'
                                        : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                                }`}>
                                    +{milestone.currency} {(milestone.amount || 0).toLocaleString()}
                                </span>
                            </div>

                            {/* Bottom: Progress */}
                            <div className="space-y-2">
                                <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                        {milestone.calc_type}
                                    </span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                        isAchieved ? 'text-brand-success' : 'text-gray-400'
                                    }`}>
                                        {isAchieved ? '✓ Achieved' : currentLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ElevatedMetallicCard>
    );
};

