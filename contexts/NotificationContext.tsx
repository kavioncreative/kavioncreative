import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    type: string;
    reference_id: string | null;
    message: string;
    is_read: boolean;
    user_id: string | null;
    created_at: string;
}

interface NotificationContextType {
    notifications: Notification[] | null;
    fetchNotifications: () => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_RINGTONE = '/Ringtone 1.mp3';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[] | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isInitialLoad = useRef(true);
    const prevCount = useRef<number>(0);
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('nova_notifications_sound_enabled');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });

    const [selectedRingtone, setSelectedRingtone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('nova_selected_ringtone') || DEFAULT_RINGTONE;
        }
        return DEFAULT_RINGTONE;
    });

    // Sync sound setting and selected ringtone from localStorage
    useEffect(() => {
        const handleUpdates = () => {
            const soundEnabled = localStorage.getItem('nova_notifications_sound_enabled');
            setIsSoundEnabled(soundEnabled === null ? true : soundEnabled === 'true');

            const ringtone = localStorage.getItem('nova_selected_ringtone') || DEFAULT_RINGTONE;
            setSelectedRingtone(ringtone);
        };

        window.addEventListener('nova_notifications_sound_updated', handleUpdates);
        window.addEventListener('nova_selected_ringtone_updated', handleUpdates);
        window.addEventListener('storage', handleUpdates);

        return () => {
            window.removeEventListener('nova_notifications_sound_updated', handleUpdates);
            window.removeEventListener('nova_selected_ringtone_updated', handleUpdates);
            window.removeEventListener('storage', handleUpdates);
        };
    }, []);

    // Initialize/Update audio when ringtone changes
    useEffect(() => {
        audioRef.current = new Audio(selectedRingtone);
        audioRef.current.volume = 1.0;
    }, [selectedRingtone]);

    const playSound = () => {
        if (audioRef.current && isSoundEnabled) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.warn('Sound play failed (interaction required):', e));
        }
    };

    const fetchNotifications = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`user_id.eq.${session.user.id},user_id.is.null`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            prevCount.current = data.length;
        }
    };

    const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>) => {
        console.log('--- ADD NOTIFICATION ATTEMPT ---', notification);
        const { data, error } = await supabase
            .from('notifications')
            .insert([notification])
            .select()
            .single();

        if (error) {
            console.error('--- ADD NOTIFICATION ERROR ---', error);
        }

        if (!error && data) {
            // State update triggers the sound effect below
            setNotifications(prev => {
                const exists = prev?.some(n => n.id === data.id);
                if (exists) return prev;
                return [data, ...(prev || [])];
            });
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchNotifications().then(() => {
            // Brief delay to ensure initial state doesn't trigger sound
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 100);
        });
    }, []);

    // Realtime Subscription
    useEffect(() => {
        const setupSubscription = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const channel = supabase
                .channel('notifications_changes')
                .on('postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${session.user.id}`
                    },
                    (payload) => {
                        const newNotif = payload.new as Notification;
                        setNotifications(prev => {
                            const exists = prev?.some(n => n.id === newNotif.id);
                            if (exists) return prev;
                            return [newNotif, ...(prev || [])];
                        });
                    }
                )
                .subscribe();

            return channel;
        };

        let activeChannel: any = null;
        setupSubscription().then(channel => activeChannel = channel);

        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
        };
    }, []);

    // Sound Trigger Logic
    useEffect(() => {
        if (!isInitialLoad.current && notifications !== null) {
            if (notifications.length > prevCount.current) {
                playSound();
            }
            prevCount.current = notifications.length;
        }
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{ notifications, fetchNotifications, addNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
