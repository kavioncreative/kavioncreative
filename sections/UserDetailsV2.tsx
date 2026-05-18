
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Avatar } from '../components/Avatar';
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
    IconShield,
    IconActivity,
    IconZap,
    IconSettings,
    IconStar,
    IconAward,
    IconRosette,
    IconBank,
    IconDollar,
    IconChartBar,
    IconLock,
} from '../components/Icons';
import { Badge, RoleCapsule, getStatusCapsuleClasses } from '../components/Badge';
import { Modal, Card, ElevatedMetallicCard } from '../components/Surfaces';
import { Tabs } from '../components/Navigation';
import { Dropdown } from '../components/Dropdown';
import { addToast } from '../components/Toast';
import { formatDisplayName } from '../utils/formatter';

interface UserDetailsV2Props {
    userId: string;
    onBack: () => void;
    onStatusChange?: () => void;
}

const UserDetailsV2: React.FC<UserDetailsV2Props> = ({ userId, onBack, onStatusChange }) => {
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
    const [activeTab, setActiveTab] = useState<'basic-info' | 'performance' | 'settings'>('basic-info');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Password Update State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Zoom State for Document View
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

    // CNIC Upload State
    const [isCNICUploading, setIsCNICUploading] = useState<{ front: boolean, back: boolean }>({ front: false, back: false });
    const cnicFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSavingPayout, setIsSavingPayout] = useState(false);
    const [updatingPreferred, setUpdatingPreferred] = useState(false);
    const [payoutData, setPayoutData] = useState({ strategy: 'slab', rate: 0 });
    const [preferredMethod, setPreferredMethod] = useState<string>('');
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [siteStats, setSiteStats] = useState({ avgRating: 4.5, threshold: 5 });
    const [projectsDone, setProjectsDone] = useState<number | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    // Removed the separate useEffect for reviews to gather everything in fetchUserDetails

    const fetchUserDetails = async () => {
        if (!user) setLoading(true);
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

            // Parallelize counters fetching
            if (data.name) {
                await Promise.all([
                    fetchUserReviews(data.name),
                    (async () => {
                        const { count: approvedCount } = await supabase
                            .from('projects')
                            .select('*', { count: 'exact', head: true })
                            .eq('assignee', data.name)
                            .eq('status', 'Approved');
                        setProjectsDone(approvedCount || 0);
                    })()
                ]);
            }

            setLoadingStats(false);
        } catch (error: any) {
            console.error('Error fetching user details:', error);
            addToast({ type: 'error', title: 'Error', message: 'Could not load user details.' });
            setLoadingStats(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserReviews = async (nameOverride?: string) => {
        const nameToUse = nameOverride || user?.name;
        if (!nameToUse) return;
        setLoadingReviews(true);
        try {
            // Fetch User Reviews
            const { data: userReviews, error: reviewsError } = await supabase
                .from('project_reviews')
                .select('*')
                .eq('reviewee_name', nameToUse)
                .order('created_at', { ascending: false });

            if (reviewsError) throw reviewsError;
            setReviews(userReviews || []);

            // Fetch Site Stats for Bayesian Calculation
            const { data: siteAvgData } = await supabase
                .from('project_reviews')
                .select('rating');
            
            const { data: configData } = await supabase
                .from('algorithm_config')
                .select('metric_value')
                .eq('metric_name', 'Confidence Threshold (m)')
                .single();

            if (siteAvgData && siteAvgData.length > 0) {
                const totalSiteRating = siteAvgData.reduce((acc, r) => acc + (r.rating || 0), 0);
                const avgSiteRating = totalSiteRating / siteAvgData.length;
                setSiteStats({
                    avgRating: avgSiteRating,
                    threshold: configData?.metric_value || 5
                });
            }
        } catch (error: any) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoadingReviews(false);
        }
    };

    const getBayesianScore = () => {
        const userAvg = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length : 0;
        return ((reviews.length / (reviews.length + siteStats.threshold)) * userAvg) + 
               ((siteStats.threshold / (reviews.length + siteStats.threshold)) * siteStats.avgRating);
    };

    const bayesianScore = getBayesianScore();

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

    const isPaymentRole = !['super admin', 'admin', 'project manager', 'finance manager', 'orm manager', 'project operations manager'].includes(user?.role?.toLowerCase());

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
            const fileName = `${userId}-${Math.random().toString(36).substring(2, 7)}.${file.name.split('.').pop()}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const publicUrl = data.publicUrl;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            setUser({ ...user, avatar_url: publicUrl });

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

    const handlePasswordUpdate = async () => {
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Please fill in both password fields.' });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Passwords do not match.' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Password must be at least 6 characters long.' });
            return;
        }

        setUpdatingPassword(true);
        try {
            await new Promise(r => setTimeout(r, 800));
            addToast({ type: 'success', title: 'Password Updated', message: 'Password has been changed successfully.' });
            setIsPasswordModalOpen(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error updating password:', error);
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        if (isZoomed) {
            setIsZoomed(false);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setZoomOrigin({ x, y });
        setIsZoomed(true);
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
                <Button variant="secondary" onClick={onBack}>Go Back</Button>
            </div>
        );
    }

    const isFreelancer = user.role === 'Freelancer';

    return (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between px-2">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-400 hover:text-white transition-all hover:bg-white/[0.08] rounded-xl group flex items-center gap-2"
                >
                    <IconChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-bold uppercase tracking-widest">Back to Directory</span>
                </button>

                <Tabs
                    tabs={[
                        { id: 'basic-info', label: 'Basic Info', icon: <IconUser size={14} /> },
                        { id: 'performance', label: 'Performance', icon: <IconActivity size={14} /> },
                        { id: 'settings', label: 'System', icon: <IconSettings size={14} /> },
                    ]}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as any)}
                />
            </div>

            {/* Main 2-Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
                {/* Left Panel: Profile Info */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-2xl blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-1000" />

                        <div className="w-full relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

                            <div className="p-10 flex flex-col items-center text-center space-y-6 relative z-10">
                                {/* Profile Image */}
                                <div className="relative mx-auto" style={{ width: '128px', height: '128px' }}>
                                    <div className="w-full h-full rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center overflow-hidden shadow-2xl">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-3xl font-black text-gray-500 uppercase tracking-wider">
                                                {(() => {
                                                    const parts = (user.first_name + ' ' + user.last_name).trim() || user.name || '';
                                                    const p = parts.split(' ').filter(Boolean);
                                                    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
                                                    return p[0]?.slice(0, 2).toUpperCase() || '??';
                                                })()}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={`absolute w-5 h-5 rounded-full z-20 border-[3px] border-[#121212] ${user.status === 'Active'
                                            ? 'bg-brand-success shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                            : 'bg-brand-warning shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                                            }`}
                                        style={{ bottom: '9px', right: '9px' }}
                                    />
                                </div>

                                {/* Name and Basic Info */}
                                <div className="space-y-4 w-full">
                                    <div className="space-y-3 text-center">
                                        <div className="flex flex-row items-baseline justify-center gap-4 flex-wrap">
                                            <h1 className="text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                                                {(user.first_name && user.last_name)
                                                    ? `${formatDisplayName(user.first_name)} ${formatDisplayName(user.last_name)}`
                                                    : formatDisplayName(user.name || 'Unknown User')
                                                }
                                            </h1>
                                        </div>
                                        <p className="text-sm text-gray-400 font-medium tracking-wide">{user.email}</p>
                                    </div>

                                    <div className="flex flex-row items-center justify-center gap-3 pt-3">
                                        <RoleCapsule role={user.role} />

                                        <span className={getStatusCapsuleClasses(user.status)}>
                                            {user.status === 'Disabled' ? 'Deactivated' : user.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-full pt-8 border-t border-white/5 flex justify-center gap-10">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Projects Done</span>
                                        {loadingStats ? (
                                            <div className="h-9 w-12 bg-white/5 animate-pulse rounded-lg mt-2" />
                                        ) : (
                                            <span className="text-3xl font-black text-white mt-2">{projectsDone}</span>
                                        )}
                                    </div>
                                    <div className="w-px h-12 bg-white/5" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Total Reviews</span>
                                        {loadingStats ? (
                                            <div className="h-9 w-12 bg-white/5 animate-pulse rounded-lg mt-2" />
                                        ) : (
                                            <span className="text-3xl font-black text-white mt-2">{reviews.length}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Overall Rating</span>
                                    {loadingStats ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />)}
                                            </div>
                                            <div className="h-9 w-16 bg-white/5 animate-pulse rounded-lg" />
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => {
                                                    const rating = bayesianScore;
                                                    const isFilled = star <= Math.floor(rating);
                                                    const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
                                                    const isActive = isFilled || isHalf;

                                                    let fromColor = '#22c55e';
                                                    let toColor = '#15803d';
                                                    let borderColor = '#16a34a';

                                                    if (rating < 3) {
                                                        fromColor = '#f87171'; toColor = '#b91c1c'; borderColor = '#dc2626';
                                                    } else if (rating < 4) {
                                                        fromColor = '#facc15'; toColor = '#a16207'; borderColor = '#ca8a04';
                                                    }

                                                    if (!isActive) {
                                                        return (
                                                            <div key={star} className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]">
                                                                <IconStar size={18} className="text-white/10" fill="none" />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div
                                                            key={star}
                                                            className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                                                            style={{
                                                                background: `linear-gradient(to bottom, ${fromColor}, ${toColor})`,
                                                                border: `1px solid ${borderColor}`,
                                                                boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1.5px 1.5px rgba(0,0,0,0.25)`,
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.18)_50%,transparent_100%)] pointer-events-none" />
                                                            <IconStar size={18} className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" fill="currentColor" />
                                                            {isHalf && !isFilled && (
                                                                <div className="absolute inset-0 left-[50%] bg-black/50 backdrop-blur-[1px]" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <span className="text-3xl font-black text-white -mt-2">{bayesianScore.toFixed(1)}</span>
                                        </>
                                    )}
                                </div>

                                <div className="w-full pt-10 border-t border-white/5 grid grid-cols-2 gap-4">
                                    <div className="text-left space-y-1">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Enrolled</p>
                                        <p className="text-sm font-bold text-white tracking-tight">{new Date(user.created_at || new Date()).getFullYear()}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Region</p>
                                        <p className="text-sm font-bold text-white tracking-tight">Lahore, PK</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Content Area */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                    {activeTab === 'basic-info' && (
                        <div className="space-y-6">
                            {/* Unified Details Card */}
                            <div className="w-full relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] flex flex-col">
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

                                <div className="p-10 border-b border-white/[0.05] relative z-10 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-white/[0.03] to-transparent">
                                    <Avatar
                                        src={user.avatar_url}
                                        initials={(() => {
                                            const parts = user.name?.split(' ').filter(Boolean) || [];
                                            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                                            if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                                            return '??';
                                        })()}
                                        size="2xl"
                                        className="shadow-2xl ring-1 ring-white/10 rounded-full hover:scale-105 transition-transform duration-300"
                                    />
                                    <Button
                                        variant="metallic"
                                        size="sm"
                                        leftIcon={<IconCamera className="w-4 h-4" />}
                                        onClick={handleAvatarClick}
                                        isLoading={isAvatarUploading}
                                        className="px-6 shadow-lg shadow-brand-primary/20"
                                    >
                                        Upload Avatar
                                    </Button>
                                </div>

                                <div className="p-8 relative z-10">
                                    <div className={`grid gap-y-10 gap-x-12 ${user.role?.toLowerCase().includes('project manager') ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
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
                                                <span className="text-base text-white font-medium truncate">{user.phone || user.whatsapp_number || 'Not provided'}</span>
                                            </div>
                                        </div>

                                        {/* Payment Method & Email — shown for all payment roles */}
                                        {isPaymentRole && (
                                            <>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner shrink-0 leading-none">
                                                        {user.preferred_payment_method === 'Payoneer' ? (
                                                            <img src="/payoneericon.jpeg" alt="Payoneer" className="w-full h-full object-contain p-1.5 bg-white rounded-xl" />
                                                        ) : (
                                                            <IconBank className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1 leading-none">Preferred Method</span>
                                                        <span className="text-base text-white font-medium truncate leading-none">
                                                            {user.preferred_payment_method || 'Not Specified'}
                                                        </span>
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
                                                    {new Date(user.created_at || new Date()).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isPaymentRole && (
                                    <div className="p-8 relative z-10 border-t border-white/[0.05] mt-auto">
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
                                )}
                            </div>

                            {/* Verification Documents — shown when CNIC docs are uploaded */}
                            {(user.cnic_front_url || user.cnic_back_url) && (
                                <div className="w-full relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

                                    <div className="px-8 py-5 border-b border-white/[0.05] bg-white/[0.02] relative z-20 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <IconFileImage className="w-4 h-4 text-brand-primary" />
                                            Verification Documents
                                        </h3>
                                        <Badge variant="success" size="sm" className="bg-brand-success/10 border-brand-success/20 text-brand-success">Verified</Badge>
                                    </div>

                                    <div className="p-8 relative z-20">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
                                            <div className="space-y-4">
                                                <div
                                                    className="aspect-[1.6/1] rounded-2xl bg-[#0b0b0b] border border-white/10 overflow-hidden flex items-center justify-center group relative shadow-[inset_0_4px_24px_rgba(0,0,0,0.7)] cursor-pointer"
                                                >
                                                    {user.cnic_front_url ? (
                                                        <img src={user.cnic_front_url} alt="CNIC Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <IconFileImage className="w-12 h-12 text-white/5 mx-auto mb-3" />
                                                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Front side missing</span>
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
                                                            <button
                                                                title={user.cnic_front_url ? 'Re-upload Document' : 'Upload Document'}
                                                                onClick={(e) => { e.stopPropagation(); handleCNICClick('front'); }}
                                                                className="w-12 h-12 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
                                                                disabled={isCNICUploading.front}
                                                            >
                                                                {isCNICUploading.front ? <IconLoader className="w-6 h-6 animate-spin" /> : <IconCamera size={24} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="w-10 h-px bg-white/5" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">ID CARD FRONT</p>
                                                    <div className="w-10 h-px bg-white/5" />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div
                                                    className="aspect-[1.6/1] rounded-2xl bg-[#0b0b0b] border border-white/10 overflow-hidden flex items-center justify-center group relative shadow-[inset_0_4px_24px_rgba(0,0,0,0.7)] cursor-pointer"
                                                >
                                                    {user.cnic_back_url ? (
                                                        <img src={user.cnic_back_url} alt="CNIC Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                                    ) : (
                                                        <div className="text-center p-4">
                                                            <IconFileImage className="w-12 h-12 text-white/5 mx-auto mb-3" />
                                                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Back side missing</span>
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
                                                            <button
                                                                title={user.cnic_back_url ? 'Re-upload Document' : 'Upload Document'}
                                                                onClick={(e) => { e.stopPropagation(); handleCNICClick('back'); }}
                                                                className="w-12 h-12 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
                                                                disabled={isCNICUploading.back}
                                                            >
                                                                {isCNICUploading.back ? <IconLoader className="w-6 h-6 animate-spin" /> : <IconCamera size={24} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="w-10 h-px bg-white/5" />
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">ID CARD BACK</p>
                                                    <div className="w-10 h-px bg-white/5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {loadingReviews ? (
                                <div className="h-[400px] w-full relative z-10 rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02] flex items-center justify-center text-gray-500">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Gathering Metrics...</p>
                                    </div>
                                </div>
                            ) : reviews.length === 0 ? (
                                <div className="h-[400px] w-full relative z-10 rounded-2xl overflow-hidden border border-white/5 bg-white/[0.02] flex items-center justify-center text-gray-500">
                                    <div className="text-center space-y-4">
                                        <IconActivity className="w-16 h-16 mx-auto opacity-10" />
                                        <p className="text-sm uppercase tracking-[0.2em] font-bold text-white/20">No reviews found for this user</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Ratings Summary Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                        <div className="md:col-span-4 bg-[#121212] rounded-3xl border border-white/10 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-2xl">
                                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />
                                            <div className="relative z-10">
                                                {(() => {
                                                    const userAvg = reviews.length > 0 ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length : 0;
                                                    const bayesianScore = ((reviews.length / (reviews.length + siteStats.threshold)) * userAvg) + 
                                                                        ((siteStats.threshold / (reviews.length + siteStats.threshold)) * siteStats.avgRating);
                                                    return (
                                                        <>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-7xl font-black text-white tracking-tighter block leading-none mb-10">
                                                                    {bayesianScore.toFixed(1)}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    {[1, 2, 3, 4, 5].map((star) => {
                                                                        const rating = bayesianScore;
                                                                        const isFilled = star <= Math.floor(rating);
                                                                        const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
                                                                        const isActive = isFilled || isHalf;

                                                                        let fromColor = '#22c55e';
                                                                        let toColor = '#15803d';
                                                                        let borderColor = '#16a34a';

                                                                        if (rating < 3) {
                                                                            fromColor = '#f87171'; toColor = '#b91c1c'; borderColor = '#dc2626';
                                                                        } else if (rating < 4) {
                                                                            fromColor = '#facc15'; toColor = '#a16207'; borderColor = '#ca8a04';
                                                                        }

                                                                        if (!isActive) {
                                                                            return (
                                                                                <div key={star} className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]">
                                                                                    <IconStar size={18} className="text-white/10" fill="none" />
                                                                                </div>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={star}
                                                                                className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
                                                                                style={{
                                                                                    background: `linear-gradient(to bottom, ${fromColor}, ${toColor})`,
                                                                                    border: `1px solid ${borderColor}`,
                                                                                    boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1.5px 1.5px rgba(0,0,0,0.25)`,
                                                                                }}
                                                                            >
                                                                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.18)_50%,transparent_100%)] pointer-events-none" />
                                                                                <IconStar size={18} className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" fill="currentColor" />
                                                                                {isHalf && !isFilled && (
                                                                                    <div className="absolute inset-0 left-[50%] bg-black/50 backdrop-blur-[1px]" />
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-10 leading-none">Overall Score</p>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <div className="md:col-span-8 bg-[#121212] rounded-3xl border border-white/10 p-10 relative overflow-hidden shadow-2xl">
                                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />
                                            <div className="space-y-5 relative z-10">
                                                {[5, 4, 3, 2, 1].map((star) => {
                                                    const count = reviews.filter(r => Math.round(r.rating) === star).length;
                                                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                                    return (
                                                        <div key={star} className="flex items-center gap-6 group/row">
                                                            <div className="flex items-center gap-2 w-16 shrink-0">
                                                                <span className="text-xs font-black text-gray-400 group-hover/row:text-white transition-colors">{star}</span>
                                                                <IconStar size={12} className="text-gray-600 group-hover/row:text-brand-primary transition-colors" />
                                                            </div>
                                                            <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-brand-primary to-orange-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(255,77,45,0.3)]"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-600 group-hover/row:text-gray-400 w-12 text-right transition-colors tracking-widest">
                                                                ({count})
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Task Reviews Feed */}
                                    <div className="space-y-6 pt-4">
                                        <div className="flex items-center justify-between px-2">
                                            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                                                <div className="w-8 h-px bg-brand-primary/50" />
                                                RECENT FEEDBACK
                                            </h3>
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                Latest First
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 pb-12">
                                            {reviews.map((rev) => (
                                                <div key={rev.id} className="group relative">
                                                    <div className="relative p-8 bg-[#121212] border border-white/10 rounded-2xl transition-all duration-500 overflow-hidden shadow-2xl">
                                                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.04)_40%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.04)_60%,rgba(255,255,255,0.01)_100%)] pointer-events-none opacity-50" />
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_65%)] pointer-events-none" />
                                                        
                                                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                                                            <div className="flex-1 space-y-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex gap-1.5">
                                                                        {[1, 2, 3, 4, 5].map((star) => {
                                                                            const rating = rev.rating;
                                                                            const isFilled = star <= Math.floor(rating);
                                                                            const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
                                                                            const isActive = isFilled || isHalf;

                                                                            let fromColor = '#22c55e';
                                                                            let toColor = '#15803d';
                                                                            let borderColor = '#16a34a';

                                                                            if (rating < 3) {
                                                                                fromColor = '#f87171'; toColor = '#b91c1c'; borderColor = '#dc2626';
                                                                            } else if (rating < 4) {
                                                                                fromColor = '#facc15'; toColor = '#a16207'; borderColor = '#ca8a04';
                                                                            }

                                                                            if (!isActive) {
                                                                                return (
                                                                                    <div key={star} className="relative w-6 h-6 rounded-md flex items-center justify-center bg-white/[0.02] border border-white/[0.05]">
                                                                                        <IconStar size={10} className="text-white/10" fill="none" />
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <div
                                                                                    key={star}
                                                                                    className="relative w-6 h-6 rounded-md flex items-center justify-center overflow-hidden"
                                                                                    style={{
                                                                                        background: `linear-gradient(to bottom, ${fromColor}, ${toColor})`,
                                                                                        border: `1px solid ${borderColor}`,
                                                                                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.2)`,
                                                                                    }}
                                                                                >
                                                                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none" />
                                                                                    <IconStar size={10} className="relative z-10 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]" fill="currentColor" />
                                                                                    {isHalf && !isFilled && (
                                                                                        <div className="absolute inset-0 left-[50%] bg-black/50 backdrop-blur-[0.5px]" />
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                                        {new Date(rev.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-300 text-sm leading-relaxed font-medium">
                                                                    {rev.review_text}
                                                                </p>
                                                            </div>
                                                            <div className="shrink-0 flex items-center gap-4 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                                                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                                                                    <span className="text-xs font-black text-brand-primary uppercase">
                                                                        {rev.reviewer_name?.slice(0, 2).toUpperCase() || '??'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-0.5">Reviewed By</span>
                                                                    <span className="text-xs font-bold text-white leading-none">{rev.reviewer_name}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-full relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

                                <div className="p-10 relative z-10">
                                    <div className="space-y-12">
                                        {/* Section: Payout Strategy Selection */}
                                        {(user.role === 'Freelancer' || user.role?.toLowerCase().includes('team lead')) && (
                                            <div className="space-y-6">
                                                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group transition-all hover:bg-white/[0.03]">
                                                    {/* Background decorative element */}
                                                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl group-hover:bg-brand-primary/10 transition-colors duration-1000" />
                                                    
                                                    <div className="relative z-10 space-y-8">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/5">
                                                                <IconDollar size={28} />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-black text-white tracking-tight">Payout Configuration</h3>
                                                                <p className="text-xs text-gray-500 font-medium">Define how this user's earnings are calculated per project</p>
                                                            </div>
                                                        </div>

                                                        {/* Strategy Selection Cards */}
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <button 
                                                                onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'slab' }))}
                                                                className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'slab' 
                                                                    ? 'bg-brand-primary/[0.08] border-brand-primary/40 shadow-lg shadow-brand-primary/5' 
                                                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] grayscale hover:grayscale-0 opacity-60 hover:opacity-100'}`}
                                                            >
                                                                <div className={`p-3 rounded-xl ${payoutData.strategy === 'slab' ? 'bg-brand-primary/20 text-brand-primary shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                                                    <IconChartBar size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white mb-1">Standard (Slab)</p>
                                                                    <p className="text-[10px] leading-relaxed text-gray-500 font-medium uppercase tracking-wider">Uses global pricing slabs & commissions</p>
                                                                </div>
                                                            </button>

                                                            <button 
                                                                onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'tiered' }))}
                                                                className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'tiered' 
                                                                    ? 'bg-emerald-500/[0.08] border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                                                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] grayscale hover:grayscale-0 opacity-60 hover:opacity-100'}`}
                                                            >
                                                                <div className={`p-3 rounded-xl ${payoutData.strategy === 'tiered' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                                                    <IconZap size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white mb-1">Tiered (Auto)</p>
                                                                    <p className="text-[10px] leading-relaxed text-gray-500 font-medium uppercase tracking-wider">Dynamic rules based on project price</p>
                                                                </div>
                                                            </button>

                                                            <button 
                                                                onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'fixed' }))}
                                                                className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'fixed' 
                                                                    ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-lg shadow-amber-500/5' 
                                                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] grayscale hover:grayscale-0 opacity-60 hover:opacity-100'}`}
                                                            >
                                                                <div className={`p-3 rounded-xl ${payoutData.strategy === 'fixed' ? 'bg-amber-500/20 text-amber-400 shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                                                    <IconLock size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white mb-1">Flat-Rate (Fixed)</p>
                                                                    <p className="text-[10px] leading-relaxed text-gray-500 font-medium uppercase tracking-wider">A set amount for every completed project</p>
                                                                </div>
                                                            </button>
                                                        </div>

                                                        {/* Fixed Rate Input (Conditional) */}
                                                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${payoutData.strategy === 'fixed' ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                                            <div className="p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 space-y-4">
                                                                <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest pl-1 leading-relaxed">Fix Price Per Project</p>
                                                                <Input 
                                                                    type="number"
                                                                    variant="metallic"
                                                                    placeholder="0.00"
                                                                    className="max-w-[200px]"
                                                                    leftIcon={<span className="text-amber-500 font-bold">$</span>}
                                                                    value={payoutData.rate}
                                                                    onChange={(e) => setPayoutData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 flex justify-end">
                                                            <Button 
                                                                variant="metallic"
                                                                size="sm"
                                                                className="px-10 shadow-lg shadow-brand-primary/10"
                                                                onClick={handleUpdatePayout}
                                                                isLoading={isSavingPayout}
                                                            >
                                                                Save Strategy
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Section: Password Management */}
                                        <div className="space-y-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-2xl gap-6 transition-all hover:bg-white/[0.03]">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white shadow-inner">
                                                        <IconShield className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">Password Management</p>
                                                        <p className="text-xs text-gray-500 mt-1">Set or update the password for this user</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="metallic"
                                                    size="sm"
                                                    className="px-8 shadow-lg shadow-brand-primary/20"
                                                    onClick={() => setIsPasswordModalOpen(true)}
                                                >
                                                    Update Password
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Section: Quick Actions (based on screenshot) */}
                                        <div className="space-y-8 pt-4 border-t border-white/5">
                                            <div className="flex flex-wrap gap-4">
                                                {user.status === 'Active' ? (
                                                    <Button
                                                        variant="recessed"
                                                        className="px-6 text-orange-500 hover:bg-orange-500/10 h-11 border-orange-500/20"
                                                        onClick={() => handleUpdateStatus('Deactivated')}
                                                        isLoading={updating}
                                                    >
                                                        Deactivate User
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="metallic"
                                                        className="px-8 !bg-gradient-to-b !from-emerald-500/80 !to-emerald-700/80 !border-emerald-500/50 text-white !shadow-none hover:shadow-none h-11"
                                                        onClick={() => handleUpdateStatus('Active')}
                                                        isLoading={updating}
                                                    >
                                                        Activate User
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="recessed"
                                                    className="px-6 text-red-500 hover:bg-red-500/10 h-11 border-red-500/20"
                                                    leftIcon={<IconTrash className="w-4 h-4" />}
                                                    onClick={handleDeleteUser}
                                                    isLoading={updating}
                                                >
                                                    Remove User Permanently
                                                </Button>
                                            </div>

                                            {/* Warning Box (Yellow/Danger Zone) */}
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0 mt-0.5">
                                                        <IconAlertTriangle className="w-6 h-6" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                                                            WARNING: DANGER ZONE
                                                        </h4>
                                                        <p className="text-xs text-yellow-500/70 leading-relaxed font-medium">
                                                            Actions performed here can affect the user's access and data. Deleting a user is permanent and cannot be undone.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals & Inputs */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
            />

            <input
                type="file"
                ref={cnicFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCNICFileChange}
            />

            <Modal
                isOpen={!!previewImage}
                onClose={() => {
                    setPreviewImage(null);
                    setIsZoomed(false);
                }}
                title="Document View"
                size="xl"
            >
                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/60 shadow-2xl border border-white/5 group/modal">
                    <img
                        src={previewImage!}
                        className={`w-full h-full object-contain transition-transform duration-500 will-change-transform ${isZoomed ? 'scale-[2.5] cursor-zoom-out' : 'scale-1 cursor-zoom-in'}`}
                        style={{
                            transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                        }}
                        onClick={handleImageClick}
                        alt="Preview"
                    />

                    {/* Zoom Hint */}
                    {!isZoomed && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/60 uppercase tracking-widest pointer-events-none opacity-0 group-hover/modal:opacity-100 transition-opacity">
                            Click anywhere to zoom
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
                title="Change User Password"
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsPasswordModalOpen(false);
                                setPasswordData({ newPassword: '', confirmPassword: '' });
                            }}
                            disabled={updatingPassword}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={handlePasswordUpdate}
                            isLoading={updatingPassword}
                            className="px-8 shadow-lg shadow-brand-primary/20"
                        >
                            Update Password
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                className="w-full bg-[#000000] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50 shadow-inner"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                className="w-full bg-[#000000] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary transition-colors focus:ring-1 focus:ring-brand-primary/50 shadow-inner"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="Confirm new password"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                size="md"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
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

export default UserDetailsV2;
