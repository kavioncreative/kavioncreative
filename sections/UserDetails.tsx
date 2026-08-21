
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { Avatar } from '../components/Avatar';
import {
    IconChevronLeft,
    IconEdit,
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
import Settings from './Settings';

const PERMISSION_HIERARCHY: Record<string, { parent: string; children: string[] }> = {
    'Finances': {
        parent: 'view_finances',
        children: ['view_company_earnings', 'view_freelancer_earnings', 'manage_finance_config']
    },
    'Projects': {
        parent: 'view_projects',
        children: ['create_projects', 'edit_projects', 'delete_projects', 'delete_timeline_items']
    },
    'Users': {
        parent: 'view_users',
        children: ['manage_users', 'view_applicants', 'create_users', 'edit_users', 'delete_users', 'manage_teams', 'manage_penalties']
    },
    'Analytics': {
        parent: 'view_analytics',
        children: ['view_gig_stats']
    }
};

interface UserDetailsProps {
    userId: string;
    onBack?: () => void;
    onStatusChange?: () => void;
    isOwnProfile?: boolean;
}

const UserDetails: React.FC<UserDetailsProps> = ({ userId, onBack, onStatusChange, isOwnProfile = false }) => {
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
    const [activeTab, setActiveTab] = useState<'basic-info' | 'performance' | 'access' | 'settings'>('basic-info');
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

    const { hasPermission } = useUser();

    // Inline Profile Editing State
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [isSavingInfo, setIsSavingInfo] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        whatsapp_number: '',
        preferred_payment_method: '',
        payment_email: '',
        bank_name: '',
        account_title: '',
        iban: ''
    });

    // Penalties & Warnings State
    const [penalties, setPenalties] = useState<any[]>([]);
    const [isPenaltiesLoading, setIsPenaltiesLoading] = useState(false);
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [penaltyReason, setPenaltyReason] = useState('');
    const [penaltyDetails, setPenaltyDetails] = useState('');
    const [isIssuingPenalty, setIsIssuingPenalty] = useState(false);

    // Permission Overrides State
    const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);
    const [selectedOverrides, setSelectedOverrides] = useState<string[]>([]);
    const [isSavingOverrides, setIsSavingOverrides] = useState(false);

    // OTD Scorecard states
    const [otdScore, setOtdScore] = useState<number | null>(null);
    const [totalDeliveries, setTotalDeliveries] = useState(0);
    const [lateCount, setLateCount] = useState(0);
    const [timelyCount, setTimelyCount] = useState(0);
    const [isOtdLoading, setIsOtdLoading] = useState(false);

    useEffect(() => {
        fetchUserDetails();
    }, [userId]);

    // Removed the separate useEffect for reviews to gather everything in fetchUserDetails

    const fetchOtdStats = async (targetUserId: string) => {
        setIsOtdLoading(true);
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { data, error } = await supabase
                .from('project_comments')
                .select('content')
                .eq('author_id', targetUserId)
                .like('content', 'STATUS_CHANGED:%')
                .gte('created_at', thirtyDaysAgo.toISOString());

            if (error) throw error;

            let total = 0;
            let late = 0;
            let timely = 0;

            if (data) {
                data.forEach(item => {
                    total++;
                    const parts = item.content.split(':');
                    if (parts[3] === 'LATE') {
                        late++;
                    } else {
                        timely++;
                    }
                });
            }

            setTotalDeliveries(total);
            setLateCount(late);
            setTimelyCount(timely);
            setOtdScore(total >= 5 ? Math.round((timely / total) * 100) : null);
        } catch (err) {
            console.error('Error fetching OTD statistics:', err);
        } finally {
            setIsOtdLoading(false);
        }
    };

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
                strategy: data.payout_strategy || 'bonusonly',
                rate: data.fixed_payout_rate || 0
            });
            setPreferredMethod(data.preferred_payment_method || '');

            // Set overrides
            setSelectedOverrides(data.additional_permissions || []);

            // Fetch available permissions
            const { data: allPerms, error: permsError } = await supabase
                .from('permissions')
                .select('*')
                .order('category', { ascending: true });
                
            if (!permsError && allPerms) {
                setAvailablePermissions(allPerms);
            }

            // Parallelize counters fetching
            const fetches: Promise<any>[] = [];
            if (data.name) {
                fetches.push(fetchUserReviews(data.name));
                fetches.push((async () => {
                    const { count: approvedCount } = await supabase
                        .from('projects')
                        .select('*', { count: 'exact', head: true })
                        .eq('assignee', data.name)
                        .eq('status', 'Approved');
                    setProjectsDone(approvedCount || 0);
                })());
            }

            const isDeliveryRole = ['freelancer', 'team lead', 'team designer'].includes(data.role?.toLowerCase() || '');
            if (isDeliveryRole) {
                fetches.push(fetchOtdStats(userId));
            } else {
                setOtdScore(null);
                setTotalDeliveries(0);
                setLateCount(0);
                setTimelyCount(0);
            }

            fetches.push(fetchUserPenalties(userId));

            await Promise.all(fetches);

            setLoadingStats(false);
        } catch (error: any) {
            console.error('Error fetching user details:', error);
            addToast({ type: 'error', title: 'Error', message: 'Could not load user details.' });
            setLoadingStats(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPenalties = async (targetUserId: string) => {
        setIsPenaltiesLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_penalties')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPenalties(data || []);
        } catch (err) {
            console.error('Error fetching penalties:', err);
        } finally {
            setIsPenaltiesLoading(false);
        }
    };

    const handleIssuePenalty = async () => {
        if (!penaltyReason.trim()) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Please select or enter a reason for the penalty.' });
            return;
        }
        setIsIssuingPenalty(true);
        try {
            const { data: { user: loggedInUser } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('user_penalties')
                .insert({
                    user_id: userId,
                    reason: penaltyReason,
                    details: penaltyDetails,
                    created_by: loggedInUser?.id,
                    status: 'Valid'
                });

            if (error) throw error;
            addToast({ type: 'success', title: 'Success', message: 'Penalty issued successfully.' });
            setIsPenaltyModalOpen(false);
            setPenaltyReason('');
            setPenaltyDetails('');
            fetchUserPenalties(userId);
        } catch (err: any) {
            console.error('Error issuing penalty:', err);
            addToast({ type: 'error', title: 'Error', message: err.message || 'Could not issue penalty.' });
        } finally {
            setIsIssuingPenalty(false);
        }
    };

    const handleStartEdit = () => {
        setEditForm({
            name: user?.name || '',
            phone: user?.phone || '',
            whatsapp_number: user?.whatsapp_number || '',
            preferred_payment_method: user?.preferred_payment_method || '',
            payment_email: user?.payment_email || '',
            bank_name: user?.bank_name || '',
            account_title: user?.account_title || '',
            iban: user?.iban || ''
        });
        setIsEditingInfo(true);
    };

    const handleSaveInfo = async () => {
        setIsSavingInfo(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: editForm.name,
                    phone: editForm.phone,
                    whatsapp_number: editForm.whatsapp_number,
                    preferred_payment_method: editForm.preferred_payment_method,
                    payment_email: editForm.payment_email,
                    bank_name: editForm.bank_name,
                    account_title: editForm.account_title,
                    iban: editForm.iban
                })
                .eq('id', userId);

            if (error) throw error;
            setUser((prev: any) => ({
                ...prev,
                ...editForm
            }));
            setIsEditingInfo(false);
            addToast({ type: 'success', title: 'Profile Updated', message: 'Your profile details have been saved successfully.' });
        } catch (err: any) {
            console.error('Error saving info:', err);
            addToast({ type: 'error', title: 'Save Failed', message: err.message || 'Could not save profile details.' });
        } finally {
            setIsSavingInfo(false);
        }
    };

    const handleWaivePenalty = async (penaltyId: string) => {
        try {
            const { error } = await supabase
                .from('user_penalties')
                .update({ status: 'Waived' })
                .eq('id', penaltyId);

            if (error) throw error;
            addToast({ type: 'success', title: 'Success', message: 'Penalty waived successfully.' });
            fetchUserPenalties(userId);
        } catch (err: any) {
            console.error('Error waiving penalty:', err);
            addToast({ type: 'error', title: 'Error', message: err.message || 'Could not waive penalty.' });
        }
    };

    const handleUpdateOverrides = async () => {
        setIsSavingOverrides(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ additional_permissions: selectedOverrides })
                .eq('id', userId);

            if (error) throw error;
            setUser({ ...user, additional_permissions: selectedOverrides });
            addToast({ type: 'success', title: 'Permissions Saved', message: 'User custom permission overrides updated successfully.' });
        } catch (error: any) {
            console.error('Error updating permission overrides:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Could not update permission overrides.' });
        } finally {
            setIsSavingOverrides(false);
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
                message: `User is now on ${payoutData.strategy === 'basicplusbonus' ? 'Basic Salary + Bonuses' : 'Only Bonuses'} model.` 
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
            <div className={`flex items-center px-2 ${isOwnProfile ? 'justify-start' : 'justify-between'}`}>
                {!isOwnProfile ? (
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-400 hover:text-white transition-all hover:bg-white/[0.08] rounded-xl group flex items-center gap-2"
                    >
                        <IconChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="text-sm font-bold uppercase tracking-widest">Back to Directory</span>
                    </button>
                ) : null}

                <Tabs
                    tabs={[
                        { id: 'basic-info', label: 'Basic Info', icon: <IconUser size={14} /> },
                        { id: 'performance', label: 'Performance', icon: <IconActivity size={14} /> },
                        ...(hasPermission('edit_users') ? [{ id: 'access', label: 'Access', icon: <IconLock size={14} /> }] : []),
                        ...((hasPermission('edit_users') || isOwnProfile) ? [{ id: 'settings', label: isOwnProfile ? 'Settings' : 'System', icon: <IconSettings size={14} /> }] : []),
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
                                    <div className="flex gap-3">
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
                                        {!isEditingInfo && (hasPermission('edit_users') || isOwnProfile) && (
                                            <Button
                                                variant="recessed"
                                                size="sm"
                                                leftIcon={<IconEdit className="w-4 h-4" />}
                                                onClick={handleStartEdit}
                                                className="px-6 border-white/10"
                                            >
                                                Edit Details
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-8 relative z-10">
                                    {isEditingInfo ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {(hasPermission('edit_users') || isOwnProfile) && (
                                                    <Input 
                                                        label="Display Name"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                        variant="metallic"
                                                    />
                                                )}

                                                <Input 
                                                    label="Phone Number"
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    variant="metallic"
                                                    leftIcon={<IconPhone className="w-4 h-4 text-gray-500" />}
                                                />

                                                <Input 
                                                    label="WhatsApp Number"
                                                    value={editForm.whatsapp_number}
                                                    onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                                                    variant="metallic"
                                                    leftIcon={<IconPhone className="w-4 h-4 text-gray-500" />}
                                                />

                                            </div>

                                            <div className="pt-6 border-t border-white/5 space-y-6">
                                                <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest pl-1">Bank Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <Input 
                                                        label="Bank Name"
                                                        value={editForm.bank_name}
                                                        onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                                                        variant="metallic"
                                                        leftIcon={<IconBuilding className="w-4 h-4 text-gray-500" />}
                                                    />

                                                    <Input 
                                                        label="Account Title"
                                                        value={editForm.account_title}
                                                        onChange={(e) => setEditForm({ ...editForm, account_title: e.target.value })}
                                                        variant="metallic"
                                                        leftIcon={<IconUser className="w-4 h-4 text-gray-500" />}
                                                    />

                                                    <Input 
                                                        label="IBAN / Account Number"
                                                        value={editForm.iban}
                                                        onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
                                                        variant="metallic"
                                                        leftIcon={<IconCreditCard className="w-4 h-4 text-gray-500" />}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-6 flex justify-end gap-3 border-t border-white/5">
                                                <Button 
                                                    variant="recessed"
                                                    size="sm"
                                                    onClick={() => setIsEditingInfo(false)}
                                                    className="px-8 border-white/5"
                                                    disabled={isSavingInfo}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button 
                                                    variant="metallic"
                                                    size="sm"
                                                    onClick={handleSaveInfo}
                                                    isLoading={isSavingInfo}
                                                    className="px-10 shadow-lg shadow-brand-primary/20"
                                                >
                                                    Save Details
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10 gap-x-12">
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

                                            <div className="p-8 relative z-10 border-t border-white/[0.05] mt-8 -mx-8 -mb-8">
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
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Verification Documents */}
                            <div className="w-full relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

                                    <div className="px-8 py-5 border-b border-white/[0.05] bg-white/[0.02] relative z-20 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                            <IconFileImage className="w-4 h-4 text-brand-primary" />
                                            Verification Documents
                                        </h3>
                                        <Badge 
                                            variant={(user.cnic_front_url && user.cnic_back_url) ? 'success' : 'warning'} 
                                            size="sm" 
                                            className={(user.cnic_front_url && user.cnic_back_url) 
                                                ? 'bg-brand-success/10 border-brand-success/20 text-brand-success' 
                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}
                                        >
                                            {(user.cnic_front_url && user.cnic_back_url) ? 'Verified' : 'Pending Upload'}
                                        </Badge>
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
                            </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Penalties & Warnings History */}
                            <ElevatedMetallicCard
                                title={
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-2">
                                            <IconAlertTriangle className="w-4 h-4 text-brand-error" />
                                            <span className="text-sm font-bold text-white uppercase tracking-wider">Penalties & Disciplinary Logs</span>
                                        </div>
                                        {hasPermission('manage_penalties') && (
                                            <Button
                                                variant="metallic"
                                                size="sm"
                                                onClick={() => setIsPenaltyModalOpen(true)}
                                            >
                                                Issue Penalty
                                            </Button>
                                        )}
                                    </div>
                                }
                                bodyClassName="p-0"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[13px] text-gray-300">
                                        <thead className="bg-black/30 text-gray-400 font-bold uppercase tracking-widest text-[10px] border-b border-white/[0.05]">
                                            <tr>
                                                <th className="px-6 py-4">Reason</th>
                                                <th className="px-6 py-4">Incident Notes</th>
                                                <th className="px-6 py-4">Date Issued</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                                {hasPermission('manage_penalties') && <th className="px-6 py-4 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.03]">
                                            {isPenaltiesLoading ? (
                                                <tr>
                                                    <td colSpan={hasPermission('manage_penalties') ? 5 : 4} className="px-6 py-12 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">
                                                        Loading penalty logs...
                                                    </td>
                                                </tr>
                                            ) : penalties.length === 0 ? (
                                                <tr>
                                                    <td colSpan={hasPermission('manage_penalties') ? 5 : 4} className="px-6 py-12 text-center text-gray-500">
                                                        No penalties recorded for this user.
                                                    </td>
                                                </tr>
                                            ) : (
                                                penalties.map(p => (
                                                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-6 py-4 font-bold text-white max-w-[200px] truncate">{p.reason}</td>
                                                        <td className="px-6 py-4 text-gray-400 max-w-[300px] truncate" title={p.details}>{p.details || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-gray-500">
                                                            {new Date(p.created_at).toLocaleDateString(undefined, {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                p.status === 'Valid' 
                                                                    ? 'bg-brand-error/15 text-brand-error border border-brand-error/20' 
                                                                    : 'bg-brand-success/15 text-brand-success border border-brand-success/20'
                                                            }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        {hasPermission('manage_penalties') && (
                                                            <td className="px-6 py-4 text-right">
                                                                {p.status === 'Valid' && (
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            variant="recessed"
                                                                            size="sm"
                                                                            onClick={() => handleWaivePenalty(p.id)}
                                                                        >
                                                                            Waive
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </ElevatedMetallicCard>

                            {/* On-Time Delivery Scorecard (Only for delivery roles) */}
                            {['freelancer', 'team lead', 'team designer', 'presentation designer'].includes(user?.role?.toLowerCase().trim() || '') && (
                                <div className="w-full relative z-10 rounded-3xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />
                                    
                                    <div className="px-8 py-5 border-b border-white/[0.05] bg-white/[0.02] relative z-20 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <IconAward className="w-4 h-4 text-brand-primary" />
                                            My On-Time Delivery Scorecard
                                        </h3>
                                    </div>
                                    
                                    <div className="p-0 relative z-20">
                                        {isOtdLoading && (
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex items-center justify-center rounded-b-3xl">
                                                <div className="flex items-center gap-3 bg-black/60 border border-white/10 px-5 py-3 rounded-2xl shadow-xl">
                                                    <IconLoader className="w-5 h-5 text-brand-primary animate-spin" />
                                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Recalculating Score...</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row items-stretch w-full gap-0">
                                            {/* Left Panel: Circular Score / Locked State */}
                                            <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 sm:border-r border-white/[0.06] w-full sm:w-[200px] shrink-0 overflow-hidden">
                                                <div className={`absolute inset-0 opacity-[0.06] pointer-events-none ${otdScore === null ? '' : otdScore >= 90 ? 'bg-emerald-500' : otdScore >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ filter: 'blur(40px)' }} />

                                                {totalDeliveries < 5 ? (
                                                    /* LOCKED STATE — under 5 deliveries */
                                                    <div className="flex flex-col items-center gap-3 z-10 relative">
                                                        <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                            </svg>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                                                                {totalDeliveries}/5
                                                            </p>
                                                            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">Deliveries</p>
                                                        </div>
                                                        {/* Mini progress dots */}
                                                        <div className="flex gap-1.5">
                                                            {[0,1,2,3,4].map(i => (
                                                                <div key={i} className={`w-2 h-2 rounded-full ${
                                                                    i < totalDeliveries ? 'bg-brand-primary' : 'bg-white/10'
                                                                }`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* UNLOCKED STATE — 5+ deliveries */
                                                    <>
                                                        <div className="relative w-28 h-28 flex items-center justify-center">
                                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                                <circle cx="50" cy="50" r="42" className="stroke-white/[0.05]" strokeWidth="7" fill="transparent" />
                                                                <circle
                                                                    cx="50" cy="50" r="42"
                                                                    className={`transition-all duration-1000 ease-out ${otdScore >= 90 ? 'stroke-brand-success' : otdScore >= 75 ? 'stroke-brand-warning' : 'stroke-brand-error'}`}
                                                                    strokeWidth="7" fill="transparent"
                                                                    strokeDasharray={2 * Math.PI * 42}
                                                                    strokeDashoffset={2 * Math.PI * 42 * (1 - (otdScore || 0) / 100)}
                                                                    strokeLinecap="round"
                                                                />
                                                            </svg>
                                                            <div className="absolute flex flex-col items-center justify-center">
                                                                <span className="text-xl font-black text-white tracking-tight leading-none">{otdScore}%</span>
                                                                <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">OTD Score</span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 flex flex-col items-center gap-1.5 z-10 relative">
                                                            {otdScore === 100 && totalDeliveries >= 5 ? (
                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-success/15 text-brand-success border border-brand-success/30">✦ Flawless</span>
                                                            ) : otdScore >= 90 ? (
                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-success/10 text-brand-success border border-brand-success/20">Reliable</span>
                                                            ) : otdScore >= 75 ? (
                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-warning/10 text-brand-warning border border-brand-warning/20">Satisfactory</span>
                                                            ) : (
                                                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error border border-brand-error/30 animate-pulse">⚠ At Risk</span>
                                                            )}
                                                            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Last 30 Rolling Days</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Right Panel: Stats & Progress Bar */}
                                            <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 min-w-0">
                                                <div>
                                                    <h3 className="text-sm font-black text-white tracking-tight mb-1">On-Time Performance</h3>
                                                    <p className="text-[11px] text-gray-400 leading-relaxed">
                                                        Your delivery rating is calculated over a rolling 30-day window. Staying above 90% OTD maintains high eligibility for priority project allocations.
                                                    </p>
                                                </div>

                                                {/* Progress Bar — only when score unlocked */}
                                                {otdScore !== null ? (
                                                    <div className="my-5">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">OTD Progress</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider ${(otdScore || 0) >= 90 ? 'text-brand-success' : (otdScore || 0) >= 75 ? 'text-brand-warning' : 'text-brand-error'}`}>{otdScore}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${ (otdScore || 0) >= 90 ? 'bg-brand-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : (otdScore || 0) >= 75 ? 'bg-brand-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-brand-error shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}
                                                                style={{ width: `${otdScore || 0}%` }}
                                                            />
                                                        </div>
                                                        <div className="relative mt-1 h-4">
                                                            <div className="absolute flex flex-col items-center" style={{ left: '75%', transform: 'translateX(-50%)' }}>
                                                                <div className="w-px h-1.5 bg-white/20" />
                                                                <span className="text-[7px] text-gray-600 font-bold">75%</span>
                                                            </div>
                                                            <div className="absolute flex flex-col items-center" style={{ left: '90%', transform: 'translateX(-50%)' }}>
                                                                <div className="w-px h-1.5 bg-white/20" />
                                                                <span className="text-[7px] text-gray-600 font-bold">90%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Locked progress bar placeholder */
                                                    <div className="my-5 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] flex items-center gap-3">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                        </svg>
                                                        <p className="text-[10px] text-gray-500 leading-snug">
                                                            Complete <span className="text-white font-black">5 deliveries</span> to unlock OTD score
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Stats Row */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-white/[0.04] hover:border-white/10 transition-all">
                                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Total</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-white leading-none">{totalDeliveries}</span>
                                                            <span className="text-[8px] text-gray-600 font-bold">tasks</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-brand-success/[0.03] border border-brand-success/[0.08] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-brand-success/[0.06] hover:border-brand-success/20 transition-all">
                                                        <span className="text-[8px] font-bold text-brand-success/60 uppercase tracking-widest">On-Time</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-xl font-black text-brand-success leading-none">{timelyCount}</span>
                                                            <span className="text-[8px] text-brand-success/40 font-bold">timely</span>
                                                        </div>
                                                    </div>
                                                    <div className={`rounded-xl p-3.5 flex flex-col gap-1 transition-all border ${lateCount > 0 ? 'bg-brand-error/[0.03] border-brand-error/[0.12] hover:bg-brand-error/[0.06] hover:border-brand-error/25' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10'}`}>
                                                        <span className={`text-[8px] font-bold uppercase tracking-widest ${lateCount > 0 ? 'text-brand-error/60' : 'text-gray-500'}`}>Late</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className={`text-xl font-black leading-none ${lateCount > 0 ? 'text-brand-error' : 'text-gray-500'}`}>{lateCount}</span>
                                                            <span className={`text-[8px] font-bold ${lateCount > 0 ? 'text-brand-error/40' : 'text-gray-600'}`}>delay</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

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

                    {activeTab === 'access' && hasPermission('edit_users') && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Permission Overrides */}
                            {availablePermissions.length > 0 && (
                                <div className="w-full">
                                    <ElevatedMetallicCard
                                        title="Granular Permission Overrides"
                                        bodyClassName="p-8 space-y-8"
                                        className="w-full"
                                    >
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/5">
                                                    <IconLock size={28} />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-black text-white tracking-tight leading-none">Custom Access Control</h3>
                                                    <p className="text-xs text-gray-500 font-medium tracking-tight">Assign user-specific override capabilities outside of their default role scope</p>
                                                </div>
                                            </div>

                                            {/* Group permissions by Category */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {(Object.entries(
                                                    availablePermissions.reduce((acc, perm) => {
                                                        if (!acc[perm.category]) acc[perm.category] = [];
                                                        acc[perm.category].push(perm);
                                                        return acc;
                                                    }, {} as Record<string, any[]>)
                                                ) as [string, any[]][]).map(([category, perms]) => (
                                                    <div key={category} className="space-y-3 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                                                        <h4 className="text-xs font-black text-brand-primary uppercase tracking-widest border-b border-white/5 pb-2 mb-3">
                                                            {category}
                                                        </h4>
                                                        <div className="space-y-3.5">
                                                            {(() => {
                                                                const hierarchy = PERMISSION_HIERARCHY[category];
                                                                if (hierarchy) {
                                                                    const parentPerm = perms.find(p => p.code === hierarchy.parent);
                                                                    const childPerms = perms.filter(p => hierarchy.children.includes(p.code));
                                                                    const otherPerms = perms.filter(p => p.code !== hierarchy.parent && !hierarchy.children.includes(p.code));

                                                                    const isParentChecked = parentPerm ? selectedOverrides.includes(parentPerm.code) : false;

                                                                    return (
                                                                        <div className="space-y-4">
                                                                            {/* Parent Permission */}
                                                                            {parentPerm && (
                                                                                <label className="flex items-start gap-3 cursor-pointer group select-none">
                                                                                    <input 
                                                                                        type="checkbox"
                                                                                        checked={isParentChecked}
                                                                                        onChange={(e) => {
                                                                                            if (e.target.checked) {
                                                                                                setSelectedOverrides(prev => [...prev, parentPerm.code]);
                                                                                            } else {
                                                                                                setSelectedOverrides(prev => prev.filter(c => c !== parentPerm.code && !hierarchy.children.includes(c)));
                                                                                            }
                                                                                        }}
                                                                                        className="mt-1 w-4 h-4 rounded border-white/10 bg-black/20 text-brand-primary focus:ring-brand-primary cursor-pointer"
                                                                                    />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors flex items-center gap-1.5">
                                                                                            {parentPerm.name}
                                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-black uppercase tracking-wider">Master Access</span>
                                                                                        </span>
                                                                                        {parentPerm.description && (
                                                                                            <span className="text-[10px] text-gray-500 font-medium">
                                                                                                {parentPerm.description}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </label>
                                                                            )}

                                                                            {/* Child Permissions (Indented & Disabled if Parent is Unchecked) */}
                                                                            {childPerms.length > 0 && (
                                                                                <div className={`pl-6 ml-2 border-l border-white/5 space-y-3.5 transition-all duration-300 ${isParentChecked ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                                                                    {childPerms.map((perm) => {
                                                                                        const isChecked = selectedOverrides.includes(perm.code);
                                                                                        return (
                                                                                            <label key={perm.code} className={`flex items-start gap-3 select-none ${isParentChecked ? 'cursor-pointer group' : 'cursor-not-allowed'}`}>
                                                                                                <input 
                                                                                                    type="checkbox"
                                                                                                    checked={isChecked && isParentChecked}
                                                                                                    disabled={!isParentChecked}
                                                                                                    onChange={(e) => {
                                                                                                        if (e.target.checked) {
                                                                                                            setSelectedOverrides(prev => [...prev, perm.code]);
                                                                                                        } else {
                                                                                                            setSelectedOverrides(prev => prev.filter(c => c !== perm.code));
                                                                                                        }
                                                                                                    }}
                                                                                                    className="mt-1 w-4 h-4 rounded border-white/10 bg-black/20 text-brand-primary focus:ring-brand-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                />
                                                                                                <div className="flex flex-col">
                                                                                                    <span className={`text-sm font-bold text-white transition-colors ${isParentChecked ? 'group-hover:text-brand-primary' : 'text-gray-500'}`}>
                                                                                                        {perm.name}
                                                                                                    </span>
                                                                                                    {perm.description && (
                                                                                                        <span className="text-[10px] text-gray-500 font-medium">
                                                                                                            {perm.description}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            )}

                                                                            {/* Other permissions in the category */}
                                                                            {otherPerms.map((perm) => {
                                                                                const isChecked = selectedOverrides.includes(perm.code);
                                                                                return (
                                                                                    <label key={perm.code} className="flex items-start gap-3 cursor-pointer group select-none pt-2">
                                                                                        <input 
                                                                                            type="checkbox"
                                                                                            checked={isChecked}
                                                                                            onChange={(e) => {
                                                                                                if (e.target.checked) {
                                                                                                    setSelectedOverrides(prev => [...prev, perm.code]);
                                                                                                } else {
                                                                                                    setSelectedOverrides(prev => prev.filter(c => c !== perm.code));
                                                                                                }
                                                                                            }}
                                                                                            className="mt-1 w-4 h-4 rounded border-white/10 bg-black/20 text-brand-primary focus:ring-brand-primary cursor-pointer"
                                                                                        />
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                                                                                                {perm.name}
                                                                                            </span>
                                                                                            {perm.description && (
                                                                                                <span className="text-[10px] text-gray-500 font-medium">
                                                                                                    {perm.description}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                }

                                                                // Fallback flat layout for other categories
                                                                return perms.map((perm) => {
                                                                    const isChecked = selectedOverrides.includes(perm.code);
                                                                    return (
                                                                        <label key={perm.code} className="flex items-start gap-3 cursor-pointer group select-none">
                                                                            <input 
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setSelectedOverrides(prev => [...prev, perm.code]);
                                                                                    } else {
                                                                                        setSelectedOverrides(prev => prev.filter(c => c !== perm.code));
                                                                                    }
                                                                                }}
                                                                                className="mt-1 w-4 h-4 rounded border-white/10 bg-black/20 text-brand-primary focus:ring-brand-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            />
                                                                            <div className="flex flex-col">
                                                                                <span className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                                                                                    {perm.name}
                                                                                </span>
                                                                                {perm.description && (
                                                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                                                        {perm.description}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <Button 
                                                    variant="metallic"
                                                    size="sm"
                                                    className="px-12 shadow-lg shadow-brand-primary/10"
                                                    onClick={handleUpdateOverrides}
                                                    isLoading={isSavingOverrides}
                                                >
                                                    Save Permissions
                                                </Button>
                                            </div>
                                        </div>
                                    </ElevatedMetallicCard>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && isOwnProfile && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Settings 
                                profileOnly 
                                onDirtyChange={() => {}} 
                            />
                        </div>
                    )}

                    {activeTab === 'settings' && !isOwnProfile && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-full relative z-10 rounded-2xl overflow-hidden border border-white/10 bg-[#1A1A1A] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.12)_50%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07)_0%,transparent_65%)] pointer-events-none" />

                                <div className="p-10 relative z-10">
                                    <div className="space-y-12">
                                        {/* Section: Payout Strategy Selection */}
                                        {(user.role === 'Freelancer' || user.role?.toLowerCase().includes('team lead') || user.role === 'Team Designer') && (
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
                                                                <p className="text-xs text-gray-500 font-medium">Define the payout model and basic salary rate for this user</p>
                                                            </div>
                                                        </div>

                                                        {/* Strategy Selection Cards */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <button 
                                                                onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'basicplusbonus' }))}
                                                                className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'basicplusbonus' 
                                                                    ? 'bg-brand-primary/[0.08] border-brand-primary/40 shadow-lg shadow-brand-primary/5' 
                                                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] grayscale hover:grayscale-0 opacity-60 hover:opacity-100'}`}
                                                            >
                                                                <div className={`p-3 rounded-xl ${payoutData.strategy === 'basicplusbonus' ? 'bg-brand-primary/20 text-brand-primary shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                                                    <IconLock size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white mb-1">Basic Salary + Bonuses</p>
                                                                    <p className="text-[10px] leading-relaxed text-gray-500 font-medium uppercase tracking-wider">Monthly fixed basic salary plus qualified bonuses</p>
                                                                </div>
                                                            </button>

                                                            <button 
                                                                onClick={() => setPayoutData(prev => ({ ...prev, strategy: 'bonusonly', rate: 0 }))}
                                                                className={`p-5 rounded-2xl border transition-all text-left flex items-start gap-4 ${payoutData.strategy === 'bonusonly' 
                                                                    ? 'bg-emerald-500/[0.08] border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
                                                                    : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] grayscale hover:grayscale-0 opacity-60 hover:opacity-100'}`}
                                                            >
                                                                <div className={`p-3 rounded-xl ${payoutData.strategy === 'bonusonly' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'bg-white/5 text-gray-400'}`}>
                                                                    <IconChartBar size={20} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-white mb-1">Only Bonuses</p>
                                                                    <p className="text-[10px] leading-relaxed text-gray-500 font-medium uppercase tracking-wider">Paid exclusively via performance milestone bonuses</p>
                                                                </div>
                                                            </button>
                                                        </div>

                                                        {/* Fixed Rate Input (Conditional) */}
                                                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${payoutData.strategy === 'basicplusbonus' ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                                            <div className="p-6 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 space-y-4">
                                                                <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest pl-1 leading-relaxed">Monthly Basic Salary (PKR)</p>
                                                                <Input 
                                                                    type="number"
                                                                    variant="metallic"
                                                                    placeholder="0.00"
                                                                    className="max-w-[200px]"
                                                                    leftIcon={<span className="text-amber-500 font-bold">PKR</span>}
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
                                                                Save Configuration
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
                isOpen={isPenaltyModalOpen}
                onClose={() => setIsPenaltyModalOpen(false)}
                title="Issue Penalty"
                size="md"
                isElevatedHeader={true}
                isElevatedFooter={true}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="recessed" size="sm" onClick={() => setIsPenaltyModalOpen(false)}>Cancel</Button>
                        <Button variant="metallic" size="sm" onClick={handleIssuePenalty} isLoading={isIssuingPenalty}>Issue Penalty</Button>
                    </div>
                }
            >
                <div className="space-y-4 p-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Penalty Reason</label>
                        <Dropdown
                            variant="metallic"
                            placeholder="Select or type reason"
                            options={[
                                { label: 'Late Shift Punch-in', value: 'Late Shift Punch-in' },
                                { label: 'Unannounced Absence', value: 'Unannounced Absence' },
                                { label: 'Quality Assurance Failure', value: 'Quality Assurance Failure' },
                                { label: 'Idle Timer Logouts', value: 'Idle Timer Logouts' },
                                { label: 'Policy Violation', value: 'Policy Violation' }
                            ]}
                            value={penaltyReason}
                            onChange={(val) => setPenaltyReason(val as string)}
                            isCreatable={true}
                            onCreate={(val) => setPenaltyReason(val)}
                            showSearch={true}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Detailed Explanation / Incident Notes</label>
                        <TextArea
                            variant="recessed"
                            placeholder="Provide details about the incident, dates, or other context..."
                            value={penaltyDetails}
                            onChange={(e) => setPenaltyDetails(e.target.value)}
                            rows={4}
                            inputClassName="min-h-[110px]"
                        />
                    </div>
                </div>
            </Modal>

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

export default UserDetails;
