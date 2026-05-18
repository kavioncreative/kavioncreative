import React, { useState, useEffect, useMemo } from 'react';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { IconSearch, IconUser, IconExternalLink, IconMessageSquare, IconChevronRight, IconFileText, IconFilter, IconUsers, IconClock, IconCheckCircle, IconX, IconCopy, IconTag, IconPlus, IconCheck, IconEdit, IconTrash } from '../components/Icons';
import { LabelManagerModal } from '../components/LabelManagerModal';
import { addToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface Label {
    id: string;
    name: string;
    color: string;
}

interface Applicant {
    id: string;
    first_name: string;
    last_name: string;
    whatsapp: string;
    email: string;
    cv_file_url: string;
    portfolio_links: string[];
    position: string;
    created_at: string;
    status: string;
    labels: Label[];
}

const Applicants: React.FC = () => {
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [positionFilter, setPositionFilter] = useState<string[]>([]);
    const [labelFilter, setLabelFilter] = useState<string[]>([]);
    const [allLabels, setAllLabels] = useState<Label[]>([]);
    const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'Total' | 'Pending' | 'Approved' | 'Rejected'>('Total');
    const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string, pass: string } | null>(null);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

    const positionOptions = [
        { label: 'Designer', value: 'Designer' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Project Operations Manager', value: 'Project Operations Manager' },
        { label: 'Finance Manager', value: 'Finance Manager' }
    ];

    const fetchApplicants = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('applicants')
                .select('*, assignments:applicant_label_assignments(label:labels(*))')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const flattenedData = data?.map(app => ({
                ...app,
                labels: (app.assignments || []).map((a: any) => a.label).filter(Boolean)
            })) || [];

            setApplicants(flattenedData);
        } catch (error: any) {
            console.error('Error fetching applicants:', error);
            addToast({ type: 'error', title: 'Fetch Failed', message: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLabels = async () => {
        try {
            const { data, error } = await supabase
                .from('labels')
                .select('*')
                .eq('category', 'applicant')
                .order('name');
            if (error) throw error;
            setAllLabels(data || []);
        } catch (error: any) {
            console.error('Labels error:', error);
        }
    };

    const handleToggleLabel = async (label: Label) => {
        if (!selectedApplicant) return;

        const isAssigned = selectedApplicant.labels?.some(l => l.id === label.id);

        try {
            if (isAssigned) {
                const { error } = await supabase
                    .from('applicant_label_assignments')
                    .delete()
                    .eq('applicant_id', selectedApplicant.id)
                    .eq('label_id', label.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('applicant_label_assignments')
                    .insert([{ applicant_id: selectedApplicant.id, label_id: label.id }]);
                if (error) throw error;
            }

            // fetchApplicants will update the UI via real-time but we update local state for immediate feedback
            const updatedLabels = isAssigned
                ? selectedApplicant.labels.filter(l => l.id !== label.id)
                : [...(selectedApplicant.labels || []), label];

            setSelectedApplicant({ ...selectedApplicant, labels: updatedLabels });
            fetchApplicants(); // Refresh list
        } catch (error: any) {
            addToast({ type: 'error', title: 'Label Assignment Failed', message: error.message });
        }
    };

    useEffect(() => {
        fetchApplicants();
        fetchLabels();

        // Set up real-time subscription for applicants
        const subscription = supabase
            .channel('applicants_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'applicants'
                },
                () => {
                    console.log('Applicants updated, fetching fresh data...');
                    fetchApplicants();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const stats = useMemo(() => {
        return {
            total: applicants.length,
            pending: applicants.filter(a => a.status === 'Pending').length,
            approved: applicants.filter(a => a.status === 'Approved').length,
            rejected: applicants.filter(a => a.status === 'Rejected').length
        };
    }, [applicants]);

    const handleApprove = async () => {
        if (!selectedApplicant) return;
        setIsProcessing(true);
        try {
            const tempPassword = "12345//";

            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: selectedApplicant.email.trim(),
                password: tempPassword,
                options: {
                    data: {
                        full_name: `${selectedApplicant.first_name} ${selectedApplicant.last_name}`,
                        role: 'Freelancer',
                        creation_source: 'applicant'
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        email: selectedApplicant.email.trim(),
                        name: `${selectedApplicant.first_name} ${selectedApplicant.last_name}`,
                        first_name: selectedApplicant.first_name,
                        last_name: selectedApplicant.last_name,
                        role: 'Freelancer',
                        whatsapp_number: selectedApplicant.whatsapp,
                        status: 'Invited'
                    }]);

                if (profileError) throw profileError;
            }

            const { error: statusError } = await supabase
                .from('applicants')
                .update({ status: 'Approved' })
                .eq('id', selectedApplicant.id);

            if (statusError) throw statusError;

            try {
                await supabase.functions.invoke('send-welcome-email', {
                    body: {
                        email: selectedApplicant.email.trim(),
                        password: tempPassword,
                        name: selectedApplicant.first_name
                    }
                });
            } catch (emailErr) {
                console.error('Email trigger failed:', emailErr);
            }

            setGeneratedCredentials({ email: selectedApplicant.email, pass: tempPassword });
            addToast({ type: 'success', title: 'Applicant Approved', message: 'Account created and credentials generated.' });
            // fetchApplicants is handled by real-time subscription

        } catch (error: any) {
            console.error('Approval error:', error);
            addToast({ type: 'error', title: 'Approval Failed', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedApplicant) return;
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from('applicants')
                .update({ status: 'Rejected' })
                .eq('id', selectedApplicant.id);

            if (error) throw error;
            addToast({ type: 'info', title: 'Applicant Rejected', message: 'The application status has been updated to Rejected.' });
            setSelectedApplicant(null);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Action Failed', message: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredApplicants = useMemo(() => {
        let filtered = applicants;

        if (filterStatus !== 'Total') {
            filtered = filtered.filter(a => a.status === filterStatus);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(a =>
                `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q) ||
                a.whatsapp.toLowerCase().includes(q) ||
                a.position.toLowerCase().includes(q)
            );
        }

        if (positionFilter.length > 0) {
            filtered = filtered.filter(a => positionFilter.includes(a.position));
        }

        if (labelFilter.length > 0) {
            filtered = filtered.filter(a =>
                a.labels?.some(l => labelFilter.includes(l.id))
            );
        }

        return filtered;
    }, [applicants, searchQuery, positionFilter, labelFilter, filterStatus]);

    const columns = [
        {
            header: 'Name',
            key: 'name',
            className: 'min-w-[200px]',
            render: (item: Applicant) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-white/90">
                        {item.first_name} {item.last_name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">{item.email}</span>
                </div>
            )
        },
        {
            header: 'WhatsApp',
            key: 'whatsapp',
            render: (item: Applicant) => <span className="text-gray-400 font-medium">{item.whatsapp}</span>
        },
        {
            header: 'Position',
            key: 'position',
            render: (item: Applicant) => (
                <span className="px-3.5 py-1.5 rounded-lg bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-wider">
                    {item.position}
                </span>
            )
        },
        {
            header: 'Labels',
            key: 'labels',
            className: 'min-w-[150px]',
            render: (item: Applicant) => (
                <div className="flex flex-wrap gap-1.5">
                    {item.labels && item.labels.length > 0 ? (
                        item.labels.map(label => (
                            <span
                                key={label.id}
                                className="px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                                style={{ backgroundColor: `${label.color}15`, color: label.color }}
                            >
                                {label.name}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest opacity-40">No Labels</span>
                    )}
                </div>
            )
        },
        {
            header: 'Submission Date',
            key: 'created_at',
            render: (item: Applicant) => (
                <span className="text-gray-400 font-medium">
                    {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(item.created_at))}
                </span>
            )
        },
        {
            header: '',
            key: 'actions',
            className: 'w-10 text-right',
            render: () => (
                <div className="flex justify-end pr-2">
                    <div className="p-2 rounded-lg bg-white/5 text-gray-500 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all duration-300">
                        <IconChevronRight size={18} />
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Applicants', value: stats.total, icon: <IconUsers />, color: 'text-blue-400', type: 'Total' },
                    { label: 'Pending Review', value: stats.pending, icon: <IconClock />, color: 'text-amber-400', type: 'Pending' },
                    { label: 'Approved', value: stats.approved, icon: <IconCheckCircle />, color: 'text-green-400', type: 'Approved' },
                    { label: 'Rejected', value: stats.rejected, icon: <IconX />, color: 'text-red-400', type: 'Rejected' },
                ].map((stat, i) => {
                    const isActive = filterStatus === stat.type;
                    return (
                        <button
                            key={i}
                            onClick={() => setFilterStatus(stat.type as any)}
                            className={`group relative text-left outline-none focus:ring-0 transition-all duration-500 rounded-2xl overflow-hidden ${isActive ? 'scale-[1.03] z-20' : 'hover:scale-[1.01] z-10'}`}
                        >
                            <Card
                                isElevated={isActive}
                                disableHover={isActive}
                                className={`h-full p-0 border-2 transition-all duration-500 overflow-hidden ${isActive
                                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_20px_40px_-12px_rgba(217,54,26,0.35)]'
                                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30 shadow-2xl'
                                    }`}
                                bodyClassName="h-full p-0"
                            >
                                {/* Premium Metallic Surface Shine - Always present, smoother transitions to avoid straps */}
                                <div className={`absolute inset-0 pointer-events-none z-[1] transition-opacity duration-700 ${isActive ? 'opacity-60' : 'opacity-40'}`}>
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.01)_30%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.01)_70%,transparent_100%)]" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
                                </div>

                                <div className="p-6 relative z-10 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                                            {stat.label}
                                        </p>
                                        <p className="text-3xl font-black tracking-tighter text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl border transition-all duration-500 ${isActive
                                            ? 'bg-white/20 border-white/30 text-white shadow-lg'
                                            : 'bg-white/5 border-white/10 text-gray-500 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary group-hover:scale-110'
                                        }`}>
                                        {React.cloneElement(stat.icon as React.ReactElement, { size: 22 } as any)}
                                    </div>
                                </div>
                            </Card>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-end gap-3">
                <div className="w-full md:w-64">
                    <Dropdown
                        isMulti
                        options={positionOptions}
                        value={positionFilter}
                        onChange={(val) => setPositionFilter(val as string[])}
                        placeholder="Filter by Position"
                        variant="recessed"
                        size="sm"
                    />
                </div>
                <div className="w-full md:w-64">
                    <Dropdown
                        isMulti
                        options={allLabels.map(l => ({ label: l.name, value: l.id }))}
                        value={labelFilter}
                        onChange={(val) => setLabelFilter(val as string[])}
                        placeholder="Filter by Label"
                        variant="recessed"
                        size="sm"
                    />
                </div>
                <div className="relative w-full md:w-80">
                    <Input
                        placeholder="Search applicants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<IconSearch size={18} />}
                        variant="recessed"
                        size="sm"
                        className="w-full"
                    />
                </div>
            </div>

            <Table
                columns={columns}
                data={filteredApplicants}
                isLoading={isLoading}
                onRowClick={setSelectedApplicant}
                isMetallicHeader={true}
                emptyMessage="No applications found"
            />

            <LabelManagerModal 
                isOpen={isLabelModalOpen} 
                onClose={() => setIsLabelModalOpen(false)} 
                type="applicant"
                onLabelsChange={fetchLabels}
            />
            <Modal
                isOpen={!!selectedApplicant}
                onClose={() => setSelectedApplicant(null)}
                title="Applicant Details"
                size="md"
                isElevatedHeader={true}
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-between items-center w-full">
                        <div className="flex gap-3">
                            {selectedApplicant?.status === 'Pending' && !generatedCredentials && (
                                <>
                                    <Button
                                        variant="recessed"
                                        onClick={handleReject}
                                        disabled={isProcessing}
                                        className="px-6 border-red-500/20 text-red-400 hover:bg-red-500/10"
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        variant="metallic"
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="px-8 shadow-lg shadow-brand-primary/20"
                                    >
                                        {isProcessing ? 'Processing...' : 'Approve Application'}
                                    </Button>
                                </>
                            )}
                        </div>
                        <Button
                            variant="recessed"
                            onClick={() => {
                                setSelectedApplicant(null);
                                setGeneratedCredentials(null);
                            }}
                            className="px-8"
                        >
                            Close
                        </Button>
                    </div>
                }
            >
                {selectedApplicant && (
                    <div className="space-y-6">
                        {generatedCredentials && (
                            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 animate-in zoom-in-95 duration-500">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                                        <IconCheckCircle size={24} />
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        <div>
                                            <h4 className="text-white font-black uppercase tracking-wider">Account Created Successfully</h4>
                                            <p className="text-xs text-gray-400 mt-1">Please provide these credentials to the designer. They can now login and complete their profile.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Login Email</p>
                                                <p className="text-sm font-bold text-white truncate">{generatedCredentials.email}</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Initial Password</p>
                                                <p className="text-sm font-bold text-brand-primary font-mono">{generatedCredentials.pass}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="recessed"
                                            size="sm"
                                            leftIcon={<IconCopy size={14} />}
                                            onClick={() => {
                                                const text = `Welcome to CodesLogic!\n\nYour account has been approved.\nEmail: ${generatedCredentials.email}\nPassword: ${generatedCredentials.pass}\nLogin: ${window.location.origin}/signin`;
                                                navigator.clipboard.writeText(text);
                                                addToast({ type: 'success', title: 'Copied', message: 'Credentials copied to clipboard.' });
                                            }}
                                            className="w-full text-[10px] font-black uppercase tracking-widest h-10 mt-2"
                                        >
                                            Copy Welcome Message
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-white uppercase">{selectedApplicant.first_name} {selectedApplicant.last_name}</h2>
                            <p className="text-gray-400">{selectedApplicant.email}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <Card isElevated={true} className="p-0 border-white/10 bg-black/40 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_100%)] pointer-events-none" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                                    <div className="p-4 relative z-10">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Position</p>
                                        <p className="text-brand-primary font-bold">{selectedApplicant.position}</p>
                                    </div>
                                </Card>
                                <Card isElevated={true} className="p-0 border-white/10 bg-black/40 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_100%)] pointer-events-none" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                                    <div className="p-4 relative z-10">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">WhatsApp</p>
                                        <p className="text-white font-bold">{selectedApplicant.whatsapp}</p>
                                    </div>
                                </Card>
                                <Card isElevated={true} className="p-0 border-white/10 bg-black/40 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_100%)] pointer-events-none" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                                    <div className="p-4 relative z-10">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Submission Date</p>
                                        <p className="text-white font-bold">
                                            {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(selectedApplicant.created_at))}
                                        </p>
                                    </div>
                                </Card>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] opacity-50 flex items-center gap-2">
                                        <IconTag size={16} />
                                        Applicant Labels
                                    </h3>
                                    <Button
                                        variant="recessed"
                                        size="sm"
                                        onClick={() => setIsLabelModalOpen(true)}
                                        className="h-8 px-3 text-[10px]"
                                        leftIcon={<IconTag size={12} />}
                                    >
                                        Manage Labels
                                    </Button>
                                </div>

                                <div className="pt-2 space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Assignment (Click to Toggle)</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {allLabels.length > 0 ? (
                                            allLabels.map(label => {
                                                const isAssigned = selectedApplicant.labels?.some(l => l.id === label.id);
                                                return (
                                                    <button
                                                        key={label.id}
                                                        onClick={() => handleToggleLabel(label)}
                                                        className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-3 ${isAssigned
                                                                ? 'border-transparent shadow-lg text-white'
                                                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                                                            }`}
                                                        style={isAssigned ? { backgroundColor: label.color } : {}}
                                                    >
                                                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: isAssigned ? '#fff' : label.color }} />
                                                        {label.name}
                                                        {isAssigned && <IconX size={10} className="ml-1 opacity-60" />}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="text-[10px] text-gray-600 italic px-1">No labels created yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {selectedApplicant.cv_file_url && (
                                    <a
                                        href={selectedApplicant.cv_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group relative"
                                    >
                                        <Card isElevated={true} className="p-0 border-white/10 bg-black/40 hover:bg-white/[0.06] transition-all cursor-pointer overflow-hidden">
                                            {/* Metallic Shine Overlay */}
                                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                                            <div className="p-5 flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                        <IconFileText size={24} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-white uppercase tracking-wider text-sm">Professional Resume</span>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Application Document</span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all duration-300">
                                                    <IconChevronRight size={20} />
                                                </div>
                                            </div>
                                        </Card>
                                    </a>
                                )}

                                {selectedApplicant.portfolio_links && selectedApplicant.portfolio_links.length > 0 && (
                                    <div className="space-y-4 pt-2">
                                        <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] opacity-50">
                                            Portfolio Showcase
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedApplicant.portfolio_links.map((link, idx) => (
                                                <a
                                                    key={idx}
                                                    href={link.startsWith('http') ? link : `https://${link}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group relative block"
                                                >
                                                    <Card isElevated={true} className="p-0 border-white/10 bg-black/40 hover:bg-white/[0.06] transition-all cursor-pointer overflow-hidden">
                                                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                                                        <div className="p-5 flex items-center justify-between relative z-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                                    <IconExternalLink size={24} />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-black text-white uppercase tracking-wider text-sm truncate max-w-[350px]">{link}</span>
                                                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Project Portfolio</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all duration-300">
                                                                <IconChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Applicants;
