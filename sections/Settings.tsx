import React, { useState, useRef } from 'react';
import { Permissions } from './Permissions';
import { Card, Modal, ElevatedMetallicCard } from '../components/Surfaces';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Avatar } from '../components/Avatar';
import { IconUser, IconMail, IconPhone, IconCreditCard, IconLock, IconShield, IconBuilding, IconSettings, IconFileImage, IconMaximize, IconDollar, IconCheck, IconX, IconCamera, IconLoader, IconBell, IconClock, IconPlay, IconStop, IconVolumeHigh, IconVolumeMute, IconBank, IconPlus, IconTrash, IconZap } from '../components/Icons';
import { Tabs } from '../components/Navigation';
import { Switch } from '../components/Selection';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';
import { formatDisplayName } from '../utils/formatter';
import { updateRoute, getInitialTab } from '../utils/routing';
import { Dropdown } from '../components/Dropdown';
import ReactMarkdown from 'react-markdown';
import PayoutRulesManager from './PayoutRulesManager';

export interface SettingsHandle {
    save: () => Promise<void>;
    discard: () => void;
}

const Settings = React.forwardRef<{ save: () => Promise<void>; discard: () => void }, { onBack?: () => void, onDirtyChange?: (isDirty: boolean) => void, profileOnly?: boolean }>(({ onBack, onDirtyChange, profileOnly }, ref) => {
    const { profile, loading, refreshProfile, effectiveRole } = useUser();
    const [settingsTab, setSettingsTab] = useState<'profile' | 'page-access' | 'account-access'>(() => getInitialTab('Settings', 'profile') as any);
    const [updating, setUpdating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [persistedLocalPreview, setPersistedLocalPreview] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [soundTab, setSoundTab] = useState<'notification' | 'reminder'>('notification');
    const [isNotificationSoundEnabled, setIsNotificationSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('nova_notifications_sound_enabled');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });
    const [selectedRingtone, setSelectedRingtone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('nova_selected_ringtone') || '/Ringtone 1.mp3';
        }
        return '/Ringtone 1.mp3';
    });
    const [isReminderSoundEnabled, setIsReminderSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('nova_reminders_sound_enabled');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });
    const [selectedReminderRingtone, setSelectedReminderRingtone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('nova_selected_reminder_ringtone') || '/Ringtone 2a.mp3';
        }
        return '/Ringtone 2a.mp3';
    });
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [showEarningsHeader, setShowEarningsHeader] = useState(() => {
        if (typeof window !== 'undefined' && profile?.id) {
            const saved = localStorage.getItem(`nova_show_earnings_${profile.id}`);
            return saved === null ? true : saved === 'true';
        }
        return true;
    });
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const cnicFileInputRef = React.useRef<HTMLInputElement>(null);
    const [isCNICUploading, setIsCNICUploading] = useState<{ front: boolean, back: boolean }>({ front: false, back: false });
    const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null);

    React.useImperativeHandle(ref, () => ({
        save: handleSaveSettings,
        discard: handleDiscardChanges
    }));

    const [formData, setFormData] = useState({
        name: '',
        payment_email: '',
        bank_name: '',
        account_title: '',
        iban: '',
        preferred_payment_method: ''
    });

    const [avatarDraft, setAvatarDraft] = useState<{ file: File; localUrl: string; publicUrl?: string } | null>(null);

    const isDirty = profile ? (
        formData.name.trim() !== (profile.name || '').trim() ||
        formData.payment_email !== (profile.payment_email || '') ||
        formData.bank_name !== (profile.bank_name || '') ||
        formData.account_title !== (profile.account_title || '') ||
        formData.iban !== (profile.iban || '') ||
        formData.preferred_payment_method !== (profile.preferred_payment_method || '') ||
        avatarDraft !== null
    ) : false;

    const lastProfileId = React.useRef<string | null>(null);

    React.useEffect(() => {
        if (profile) {
            // Only update form data if it's the first load, a different user, or the form is NOT dirty
            // This prevents overwriting user's unsaved edits during background refreshes (like after avatar upload)
            if (profile.id !== lastProfileId.current || !isDirty) {
                setFormData({
                    name: profile.name || '',
                    payment_email: profile.payment_email || '',
                    bank_name: profile.bank_name || '',
                    account_title: profile.account_title || '',
                    iban: profile.iban || '',
                    preferred_payment_method: profile.preferred_payment_method || ''
                });
                lastProfileId.current = profile.id;
            }
        }
    }, [profile, isDirty]);

    React.useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    React.useEffect(() => {
        updateRoute('Settings', settingsTab);
    }, [settingsTab]);


    if (loading && !profile) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
        );
    }

    const isAdmin = effectiveRole?.toLowerCase() === 'admin' || effectiveRole?.toLowerCase() === 'super admin';
    const isSuperAdmin = effectiveRole?.toLowerCase() === 'super admin';
    const isTeamLead = effectiveRole?.toLowerCase() === 'team lead';
    const isTeamDesigner = effectiveRole?.toLowerCase() === 'team designer';
    const isFreelancer = effectiveRole?.toLowerCase() === 'freelancer' || isTeamLead || isTeamDesigner;
    const isProjectManager = effectiveRole?.toLowerCase() === 'project manager';

    const handleSaveSettings = async () => {
        if (!profile) return;

        setSaving(true);
        try {
            let finalAvatarUrl = profile.avatar_url;

            // 1. If there's a pending avatar, upload it first
            if (avatarDraft) {
                setUploadingAvatar(true);
                const fileName = `${profile.id}-${Math.random().toString(36).substring(2, 7)}.${avatarDraft.file.name.split('.').pop()}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarDraft.file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                finalAvatarUrl = data.publicUrl;
                // Update draft with public URL so we can compare later
                setAvatarDraft(prev => prev ? { ...prev, publicUrl: finalAvatarUrl } : null);
            }

            // 2. Update all fields including avatar_url if changed
            const { error } = await supabase
                .from('profiles')
                .update({
                    name: formData.name,
                    payment_email: formData.payment_email,
                    bank_name: formData.bank_name,
                    account_title: formData.account_title,
                    iban: formData.iban,
                    preferred_payment_method: formData.preferred_payment_method,
                    avatar_url: finalAvatarUrl
                })
                .eq('id', profile.id);

            if (error) throw error;

            addToast({ type: 'success', title: 'Settings Saved', message: 'Your profile has been updated successfully.' });

            // 3. Refresh Profile data first
            await refreshProfile();

            // 4. SEAMLESS HANDOFF:
            // Move the draft's local URL to a standby state that doesn't trigger "isDirty"
            // This makes the button disappear immediately while keeping the image visible
            if (avatarDraft) {
                setPersistedLocalPreview(avatarDraft.localUrl);
                setAvatarDraft(null); // Button disappears now because isDirty becomes false
            }

            setUploadingAvatar(false);

        } catch (error: any) {
            console.error('Error saving settings:', error);
            setUploadingAvatar(false);
            addToast({ type: 'error', title: 'Save Failed', message: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                payment_email: profile.payment_email || '',
                bank_name: profile.bank_name || '',
                account_title: profile.account_title || '',
                iban: profile.iban || '',
                preferred_payment_method: profile.preferred_payment_method || ''
            });
            addToast({ type: 'info', title: 'Changes Discarded', message: 'Form has been reset to your saved data.' });
        }
    };

    const handlePasswordUpdate = async () => {
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            addToast({ type: 'error', title: 'Validation Error', message: 'Please fill in all fields.' });
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
            const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
            if (error) throw error;

            addToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed successfully.' });
            setIsPasswordModalOpen(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error updating password:', error);
            addToast({ type: 'error', title: 'Update Failed', message: error.message });
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile) return;

        // Cleanup previous draft if any
        if (avatarDraft) URL.revokeObjectURL(avatarDraft.localUrl);

        // Set local draft preview immediately
        const localUrl = URL.createObjectURL(file);
        setAvatarDraft({ file, localUrl });

        addToast({
            type: 'info',
            title: 'Photo Selected',
            message: 'Click "Save Changes" to permanentize your new profile photo.'
        });
    };

    const handleCNICClick = (side: 'front' | 'back') => {
        setUploadingSide(side);
        cnicFileInputRef.current?.click();
    };

    const handleCNICFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile || !uploadingSide) return;

        setIsCNICUploading(prev => ({ ...prev, [uploadingSide]: true }));
        try {
            const fileName = `${profile.id}-cnic-${uploadingSide}-${Math.random().toString(36).substring(2, 7)}.${file.name.split('.').pop()}`;

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
                .eq('id', profile.id);

            if (updateError) throw updateError;

            await refreshProfile();
            addToast({ type: 'success', title: 'Document Updated', message: `Your CNIC ${uploadingSide} has been updated successfully.` });
        } catch (error: any) {
            console.error('Error updating CNIC:', error);
            addToast({ type: 'error', title: 'Upload Failed', message: error.message });
        } finally {
            setIsCNICUploading(prev => ({ ...prev, [uploadingSide]: false }));
            setUploadingSide(null);
            if (event.target) event.target.value = '';
        }
    };

    const handleToggleEarningsVisibility = (checked: boolean) => {
        if (!profile?.id) return;
        setShowEarningsHeader(checked);
        localStorage.setItem(`nova_show_earnings_${profile.id}`, String(checked));
        // Dispatch custom event to notify DashboardLayout
        window.dispatchEvent(new CustomEvent('nova_earnings_visibility_updated'));
        addToast({
            type: 'info',
            title: `Earnings ${checked ? 'Visible' : 'Hidden'}`,
            message: `Available earnings will ${checked ? 'now' : 'no longer'} be shown in the header.`
        });
    };

    const handleToggleNotificationSound = (checked: boolean) => {
        setIsNotificationSoundEnabled(checked);
        localStorage.setItem('nova_notifications_sound_enabled', String(checked));
        window.dispatchEvent(new CustomEvent('nova_notifications_sound_updated'));
        addToast({
            type: 'info',
            title: `Sounds ${checked ? 'Enabled' : 'Muted'}`,
            message: `Audio alerts are now ${checked ? 'active' : 'silenced'}.`
        });
    };

    const handleSelectRingtone = (url: string, name: string) => {
        setSelectedRingtone(url);
        localStorage.setItem('nova_selected_ringtone', url);
        // Also ensure sound is enabled when selecting a new one
        if (!isNotificationSoundEnabled) {
            setIsNotificationSoundEnabled(true);
            localStorage.setItem('nova_notifications_sound_enabled', 'true');
            window.dispatchEvent(new CustomEvent('nova_notifications_sound_updated'));
        }
        window.dispatchEvent(new CustomEvent('nova_selected_ringtone_updated'));
        addToast({
            type: 'success',
            title: 'Ringtone Selected',
            message: `${name} is now your active sound.`
        });
    };

    const handleToggleReminderSound = (checked: boolean) => {
        setIsReminderSoundEnabled(checked);
        localStorage.setItem('nova_reminders_sound_enabled', String(checked));
        window.dispatchEvent(new CustomEvent('nova_reminders_sound_updated'));
        addToast({
            type: 'info',
            title: `Reminders ${checked ? 'Enabled' : 'Muted'}`,
            message: `Reminder sound is now ${checked ? 'active' : 'silenced'}.`
        });
    };

    const handleSelectReminderRingtone = (url: string, name: string) => {
        setSelectedReminderRingtone(url);
        localStorage.setItem('nova_selected_reminder_ringtone', url);
        if (!isReminderSoundEnabled) {
            setIsReminderSoundEnabled(true);
            localStorage.setItem('nova_reminders_sound_enabled', 'true');
            window.dispatchEvent(new CustomEvent('nova_reminders_sound_updated'));
        }
        window.dispatchEvent(new CustomEvent('nova_selected_reminder_ringtone_updated'));
        addToast({
            type: 'success',
            title: 'Reminder Sound Selected',
            message: `${name} is now your active reminder alert.`
        });
    };

    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const [playingPreviewUrl, setPlayingPreviewUrl] = useState<string | null>(null);

    const handlePlayPreview = (url: string) => {
        // If the same ringtone is playing, stop it
        if (playingPreviewUrl === url) {
            previewAudioRef.current?.pause();
            if (previewAudioRef.current) previewAudioRef.current.currentTime = 0;
            previewAudioRef.current = null;
            setPlayingPreviewUrl(null);
            return;
        }
        // Stop any other currently playing preview
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.currentTime = 0;
        }
        // Play the new one
        const audio = new Audio(url);
        audio.volume = 1.0;
        audio.play().catch(e => console.warn('Preview play failed:', e));
        audio.onended = () => {
            setPlayingPreviewUrl(null);
            previewAudioRef.current = null;
        };
        previewAudioRef.current = audio;
        setPlayingPreviewUrl(url);
    };

    const notificationRingtones = [
        { id: '1', name: 'Ringtone 1', url: '/Ringtone 1.mp3' },
        { id: '2', name: 'Ringtone 2', url: '/Ringtone 2.mp3' },
        { id: '3', name: 'Ringtone 3', url: '/Ringtone 3.mp3' },
        { id: '4', name: 'Ringtone 4', url: '/Ringtone 4.mp3' },
        { id: '5', name: 'Ringtone 5', url: '/Ringtone 5.mp3' },
    ];

    const reminderRingtones = [
        { id: '1a', name: 'Ringtone 1', url: '/Ringtone 1a.mp3' },
        { id: '2a', name: 'Ringtone 2', url: '/Ringtone 2a.mp3' },
    ];

    const tabs = [
        { id: 'profile', label: 'Profile Details', icon: <IconUser size={15} /> },
        ...(isSuperAdmin && !profileOnly ? [
            { id: 'page-access', label: 'Page Access Rules', icon: <IconShield size={15} /> },
            { id: 'account-access', label: 'Account Scoping', icon: <IconBuilding size={15} /> },
            { id: 'payout-rules', label: 'Payout Rules', icon: <IconDollar size={15} /> }
        ] : []),
    ];

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                className="hidden"
                accept="image/*"
            />

            <input
                type="file"
                ref={cnicFileInputRef}
                onChange={handleCNICFileChange}
                className="hidden"
                accept="image/*"
            />

            {isSuperAdmin && !profileOnly && (
                <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
                    <Tabs
                        tabs={tabs}
                        activeTab={settingsTab}
                        onTabChange={(id) => setSettingsTab(id as any)}
                    />

                    {settingsTab !== 'profile' && (
                        <div className="flex items-center gap-4">
                            {/* These actions will be handled inside the Permissions component via callback or shared state if needed, but for now we let it manage itself */}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-6">
                {!profile ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="w-10 h-10 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm animate-pulse">Initializing your profile...</p>
                    </div>
                ) : (settingsTab === 'page-access' || settingsTab === 'account-access') && isSuperAdmin && !profileOnly ? (
                    <div className="animate-in fade-in duration-500">
                        <Permissions
                            hideTabs
                            activeTab={settingsTab === 'page-access' ? 'page-access' : 'account-access'}
                            onTabChange={(t) => setSettingsTab(t as any)}
                            onSimulate={() => onBack?.()}
                        />
                    </div>
                ) : settingsTab === 'payout-rules' && isSuperAdmin && !profileOnly ? (
                    <div className="animate-in fade-in duration-500">
                        <PayoutRulesManager />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in">
                        <ElevatedMetallicCard
                            title="Public Profile"
                            headerClassName="px-8 py-6"
                            bodyClassName="p-8"
                        >
                            <div className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <Avatar
                                        size="xl"
                                        status="online"
                                        src={avatarDraft?.localUrl || persistedLocalPreview || profile?.avatar_url}
                                        initials={profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
                                        loading={uploadingAvatar}
                                        onLoad={() => {
                                            // Clear the persisted local preview only when the remote one is actually visible
                                            if (persistedLocalPreview && !uploadingAvatar && !avatarDraft) {
                                                console.log('Confirmed: Persistent Avatar loaded. Cleaning up backup preview.');
                                                URL.revokeObjectURL(persistedLocalPreview);
                                                setPersistedLocalPreview(null);
                                            }
                                        }}
                                        onError={() => {
                                            if (persistedLocalPreview && !uploadingAvatar) {
                                                console.error('Remote avatar failed to load, keeping local backup indefinitely.');
                                            }
                                        }}
                                    />
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <Button
                                                variant="metallic"
                                                size="sm"
                                                onClick={handleAvatarClick}
                                            >
                                                Change Photo
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">JPG, GIF or PNG. Max size of 800K</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Display Name"
                                        placeholder="E.g. Alex Rivier"
                                        value={isSuperAdmin ? formData.name : formatDisplayName(profile?.name)}
                                        onChange={isSuperAdmin ? (e) => setFormData({ ...formData, name: e.target.value }) : undefined}
                                        readOnly={!isSuperAdmin}
                                        className={!isSuperAdmin ? "cursor-not-allowed" : ""}
                                        variant="metallic"
                                        leftIcon={<IconUser className="w-4 h-4" />}
                                    />
                                    <Input
                                        label="Email Address"
                                        placeholder="E.g. alex@codeslogic.com"
                                        value={profile?.email || ''}
                                        readOnly
                                        className="cursor-not-allowed"
                                        variant="metallic"
                                    />
                                    <Input
                                        label="Job Title / Role"
                                        placeholder="E.g. Designer"
                                        value={effectiveRole || ''}
                                        readOnly
                                        className="cursor-not-allowed"
                                        variant="metallic"
                                    />
                                    {!isAdmin && !isSuperAdmin && (
                                        <Input
                                            label="Phone Number"
                                            value={profile?.phone || 'Not specified'}
                                            readOnly
                                            className="cursor-not-allowed"
                                            variant="metallic"
                                            leftIcon={<IconPhone className="w-4 h-4" />}
                                        />
                                    )}
                                </div>

                                {isSuperAdmin && (isDirty || formData.name.trim() !== (profile?.name || '').trim()) && (
                                    <div className="flex justify-end gap-3 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleDiscardChanges}
                                            disabled={saving}
                                            className="px-6"
                                        >
                                            Discard
                                        </Button>
                                        <Button
                                            variant="metallic"
                                            size="sm"
                                            className="px-8"
                                            onClick={handleSaveSettings}
                                            isLoading={saving}
                                        >
                                            Save Changes
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </ElevatedMetallicCard>

                        {/* Payment Details card - Based on preference */}
                        {isFreelancer && !isSuperAdmin && profile && (
                            <ElevatedMetallicCard
                                title="Payment Settings"
                                headerClassName="px-8 py-6"
                                bodyClassName="p-8"
                            >
                                <div className="space-y-6">
                                    <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-white/10 shadow-inner bg-black/20">
                                                {formData.preferred_payment_method === 'Payoneer' ? (
                                                    <img src="/payoneericon.jpeg" alt="Payoneer" className="w-full h-full object-contain p-1.5 bg-white" />
                                                ) : formData.preferred_payment_method === 'Bank Transfer' ? (
                                                    <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                        <IconBank className="w-6 h-6" />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full bg-gray-500/10 flex items-center justify-center text-gray-500">
                                                        <IconCreditCard className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Preferred Method</p>
                                                <p className="text-sm font-bold text-white">{formData.preferred_payment_method || 'Not Selected'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {formData.preferred_payment_method === 'Payoneer' ? (
                                        <Input
                                            label="Payoneer Email"
                                            placeholder="E.g. alex.payoneer@email.com"
                                            value={formData.payment_email}
                                            onChange={(e) => setFormData({ ...formData, payment_email: e.target.value })}
                                            readOnly={isFreelancer}
                                            className={isFreelancer ? "cursor-not-allowed" : ""}
                                            variant="metallic"
                                            leftIcon={<IconMail className="w-4 h-4" />}
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <Input
                                                label="Bank Name"
                                                placeholder="E.g. Chase Bank"
                                                value={formData.bank_name}
                                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                                readOnly={isFreelancer || isProjectManager || isTeamLead}
                                                className={(isFreelancer || isProjectManager || isTeamLead) ? "cursor-not-allowed" : ""}
                                                variant="metallic"
                                                leftIcon={<IconCreditCard className="w-4 h-4" />}
                                            />
                                            <Input
                                                label="Account Title"
                                                placeholder="E.g. Alex Rivier"
                                                value={formData.account_title}
                                                onChange={(e) => setFormData({ ...formData, account_title: e.target.value })}
                                                readOnly={isFreelancer || isProjectManager || isTeamLead}
                                                className={(isFreelancer || isProjectManager || isTeamLead) ? "cursor-not-allowed" : ""}
                                                variant="metallic"
                                            />
                                            <Input
                                                label="IBAN"
                                                placeholder="E.g. GB 123 456 789"
                                                value={formData.iban}
                                                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                                readOnly={isFreelancer || isProjectManager || isTeamLead}
                                                className={(isFreelancer || isProjectManager || isTeamLead) ? "cursor-not-allowed" : ""}
                                                variant="metallic"
                                            />
                                        </div>
                                    )}
                                </div>
                            </ElevatedMetallicCard>
                        )}

                        {/* Bank Details Section - For everyone except Admin and Freelancers (who have it combined above) */}
                        {!isAdmin && !isSuperAdmin && !isFreelancer && (
                            <ElevatedMetallicCard
                                title="Bank Details"
                                headerClassName="px-8 py-6"
                                bodyClassName="p-8"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Input
                                        label="Bank Name"
                                        placeholder="E.g. Chase Bank"
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                        readOnly={isFreelancer || isProjectManager || isTeamLead}
                                        className={(isFreelancer || isProjectManager || isTeamLead) ? "cursor-not-allowed" : ""}
                                        variant="metallic"
                                        leftIcon={<IconCreditCard className="w-4 h-4" />}
                                    />
                                    <Input
                                        label="Account Title"
                                        placeholder="E.g. Alex Rivier"
                                        value={formData.account_title}
                                        onChange={(e) => setFormData({ ...formData, account_title: e.target.value })}
                                        readOnly={isFreelancer || isProjectManager || isTeamLead}
                                        className={(isFreelancer || isProjectManager || isTeamLead) ? "cursor-not-allowed" : ""}
                                        variant="metallic"
                                    />
                                    <Input
                                        label="IBAN"
                                        placeholder="E.g. GB 123 456 789"
                                        value={formData.iban}
                                        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                        readOnly={isFreelancer || isProjectManager || isTeamLead}
                                        className={(isFreelancer || isProjectManager || isTeamLead) ? "cursor-not-allowed" : ""}
                                        variant="metallic"
                                    />
                                </div>
                            </ElevatedMetallicCard>
                        )}

                        {/* Identity Verification Card - For everyone except Admin */}
                        {!isAdmin && !isSuperAdmin && profile && (
                            <ElevatedMetallicCard
                                title="IDENTITY VERIFICATION"
                                headerClassName="px-8 py-6"
                                bodyClassName="p-8"
                            >
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div
                                                className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] cursor-pointer"
                                            >
                                                {profile.cnic_front_url ? (
                                                    <img src={profile.cnic_front_url} alt="CNIC Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Image missing</span>
                                                    </div>
                                                )}

                                                {/* Overlays */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                    <div className="flex gap-4">
                                                        {profile.cnic_front_url && (
                                                            <button
                                                                title="View Identity Document"
                                                                onClick={(e) => { e.stopPropagation(); setPreviewImage(profile.cnic_front_url); }}
                                                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                                                            >
                                                                <IconMaximize size={24} />
                                                            </button>
                                                        )}
                                                        <button
                                                            title={profile.cnic_front_url ? 'Re-upload Document' : 'Upload Document'}
                                                            onClick={(e) => { e.stopPropagation(); handleCNICClick('front'); }}
                                                            className="w-12 h-12 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
                                                            disabled={isCNICUploading.front}
                                                        >
                                                            {isCNICUploading.front ? <IconLoader className="w-6 h-6 animate-spin" strokeWidth={3} /> : <IconCamera size={24} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">ID FRONT SIDE</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div
                                                className="aspect-[1.5/1] rounded-2xl bg-black/40 border border-surface-border overflow-hidden flex items-center justify-center group relative shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] cursor-pointer"
                                            >
                                                {profile.cnic_back_url ? (
                                                    <img src={profile.cnic_back_url} alt="CNIC Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="text-center p-4">
                                                        <IconFileImage className="w-10 h-10 text-gray-800 mx-auto mb-2" />
                                                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Image missing</span>
                                                    </div>
                                                )}

                                                {/* Overlays */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                    <div className="flex gap-4">
                                                        {profile.cnic_back_url && (
                                                            <button
                                                                title="View Identity Document"
                                                                onClick={(e) => { e.stopPropagation(); setPreviewImage(profile.cnic_back_url); }}
                                                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                                                            >
                                                                <IconMaximize size={24} />
                                                            </button>
                                                        )}
                                                        <button
                                                            title={profile.cnic_back_url ? 'Re-upload Document' : 'Upload Document'}
                                                            onClick={(e) => { e.stopPropagation(); handleCNICClick('back'); }}
                                                            className="w-12 h-12 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/40 flex items-center justify-center text-brand-primary hover:bg-brand-primary/30 transition-all"
                                                            disabled={isCNICUploading.back}
                                                        >
                                                            {isCNICUploading.back ? <IconLoader className="w-6 h-6 animate-spin" strokeWidth={3} /> : <IconCamera size={24} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">ID BACK SIDE</p>
                                        </div>
                                    </div>
                                </div>
                            </ElevatedMetallicCard>
                        )}


                        {/* Sounds Section - Only for Super Admin */}
                        {effectiveRole === 'Super Admin' && (
                            <ElevatedMetallicCard
                                title="Sounds"
                                headerClassName="px-8 py-6"
                                bodyClassName="p-8"
                            >
                                <div className="space-y-6">
                                    <div className="mb-2">
                                        <Tabs
                                            tabs={[
                                                { id: 'notification', label: 'Notification Sound', icon: <IconBell size={14} /> },
                                                { id: 'reminder', label: 'Reminder Sound', icon: <IconClock size={14} /> }
                                            ]}
                                            activeTab={soundTab}
                                            onTabChange={(id) => setSoundTab(id as any)}
                                        />
                                    </div>

                                    <div className="animate-in fade-in duration-300">
                                        {soundTab === 'notification' ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-4 mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available Ringtones</p>
                                                    <Button
                                                        variant="recessed"
                                                        size="sm"
                                                        className={`w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all ${!isNotificationSoundEnabled ? 'text-brand-error bg-brand-error/10 border-brand-error/20' : 'text-brand-primary'}`}
                                                        onClick={() => handleToggleNotificationSound(!isNotificationSoundEnabled)}
                                                        title={isNotificationSoundEnabled ? 'Mute Notifications' : 'Unmute Notifications'}
                                                    >
                                                        {isNotificationSoundEnabled ? <IconVolumeHigh size={18} /> : <IconVolumeMute size={18} />}
                                                    </Button>
                                                </div>
                                                {notificationRingtones.map((rt) => (
                                                    <div key={rt.id} className={`flex items-center justify-between p-4 bg-surface-overlay border rounded-2xl group/item transition-all hover:border-white/10 ${selectedRingtone === rt.url ? 'border-brand-primary/30 shadow-[0_4px_20px_-10px_rgba(255,77,45,0.2)]' : 'border-surface-border'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <Button
                                                                variant="recessed"
                                                                size="sm"
                                                                className="w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all active:scale-95"
                                                                onClick={() => handlePlayPreview(rt.url)}
                                                                title={playingPreviewUrl === rt.url ? 'Stop' : 'Play Preview'}
                                                            >
                                                                {playingPreviewUrl === rt.url
                                                                    ? <IconStop size={12} fill="currentColor" stroke="none" />
                                                                    : <IconPlay size={14} fill="currentColor" stroke="none" />
                                                                }
                                                            </Button>
                                                            <p className={`text-sm font-bold transition-colors ${selectedRingtone === rt.url ? 'text-brand-primary' : 'text-white'}`}>{rt.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Switch
                                                                checked={selectedRingtone === rt.url && isNotificationSoundEnabled}
                                                                onChange={(checked) => {
                                                                    if (checked) {
                                                                        handleSelectRingtone(rt.url, rt.name);
                                                                    } else if (selectedRingtone === rt.url) {
                                                                        handleToggleNotificationSound(false);
                                                                    }
                                                                }}
                                                                variant="metallic"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-4 mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available Reminder Sounds</p>
                                                    <Button
                                                        variant="recessed"
                                                        size="sm"
                                                        className={`w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all ${!isReminderSoundEnabled ? 'text-brand-error bg-brand-error/10 border-brand-error/20' : 'text-brand-primary'}`}
                                                        onClick={() => handleToggleReminderSound(!isReminderSoundEnabled)}
                                                        title={isReminderSoundEnabled ? 'Mute Reminders' : 'Unmute Reminders'}
                                                    >
                                                        {isReminderSoundEnabled ? <IconVolumeHigh size={18} /> : <IconVolumeMute size={18} />}
                                                    </Button>
                                                </div>
                                                {reminderRingtones.map((rt) => (
                                                    <div key={rt.id} className={`flex items-center justify-between p-4 bg-surface-overlay border rounded-2xl group/item transition-all hover:border-white/10 ${selectedReminderRingtone === rt.url ? 'border-brand-primary/30 shadow-[0_4px_20px_-10px_rgba(255,77,45,0.2)]' : 'border-surface-border'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <Button
                                                                variant="recessed"
                                                                size="sm"
                                                                className="w-10 h-10 p-0 flex items-center justify-center rounded-xl transition-all active:scale-95"
                                                                onClick={() => handlePlayPreview(rt.url)}
                                                                title={playingPreviewUrl === rt.url ? 'Stop' : 'Play Preview'}
                                                            >
                                                                {playingPreviewUrl === rt.url
                                                                    ? <IconStop size={12} fill="currentColor" stroke="none" />
                                                                    : <IconPlay size={14} fill="currentColor" stroke="none" />
                                                                }
                                                            </Button>
                                                            <p className={`text-sm font-bold transition-colors ${selectedReminderRingtone === rt.url ? 'text-brand-primary' : 'text-white'}`}>{rt.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Switch
                                                                checked={selectedReminderRingtone === rt.url && isReminderSoundEnabled}
                                                                onChange={(checked) => {
                                                                    if (checked) {
                                                                        handleSelectReminderRingtone(rt.url, rt.name);
                                                                    } else if (selectedReminderRingtone === rt.url) {
                                                                        handleToggleReminderSound(false);
                                                                    }
                                                                }}
                                                                variant="metallic"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ElevatedMetallicCard>
                        )}

                        {/* Security Section */}
                        <ElevatedMetallicCard
                            title="Security"
                            headerClassName="px-8 py-6"
                            bodyClassName="p-8"
                        >
                            <div className="space-y-6">
                                {isFreelancer && (
                                    <div className="flex items-center justify-between p-4 bg-surface-overlay border border-surface-border rounded-2xl group/toggle transition-colors hover:border-white/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-brand-success/10 flex items-center justify-center text-brand-success font-bold transition-transform group-hover/toggle:scale-110 duration-300">
                                                <IconDollar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Show Available Earnings</p>
                                                <p className="text-xs text-gray-500">Display your ready-for-payout earnings in the header</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={showEarningsHeader}
                                            onChange={handleToggleEarningsVisibility}
                                            variant="metallic"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 bg-surface-overlay border border-surface-border rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                                            <IconSettings className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Password Management</p>
                                            <p className="text-xs text-gray-500">Secure your account with a strong password</p>
                                        </div>
                                    </div>
                                    <Button variant="metallic" size="sm" onClick={() => setIsPasswordModalOpen(true)}>Update</Button>
                                </div>
                            </div>
                        </ElevatedMetallicCard>

                        {isDirty && !isSuperAdmin && (
                            <div className="flex justify-end gap-3 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Button variant="ghost" onClick={handleDiscardChanges} disabled={saving}>Discard Changes</Button>
                                <Button
                                    variant="metallic"
                                    className="px-8 shadow-lg shadow-brand-primary/20"
                                    onClick={handleSaveSettings}
                                    isLoading={saving}
                                >
                                    Save All Settings
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Preview Modal */}
            <Modal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                title="Document Preview"
                size="lg"
            >
                {previewImage && (
                    <div className="flex items-center justify-center p-4">
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[70vh] rounded-xl shadow-2xl animate-in zoom-in duration-300"
                        />
                    </div>
                )}
            </Modal>

            {/* Password Update Modal */}
            <Modal
                isOpen={isPasswordModalOpen}
                onClose={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordData({ newPassword: '', confirmPassword: '' });
                }}
                title="Change Password"
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
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
                <div className="space-y-6">
                    <div className="p-1 px-2 mb-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                        <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest p-2 text-center">
                            Security Tip: Mix symbols, numbers and letters
                        </p>
                    </div>
                    <div className="space-y-4">
                        <Input
                            label="New Password"
                            type="password"
                            variant="metallic"
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            leftIcon={<IconLock className="w-4 h-4" />}
                        />
                        <Input
                            label="Confirm New Password"
                            type="password"
                            variant="metallic"
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            leftIcon={<IconLock className="w-4 h-4" />}
                        />
                    </div>
                </div>
            </Modal>
        </div >
    );
});

export default Settings;
