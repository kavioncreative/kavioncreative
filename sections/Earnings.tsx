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

const Earnings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [earningsData, setEarningsData] = useState<any[]>(_earningsCache ?? []);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [releaseLogs, setReleaseLogs] = useState<any[]>(_releaseLogsCache ?? []);
    const [dateFrom, setDateFrom] = useState<Date | null>(null);
    const [dateTo, setDateTo] = useState<Date | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'lifetime' | 'pending' | 'available'>('lifetime');
    const [activeSubTab, setActiveSubTab] = useState<'available' | 'history'>(getInitialTab('Earnings', 'available') as 'available' | 'history');

    const { accounts } = useAccounts();
    const { profile, loading: userLoading, effectiveRole } = useUser();
    const isAdmin = effectiveRole === 'Admin' || effectiveRole === 'Super Admin';
    const isFreelancer = effectiveRole === 'Freelancer' || effectiveRole === 'Team Lead' || effectiveRole === 'Team Designer';

    useEffect(() => {
        if (!userLoading && profile?.email) {
            fetchEarnings(profile.email, true);
            fetchReleaseLogs(profile.email);
        }

    }, [profile?.email, userLoading]);



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
    }, [earningsData, dateFrom, dateTo, selectedAccount, activeSummaryFilter]);

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
            filtered = filtered.filter(item => item.funds_status === 'Pending');
        } else if (activeSummaryFilter === 'available') {
            filtered = filtered.filter(item => item.funds_status === 'Cleared');
        }

        setFilteredData(filtered);
    };

    const handleQuickFilter = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        if (activeFilter === type) {
            setDateFrom(null); setDateTo(null); setActiveFilter(null);
            return;
        }

        const end = new Date(now); end.setHours(23, 59, 59, 999);
        let start = new Date(now); start.setHours(0, 0, 0, 0);

        if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        }

        setDateFrom(start); setDateTo(end); setActiveFilter(type);
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


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
                                <DatePicker value={dateFrom} onChange={setDateFrom}>
                                    <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
                                        <IconCalendar className="w-4 h-4 text-brand-primary" />
                                        <span className="min-w-[100px] whitespace-nowrap text-center">{systemFormatDate(dateFrom) || 'From Date'}</span>
                                        {dateFrom && <IconX className="w-3 h-3 text-gray-500 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setDateFrom(null); }} />}
                                    </div>
                                </DatePicker>
                                <DatePicker value={dateTo} onChange={setDateTo}>
                                    <div className="relative flex items-center gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-3 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]">
                                        <IconCalendar className="w-4 h-4 text-brand-primary" />
                                        <span className="min-w-[100px] whitespace-nowrap text-center">{systemFormatDate(dateTo) || 'To Date'}</span>
                                        {dateTo && <IconX className="w-3 h-3 text-gray-500 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setDateTo(null); }} />}
                                    </div>
                                </DatePicker>


                            </div>

                            <div className="flex items-center gap-2 w-full xl:w-auto justify-center xl:justify-end">
                                {['today', 'week', 'month'].map((id) => (
                                    <div
                                        key={id}
                                        onClick={() => handleQuickFilter(id as any)}
                                        className={`relative flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] ${activeFilter === id ? 'border-brand-primary/40 bg-brand-primary/5' : ''}`}
                                    >
                                        <span className={activeFilter === id ? 'text-brand-primary' : 'text-gray-400 group-hover:text-white'}>{id}</span>
                                    </div>
                                ))}

                            </div>
                        </div>
                    </div>
                </Card>

                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'lifetime'}
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
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                            earningsData.filter(item => {
                                                if (item.funds_status !== 'Pending') return false;
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
                                <div className={`p-2 rounded-lg border bg-white/5 border-white/10 text-gray-400 ${activeSummaryFilter === 'pending' ? 'text-white border-white/30' : ''}`}>
                                    <IconClock className="w-5 h-5" />
                                </div>
                            </div>
                            <p className={`text-[10px] mt-1 ${activeSummaryFilter === 'pending' ? 'text-white/70' : 'text-gray-500'}`}>Approved, awaiting clearance</p>
                        </div>
                    </Card>

                    <Card
                        isElevated={true}
                        disableHover={activeSummaryFilter === 'available'}
                        className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'available'
                            ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
                            : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30 shadow-nova'
                            }`}
                        onClick={() => setActiveSummaryFilter('available')}
                    >
                        {/* Metallic Shine Overlay for Inactive state */}
                        {activeSummaryFilter !== 'available' && (
                            <>
                                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                            </>
                        )}
                        <div className="p-5 relative z-10 w-full">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeSummaryFilter === 'available' ? 'text-white/80' : 'text-gray-400'}`}>Available Amount</p>
                                    <h4 className={`text-2xl font-black ${activeSummaryFilter === 'available' ? 'text-white' : 'text-brand-success'}`}>
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                                            earningsData.filter(item => {
                                                if (item.funds_status !== 'Cleared') return false;
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
                                <div className={`p-2 rounded-lg border bg-white/5 border-white/10 text-gray-400 ${activeSummaryFilter === 'available' ? 'text-white border-white/30' : ''}`}>
                                    <IconCheckCircle className="w-5 h-5" />
                                </div>
                            </div>
                            <p className={`text-[10px] mt-1 ${activeSummaryFilter === 'available' ? 'text-white/70' : 'text-gray-500'}`}>Ready for payout</p>
                        </div>
                    </Card>
                </div>

                {/* Sub Tabs for Available Filter */}
                {activeSummaryFilter === 'available' && (
                    <div className="flex items-center justify-between mb-4">
                        <Tabs
                            tabs={[
                                { id: 'available', label: 'Available Amount', icon: <IconCheckCircle className="w-4 h-4" /> },
                                { id: 'history', label: 'Payment History', icon: <IconCreditCard className="w-4 h-4" /> }
                            ]}
                            activeTab={activeSubTab}
                            onTabChange={(id) => setActiveSubTab(id as any)}
                        />

                    </div>
                )}

                {/* Data Table */}
                {(activeSummaryFilter !== 'available' || activeSubTab === 'available') ? (
                    <Table
                        columns={[
                            { header: 'Approved On', key: 'date', render: (item: any) => <span className="text-gray-400">{item.date}</span> },
                            { header: 'Project ID', key: 'id', render: (item: any) => <span className="font-semibold text-white/90">{item.id}</span> },
                            { header: 'Project Title', key: 'project', render: (item: any) => <span className="font-semibold text-white/90">{item.project}</span> },
                            { header: 'Client', key: 'client', render: (item: any) => <span className="text-gray-400">{item.client}</span> },
                            {
                                header: activeSummaryFilter === 'pending' ? 'Days Left' : 'Funds Status',
                                key: 'funds_status',
                                render: (item: any) => {
                                    if (activeSummaryFilter === 'pending') {
                                        return <span className="bg-amber-600/20 text-amber-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">{item.daysLeft || 0} Days</span>;
                                    }
                                    const status = activeSummaryFilter === 'available' ? 'Unpaid' : item.funds_status;
                                    const isSuccess = status === 'Cleared' || status === 'Paid';
                                    return <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${isSuccess ? 'bg-green-600/20 text-green-600' : 'bg-amber-600/20 text-amber-600'}`}>{status}</span>;
                                }
                            },
                            { header: 'Payout', key: 'amount', className: 'text-right', render: (item: any) => <span className="text-brand-success font-bold">{item.amount}</span> }
                        ]}
                        data={filteredData}
                        isLoading={loading}
                        isMetallicHeader={true}
                    />
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

