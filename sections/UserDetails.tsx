import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Avatar } from '../components/Avatar';
import { Dropdown } from '../components/Dropdown';
import {
    IconChevronLeft,
    IconMail,
    IconPhone,
    IconCreditCard,
    IconClock,
    IconTrash,
    IconCheckCircle,
    IconAlertTriangle,
    IconXCircle,
    IconFileImage,
    IconCamera,
    IconLoader,
    IconMapPin,
    IconCalendar,
    IconMaximize,
    IconBuilding,
    IconUser,
    IconBank,
    IconDollar,
    IconChartBar,
    IconLock,
    IconZap,
} from '../components/Icons';
import { Badge, RoleCapsule, getStatusCapsuleClasses } from '../components/Badge';
import { Modal, Card, ElevatedMetallicCard } from '../components/Surfaces';
import { addToast } from '../components/Toast';
import { formatDisplayName } from '../utils/formatter';
import { useUser } from '../contexts/UserContext';

interface UserDetailsProps {
    userId: string;
    onBack: () => void;
    onStatusChange?: () => void;
    onPreviewV2?: () => void;
}

const UserDetails: React.FC<UserDetailsProps> = ({ userId, onBack, onStatusChange, onPreviewV2 }) => {
    const { effectiveRole, hasPermission } = useUser();
    const canEdit = hasPermission('edit_users');
    const canDelete = hasPermission('delete_users');
    const [user, setUser] = useState<any>(() => {
        const cachedUsers = localStorage.getItem('nova_users_cache');
        if (cachedUsers) {
            const users = JSON.parse(cachedUsers);
            return users.find((u: any) => u.id === userId) || null;
        }
        return null;
    });
    const [loading, setLoading] = useState(!user);
    const [updating, setUpdating] = useState(false);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isCNICUploading, setIsCNICUploading] = useState<{ front: boolean, back: boolean }>({ front: false, back: false });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cnicFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSavingPayout, setIsSavingPayout] = useState(false);
    const [updatingPreferred, setUpdatingPreferred] = useState(false);
    const [payoutData, setPayoutData] = useState({ strategy: 'slab', rate: 0 });
    const [preferredMethod, setPreferredMethod] = useState<string>('');

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        if (!user) setLoading(true); // Only show spinner if we don't have cached data
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setUser(data);
            
            // Set payout and preferred method data state
            setPayoutData({
                strategy: data.payout_strategy || 'slab',
                rate: data.fixed_payout_rate || 0
            });
            setPreferredMethod(data.preferred_payment_method || '');

            // Sync this specific user back into the general users cache
            const cachedUsers = localStorage.getItem('nova_users_cache');
            if (cachedUsers) {
                const users = JSON.parse(cachedUsers);
                const index = users.findIndex((u: any) => u.id === userId);
                if (index !== -1) {
                    users[index] = { ...users[index], ...data };
                    localStorage.setItem('nova_users_cache', JSON.stringify(users));
                }
            }
        } catch (error: any) {
            console.error('Error fetching user details:', error);
            addToast({ type: 'error', title: 'Error', message: 'Could not load user details.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            setUser({ ...user, status: newStatus });
            addToast({ type: 'success', title: 'Status Updated', message: `User status changed to ${newStatus}.` });
            if (onStatusChange) onStatusChange();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdatePreferredMethod = async () => {
        setUpdatingPreferred(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ preferred_payment_method: preferredMethod })
                .eq('id', userId);

            if (error) throw error;
            
            setUser({ ...user, preferred_payment_method: preferredMethod });
            addToast({ type: 'success', title: 'Payment Method Updated', message: `User's preferred method is now ${preferredMethod || 'Not Specified'}.` });
        } catch (error: any) {
            console.error('Error updating preferred method:', error);
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdatingPreferred(false);
        }
    };

    const handleUpdateRole = async (newRole: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            setUser({ ...user, role: newRole });
            addToast({ type: 'success', title: 'Role Updated', message: `User role changed to ${newRole}.` });
            if (onStatusChange) onStatusChange();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = () => {
        setIsDeleteModalOpen(true);
    };

    const executeDeleteUser = async () => {
        setUpdating(true);
        try {
            const { error } = await supabase.rpc('delete_user_entirely', {
                target_user_id: userId
            });

            if (error) throw error;
            addToast({ type: 'success', title: 'User Deleted', message: 'The user account has been permanently removed.' });
            setIsDeleteModalOpen(false);
            onBack();
        } catch (error: any) {
            addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsAvatarUploading(true);
        try {
            // 1. Upload to Supabase Storage
            const fileName = `${userId}-${Math.random().toString(36).substring(2, 7)}.${file.name.split('.').pop()}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const publicUrl = data.publicUrl;

            // 2. Update profile mapping in database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            setUser({ ...user, avatar_url: publicUrl });

            // Sync this specific user back into the general users cache
            const cachedUsers = localStorage.getItem('nova_users_cache');
            if (cachedUsers) {
                const users = JSON.parse(cachedUsers);
                const index = users.findIndex((u: any) => u.id === userId);
                if (index !== -1) {
                    users[index] = { ...users[index], avatar_url: publicUrl };
                    localStorage.setItem('nova_users_cache', JSON.stringify(users));
                }
            }

            addToast({ type: 'success', title: 'Avatar Updated', message: 'Profile picture has been updated successfully.' });
        } catch (error: any) {
            console.error('Error updating avatar:', error);
            addToast({ type: 'error', title: 'Upload Failed', message: error.message });
        } finally {
            setIsAvatarUploading(false);
        }
    };

    const handleCNICClick = (side: 'front' | 'back') => {
        setUploadingSide(side);
        cnicFileInputRef.current?.click();
    };

    const handleCNICFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !uploadingSide) return;

        setIsCNICUploading(prev => ({ ...prev, [uploadingSide]: true }));
        try {
            const fileName = `${userId}-cnic-${uploadingSide}-${Math.random().toString(36).substring(2, 7)}.${file.name.split('.').pop()}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('documents')
                .getPublicUrl(fileName);

            const publicUrl = data.publicUrl;
            const updateField = uploadingSide === 'front' ? 'cnic_front_url' : 'cnic_back_url';

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ [updateField]: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            setUser({ ...user, [updateField]: publicUrl });

            // Sync cache
            const cachedUsers = localStorage.getItem('nova_users_cache');
            if (cachedUsers) {
                const users = JSON.parse(cachedUsers);
                const index = users.findIndex((u: any) => u.id === userId);
                if (index !== -1) {
                    users[index] = { ...users[index], [updateField]: publicUrl };
                    localStorage.setItem('nova_users_cache', JSON.stringify(users));
                }
            }

            addToast({ type: 'success', title: 'Document Updated', message: `CNIC ${uploadingSide} has been updated successfully.` });
        } catch (error: any) {
            console.error('Error updating CNIC:', error);
            addToast({ type: 'error', title: 'Upload Failed', message: error.message });
        } finally {
            setIsCNICUploading(prev => ({ ...prev, [uploadingSide]: false }));
            setUploadingSide(null);
            if (event.target) event.target.value = '';
        }
    };

    const handleUpdatePayout = async () => {
        setIsSavingPayout(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    payout_strategy: payoutData.strategy,
                    fixed_payout_rate: payoutData.rate
                })
                .eq('id', userId);

            if (error) throw error;
            
            setUser({ 
                ...user, 
                payout_strategy: payoutData.strategy, 
                fixed_payout_rate: payoutData.rate 
            });
            
            addToast({ 
                type: 'success', 
                title: 'Payout Strategy Updated', 
                message: `User is now on ${payoutData.strategy === 'slab' ? 'Slab-based' : payoutData.strategy === 'tiered' ? 'Tiered' : 'Fixed-rate'} payout.` 
            });
        } catch (error: any) {
            console.error('Error updating payout strategy:', error);
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setIsSavingPayout(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 px-6">
                <IconAlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">User Not Found</h3>
                <p className="text-gray-500 mb-8">The user you are looking for does not exist or has been removed.</p>
                <Button variant="secondary" onClick={onBack}>Go Back</Button>
            </div>
        );
    }

    const roles = [
        { label: 'Super Admin', value: 'Super Admin' },
        { label: 'Admin', value: 'Admin' },
        { label: 'Project Manager', value: 'Project Manager' },
        { label: 'Freelancer', value: 'Freelancer' },
        { label: 'Presentation Designer', value: 'Presentation Designer' },
        { label: 'Finance Manager', value: 'Finance Manager' },
        { label: 'ORM Manager', value: 'ORM Manager' },
        { label: 'Project Operations Manager', value: 'Project Operations Manager' },
    ];

    const statuses = [
        { label: 'Active', value: 'Active' },
        { label: 'Pending Approval', value: 'Pending' },
        { label: 'Suspended', value: 'Suspended' },
        { label: 'Disabled', value: 'Disabled' },
    ];

    const isPaymentRole = !['super admin', 'admin', 'project manager', 'finance manager', 'orm manager', 'project operations manager'].includes(user?.role?.toLowerCase());

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both w-full mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-400 hover:text-white transition-all hover:bg-white/[0.08] rounded-xl group"
                    >
                        <IconChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            User Details
                        </h1>
                    </div>
                </div>
                {onPreviewV2 && effectiveRole === 'Super Admin' && (
                    <Button
                        variant="metallic"
                        size="sm"
                        onClick={onPreviewV2}
                        className="px-6 shadow-lg shadow-brand-primary/20"
                    >
                        Preview V2 UI
                    </Button>
                )}
                <div className="flex items-center gap-3">
                    {/* Actions removed as requested */}
                </div>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 gap-8">
                {/* Profile Picture Card */}
                <div className="relative w-full rounded-2xl border border-surface-border bg-surface-card overflow-hidden group shadow-lg">
                    {/* Metallic Shine Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-8 relative z-10">
                        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                            {/* Profile Image with Ring */}
                            <div className="relative shrink-0 transition-all duration-300">
                                <Avatar
                                    src={user.avatar_url}
                                    initials={(() => {
                                        const parts = user.name?.split(' ').filter(Boolean) || [];
                                        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                                        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                                        return '??';
                                    })()}
                                    size="2xl"
                                    className="shadow-2xl ring-4 ring-black/20"
                                />
                                {canEdit && (
                                    <button
                                        onClick={handleAvatarClick}
                                        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                    >
                                        {isAvatarUploading ? <IconLoader className="w-8 h-8 animate-spin text-white" /> : <IconCamera className="w-8 h-8 text-white" />}
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                {/* Status Indicator */}
                                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full z-20 border-2 border-[#1a1a1a] ${user.status === 'Active' ? 'bg-brand-success shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                                    user.status === 'Pending' ? 'bg-brand-warning shadow-[0_0_10px_rgba(234,179,8,0.4)]' :
                                        'bg-brand-error shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                                    }`} />
                            </div>

                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="space-y-1">
                                    <h1 className="text-3xl font-black text-white tracking-tight">
                                        {(() => {
                                            // If both first_name and last_name exist, use them
                                            if (user.first_name && user.last_name) {
                                                return `${formatDisplayName(user.first_name)} ${formatDisplayName(user.last_name)}`;
                                            }
                                            // If only name field exists, try to split it
                                            if (user.name) {
                                                const nameParts = user.name.trim().split(' ').filter(part => part.length > 0);
                                                if (nameParts.length >= 2) {
                                                    // Has multiple parts - format each part
                                                    return nameParts.map(part => formatDisplayName(part)).join(' ');
                                                } else {
                                                    // Single name - just format it
                                                    return formatDisplayName(user.name);
                                                }
                                            }
                                            return 'Unknown User';
                                        })()}
                                    </h1>

                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                        {/* Role Badge */}
                                        <RoleCapsule role={user.role} />

                                        {/* Status Badge */}
                                        <div className={getStatusCapsuleClasses(user.status)}>
                                            <span className="text-xs font-bold uppercase tracking-wider">{user.status === 'Disabled' ? 'Deactivated' : user.status}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Details Metadata Card */}
                <Card isElevated className="p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02] relative shadow-md">
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest relative z-10">USER DETAILS</h3>
                    </div>
                    <div className="p-8">
                        <div className={`grid gap-y-10 gap-x-12 ${user.role?.toLowerCase().includes('project manager') ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                            {/* Row 1 */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconMail className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Email Address</span>
                                    <span className="text-base text-white font-medium truncate">{user.email}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconPhone className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Phone Number</span>
                                    <span className="text-base text-white font-medium">{user.phone || user.whatsapp_number || 'No phone number'}</span>
                                </div>
                            </div>

                            {/* Row 2 — Payment Method & Email: shown for Freelancers, Leads, and Designers */}
                            {isPaymentRole && (
                                <>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                            {user.preferred_payment_method === 'Payoneer' ? (
                                                <img src="/payoneericon.jpeg" alt="Payoneer" className="w-full h-full object-contain p-1.5 bg-white rounded-xl" />
                                            ) : (
                                                <IconBank className="w-6 h-6" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Preferred Method</span>
                                            <span className="text-base text-white font-medium truncate">{user.preferred_payment_method || 'Not Specified'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                            <IconMail className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Payment Email</span>
                                            <span className="text-base text-white font-medium truncate">{user.payment_email || 'Not provided'}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                    <IconClock className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Joined Date</span>
                                    <span className="text-base text-white font-medium">
                                        {new Date(user.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Bank Details Card (Freelancer Only) */}
                {isPaymentRole && (
                    <Card isElevated className="p-0 overflow-hidden">
                        <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">BANK DETAILS</h3>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                        <IconBuilding className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Bank Name</span>
                                        <span className="text-base text-white font-medium truncate">{user.bank_name || 'Not provided'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                        <IconUser className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Account Title</span>
                                        <span className="text-base text-white font-medium truncate">{user.account_title || 'Not provided'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 lg:col-span-1">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner">
                                        <IconCreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">IBAN / Account Number</span>
                                        <span className="text-base text-white font-medium truncate">{user.iban || 'Not provided'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Uploaded Documents — shown for any user who has CNIC docs */}
            <div className="grid grid-cols-1 gap-6">
                <Card isElevated className="p-0 overflow-hidden">
                    <div className="px-8 py-6 border-b border-white/[0.05] bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">VERIFICATION DOCUMENTS</h3>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div
                                    className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-inner cursor-pointer"
                                >
                                    {user.cnic_front_url ? (
                                        <img src={user.cnic_front_url} alt="CNIC Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Front side missing</span>
                                        </div>
                                    )}

                                    {/* Overlays */}
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                        <div className="flex gap-4">
                                            {user.cnic_front_url && (
                                                <button
                                                    title="View Identity Document"
                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(user.cnic_front_url); }}
                                                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                                                >
                                                    <IconMaximize size={24} />
                                                </button>
                                            )}
                                            {hasPermission('edit_users') && (
                                                <button
                                                    title={user.cnic_front_url ? 'Re-upload Document' : 'Upload Document'}
                                                    onClick={(e) => { e.stopPropagation(); handleCNICClick('front'); }}
                                                    className="w-12 h-12 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
                                                    disabled={isCNICUploading.front}
                                                >
                                                    {isCNICUploading.front ? <IconLoader className="w-6 h-6 animate-spin" /> : <IconCamera size={24} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-[0.2em]">CNIC Front</p>
                            </div>
                            <div className="space-y-3">
                                <div
                                    className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-inner cursor-pointer"
                                >
                                    {user.cnic_back_url ? (
                                        <img src={user.cnic_back_url} alt="CNIC Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Back side missing</span>
                                        </div>
                                    )}

                                    {/* Overlays */}
                                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                        <div className="flex gap-4">
                                            {user.cnic_back_url && (
                                                <button
                                                    title="View Identity Document"
                                                    onClick={(e) => { e.stopPropagation(); setPreviewImage(user.cnic_back_url); }}
                                                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                                                >
                                                    <IconMaximize size={24} />
                                                </button>
                                            )}
                                            {hasPermission('edit_users') && (
                                                <button
                                                    title={user.cnic_back_url ? 'Re-upload Document' : 'Upload Document'}
                                                    onClick={(e) => { e.stopPropagation(); handleCNICClick('back'); }}
                                                    className="w-12 h-12 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
                                                    disabled={isCNICUploading.back}
                                                >
                                                    {isCNICUploading.back ? <IconLoader className="w-6 h-6 animate-spin" /> : <IconCamera size={24} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-[0.2em]">CNIC Back</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Image Preview Modal */}
            <Modal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                title="Document Preview"
                size="xl"
            >
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-2xl">
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Document Preview"
                            className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500"
                        />
                    )}
                </div>
            </Modal>

            {/* Payout Strategy Section */}
            {isPaymentRole && (
                <div className="w-full">
                    <ElevatedMetallicCard
                        title="Payout Configuration"
                        bodyClassName="p-8 space-y-8"
                        className="w-full"
                    >
                        <div className="space-y-8">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/5">
                                    <IconDollar size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-white tracking-tight leading-none">Earnings Strategy</h3>
                                    <p className="text-xs text-gray-500 font-medium tracking-tight">Select how project earnings should be computed for this specific user</p>
                                </div>
                            </div>

                            {/* Strategy Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button 
                                    onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'slab' }))}
                                    className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'slab' 
                                        ? 'bg-black/40 border-brand-primary/40 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]' 
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] opacity-50 hover:opacity-100'}`}
                                >
                                    <div className={`p-3 rounded-xl ${payoutData.strategy === 'slab' ? 'bg-brand-primary/20 text-brand-primary shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                        <IconChartBar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white mb-1">Standard (Slab)</p>
                                        <p className="text-[10px] leading-relaxed text-gray-500 font-bold uppercase tracking-widest opacity-60">Uses your defined pricing slabs</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'tiered' }))}
                                    className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'tiered' 
                                        ? 'bg-black/40 border-emerald-500/40 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]' 
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] opacity-50 hover:opacity-100'}`}
                                >
                                    <div className={`p-3 rounded-xl ${payoutData.strategy === 'tiered' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                        <IconZap size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white mb-1">Tiered (Auto)</p>
                                        <p className="text-[10px] leading-relaxed text-gray-500 font-bold uppercase tracking-widest opacity-60">Rule-based automation</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'fixed' }))}
                                    className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'fixed' 
                                        ? 'bg-black/40 border-amber-500/40 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]' 
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] opacity-50 hover:opacity-100'}`}
                                >
                                    <div className={`p-3 rounded-xl ${payoutData.strategy === 'fixed' ? 'bg-amber-500/20 text-amber-400 shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                        <IconLock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white mb-1">Flat-Rate (Fixed)</p>
                                        <p className="text-[10px] leading-relaxed text-gray-500 font-bold uppercase tracking-widest opacity-60">Fixed price for every project</p>
                                    </div>
                                </button>
                            </div>

                            {/* Fixed Amount Input */}
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${payoutData.strategy === 'fixed' ? 'max-h-40 opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                                <div className="p-6 rounded-2xl bg-black/40 border border-amber-500/10 space-y-4 shadow-inner">
                                    <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.2em]">Defined Fixed Price</p>
                                    <div className="flex items-center gap-4">
                                        <Input 
                                            type="number"
                                            variant="metallic"
                                            placeholder="0.00"
                                            className="max-w-[240px]"
                                            leftIcon={<span className="text-amber-500 font-black">$</span>}
                                            value={payoutData.rate}
                                            onChange={(e) => setPayoutData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                                        />
                                        <p className="text-xs text-gray-500 italic mt-auto pb-4">Amount to be paid per project assigned to this user.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button 
                                    variant="metallic"
                                    size="sm"
                                    className="px-12 shadow-lg shadow-brand-primary/10"
                                    onClick={handleUpdatePayout}
                                    isLoading={isSavingPayout}
                                >
                                    Save Configuration
                                </Button>
                            </div>
                        </div>
                    </ElevatedMetallicCard>
                </div>
            )}

            {/* Account Management */}
            {(canEdit || canDelete) && (
                <div className="w-full">
                    <ElevatedMetallicCard
                        title="Quick Actions"
                        bodyClassName="p-8 space-y-8"
                        className="w-full"
                    >
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-4">
                                    {user.status === 'Pending' ? (
                                        <>
                                            {canEdit && (
                                                <>
                                                    <Button
                                                        variant="metallic"
                                                        className="px-8 !bg-gradient-to-b !from-emerald-500 !to-emerald-700 !border-emerald-600 text-white !shadow-none hover:shadow-none"
                                                        onClick={() => handleUpdateStatus('Active')}
                                                        isLoading={updating}
                                                    >
                                                        Approve User
                                                    </Button>
                                                    <Button
                                                        variant="recessed"
                                                        className="text-orange-500 hover:bg-orange-500/10"
                                                        onClick={() => handleUpdateStatus('Deactivated')}
                                                        isLoading={updating}
                                                    >
                                                        Deactivate User
                                                    </Button>
                                                </>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="recessed"
                                                    className="text-brand-error hover:bg-brand-error/10"
                                                    leftIcon={<IconTrash className="w-4 h-4" />}
                                                    onClick={handleDeleteUser}
                                                    isLoading={updating}
                                                >
                                                    Remove User Permanently
                                                </Button>
                                            )}
                                        </>
                                    ) : user.status === 'Active' ? (
                                        <>
                                            {canEdit && (
                                                <Button
                                                    variant="recessed"
                                                    className="text-orange-500 hover:bg-orange-500/10"
                                                    onClick={() => handleUpdateStatus('Deactivated')}
                                                    isLoading={updating}
                                                >
                                                    Deactivate User
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="recessed"
                                                    className="text-brand-error hover:bg-brand-error/10"
                                                    leftIcon={<IconTrash className="w-4 h-4" />}
                                                    onClick={handleDeleteUser}
                                                    isLoading={updating}
                                                >
                                                    Remove User Permanently
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {canEdit && (
                                                <Button
                                                    variant="metallic"
                                                    className="px-8 !bg-gradient-to-b !from-emerald-500 !to-emerald-700 !border-emerald-600 text-white !shadow-none hover:shadow-none"
                                                    onClick={() => handleUpdateStatus('Active')}
                                                    isLoading={updating}
                                                >
                                                    Activate User
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="recessed"
                                                    className="text-brand-error hover:bg-brand-error/10"
                                                    leftIcon={<IconTrash className="w-4 h-4" />}
                                                    onClick={handleDeleteUser}
                                                    isLoading={updating}
                                                >
                                                    Remove User Permanently
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="mt-12">
                                    <Card className="bg-yellow-500/10 border-yellow-500/20 p-4">
                                        <div className="flex items-start gap-3">
                                            <IconAlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wide">Warning: Danger Zone</h4>
                                                <p className="text-xs text-yellow-500/80 leading-relaxed">
                                                    Actions performed here can affect the user's access and data. Deleting a user is permanent and cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </ElevatedMetallicCard>
                </div>
            )}
            <input
                type="file"
                ref={cnicFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCNICFileChange}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="md"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shadow-xl shadow-red-500/10 border border-red-500/20">
                            <IconTrash size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Permanently Delete User?</h3>
                            <p className="text-gray-400 text-sm leading-relaxed px-4">
                                Are you sure you want to delete <span className="text-white font-semibold">{user?.name}</span>?
                                This action is irreversible and will remove all associated profile data.
                            </p>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3">
                        <IconAlertTriangle className="text-yellow-500 shrink-0 w-5 h-5" />
                        <p className="text-[11px] text-yellow-500/80 leading-relaxed font-medium">
                            Warning: Historical data like completed projects will persist with a <span className="text-yellow-500 font-bold">NULL</span> reference to maintain record integrity.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="recessed"
                            className="flex-1 h-11 border-white/5 hover:bg-white/5"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            className="flex-1 !bg-gradient-to-b !from-red-500 !to-red-700 !border-red-600 text-white h-11 shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
                            onClick={executeDeleteUser}
                            isLoading={updating}
                        >
                            Delete User
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserDetails;
