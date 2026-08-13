import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './Surfaces';
import { IconAward } from './Icons';

interface BonusMilestonesWidgetProps {
    profile: any;
    role: string | null;
}

export const BonusMilestonesWidget: React.FC<BonusMilestonesWidgetProps> = ({ profile, role }) => {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [progressStats, setProgressStats] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (profile && role) {
            fetchMilestonesAndProgress();
        }
    }, [profile, role]);

    const fetchMilestonesAndProgress = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch active bonus structures for this user's role
            const { data: bonusData } = await supabase
                .from('bonus_structures')
                .select('*')
                .eq('role', role);

            if (!bonusData || bonusData.length === 0) {
                setMilestones([]);
                setIsLoading(false);
                return;
            }

            setMilestones(bonusData);

            // 2. Fetch current month's boundaries
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

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
                        .gte('created_at', startOfMonth.toISOString());
                    
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
                        .gte('created_at', startOfMonth.toISOString());

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
                        .gte('created_at', startOfMonth.toISOString());

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
                        .gte('punch_in_at', startOfMonth.toISOString());

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

    // Motivational copywriting engine based on progress percent
    const getMotivationalCopy = (current: number, target: number, calcType: string) => {
        const percent = Math.min((current / target) * 100, 100);
        if (percent === 100) return '🏆 Milestone Unlocked! Outstanding performance!';
        if (percent >= 80) {
            const diff = Math.round((target - current) * 10) / 10;
            return `🔥 You are so close! Only ${diff} ${calcType === 'Percentage' ? '%' : calcType === 'Rating' ? 'stars' : 'more'} to lock in your reward!`;
        }
        if (percent >= 50) return '⚡ Great pace! You are halfway to your bonus milestone.';
        return '🚀 Keep going! Build momentum to claim this month\'s target payouts.';
    };

    if (isLoading) {
        return (
            <Card className="p-6 md:p-8 animate-pulse bg-surface-card border border-surface-border">
                <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
                <div className="h-4 bg-white/5 rounded w-2/3 mb-2" />
                <div className="h-8 bg-white/5 rounded w-full mt-4" />
            </Card>
        );
    }

    if (milestones.length === 0) return null; // Hide if no configured targets for role

    return (
        <Card className="p-6 md:p-8 bg-surface-card border border-surface-border rounded-3xl relative overflow-hidden animate-in fade-in duration-500 shadow-[0_12px_24px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                    <IconAward size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider">My Milestone Bonuses</h3>
                    <p className="text-xs text-gray-500">Real-time target trackers for your role's extra monthly payouts.</p>
                </div>
            </div>

            <div className="space-y-6 relative z-10">
                {milestones.map((milestone) => {
                    const currentVal = progressStats[milestone.id] || 0;
                    const percent = Math.min((currentVal / milestone.target) * 100, 100);
                    
                    return (
                        <div key={milestone.id} className="space-y-3 p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wide">{milestone.name}</h4>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        Type: {milestone.calc_type} • Current: {currentVal} / {milestone.target}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black tracking-wider uppercase">
                                        +{milestone.currency} {milestone.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* visual progress bar */}
                            <div className="space-y-1">
                                <div className="w-full h-3 rounded-full bg-black/40 overflow-hidden border border-white/5 p-[1.5px]">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,77,45,0.3)]
                                            ${percent >= 100 ? 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
                                            ${percent >= 50 && percent < 100 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : ''}
                                            ${percent < 50 ? 'bg-gradient-to-r from-red-500 to-brand-primary' : ''}
                                        `}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-white font-mono">{Math.round(percent)}%</span>
                                    <span className={`uppercase tracking-wider ${percent >= 100 ? 'text-emerald-400' : 'text-gray-500'}`}>
                                        {percent >= 100 ? 'Target Achieved' : getMotivationalCopy(currentVal, milestone.target, milestone.calc_type)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
