import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { addToast } from '../components/Toast';

// Inline Custom SVG Icons for UI
const IconClock = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const IconLock = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const IconAlert = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const IconShield = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

// Dynamic notification chime synthesizer using Web Audio API
const playChimeSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        
        // Tone 1: Fundamental bell tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
        
        // Tone 2: Metallic harmonic
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1760, now); // Octave
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.6);
    } catch (e) {
        console.error('Audio chime error:', e);
    }
};

export const AttendanceTracker: React.FC = () => {
    const { profile } = useUser();
    const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
    const [status, setStatus] = useState<string>('PunchedOut'); // PunchedOut, Active, Idle, Break
    const [shift, setShift] = useState<any>(null);
    const [showLockScreen, setShowLockScreen] = useState(false);
    const [lockPassword, setLockPassword] = useState('');
    const [lockError, setLockError] = useState('');
    const [showRandomCheck, setShowRandomCheck] = useState(false);
    const [countdown, setCountdown] = useState(300); // 5 minutes (300s)
    const [activeCheckId, setActiveCheckId] = useState<string | null>(null);

    const lastActivityRef = useRef<number>(Date.now());
    const isFlashingRef = useRef<boolean>(false);
    const isFlashingIntervalRef = useRef<any>(null);
    const checkTimerRef = useRef<any>(null);
    const countTimerRef = useRef<any>(null);

    // Fetch shift config & active attendance record on load or user change
    useEffect(() => {
        if (!profile) {
            setAttendanceRecord(null);
            setStatus('PunchedOut');
            setShowLockScreen(false);
            return;
        }

        const loadData = async () => {
            try {
                // Fetch current user shift timing
                const { data: shiftData } = await supabase
                    .from('user_shifts')
                    .select('*')
                    .eq('user_id', profile.id)
                    .single();

                if (shiftData) setShift(shiftData);

                // Fetch today's current open attendance record
                const { data: activeRec } = await supabase
                    .from('attendance_records')
                    .select('*')
                    .eq('user_id', profile.id)
                    .is('punch_out_at', null)
                    .order('punch_in_at', { ascending: false })
                    .limit(1);

                if (activeRec && activeRec.length > 0) {
                    const record = activeRec[0];
                    setAttendanceRecord(record);
                    setStatus(record.status);
                    
                    // If previously idle, load lock screen
                    if (record.status === 'Idle') {
                        setShowLockScreen(true);
                    }
                } else {
                    setAttendanceRecord(null);
                    setStatus('PunchedOut');
                    setShowLockScreen(false);
                }
            } catch (err) {
                console.error('Error loading attendance data:', err);
            }
        };

        loadData();
    }, [profile]);

    // Share status state with the rest of the application via localStorage & custom events
    useEffect(() => {
        localStorage.setItem('kavion_attendance_status', status);
        localStorage.setItem('kavion_attendance_record', JSON.stringify(attendanceRecord));
        window.dispatchEvent(new Event('kavion-attendance-update'));
    }, [status, attendanceRecord]);

    // Listen for tab focus/active state changes from other components (like header buttons)
    useEffect(() => {
        const handleForceRefresh = () => {
            const cachedStatus = localStorage.getItem('kavion_attendance_status') || 'PunchedOut';
            const cachedRec = localStorage.getItem('kavion_attendance_record');
            
            setStatus(cachedStatus);
            if (cachedRec) {
                setAttendanceRecord(JSON.parse(cachedRec));
            } else {
                setAttendanceRecord(null);
            }

            if (cachedStatus === 'Idle') {
                setShowLockScreen(true);
            } else {
                setShowLockScreen(false);
            }
        };

        window.addEventListener('kavion-attendance-force-refresh', handleForceRefresh);
        return () => window.removeEventListener('kavion-attendance-force-refresh', handleForceRefresh);
    }, []);

    // Monitor user interaction events to track activity and reset idle timer
    useEffect(() => {
        if (status === 'PunchedOut' || status === 'Completed') return;

        const handleActivity = () => {
            lastActivityRef.current = Date.now();
            
            // If the user was Idle but screen wasn't locked yet, restore Active status
            if (status === 'Idle' && !showLockScreen) {
                updateLocalStatus('Active');
            }
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [status, showLockScreen]);

    // Core Active Tracking Loop (Runs every 1 minute)
    useEffect(() => {
        if (status === 'PunchedOut' || status === 'Completed' || !profile || !attendanceRecord) return;

        const interval = setInterval(async () => {
            const now = Date.now();
            const minsSinceActivity = (now - lastActivityRef.current) / 60000;
            
            let nextStatus = status;

            // 1. Check Idle transitions (30-Minute Boundary)
            if (minsSinceActivity >= 30 && status === 'Active') {
                nextStatus = 'Idle';
                updateLocalStatus('Idle');
            }

            // 2. Check Lock Screen trigger (10-Minute Inactivity)
            if (minsSinceActivity >= 10 && !showLockScreen && status === 'Active') {
                setShowLockScreen(true);
                nextStatus = 'Idle';
                updateLocalStatus('Idle');
            }

            // 3. Increment counters in DB (total_active_mins, total_idle_mins, total_break_mins)
            try {
                const updates: any = {
                    last_activity_at: new Date().toISOString(),
                    status: nextStatus
                };

                if (nextStatus === 'Active') {
                    updates.total_active_mins = (attendanceRecord.total_active_mins || 0) + 1;
                } else if (nextStatus === 'Idle') {
                    updates.total_idle_mins = (attendanceRecord.total_idle_mins || 0) + 1;
                } else if (nextStatus === 'Break') {
                    updates.total_break_mins = (attendanceRecord.total_break_mins || 0) + 1;
                }

                const { data, error } = await supabase
                    .from('attendance_records')
                    .update(updates)
                    .eq('id', attendanceRecord.id)
                    .select()
                    .single();

                if (!error && data) {
                    setAttendanceRecord(data);
                }
            } catch (err) {
                console.error('Error updating attendance tick:', err);
            }

            // 4. Check Shift end auto-logout boundary
            if (shift) {
                const nowTime = new Date();
                const [endH, endM] = shift.end_time.split(':').map(Number);
                const shiftEnd = new Date();
                shiftEnd.setHours(endH, endM, 0, 0);

                if (nowTime.getTime() > shiftEnd.getTime() && nowTime.getTime() - shiftEnd.getTime() < 300000) {
                    // Automatically log out 5 minutes after shift end if they didn't extend
                    handleAutoLogout();
                }
            }

            // 5. Random check trigger check
            checkRandomPopupTrigger();

        }, 60000); // Trigger check loop every 60 seconds

        return () => clearInterval(interval);
    }, [status, attendanceRecord, showLockScreen, shift, profile]);

    // Check if a random verification pop-up needs to be displayed
    const checkRandomPopupTrigger = () => {
        if (status !== 'Active' || !shift || showRandomCheck) return;

        // Check shift time boundary: only trigger within shift hours
        const now = new Date();
        const [startH, startM] = shift.start_time.split(':').map(Number);
        const [endH, endM] = shift.end_time.split(':').map(Number);
        
        const shiftStart = new Date();
        shiftStart.setHours(startH, startM, 0, 0);
        const shiftEnd = new Date();
        shiftEnd.setHours(endH, endM, 0, 0);

        if (now.getTime() < shiftStart.getTime() || now.getTime() > shiftEnd.getTime()) {
            return; // Outside shift hours
        }

        // Check if check has been run today
        const todayStr = now.toDateString();
        const lastCheckDate = localStorage.getItem('kavion_last_random_check_date');
        
        if (lastCheckDate === todayStr) return; // Already checked today

        // Random schedule helper: E.g., 20% chance of triggering during this minute tick
        const triggerChance = Math.random() < 0.05; // ~5% probability check per minute
        if (triggerChance) {
            triggerRandomCheck();
        }
    };

    const triggerRandomCheck = async () => {
        if (!profile) return;
        try {
            setShowRandomCheck(true);
            setCountdown(300); // 5 minutes

            // Play notification sound chimes
            playChimeSound();

            // Flash tab title
            startTabTitleFlashing();

            // Insert check record in database
            const { data, error } = await supabase
                .from('active_checks')
                .insert([{
                    user_id: profile.id,
                    status: 'Pending'
                }])
                .select()
                .single();

            if (!error && data) {
                setActiveCheckId(data.id);
            }

            // Start countdown timer
            if (countTimerRef.current) clearInterval(countTimerRef.current);
            countTimerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countTimerRef.current);
                        handleRandomCheckMissed();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Save date to prevent repeating today
            localStorage.setItem('kavion_last_random_check_date', new Date().toDateString());
        } catch (e) {
            console.error('Error initiating random check:', e);
        }
    };

    const handleRandomCheckConfirm = async () => {
        if (countTimerRef.current) clearInterval(countTimerRef.current);
        stopTabTitleFlashing();
        setShowRandomCheck(false);

        if (activeCheckId) {
            await supabase
                .from('active_checks')
                .update({
                    responded_at: new Date().toISOString(),
                    status: 'Confirmed'
                })
                .eq('id', activeCheckId);
        }

        addToast({ type: 'success', title: 'Presence Confirmed', message: 'Thank you. Your active status has been verified.' });
        setActiveCheckId(null);
    };

    const handleRandomCheckMissed = async () => {
        stopTabTitleFlashing();
        setShowRandomCheck(false);

        if (activeCheckId) {
            await supabase
                .from('active_checks')
                .update({ status: 'Missed' })
                .eq('id', activeCheckId);
        }

        // Force transition status to Break
        updateLocalStatus('Break');
        addToast({ type: 'error', title: 'Check Missed', message: 'You missed the active presence check. System has transitioned to Break state.' });
        setActiveCheckId(null);
    };

    // Tab Flashing Actions
    const startTabTitleFlashing = () => {
        if (isFlashingRef.current) return;
        isFlashingRef.current = true;
        const originalTitle = document.title;
        let toggle = false;

        isFlashingIntervalRef.current = setInterval(() => {
            document.title = toggle ? '⚠️ Are you active?' : 'Action Required!';
            toggle = !toggle;
        }, 1000);
    };

    const stopTabTitleFlashing = () => {
        if (!isFlashingRef.current) return;
        isFlashingRef.current = false;
        clearInterval(isFlashingIntervalRef.current);
        document.title = 'Kavion Creative'; // Reset to standard title
    };

    const updateLocalStatus = async (newStatus: string) => {
        if (!attendanceRecord) return;
        try {
            setStatus(newStatus);
            const { data } = await supabase
                .from('attendance_records')
                .update({ status: newStatus })
                .eq('id', attendanceRecord.id)
                .select()
                .single();

            if (data) setAttendanceRecord(data);
        } catch (e) {
            console.error('Error changing status:', e);
        }
    };

    const handleUnlock = async () => {
        if (!profile) return;
        setLockError('');

        // Simple validation check: Verify user password by logging in again
        const { error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: lockPassword
        });

        if (error) {
            setLockError('Invalid password. Please try again.');
        } else {
            setShowLockScreen(false);
            setLockPassword('');
            setLockError('');
            lastActivityRef.current = Date.now();
            updateLocalStatus('Active');
            addToast({ type: 'success', title: 'Screen Unlocked', message: 'Welcome back to your workspace.' });
        }
    };

    const handleSwitchAccount = async () => {
        setShowLockScreen(false);
        handleAutoLogout();
    };

    const handleAutoLogout = async () => {
        // Complete current attendance session before logging out
        if (attendanceRecord) {
            await supabase
                .from('attendance_records')
                .update({
                    punch_out_at: new Date().toISOString(),
                    status: 'Completed'
                })
                .eq('id', attendanceRecord.id);
        }

        // Perform Sign Out
        await supabase.auth.signOut();
        setStatus('PunchedOut');
        setAttendanceRecord(null);
        localStorage.removeItem('kavion_attendance_status');
        localStorage.removeItem('kavion_attendance_record');
        window.location.reload();
    };

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            if (checkTimerRef.current) clearInterval(checkTimerRef.current);
            if (countTimerRef.current) clearInterval(countTimerRef.current);
            if (isFlashingIntervalRef.current) clearInterval(isFlashingIntervalRef.current);
        };
    }, []);

    // Format seconds to mm:ss
    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <>
            {/* 1. KAVION CREATIVE LOCK SCREEN MODAL */}
            {showLockScreen && profile && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-lg animate-in fade-in duration-300">
                    <div className="w-full max-w-md p-8 mx-4 rounded-3xl border border-white/10 bg-surface-card shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] text-center space-y-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />
                        
                        <div className="flex flex-col items-center gap-4 relative z-10">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-full border-2 border-brand-primary/40 object-cover shadow-[0_0_15px_rgba(255,77,45,0.2)]"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full border-2 border-brand-primary/40 bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-3xl shadow-[0_0_15px_rgba(255,77,45,0.2)]">
                                    {profile.name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-white tracking-wide uppercase">Workspace Locked</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{profile.name} • {profile.role}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Inactivity Duration</span>
                            <div className="flex items-center justify-center gap-2 text-amber-500">
                                <IconClock className="w-4 h-4" />
                                <span className="text-sm font-bold">Currently Idle (Timer Active)</span>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            <div className="space-y-1 text-left">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Unlock Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter password..."
                                    value={lockPassword}
                                    onChange={(e) => setLockPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUnlock();
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/40 text-sm text-white focus:outline-none focus:border-brand-primary/40 transition-colors"
                                />
                                {lockError && <p className="text-xs text-red-500 font-bold mt-1 px-1">{lockError}</p>}
                            </div>

                            <button
                                onClick={handleUnlock}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(255,77,45,0.25)]"
                            >
                                Resume Session
                            </button>

                            <div className="pt-2">
                                <button
                                    onClick={handleSwitchAccount}
                                    className="text-xs text-gray-500 hover:text-white font-bold uppercase tracking-wider transition-colors"
                                >
                                    Not {profile.name?.split(' ')[0]}? Switch Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. RANDOM PRESENCE POPUP CHECK */}
            {showRandomCheck && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-md p-8 mx-4 rounded-3xl border-2 border-brand-primary/30 bg-surface-card shadow-[0_0_50px_rgba(255,77,45,0.25)] text-center space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-primary to-brand-secondary animate-pulse" />
                        
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-[0_0_20px_rgba(255,77,45,0.15)]">
                                <IconShield className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase">Presence Verification</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Please confirm you are active at your desk</p>
                            </div>
                        </div>

                        <div className="py-6 space-y-3">
                            <div className="text-5xl font-black text-brand-primary tracking-wide tabular-nums animate-pulse">
                                {formatTime(countdown)}
                            </div>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                Failure to confirm will transition shift state to Break
                            </p>
                        </div>

                        <button
                            onClick={handleRandomCheckConfirm}
                            className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_8px_24px_rgba(255,77,45,0.3)]"
                        >
                            I am Active
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
