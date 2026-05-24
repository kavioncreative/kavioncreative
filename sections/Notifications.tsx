import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

const Notifications: React.FC = () => {
    const { profile } = useUser();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!profile?.id) return;
        
        const fetchNotifications = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(100);
                
            if (!error && data) {
                setNotifications(data);
            }
            setLoading(false);
        };
        
        fetchNotifications();
    }, [profile?.id]);

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    return (
        <div className="w-full h-full flex flex-col space-y-6">
            <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Shiny effect at top edge */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 text-sm font-medium">Loading history...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-600 mb-4">
                            <IconBell size={24} />
                        </div>
                        <h3 className="text-white font-bold mb-1">No Notifications</h3>
                        <p className="text-gray-500 text-sm">You are all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-surface-border">
                        {notifications.map(notification => (
                            <div 
                                key={notification.id} 
                                onClick={() => !notification.is_read && markAsRead(notification.id)}
                                className={`p-6 transition-colors cursor-pointer flex gap-4 items-start ${notification.is_read ? 'bg-transparent hover:bg-white/[0.02]' : 'bg-brand-primary/5 hover:bg-brand-primary/10'}`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${notification.is_read ? 'bg-gray-600' : 'bg-brand-primary shadow-[0_0_10px_rgba(255,77,45,0.5)] animate-pulse'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-4 flex-wrap">
                                        <h4 className={`text-sm font-bold ${notification.is_read ? 'text-gray-300' : 'text-white'}`}>
                                            {notification.type === 'project_created' && 'New Project Created'}
                                            {notification.type === 'timeline_update' && 'Timeline Update'}
                                            {!['project_created', 'timeline_update'].includes(notification.type) && 'Notification Update'}
                                            {notification.reference_id && <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-brand-primary font-mono text-[10px] tracking-wider align-middle">{notification.reference_id}</span>}
                                        </h4>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                                            {new Date(notification.created_at).toLocaleString([], {
                                                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className={`mt-2 text-sm leading-relaxed ${notification.is_read ? 'text-gray-400' : 'text-gray-300'}`}>
                                        {notification.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
