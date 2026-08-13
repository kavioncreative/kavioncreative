import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Avatar } from '../components/Avatar';
import { Tabs } from '../components/Navigation';
import { Calendar } from '../components/Calendar';
import { Modal, Card, ElevatedMetallicCard, Tooltip } from '../components/Surfaces';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { Dropdown } from '../components/Dropdown';
import { UploadPreview } from '../components/UploadPreview';
import { IconCreditCard, IconChartBar, IconUser, IconSettings, IconPlus, IconTrash, IconEdit, IconCalendar, IconFilter, IconCloudUpload, IconClock, IconCheckCircle, IconLayout, IconDownload, IconBuilding, IconDollar, IconTrendingUp, IconX, IconChevronRight, IconLock, IconRefreshCw, IconXCircle, IconSearch } from '../components/Icons';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';
import { KebabMenu } from '../components/KebabMenu';
import { Checkbox, Switch } from '../components/Selection';
import { Badge, getRoleCapsuleClasses, getAccountCapsuleClasses, getStatusCapsuleClasses } from '../components/Badge';
import { getInitialTab, updateRoute } from '../utils/routing';
import { useAccounts } from '../contexts/AccountContext';
import { useUser } from '../contexts/UserContext';
import { uploadFile } from '../utils/storage';

const PlatformCommission: React.FC = () => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCommission, setSelectedCommission] = useState<any>(null);
    const { accounts, loading: accountsLoading } = useAccounts();
    const [commissions, setCommissions] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        existingPlatformId: '',
        platformName: '',
        logo: null as string | null,
        percentage: '',
        clearanceDays: '',
        assignedAccountIds: [] as string[]
    });

    const fetchedRef = React.useRef(false);

    React.useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        fetchCommissions(true);
    }, []);


    // fetchAccounts removed in favor of useAccounts()

    const fetchCommissions = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        const { data, error } = await supabase

            .from('platform_commissions')
            .select(`
                id,
                platform_name,
                commission_percentage,
                clearance_days,
                logo_url,
                platform_commission_accounts (
                    account_id
                )
            `);

        if (error) {
            console.error('Error fetching commissions:', error);
            return;
        }

        if (data) {
            // Transform nested join data into flat array for UI
            const mapped = data.map(item => ({
                ...item,
                assigned_account_ids: item.platform_commission_accounts?.map((r: any) => r.account_id) || []
            }));
            console.log('Fetched commissions:', mapped);
            setCommissions(mapped);
        }
        if (isInitial) setLoading(false);
    };


    const handleEditClick = (item: any) => {
        setIsEditMode(true);
        setSelectedCommission(item);
        setFormData({
            existingPlatformId: '',
            platformName: item.platform_name,
            logo: item.logo_url,
            percentage: item.commission_percentage ? (item.commission_percentage * 100).toString() : '', // Convert factor 0.2 -> 20 for UI
            clearanceDays: item.clearance_days?.toString() || '',
            assignedAccountIds: item.assigned_account_ids || []
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: any) => {
        setSelectedCommission(item);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedCommission) return;
        setSubmitting(true);
        try {
            // Use select() to verify it actually deleted a row (PostgREST returns deleted rows if selected)
            const { data, error } = await supabase.from('platform_commissions').delete().eq('id', selectedCommission.id).select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Deletion failed: The record might have already been removed or you do not have permission.');
            }

            addToast({ type: 'success', title: 'Commission Deleted', message: 'Commission configuration removed successfully.' });
            setCommissions(prev => prev.filter(c => c.id !== selectedCommission.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setSubmitting(false);
            setSelectedCommission(null);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedCommission(null);
        setFormData({
            existingPlatformId: '',
            platformName: '',
            logo: null,
            percentage: '',
            clearanceDays: '',
            assignedAccountIds: []
        });
        setUploadStatus('idle');
        setUploadProgress(0);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus('uploading');
        setUploadProgress(20);

        try {
            const uploaded = await uploadFile(file);
            setUploadProgress(100);
            setFormData(prev => ({ ...prev, logo: uploaded.url }));
            setUploadStatus('success');
            if (e.target) e.target.value = '';
        } catch (err) {
            console.error('Logo upload error:', err);
            setUploadStatus('error');
            if (e.target) e.target.value = '';
        }
    };

    const handleSave = async () => {
        if (!formData.platformName || !formData.percentage) {
            addToast({
                type: 'error',
                title: 'Missing Fields',
                message: 'Platform Name and Commission % are required.'
            });
            return;
        }

        setSubmitting(true);

        // STRICT LOGIC: Store percentage as decimal factor (e.g. 20% -> 0.20)
        const commissionFactor = parseFloat(formData.percentage) / 100;

        const basePayload = {
            platform_name: formData.platformName,
            logo_url: formData.logo, // Enabled for saving logo URL
            commission_percentage: commissionFactor, // Mapped to correct column
            clearance_days: parseInt(formData.clearanceDays || '14'),
            // Removed assigned_account_ids from here as it doesn't exist in the commissions table
        };

        console.log('Saving payload:', { ...basePayload, logo_url: basePayload.logo_url ? `[Base64 string of length ${basePayload.logo_url.length}]` : null });

        try {
            let commissionId;

            // 1. UPSERT COMMISSION
            if (isEditMode && selectedCommission) {
                const { data, error } = await supabase
                    .from('platform_commissions')
                    .update(basePayload)
                    .eq('id', selectedCommission.id)
                    .select()
                    .single();

                if (error) throw error;
                commissionId = data.id;
            } else {
                const { data, error } = await supabase
                    .from('platform_commissions')
                    .insert([basePayload])
                    .select()
                    .single();

                if (error) throw error;
                commissionId = data.id;
            }

            // 2. MANAGE ACCOUNT MAPPINGS (Critical Fix)
            // Always Delete existing -> Insert new to ensure sync
            // A) Delete old mappings
            const { error: deleteError } = await supabase
                .from('platform_commission_accounts')
                .delete()
                .eq('platform_commission_id', commissionId);

            if (deleteError) throw deleteError;

            // B) Insert new mappings
            if (formData.assignedAccountIds && formData.assignedAccountIds.length > 0) {
                const mappingPayload = formData.assignedAccountIds.map(accId => ({
                    platform_commission_id: commissionId,
                    account_id: accId
                }));

                const { error: insertError } = await supabase
                    .from('platform_commission_accounts')
                    .insert(mappingPayload);

                if (insertError) throw insertError;
            }

            // 3. REFRESH STATE
            await fetchCommissions();

            addToast({
                type: 'success',
                title: isEditMode ? 'Commission Updated' : 'Commission Saved',
                message: `${formData.platformName} has been ${isEditMode ? 'updated' : 'configured'} successfully.`
            });

            handleCloseModal();
        } catch (error: any) {
            console.error('Commission Save Error:', error);
            addToast({
                type: 'error',
                title: 'Save Failed',
                message: error.message || 'An error occurred while saving the configuration.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Commission Logs</h3>
                    <Button
                        variant="metallic"
                        size="sm"
                        leftIcon={<IconPlus className="w-4 h-4" />}
                        onClick={() => setIsModalOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        Add Commission
                    </Button>
                </div>
                <Table
                    isMetallicHeader={true}
                    columns={[
                        {
                            header: 'Platform',
                            key: 'platform_name',
                            className: 'w-80',
                            render: (item: any) => (
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        src={item.logo_url}
                                        initials={item.platform_name?.charAt(0)}
                                        size="sm"
                                    />
                                    <span className="font-semibold text-white/90">{item.platform_name}</span>
                                </div>
                            )
                        },
                        {
                            header: 'Commission %',
                            key: 'percentage',
                            className: 'w-40',
                            render: (item: any) => (
                                <span className="text-brand-primary font-bold">{item.commission_percentage ? item.commission_percentage * 100 : 0}%</span>
                            )
                        },
                        {
                            header: 'Clearance Days',
                            key: 'clearance_days',
                            className: 'w-44',
                            render: (item: any) => (
                                <span className="text-gray-400">{item.clearance_days} Days</span>
                            )
                        },
                        {
                            header: 'Accounts',
                            key: 'assigned_account_ids',
                            className: 'min-w-[272px]',
                            render: (item: any) => (
                                <div className="flex flex-wrap gap-1.5">
                                    {item.assigned_account_ids?.map((id: string) => {
                                        const account = (accounts || []).find(a => a.id === id);
                                        return (
                                            <span key={id} className="px-3 py-1 rounded-md bg-gray-600/20 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                {account?.name || 'Unknown'}
                                            </span>
                                        );
                                    })}
                                    {(!item.assigned_account_ids || item.assigned_account_ids.length === 0) && (
                                        <span className="text-xs text-gray-600 italic">None</span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: '',
                            key: 'actions',
                            className: 'w-20 text-right',
                            render: (item: any) => (
                                <KebabMenu
                                    options={[
                                        { label: 'Edit', icon: <IconEdit className="w-4 h-4" />, onClick: () => handleEditClick(item) },
                                        { label: 'Delete', icon: <IconTrash className="w-4 h-4" />, variant: 'danger', onClick: () => handleDeleteClick(item) }
                                    ]}
                                />
                            )
                        }
                    ]}
                    data={commissions}
                    isLoading={loading}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditMode ? "Edit Platform Commission" : "Set Platform Commission"}
                size="md"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleCloseModal}>Cancel</Button>
                        <Button
                            variant="metallic"
                            onClick={handleSave}
                            isLoading={submitting}
                        >
                            {isEditMode ? "Update Commission" : "Save Commission"}
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    {!isEditMode && commissions && commissions.length > 0 && (
                        <Dropdown
                            variant="metallic"
                            label="Select Existing Platform"
                            placeholder="Select a platform"
                            options={commissions.map(c => ({ label: c.platform_name, value: c.id }))}
                            value={formData.existingPlatformId}
                            onChange={(val) => {
                                const ex = commissions.find(c => c.id === val);
                                if (ex) {
                                    setFormData({
                                        existingPlatformId: val,
                                        platformName: ex.platform_name,
                                        logo: ex.logo_url,
                                        percentage: ex.percentage.toString(),
                                        clearanceDays: ex.clearance_days.toString(),
                                        assignedAccountIds: ex.assigned_account_ids || []
                                    });
                                } else {
                                    setFormData(prev => ({ ...prev, existingPlatformId: val }));
                                }
                            }}
                        />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4 md:max-w-[85%]">
                            <Input
                                variant="metallic"
                                label="Platform Name"
                                placeholder="Fiverr"
                                value={formData.platformName}
                                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                            />
                            <Input
                                variant="metallic"
                                label="Commission Percentage"
                                placeholder="Enter percentage (0-100)"
                                value={formData.percentage}
                                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                            />
                            <Input
                                variant="metallic"
                                label="Clearance Days"
                                placeholder="14"
                                value={formData.clearanceDays}
                                onChange={(e) => setFormData({ ...formData, clearanceDays: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-400 ml-1">Upload Logo</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 min-h-[140px] flex flex-col items-center justify-center rounded-3xl p-6 bg-white/[0.03] border border-white/10 relative overflow-hidden transition-all duration-300 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] hover:bg-white/[0.06] hover:border-white/20 cursor-pointer group"
                            >
                                {/* Top Edge Highlight for Elevation */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                {/* Full Surface Metallic Shine */}
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                                {/* Center-weighted Shadow Depth Falloff */}
                                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none" />

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                                <div className="relative z-10 w-full flex items-center justify-center">
                                    <UploadPreview
                                        variant="circular"
                                        status={uploadStatus}
                                        progress={uploadProgress}
                                        imageSrc={formData.logo || ''}
                                        onUpload={(e?: any) => {
                                            e?.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                        onRemove={(e?: any) => {
                                            e?.stopPropagation();
                                            setFormData({ ...formData, logo: null });
                                            setUploadStatus('idle');
                                        }}
                                        onReplace={(e?: any) => {
                                            e?.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Dropdown
                        variant="metallic"
                        isMulti
                        showSearch
                        label="Assign to accounts"
                        placeholder="Select accounts"
                        options={(accounts || []).map(acc => ({
                            label: acc.name,
                            value: acc.id,
                            description: acc.prefix
                        }))}
                        value={formData.assignedAccountIds}
                        onChange={(val) => setFormData(prev => ({ ...prev, assignedAccountIds: val }))}
                    />
                </div>
            </Modal>

            {/* Confirmation Modal for Delete */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="sm"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="metallic-error"
                            onClick={handleConfirmDelete}
                            isLoading={submitting}
                        >
                            Delete Platform
                        </Button>
                    </div>
                )}
            >
                <div className="py-2">
                    <p className="text-gray-300">Are you sure you want to delete the commission configuration for <span className="font-bold text-white">{selectedCommission?.platform_name}</span>?</p>
                    <p className="text-sm text-gray-500 mt-2">This action cannot be undone and will remove all associated settings.</p>
                </div>
            </Modal>
        </div>
    );
};

const SellerCommissionConfigs: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const { accounts } = useAccounts();
    const deduplicatedAccounts = useMemo(() => {
        if (!accounts) return [];
        
        // Group by prefix (case-insensitive)
        const groups = accounts.reduce((acc, curr) => {
            const key = (curr.prefix || curr.name || '').toLowerCase().trim();
            if (!key) return acc;
            
            if (!acc[key]) acc[key] = [];
            acc[key].push(curr);
            return acc;
        }, {} as Record<string, any[]>);
        
        return Object.values(groups).map(group => {
            // Prefer the account with the longest name (likely the full name)
            return [...group].sort((a, b) => (b.name || '').length - (a.name || '').length)[0];
        });
    }, [accounts]);

    const [formData, setFormData] = useState({
        sellerId: '',
        percentage: '',
        clearanceDays: '14',
        assignedAccountIds: [] as string[]
    });

    useEffect(() => {
        fetchCommissions();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name, email, role');
        if (data) {
            setUsers(data.filter((u: any) => u.role !== 'Freelancer'));
        }
    };

    const fetchCommissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('seller_commissions')
            .select(`
                id,
                seller_id,
                commission_percentage,
                clearance_days,
                logo_url,
                seller_commission_accounts (
                    account_id
                ),
                profiles (
                    name,
                    email
                )
            `);
        if (data) {
            setCommissions(data.map(item => ({
                ...item,
                assigned_account_ids: item.seller_commission_accounts?.map((r: any) => r.account_id) || []
            })));
        }
        setLoading(false);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedCommissionId(null);
        setFormData({ sellerId: '', percentage: '', clearanceDays: '14', assignedAccountIds: [] });
    };

    const handleSave = async () => {
        if (!formData.sellerId || !formData.percentage) {
            addToast({ type: 'error', title: 'Missing Fields', message: 'Seller and Commission % are required.' });
            return;
        }
        setSubmitting(true);
        const factor = parseFloat(formData.percentage) / 100;
        
        if (isEditMode && selectedCommissionId) {
            const { error } = await supabase
                .from('seller_commissions')
                .update({
                    seller_id: formData.sellerId,
                    commission_percentage: factor
                })
                .eq('id', selectedCommissionId);

            if (error) {
                addToast({ type: 'error', title: 'Update Failed', message: error.message });
                setSubmitting(false);
                return;
            }

            // Sync account mappings (delete and insert new)
            await supabase.from('seller_commission_accounts').delete().eq('seller_commission_id', selectedCommissionId);

            if (formData.assignedAccountIds.length > 0) {
                const accPayload = formData.assignedAccountIds.map(accId => ({
                    seller_commission_id: selectedCommissionId,
                    account_id: accId
                }));
                await supabase.from('seller_commission_accounts').insert(accPayload);
            }

            addToast({ type: 'success', title: 'Updated', message: 'Seller commission updated' });
            handleCloseModal();
            fetchCommissions();
        } else {
            const payload = {
                seller_id: formData.sellerId,
                commission_percentage: factor,
                clearance_days: 14 // Synced dynamically, default 14
            };
            
            const { data, error } = await supabase.from('seller_commissions').insert([payload]).select().single();
            if (error) {
                addToast({ type: 'error', title: 'Save Failed', message: error.message });
                setSubmitting(false);
                return;
            }

            if (data && formData.assignedAccountIds.length > 0) {
                const accPayload = formData.assignedAccountIds.map(accId => ({
                    seller_commission_id: data.id,
                    account_id: accId
                }));
                await supabase.from('seller_commission_accounts').insert(accPayload);
            }
            
            addToast({ type: 'success', title: 'Saved', message: 'Seller commission saved' });
            handleCloseModal();
            fetchCommissions();
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Seller Commission Logs</h3>
                <Button
                    variant="metallic"
                    size="sm"
                    leftIcon={<IconPlus className="w-4 h-4" />}
                    onClick={() => {
                        setIsEditMode(false);
                        setIsModalOpen(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    Add Seller Commission
                </Button>
            </div>
            <Table
                isLoading={loading}
                isMetallicHeader={true}
                emptyMessage="No seller commissions saved yet."
                columns={[
                    {
                        header: 'Seller',
                        key: 'seller_id',
                        className: 'w-80',
                        render: (item: any) => (
                            <div className="flex items-center gap-3">
                                <Avatar
                                    src={item.logo_url}
                                    initials={(Array.isArray(item.profiles) ? item.profiles[0]?.name : (item.profiles as any)?.name)?.charAt(0) || '?'}
                                    size="sm"
                                />
                                <span className="font-semibold text-white/90">{(Array.isArray(item.profiles) ? item.profiles[0]?.name : (item.profiles as any)?.name) || 'Unknown User'}</span>
                            </div>
                        )
                    },
                    {
                        header: 'Commission %',
                        key: 'percentage',
                        className: 'w-40',
                        render: (item: any) => (
                            <span className="text-brand-primary font-bold">{item.commission_percentage ? (item.commission_percentage * 100).toFixed(1) : 0}%</span>
                        )
                    },
                    {
                        header: 'Clearance Period',
                        key: 'clearance_days',
                        className: 'w-44',
                        render: (item: any) => (
                            <span className="text-gray-400">Monthly (Next Month 15th)</span>
                        )
                    },
                    {
                        header: 'Accounts',
                        key: 'assigned_account_ids',
                        className: 'min-w-[272px]',
                        render: (item: any) => (
                            <div className="flex flex-wrap gap-1.5">
                                {item.assigned_account_ids?.map((id: string) => {
                                    const accLabel = accounts?.find(a => a.id === id)?.prefix || id;
                                    return (
                                        <span key={id} className={getAccountCapsuleClasses()}>
                                            {accLabel}
                                        </span>
                                    );
                                })}
                                {(!item.assigned_account_ids || item.assigned_account_ids.length === 0) && (
                                    <span className="text-xs text-gray-600 italic">None</span>
                                )}
                            </div>
                        )
                    },
                    {
                        header: '',
                        key: 'actions',
                        className: 'w-20 text-right',
                        render: (item: any) => (
                            <KebabMenu
                                options={[
                                    { label: 'Edit', icon: <IconEdit className="w-4 h-4" />, onClick: () => {
                                        setIsEditMode(true);
                                        setSelectedCommissionId(item.id);
                                        setFormData({
                                            sellerId: item.seller_id || '',
                                            percentage: (item.commission_percentage * 100).toString(),
                                            clearanceDays: (item.clearance_days || 14).toString(),
                                            assignedAccountIds: item.assigned_account_ids || []
                                        });
                                        setIsModalOpen(true);
                                    } },
                                    { label: 'Delete', icon: <IconTrash className="w-4 h-4" />, variant: 'danger', onClick: async () => {
                                        await supabase.from('seller_commissions').delete().eq('id', item.id);
                                        fetchCommissions();
                                    }}
                                ]}
                            />
                        )
                    }
                ]}
                data={commissions}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditMode ? "Edit Seller Commission" : "Add Seller Commission"}
                size="md"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="metallic" onClick={handleSave} isLoading={submitting}>
                            {isEditMode ? "Update Commission" : "Save Commission"}
                        </Button>
                    </div>
                )}
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Dropdown
                            variant="metallic"
                            label="Select Seller"
                            placeholder="Select a seller"
                            showSearch
                            menuClassName="min-w-[400px] w-max"
                            options={users.map(u => {
                                return {
                                    label: u.name,
                                    value: u.id,
                                    labelClassName: 'whitespace-nowrap shrink-0',
                                    description: u.role || 'User',
                                    descriptionClassName: getRoleCapsuleClasses(u.role)
                                };
                            })}
                            value={formData.sellerId}
                            onChange={(val) => setFormData({ ...formData, sellerId: val as string })}
                        />
                        <Input
                            variant="metallic"
                            label="Commission Percentage"
                            placeholder="Enter percentage (0-100)"
                            type="number"
                            value={formData.percentage}
                            onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                        />
                    </div>
                    <Dropdown
                        variant="metallic"
                        isMulti
                        showSearch
                        label="Assign to accounts"
                        placeholder="Select accounts"
                        options={deduplicatedAccounts.map(acc => ({
                            label: acc.name,
                            value: acc.id,
                            description: acc.prefix,
                            descriptionClassName: getAccountCapsuleClasses()
                        }))}
                        value={formData.assignedAccountIds}
                        onChange={(val) => setFormData(prev => ({ ...prev, assignedAccountIds: val }))}
                    />
                </div>
            </Modal>
        </div>
    );
};

const SellerEarnings: React.FC = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { accounts } = useAccounts();

    useEffect(() => {
        loadEarnings();
    }, []);

    const loadEarnings = async () => {
        setLoading(true);
        try {
            console.log('Fetching seller earnings data...');
            const { data: accountsData } = await supabase.from('accounts').select('id, prefix');
            const accountMap = new Map((accountsData || []).map(a => [a.id, a.prefix]));

            const [projRes, sellRes, platRes, slabRes] = await Promise.all([
                supabase.from('projects')
                    .select('id, project_id, project_title, status, created_at, clearance_start_date, price, designer_fee, account_id, client_name, client_type, primary_manager_id, assignee, primary_manager:primary_manager_id(name)')
                    .in('status', ['Approved', 'Done', 'Completed', 'Sent For Approval']),
                supabase.from('seller_commissions')
                    .select('id, seller_id, commission_percentage, clearance_days, seller_commission_accounts(account_id), profiles(name)'),
                supabase.from('platform_commissions')
                    .select('*, platform_commission_accounts(account_id)'),
                supabase.from('pricing_slabs')
                    .select('*')
            ]);

            // Detailed error logging
            if (projRes.error) console.error('Project fetch error:', projRes.error);
            if (sellRes.error) console.error('Seller fetch error:', sellRes.error);
            if (platRes.error) console.error('Platform fetch error:', platRes.error);
            if (slabRes.error) console.error('Slab fetch error:', slabRes.error);

            const projects = projRes.data || [];
            const slabs = slabRes.data || [];

            // 1. Build optimized lookup maps for commissions (O(N) construction, O(1) lookup)
            const pcMap = new Map();
            (platRes.data || []).forEach(p => {
                p.platform_commission_accounts?.forEach((a: any) => {
                    pcMap.set(a.account_id, {
                        ...p,
                        pFactor: Number(p.commission_percentage || 0)
                    });
                });
            });

            const getDaysLeft = (startDateStr: string) => {
                if (!startDateStr) return 0;
                const now = new Date();
                const currentKarachi = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
                currentKarachi.setHours(0,0,0,0);
                
                const startDate = new Date(startDateStr);
                const startKarachi = new Date(startDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
                
                let targetMonth = startKarachi.getMonth() + 1;
                let targetYear = startKarachi.getFullYear();
                if (targetMonth > 11) {
                    targetMonth = 0;
                    targetYear += 1;
                }
                const targetRelease = new Date(targetYear, targetMonth, 15, 0, 0, 0, 0);
                
                const diffMs = targetRelease.getTime() - currentKarachi.getTime();
                const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                return Math.max(0, days);
            };

            const scMap = new Map();
            (sellRes.data || []).forEach(s => {
                const profileName = Array.isArray(s.profiles) ? s.profiles[0]?.name : (s.profiles as any)?.name;
                s.seller_commission_accounts?.forEach((a: any) => {
                    const key = `${s.seller_id}_${a.account_id}`;
                    scMap.set(key, {
                        ...s,
                        sFactor: Number(s.commission_percentage || 0),
                        sellerName: profileName || 'Unknown'
                    });
                });
            });

            const enriched = projects.map(p => {
                const price = Number(p.price || 0);
                const accId = p.account_id;

                // Platform Math
                const pComm = pcMap.get(accId);
                const pFactor = pComm?.pFactor || 0;
                const platformCut = price * pFactor;

                // Seller Math
                const sComm = scMap.get(`${p.converted_by}_${accId}`);
                const sFactor = sComm?.sFactor || 0;
                const isConverted = ['Inquiry', 'Converted'].includes(p.order_type);
                const sellerCut = isConverted ? (price * sFactor) : 0;
                const sellerName = sComm?.sellerName || 'Unassigned';

                // Freelancer Math
                let freelancerCut = 0;
                if (p.designer_fee && Number(p.designer_fee) > 0) {
                    freelancerCut = Number(p.designer_fee);
                } else {
                    const slab = slabs.find(s => price >= Number(s.min_price) && price <= Number(s.max_price));
                    const fFactor = slab ? (Number(slab.freelancer_percentage) / 100) : 0.5;
                    freelancerCut = (price - platformCut) * fFactor;
                }

                // Company Earning
                const companyEarning = price - platformCut - freelancerCut;
                const daysLeft = p.clearance_start_date ? getDaysLeft(p.clearance_start_date) : 0;

                return {
                    ...p,
                    sellerCut,
                    platformCut,
                    freelancerCut,
                    companyEarning,
                    sellerName,
                    daysLeft,
                    clientName: (p.client_name && p.client_name !== 'repeat') ? p.client_name : (p.client_type === 'repeat' ? 'Repeat Buyer' : (p.client_type || '-')),
                    project_id: p.project_id || p.id,
                    project_title: p.project_title || 'Untitled',
                    date: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                    rawDate: p.clearance_start_date,
                    accountPrefix: accountMap.get(accId) || ''
                };
            });

            // Show projects with a valid seller commission
            const validEarnings = enriched.filter(t => t.sellerCut > 0);
            setTransactions(validEarnings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('Failed fetching seller earnings', error);
            addToast({ type: 'error', title: 'Fetch Error', message: 'Could not load seller earnings.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Seller Earnings</h3>
                <Button
                    variant="metallic"
                    size="sm"
                    leftIcon={<IconRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                    onClick={loadEarnings}
                    className="w-full sm:w-auto"
                >
                    Refresh
                </Button>
            </div>

            <Table
                isLoading={loading}
                isMetallicHeader={true}
                emptyMessage="No seller earnings found. Projects must be completed/approved and assigned to an account with a configured Seller."
                columns={[
                    {
                        header: 'Project ID',
                        key: 'project_id',
                        render: (item: any) => (
                            <span className="font-semibold text-white/90">{item.project_id}</span>
                        )
                    },
                    {
                        header: 'Seller / Agent',
                        key: 'sellerName',
                        render: (item: any) => (
                            <span className="font-bold text-white tracking-tight">{item.sellerName}</span>
                        )
                    },
                    {
                        header: 'Client',
                        key: 'clientName',
                        className: 'text-gray-400'
                    },
                    {
                        header: 'Project Price',
                        key: 'price',
                        className: 'text-right',
                        render: (item: any) => (
                            <span className="text-white font-bold">${item.price.toFixed(2)}</span>
                        )
                    },
                    {
                        header: 'Platform Commission',
                        key: 'platformCut',
                        className: 'text-right',
                        render: (item: any) => (
                            <span className="text-gray-400 font-bold">${item.platformCut.toFixed(2)}</span>
                        )
                    },
                    {
                        header: 'Freelancer Cut',
                        key: 'freelancerCut',
                        className: 'text-right',
                        render: (item: any) => (
                            <span className="text-brand-info font-bold">${item.freelancerCut.toFixed(2)}</span>
                        )
                    },
                    {
                        header: 'Seller Commission',
                        key: 'sellerCut',
                        className: 'text-right',
                        render: (item: any) => (
                            <span className="text-brand-warning font-black tracking-wider drop-shadow-sm">${item.sellerCut.toFixed(2)}</span>
                        )
                    },
                    {
                        header: 'Company Earning',
                        key: 'companyEarning',
                        className: 'text-right',
                        render: (item: any) => (
                            <span className="text-brand-success font-black tracking-wider drop-shadow-sm">${item.companyEarning.toFixed(2)}</span>
                        )
                    },
                    {
                        header: 'Clearance',
                        key: 'daysLeft',
                        className: 'text-right text-xs',
                        render: (item: any) => (
                            item.daysLeft === 0 ? (
                                <span className="text-brand-success font-bold">Cleared</span>
                            ) : (
                                <span className="text-gray-400 font-semibold">{item.daysLeft} Days Left</span>
                            )
                        )
                    },
                    {
                        header: 'Date',
                        key: 'date',
                        className: 'text-right text-gray-400 text-xs'
                    }
                ]}
                data={transactions}
            />
        </div>
    );
};

const SellerCommission: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'configs' | 'earnings'>('configs');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Tabs
                tabs={[
                    { id: 'configs', label: 'Seller Commissions', icon: <IconSettings size={16} /> },
                    { id: 'earnings', label: 'Seller Earnings', icon: <IconDollar size={16} /> }
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as 'configs' | 'earnings')}
            />

            <div className="mt-4">
                {activeTab === 'configs' && <SellerCommissionConfigs />}
                {activeTab === 'earnings' && <SellerEarnings />}
            </div>
        </div>
    );
};

const BonusStructureManager: React.FC = () => {
    const [structures, setStructures] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStructure, setSelectedStructure] = useState<any>(null);

    // Form states
    const [name, setName] = useState('');
    const [role, setRole] = useState('Project Manager');
    const [calcType, setCalcType] = useState('Volume');
    const [target, setTarget] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('PKR');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchStructures();
    }, []);

    const fetchStructures = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('bonus_structures')
                .select('*')
                .order('created_at', { ascending: false });
            setStructures(data || []);
        } catch (e) {
            console.error('Error fetching bonuses:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setSelectedStructure(null);
        setName('');
        setRole('Project Manager');
        setCalcType('Volume');
        setTarget('');
        setAmount('');
        setCurrency('PKR');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (struct: any) => {
        setSelectedStructure(struct);
        setName(struct.name);
        setRole(struct.role);
        setCalcType(struct.calc_type);
        setTarget(struct.target.toString());
        setAmount(struct.amount.toString());
        setCurrency(struct.currency);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!name || !target || !amount) {
            addToast({ type: 'error', title: 'Missing fields', message: 'Please fill in all target configurations.' });
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                name,
                role,
                calc_type: calcType,
                target: parseFloat(target),
                amount: parseFloat(amount),
                currency
            };

            if (selectedStructure) {
                const { error } = await supabase
                    .from('bonus_structures')
                    .update(payload)
                    .eq('id', selectedStructure.id);
                if (error) throw error;
                addToast({ type: 'success', title: 'Rule Updated', message: 'Bonus structure updated successfully.' });
            } else {
                const { error } = await supabase
                    .from('bonus_structures')
                    .insert([payload]);
                if (error) throw error;
                addToast({ type: 'success', title: 'Rule Created', message: 'New bonus structure rule created.' });
            }
            setIsModalOpen(false);
            fetchStructures();
        } catch (e) {
            console.error(e);
            addToast({ type: 'error', title: 'Error', message: 'Failed to save bonus structure.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this bonus structure rule?')) return;
        try {
            const { error } = await supabase
                .from('bonus_structures')
                .delete()
                .eq('id', id);
            if (error) throw error;
            addToast({ type: 'success', title: 'Rule Deleted', message: 'Bonus structure deleted successfully.' });
            fetchStructures();
        } catch (e) {
            console.error(e);
            addToast({ type: 'error', title: 'Error', message: 'Failed to delete rule.' });
        }
    };

    const rolesList = [
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Team Designer', value: 'Team Designer' },
        { label: 'Team Lead', value: 'Team Lead' },
        { label: 'Freelancer', value: 'Freelancer' },
        { label: 'Presentation Designer', value: 'Presentation Designer' },
        { label: 'Finance Manager', value: 'Finance Manager' },
        { label: 'ORM Manager', value: 'ORM Manager' },
        { label: 'Project Operations Manager', value: 'Project Operations Manager' },
        { label: 'Admin', value: 'Admin' },
        { label: 'Super Admin', value: 'Super Admin' }
    ];

    const calcTypes = [
        { label: 'Volume (Completed count)', value: 'Volume' },
        { label: 'Percentage (Conversion rate)', value: 'Percentage' },
        { label: 'Rating (Average review score)', value: 'Rating' },
        { label: 'Punctuality (On-time shifts)', value: 'Punctuality' }
    ];

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden bg-surface-card border border-surface-border rounded-3xl animate-in fade-in duration-500">
                <div className="p-6 md:p-8 border-b border-surface-border flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white uppercase tracking-wider">Bonus Structures Configuration</h3>
                        <p className="text-sm text-gray-500 mt-1">Setup dynamic role-based milestones, calculations, targets and currencies.</p>
                    </div>
                    <Button variant="metallic" size="sm" onClick={handleOpenCreate}>
                        Create Bonus Rule
                    </Button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px] text-gray-300">
                        <thead className="bg-white/[0.02] text-gray-400 font-bold uppercase tracking-widest text-[10px] border-b border-surface-border">
                            <tr>
                                <th className="px-6 py-4">Bonus Name</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Calculation Type</th>
                                <th className="px-6 py-4">Target Goal</th>
                                <th className="px-6 py-4">Reward Amount</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        Loading configured rules...
                                    </td>
                                </tr>
                            ) : structures.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        No bonus rules configured yet.
                                    </td>
                                </tr>
                            ) : (
                                structures.map((struct) => (
                                    <tr key={struct.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4 font-bold text-white">{struct.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {struct.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-400">
                                            {struct.calc_type}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-brand-primary">
                                            {struct.target} {struct.calc_type === 'Percentage' ? '%' : struct.calc_type === 'Rating' ? '★' : 'units'}
                                        </td>
                                        <td className="px-6 py-4 font-black text-emerald-400">
                                            {struct.currency} {struct.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Button variant="recessed" size="xs" onClick={() => handleOpenEdit(struct)}>
                                                Edit
                                            </Button>
                                            <button
                                                onClick={() => handleDelete(struct.id)}
                                                className="px-2 py-1 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider transition-all"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Config modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedStructure ? 'Edit Bonus Structure' : 'Create Bonus Structure'}
                size="md"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="recessed" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="metallic" size="sm" onClick={handleSave} isLoading={isSaving}>Save Rule</Button>
                    </div>
                }
            >
                <div className="space-y-4 p-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Bonus Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Volume Target Completed"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/40 text-sm text-white focus:outline-none focus:border-brand-primary/40"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Target Role</label>
                            <Dropdown
                                variant="metallic"
                                label="Select Role"
                                options={rolesList}
                                value={role}
                                onChange={(val) => setRole(val as string)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Calculation Type</label>
                            <Dropdown
                                variant="metallic"
                                label="Select Type"
                                options={calcTypes}
                                value={calcType}
                                onChange={(val) => setCalcType(val as string)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 col-span-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Target Goal</label>
                            <input
                                type="number"
                                placeholder="e.g. 20"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/40 text-sm text-white focus:outline-none focus:border-brand-primary/40"
                            />
                        </div>
                        <div className="space-y-1 col-span-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Amount</label>
                            <input
                                type="number"
                                placeholder="e.g. 15000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/40 text-sm text-white focus:outline-none focus:border-brand-primary/40"
                            />
                        </div>
                        <div className="space-y-1 col-span-1">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Currency</label>
                            <Dropdown
                                variant="metallic"
                                label="Currency"
                                options={[
                                    { label: 'PKR', value: 'PKR' },
                                    { label: 'USD', value: 'USD' }
                                ]}
                                value={currency}
                                onChange={(val) => setCurrency(val as string)}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const PricingSlabs: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSlab, setSelectedSlab] = useState<any>(null);
    const [slabType, setSlabType] = useState<'global' | 'team'>('global');
    const [teamLeads, setTeamLeads] = useState<any[]>([]);
    const [selectedTeamLead, setSelectedTeamLead] = useState<string>('');
    const [slabs, setSlabs] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        minPrice: '',
        maxPrice: '',
        freelancerPercentage: ''
    });

    React.useEffect(() => {
        if (slabType === 'team' && teamLeads.length === 0) {
            fetchTeamLeads();
        }
    }, [slabType]);

    React.useEffect(() => {
        fetchSlabs(true);
    }, [slabType, selectedTeamLead]);

    const fetchTeamLeads = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('role', 'Team Lead')
            .order('name', { ascending: true });
        if (data) setTeamLeads(data);
    };

    const fetchSlabs = async (isInitial = false) => {
        if (isInitial) setSubmitting(true);
        
        let query;
        if (slabType === 'global') {
            query = supabase.from('pricing_slabs').select('*').order('min_price', { ascending: true });
        } else if (selectedTeamLead) {
            query = supabase.from('team_pricing_slabs').select('*').eq('team_lead_id', selectedTeamLead).order('min_price', { ascending: true });
        } else {
            setSlabs([]);
            if (isInitial) setSubmitting(false);
            return;
        }

        const { data, error } = await query;
        if (!error && data) {
            setSlabs(data);
        } else {
            setSlabs([]);
        }
        if (isInitial) setSubmitting(false);
    };


    const handleEditSlab = (slab: any) => {
        setIsEditMode(true);
        setSelectedSlab(slab);
        setFormData({
            name: slab.slab_name || `Tier ${slab.min_price}`,
            minPrice: slab.min_price.toString(),
            maxPrice: slab.max_price.toString(),
            freelancerPercentage: (slab.freelancer_percentage ?? slab.percentage ?? 0).toString()
        });
        setIsModalOpen(true);
    };

    const handleDeleteSlab = (slab: any) => {
        setSelectedSlab(slab);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDeleteSlab = async () => {
        if (!selectedSlab) return;
        setSubmitting(true);
        const table = slabType === 'global' ? 'pricing_slabs' : 'team_pricing_slabs';
        try {
            const { data, error } = await supabase.from(table).delete().eq('id', selectedSlab.id).select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Deletion failed: The record might have already been removed or you do not have permission.');
            }

            addToast({ type: 'success', title: 'Slab Deleted', message: 'Pricing slab removed successfully.' });
            setSlabs(prev => prev.filter(s => s.id !== selectedSlab.id));
            setIsDeleteModalOpen(false);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setSubmitting(false);
            setSelectedSlab(null);
        }
    };



    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setSelectedSlab(null);
        setFormData({ name: '', minPrice: '', maxPrice: '', freelancerPercentage: '' });
    };

    const calculateValues = (price: number) => {
        const platformRate = 0.20; // Default 20% platform cut
        const platformCut = price * platformRate;
        const remaining = price - platformCut;
        const freelancerPerc = parseFloat(formData.freelancerPercentage) || 0;
        const freelancer = remaining * (freelancerPerc / 100);
        const company = remaining - freelancer;

        return {
            platformCut: platformCut.toFixed(2),
            remaining: remaining.toFixed(2),
            freelancer: freelancer.toFixed(2),
            company: company.toFixed(2)
        };
    };

    const handleSaveSlab = async () => {
        if (!formData.name || !formData.minPrice || !formData.maxPrice || !formData.freelancerPercentage) {
            addToast({ type: 'error', title: 'Missing Fields', message: 'All fields are required.' });
            return;
        }

        const min = parseFloat(formData.minPrice);
        const max = parseFloat(formData.maxPrice);
        const perc = parseFloat(formData.freelancerPercentage);

        if (min >= max) {
            addToast({ type: 'error', title: 'Invalid Range', message: 'Minimum price must be less than maximum price.' });
            return;
        }

        if (perc < 0 || perc > 100) {
            addToast({ type: 'error', title: 'Invalid Percentage', message: 'Freelancer percentage must be between 0 and 100.' });
            return;
        }

        setSubmitting(true);
        try {
            const calculateAmounts = (price: number) => {
                const platformCut = price * 0.20;
                const remaining = price - platformCut;
                const freelancerAmt = remaining * (perc / 100);
                const companyAmt = remaining - freelancerAmt;
                return { platformCut, freelancerAmt, companyAmt };
            };

            const minVals = calculateAmounts(min);
            const maxVals = calculateAmounts(max);

            const payload: any = {
                slab_name: formData.name,
                min_price: min,
                max_price: max,
            };

            if (slabType === 'team') {
                payload.team_lead_id = selectedTeamLead;
                payload.percentage = perc;
            } else {
                payload.freelancer_percentage = perc;
            }

            console.log("Submitting Pricing Slab Payload:", payload);

            const table = slabType === 'global' ? 'pricing_slabs' : 'team_pricing_slabs';
            let response;
            if (isEditMode && selectedSlab) {
                response = await supabase
                    .from(table)
                    .update(payload)
                    .eq('id', selectedSlab.id)
                    .select();
            } else {
                response = await supabase
                    .from(table)
                    .insert([payload])
                    .select();
            }

            const { data, error } = response;

            console.log("Supabase Response:", { data, error });

            if (error) throw error;

            addToast({ type: 'success', title: isEditMode ? 'Slab Updated' : 'Slab Created', message: `Pricing slab ${isEditMode ? 'updated' : 'added'} successfully.` });
            const [, refreshResult] = await Promise.all([
                new Promise(resolve => setTimeout(resolve, 500)), // Minimum loading perceptual duration
                fetchSlabs()
            ]);
            handleCloseModal();

        } catch (error: any) {
            addToast({ type: 'error', title: 'Error', message: error.message });
        } finally {
            setSubmitting(false);
        }
    };

    const minPreview = calculateValues(parseFloat(formData.minPrice) || 0);
    const maxPreview = calculateValues(parseFloat(formData.maxPrice) || 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between px-2 gap-4">
                <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pricing Configurations</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                        Manage {slabType === 'global' ? 'Global Freelancer' : 'Team Lead specific'} Payout Tiers
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Slab Type Switcher */}
                    <div className="w-48">
                        <Dropdown
                            variant="metallic"
                            options={[
                                { label: 'Global Slabs', value: 'global' },
                                { label: 'Team Slabs', value: 'team' }
                            ]}
                            value={slabType}
                            onChange={(val) => {
                                setSlabType(val as any);
                                setSelectedTeamLead('');
                            }}
                        />
                    </div>

                    {/* Team Lead Selection (Visible only when 'team' is selected) */}
                    {slabType === 'team' && (
                        <div className="w-56">
                            <Dropdown
                                variant="metallic"
                                options={teamLeads.map(tl => ({ label: tl.name || tl.email, value: tl.id }))}
                                value={selectedTeamLead}
                                onChange={setSelectedTeamLead}
                                placeholder="Select Team Lead"
                                showSearch
                            />
                        </div>
                    )}

                    <Button
                        variant="metallic"
                        size="sm"
                        leftIcon={<IconPlus className="w-4 h-4" />}
                        onClick={() => {
                            if (slabType === 'team' && !selectedTeamLead) {
                                addToast({ type: 'error', title: 'Action Required', message: 'Please select a Team Lead first.' });
                                return;
                            }
                            setIsModalOpen(true);
                        }}
                        className="w-full sm:w-auto ml-auto"
                    >
                        Add {slabType === 'global' ? 'Global' : 'Team'} Slab
                    </Button>
                </div>
            </div>

            <div
                className="flex flex-col gap-4 min-h-[300px] transition-opacity duration-150 ease-out animate-[fade-in_150ms_ease-out]"
                key={slabs.length > 0 ? 'list' : 'empty'}
            >
                {slabs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-12 border-2 border-dashed border-surface-border rounded-3xl bg-white/[0.02]">
                        <div className="p-4 rounded-full bg-brand-primary/10 mb-4">
                            <IconChartBar className="w-8 h-8 text-brand-primary" />
                        </div>
                        <h4 className="text-lg font-bold text-white">
                            {slabType === 'team' && !selectedTeamLead ? 'Select a Team Lead' : 'No Pricing Slabs'}
                        </h4>
                        <p className="text-gray-500 text-sm mt-1 mb-6 text-center max-w-xs">
                            {slabType === 'team' && !selectedTeamLead 
                                ? 'Choose a team lead from the dropdown above to view or manage their specific pricing tiers.' 
                                : 'Define tiered pricing structures for your freelancers and company profit margins.'}
                        </p>
                        {(! (slabType === 'team' && !selectedTeamLead)) && (
                            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>Create First Slab</Button>
                        )}
                    </div>
                ) : (
                    slabs.map((slab) => (
                        <ElevatedMetallicCard
                            key={slab.id}
                            title={slab.slab_name}
                            bodyClassName="p-6"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-2xl font-bold text-white tracking-tight">${slab.min_price} - ${slab.max_price}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-white">{slab.freelancer_percentage ?? slab.percentage}%</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Freelancer Cut</p>
                                    </div>

                                    <div className="border-l border-surface-border pl-6">
                                        <KebabMenu
                                            options={[
                                                { label: 'Edit', icon: <IconEdit className="w-4 h-4" />, onClick: () => handleEditSlab(slab) },
                                                { label: 'Delete', icon: <IconTrash className="w-4 h-4" />, variant: 'danger', onClick: () => handleDeleteSlab(slab) }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        </ElevatedMetallicCard>
                    ))
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={isEditMode ? "Edit Pricing Slab" : "Create Pricing Slab"}
                size="md"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="metallic" onClick={handleSaveSlab} isLoading={submitting}>{isEditMode ? "Update Slab" : "Save Slab"}</Button>
                    </div>
                )}
            >
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input
                                variant="metallic"
                                label="Slab Name"
                                placeholder="Basic Tier"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <Input
                            variant="metallic"
                            label="Minimum Price"
                            placeholder="0"
                            type="number"
                            value={formData.minPrice}
                            onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                        />
                        <Input
                            variant="metallic"
                            label="Maximum Price"
                            placeholder="500"
                            type="number"
                            value={formData.maxPrice}
                            onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                        />
                        <div className="md:col-span-2">
                            <Input
                                variant="metallic"
                                label="Freelancer Percentage (%)"
                                placeholder="20"
                                type="number"
                                value={formData.freelancerPercentage}
                                onChange={(e) => setFormData({ ...formData, freelancerPercentage: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest px-1">Calculation Preview</h5>

                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Min Price Preview */}
                            <div className="flex-1 p-5 rounded-2xl bg-surface-overlay border border-surface-border space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-xs font-bold text-gray-400">At Min Price</span>
                                    <span className="text-lg font-bold text-white">${formData.minPrice || '0'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Platform Cut (20%)</span>
                                        <span className="text-gray-300 font-medium">-${minPreview.platformCut}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-500">Remaining</span>
                                        <span className="text-brand-primary font-bold">${minPreview.remaining}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1">
                                        <span className="text-gray-400">Freelancer ({formData.freelancerPercentage || '0'}%)</span>
                                        <span className="text-white font-bold">${minPreview.freelancer}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Company Profit</span>
                                        <span className="text-brand-success font-bold">${minPreview.company}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Max Price Preview */}
                            <div className="flex-1 p-5 rounded-2xl bg-surface-overlay border border-surface-border space-y-4">
                                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                    <span className="text-xs font-bold text-gray-400">At Max Price</span>
                                    <span className="text-lg font-bold text-white">${formData.maxPrice || '0'}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Platform Cut (20%)</span>
                                        <span className="text-gray-300 font-medium">-${maxPreview.platformCut}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                                        <span className="text-gray-500">Remaining</span>
                                        <span className="text-brand-primary font-bold">${maxPreview.remaining}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1">
                                        <span className="text-gray-400">Freelancer ({formData.freelancerPercentage || '0'}%)</span>
                                        <span className="text-white font-bold">${maxPreview.freelancer}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Company Profit</span>
                                        <span className="text-brand-success font-bold">${maxPreview.company}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Confirmation Modal for Delete Slab */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Slab Deletion"
                size="sm"
                isElevatedFooter={true}
                footer={(
                    <div className="flex justify-end gap-3">
                        <Button variant="recessed" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="metallic-error"
                            onClick={handleConfirmDeleteSlab}
                            isLoading={submitting}
                        >
                            Delete Slab
                        </Button>
                    </div>
                )}
            >
                <div className="py-2">
                    <p className="text-gray-300">Are you sure you want to delete the pricing slab <span className="font-bold text-white">{selectedSlab?.slab_name}</span>?</p>
                    <p className="text-sm text-gray-500 mt-2">This action is permanent and may affect revenue calculations.</p>
                </div>
            </Modal>
        </div>
    );
};

const CompanyEarnings: React.FC = () => {
    const { accounts, loading: accountsLoading } = useAccounts();
    const { profile, effectiveRole } = useUser();
    const [selectedAccount, setSelectedAccount] = useState<string[]>(['all']);

    const handleAccountChange = (ids: string | string[]) => {
        let nextIds = Array.isArray(ids) ? ids : [ids];
        if (nextIds.length > 1) {
            const hasAll = nextIds.includes('all');
            const wasAll = selectedAccount.includes('all');
            if (hasAll && !wasAll) nextIds = ['all'];
            else if (hasAll && wasAll) nextIds = nextIds.filter(id => id !== 'all');
        }
        if (nextIds.length === 0) nextIds = ['all'];
        setSelectedAccount(nextIds);
    };
    const [showSettings, setShowSettings] = useState(false);

    // Filter toolbar states
    const [fromDate, setFromDate] = useState<Date | null>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    });
    const [toDate, setToDate] = useState<Date | null>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    });
    const [activeFilter, setActiveFilter] = useState<string | null>('month');
    const [platformCommissions, setPlatformCommissions] = useState<any[]>([]);
    const [pricingSlabs, setPricingSlabs] = useState<any[]>([]);
    const [sellerCommissions, setSellerCommissions] = useState<any[]>([]);
    const [commissionsLoading, setCommissionsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [projectsData, setProjectsData] = useState<any[]>([]);
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'all' | 'pipeline' | 'secured' | 'cancelled'>('pipeline');
    const [cancellationReasonModal, setCancellationReasonModal] = useState({ isOpen: false, text: '' });
    const [errorLog, setErrorLog] = useState<string | null>(null);

    useEffect(() => {
        // Only run if user data is ready
        if (!effectiveRole || !profile?.id || accountsLoading) return;

        const loadInitialData = async () => {
            try {
                setLoading(true);
                const loadedCommissions = await fetchPlatformCommissions();
                const loadedSlabs = await fetchPricingSlabs();
                const loadedSellers = await fetchSellerCommissions();
                await fetchProjects(true, loadedCommissions, accounts, loadedSlabs, loadedSellers);
            } catch (err) {
                console.error("Error loading initial company earnings data:", err);
                setLoading(false);
            }
        };
        loadInitialData();


        // Add real-time subscription to projects table
        const channel = supabase
            .channel('company_projects_changes')
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'projects' },
                () => {
                    fetchProjects();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [accountsLoading, effectiveRole, profile?.id]);



    const fetchProjects = async (isInitial = false, passedCommissions?: any[], passedAccounts?: any[], passedSlabs?: any[], passedSellers?: any[]) => {
        try {
            if (isInitial) setLoading(true);
            const isSuperAdmin = effectiveRole === 'Super Admin';

            const userRole = effectiveRole?.toLowerCase().trim();

            let query = supabase
                .from('projects')
                .select('id, project_id, project_title, status, created_at, clearance_start_date, price, tip_amount, designer_fee, account_id, account, converted_by, order_type, cancellation_reason, client_name, updated_at, accounts(prefix), assignee')
                .neq('status', 'Removed');

            // Apply account scoping for non-Super Admins
            const isAdminLike = ['admin', 'project manager', 'project operations manager'].includes(userRole || '');
            if (isAdminLike && !isSuperAdmin) {
                const { data: permittedAccounts } = await supabase
                    .from('user_account_access')
                    .select('account_id')
                    .eq('user_id', profile?.id);

                if (permittedAccounts && permittedAccounts.length > 0) {
                    const accountIds = permittedAccounts.map(pa => pa.account_id);
                    query = query.in('account_id', accountIds);
                } else {
                    setProjectsData([]);
                    return;
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setErrorLog(null);
            if (data) {
                const enriched = data.map(p => {
                    const price = Number(p.price || 0);
                    const tipAmount = Number(p.tip_amount || 0);

                    // REVENUE MODEL: Integrated Platform Commissions + DB Trigger Logic
                    let accountId = p.account_id;

                    const activeAccounts = passedAccounts || accounts;
                    const activeCommissions = passedCommissions || platformCommissions;
                    const activeSellers = passedSellers || sellerCommissions;

                    // Fallback: If account_id is missing in data, find it by name/prefix from the accounts state
                    if (!accountId && p.account) {
                        const matchedAcc = activeAccounts.find(a => a.name === p.account || a.prefix === p.account);
                        if (matchedAcc) accountId = matchedAcc.id;
                    }

                    const commission = activeCommissions.find(pc => pc.assigned_account_ids?.includes(accountId));
                    const commissionFactor = commission ? (Number(commission.commission_percentage) > 1 ? Number(commission.commission_percentage) / 100 : Number(commission.commission_percentage)) : 0;

                    const platformCut = price * commissionFactor;

                    // Fixed Salary Model: Designers do not get project cuts
                    const freelancerCut = 0;

                    // Seller Commission Cut is also 0 as part of layout cleanup (Gross Sale - Platform Fee)
                    const sellerCut = 0;

                    // Company earning is the remainder (Gross Sale - Platform Fee)
                    const companyEarning = price - platformCut;

                    const prefix = (p as any).accounts?.prefix || 'Unassigned Account';

                    // FIX: Avoid prefix duplication and handle unassigned state
                    let formattedId = p.project_id || '';
                    if (prefix !== 'Unassigned Account' && formattedId && !formattedId.startsWith(prefix)) {
                        formattedId = `${prefix} ${formattedId}`;
                    }

                    return {
                        ...p,
                        company_earning: companyEarning,
                        platform_cut: platformCut,
                        freelancer_cut: freelancerCut,
                        seller_cut: sellerCut,
                        account_prefix: prefix,
                        formatted_project_id: formattedId,
                        client: p.client_name || 'General Client',
                        created_at_formatted: p.created_at ? systemFormatDate(new Date(p.created_at)) : 'N/A',
                        approved_on_formatted: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                        cancelled_at_formatted: p.updated_at ? systemFormatDate(new Date(p.updated_at)) : 'N/A',
                        date: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                        rawDate: p.clearance_start_date,
                        created_date: p.created_at ? systemFormatDate(new Date(p.created_at)) : 'N/A',
                        assignee: (p as any).assignee || 'Unassigned'
                    };
                });

                setProjectsData(enriched);
            }
        } catch (err: any) {
            console.error('Error fetching company projects:', err);
            setErrorLog(err?.message || String(err));
        } finally {
            if (isInitial) setLoading(false);
        }
    };


    // ── Derived state via useMemo (no intermediate renders = no flicker) ──────
    const derived = useMemo(() => {
        let filtered = [...projectsData];

        // 1. Date Filter (bypassed if search query is active)
        const isSearching = searchQuery.trim() !== '';
        if (!isSearching && (fromDate || toDate)) {
            filtered = filtered.filter(p => {
                const date = new Date(p.created_at);
                if (fromDate && date < fromDate) return false;
                if (toDate && date > toDate) return false;
                return true;
            });
        }

        // 2. Account Filter
        if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
            filtered = filtered.filter(p => selectedAccount.includes(p.account_id));
        }

        // 3. Search Filter (by project ID or project title)
        if (isSearching) {
            const queryLower = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p => {
                const pId = String(p.project_id || '').toLowerCase();
                const formattedId = String(p.formatted_project_id || '').toLowerCase();
                const pTitle = String(p.project_title || '').toLowerCase();
                return pId.includes(queryLower) || formattedId.includes(queryLower) || pTitle.includes(queryLower);
            });
        }

        // Stats (before summary filter)
        const pipelineItems = filtered.filter(p =>
            p.status !== 'Completed' &&
            p.status !== 'Approved' &&
            p.status !== 'Removed' &&
            p.status !== 'Cancelled'
        );
        const securedItems = filtered.filter(p => p.status === 'Completed' || p.status === 'Approved');
        const cancelledItems = filtered.filter(p => p.status === 'Cancelled');

        const pipelineRevenue = pipelineItems.reduce((sum, p) => sum + p.company_earning, 0);
        const securedRevenue = securedItems.reduce((sum, p) => sum + p.company_earning, 0);
        const cancelledRevenue = cancelledItems.reduce((sum, p) => sum + p.company_earning, 0);

        const salesItems = [...pipelineItems, ...securedItems];
        const salesRevenue = salesItems.reduce((sum, p) => sum + Number(p.price || 0), 0);

        const pipelineCount = pipelineItems.length;
        const securedCount = securedItems.length;
        const cancelledCount = cancelledItems.length;
        const salesCount = salesItems.length;

        // 4. Summary Filter (table view)
        if (activeSummaryFilter === 'pipeline') {
            filtered = [...pipelineItems];
        } else if (activeSummaryFilter === 'secured') {
            filtered = [...securedItems];
        } else if (activeSummaryFilter === 'cancelled') {
            filtered = [...cancelledItems];
        } else if (activeSummaryFilter === 'all') {
            filtered = [...salesItems];
        }

        return { filteredProjects: filtered, pipelineRevenue, securedRevenue, cancelledRevenue, salesRevenue, pipelineCount, securedCount, cancelledCount, salesCount };
    }, [projectsData, fromDate, toDate, selectedAccount, activeSummaryFilter, searchQuery]);

    const { filteredProjects, pipelineRevenue, securedRevenue, cancelledRevenue, salesRevenue, pipelineCount, securedCount, cancelledCount, salesCount } = derived;

    const fetchAccounts = async () => {
        // Redundant - now using useAccounts() from AccountContext which handles scoping
        return accounts;
    };

    const fetchPlatformCommissions = async () => {
        setCommissionsLoading(true);
        const { data, error } = await supabase
            .from('platform_commissions')
            .select(`
                *,
                platform_commission_accounts (
                    account_id
                )
            `);

        if (!error && data) {
            const mapped = data.map(item => ({
                ...item,
                assigned_account_ids: item.platform_commission_accounts?.map((r: any) => r.account_id) || []
            }));
            setPlatformCommissions(mapped);
            setCommissionsLoading(false);
            return mapped;
        }
        setCommissionsLoading(false);
        return [];
    };

    const fetchPricingSlabs = async () => {
        const { data, error } = await supabase
            .from('pricing_slabs')
            .select('*')
            .order('min_price', { ascending: true });

        if (!error && data) {
            setPricingSlabs(data);
            return data;
        }
        return [];
    };

    const fetchSellerCommissions = async () => {
        const { data, error } = await supabase
            .from('seller_commissions')
            .select(`
                id,
                seller_id,
                commission_percentage,
                clearance_days,
                seller_commission_accounts (
                    account_id
                )
            `);

        if (!error && data) {
            const mapped = data.map(item => ({
                ...item,
                assigned_account_ids: item.seller_commission_accounts?.map((r: any) => r.account_id) || []
            }));
            setSellerCommissions(mapped);
            return mapped;
        }
        return [];
    };

    const handleQuickFilter = (type: string) => {
        const now = new Date();

        // Toggle Off Logic: If already active, clear date filters
        if (activeFilter === type) {
            setFromDate(null);
            setToDate(null);
            setActiveFilter(null);
            return;
        }

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        let start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (type === 'today') {
            // Already set to start of today
        } else if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end.setTime(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime());
        }

        setFromDate(start);
        setToDate(end);
        setActiveFilter(type);
    };

    const handleExportCSV = () => {
        if (filteredProjects.length === 0) return;

        const isPipeline = activeSummaryFilter === 'pipeline';
        const isSecured = activeSummaryFilter === 'secured';
        const isCancelled = activeSummaryFilter === 'cancelled';

        const headers = [
            'Project ID',
            'Account',
            'Project Title',
            'Status',
            'Order Type',
            'Converted By',
            'Client',
            'Assignee',
            'Price',
            'Platform Commission',
            'Freelancer Cut',
            'Seller Commission',
            'Company Earnings',
            ...(isPipeline ? [] : ['Tips']),
            'Created At',
            ...(isSecured ? ['Approved On'] : []),
            ...(isCancelled ? ['Cancelled On', 'Cancellation Reason'] : [])
        ];
        const csvRows = [headers.join(',')];

        filteredProjects.forEach(p => {
            const row = [
                `"${p.formatted_project_id}"`,
                `"${p.account_prefix}"`,
                `"${(p.project_title || 'Untitled Project').replace(/"/g, '""')}"`,
                `"${p.status}"`,
                `"${p.order_type || 'Direct Order'}"`,
                `"${p.converted_by || '-'}"`,
                `"${p.client}"`,
                `"${(p.assignee || 'Unassigned').replace(/"/g, '""')}"`,
                `"${(p.price || 0).toFixed(2)}"`,
                `"${(p.platform_cut || 0).toFixed(2)}"`,
                `"${(p.freelancer_cut || 0).toFixed(2)}"`,
                `"${(p.seller_cut || 0).toFixed(2)}"`,
                `"${(p.company_earning || 0).toFixed(2)}"`,
                ...(isPipeline ? [] : [`"${(p.tip_amount || 0).toFixed(2)}"`]),
                `"${p.created_at_formatted || 'N/A'}"`,
                ...(isSecured ? [`"${p.approved_on_formatted || 'N/A'}"`] : []),
                ...(isCancelled ? [`"${p.cancelled_at_formatted || 'N/A'}"`, `"${(p.cancellation_reason || '-').replace(/"/g, '""')}"`] : [])
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${activeSummaryFilter}_earnings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (date: Date | null) => {
        return systemFormatDate(date);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider px-2">Earnings Breakdown</h3>
            </div>
            {/* Toolbar Container */}
            <Card
                isElevated={true}
                disableHover={true}
                className="h-full flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova"
                bodyClassName="flex-1 h-full py-0 px-0 overflow-visible"
            >
                {/* Full Surface Metallic Shine */}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="p-3 relative z-10 w-full h-full">
                    <div className="w-full h-full flex flex-col xl:flex-row items-center justify-between gap-4 py-1 px-2">
                        {/* Left Side: Date Pickers & Account */}
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                            <DatePicker
                                placeholder="From"
                                value={fromDate}
                                onChange={(date) => {
                                    setFromDate(date);
                                    setActiveFilter(null);
                                }}
                            >
                                <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                    {/* Inner Top Shadow for carved-in look */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                    <span className="min-w-[100px] whitespace-nowrap text-center relative z-10">{systemFormatDate(fromDate) || 'From Date'}</span>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {fromDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFromDate(null);
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>
                            <DatePicker
                                placeholder="To"
                                value={toDate}
                                onChange={(date) => {
                                    setToDate(date);
                                    setActiveFilter(null);
                                }}
                            >
                                <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                    {/* Inner Top Shadow for carved-in look */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                    <span className="min-w-[100px] whitespace-nowrap text-center relative z-10">{systemFormatDate(toDate) || 'To Date'}</span>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {toDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setToDate(null);
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>

                            <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                            <div className="w-44">
                                <Dropdown
                                    value={selectedAccount}
                                    onChange={handleAccountChange}
                                    options={[{ label: 'All Accounts', value: 'all' }, ...(accounts || []).map(a => ({
                                        label: a.name,
                                        description: a.prefix?.toUpperCase(),
                                        value: a.id
                                    }))]}
                                    placeholder="All Accounts"
                                    showSearch={true}
                                    isMulti={true}
                                    menuClassName="!w-[340px]"
                                >
                                    <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                        {/* Inner Top Shadow for carved-in look */}
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                        {/* Subtle Diagonal Machined Sheen */}
                                        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                        <span className="truncate relative z-10">
                                            {selectedAccount.includes('all') ? 'All Accounts' :
                                                selectedAccount.length === 1 ? (accounts.find(acc => acc.id === selectedAccount[0])?.prefix || 'Account') :
                                                    `${selectedAccount.length} Accounts`}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 w-full xl:w-auto justify-end overflow-visible">
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'This Week' },
                                { id: 'month', label: 'This Month' }
                            ].map((filter) => (
                                <div
                                    key={filter.id}
                                    onClick={() => handleQuickFilter(filter.id as any)}
                                    className={`relative flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden min-w-[90px] ${activeFilter === filter.id
                                        ? 'border-brand-primary/40 bg-brand-primary/5'
                                        : 'hover:bg-black/50 hover:border-white/10'
                                        }`}
                                >
                                    {/* Inner Top Shadow for carved-in look */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <span className={`relative z-10 transition-colors ${activeFilter === filter.id ? 'text-brand-primary' : 'text-gray-400 group-hover:text-white'
                                        }`}>
                                        {filter.label}
                                    </span>
                                </div>
                            ))}
                            <Button
                                variant="metallic"
                                size="sm"
                                leftIcon={<IconChartBar className="w-4 h-4 block" />}
                                className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                                onClick={handleExportCSV}
                            >
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Gross Sales */}
                <Card
                    isElevated={true}
                    disableHover={activeSummaryFilter === 'all'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'all'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveSummaryFilter('all')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'all' ? 'text-white/80' : 'text-gray-400'}`}>Gross Sales</p>
                                <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'all' ? 'text-white' : 'text-white/90'}`}>${salesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeSummaryFilter === 'all' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10'}>
                                        {salesCount} Projects
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'all' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Gross Volume</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'all'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconDollar className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Pipeline Revenue */}
                <Card
                    isElevated={true}
                    disableHover={activeSummaryFilter === 'pipeline'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'pipeline'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveSummaryFilter('pipeline')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'pipeline' ? 'text-white/80' : 'text-gray-400'}`}>Pipeline Revenue</p>
                                <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'pipeline' ? 'text-white' : 'text-brand-warning'}`}>${pipelineRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeSummaryFilter === 'pipeline' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('in progress')}>
                                        {pipelineCount} Projects
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'pipeline' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>In Pipeline</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'pipeline'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconClock className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Secured Revenue */}
                <Card
                    isElevated={true}
                    disableHover={activeSummaryFilter === 'secured'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'secured'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveSummaryFilter('secured')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'secured' ? 'text-white/80' : 'text-gray-400'}`}>Secured Revenue</p>
                                <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'secured' ? 'text-white' : 'text-brand-success'}`}>${securedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeSummaryFilter === 'secured' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('approved')}>
                                        {securedCount} Projects
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'secured' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Revenue Approved</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'secured'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconCheckCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Cancelled Projects */}
                <Card
                    isElevated={true}
                    disableHover={activeSummaryFilter === 'cancelled'}
                    className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'cancelled'
                        ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                        : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                        }`}
                    bodyClassName="h-full"
                    onClick={() => setActiveSummaryFilter('cancelled')}
                >
                    {/* Full Surface Metallic Shine */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-5 relative z-10 w-full">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'cancelled' ? 'text-white/80' : 'text-gray-400'}`}>Cancelled Revenue</p>
                                <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'cancelled' ? 'text-white' : 'text-brand-error'}`}>${cancelledRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={activeSummaryFilter === 'cancelled' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('error')}>
                                        {cancelledCount} Projects
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'cancelled' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Revenue Cancelled</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'cancelled'
                                ? 'bg-white/20 border-white/30 text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                }`}>
                                <IconXCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-md mt-6 mb-2">
                <Input
                    variant="metallic"
                    placeholder="Search by Project ID or Project Title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<IconSearch className="w-4 h-4 text-gray-400" />}
                    className="w-full"
                />
            </div>

            <div className="space-y-4 w-full overflow-hidden">
                <Table
                    columns={[


                        {
                            header: 'Project ID',
                            key: 'formatted_project_id',
                            className: 'text-center',
                            render: (item: any) => (
                                <span className="font-semibold text-white/90">{item.formatted_project_id}</span>
                            )
                        },
                        {
                            header: 'Account',
                            key: 'account_prefix',
                            className: 'text-gray-400 font-bold uppercase tracking-wider text-center'
                        },
                        {
                            header: 'Project Title',
                            key: 'project_title',
                            render: (item: any) => (
                                <span className="font-bold text-white uppercase tracking-tight">{item.project_title || 'Untitled Project'}</span>
                            )
                        },
                        {
                            header: 'Status',
                            key: 'status',
                            className: 'text-center',
                            render: (p: any) => {
                                const status = p.status || 'In Progress';
                                return (
                                    <div className="flex justify-center">
                                        <span className={getStatusCapsuleClasses(status)}>
                                            {status}
                                        </span>
                                    </div>
                                );
                            }
                        },
                        {
                            header: 'Order Type',
                            key: 'order_type',
                            className: 'text-center',
                            render: (item: any) => (
                                <div className="flex flex-col items-center justify-center">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${item.order_type === 'Query' ? 'text-brand-primary' : 'text-gray-400'}`}>
                                        {item.order_type || 'Direct Order'}
                                    </span>
                                    {item.order_type === 'Query' && item.converted_by && (
                                        <span className="text-[10px] text-gray-500 font-medium truncate">By {item.converted_by}</span>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: 'Client',
                            key: 'client',
                            className: 'text-center text-gray-400'
                        },
                        {
                            header: 'Assignee',
                            key: 'assignee',
                            className: 'text-center text-gray-400',
                            render: (item: any) => (
                                <span className="font-semibold text-white/90">{item.assignee || 'Unassigned'}</span>
                            )
                        },
                        {
                            header: 'Price',
                            key: 'price',
                            className: 'text-center',
                            render: (item: any) => (
                                <span className="text-white font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price || 0)}</span>
                            )
                        },
                        {
                            header: (
                                <Tooltip content="Platform Commission">
                                    <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                        PC
                                    </span>
                                </Tooltip>
                            ),
                            key: 'platform_cut',
                            className: 'text-gray-400 text-center',
                            render: (item: any) => (
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.platform_cut || 0)}</span>
                            )
                        },
                        {
                            header: (
                                <Tooltip content="Freelancer Cut">
                                    <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                        FC
                                    </span>
                                </Tooltip>
                            ),
                            key: 'freelancer_cut',
                            className: 'text-gray-400 text-center',
                            render: (item: any) => (
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.freelancer_cut || 0)}</span>
                            )
                        },
                        {
                            header: (
                                <Tooltip content="Seller Commission">
                                    <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                        SC
                                    </span>
                                </Tooltip>
                            ),
                            key: 'seller_cut',
                            className: 'text-gray-400 text-center',
                            render: (item: any) => (
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.seller_cut || 0)}</span>
                            )
                        },
                        {
                            header: (
                                <Tooltip content="Company Earnings">
                                    <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                        CE
                                    </span>
                                </Tooltip>
                            ),
                            key: 'company_earning',
                            className: 'text-center',
                            render: (item: any) => (
                                <span className="text-brand-success font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.company_earning || 0)}</span>
                            )
                        },
                        ...(activeSummaryFilter !== 'pipeline' ? [{
                            header: 'Tips',
                            key: 'tip_amount',
                            className: 'text-gray-400 text-center',
                            render: (item: any) => (
                                <span className={item.tip_amount ? 'text-brand-success font-medium' : ''}>
                                    {item.tip_amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.tip_amount) : '-'}
                                </span>
                            )
                        }] : []),
                        {
                            header: 'Created At',
                            key: 'created_at_formatted',
                            className: 'text-center',
                            render: (item: any) => (
                                <span className="text-gray-400">{item.created_at_formatted}</span>
                            )
                        },
                        ...(activeSummaryFilter === 'secured' ? [{
                            header: 'Approved On',
                            key: 'approved_on_formatted',
                            className: 'text-center',
                            render: (item: any) => (
                                <span className="text-gray-400">{item.approved_on_formatted}</span>
                            )
                        }] : []),
                        ...(activeSummaryFilter === 'cancelled' ? [{
                            header: 'Cancelled On',
                            key: 'cancelled_at_formatted',
                            className: 'text-center',
                            render: (item: any) => (
                                <span className="text-gray-400">{item.cancelled_at_formatted}</span>
                            )
                        }] : []),
                        ...(activeSummaryFilter === 'cancelled' ? [{
                            header: 'Cancellation Reason',
                            key: 'cancellation_reason',
                            className: 'max-w-[200px] text-center',
                            render: (p: any) => (
                                <div className="flex items-center justify-center gap-2 group/reason">
                                    <span className="text-gray-400 truncate block text-xs flex-1" title={p.cancellation_reason}>
                                        {p.cancellation_reason || '-'}
                                    </span>
                                    {p.cancellation_reason && p.cancellation_reason !== '-' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCancellationReasonModal({ isOpen: true, text: p.cancellation_reason! });
                                            }}
                                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-brand-error/10 border border-brand-error/20 text-brand-error hover:bg-brand-error/20 transition-all ml-2 shrink-0 group-hover/btn:scale-105"
                                            title="View Full Reason"
                                        >
                                            <IconChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            )
                        }] : [])
                    ]}
                    data={filteredProjects}
                    isLoading={loading}
                    isMetallicHeader={true}
                    dense={true}
                />
            </div>

            {/* Cancellation Reason Modal */}
            <Modal
                isOpen={cancellationReasonModal.isOpen}
                onClose={() => setCancellationReasonModal({ isOpen: false, text: '' })}
                title="Cancellation Reason"
            >
                <div className="p-6">
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                        {cancellationReasonModal.text || 'No reason provided.'}
                    </p>
                </div>
            </Modal>
        </div>
    );
};

const FreelancerEarnings: React.FC = () => {
    const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
    const [selectedTeamLead, setSelectedTeamLead] = useState<string>('');
    const [selectedTeamDesigner, setSelectedTeamDesigner] = useState<string>('');
    const [freelancers, setFreelancers] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [earningsData, setEarningsData] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [releaseLogs, setReleaseLogs] = useState<any[]>([]);
    const [selectedReleaseLog, setSelectedReleaseLog] = useState<any | null>(null);
    const [showReleaseDetails, setShowReleaseDetails] = useState(false);
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [isReleaseSuccess, setIsReleaseSuccess] = useState(false);
    const [isReleasing, setIsReleasing] = useState(false);
    const [releaseFormData, setReleaseFormData] = useState({
        paymentMethod: 'Bank Transfer',
        notes: ''
    });
    const { accounts } = useAccounts();
    const { profile, effectiveRole } = useUser();
    const isAdmin = effectiveRole === 'Admin' || effectiveRole === 'Super Admin';

    // Filter States
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string[]>(['all']);

    const handleAccountChange = (ids: string | string[]) => {
        let nextIds = Array.isArray(ids) ? ids : [ids];
        if (nextIds.length > 1) {
            const hasAll = nextIds.includes('all');
            const wasAll = selectedAccount.includes('all');
            if (hasAll && !wasAll) nextIds = ['all'];
            else if (hasAll && wasAll) nextIds = nextIds.filter(id => id !== 'all');
        }
        if (nextIds.length === 0) nextIds = ['all'];
        setSelectedAccount(nextIds);
    };
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'lifetime' | 'pending' | 'available'>('lifetime');
    const [activeSubTab, setActiveSubTab] = useState<'available' | 'history'>('available');

    useEffect(() => {
        if (!effectiveRole || !profile?.id) return;
        fetchFreelancers();
    }, [effectiveRole, profile?.id]);

    useEffect(() => {
        if (selectedFreelancer) {
            fetchEarnings(selectedFreelancer, true);
            fetchReleaseLogs(selectedFreelancer, true);
        } else {
            setEarningsData([]);
            setReleaseLogs([]);
        }
    }, [selectedFreelancer]);

    // Auto-refresh earnings every hour to keep days_left current
    useEffect(() => {
        if (!selectedFreelancer) return;

        const refreshInterval = setInterval(() => {
            fetchEarnings(selectedFreelancer);
        }, 3600000); // Refresh every hour

        return () => clearInterval(refreshInterval);
    }, [selectedFreelancer]);

    useEffect(() => {
        applyFilters();
    }, [earningsData, dateFrom, dateTo, selectedAccount, activeSummaryFilter]);

    const applyFilters = () => {
        let filtered = [...earningsData];

        if (dateFrom || dateTo) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.rawDate);
                itemDate.setHours(0, 0, 0, 0);
                if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (itemDate < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (itemDate > to) return false;
                }
                return true;
            });
        }

        if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
            filtered = filtered.filter(item => {
                const accMatched = selectedAccount.includes(item.accountId);
                const prefixMatched = selectedAccount.some(accId => {
                    const acc = accounts.find(a => a.id === accId);
                    return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                });
                return accMatched || prefixMatched;
            });
        }

        // Summary Statistics Filtering
        if (activeSummaryFilter === 'lifetime') {
            filtered = filtered.filter(item => item.funds_status === 'Paid');
        } else if (activeSummaryFilter === 'pending') {
            filtered = filtered.filter(item => item.funds_status === 'Pending');
        } else if (activeSummaryFilter === 'available') {
            filtered = filtered.filter(item => item.funds_status === 'Cleared');
        }

        setFilteredData(filtered);
    };

    const handleQuickFilter = (type: 'today' | 'week' | 'month') => {
        const now = new Date();

        // Toggle off if already active
        if (activeFilter === type) {
            setDateFrom(null);
            setDateTo(null);
            setActiveFilter(null);
            return;
        }

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        let start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (type === 'today') {
            // Start is already today 00:00
        } else if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end.setTime(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime());
        }

        setDateFrom(start);
        setDateTo(end);
        setActiveFilter(type);
    };

    const handleReleaseAmount = async () => {
        if (!selectedFreelancer || isReleasing) return;

        try {
            setIsReleasing(true);

            // 1. Get all cleared projects for this freelancer THAT MATCH CURRENT FILTERS
            // filteredData already contains items that match filters and status 'Cleared' if activeSummaryFilter is 'available'
            // But to be bulletproof regardless of active tab, we re-filter based on current state
            const autoClearedFilter = earningsData.filter(item => {
                if (item.funds_status !== 'Cleared') return false;
                
                // Date Filtering
                const itemDate = new Date(item.rawDate);
                itemDate.setHours(0, 0, 0, 0);
                if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (itemDate < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (itemDate > to) return false;
                }

                // Account Filtering
                if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
                    const accMatched = selectedAccount.includes(item.accountId);
                    const prefixMatched = selectedAccount.some(accId => {
                        const acc = accounts?.find(a => a.id === accId);
                        return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                    });
                    if (!accMatched && !prefixMatched) return false;
                }
                return true;
            });

            const totalAmount = autoClearedFilter.reduce((sum, item) => sum + (item.rawAmount || 0), 0);

            if (totalAmount <= 0) {
                addToast({ title: 'No cleared funds to release', type: 'error' });
                return;
            }

            // 2. Update all these projects to 'Paid' status
            const projectIds = autoClearedFilter.map(item => item.id);
            const { error: updateError } = await supabase
                .from('projects')
                .update({ funds_status: 'Paid' })
                .in('project_id', projectIds);

            if (updateError) throw updateError;

            // 3. Create release log entry
            // We'll create one log entry for the total batch
            const freelancer = freelancers?.find(f => f.email === selectedFreelancer);
            const { error: logError } = await supabase
                .from('payment_releases')
                .insert({
                    project_id: projectIds.join(', '), // Storing CSV of IDs for reference
                    freelancer_email: selectedFreelancer,
                    freelancer_name: freelancer?.name || selectedFreelancer,
                    amount: totalAmount,
                    payment_method: releaseFormData.paymentMethod,
                    transaction_reference: '',
                    notes: '',
                    released_by: profile?.id,
                    released_by_name: profile?.name || 'Admin'
                });

            if (logError) throw logError;


            // 4. Refresh data
            await fetchEarnings(selectedFreelancer);
            await fetchReleaseLogs(selectedFreelancer);

            // 5. Success state
            setIsReleaseSuccess(true);
            setReleaseFormData({
                paymentMethod: 'Bank Transfer',
                notes: ''
            });

        } catch (err: any) {
            console.error('Error releasing payment:', err);
            addToast({ title: err.message || 'Failed to release payment', type: 'error' });
        } finally {
            setIsReleasing(false);
        }
    };

    const handleViewReleaseDetails = (releaseLog: any) => {
        const projectIds = (releaseLog.project_id || '').split(',').map((id: string) => id.trim());
        // Find projects that were part of this release from earningsData 
        // Note: earningsData contains all projects for the freelancer
        const releaseProjects = earningsData.filter(p => projectIds.includes(p.id));
        setSelectedReleaseLog({ ...releaseLog, projects: releaseProjects });
        setShowReleaseDetails(true);
    };

    const handleExportCSV = () => {
        if (filteredData.length === 0) return;

        const statusHeader = activeSummaryFilter === 'pending' ? 'Days Left' : 'Funds Status';

        const headers = [
            'Approved On',
            'Project ID',
            'Account',
            'Project Title',
            'Client',
            statusHeader,
            'Payout'
        ];

        const csvRows = [headers.join(',')];

        filteredData.forEach(item => {
            const acc = accounts?.find(a => a.id === item.accountId);
            const accountPrefix = acc?.prefix?.toUpperCase() || 'N/A';

            const statusValue = activeSummaryFilter === 'pending'
                ? `${item.daysLeft || 0} Days`
                : (activeSummaryFilter === 'available' ? 'Unpaid' : item.funds_status);

            const cleanPayout = item.amount ? item.amount.replace(/[$,]/g, '') : '0.00';

            const row = [
                `"${item.date || 'N/A'}"`,
                `"${item.id || 'N/A'}"`,
                `"${accountPrefix}"`,
                `"${(item.project || 'Untitled Project').replace(/"/g, '""')}"`,
                `"${(item.client || 'Personal').replace(/"/g, '""')}"`,
                `"${statusValue}"`,
                `"${cleanPayout}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `freelancer_earnings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchReleaseLogs = async (email: string, isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_releases')
                .select('*')
                .eq('freelancer_email', email)
                .order('release_date', { ascending: false });

            if (!error && data) {
                setReleaseLogs(data);
            }
        } catch (err) {
            console.error('Error fetching release logs:', err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const fetchFreelancers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, role, bank_name, account_title, iban, payment_email')
                .in('role', ['Freelancer', 'Team Lead', 'Team Designer'])
                .order('name', { ascending: true });

            if (!error && data) {
                setFreelancers(data);
            }
        } catch (err) {
            console.error('Error in fetchFreelancers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEarnings = async (email: string, isInitial = false) => {
        try {
            if (isInitial) setLoading(true);

            // First, trigger auto-update of expired pending projects
            try {
                await supabase.rpc('auto_update_funds_status');
            } catch (rpcError) {
                console.warn('Auto-update function not available:', rpcError);
            }

            // Find the freelancer's name from their email
            const freelancer = freelancers?.find(f => f.email === email);
            const freelancerName = freelancer?.name || email;

            const isSuperAdmin = effectiveRole === 'Super Admin';
            const userRole = effectiveRole?.toLowerCase().trim();

            // Find subject user to determine filtering logic
            const subjectUser = freelancers?.find(f => f.email === email);

            let query = supabase
                .from('projects')
                .select('project_id, project_title, client_name, price, designer_fee, team_payout, team_designer_fee, updated_at, created_at, account_id, funds_status, clearance_start_date, clearance_days, status, assignee, team_designer_id, assignee_id');

            // Determine filter based on subject's role
            if (subjectUser?.role === 'Team Designer') {
                query = query.eq('team_designer_id', subjectUser.id);
            } else {
                // For Freelancers and Team Leads (who act as main assignees)
                // Use assignee_id if available to avoid ghost projects from name-based mismatches
                const idFilter = subjectUser?.id ? `assignee_id.eq.${subjectUser.id}` : '';
                const nameFilter = `assignee.eq."${freelancerName}"`;
                
                if (idFilter) {
                    // Logic: Match if (ID matches) OR (ID is null AND Name matches)
                    // This covers both modern ID-synced projects and legacy name-only projects
                    query = query.or(`${idFilter},and(${nameFilter},assignee_id.is.null)`);
                } else {
                    query = query.eq('assignee', freelancerName);
                }
            }

            query = query.eq('status', 'Approved');

            // Apply account scoping for non-Super Admins
            const isAdminLike = ['admin', 'project manager', 'project operations manager'].includes(userRole || '');
            if (isAdminLike && !isSuperAdmin) {
                const { data: permittedAccounts } = await supabase
                    .from('user_account_access')
                    .select('account_id')
                    .eq('user_id', profile?.id);

                if (permittedAccounts && permittedAccounts.length > 0) {
                    const accountIds = permittedAccounts.map(pa => pa.account_id);
                    query = query.in('account_id', accountIds);
                } else {
                    setEarningsData([]); // Set to empty if no permitted accounts
                    return; // Exit the function early
                }
            }

            const { data, error } = await query.order('updated_at', { ascending: false });

            if (!error && data) {
                const formatted = data.map(p => {
                    // Calculate days left in real-time (Next-Month 15th Karachi Time)
                    let daysLeft = 0;
                    if (p.clearance_start_date && p.funds_status === 'Pending') {
                        const now = new Date();
                        const currentKarachi = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
                        currentKarachi.setHours(0, 0, 0, 0);

                        const startDate = new Date(p.clearance_start_date);
                        const startKarachi = new Date(startDate.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));

                        let targetMonth = startKarachi.getMonth() + 1;
                        let targetYear = startKarachi.getFullYear();
                        if (targetMonth > 11) {
                            targetMonth = 0;
                            targetYear += 1;
                        }
                        const targetRelease = new Date(targetYear, targetMonth, 15, 0, 0, 0, 0);

                        const diffMs = targetRelease.getTime() - currentKarachi.getTime();
                        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        daysLeft = Math.max(0, days);
                    }

                    // Auto-correct status if clearance expired
                    let actualStatus = p.funds_status;
                    if (p.funds_status === 'Pending' && daysLeft === 0) {
                        actualStatus = 'Cleared';
                    }

                    // CALCULATE EARNING
                    let rawAmount = 0;
                    const isDesignerRole = subjectUser?.role === 'Team Designer' || p.team_designer_id === subjectUser?.id;
                    
                    if (isDesignerRole) {
                        rawAmount = Number(p.team_designer_fee) || Number(p.team_payout) || 0;
                    } else {
                        // User is Admin or the main Assignee (Team Lead/Freelancer)
                        // Per user request: Super Admin and Team Lead should see ACTUAL Payout (Gross)
                        rawAmount = Number(p.designer_fee) || 0;
                    }

                    return {
                        id: p.project_id,
                        project: p.project_title || p.project_id,
                        client: p.client_name || 'Personal',
                        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rawAmount),
                        rawAmount: rawAmount,
                        date: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                        rawDate: p.clearance_start_date,
                        accountId: p.account_id,
                        funds_status: actualStatus,
                        daysLeft: daysLeft
                    };
                });
                setEarningsData(formatted);
            } else if (error) {
                console.error('❌ Error fetching earnings:', error);
            }
        } catch (err) {
            console.error('Error in fetchEarnings:', err);
        } finally {
            setLoading(false);
        }
    };

    const freelancerOptions = freelancers 
        ? freelancers.filter(f => f.role === 'Freelancer').map(f => ({
            value: f.email,
            label: f.name || f.email
        })) : [];

    const teamLeadOptions = freelancers 
        ? freelancers.filter(f => f.role === 'Team Lead').map(f => ({
            value: f.email,
            label: f.name || f.email
        })) : [];

    const teamDesignerOptions = freelancers 
        ? freelancers.filter(f => f.role === 'Team Designer').map(f => ({
            value: f.email,
            label: f.name || f.email
        })) : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header with Dropdowns */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider px-2 shrink-0">Freelancer Earnings</h3>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Freelancer Dropdown */}
                    <div className="w-full sm:w-56 shrink-0">
                        <Dropdown
                            options={freelancerOptions}
                            value={selectedFreelancer && freelancers?.find(f => f.email === selectedFreelancer)?.role === 'Freelancer' ? selectedFreelancer : ''}
                            onChange={(val) => {
                                setSelectedFreelancer(val);
                                setSelectedTeamLead('');
                                setSelectedTeamDesigner('');
                            }}
                            placeholder="Select Freelancer"
                            showSearch={true}
                        >
                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-xs font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />
                                <span className="truncate relative z-10 text-gray-400 group-hover:text-white transition-colors">
                                    {(selectedFreelancer && freelancers?.find(f => f.email === selectedFreelancer)?.role === 'Freelancer') 
                                        ? freelancers?.find(f => f.email === selectedFreelancer)?.name 
                                        : 'Select Freelancer'}
                                </span>
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </Dropdown>
                    </div>

                    {/* Team Lead Dropdown */}
                    <div className="w-full sm:w-56 shrink-0">
                        <Dropdown
                            options={teamLeadOptions}
                            value={selectedFreelancer && freelancers?.find(f => f.email === selectedFreelancer)?.role === 'Team Lead' ? selectedFreelancer : ''}
                            onChange={(val) => {
                                setSelectedFreelancer(val);
                                setSelectedTeamLead(val);
                                setSelectedTeamDesigner('');
                            }}
                            placeholder="Select Team Lead"
                            showSearch={true}
                        >
                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-xs font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />
                                <span className="truncate relative z-10 text-gray-400 group-hover:text-white transition-colors">
                                    {(selectedFreelancer && freelancers?.find(f => f.email === selectedFreelancer)?.role === 'Team Lead') 
                                        ? freelancers?.find(f => f.email === selectedFreelancer)?.name 
                                        : 'Select Team Lead'}
                                </span>
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </Dropdown>
                    </div>

                    {/* Team Designer Dropdown */}
                    <div className="w-full sm:w-56 shrink-0">
                        <Dropdown
                            options={teamDesignerOptions}
                            value={selectedFreelancer && freelancers?.find(f => f.email === selectedFreelancer)?.role === 'Team Designer' ? selectedFreelancer : ''}
                            onChange={(val) => {
                                setSelectedFreelancer(val);
                                setSelectedTeamLead('');
                                setSelectedTeamDesigner(val);
                            }}
                            placeholder="Select Team Designer"
                            showSearch={true}
                        >
                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-xs font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />
                                <span className="truncate relative z-10 text-gray-400 group-hover:text-white transition-colors">
                                    {(selectedFreelancer && freelancers?.find(f => f.email === selectedFreelancer)?.role === 'Team Designer') 
                                        ? freelancers?.find(f => f.email === selectedFreelancer)?.name 
                                        : 'Select Team Designer'}
                                </span>
                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* Empty State or Content */}
            {!selectedFreelancer ? (
                <div className="bg-surface-card rounded-2xl border border-surface-border p-16 text-center">
                    <p className="text-gray-400">Select a freelancer to view their earnings</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Filter Bar */}
                    <Card
                        isElevated={true}
                        disableHover={true}
                        className="h-full flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova"
                        bodyClassName="flex-1 h-full py-0 px-0 overflow-visible"
                    >
                        {/* Full Surface Metallic Shine */}
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="p-3 relative z-10 w-full h-full">
                            <div className="w-full h-full flex flex-col xl:flex-row items-center justify-between gap-4 py-1 px-2">
                                {/* Left Side: Date Pickers & Account */}
                                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                                    <DatePicker
                                        value={dateFrom}
                                        onChange={(date) => {
                                            setDateFrom(date);
                                            setActiveFilter(null);
                                        }}
                                    >
                                        <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                            {/* Inner Top Shadow for carved-in look */}
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                            {/* Subtle Diagonal Machined Sheen */}
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                            <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                            <span className="min-w-[100px] whitespace-nowrap text-center relative z-10">{systemFormatDate(dateFrom) || 'From Date'}</span>
                                            <div className="flex items-center gap-1.5 relative z-10">
                                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                {dateFrom && (
                                                    <div
                                                        className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDateFrom(null);
                                                        }}
                                                    >
                                                        <IconX className="w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </DatePicker>

                                    <DatePicker
                                        value={dateTo}
                                        onChange={(date) => {
                                            setDateTo(date);
                                            setActiveFilter(null);
                                        }}
                                    >
                                        <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                            {/* Inner Top Shadow for carved-in look */}
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                            {/* Subtle Diagonal Machined Sheen */}
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                            <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                            <span className="min-w-[100px] whitespace-nowrap text-center relative z-10">{systemFormatDate(dateTo) || 'To Date'}</span>
                                            <div className="flex items-center gap-1.5 relative z-10">
                                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                {dateTo && (
                                                    <div
                                                        className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDateTo(null);
                                                        }}
                                                    >
                                                        <IconX className="w-3 h-3" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </DatePicker>

                                    <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                                    <div className="w-44">
                                        <Dropdown
                                            value={selectedAccount}
                                            onChange={handleAccountChange}
                                            options={[{ label: 'All Accounts', value: 'all' }, ...accounts.map(a => ({
                                                label: a.name,
                                                description: a.prefix?.toUpperCase(),
                                                value: a.id
                                            }))]}
                                            placeholder="All Accounts"
                                            showSearch={true}
                                            isMulti={true}
                                            menuClassName="!w-[340px]"
                                        >
                                            <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                                {/* Inner Top Shadow for carved-in look */}
                                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                                {/* Subtle Diagonal Machined Sheen */}
                                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                                <span className="truncate relative z-10">
                                                    {selectedAccount.includes('all') ? 'All Accounts' :
                                                        selectedAccount.length === 1 ? (() => {
                                                            const acc = accounts.find(a => a.id === selectedAccount[0]);
                                                            return acc?.prefix ? acc.prefix.toUpperCase() : (acc?.name || 'Account');
                                                        })() :
                                                            `${selectedAccount.length} Accounts`}
                                                </span>
                                                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </Dropdown>
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-2 w-full xl:w-auto justify-center xl:justify-end overflow-visible">
                                    {[
                                        { id: 'today', label: 'Today' },
                                        { id: 'week', label: 'This Week' },
                                        { id: 'month', label: 'This Month' }
                                    ].map((filter) => (
                                        <div
                                            key={filter.id}
                                            onClick={() => handleQuickFilter(filter.id as any)}
                                            className={`relative flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden min-w-[90px] ${activeFilter === filter.id
                                                ? 'border-brand-primary/40 bg-brand-primary/5'
                                                : 'hover:bg-black/50 hover:border-white/10'
                                                }`}
                                        >
                                            {/* Inner Top Shadow for carved-in look */}
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                            {/* Subtle Diagonal Machined Sheen */}
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                            <span className={`relative z-10 transition-colors ${activeFilter === filter.id ? 'text-brand-primary' : 'text-gray-400 group-hover:text-white'
                                                }`}>
                                                {filter.label}
                                            </span>
                                        </div>
                                    ))}
                                    <Button
                                        variant="metallic"
                                        size="sm"
                                        leftIcon={<IconChartBar className="w-4 h-4 block" />}
                                        className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                                        onClick={handleExportCSV}
                                    >
                                        Export CSV
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <Card
                            isElevated={true}
                            disableHover={activeSummaryFilter === 'lifetime'}
                            className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'lifetime'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full"
                            onClick={() => setActiveSummaryFilter('lifetime')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-5 relative z-10 w-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeSummaryFilter === 'lifetime' ? 'text-white/80' : 'text-gray-400'}`}>Lifetime Earnings</p>
                                        <h4 className={`text-2xl font-black ${activeSummaryFilter === 'lifetime' ? 'text-white' : 'text-brand-success'}`}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                                earningsData.filter(item => {
                                                    // Check Status
                                                    if (item.funds_status !== 'Paid') return false;

                                                    // Check Dates
                                                    const itemDate = new Date(item.rawDate);
                                                    itemDate.setHours(0, 0, 0, 0);
                                                    if (dateFrom) {
                                                        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                        if (itemDate < from) return false;
                                                    }
                                                    if (dateTo) {
                                                        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                        if (itemDate > to) return false;
                                                    }

                                                    // Check Account
                                                    if (!selectedAccount.includes('all')) {
                                                        const isMatched = selectedAccount.includes(item.accountId) || 
                                                            selectedAccount.some(accId => {
                                                                const acc = accounts.find(a => a.id === accId);
                                                                return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                            });
                                                        if (!isMatched) return false;
                                                    }

                                                    return true;
                                                }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                            )}
                                        </h4>
                                    </div>
                                    <div className={`p-2 rounded-lg border transition-all ${activeSummaryFilter === 'lifetime'
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                        }`}>
                                        <IconDollar className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            isElevated={true}
                            disableHover={activeSummaryFilter === 'pending'}
                            className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'pending'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full"
                            onClick={() => setActiveSummaryFilter('pending')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-5 relative z-10 w-full">
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeSummaryFilter === 'pending' ? 'text-white/80' : 'text-gray-400'}`}>Pending Clearance</p>
                                        <h4 className={`text-2xl font-black ${activeSummaryFilter === 'pending' ? 'text-white' : 'text-brand-warning'}`}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                                earningsData.filter(item => {
                                                    // Check Status
                                                    if (item.funds_status !== 'Pending') return false;

                                                    // Check Dates
                                                    const itemDate = new Date(item.rawDate);
                                                    itemDate.setHours(0, 0, 0, 0);
                                                    if (dateFrom) {
                                                        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                        if (itemDate < from) return false;
                                                    }
                                                    if (dateTo) {
                                                        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                        if (itemDate > to) return false;
                                                    }

                                                    // Check Account
                                                    if (!selectedAccount.includes('all')) {
                                                        const isMatched = selectedAccount.includes(item.accountId) || 
                                                            selectedAccount.some(accId => {
                                                                const acc = accounts.find(a => a.id === accId);
                                                                return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                            });
                                                        if (!isMatched) return false;
                                                    }

                                                    return true;
                                                }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                            )}
                                        </h4>
                                    </div>
                                    <div className={`p-2 rounded-lg border transition-all ${activeSummaryFilter === 'pending'
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                        }`}>
                                        <IconClock className="w-5 h-5" />
                                    </div>
                                </div>
                                <p className={`text-[10px] font-medium ${activeSummaryFilter === 'pending' ? 'text-white/70' : 'text-gray-500'}`}>Approved, awaiting clearance</p>
                            </div>
                        </Card>

                        <Card
                            isElevated={true}
                            disableHover={activeSummaryFilter === 'available'}
                            className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'available'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full"
                            onClick={() => setActiveSummaryFilter('available')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-5 relative z-10 w-full">
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeSummaryFilter === 'available' ? 'text-white/80' : 'text-gray-400'}`}>Available Amount</p>
                                        <h4 className={`text-2xl font-black ${activeSummaryFilter === 'available' ? 'text-white' : 'text-brand-success'}`}>
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                                earningsData.filter(item => {
                                                    // Check Status
                                                    if (item.funds_status !== 'Cleared') return false;

                                                    // Check Dates
                                                    const itemDate = new Date(item.rawDate);
                                                    itemDate.setHours(0, 0, 0, 0);
                                                    if (dateFrom) {
                                                        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                        if (itemDate < from) return false;
                                                    }
                                                    if (dateTo) {
                                                        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                        if (itemDate > to) return false;
                                                    }

                                                    // Check Account
                                                    if (!selectedAccount.includes('all')) {
                                                        const isMatched = selectedAccount.includes(item.accountId) || 
                                                            selectedAccount.some(accId => {
                                                                const acc = accounts.find(a => a.id === accId);
                                                                return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                            });
                                                        if (!isMatched) return false;
                                                    }

                                                    return true;
                                                }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                            )}
                                        </h4>
                                    </div>
                                    <div className={`p-2 rounded-lg border transition-all ${activeSummaryFilter === 'available'
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                        }`}>
                                        <IconCheckCircle className="w-5 h-5" />
                                    </div>
                                </div>
                                <p className={`text-[10px] font-medium ${activeSummaryFilter === 'available' ? 'text-white/70' : 'text-gray-500'}`}>Ready for payout</p>
                            </div>
                        </Card>
                    </div>

                    {/* Sub Tabs & Actions Bar - Shared Row */}
                    {activeSummaryFilter === 'available' && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                            <Tabs
                                tabs={[
                                    { id: 'available', label: 'Available Amount', icon: <IconCheckCircle className="w-4 h-4" /> },
                                    { id: 'history', label: 'Transaction History', icon: <IconCreditCard className="w-4 h-4" /> }
                                ]}
                                activeTab={activeSubTab}
                                onTabChange={(id) => setActiveSubTab(id as 'available' | 'history')}
                                className="!rounded-xl !p-1"
                            />

                            {isAdmin && (
                                <Button
                                    size="md"
                                    variant="metallic"
                                    leftIcon={<IconCreditCard className="w-4 h-4" />}
                                    className="w-full sm:w-auto whitespace-nowrap font-bold uppercase tracking-wider !h-10 !px-5"
                                    onClick={() => {
                                        const availableList = earningsData.filter(item => {
                                            if (item.funds_status !== 'Cleared') return false;
                                            const itemDate = new Date(item.rawDate);
                                            itemDate.setHours(0, 0, 0, 0);
                                            if (dateFrom) {
                                                const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                if (itemDate < from) return false;
                                            }
                                            if (dateTo) {
                                                const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                if (itemDate > to) return false;
                                            }
                                            if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
                                                const accMatched = selectedAccount.includes(item.accountId);
                                                const prefixMatched = selectedAccount.some(accId => {
                                                    const acc = accounts?.find(a => a.id === accId);
                                                    return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                });
                                                if (!accMatched && !prefixMatched) return false;
                                            }
                                            return true;
                                        });
                                        const availableAmount = availableList.reduce((sum, item) => sum + (item.rawAmount || 0), 0);
                                        if (availableAmount > 0) {
                                            setIsReleaseSuccess(false);
                                            setIsReleaseModalOpen(true);
                                        } else {
                                            addToast({ title: 'No available funds to release', type: 'error' });
                                        }
                                    }}
                                >
                                    Release Amount
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Content Display: If not 'available' card, show projects. If 'available' card, toggle by sub-tab. */}
                    {(activeSummaryFilter !== 'available' || activeSubTab === 'available') ? (
                        <Table
                            columns={[
                                {
                                    header: 'Approved On',
                                    key: 'date',
                                    render: (item: any) => <span className="text-gray-400">{item.date}</span>
                                },
                                {
                                    header: 'Project ID',
                                    key: 'id',
                                    render: (item: any) => <span className="font-semibold text-white/90">{item.id}</span>
                                },
                                {
                                    header: 'Account',
                                    key: 'accountId',
                                    render: (item: any) => {
                                        const acc = accounts.find(a => a.id === item.accountId);
                                        return (
                                            <span className="text-gray-400 font-bold uppercase tracking-wider">
                                                {acc?.prefix?.toUpperCase() || 'N/A'}
                                            </span>
                                        );
                                    }
                                },
                                {
                                    header: 'Project Title',
                                    key: 'project',
                                    render: (item: any) => <span className="font-semibold text-white/90">{item.project}</span>
                                },
                                {
                                    header: 'Client',
                                    key: 'client',
                                    render: (item: any) => <span className="text-gray-400">{item.client}</span>
                                },
                                {
                                    header: activeSummaryFilter === 'pending' ? 'Days Left' : 'Funds Status',
                                    key: 'funds_status',
                                    render: (item: any) => {
                                        if (activeSummaryFilter === 'pending') {
                                            return (
                                                <span className="bg-brand-warning/10 text-brand-warning border border-brand-warning/20 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                    {item.daysLeft || 0} Days
                                                </span>
                                            );
                                        }
                                        const status = activeSummaryFilter === 'available' ? 'Unpaid' : item.funds_status;
                                        const isSuccess = status === 'Cleared' || status === 'Paid';
                                        return (
                                            <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isSuccess ? 'bg-brand-success/10 text-brand-success border border-brand-success/20' : 'bg-brand-warning/10 text-brand-warning border border-brand-warning/20'
                                                }`}>
                                                {status}
                                            </span>
                                        );
                                    }
                                },
                                {
                                    header: 'Payout',
                                    key: 'amount',
                                    className: 'text-right',
                                    render: (item: any) => <span className="text-brand-success font-bold">{item.amount}</span>
                                }
                            ]}
                            data={filteredData}
                            isLoading={loading}
                            isMetallicHeader={true}
                        />
                    ) : showReleaseDetails ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Premium Header Design */}
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group shadow-nova">
                                {/* Full Surface Metallic Shine */}
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                                <div className="flex items-center gap-5 relative z-10">
                                    <div
                                        onClick={() => setShowReleaseDetails(false)}
                                        className="group flex items-center cursor-pointer"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-gray-400 group-hover:border-brand-primary/50 group-hover:text-brand-primary transition-all duration-300 shadow-nova overflow-hidden relative">
                                            {/* Inner Top Shadow */}
                                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                            <svg className="w-5 h-5 rotate-180 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="h-10 w-px bg-white/10 hidden sm:block" />

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-2xl font-black text-white tracking-tight">Release Details</h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <IconCalendar className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{systemFormatDate(new Date(selectedReleaseLog?.release_date))}</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-white/10 hidden sm:block" />
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <IconCreditCard className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{selectedReleaseLog?.payment_method}</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-white/10 hidden sm:block" />
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <IconUser className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">By {selectedReleaseLog?.released_by_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Machined Payout Display */}
                                <div className="relative bg-black/60 border border-white/5 rounded-2xl px-8 py-4 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center min-w-[200px] group">
                                    {/* Inner Top Shadow */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.01)_48%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.01)_52%,transparent_100%)] opacity-40 pointer-events-none" />

                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] relative z-10 mb-1 text-center text-nowrap">Total Payout</span>
                                    <span className="text-3xl font-black text-brand-primary relative z-10 tabular-nums text-center drop-shadow-[0_0_10px_rgba(255,107,0,0.2)]">
                                        ${parseFloat(selectedReleaseLog?.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <Table
                                columns={[
                                    {
                                        header: 'Approved On',
                                        key: 'date',
                                        render: (item: any) => <span className="text-gray-400">{item.date}</span>
                                    },
                                    {
                                        header: 'Project ID',
                                        key: 'id',
                                        render: (item: any) => <span className="font-semibold text-white/90">{item.id}</span>
                                    },
                                    {
                                        header: 'Account',
                                        key: 'accountId',
                                        render: (item: any) => {
                                            const acc = accounts.find(a => a.id === item.accountId);
                                            return (
                                                <span className="text-gray-400 font-bold uppercase tracking-wider">
                                                    {acc?.prefix?.toUpperCase() || 'N/A'}
                                                </span>
                                            );
                                        }
                                    },
                                    {
                                        header: 'Project Title',
                                        key: 'project',
                                        render: (item: any) => <span className="font-semibold text-white/90">{item.project}</span>
                                    },
                                    {
                                        header: 'Client',
                                        key: 'client',
                                        render: (item: any) => <span className="text-gray-400">{item.client}</span>
                                    },
                                    {
                                        header: 'Funds Status',
                                        key: 'funds_status',
                                        render: (item: any) => (
                                            <span className="bg-brand-success/10 text-brand-success border border-brand-success/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                Paid
                                            </span>
                                        )
                                    },
                                    {
                                        header: 'Payout',
                                        key: 'amount',
                                        className: 'text-right',
                                        render: (item: any) => <span className="text-brand-success font-bold">{item.amount}</span>
                                    }
                                ]}
                                data={selectedReleaseLog?.projects || []}
                                isLoading={false}
                                isMetallicHeader={true}
                            />
                        </div>
                    ) : (
                        <Table
                            columns={[
                                {
                                    header: 'Release Date',
                                    key: 'release_date',
                                    render: (item: any) => <span className="text-gray-400">{systemFormatDate(new Date(item.release_date))}</span>
                                },
                                {
                                    header: 'Amount Released',
                                    key: 'amount',
                                    render: (item: any) => <span className="text-brand-success font-bold">${parseFloat(item.amount).toLocaleString()}</span>
                                },
                                {
                                    header: 'Method',
                                    key: 'payment_method',
                                    render: (item: any) => {
                                        const currentFreelancer = freelancers?.find(f => f.email === selectedFreelancer);
                                        const isBank = item.payment_method === 'Bank Transfer';

                                        const tooltipContent = (
                                            <div className="min-w-[280px] bg-[#0A0A0A] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_-10px_rgba(0,0,0,1)]">
                                                {/* Metallic Header */}
                                                <div className="relative border-b border-white/10 p-4 flex items-center justify-between bg-[#1A1A1A]">
                                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                                                    <div className="flex items-center gap-2 relative z-10">
                                                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_10px_rgba(255,77,45,0.6)]" />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">
                                                            {isBank ? 'Bank Account Details' : 'Payoneer Details'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-[#0A0A0A]">
                                                    {isBank ? (
                                                        <div className="space-y-3">
                                                            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-xl p-3 overflow-hidden group">
                                                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-50" />
                                                                <div className="relative z-10">
                                                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Bank Name</span>
                                                                    <span className="text-sm text-white font-bold tracking-tight">{currentFreelancer?.bank_name || 'Not provided'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-xl p-3 overflow-hidden group">
                                                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-50" />
                                                                <div className="relative z-10">
                                                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Account Title</span>
                                                                    <span className="text-sm text-white font-bold tracking-tight">{currentFreelancer?.account_title || 'Not provided'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-xl p-3 overflow-hidden group">
                                                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-50" />
                                                                <div className="relative z-10">
                                                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">IBAN / Account Number</span>
                                                                    <span className="text-sm text-white font-mono font-bold tracking-wider">{currentFreelancer?.iban || 'Not provided'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="relative bg-[#1A1A1A] border border-white/10 rounded-xl p-4 overflow-hidden group">
                                                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-50" />
                                                            <div className="relative z-10">
                                                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">Registered Email</span>
                                                                <span className="text-sm text-white font-bold tracking-tight">{currentFreelancer?.payment_email || 'Not provided'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );

                                        return (
                                            <Tooltip content={tooltipContent} className="!p-0 !bg-transparent !border-0 !shadow-none">
                                                <span className="text-white/80 cursor-help border-b border-white/10 border-dotted hover:text-brand-primary hover:border-brand-primary/40 transition-colors">
                                                    {item.payment_method}
                                                </span>
                                            </Tooltip>
                                        );
                                    }
                                },
                                {
                                    header: 'Released By',
                                    key: 'released_by_name',
                                    render: (item: any) => <span className="text-gray-400">{item.released_by_name || 'System'}</span>
                                },
                                {
                                    header: '',
                                    key: 'action',
                                    className: 'w-10 text-right',
                                    render: (item: any) => (
                                        <div className="flex justify-end pr-2">
                                            <div
                                                onClick={() => handleViewReleaseDetails(item)}
                                                className="w-8 h-8 rounded-xl bg-brand-primary/[0.08] border border-brand-primary/20 flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(255,107,0,0.1)]"
                                            >
                                                <IconChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    )
                                }
                            ]}
                            data={releaseLogs}
                            isLoading={loading}
                            isMetallicHeader={true}
                            disableRowHover={true}
                        />
                    )}
                </div>
            )}

            {/* Release Payment Modal */}
            <Modal
                isOpen={isReleaseModalOpen}
                onClose={() => !isReleasing && setIsReleaseModalOpen(false)}
                title="Release Payment"
                isElevatedFooter={true}
                footer={
                    isReleaseSuccess ? (
                        <div className="flex justify-center w-full">
                            <Button
                                variant="metallic"
                                onClick={() => {
                                    setIsReleaseModalOpen(false);
                                    setIsReleaseSuccess(false);
                                }}
                                className="!px-12"
                            >
                                Close
                            </Button>
                        </div>
                    ) : (
                        <div className="flex justify-end gap-3 w-full">
                            <Button
                                variant="recessed"
                                onClick={() => {
                                    setIsReleaseModalOpen(false);
                                    setIsReleaseSuccess(false);
                                }}
                                disabled={isReleasing}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="metallic"
                                onClick={handleReleaseAmount}
                                isLoading={isReleasing}
                            >
                                Confirm Release
                            </Button>
                        </div>
                    )
                }
            >
                <div className="space-y-4">
                    {isReleasing ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin mb-6" />
                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Processing Release...</h3>
                            <p className="text-gray-500 text-sm">Updating records and ledger...</p>
                        </div>
                    ) : isReleaseSuccess ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-20 h-20 bg-brand-success/10 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                                <IconCheckCircle className="w-10 h-10 text-brand-success" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Payment Released!</h3>
                            <p className="text-gray-400 max-w-[280px] leading-relaxed">
                                The funds have been successfully released and the transaction has been logged.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Simple Total Display */}
                            <div className="flex flex-col items-center justify-center py-6 mb-2">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mb-2">Total to Release</span>
                                <span className="text-4xl font-black text-brand-primary tracking-tight">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                        earningsData.filter(item => {
                                            if (item.funds_status !== 'Cleared') return false;
                                            const itemDate = new Date(item.rawDate);
                                            itemDate.setHours(0, 0, 0, 0);
                                            if (dateFrom) {
                                                const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                                                if (itemDate < from) return false;
                                            }
                                            if (dateTo) {
                                                const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                                                if (itemDate > to) return false;
                                            }
                                            if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
                                                const accMatched = selectedAccount.includes(item.accountId);
                                                const prefixMatched = selectedAccount.some(accId => {
                                                    const acc = accounts?.find(a => a.id === accId);
                                                    return acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase());
                                                });
                                                if (!accMatched && !prefixMatched) return false;
                                            }
                                            return true;
                                        }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                    )}
                                </span>
                            </div>

                            {/* Payment Method Dropdown */}
                            <div className="mb-6">
                                <Dropdown
                                    label="Select Payout Method"
                                    options={[
                                        { label: 'Bank Transfer', value: 'Bank Transfer' },
                                        { label: 'Payoneer', value: 'Payoneer' }
                                    ]}
                                    value={releaseFormData.paymentMethod}
                                    onChange={(val) => setReleaseFormData(prev => ({ ...prev, paymentMethod: val }))}
                                    variant="metallic"
                                />
                            </div>

                            {/* Payment Details Sections */}
                            {(() => {
                                const currentFreelancer = freelancers?.find(f => f.email === selectedFreelancer);
                                return (
                                    <div className="space-y-4">
                                        {/* Bank Details Card */}
                                        <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                                            <div className="bg-white/[0.03] px-5 py-3 border-b border-white/5">
                                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Bank Details</h3>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <div className="flex flex-col border-b border-white/5 pb-3">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Bank Name</span>
                                                    <span className="text-sm text-white font-medium">
                                                        {currentFreelancer?.bank_name || 'Not provided'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col border-b border-white/5 pb-3">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Account Title</span>
                                                    <span className="text-sm text-white font-medium">
                                                        {currentFreelancer?.account_title || 'Not provided'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">IBAN / Account Number</span>
                                                    <span className="text-sm text-brand-primary font-mono font-bold tracking-wider">
                                                        {currentFreelancer?.iban || 'Not provided'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payoneer Details Card */}
                                        <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
                                            <div className="bg-white/[0.03] px-5 py-3 border-b border-white/5">
                                                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Payoneer Details</h3>
                                            </div>
                                            <div className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Payoneer Email</span>
                                                    <span className="text-sm text-white font-medium">
                                                        {currentFreelancer?.payment_email || 'Not provided'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

const Finances: React.FC = () => {
    const { hasPermission } = useUser();
    const [activeTab, setActiveTab] = useState(getInitialTab('Finances', 'commission'));
    const [isTabSelectorOpen, setIsTabSelectorOpen] = useState(false);

    const allTabs = [
        { id: 'commission', label: 'Platform Commission', icon: <IconSettings className="w-4 h-4" />, permission: 'manage_finance_config' },
        { id: 'seller', label: 'Bonus Structures', icon: <IconTrendingUp className="w-4 h-4" />, permission: 'manage_finance_config' },
        { id: 'company', label: 'Company Earnings', icon: <IconCreditCard className="w-4 h-4" />, permission: 'view_company_earnings' },
        { id: 'freelancer', label: 'Freelancer Earnings', icon: <IconUser className="w-4 h-4" />, permission: 'view_freelancer_earnings' },
    ];

    const availableTabs = allTabs.filter(tab => hasPermission(tab.permission));

    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id);
        }
    }, [availableTabs, activeTab]);

    useEffect(() => {
        updateRoute('Finances', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const handlePopState = () => {
            setActiveTab(getInitialTab('Finances', 'commission'));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {availableTabs.length > 1 && (
                <>
                    {/* Desktop Tabs */}
                    <div className="hidden md:block">
                        <Tabs tabs={availableTabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    </div>

                    {/* Mobile Tab Selector */}
                    <div className="md:hidden flex flex-col gap-2">
                        <button
                            onClick={() => setIsTabSelectorOpen(!isTabSelectorOpen)}
                            className="flex items-center justify-between w-full h-14 px-5 bg-black/40 border border-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] group active:scale-[0.98] transition-all"
                        >
                            <div className="flex flex-col items-start translate-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-0.5">Select Section</span>
                                <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    {availableTabs.find(t => t.id === activeTab)?.label}
                                </span>
                            </div>
                            <IconChevronRight
                                className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isTabSelectorOpen ? 'rotate-90 text-brand-primary' : ''}`}
                            />
                        </button>

                        {isTabSelectorOpen && (
                            <div className="flex flex-col gap-1.5 p-1.5 bg-black/40 border border-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-300">
                                {availableTabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setIsTabSelectorOpen(false);
                                            }}
                                            className={`
                                                relative flex items-center justify-center h-11 px-4 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest outline-none overflow-hidden
                                                ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                                            `}
                                        >
                                            {isActive && (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF6B4B]/50 shadow-[0_8px_15px_-2px_rgba(255,107,75,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] rounded-xl duration-200" />
                                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
                                                </>
                                            )}
                                            <span className="relative z-20 flex items-center gap-2">
                                                {tab.icon}
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
            <div className={`mt-8 min-h-[420px] ${availableTabs.length === 0 ? 'flex items-center justify-center' : ''}`}>
                {availableTabs.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-2xl mx-auto mb-6">
                            <IconLock size={40} />
                        </div>
                        <h3 className="text-xl font-black text-white italic tracking-tight uppercase">
                            {hasPermission('view_finances') ? 'No Modules Enabled' : 'Access Restricted'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                            {hasPermission('view_finances')
                                ? 'You have access to the Finances page, but no specific sub-modules (Earnings, Config) are enabled for your role. Please update your permissions in the Control Panel.'
                                : 'You do not have permission to view financial records.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div hidden={activeTab !== 'commission'}>
                            <PlatformCommission />
                        </div>
                        <div hidden={activeTab !== 'seller'}>
                            <BonusStructureManager />
                        </div>
                        <div hidden={activeTab !== 'company'}>
                            <CompanyEarnings />
                        </div>
                        <div hidden={activeTab !== 'freelancer'}>
                            <FreelancerEarnings />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Finances;
