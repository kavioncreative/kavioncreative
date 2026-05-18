import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, ElevatedMetallicCard } from '../components/Surfaces';
import { IconChartBar, IconCreditCard, IconClock, IconUsers, IconChevronRight, IconDollar } from '../components/Icons';
import { useUser } from '../contexts/UserContext';
import { Table } from '../components/Table';

const TeamEarnings: React.FC = () => {
    const { profile } = useUser();
    const [stats, setStats] = useState({
        managedRevenue: 0,
        designerPayouts: 0,
        netProfit: 0,
        unpaidProfit: 0,
        paidProfit: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentProjects, setRecentProjects] = useState<any[]>([]);

    useEffect(() => {
        const fetchEarnings = async () => {
            if (!profile?.id) return;
            setLoading(true);

            try {
                // Fetch projects where this user is the primary manager (Team Lead)
                const { data, error } = await supabase
                    .from('projects')
                    .select('project_id, project_title, price, designer_fee, team_payout, team_designer_fee, payout_completed, status, created_at')
                    .eq('primary_manager_id', profile.id)
                    .neq('status', 'Cancelled')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    let managedRevenue = 0;
                    let designerPayouts = 0;
                    let unpaidProfit = 0;
                    let paidProfit = 0;
                    
                    data.forEach(p => {
                        const platformPayout = Number(p.designer_fee) || 0;
                        const subDesignerPayout = Number(p.team_designer_fee) || Number(p.team_payout) || 0;
                        const profit = platformPayout - subDesignerPayout;

                        managedRevenue += platformPayout;
                        designerPayouts += subDesignerPayout;

                        // Per User Request: Show ACTUAL Gross Payout (Managed Revenue)
                        // instead of just net profit in the status cards
                        if (p.payout_completed) {
                            paidProfit += platformPayout;
                        } else {
                            unpaidProfit += platformPayout;
                        }
                    });

                    setStats({
                        managedRevenue,
                        designerPayouts,
                        netProfit: managedRevenue - designerPayouts, 
                        unpaidProfit, // Now contains Total Gross for pending
                        paidProfit   // Now contains Total Gross for paid
                    });
                    setRecentProjects(data.slice(0, 10));
                }
            } catch (err) {
                console.error('Error fetching team earnings:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEarnings();
    }, [profile?.id]);

    const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
        <Card className="bg-surface-card border-surface-border p-6 space-y-4">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 font-bold uppercase tracking-widest">{title}</p>
                    <h3 className={`text-2xl font-black ${color} tracking-tight`}>${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                    <Icon size={20} />
                </div>
            </div>
            {sub && <p className="text-[10px] text-gray-500 font-bold uppercase">{sub}</p>}
        </Card>
    );

    if (loading && recentProjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                <p className="text-gray-500 text-sm animate-pulse font-bold tracking-widest uppercase">Fetching Financial Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-2xl font-black text-white italic truncate uppercase tracking-tight">Financial Overview</h1>
                <p className="text-gray-500 text-sm font-medium">Tracking your net earnings and sub-designer payouts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard 
                    title="Lifetime Net Profit" 
                    value={stats.netProfit} 
                    sub="All-time personal earnings" 
                    icon={IconDollar} 
                    color="text-white"
                />
                <StatCard 
                    title="Pending Clearance" 
                    value={stats.unpaidProfit} 
                    sub="Awaiting project completion" 
                    icon={IconClock} 
                    color="text-brand-warning"
                />
                <StatCard 
                    title="Available Amount" 
                    value={stats.paidProfit} 
                    sub="Cleared for withdrawal" 
                    icon={IconCreditCard} 
                    color="text-brand-success"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Managed Revenue</p>
                        <h4 className="text-xl font-bold text-white mt-1">${stats.managedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Total platform payout volume</p>
                    </div>
                    <IconChartBar className="text-gray-500 opacity-50" size={24} />
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sub-Designer Costs</p>
                        <h4 className="text-xl font-bold text-brand-primary mt-1">${stats.designerPayouts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Total distributed to team</p>
                    </div>
                    <IconUsers className="text-brand-primary opacity-50" size={24} />
                </div>
            </div>

            <ElevatedMetallicCard title="Recent Revenue Breakdown" bodyClassName="p-0">
                {recentProjects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 italic">No recent earnings data found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Project</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Platform Payout</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Team Cost</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Your Profit</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {recentProjects.map((p) => {
                                    const platformPayout = Number(p.designer_fee) || 0;
                                    const subDesignerPayout = Number(p.team_designer_fee) || Number(p.team_payout) || 0;
                                    const profit = platformPayout - subDesignerPayout;
                                    
                                    return (
                                        <tr key={p.project_id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white uppercase tracking-tight">{p.project_title}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono mt-0.5">{p.project_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-white text-center">${platformPayout.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-brand-primary text-center">${subDesignerPayout.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm font-black text-brand-success text-center">${profit.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    p.payout_completed 
                                                        ? 'bg-brand-success/20 text-brand-success border border-brand-success/30' 
                                                        : 'bg-brand-warning/20 text-brand-warning border border-brand-warning/30'
                                                }`}>
                                                    {p.payout_completed ? 'PAID' : 'PENDING'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                    <button className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity">
                        View Detailed Report <IconChevronRight size={12} />
                    </button>
                </div>
            </ElevatedMetallicCard>
        </div>
    );
};

export default TeamEarnings;

