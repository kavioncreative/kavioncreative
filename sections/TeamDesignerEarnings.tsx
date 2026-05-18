import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, ElevatedMetallicCard } from '../components/Surfaces';
import { IconUsers, IconChevronLeft, IconChevronRight, IconChartBar, IconStar, IconCheckCircle } from '../components/Icons';
import { useUser } from '../contexts/UserContext';
import { Dropdown } from '../components/Dropdown';

const TeamDesignerEarnings: React.FC = () => {
    const { profile } = useUser();
    const [teamDesigners, setTeamDesigners] = useState<any[]>([]);
    const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);
    const [designerStats, setDesignerStats] = useState({
        total: 0,
        active: 0,
        completed: 0,
        avg_rating: 0
    });
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTeamDesigners = async () => {
            if (!profile?.id) return;
            try {
                // Get teams where the current user is leader
                const { data: teams } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('leader_id', profile.id);

                if (teams && teams.length > 0) {
                    const teamIds = teams.map(t => t.id);
                    const { data: members } = await supabase
                        .from('team_members')
                        .select('profiles(id, name, role)')
                        .in('team_id', teamIds);

                    if (members) {
                        const designers = members
                            .map((m: any) => m.profiles)
                            .filter(p => p && p.id !== profile.id);
                        setTeamDesigners(designers);
                        if (designers.length > 0) {
                            setSelectedDesignerId(designers[0].id);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching team designers:', err);
            }
        };
        fetchTeamDesigners();
    }, [profile?.id]);

    useEffect(() => {
        const fetchDesignerData = async () => {
            if (!selectedDesignerId || !profile?.id) return;
            setLoading(true);

            try {
                // Fetch projects assigned to this designer by this Team Lead
                const { data, error } = await supabase
                    .from('projects')
                    .select('project_id, project_title, price, status, created_at')
                    .eq('team_designer_id', selectedDesignerId)
                    .eq('primary_manager_id', profile.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    setProjects(data);
                    
                    const active = data.filter(p => !['Done', 'Approved', 'Cancelled'].includes(p.status)).length;
                    const completed = data.filter(p => ['Done', 'Approved'].includes(p.status)).length;
                    
                    setDesignerStats({
                        total: data.length,
                        active,
                        completed,
                        avg_rating: 0 // Placeholder for now
                    });
                }
            } catch (err) {
                console.error('Error fetching designer data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDesignerData();
    }, [selectedDesignerId, profile?.id]);

    const PerformanceMetric = ({ title, value, icon: Icon, color }: any) => (
        <Card className="bg-surface-card border-surface-border p-5 flex flex-col items-center text-center space-y-3">
            <div className={`w-12 h-12 rounded-2xl ${color} bg-white/5 flex items-center justify-center`}>
                <Icon size={24} />
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</p>
                <h4 className="text-xl font-black text-white">{value}</h4>
            </div>
        </Card>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div />
                
                <div className="w-64">
                    <Dropdown
                        options={teamDesigners.map(td => ({ label: td.name, value: td.id }))}
                        value={selectedDesignerId || ''}
                        onChange={(val) => setSelectedDesignerId(val)}
                        placeholder="Select Designer"
                        variant="metallic"
                        showSearch
                    />
                </div>
            </div>

            {selectedDesignerId ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <PerformanceMetric 
                            title="Total Performance" 
                            value={designerStats.total} 
                            icon={IconChartBar} 
                            color="text-brand-primary"
                        />
                        <PerformanceMetric 
                            title="Active Projects" 
                            value={designerStats.active} 
                            icon={IconStar} 
                            color="text-brand-warning"
                        />
                        <PerformanceMetric 
                            title="Completion Rate" 
                            value={designerStats.total > 0 ? `${Math.round((designerStats.completed / designerStats.total) * 100)}%` : '0%'} 
                            icon={IconCheckCircle} 
                            color="text-brand-success"
                        />
                        <PerformanceMetric 
                            title="Designer Level" 
                            value="Expert" 
                            icon={IconUsers} 
                            color="text-brand-primary"
                        />
                    </div>

                    <ElevatedMetallicCard title="Activity Feed" bodyClassName="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500 animate-pulse">Fetching designer history...</div>
                        ) : projects.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic">No projects assigned to this designer yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Project Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {projects.map((p) => (
                                            <tr key={p.project_id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors cursor-pointer">{p.project_title}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono tracking-tighter">{p.project_id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            p.status === 'Done' ? 'bg-brand-success/10 text-brand-success ring-1 ring-brand-success/20' : 
                                                            p.status === 'Revision' ? 'bg-brand-warning/10 text-brand-warning ring-1 ring-brand-warning/20' :
                                                            'bg-white/5 text-gray-400 ring-1 ring-white/10'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[11px] font-bold text-gray-500">{new Date(p.created_at).toLocaleDateString()}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                            <button className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity">
                                View Performance Analytics <IconChevronRight size={12} />
                            </button>
                        </div>
                    </ElevatedMetallicCard>
                </>
            ) : (
                <div className="p-20 text-center space-y-4 bg-white/5 rounded-3xl border border-white/10">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-500 backdrop-blur-md">
                        <IconUsers size={32} />
                    </div>
                    <div className="max-w-xs mx-auto">
                        <p className="text-white font-bold text-lg">No Designer Selected</p>
                        <p className="text-gray-500 text-sm mt-1">Please select a team designer from the dropdown to view their performance metrics and earnings.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamDesignerEarnings;
