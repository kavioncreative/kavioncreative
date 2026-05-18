import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './Surfaces';
import { IconTrendingUp, IconAward, IconChevronRight } from './Icons';
import { Dropdown } from './Dropdown';
import { useUser } from '../contexts/UserContext';

interface ScorecardLeaderboardTabProps {
    users: { id: string; name: string; avatar_url?: string }[];
}

export const ScorecardLeaderboardTab: React.FC<ScorecardLeaderboardTabProps> = ({ users }) => {
    const { profile } = useUser();
    
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        fetchLeaderboardData();
    }, [timeRange]);

    const fetchLeaderboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch categories for filter
            const { data: catsData } = await supabase.from('scorecard_categories').select('*').eq('is_active', true);
            setCategories(catsData || []);

            // 2. Determine time range
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

            // 3. Fetch submissions
            const { data: subsData, error: subsError } = await supabase
                .from('scorecard_submissions')
                .select('*')
                .gte('created_at', startDate.toISOString());

            if (subsError) throw subsError;
            setSubmissions(subsData || []);
            
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Process and sort rankings
    const rankings = useMemo(() => {
        // Filter by category if selected
        const filteredSubs = selectedCategory !== 'all' 
            ? submissions.filter(s => s.category_id === selectedCategory) 
            : submissions;

        // Group by user
        const userStats: Record<string, { points: number; actions: number }> = {};
        
        filteredSubs.forEach(sub => {
            const uid = sub.user_id;
            if (!uid) return;
            if (!userStats[uid]) {
                userStats[uid] = { points: 0, actions: 0 };
            }
            userStats[uid].points += Number(sub.points || 0);
            userStats[uid].actions += 1;
        });

        // Convert to array and map user details
        const rankedArray = Object.keys(userStats).map(uid => {
            const userDetails = users.find(u => u.id === uid) || { name: 'Unknown User', avatar_url: undefined };
            return {
                userId: uid,
                name: userDetails.name,
                avatar_url: userDetails.avatar_url,
                points: userStats[uid].points,
                actions: userStats[uid].actions
            };
        });

        // Sort: Points DESC, then Actions DESC (tie-breaker)
        rankedArray.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.actions - a.actions;
        });

        return rankedArray;
    }, [submissions, selectedCategory, users]);

    const timeOptions = [
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' }
    ];

    const categoryOptions = [
        { label: 'All Categories', value: 'all' },
        ...categories.map(c => ({ label: c.name, value: c.id }))
    ];

    // Helpers for top 3 styling
    const getRankStyle = (rank: number, isCurrentUser: boolean) => {
        const baseClass = "p-4 rounded-2xl border transition-all flex items-center justify-between";
        const currentHighlight = isCurrentUser ? "ring-2 ring-brand-primary shadow-[0_0_20px_rgba(var(--brand-primary),0.3)]" : "";

        if (rank === 1) return `${baseClass} bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/5 border-[#FFD700]/50 ${currentHighlight}`;
        if (rank === 2) return `${baseClass} bg-gradient-to-r from-[#C0C0C0]/20 to-[#C0C0C0]/5 border-[#C0C0C0]/50 ${currentHighlight}`;
        if (rank === 3) return `${baseClass} bg-gradient-to-r from-[#CD7F32]/20 to-[#CD7F32]/5 border-[#CD7F32]/50 ${currentHighlight}`;
        
        return `${baseClass} bg-[#1A1A1A] border-white/5 hover:border-white/10 ${currentHighlight}`;
    };

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <div className="w-8 h-8 rounded-full bg-[#FFD700]/20 border border-[#FFD700] flex items-center justify-center text-[#FFD700] font-black shadow-[0_0_15px_rgba(255,215,0,0.4)]">1</div>;
        if (rank === 2) return <div className="w-8 h-8 rounded-full bg-[#C0C0C0]/20 border border-[#C0C0C0] flex items-center justify-center text-[#C0C0C0] font-black">2</div>;
        if (rank === 3) return <div className="w-8 h-8 rounded-full bg-[#CD7F32]/20 border border-[#CD7F32] flex items-center justify-center text-[#CD7F32] font-black">3</div>;
        
        return <div className="w-8 h-8 flex items-center justify-center text-gray-500 font-bold">#{rank}</div>;
    };

    return (
        <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">Performance Leaderboard</h3>
                    <p className="text-xs text-gray-400">Ranked by total points earned</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-48">
                        <Dropdown
                            options={categoryOptions}
                            value={selectedCategory}
                            onChange={(val) => setSelectedCategory(val as string)}
                        />
                    </div>
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
                    Calculating rankings...
                </div>
            ) : rankings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 border border-dashed border-white/10 rounded-xl">
                    <IconTrendingUp size={32} className="text-gray-500" />
                    <p className="text-sm text-gray-500">No rankings available for this period.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rankings.map((user, index) => {
                        const rank = index + 1;
                        const isCurrentUser = user.userId === profile?.id;

                        return (
                            <div key={user.userId} className={getRankStyle(rank, isCurrentUser)}>
                                <div className="flex items-center gap-4">
                                    {getRankBadge(rank)}
                                    <div className="flex items-center gap-3">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white tracking-wide">{user.name}</p>
                                                {isCurrentUser && (
                                                    <span className="px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary text-[9px] font-black uppercase tracking-widest border border-brand-primary/30">You</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 font-medium">{user.actions} Total Actions</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1.5">
                                            <IconAward size={14} className={rank <= 3 ? (rank === 1 ? 'text-[#FFD700]' : rank === 2 ? 'text-[#C0C0C0]' : 'text-[#CD7F32]') : 'text-brand-primary'} />
                                            <span className="text-xl font-black text-white">{user.points}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Points</span>
                                    </div>
                                    <IconChevronRight size={16} className="text-gray-600 hidden sm:block" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};
