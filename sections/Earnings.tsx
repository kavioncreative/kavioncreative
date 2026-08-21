import React, { useState, useEffect } from 'react';
import { Card, ElevatedMetallicCard, Tooltip, Modal } from '../components/Surfaces';
import { Table } from '../components/Table';
import { Avatar } from '../components/Avatar';
import Button from '../components/Button';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { Dropdown } from '../components/Dropdown';
import { Tabs } from '../components/Navigation';
import {
    IconDollar,
    IconClock,
    IconCheckCircle,
    IconTrendingUp,
    IconBriefcase,
    IconFilter,
    IconDownload,
    IconCalendar,
    IconX,
    IconChartBar,
    IconCreditCard,
    IconChevronRight,
    IconUser
} from '../components/Icons';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useAccounts } from '../contexts/AccountContext';
import { addToast } from '../components/Toast';
import { getInitialTab, updateRoute } from '../utils/routing';
import { BonusMilestonesWidget } from '../components/BonusMilestonesWidget';

// Module-level cache — survives component unmount/remount within the same browser session.
// Cleared automatically when the page is refreshed or the tab is closed.
let _earningsCache: any[] | null = null;
let _releaseLogsCache: any[] | null = null;

const calculateClearanceDaysLeft = (clearanceStartDateStr: string | Date | null): number => {
    if (!clearanceStartDateStr) return 0;
    const startDate = new Date(clearanceStartDateStr);
    if (isNaN(startDate.getTime())) return 0;
    
    // Convert to PKT (UTC+5) calendar components using UTC getter methods
    const pktStart = new Date(startDate.getTime() + (5 * 3600000));
    const startYear = pktStart.getUTCFullYear();
    const startMonth = pktStart.getUTCMonth(); // 0-11
    
    // Target is the 15th of the next month
    let releaseYear = startYear;
    let releaseMonth = startMonth + 1;
    if (releaseMonth > 11) {
        releaseMonth = 0;
        releaseYear += 1;
    }
    
    // Today's date in PKT (UTC+5)
    const now = new Date();
    const pktNow = new Date(now.getTime() + (5 * 3600000));
    
    // Compare the date portions using Date.UTC
    const pktNowDateOnly = Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate());
    const releaseDateOnly = Date.UTC(releaseYear, releaseMonth, 15);
    
    const diffMs = releaseDateOnly - pktNowDateOnly;
    const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));
    
    return Math.max(0, diffDays);
};

const formatPKRAmount = (amount: number) => {
    return `PKR ${Math.round(amount).toLocaleString('en-US')}`;
};

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 2026 + 1 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: String(y) };
});

const monthOptions = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
];

