import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './Surfaces';
import { IconList } from './Icons';
import { Dropdown } from './Dropdown';
import { useUser } from '../contexts/UserContext';

interface ScorecardSubmissionsTabProps {
    users: { id: string; name: string }[];
}

export const ScorecardSubmissionsTab: React.FC<ScorecardSubmissionsTabProps> = ({ users }) => {
    const { profile, effectiveRole } = useUser();
    const isAdmin = effectiveRole?.includes('admin') || effectiveRole?.includes('manager');
    
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
    const [selectedUserId, setSelectedUserId] = useState<string>('all');

    useEffect(() => {
        // If not admin, enforce selectedUserId to their own ID
        if (!isAdmin && profile?.id) {
            setSelectedUserId(profile.id);
        }
    }, [isAdmin, profile?.id]);

    useEffect(() => {
        fetchDashboardData();
    }, [timeRange, selectedUserId, isAdmin, profile?.id]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch active categories
            const { data: cats, error: catsError } = await supabase
                .from('scorecard_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');
            if (catsError) throw catsError;
            setCategories(cats || []);

            // 2. Determine date filter
            const now = new Date();
            let startDate = new Date();
            if (timeRange === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'week') {
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
                startDate = new Date(startDate.setDate(diff));
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            // 3. Fetch submissions
            let query = supabase
                .from('scorecard_submissions')
                .select('*')
                .gte('created_at', startDate.toISOString());

            // If a specific user is selected or we're not an admin, filter by user ID
            const targetUserId = !isAdmin ? profile?.id : (selectedUserId !== 'all' ? selectedUserId : null);
            if (targetUserId) {
                query = query.eq('user_id', targetUserId);
            }

            const { data: subs, error: subsError } = await query;
            if (subsError) throw subsError;
            setSubmissions(subs || []);
            
        } catch (error) {
            console.error('Error fetching submissions dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate aggregations per category
    const getCategoryStats = (categoryId: string) => {
        const catSubs = submissions.filter(s => s.category_id === categoryId);
        const totalActions = catSubs.length;
        const totalPoints = catSubs.reduce((sum, s) => sum + Number(s.points || 0), 0);
        return { totalActions, totalPoints };
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

    return (
        <Card className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Submissions Overview</h3>
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
                    Loading dashboard...
                </div>
            ) : categories.length === 0 ? (
                <div className="flex justify-center items-center py-20 text-gray-500">
                    No active categories found. Please configure rules first.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {categories.map(cat => {
                        const { totalActions, totalPoints } = getCategoryStats(cat.id);
                        return (
                            <div key={cat.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 flex flex-col justify-between">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{cat.name}</p>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-2xl font-black text-white">{totalActions}</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Actions</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-brand-primary">+{totalPoints}</p>
                                        <p className="text-[10px] text-brand-primary/50 uppercase tracking-wider">Points</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {submissions.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 border border-dashed border-white/10 rounded-xl">
                    <IconList size={32} className="text-gray-500" />
                    <p className="text-sm text-gray-500">No activity yet for this period.</p>
                </div>
            )}
        </Card>
    );
};
