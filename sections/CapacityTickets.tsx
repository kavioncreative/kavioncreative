import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Surfaces';
import { Table } from '../components/Table';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import Button from '../components/Button';
import { addToast } from '../components/Toast';
import { formatDisplayName, formatDeadlineDate } from '../utils/formatter';
import { IconCheck, IconX, IconTrendingUp, IconZap, IconTicket } from '../components/Icons';
import { useUser } from '../contexts/UserContext';

interface CapacityTicket {
    id: string;
    freelancer_id: string;
    ticket_type: 'initial_capacity' | 'increase_capacity';
    daily_capacity: number;
    start_datetime: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    profile: {
        name: string;
        email: string;
        avatar_url: string;
        daily_capacity: number;
    };
}

const CapacityTickets: React.FC = () => {
    const { hasPermission } = useUser();
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<CapacityTicket[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('freelancer_capacity_tickets')
                .select(`
                    *,
                    profile:freelancer_id (
                        name,
                        email,
                        avatar_url,
                        daily_capacity
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to fetch tickets.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleAction = async (ticket: CapacityTicket, status: 'approved' | 'rejected') => {
        if (!hasPermission('view_capacity_tickets')) {
            addToast({ type: 'error', title: 'Restricted', message: 'You do not have permission to process tickets.' });
            return;
        }
        setProcessingId(ticket.id);
        try {
            // 1. Update ticket status
            const { error: ticketError } = await supabase
                .from('freelancer_capacity_tickets')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ticket.id);

            if (ticketError) throw ticketError;

            // 2. If approved, update user's profile capacity
            if (status === 'approved') {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ 
                        daily_capacity: ticket.daily_capacity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', ticket.freelancer_id);

                if (profileError) throw profileError;
            }

            addToast({ 
                type: 'success', 
                title: `Ticket ${status.charAt(0).toUpperCase() + status.slice(1)}`, 
                message: `Freelancer capacity request has been ${status}.` 
            });
            
            // 3. Refresh list
            fetchTickets();
        } catch (error: any) {
            console.error(`Error ${status} ticket:`, error);
            addToast({ type: 'error', title: 'Error', message: error.message || `Failed to ${status} ticket.` });
        } finally {
            setProcessingId(null);
        }
    };

    const columns = [
        {
            header: 'Freelancer',
            key: 'freelancer',
            render: (ticket: CapacityTicket) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        src={ticket.profile?.avatar_url}
                        initials={ticket.profile?.name?.[0]?.toUpperCase() || ticket.profile?.email?.[0]?.toUpperCase()}
                        size="sm"
                    />
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">
                            {ticket.profile?.name ? formatDisplayName(ticket.profile.name) : 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider italic">
                            {ticket.profile?.email}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Type',
            key: 'ticket_type',
            render: (ticket: CapacityTicket) => (
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                        ticket.ticket_type === 'initial_capacity' 
                            ? 'bg-brand-primary/10 text-brand-primary' 
                            : ticket.ticket_type === 'decrease_capacity'
                                ? 'bg-gray-500/10 text-gray-400'
                                : 'bg-brand-info/10 text-brand-info'
                    }`}>
                        {ticket.ticket_type === 'initial_capacity' ? <IconTicket size={14} /> : (
                            ticket.ticket_type === 'decrease_capacity' 
                                ? <IconTrendingUp size={14} className="rotate-180" /> 
                                : <IconTrendingUp size={14} />
                        )}
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {ticket.ticket_type.replace('_', ' ')}
                    </span>
                </div>
            )
        },
        {
            header: 'Current',
            key: 'current_capacity',
            render: (ticket: CapacityTicket) => (
                <span className="font-bold text-white tracking-widest px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded-md">
                    {ticket.profile?.daily_capacity || 0}
                </span>
            )
        },
        {
            header: 'Requested',
            key: 'daily_capacity',
            render: (ticket: CapacityTicket) => (
                <span className="font-black text-brand-primary tracking-widest px-2 py-0.5 bg-brand-primary/10 border border-brand-primary/20 rounded-md">
                    {ticket.daily_capacity}
                </span>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (ticket: CapacityTicket) => {
                const status = ticket.status;
                const variants: Record<string, any> = {
                    pending: { variant: 'warning', label: 'Pending' },
                    approved: { variant: 'success', label: 'Approved' },
                    rejected: { variant: 'error', label: 'Rejected' },
                };
                const config = variants[status] || variants.pending;
                return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
            }
        },
        {
            header: 'Created At',
            key: 'created_at',
            render: (ticket: CapacityTicket) => (
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    {formatDeadlineDate(ticket.created_at)}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (ticket: CapacityTicket) => (
                <div className="flex items-center gap-2">
                    {ticket.status === 'pending' ? (
                        <>
                            <Button
                                variant="metallic"
                                size="xs"
                                className="px-5 py-1.5"
                                onClick={() => handleAction(ticket, 'approved')}
                                isLoading={processingId === ticket.id}
                                disabled={!!processingId}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="recessed"
                                size="xs"
                                className="px-5 py-1.5 text-gray-500 hover:text-brand-error border-white/5"
                                onClick={() => handleAction(ticket, 'rejected')}
                                isLoading={processingId === ticket.id}
                                disabled={!!processingId}
                            >
                                Reject
                            </Button>
                        </>
                    ) : (
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">
                            Locked
                        </span>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <Card className="p-0 border-white/5 bg-surface-card overflow-hidden">
                <Table
                    columns={columns}
                    data={tickets}
                    isLoading={loading}
                    emptyMessage="No capacity tickets found."
                />
            </Card>
        </div>
    );
};

export default CapacityTickets;