const Earnings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [earningsData, setEarningsData] = useState<any[]>(_earningsCache ?? []);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [releaseLogs, setReleaseLogs] = useState<any[]>(_releaseLogsCache ?? []);
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'lifetime' | 'pending'>('lifetime');
    const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history'>(getInitialTab('Earnings', 'pending') as 'pending' | 'history');
    
    // Payout Period selectors
    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));

    // Detailed breakdown states
    const [penaltiesList, setPenaltiesList] = useState<any[]>([]);
    const [monthlyBonuses, setMonthlyBonuses] = useState<any[]>([]);
    const [penaltyStructures, setPenaltyStructures] = useState<any[]>([]);
    const [breakdownLoading, setBreakdownLoading] = useState(false);

    const { accounts } = useAccounts();
    const { profile, loading: userLoading, effectiveRole } = useUser();
    const isAdmin = effectiveRole === 'Admin' || effectiveRole === 'Super Admin';
    const isFreelancer = effectiveRole === 'Freelancer' || effectiveRole === 'Team Lead' || effectiveRole === 'Team Designer';

    const netEstimatedPayout = (() => {
        const baseSalary = profile?.payout_strategy === 'basicplusbonus' ? Number(profile?.fixed_payout_rate || 0) : 0;
        const bonusesTotal = monthlyBonuses.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        const penaltiesTotal = penaltiesList.reduce((sum, penalty) => {
            const rule = penaltyStructures.find(
                p => (p.name || '').toLowerCase() === (penalty.reason || '').toLowerCase()
            );
            return sum + Number(rule?.amount ?? 50);
        }, 0);
        return baseSalary + bonusesTotal - penaltiesTotal;
    })();

    const alreadyPaid = (() => {
        return (releaseLogs || [])
            .filter(log => Number(log.payout_month) === Number(selectedMonth) && Number(log.payout_year) === Number(selectedYear))
            .reduce((sum, log) => sum + Number(log.amount || 0), 0);
    })();

    useEffect(() => {
        if (!userLoading && profile?.email) {
            fetchEarnings(profile.email, true);
            fetchReleaseLogs(profile.email);
        }
    }, [profile?.email, userLoading, effectiveRole]);

    // Trigger update on selectedYear or selectedMonth change
    useEffect(() => {
        if (profile?.id) {
            const yr = Number(selectedYear);
            const mo = Number(selectedMonth);
            const start = new Date(yr, mo, 1, 0, 0, 0, 0);
            const end = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
            
            setDateFrom(start);
            setDateTo(end);
            fetchDetailedBreakdown(start, end);
        }
    }, [selectedYear, selectedMonth, profile?.id]);



    // Auto-refresh earnings every hour
    useEffect(() => {
        if (!profile?.email) return;
        const refreshInterval = setInterval(() => {
            fetchEarnings(profile.email, false);
        }, 3600000);

        return () => clearInterval(refreshInterval);
    }, [profile?.email]);

    useEffect(() => {
        applyFilters();
    }, [earningsData, dateFrom, dateTo, selectedAccount, activeSummaryFilter, activeSubTab]);

    useEffect(() => {
        updateRoute('Earnings', activeSubTab);
    }, [activeSubTab]);



    const fetchEarnings = async (email: string, isInitial = false) => {
        try {
            if (isInitial) setLoading(true);

            if (!profile?.id) return;

            // Fallback for older projects where assignee_id might not be set
            const freelancerName = profile?.name || email;

            const { data, error } = await supabase
                .from('projects')
                .select('project_id, project_title, client_name, price, designer_fee, team_payout, team_designer_fee, team_designer_id, assignee_id, updated_at, created_at, account_id, funds_status, clearance_start_date, clearance_days, status, assignee')
                .or(`assignee_id.eq.${profile.id},team_designer_id.eq.${profile.id},assignee.eq.${freelancerName},assignee.eq.${email}`)
                .eq('status', 'Approved')
                .order('updated_at', { ascending: false });

            if (!error && data) {
                const formatted = data.map(p => {
                    let daysLeft = 0;
                    if (p.clearance_start_date && p.funds_status === 'Pending') {
                        daysLeft = calculateClearanceDaysLeft(p.clearance_start_date);
                    }

                    let actualStatus = p.funds_status;
                    if (p.funds_status === 'Pending' && daysLeft === 0) {
                        actualStatus = 'Cleared';
                    }

                    // CALCULATE PERSONAL NET EARNINGS
                    let personalNet = 0;
                    const platformPayout = Number(p.designer_fee) || 0;
                    const subDesignerCost = Number(p.team_designer_fee) || Number(p.team_payout) || 0;

                    if (p.team_designer_id === profile.id) {
                        // Case: User is the sub-designer
                        personalNet = subDesignerCost;
                    } else {
                        // Case: User is the main assignee (Team Lead or independent)
                        // Per user request: TL should see their total project payout (Gross)
                        personalNet = platformPayout;
                    }

                    return {
                        id: p.project_id,
                        project: p.project_title || p.project_id,
                        client: p.client_name || 'Personal',
                        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(personalNet),
                        rawAmount: personalNet,
                        date: p.clearance_start_date ? systemFormatDate(new Date(p.clearance_start_date)) : 'N/A',
                        rawDate: p.clearance_start_date,
                        accountId: p.account_id,
                        funds_status: actualStatus,
                        daysLeft: daysLeft
                    };
                });
                _earningsCache = formatted;
                setEarningsData(formatted);
            }
        } catch (err) {
            console.error('Error fetching earnings:', err);
        } finally {
            setLoading(false);
        }

    };


    const fetchReleaseLogs = async (email: string) => {
        try {
            const { data, error } = await supabase
                .from('payment_releases')
                .select('*')
                .eq('freelancer_email', email)
                .order('release_date', { ascending: false });

            if (!error && data) {
                _releaseLogsCache = data;
                setReleaseLogs(data);
            }
        } catch (err) {
            console.error('Error fetching release logs:', err);
        }
    };

    const fetchDetailedBreakdown = async (startOfMonth: Date, endOfMonth: Date) => {
        if (!profile?.id || !effectiveRole) return;
        setBreakdownLoading(true);
        try {
            // 1. Fetch valid user penalties for the selected month
            const { data: penalties, error: pError } = await supabase
                .from('user_penalties')
                .select('*')
                .eq('user_id', profile.id)
                .eq('status', 'Valid')
                .gte('created_at', startOfMonth.toISOString())
                .lte('created_at', endOfMonth.toISOString());

            if (!pError && penalties) {
                setPenaltiesList(penalties);
            }

            // 2. Fetch bonus structures for user's role
            const { data: structures, error: bError } = await supabase
                .from('bonus_structures')
                .select('*');

            if (!bError && structures) {
                const matched = (structures || []).filter(b => {
                    const roles = (b.role || '').split(',').map((r: string) => r.trim().toLowerCase());
                    return roles.includes((effectiveRole || '').toLowerCase());
                });

                const matchedBonuses = matched.filter(b => b.record_type === 'bonus' || !b.record_type);
                const matchedPenalties = matched.filter(b => b.record_type === 'penalty');
                setPenaltyStructures(matchedPenalties);
                
                // Calculate progress for each structure to see if user qualifies
                const qualifying: any[] = [];
                for (const bonus of matchedBonuses) {
                    let currentVal = 0;
                    let qualifies = false;

                    if (bonus.calc_type === 'Volume') {
                        const isPm = effectiveRole.toLowerCase().includes('manager') || effectiveRole.toLowerCase().includes('admin');
                        let query = supabase
                            .from('projects')
                            .select('id', { count: 'exact', head: true })
                            .eq('status', 'Approved')
                            .gte('created_at', startOfMonth.toISOString())
                            .lte('created_at', endOfMonth.toISOString());
                        
                        if (isPm) {
                            query = query.eq('primary_manager_id', profile.id);
                        } else {
                            query = query.eq('assignee', profile.id);
                        }
                        const { count } = await query;
                        currentVal = count || 0;
                        qualifies = currentVal >= bonus.target;

                    } else if (bonus.calc_type === 'Percentage') {
                        const { data: leads } = await supabase
                            .from('leads')
                            .select('status')
                            .eq('assigned_to', profile.id)
                            .gte('created_at', startOfMonth.toISOString())
                            .lte('created_at', endOfMonth.toISOString());

                        if (leads && leads.length > 0) {
                            const converted = leads.filter(l => l.status === 'Converted').length;
                            currentVal = Math.round((converted / leads.length) * 100);
                        }
                        qualifies = currentVal >= bonus.target;

                    } else if (bonus.calc_type === 'Rating') {
                        const { data: reviews } = await supabase
                            .from('reviews')
                            .select('rating')
                            .eq('user_id', profile.id)
                            .gte('created_at', startOfMonth.toISOString())
                            .lte('created_at', endOfMonth.toISOString());

                        if (reviews && reviews.length > 0) {
                            const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                            currentVal = Math.round((sum / reviews.length) * 10) / 10;
                        }
                        qualifies = currentVal >= bonus.target;

                    } else if (bonus.calc_type === 'Punctuality') {
                        const { data: attendance } = await supabase
                            .from('attendance_records')
                            .select('punch_in_at')
                            .eq('user_id', profile.id)
                            .gte('punch_in_at', startOfMonth.toISOString())
                            .lte('punch_in_at', endOfMonth.toISOString());

                        let onTimeCount = 0;
                        if (attendance && attendance.length > 0) {
                            const { data: shift } = await supabase
                                .from('user_shifts')
                                .select('start_time')
                                .eq('user_id', profile.id)
                                .single();

                            const shiftStartStr = shift?.start_time || '09:00:00';
                            const [sH, sM] = shiftStartStr.split(':').map(Number);

                            attendance.forEach(rec => {
                                const pIn = new Date(rec.punch_in_at);
                                const checkTime = pIn.getHours() * 60 + pIn.getMinutes();
                                const limitTime = sH * 60 + sM + 15;
                                if (checkTime <= limitTime) {
                                    onTimeCount++;
                                }
                            });
                        }
                        currentVal = onTimeCount;
                        let resolvedTarget = bonus.target;
                        if (bonus.target === 0) {
                            resolvedTarget = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
                        }
                        qualifies = currentVal >= resolvedTarget;

                    } else if (bonus.calc_type === 'OTD Score') {
                        const { data: comments, error: cErr } = await supabase
                            .from('project_comments')
                            .select('content')
                            .eq('author_id', profile.id)
                            .like('content', 'STATUS_CHANGED:%')
                            .gte('created_at', startOfMonth.toISOString())
                            .lte('created_at', endOfMonth.toISOString());

                        if (!cErr && comments) {
                            let total = 0;
                            let timely = 0;
                            comments.forEach(item => {
                                total++;
                                const parts = item.content.split(':');
                                if (parts[3] !== 'LATE') {
                                    timely++;
                                }
                            });
                            const otdVal = total >= 5 ? Math.round((timely / total) * 100) : null;
                            if (otdVal !== null) {
                                currentVal = otdVal;
                                qualifies = otdVal >= bonus.target;
                            }
                        }
                    } else if (bonus.calc_type === 'Penalties') {
                        const { count } = await supabase
                            .from('user_penalties')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', profile.id)
                            .eq('status', 'Valid')
                            .gte('created_at', startOfMonth.toISOString())
                            .lte('created_at', endOfMonth.toISOString());

                        currentVal = count || 0;
                        qualifies = currentVal === 0;
                    }

                    if (qualifies) {
                        qualifying.push({
                            ...bonus,
                            currentVal
                        });
                    }
                }
                setMonthlyBonuses(qualifying);
                
                // Save structures to local state / variable to allow dynamic penalty mapping in render
                (window as any)._allRoleStructures = matched;
            }
        } catch (e) {
            console.error('Error fetching detailed breakdown details:', e);
        } finally {
            setBreakdownLoading(false);
        }
    };

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

        if (selectedAccount !== 'all') {
            const acc = accounts.find(a => a.id === selectedAccount);
            filtered = filtered.filter(item =>
                item.accountId === selectedAccount ||
                (acc?.prefix && item.id.startsWith(acc.prefix.toUpperCase()))
            );
        }

        if (activeSummaryFilter === 'lifetime') {
            filtered = filtered.filter(item => item.funds_status === 'Paid');
        } else if (activeSummaryFilter === 'pending') {
            if (activeSubTab === 'pending') {
                filtered = filtered.filter(item => item.funds_status === 'Pending');
            } else {
                // Payment History tab — show all cleared/paid for table but use releaseLogs
                filtered = filtered.filter(item => item.funds_status === 'Cleared');
            }
        }

        setFilteredData(filtered);
    };



    const handleExportCSV = () => {
        if (filteredData.length === 0) return;
        const headers = ['Date', 'Project ID', 'Funds Status', 'Payout'];
        const csvRows = [headers.join(',')];

        filteredData.forEach(item => {
            const row = [
                `"${item.date}"`,
                `"${item.id}"`,
                `"${item.funds_status}"`,
                `"${item.amount.replace(/[$,]/g, '')}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `earnings_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };





    if (userLoading) {
        return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
    }

    return (
        <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


            {/* Main Content */}
            <div className="space-y-4">
                {/* Filter Bar */}
                <Card
                    isElevated={true}
                    disableHover={true}
                    className="h-full flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova"
                    bodyClassName="flex-1 h-full py-0 px-0 overflow-visible"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                    <div className="p-3 relative z-10 w-full h-full">
                        <div className="w-full h-full flex flex-col xl:flex-row items-center justify-between gap-4 py-1 px-2">
                            <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                                <Dropdown
                                    variant="metallic"
                                    placeholder="Year"
                                    options={yearOptions}
                                    value={selectedYear}
                                    onChange={setSelectedYear}
                                    className="xl:w-[120px]"
                                />
                                <Dropdown
                                    variant="metallic"
                                    placeholder="Month"
                                    options={monthOptions}
                                    value={selectedMonth}
                                    onChange={setSelectedMonth}
                                    className="xl:w-[180px]"
                                />
                            </div>


                        </div>
                    </div>
                </Card>

                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'lifetime'}
                        bodyClassName="h-full w-full"
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'lifetime'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30 shadow-nova'
                            }`}
                        onClick={() => setActiveSummaryFilter('lifetime')}
                    >
                        {/* Metallic Shine Overlay for Inactive state */}
                        {activeSummaryFilter !== 'lifetime' && (
                            <>
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                            </>
                        )}
                        <div className="p-5 relative z-10 w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeSummaryFilter === 'lifetime' ? 'text-white/80' : 'text-gray-400'}`}>Lifetime Earnings</p>
                                    <h4 className={`text-2xl font-black ${activeSummaryFilter === 'lifetime' ? 'text-white' : 'text-brand-success'}`}>
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                            earningsData.filter(item => {
                                                if (item.funds_status !== 'Paid') return false;
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
                                            }).reduce((sum, item) => sum + (item.rawAmount || 0), 0)
                                        )}
                                    </h4>
                                </div>
                                <div className={`p-2 rounded-lg border bg-white/5 border-white/10 text-gray-400 ${activeSummaryFilter === 'lifetime' ? 'text-white border-white/30' : ''}`}>
                                    <IconDollar className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'pending'}
                        bodyClassName="h-full w-full"
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'pending'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30 shadow-nova'
                            }`}
                        onClick={() => setActiveSummaryFilter('pending')}
                    >
                        {/* Metallic Shine Overlay for Inactive state */}
                        {activeSummaryFilter !== 'pending' && (
                            <>
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                            </>
                        )}
                        <div className="p-5 relative z-10 w-full">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeSummaryFilter === 'pending' ? 'text-white/80' : 'text-gray-400'}`}>Pending Clearance</p>
                                    <h4 className={`text-2xl font-black ${activeSummaryFilter === 'pending' ? 'text-white' : 'text-brand-warning'}`}>
                                        {formatPKRAmount(netEstimatedPayout)}
                                    </h4>
                                </div>
                                <div className={`p-2 rounded-lg border bg-white/5 border-white/10 text-gray-400 ${activeSummaryFilter === 'pending' ? 'text-white border-white/30' : ''}`}>
                                    <IconClock className="w-5 h-5" />
                                </div>
                            </div>
                            <p className={`text-[10px] mt-1 ${activeSummaryFilter === 'pending' ? 'text-white/70' : 'text-gray-500'}`}>Approved, awaiting clearance</p>
                        </div>
                    </Card>

                </div>

                <div className="mb-8">
                    <BonusMilestonesWidget profile={profile} role={effectiveRole} />
                </div>

                {/* Sub Tabs for Pending Filter */}
                {activeSummaryFilter === 'pending' && (
                    <div className="flex items-center justify-between mb-4">
                        <Tabs
                            tabs={[
                                { id: 'pending', label: 'Pending Clearance', icon: <IconClock className="w-4 h-4" /> },
                                { id: 'history', label: 'Payment History', icon: <IconCreditCard className="w-4 h-4" /> }
                            ]}
                            activeTab={activeSubTab}
                            onTabChange={(id) => setActiveSubTab(id as any)}
                        />
                    </div>
                )}

                {/* Data Table */}
                {/* Data Table / Detailed Breakdown */}
                {activeSummaryFilter === 'lifetime' ? (
                    <Table
                        columns={[
                            { header: 'Approved On', key: 'date', render: (item: any) => <span className="text-gray-400">{item.date}</span> },
                            { header: 'Project ID', key: 'id', render: (item: any) => <span className="font-semibold text-white/90">{item.id}</span> },
                            { header: 'Project Title', key: 'project', render: (item: any) => <span className="font-semibold text-white/90">{item.project}</span> },
                            { header: 'Client', key: 'client', render: (item: any) => <span className="text-gray-400">{item.client}</span> },
                            {
                                header: 'Funds Status',
                                key: 'funds_status',
                                render: (item: any) => {
                                    const isSuccess = item.funds_status === 'Cleared' || item.funds_status === 'Paid';
                                    return <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${isSuccess ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>{item.funds_status}</span>;
                                }
                            },
                            { header: 'Payout', key: 'amount', className: 'text-right', render: (item: any) => <span className="text-brand-success font-bold">{item.amount}</span> }
                        ]}
                        data={filteredData}
                        isLoading={loading}
                        isMetallicHeader={true}
                    />
                ) : activeSubTab === 'pending' ? (
                    <div className="rounded-2xl border border-surface-border bg-surface-card overflow-hidden shadow-nova mb-10 relative">
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.01)_100%)] pointer-events-none" />
                        
                        <div className="relative z-10">
                            {breakdownLoading || loading ? (
                                <div className="p-8 text-center text-gray-500">Calculating rewards statement...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse table-auto text-sm text-gray-400">
                                        <thead>
                                            <tr className="bg-surface-overlay border-b border-surface-border text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                                <th className="px-6 py-4">Name</th>
                                                <th className="px-6 py-4">Description</th>
                                                <th className="px-6 py-4 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-border/40 font-medium">
                                            {/* Row 1: Pay Period */}
                                            <tr className="hover:bg-white/[0.03] transition-colors">
                                                <td className="px-6 py-4 text-white/90 font-bold">Pay Period</td>
                                                <td colSpan={2} className="px-6 py-4 text-brand-primary text-right font-black uppercase tracking-widest text-[11px]">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <span>
                                                            {(() => {
                                                                const yr = Number(selectedYear);
                                                                const mo = Number(selectedMonth);
                                                                const d = new Date(yr, mo, 1);
                                                                return d.toLocaleString('default', { month: 'long', year: 'numeric' });
                                                            })()}
                                                        </span>
                                                        {(() => {
                                                            if (alreadyPaid >= netEstimatedPayout && netEstimatedPayout > 0) {
                                                                return (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-success/20 text-brand-success border border-brand-success/30">
                                                                        Paid
                                                                    </span>
                                                                );
                                                            }
                                                            if (alreadyPaid > 0) {
                                                                return (
                                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-warning/20 text-brand-warning border border-brand-warning/30">
                                                                        Partially Paid
                                                                    </span>
                                                                );
                                                            }
                                                            return (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                                                                    Unpaid
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Row 2: Base Salary */}
                                            {profile?.payout_strategy === 'basicplusbonus' && (
                                                <tr className="hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-6 py-4 text-white/90 font-bold">Base Salary</td>
                                                    <td className="px-6 py-4 text-gray-400">Monthly Fixed Rate</td>
                                                    <td className="px-6 py-4 text-right text-white font-bold">
                                                        {formatPKRAmount(profile?.fixed_payout_rate || 0)}
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Rows 3: Qualified Bonuses */}
                                            {monthlyBonuses.map((bonus) => (
                                                <tr key={bonus.id} className="hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-6 py-4 text-white/90 font-bold">{bonus.name}</td>
                                                    <td className="px-6 py-4 text-gray-400">
                                                        {bonus.calc_type === 'Volume' ? `${bonus.currentVal}/${bonus.target} projects completed` :
                                                         bonus.calc_type === 'Percentage' ? `${bonus.currentVal}% conversion target met` :
                                                         bonus.calc_type === 'Rating' ? `Rating of ${bonus.currentVal} achieved` :
                                                         bonus.calc_type === 'Punctuality' ? `${bonus.currentVal} days on-time attendance` :
                                                         bonus.calc_type === 'Penalties' ? 'Zero valid penalties' :
                                                         'Target achieved'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-brand-success font-bold">
                                                        +{formatPKRAmount(bonus.amount)}
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Rows 4: Active Penalties */}
                                            {penaltiesList.map((penalty) => {
                                                const matchedRule = penaltyStructures.find(
                                                    p => (p.name || '').toLowerCase() === (penalty.reason || '').toLowerCase()
                                                );
                                                const deductionAmt = matchedRule?.amount ?? 50;
                                                return (
                                                    <tr key={penalty.id} className="hover:bg-white/[0.03] transition-colors">
                                                        <td className="px-6 py-4 text-brand-error font-bold">Deduction: {penalty.reason}</td>
                                                        <td className="px-6 py-4 text-gray-400">{penalty.details || 'Active disciplinary record'}</td>
                                                        <td className="px-6 py-4 text-right text-brand-error font-bold">
                                                            -{formatPKRAmount(deductionAmt)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* Row 5: Total Net Amount */}
                                            <tr className="bg-white/[0.04]">
                                                <td colSpan={2} className="px-6 py-4 text-white font-black uppercase tracking-widest text-xs">
                                                    Net Estimated Payout
                                                </td>
                                                <td className="px-6 py-4 text-right text-brand-success text-base font-black">
                                                    {formatPKRAmount(netEstimatedPayout)}
                                                </td>
                                            </tr>

                                            {/* Row 6: Expected Release */}
                                            <tr className="hover:bg-white/[0.03] transition-colors">
                                                <td className="px-6 py-4 text-white/90 font-bold">Expected Release</td>
                                                <td colSpan={2} className="px-6 py-4 text-right text-gray-400">
                                                    {(() => {
                                                        const yr = Number(selectedYear);
                                                        const mo = Number(selectedMonth);
                                                        const nextMonth = new Date(yr, mo + 1, 15);
                                                        return `15th of ${nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                                                    })()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <Table
                        columns={[
                            { header: 'Release Date', key: 'release_date', render: (item: any) => <span className="text-gray-400">{systemFormatDate(new Date(item.release_date))}</span> },
                            { header: 'Amount Released', key: 'amount', render: (item: any) => <span className="text-brand-success font-bold">${parseFloat(item.amount).toLocaleString()}</span> },
                            { header: 'Method', key: 'payment_method', render: (item: any) => <span className="text-white/80">{item.payment_method}</span> },
                            { header: 'Released By', key: 'released_by_name', render: (item: any) => <span className="text-gray-400">{item.released_by_name || 'System'}</span> }
                        ]}
                        data={releaseLogs}
                        isLoading={loading}
                        isMetallicHeader={true}
                    />
                )}
            </div>

        </div>
    );
};

export default Earnings;

