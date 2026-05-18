import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../lib/supabase';
import { Tabs } from '../components/Navigation';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { 
    IconPlus, 
    IconSearch, 
    IconChevronRight, 
    IconRefreshCw, 
    IconArrowRight, 
    IconUser, 
    IconBriefcase,
    IconCalendar,
    IconMoreHorizontal,
    IconClock,
    IconTrendingUp,
    IconTarget,
    IconCheck,
    IconUsers,
    IconZap,
    IconTrash,
    IconExternalLink,
    IconMoreVertical,
    IconAlertTriangle
} from '../components/Icons';
import { Dropdown } from '../components/Dropdown';
import { getStatusCapsuleClasses } from '../components/Badge';
import { Modal } from '../components/Surfaces';
import { Input, TextArea } from '../components/Input';
import { KebabMenu } from '../components/KebabMenu';
import { DatePicker } from '../components/DatePicker';
import { addToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { Card } from '../components/Surfaces';
import { useAccounts } from '../contexts/AccountContext';

export interface LeadsHandle {
    refresh: () => void;
    switchToStatusTab: (status: string) => void;
}

const Leads = forwardRef<LeadsHandle, { onLeadOpen?: (lead: any) => void }> (({ onLeadOpen }, ref) => {
    useImperativeHandle(ref, () => ({
        refresh: () => {
            fetchLeads();
            fetchStats();
        },
        switchToStatusTab: (status: string) => {
            const tabId = Object.keys(statusMap).find(key => statusMap[key].toLowerCase() === status.toLowerCase());
            if (tabId) {
                setActiveTab(tabId);
            }
        }
    }));
    const [activeTab, setActiveTab] = useState('new');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Custom Confirmation Modal State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<any | null>(null);
    const [repeatClients, setRepeatClients] = useState<{ label: string, value: string }[]>([]);

    const { profile } = useUser();

    // Add Lead Form State
    const [newLead, setNewLead] = useState({
        client_name: '',
        project_title: '',
        client_type: 'New',
        message_date: new Date(),
        initial_message: '',
        location: '',
        account: ''
    });

    const { accounts } = useAccounts();

    const [stats, setStats] = useState({
        inProgress: 0,
        converted: 0,
        conversionRate: 0
    });
    const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

    const statusMap: Record<string, string> = useMemo(() => ({
        'new': 'New Leads',
        'active': 'Active',
        'offer-sent': 'Offer Sent',
        'project-completed': 'Project Completed',
        'upsell-sent': 'Upsell Sent',
        'interested': 'Interested',
        'upsell-won': 'Upsell Won',
        'not-interested': 'Not Interested',
        'lost': 'Lost'
    }), []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (activeTab !== 'all') {
                if (activeTab === 'converted') {
                    // Support all variations of the Inquiry status
                    query = query.or('status.eq.Inquery,status.eq.Query,status.eq.Converted');
                } else {
                    query = query.eq('status', statusMap[activeTab]);
                }
            }

            if (searchQuery.trim()) {
                query = query.or(`client_name.ilike.%${searchQuery}%,project_title.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLeads(data || []);
        } catch (err: any) {
            console.error('Error fetching leads:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load leads.' });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('status');
            
            if (error) throw error;
            
            const counts: Record<string, number> = {};
            data?.forEach(l => {
                const tabId = Object.keys(statusMap).find(key => statusMap[key] === l.status);
                if (tabId) {
                    counts[tabId] = (counts[tabId] || 0) + 1;
                }
            });
            setTabCounts(counts);

            const inProgressCount = data.filter(l => ['New', 'Active', 'Offer Sent', 'Upsell Sent', 'Interested'].includes(l.status)).length;
            const convertedCount = data.filter(l => ['Converted', 'Upsell Won'].includes(l.status)).length;
            const total = data.length;
            
            setStats({
                inProgress: inProgressCount,
                converted: convertedCount,
                conversionRate: total > 0 ? Math.round((convertedCount / total) * 100) : 0
            });
        } catch (err) {
            console.error('Error fetching lead stats:', err);
        }
    };

    const fetchRepeatClients = async () => {
        try {
            // Fetch unique client names from projects
            const { data: projectClients } = await supabase
                .from('projects')
                .select('client_name')
                .not('client_name', 'is', null);
            
            // Fetch unique client names from leads
            const { data: leadClients } = await supabase
                .from('leads')
                .select('client_name')
                .not('client_name', 'is', null);

            const allNames = new Set([
                ...(projectClients || []).map(p => p.client_name),
                ...(leadClients || []).map(l => l.client_name)
            ]);

            const options = Array.from(allNames)
                .sort()
                .map(name => ({ label: name, value: name }));
            
            setRepeatClients(options);
        } catch (err) {
            console.error('Error fetching repeat clients:', err);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [activeTab, searchQuery]);

    useEffect(() => {
        fetchStats();
        fetchRepeatClients();
    }, []);

    const handleAddLead = async () => {
        if (!newLead.client_name || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Check if lead already exists
            const { data: existingLead } = await supabase
                .from('leads')
                .select('*')
                .eq('client_name', newLead.client_name)
                .maybeSingle();

            let leadData;
            if (existingLead) {
                // UPDATE existing lead
                const { data, error } = await supabase
                    .from('leads')
                    .update({
                        status: 'Active', // Move to active tab for repeat/inquiry
                        project_title: newLead.project_title || existingLead.project_title,
                        client_type: 'Repeat',
                        account: newLead.account || existingLead.account,
                        location: newLead.location || existingLead.location
                    })
                    .eq('id', existingLead.id)
                    .select()
                    .single();

                if (error) throw error;
                leadData = data;
                addToast({ type: 'success', title: 'Lead Re-activated', message: `${newLead.client_name} is now active in your pipeline.` });
            } else {
                // INSERT new lead
                const { data, error } = await supabase.from('leads').insert({
                    client_name: newLead.client_name,
                    project_title: newLead.project_title,
                    client_type: newLead.client_type,
                    message_date: newLead.message_date.toISOString().split('T')[0],
                    initial_message: newLead.initial_message || null,
                    location: newLead.location || null,
                    account: newLead.account || null,
                    status: newLead.client_type === 'Repeat' ? 'Active' : 'New',
                    added_by: profile?.name || 'Unknown'
                }).select().single();

                if (error) throw error;
                leadData = data;
                addToast({ type: 'success', title: 'Lead Added', message: 'The new lead has been successfully added.' });
            }

            // Optional: Post initial message if provided
            if (newLead.initial_message) {
                await supabase.from('lead_comments').insert({
                    lead_id: leadData.id,
                    content: `[System] ${existingLead ? 'New Inquiry' : 'Initial Message'}: ${newLead.initial_message}`,
                    author_name: 'System',
                    author_role: 'system_log'
                });
            }

            setIsAddModalOpen(false);
            // Open the lead immediately if it's a repeat or specifically requested
            if (leadData) onLeadOpen?.(leadData);
            setNewLead({
                client_name: '',
                project_title: '',
                client_type: 'New',
                message_date: new Date(),
                initial_message: '',
                location: '',
                account: ''
            });
            fetchLeads();
            fetchStats();
        } catch (err: any) {
            console.error('Error adding lead:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to add lead.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!leadToDelete || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadToDelete.id);

            if (error) throw error;

            addToast({ type: 'success', title: 'Lead Deleted', message: 'The lead has been successfully removed.' });
            setIsDeleteConfirmOpen(false);
            setLeadToDelete(null);
            fetchLeads();
            fetchStats();
        } catch (err: any) {
            console.error('Error deleting lead:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to delete lead.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = useMemo(() => [
        { id: 'new', label: `New Inquiries${tabCounts['new'] > 0 ? ` ${tabCounts['new']}` : ''}` },
        { id: 'active', label: `Active${tabCounts['active'] > 0 ? ` ${tabCounts['active']}` : ''}` },
        { id: 'offer-sent', label: `Offer Sent${tabCounts['offer-sent'] > 0 ? ` ${tabCounts['offer-sent']}` : ''}` },
        { id: 'project-completed', label: `Project Completed${tabCounts['project-completed'] > 0 ? ` ${tabCounts['project-completed']}` : ''}` },
        { id: 'upsell-sent', label: `Upsell Sent${tabCounts['upsell-sent'] > 0 ? ` ${tabCounts['upsell-sent']}` : ''}` },
        { id: 'interested', label: `Interested${tabCounts['interested'] > 0 ? ` ${tabCounts['interested']}` : ''}` },
        { id: 'upsell-won', label: `Upsell Won${tabCounts['upsell-won'] > 0 ? ` ${tabCounts['upsell-won']}` : ''}` },
        { id: 'not-interested', label: `Not Interested${tabCounts['not-interested'] > 0 ? ` ${tabCounts['not-interested']}` : ''}` },
        { id: 'lost', label: `Lost${tabCounts['lost'] > 0 ? ` ${tabCounts['lost']}` : ''}` }
    ], [tabCounts]);


    return (
        <div className="flex flex-col h-full bg-surface-bg animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Tabs & Search Header */}
            <div className="shrink-0 px-8 py-6 sticky top-0 z-20 bg-surface-bg/80 backdrop-blur-md">
                <div className="space-y-6">
                    {/* Tabs Section (Responsive) */}
                    <div className="flex flex-col items-center gap-3 2xl:hidden">
                        <Tabs 
                            tabs={tabs.slice(0, 5)} 
                            activeTab={activeTab} 
                            onTabChange={setActiveTab} 
                        />
                        <Tabs 
                            tabs={tabs.slice(5)} 
                            activeTab={activeTab} 
                            onTabChange={setActiveTab} 
                        />
                    </div>
                    
                    <div className="hidden 2xl:flex justify-center w-full">
                        <Tabs 
                            tabs={tabs} 
                            activeTab={activeTab} 
                            onTabChange={setActiveTab} 
                        />
                    </div>
                    
                    {/* Search & Actions Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                        <div className="flex items-center flex-1">
                            <Input 
                                variant="recessed"
                                placeholder="Search client name or project..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full md:w-80"
                                size="sm"
                            />
                        </div>
                        
                        <Button 
                            variant="metallic" 
                            className="rounded-xl h-10 px-6 shadow-lg shadow-brand-primary/10"
                            onClick={() => setIsAddModalOpen(true)}
                            leftIcon={<IconPlus size={18} />}
                        >
                            Add New Lead
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
                <Table 
                    isLoading={loading}
                    data={leads}
                    emptyMessage="Either your search yielded no results or this pipeline stage is currently empty."
                    columns={[
                        {
                            header: 'Lead Intake Date',
                            key: 'message_date',
                            className: 'whitespace-nowrap min-w-max',
                            render: (lead) => (
                                <span className="text-[13px] text-gray-400 font-bold tabular-nums">
                                    {new Date(lead.message_date).toLocaleString('en-GB', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            )
                        },
                        {
                            header: 'Client Name',
                            key: 'client_name',
                            className: 'whitespace-nowrap min-w-[320px]',
                            render: (lead) => (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[14px] font-black text-white group-hover:text-brand-primary transition-colors">{lead.client_name}</span>
                                    {lead.client_type?.toLowerCase() === 'repeat' && (
                                        <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">
                                            REPEAT {lead.previous_order_id ? `: ${lead.previous_order_id}` : ''}
                                        </span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: 'Client Interest',
                            key: 'project_title',
                            className: 'whitespace-nowrap min-w-max',
                            render: (lead) => (
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary/40 shrink-0" />
                                    <span className="text-[13px] text-gray-300 font-bold">{lead.project_title || 'Untitled Project'}</span>
                                </div>
                            )
                        },

                        {
                            header: 'Account',
                            key: 'account',
                            className: 'whitespace-nowrap min-w-[80px]',
                            render: (lead) => (
                                <span className="text-[12px] text-gray-300 font-bold">{lead.account || '—'}</span>
                            )
                        },
                        {
                            header: 'Type',
                            key: 'client_type',
                            className: 'whitespace-nowrap min-w-max',
                            render: (lead) => (
                                <span className={lead.client_type === 'Repeat' ? 'bg-indigo-500/20 text-indigo-400 !border-none !rounded-md !px-3 !py-1 !tracking-wider !text-[10px] whitespace-nowrap !min-w-max text-center font-black uppercase' : 'bg-gray-500/20 text-gray-400 !border-none !rounded-md !px-3 !py-1 !tracking-wider !text-[10px] whitespace-nowrap !min-w-max text-center font-black uppercase'}>
                                    {lead.client_type}
                                </span>
                            )
                        },
                        {
                            header: 'Added By',
                            key: 'added_by',
                            className: 'whitespace-nowrap min-w-max',
                            render: (lead) => (
                                <span className="text-[12px] text-gray-300 font-bold">{lead.added_by || '—'}</span>
                            )
                        },
                        {
                            header: 'Status',
                            key: 'status',
                            className: 'whitespace-nowrap min-w-max',
                            render: (lead) => (
                                <span className={getStatusCapsuleClasses(lead.status)}>
                                    {lead.status}
                                </span>
                            )
                        },
                        {
                            header: 'Location',
                            key: 'location',
                            className: 'whitespace-nowrap min-w-max',
                            render: (lead) => (
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] text-gray-400 font-medium">{lead.location || '—'}</span>
                                </div>
                            )
                        },
                        {
                            header: '',
                            key: 'actions',
                            className: 'text-right min-w-[80px]',
                            render: (lead) => {
                                const isSuperAdmin = profile?.role?.toLowerCase() === 'super admin';
                                
                                if (isSuperAdmin) {
                                    return (
                                        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
                                            <KebabMenu
                                                options={[
                                                    {
                                                        label: 'Open',
                                                        icon: <IconExternalLink size={14} />,
                                                        onClick: () => onLeadOpen?.(lead)
                                                    },
                                                    {
                                                        label: 'Delete',
                                                        variant: 'danger',
                                                        icon: <IconTrash size={14} />,
                                                        onClick: () => {
                                                            setLeadToDelete(lead);
                                                            setIsDeleteConfirmOpen(true);
                                                        }
                                                    }
                                                ]}
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <button 
                                        className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-primary transition-all group/btn mx-auto md:ml-auto md:mr-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onLeadOpen?.(lead);
                                        }}
                                    >
                                        <IconArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                    </button>
                                );
                            }
                        }
                    ]}
                />
            </div>

            {/* Add Lead Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Secure New Lead"
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button 
                            variant="recessed" 
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="metallic" 
                            onClick={handleAddLead}
                            disabled={!newLead.client_name || isSubmitting}
                            className="px-8 shadow-xl shadow-brand-primary/20"
                        >
                            {isSubmitting ? <IconRefreshCw className="animate-spin" /> : 'Add Lead to Pipeline'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest py-1">
                                Lead Intake Date
                            </label>
                            <DatePicker 
                                value={newLead.message_date}
                                onChange={(date) => setNewLead({ ...newLead, message_date: date || new Date() })}
                                variant="recessed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest py-1">
                                Client Type
                            </label>
                            <div className="flex p-1 bg-black/40 border border-white/[0.05] rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] h-12">
                                {['New', 'Repeat'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewLead({ ...newLead, client_type: type as any })}
                                        className={`flex-1 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                                            newLead.client_type === type 
                                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border border-[#FF4D2D] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),inset_0_-1.5px_1.5px_rgba(0,0,0,0.25),0_4px_12px_-2px_rgba(217,54,26,0.35)] active:scale-95' 
                                            : 'text-gray-500 hover:text-white'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Client Name
                        </label>
                        {newLead.client_type === 'Repeat' ? (
                            <Dropdown
                                options={repeatClients}
                                value={newLead.client_name}
                                onChange={(val) => setNewLead({ ...newLead, client_name: val })}
                                placeholder="Search existing client..."
                            >
                                <div className="w-full h-12 bg-black/40 border border-white/[0.05] rounded-xl px-4 flex items-center justify-between cursor-pointer hover:bg-black/50 transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                                    <span className={`text-[12px] font-bold ${newLead.client_name ? 'text-white' : 'text-gray-500'}`}>
                                        {newLead.client_name || 'Select existing client...'}
                                    </span>
                                    <IconSearch size={16} className="text-gray-600" />
                                </div>
                            </Dropdown>
                        ) : (
                            <Input 
                                variant="recessed"
                                placeholder="Full name of the client..."
                                value={newLead.client_name}
                                onChange={(e) => setNewLead({ ...newLead, client_name: e.target.value })}
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Project Interest
                        </label>
                        <Input 
                            variant="recessed"
                            placeholder="What project are they looking for? (e.g. Logo Design)"
                            value={newLead.project_title}
                            onChange={(e) => setNewLead({ ...newLead, project_title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Location
                        </label>
                        <Input 
                            variant="recessed"
                            placeholder="Client location (e.g. New York, USA)..."
                            value={newLead.location}
                            onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            Account
                        </label>
                        <Dropdown
                            options={accounts.map(acc => ({ label: `${acc.prefix} - ${acc.name}`, value: acc.prefix }))}
                            value={newLead.account}
                            onChange={(val) => setNewLead({ ...newLead, account: val })}
                            placeholder="Select target account..."
                        >
                            <div className="w-full h-12 bg-black/40 border border-white/[0.05] rounded-xl px-4 flex items-center justify-between cursor-pointer hover:bg-black/50 transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                                <span className={`text-[12px] font-bold ${newLead.account ? 'text-white' : 'text-gray-500'}`}>
                                    {newLead.account ? accounts.find(a => a.prefix === newLead.account)?.name || newLead.account : 'Select target account...'}
                                </span>
                                <IconBriefcase size={16} className="text-gray-600" />
                            </div>
                        </Dropdown>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                Initial Message
                            </label>
                            <span className="text-[10px] font-bold text-gray-600 uppercase italic">Optional</span>
                        </div>
                        <TextArea 
                            variant="recessed"
                            placeholder="Record the first point of contact or requirements shared by the client..."
                            value={newLead.initial_message}
                            onChange={(e) => setNewLead({ ...newLead, initial_message: e.target.value })}
                            inputClassName="min-h-[120px]"
                        />
                        <p className="text-[10px] text-gray-600 font-medium italic">Record this if the client has already expressed specific needs.</p>
                    </div>
                </div>
            </Modal>

            {/* Custom Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => {
                    setIsDeleteConfirmOpen(false);
                    setLeadToDelete(null);
                }}
                title="Remove Lead"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            className="w-28 font-bold"
                            onClick={() => {
                                setIsDeleteConfirmOpen(false);
                                setLeadToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic-error"
                            className="px-8 font-bold !bg-gradient-to-b !from-[#ef4444] !via-[#dc2626] !to-[#991b1b] !border-[#7f1d1d] !shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1.5px_0_rgba(0,0,0,0.3)]"
                            onClick={handleDeleteLead}
                            isLoading={isSubmitting}
                        >
                            Confirm Removal
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-brand-error/10 border border-brand-error/20 flex items-center justify-center text-brand-error mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                        <IconTrash size={32} />
                    </div>
                    
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Permanently Remove?</h3>
                    <p className="text-[13px] text-gray-400 mb-6">
                        You are about to remove <span className="text-white font-bold">{leadToDelete?.client_name}</span> from the directory.
                    </p>

                    <div className="w-full p-4 rounded-xl bg-brand-error/5 border border-brand-error/10 text-left">
                        <div className="flex items-center gap-2 mb-2">
                            <IconAlertTriangle size={14} className="text-brand-error" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-error">Danger Zone</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                            This action is permanent and cannot be undone. All associated data for this lead will be removed immediately.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

export default Leads;
