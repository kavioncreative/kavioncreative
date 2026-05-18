import React, { useState } from 'react';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';

interface ThanksScreenProps {
    onDashboard: () => void;
}

const ThanksScreen: React.FC<ThanksScreenProps> = ({ onDashboard }) => {
    const [loading, setLoading] = useState(false);
    const { refreshProfile } = useUser();

    const handleGetStarted = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ has_seen_welcome: true })
                    .eq('id', user.id);

                if (error) {
                    // If the column doesn't exist yet, we don't want to block the user
                    if (error.code === '42703') {
                        console.warn('Welcome tracking column missing. Please run the SQL migration.');
                    } else {
                        throw error;
                    }
                }
                await refreshProfile();
            }
            onDashboard();
        } catch (error: any) {
            console.error('Error updating welcome status:', error);
            // We still proceed to dashboard even if this fails
            onDashboard();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[400px] w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl shadow-2xl mx-auto animate-in fade-in zoom-in-95 duration-700 overflow-hidden relative flex flex-col">
            {/* Premium Metallic Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />

            {/* Successful Decorative Element */}
            <div className="relative z-10 flex-col flex items-center justify-center pt-10 pb-8 px-6 text-center">
                <div className="relative mb-6">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center border-2 border-brand-primary/30 relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-brand-primary/5 opacity-50" />
                        <svg className="w-10 h-10 text-brand-primary drop-shadow-[0_0_15px_rgba(255,107,75,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-3xl font-black text-white mb-8 tracking-tight">
                    Welcome to the Team
                </h1>

                <div className="w-full max-w-xs space-y-4">
                    <Button
                        variant="metallic"
                        size="lg"
                        className="w-full"
                        onClick={handleGetStarted}
                        isLoading={loading}
                    >
                        Go to Dashboard
                    </Button>
                </div>
            </div>

            {/* Footer-like bottom area for balance */}
            <div className="mt-auto relative z-10 py-8 px-10 border-t border-white/5 bg-white/[0.02] flex items-center justify-center">
                <p className="text-gray-500 text-sm tracking-widest font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    Powered By CodesLogic
                </p>
            </div>
        </div>
    );
};

export default ThanksScreen;
