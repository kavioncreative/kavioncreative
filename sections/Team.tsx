
import React, { useState, useEffect, useMemo } from 'react';
import { Card, ElevatedMetallicCard } from '../components/Surfaces';
import { Table } from '../components/Table';
import { Avatar } from '../components/Avatar';
import { IconUsers, IconSearch, IconUser, IconMail } from '../components/Icons';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { formatDisplayName } from '../utils/formatter';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatar_url?: string;
    teamName: string;
}

interface TeamProps {
    onUserOpen: (userId: string) => void;
}

const Team: React.FC<TeamProps> = ({ onUserOpen }) => {
    const { profile } = useUser();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTeamMembers = async () => {
        if (!profile?.id) return;
        setIsLoading(true);

        try {
            // 1. Get teams where user is leader
            const { data: teams, error: teamsError } = await supabase
                .from('teams')
                .select('id, name')
                .eq('leader_id', profile.id)
                .eq('type', 'design');

            if (teamsError) throw teamsError;

            if (!teams || teams.length === 0) {
                setMembers([]);
                return;
            }

            const teamIds = teams.map(t => t.id);

            // 2. Get members for these teams
            const { data: teamMembers, error: membersError } = await supabase
                .from('team_members')
                .select('member_id, team_id')
                .in('team_id', teamIds);

            if (membersError) throw membersError;

            if (!teamMembers || teamMembers.length === 0) {
                setMembers([]);
                return;
            }

            const memberIds = teamMembers.map(tm => tm.member_id);

            // 3. Fetch profiles for these members
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', memberIds);

            if (profilesError) throw profilesError;

            const formattedMembers = profiles.map((p: any) => {
                const teamMembership = teamMembers.find(tm => tm.member_id === p.id);
                const team = teams.find(t => t.id === teamMembership?.team_id);
                
                return {
                    id: p.id,
                    name: formatDisplayName(p.name),
                    email: p.email,
                    role: p.role,
                    status: p.status,
                    avatar_url: p.avatar_url,
                    teamName: team?.name || 'Assigned Designer'
                };
            });

            setMembers(formattedMembers);
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, [profile?.id]);

    const filteredMembers = useMemo(() => {
        if (!searchQuery) return members;
        const q = searchQuery.toLowerCase();
        return members.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.teamName.toLowerCase().includes(q)
        );
    }, [members, searchQuery]);

    const columns = [
        {
            header: 'Designer',
            key: 'name',
            className: 'min-w-[250px]',
            render: (item: TeamMember) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        size="md"
                        src={item.avatar_url}
                        initials={item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        status={item.status === 'Active' ? 'online' : 'offline'}
                    />
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate">{item.name}</span>
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <span className="text-[10px] truncate">{item.email}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: 'Team',
            key: 'team',
            className: 'min-w-[150px]',
            render: (item: TeamMember) => (
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                        <IconUsers size={12} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">{item.teamName}</span>
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            className: 'w-24',
            render: (item: TeamMember) => (
                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                    item.status === 'Active'
                        ? 'bg-brand-success/10 border-brand-success/20 text-brand-success shadow-[0_0_10px_-2px_rgba(34,197,94,0.2)]'
                        : 'bg-gray-500/10 border-white/5 text-gray-500'
                }`}>
                    {item.status}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card
                    isElevated={true}
                    className="h-full p-0 border-2 rounded-2xl relative overflow-hidden group min-h-[140px] cursor-pointer transition-all duration-300 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]"
                    bodyClassName="h-full flex flex-col justify-between"
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-100" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-6 relative z-10 w-full h-full flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-white/80">Total Designers</p>
                                <p className="text-4xl font-bold text-white tracking-tight">{members.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all bg-white/20 border-white/30 text-white">
                                <IconUsers size={24} />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex justify-end px-2">
                <div className="w-full md:w-80">
                    <Input
                        placeholder="Search team..."
                        leftIcon={<IconSearch className="w-4 h-4" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        variant="metallic"
                    />
                </div>
            </div>

            <div className="relative">
                <Table
                    columns={columns}
                    data={filteredMembers}
                    isLoading={isLoading}
                    isMetallicHeader={true}
                    onRowClick={(item) => onUserOpen(item.id)}
                />

                {!isLoading && members.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-2">
                            <IconUser size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">No Designers Found</h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">
                                You don't have any designers assigned to your teams yet. Please contact an admin to set up your team structure.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Team;
