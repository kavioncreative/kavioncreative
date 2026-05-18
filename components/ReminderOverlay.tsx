
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Surfaces';
import Button from './Button';
import { Input, TextArea } from './Input';
import { IconBell, IconSend, IconCloudUpload, IconX, IconCheckCircle, IconLoader, IconInfo } from './Icons';
import { addToast } from './Toast';

// The path to the custom ringtone provided in the public folder
const NOTIFICATION_SOUND_URL = '/universfield-new-notification-033-480571.mp3';

interface Reminder {
    id: string;
    type: 'refresher' | 'task';
    recurrence_type: string;
    recurrence_data: any;
    time: string;
    project_managers: string[];
    message: string;
}

export const ReminderOverlay: React.FC = () => {
    const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
    const [currentTriggeredReminder, setCurrentTriggeredReminder] = useState<Reminder | null>(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
    const [responseText, setResponseText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('nova_reminders_sound_enabled');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });

    // Track last trigger time for each reminder in memory
    const lastTriggerRef = useRef<{ [key: string]: number }>({});
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Initialize Audio and Auth
    useEffect(() => {
        console.log('🔔 ReminderOverlay: Initializing audio with source:', NOTIFICATION_SOUND_URL);
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.load(); // Prime the audio

        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log('👤 ReminderOverlay: Current User ID:', user.id);
                setUserId(user.id);
            }
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('🔑 ReminderOverlay: Auth Event:', _event, 'User:', session?.user?.id);
            setUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 1.1 Sync settings
    useEffect(() => {
        const handleSync = () => {
            const saved = localStorage.getItem('nova_reminders_sound_enabled');
            setIsSoundEnabled(saved === null ? true : saved === 'true');
        };
        window.addEventListener('nova_reminders_sound_updated', handleSync);
        window.addEventListener('storage', handleSync);
        return () => {
            window.removeEventListener('nova_reminders_sound_updated', handleSync);
            window.removeEventListener('storage', handleSync);
        };
    }, []);

    // 2. Fetch and Subscribe to Reminders
    useEffect(() => {
        if (!userId) {
            console.log('⏳ ReminderOverlay: Waiting for user session...');
            setActiveReminders([]);
            return;
        }

        const fetchReminders = async () => {
            console.log('📡 ReminderOverlay: Fetching latest reminders from DB...');
            const { data, error } = await supabase
                .from('reminders')
                .select('*');

            if (error) {
                console.error('❌ ReminderOverlay: Fetch error:', error);
                return;
            }

            if (data) {
                const myReminders = data.filter((r: any) =>
                    r.project_managers && r.project_managers.includes(userId)
                );

                console.log(`✅ ReminderOverlay: Found ${myReminders.length} matching reminders for you.`);

                setActiveReminders(prev => {
                    // Auto-close popup if the underlying reminder was deleted
                    if (currentTriggeredReminder) {
                        const stillExists = myReminders.some(mr => mr.id === currentTriggeredReminder.id);
                        if (!stillExists) {
                            console.log('🗑️ ReminderOverlay: Active reminder deleted, closing popup.');
                            setIsPopupOpen(false);
                            setCurrentTriggeredReminder(null);
                        }
                    }
                    return myReminders;
                });
            }
        };

        fetchReminders();

        // Ensure Realtime is enabled in Supabase for the 'reminders' table!
        const channel = supabase
            .channel('reminders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, (payload) => {
                console.log('⚡ ReminderOverlay: Realtime change detected:', payload.eventType);
                fetchReminders();
            })
            .subscribe((status) => {
                console.log('📡 ReminderOverlay: Supabase Realtime Status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ ReminderOverlay: Successfully connected to real-time updates.');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const playAlertSound = () => {
        if (audioRef.current && isSoundEnabled) {
            console.log('🎵 ReminderOverlay: Playing alert sound...');
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(err => {
                console.warn('🔇 ReminderOverlay: Browser blocked auto-play. User interaction needed.', err);
            });
        }
    };

    const triggerPopup = (reminder: Reminder) => {
        if (isPopupOpen || isResponseModalOpen) {
            console.log('⏭️ ReminderOverlay: Popup suppressed (already open or responding).');
            return;
        }

        console.log('💥 ReminderOverlay: TRIGGERING POPUP for:', reminder.message);
        setCurrentTriggeredReminder(reminder);
        setIsPopupOpen(true);
        playAlertSound();
    };

    // 3. Scheduling Loop
    useEffect(() => {
        if (activeReminders.length === 0) return;

        const interval = setInterval(() => {
            const now = new Date();
            const nowTs = now.getTime();

            activeReminders.forEach(r => {
                const lastTrigger = lastTriggerRef.current[r.id] || 0;
                let shouldTrigger = false;

                switch (r.recurrence_type) {
                    case 'seconds': {
                        const seconds = r.recurrence_data.seconds || 30;
                        if (nowTs - lastTrigger >= seconds * 1000) shouldTrigger = true;
                        break;
                    }
                    case 'minutes': {
                        const minutes = r.recurrence_data.minutes || 15;
                        if (nowTs - lastTrigger >= minutes * 60 * 1000) shouldTrigger = true;
                        break;
                    }
                    case 'hourly': {
                        const minOfHour = r.recurrence_data.minuteOfHour || 0;
                        if (now.getMinutes() === minOfHour && now.getSeconds() === 0) {
                            if (nowTs - lastTrigger > 60000) shouldTrigger = true;
                        }
                        break;
                    }
                    case 'daily': {
                        const [h, m] = r.time.split(':').map(Number);
                        if (now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0) {
                            if (nowTs - lastTrigger > 60000) shouldTrigger = true;
                        }
                        break;
                    }
                    case 'weekly': {
                        const days = r.recurrence_data.daysOfWeek || [];
                        const dayName = now.toLocaleDateString('en-US', { weekday: 'short' });
                        const [h, m] = r.time.split(':').map(Number);
                        if (days.includes(dayName) && now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0) {
                            if (nowTs - lastTrigger > 60000) shouldTrigger = true;
                        }
                        break;
                    }
                    case 'monthly': {
                        const dayOfMonth = r.recurrence_data.dayOfMonth || 1;
                        const [h, m] = r.time.split(':').map(Number);
                        if (now.getDate() === dayOfMonth && now.getHours() === h && now.getMinutes() === m && now.getSeconds() === 0) {
                            if (nowTs - lastTrigger > 60000) shouldTrigger = true;
                        }
                        break;
                    }
                }

                if (shouldTrigger) {
                    console.log('⏰ ReminderOverlay: Schedule reached for:', r.id);
                    lastTriggerRef.current[r.id] = nowTs;
                    triggerPopup(r);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [activeReminders, isPopupOpen, isResponseModalOpen]);

    const handleRespond = () => {
        setIsPopupOpen(false);
        setIsResponseModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleSubmitResponse = async () => {
        if (!currentTriggeredReminder) return;

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const fileUrls: string[] = [];
            for (const file of selectedFiles) {
                const fileName = `${Date.now()}_${file.name}`;
                const { data, error } = await supabase.storage
                    .from('reminders')
                    .upload(`${user.id}/${fileName}`, file);

                if (data) {
                    const { data: { publicUrl } } = supabase.storage.from('reminders').getPublicUrl(data.path);
                    fileUrls.push(publicUrl);
                }
            }

            const { error } = await supabase
                .from('reminder_responses')
                .insert([{
                    reminder_id: currentTriggeredReminder.id,
                    user_id: user.id,
                    message: responseText,
                    file_urls: fileUrls
                }]);

            if (error) throw error;

            addToast({ type: 'success', title: 'Response Sent', message: 'Your response has been submitted successfully.' });
            setIsResponseModalOpen(false);
            setResponseText('');
            setSelectedFiles([]);
            setCurrentTriggeredReminder(null);
        } catch (error: any) {
            console.error('Submission failed:', error);
            addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to submit response.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Real-time Reminder Alert */}
            {isPopupOpen && currentTriggeredReminder && (
                <div className="fixed top-6 right-6 z-[9999] w-full max-w-sm animate-in slide-in-from-right-full duration-500">
                    <div className="relative group overflow-hidden rounded-2xl bg-surface-card border border-brand-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(255,77,45,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />

                        <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary animate-bounce">
                                        <IconBell className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Reminder</h4>
                                        <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest leading-none">
                                            {currentTriggeredReminder.type === 'refresher' ? 'Daily Refresher' : 'Task Alert'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPopupOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                                >
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                                <p className="text-sm text-gray-200 leading-relaxed italic">
                                    "{currentTriggeredReminder.message}"
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleRespond}
                                className="w-full shadow-lg shadow-brand-primary/20"
                            >
                                Respond Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Response Modal */}
            <Modal
                isOpen={isResponseModalOpen}
                onClose={() => setIsResponseModalOpen(false)}
                title="Reminder Response"
                size="md"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setIsResponseModalOpen(false)}>Discard</Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmitResponse}
                            isLoading={isSubmitting}
                            leftIcon={<IconSend className="w-4 h-4" />}
                            className="px-8 shadow-lg shadow-brand-primary/20"
                        >
                            Send Response
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {currentTriggeredReminder && (
                        <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                                <IconInfo className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reminder Context</p>
                                <p className="text-sm text-gray-200 italic">"{currentTriggeredReminder.message}"</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Your Response</label>
                        <TextArea
                            placeholder="Type your response here..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            rows={4}
                            variant="metallic"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Attachments</label>
                        <div className="relative group">
                            <input
                                type="file"
                                id="reminder-files"
                                multiple
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                accept="image/*,video/*,.pdf,.doc,.docx"
                            />
                            <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl bg-black/20 flex flex-col items-center justify-center gap-3 group-hover:border-brand-primary/50 transition-colors">
                                <div className="p-4 rounded-2xl bg-white/5 text-gray-400 group-hover:text-brand-primary transition-colors">
                                    <IconCloudUpload size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white mb-1">Click to Upload Files</p>
                                    <p className="text-xs text-gray-500">Supports images, videos, and documents</p>
                                </div>
                            </div>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="grid grid-cols-1 gap-2">
                                {selectedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 group">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <IconCheckCircle className="w-4 h-4 text-brand-primary" />
                                            <span className="text-xs text-gray-300 truncate font-medium">{file.name}</span>
                                            <span className="text-[10px] text-gray-500 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="p-1 hover:bg-brand-error/20 text-gray-500 hover:text-brand-error rounded-lg"
                                        >
                                            <IconX className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};
