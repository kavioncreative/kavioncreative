
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Modal, Tooltip } from '../components/Surfaces';
import { Table } from '../components/Table';
import Button from '../components/Button';
import { Tabs } from '../components/Navigation';
import { DatePicker, formatDate as systemFormatDate } from '../components/DatePicker';
import { Dropdown } from '../components/Dropdown';
import { IconCalendar, IconX, IconChartBar, IconClock, IconCheckCircle, IconXCircle, IconMaximize, IconChevronRight, IconDollar, IconLock, IconPlus } from '../components/Icons';
import { useAccounts } from '../contexts/AccountContext';
import { getInitialTab, updateRoute } from '../utils/routing';
import { formatDisplayName, truncateByWords } from '../utils/formatter';
import { useUser } from '../contexts/UserContext';
import { getStatusCapsuleClasses } from '../components/Badge';

import PerformanceChart, { PerformanceMetric } from '../components/PerformanceChart';
import { PerformanceBarChart } from '../components/PerformanceBarChart';
import { PerformanceForm } from '../components/PerformanceForm';

interface AnalyticsProject {
    id: string;
    created_at: string;
    day: string;
    formattedDate: string;
    account_id: string;
    account_name: string;
    client: string;
    agent: string;
    sale: string;
    medium: string;
    price: number;
    status: string;
    cancellation_reason?: string;
    [key: string]: any;
}

// Module-level cache — survives component unmount/remount within the same browser session.
// Cleared automatically when the page is refreshed or the tab is closed.
let _projectsCache: AnalyticsProject[] | null = null;
let _metricsCache: PerformanceMetric[] | null = null;

const Analytics: React.FC = () => {
    const { profile, hasPermission, effectiveRole } = useUser();
    const isProjectOpsManager = effectiveRole === 'Project Operations Manager';
    const { accounts, loading: accountsLoading } = useAccounts();

    const availableTabs = useMemo(() => {
        const tabs = [];
        if (hasPermission('view_gig_stats')) {
            tabs.push({ id: 'gig-stats', label: 'Gig Stats', icon: <IconChartBar size={16} /> });
        }
        return tabs;
    }, [hasPermission]);

    const [selectedAccount, setSelectedAccount] = useState<string[]>(['all']);

    // Filter toolbar states
    const [fromDate, setFromDate] = useState<Date | null>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    });
    const [toDate, setToDate] = useState<Date | null>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    });
    const [activeFilter, setActiveFilter] = useState<string | null>('month');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [projectsData, setProjectsData] = useState<AnalyticsProject[]>(_projectsCache ?? []);
    const [performanceMetricData, setPerformanceMetricData] = useState<PerformanceMetric[]>(_metricsCache ?? []);
    const [activeSummaryFilter, setActiveSummaryFilter] = useState<'pipeline' | 'secured' | 'cancelled'>(getInitialTab('Analytics', 'pipeline') as any);
    const [cancellationReasonModal, setCancellationReasonModal] = useState<{ isOpen: boolean; text: string }>({ isOpen: false, text: '' });
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
    const [isSubmittingPerformance, setIsSubmittingPerformance] = useState(false);

    const [activeTab, setActiveTab] = useState(() => {
        return availableTabs[0]?.id || 'gig-stats';
    });

    // Sync active tab if permissions change or on mount
    useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0].id);
        }
    }, [availableTabs, activeTab]);

    const metricsInitialized = useRef(false);
    // Refs to always hold latest filter values — avoids stale closures without adding to dep arrays
    const fromDateRef = useRef(fromDate);
    const toDateRef = useRef(toDate);
    const selectedAccountRef = useRef<string[]>(selectedAccount);
    fromDateRef.current = fromDate;
    toDateRef.current = toDate;
    selectedAccountRef.current = selectedAccount;
    const lastRefetchRef = useRef<number>(0);
    const lastMetricsRefetchRef = useRef<number>(0);

    useEffect(() => {
        if (isProjectOpsManager && activeTab !== 'gig-stats') {
            setActiveTab('gig-stats');
        }
    }, [isProjectOpsManager, activeTab]);

    useEffect(() => {
        if (!isProjectOpsManager) {
            updateRoute('Analytics', activeSummaryFilter);
        } else {
            updateRoute('Analytics');
        }
    }, [activeSummaryFilter, isProjectOpsManager]);


    useEffect(() => {
        if (!profile?.id) return;

        loadInitialData();

        // Add real-time subscription to projects table
        const channel = supabase
            .channel('analytics_projects_changes')
            .on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table: 'projects' },
                () => {
                    fetchProjects(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

    const loadInitialData = async () => {
        await Promise.all([
            fetchProjects(true),
            fetchPerformanceMetrics()
        ]);
    };


    const fetchProjects = async (isInitial = false) => {
        if (!isInitial) {
            const now = Date.now();
            if (now - lastRefetchRef.current < 10000) return; // 10s throttle
            lastRefetchRef.current = now;
        }
        const t0 = performance.now();
        try {
            if (isInitial) setLoading(true);

            const isSuperAdmin = effectiveRole === 'Super Admin';
            const userRole = effectiveRole?.toLowerCase().trim();

            let query = supabase
                .from('projects')
                .select(`
                    id,
                    created_at,
                    project_id,
                    project_title,
                    account_id,
                    account,
                    status,
                    assignee,
                    primary_manager_id,
                    client_name,
                    price,
                    medium,
                    items_sold,
                    converted_by,
                    cancellation_reason,
                    accounts(prefix, name),
                    primary_manager:primary_manager_id(name)
                `);

            // Granular scoping for non-Super Admins
            const isAdminLike = ['admin', 'project operations manager'].includes(userRole || '');
            const isPM = userRole === 'project manager';
            const isFreelancer = ['freelancer', 'designer', 'presentation'].some(r => userRole?.includes(r));

            if (isAdminLike && !isSuperAdmin) {
                const { data: permittedAccounts } = await supabase
                    .from('user_account_access')
                    .select('account_id')
                    .eq('user_id', profile?.id);

                if (permittedAccounts && permittedAccounts.length > 0) {
                    const accountIds = permittedAccounts.map(pa => pa.account_id);
                    query = query.in('account_id', accountIds);
                } else {
                    setProjectsData([]);
                    return;
                }
            } else if (isPM) {
                const { data: userTeams } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('member_id', profile?.id);

                if (userTeams && userTeams.length > 0) {
                    const teamIds = userTeams.map(t => t.team_id);
                    const { data: teamAccountLinks } = await supabase
                        .from('team_accounts').select('account_id').in('team_id', teamIds);
                    
                    if (teamAccountLinks && teamAccountLinks.length > 0) {
                        const accountIds = teamAccountLinks.map(ta => ta.account_id);
                        query = query.in('account_id', accountIds);
                    } else {
                        setProjectsData([]);
                        return;
                    }
                } else {
                    setProjectsData([]);
                    return;
                }
            } else if (isFreelancer) {
                const freelancerName = profile?.name || profile?.email || '';
                query = query.or(`assignee.eq."${freelancerName}",assignee.eq."${profile?.email}"`);
            } else if (!isSuperAdmin) {
                setProjectsData([]);
                return;
            }
            // Apply server-side date filters to avoid fetching the entire table
            if (fromDateRef.current) {
                query = query.gte('created_at', fromDateRef.current.toISOString());
            }
            if (toDateRef.current) {
                query = query.lte('created_at', toDateRef.current.toISOString());
            }

            const tQuery = performance.now();
            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(2000);
            console.log(`[Analytics] projects DB query: ${(performance.now() - tQuery).toFixed(0)}ms — ${data?.length ?? 0} rows`);

            if (error) throw error;
            if (data) {
                const tMap = performance.now();
                const enriched = data.map((p, index) => {
                    const createdAt = new Date(p.created_at || Date.now());

                    // Sales logic: Extract from items_sold JSON
                    let saleLabel = '-';
                    if (p.items_sold) {
                        try {
                            const items = p.items_sold.items || [];
                            const other = p.items_sold.other;
                            const allItems = [...items];
                            if (other) allItems.push(other);
                            saleLabel = allItems.join(', ') || '-';
                        } catch (e) {
                            saleLabel = '-';
                        }
                    }

                    // Resolve account_id: use stored one, or fallback to looking up by account text/prefix OR Project ID prefix
                    let resolvedAccountId = p.account_id;
                    if (!resolvedAccountId) {
                        const projectId = p.project_id || '';
                        const prefixFromId = projectId.split(' ')[0]?.toUpperCase();
                        const matchedAcc = (accounts || []).find(
                            (a: any) =>
                                a.prefix?.toUpperCase() === p.account?.toUpperCase() ||
                                a.name === p.account ||
                                (prefixFromId && a.prefix?.toUpperCase() === prefixFromId)
                        );
                        if (matchedAcc) resolvedAccountId = matchedAcc.id;
                    }

                    return {
                        ...p,
                        day: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(createdAt),
                        formattedDate: systemFormatDate(createdAt),
                        account_name: (Array.isArray(p.accounts) ? p.accounts[0] : p.accounts)?.prefix?.toUpperCase() || p.account?.toUpperCase() || '-',
                        project_id: p.project_id || '-',
                        project_title: p.project_title || '-',
                        sale: saleLabel,
                        medium: p.medium || '-',
                        price: Number(p.price || 0),
                        client: p.client_name || '-',
                        agent: (Array.isArray(p.primary_manager) ? p.primary_manager[0] : p.primary_manager)?.name || p.assignee || '-',
                        freelancer: p.assignee || '-',
                        cancellation_reason: p.cancellation_reason || '-',
                        resolved_account_id: resolvedAccountId,
                    };
                });
                console.log(`[Analytics] JS enrichment map: ${(performance.now() - tMap).toFixed(0)}ms`);
                _projectsCache = enriched;
                setProjectsData(enriched);
            }
        } catch (err) {
            console.error('Error fetching analytics projects:', err);
        } finally {
            if (isInitial) setLoading(false);
            console.log(`[Analytics] fetchProjects TOTAL: ${(performance.now() - t0).toFixed(0)}ms`);
        }
    };


    const fetchPerformanceMetrics = async (isRealtime = false) => {
        if (isRealtime) {
            const now = Date.now();
            if (now - lastMetricsRefetchRef.current < 10000) return; // 10s throttle
            lastMetricsRefetchRef.current = now;
        }
        const t0 = performance.now();
        try {
            setMetricsLoading(true);
            // Read from refs so we always get the latest values
            const fd = fromDateRef.current;
            const td = toDateRef.current;
            const sa = selectedAccountRef.current;

            let query = supabase
                .from('performance_metrics')
                .select('*, accounts(prefix, name), profiles(name)')
                .order('date', { ascending: true });

            if (fd) {
                query = query.gte('date', fd.toISOString().split('T')[0]);
            }
            if (td) {
                query = query.lte('date', td.toISOString().split('T')[0]);
            }
            if (sa && sa.length > 0 && !sa.includes('all')) {
                query = query.in('account_id', sa);
            } else if (!fd && !td) {
                query = query.limit(30);
            }

            const { data, error } = await query;
            console.log(`[Analytics] performance_metrics query: ${(performance.now() - t0).toFixed(0)}ms — ${data?.length ?? 0} rows`);
            if (error) throw error;
            if (data) {
                _metricsCache = data as any;
                setPerformanceMetricData(data as any);
            }
        } catch (err) {
            console.error('Error fetching performance metrics:', err);
        } finally {
            setMetricsLoading(false);
        }
    };

    // Stable real-time subscription — never re-subscribes on filter changes
    useEffect(() => {
        const subscription = supabase
            .channel('performance_metrics_changes_analytics')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'performance_metrics' },
                () => { fetchPerformanceMetrics(true); }
            )
            .subscribe();
        return () => { subscription.unsubscribe(); };
    }, []);

    const handleQuickFilter = (type: string) => {
        const now = new Date();

        if (activeFilter === type) {
            const start = new Date(now);
            start.setDate(now.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);

            fromDateRef.current = start;
            toDateRef.current = end;
            setFromDate(start);
            setToDate(end);
            setActiveFilter(null);
            fetchPerformanceMetrics();
            fetchProjects();
            return;
        }

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        let start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (type === 'today') {
            // Already set
        } else if (type === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (type === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end.setTime(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime());
        }

        fromDateRef.current = start;
        toDateRef.current = end;
        setFromDate(start);
        setToDate(end);
        setActiveFilter(type);
        fetchPerformanceMetrics();
        fetchProjects();
    };

    const handleAccountChange = (ids: string | string[]) => {
        let nextIds = Array.isArray(ids) ? ids : [ids];

        // Logical toggle: If "all" is selected alongside others, handle appropriately
        if (nextIds.length > 1) {
            const hasAll = nextIds.includes('all');
            const wasAll = selectedAccount.includes('all');

            if (hasAll && !wasAll) {
                // "all" was just clicked, clear specifics
                nextIds = ['all'];
            } else if (hasAll && wasAll) {
                // "all" was already there, but user clicked a specific account, remove "all"
                nextIds = nextIds.filter(id => id !== 'all');
            }
        }

        if (nextIds.length === 0) nextIds = ['all'];

        selectedAccountRef.current = nextIds;
        setSelectedAccount(nextIds);
        fetchPerformanceMetrics();
        fetchProjects();
    };

    const handleExportCSV = () => {
        if (filteredProjects.length === 0) return;

        const headers = ['S. No.', 'Project ID', 'Account', 'Project Title', 'Day', 'Date', 'Assignee', 'Client', 'Agent', 'Converted By', 'Sale', 'Medium', 'Order Type', 'Price', 'Status'];
        const csvRows = [headers.join(',')];

        filteredProjects.forEach((p, idx) => {
            const row = [
                idx + 1,
                `"${p.project_id || '-'}"`,
                `"${p.account_name || '-'}"`,
                `"${(p.project_title || '-').replace(/"/g, '""')}"`,
                `"${p.day || '-'}"`,
                `"${p.formattedDate || '-'}"`,
                `"${p.freelancer || '-'}"`,
                `"${(p.client || '-').replace(/"/g, '""')}"`,
                `"${p.agent || '-'}"`,
                `"${p.converted_by || '-'}"`,
                `"${p.sale || '-'}"`,
                `"${p.medium || '-'}"`,
                `"${p.converted_by ? 'Query' : 'Direct Order'}"`,
                `"${(p.price || 0).toFixed(2)}"`,
                `"${p.status || 'In Progress'}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredProjects = useMemo(() => {
        let filtered = [...projectsData];

        // 1. Date Filter
        if (fromDate || toDate) {
            filtered = filtered.filter(p => {
                const date = new Date(p.created_at);
                if (fromDate && date < fromDate) return false;
                if (toDate && date > toDate) return false;
                return true;
            });
        }

        // 2. Account Filter
        if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
            filtered = filtered.filter(p => selectedAccount.includes(p.resolved_account_id) || selectedAccount.includes(p.account_id));
        }

        // 3. Status Mapping Logic
        // Pipeline = everything that is NOT Approved, NOT Cancelled (includes Done, Revision Done, etc.)
        if (activeSummaryFilter === 'pipeline') {
            filtered = filtered.filter(p => p.status !== 'Approved' && p.status !== 'Cancelled' && p.status !== 'Removed');
        } else if (activeSummaryFilter === 'secured') {
            // Only explicitly Approved orders count as Secured Revenue
            filtered = filtered.filter(p => p.status === 'Approved');
        } else if (activeSummaryFilter === 'cancelled') {
            filtered = filtered.filter(p => p.status === 'Cancelled');
        }

        return filtered;
    }, [projectsData, fromDate, toDate, selectedAccount, activeSummaryFilter]);

    const reconciledMetrics = useMemo(() => {
        if (!performanceMetricData || performanceMetricData.length === 0) return [];

        // 1. Group and aggregate platform metrics by date
        const dateGroups = new Map<string, any>();
        performanceMetricData.forEach(m => {
            const dateStr = m.date;
            if (!dateGroups.has(dateStr)) {
                dateGroups.set(dateStr, { ...m });
            } else {
                const existing = dateGroups.get(dateStr);
                existing.impressions = (existing.impressions || 0) + (m.impressions || 0);
                existing.clicks = (existing.clicks || 0) + (m.clicks || 0);
                existing.orders = (existing.orders || 0) + (m.orders || 0);
                existing.cancelled_orders = (existing.cancelled_orders || 0) + (m.cancelled_orders || 0);
                existing.fos = (existing.fos || 0) + (m.fos || 0);
                existing.success_score = Math.max(existing.success_score || 0, m.success_score || 0);
                existing.rating = Math.max(existing.rating || 0, m.rating || 0);
                existing.on_time_delivery = Math.max(existing.on_time_delivery || 0, m.on_time_delivery || 0);
                existing.avg_selling_price = Math.max(existing.avg_selling_price || 0, m.avg_selling_price || 0);
                existing.response_rate = Math.max(existing.response_rate || 0, m.response_rate || 0);
                existing.repeat_business_score = Math.max(existing.repeat_business_score || 0, m.repeat_business_score || 0);
                existing.cancellation_rate = Math.max(existing.cancellation_rate || 0, m.cancellation_rate || 0);
            }
        });

        // 2. Count actual projects per date (Submission Reconciliation)
        const projectStats = new Map<string, { total: number; cancelled: number }>();
        projectsData.forEach(p => {
            const dateStr = new Date(p.created_at).toISOString().split('T')[0];
            if (selectedAccount.length > 0 && !selectedAccount.includes('all') && !selectedAccount.includes(p.account_id)) return;

            const stats = projectStats.get(dateStr) || { total: 0, cancelled: 0 };
            if (p.status !== 'Removed') {
                stats.total++;
                if (p.status === 'Cancelled') stats.cancelled++;
            }
            projectStats.set(dateStr, stats);
        });

        // 3. Final Reconciliation & Recalculation
        return Array.from(dateGroups.values()).map(m => {
            const stats = projectStats.get(m.date);
            let orders = m.orders;
            let cancelled = m.cancelled_orders;

            if (stats) {
                orders = stats.total;
                cancelled = stats.cancelled;
            }

            return {
                ...m,
                orders,
                cancelled_orders: cancelled,
                conversion_rate: m.clicks > 0 ? (orders / m.clicks) * 100 : 0,
                ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0
            };
        }).sort((a, b) => a.date.localeCompare(b.date));
    }, [performanceMetricData, projectsData, selectedAccount]);

    const stats = useMemo(() => {
        let base = [...projectsData];
        if (fromDate || toDate) {
            base = base.filter(p => {
                const date = new Date(p.created_at);
                if (fromDate && date < fromDate) return false;
                if (toDate && date > toDate) return false;
                return true;
            });
        }
        if (selectedAccount.length > 0 && !selectedAccount.includes('all')) {
            base = base.filter(p => selectedAccount.includes(p.resolved_account_id) || selectedAccount.includes(p.account_id));
        }

        // Pipeline = NOT Approved, NOT Cancelled, NOT Removed — includes Done and all other active statuses
        const pipeline = base.filter(p => p.status !== 'Approved' && p.status !== 'Cancelled' && p.status !== 'Removed');
        const secured = base.filter(p => p.status === 'Approved');
        const cancelled = base.filter(p => p.status === 'Cancelled');

        return {
            pipelineRevenue: pipeline.reduce((sum, p) => sum + (p.price * 0.8), 0),
            pipelineCount: pipeline.length,
            securedRevenue: secured.reduce((sum, p) => sum + (p.price * 0.8), 0),
            securedCount: secured.length,
            cancelledRevenue: cancelled.reduce((sum, p) => sum + (p.price * 0.8), 0),
            cancelledCount: cancelled.length
        };
    }, [projectsData, fromDate, toDate, selectedAccount]);

    const accountOptions = useMemo(() => {
        const opts = (accounts || []).map(a => ({
            label: a.name,
            description: a.prefix?.toUpperCase(),
            value: a.id
        }));

        if (activeTab === 'gig-stats') {
            return opts;
        }

        return [{ label: 'All Accounts', value: 'all' }, ...opts];
    }, [accounts, activeTab]);

    if (!loading && availableTabs.length === 0) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
                <div className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-2xl shadow-brand-primary/20">
                    <IconLock size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white italic tracking-tight">ACCESS RESTRICTED</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto font-medium">You do not have the required permissions to view analytical reports. Please contact your administrator.</p>
                </div>
                <Button variant="metallic" onClick={() => updateRoute('Dashboard')} className="px-8">
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">




            {/* Global Filter Bar */}
            <Card
                isElevated={true}
                disableHover={true}
                className="flex flex-col p-0 border border-white/10 bg-[#1A1A1A] rounded-2xl relative overflow-hidden shadow-nova"
                bodyClassName="flex-1 py-0 px-0 overflow-visible"
            >
                {/* Full Surface Metallic Shine */}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                <div className="p-3 relative z-10 w-full">
                    <div className="w-full flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 py-1 px-2">
                        {/* Left Side: Date Pickers & Account */}
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full xl:w-auto">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            <DatePicker
                                placeholder="From"
                                value={fromDate}
                                onChange={(date) => {
                                    fromDateRef.current = date;
                                    setFromDate(date);
                                    setActiveFilter(null);
                                    fetchPerformanceMetrics();
                                    fetchProjects();
                                }}
                            >
                                <div className="relative flex items-center justify-between lg:justify-start gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-2 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden w-full lg:w-auto">
                                    {/* Inner Top Shadow for carved-in look */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <div className="flex items-center gap-2 relative z-10 shrink-0">
                                        <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                        <span className="min-w-20">{systemFormatDate(fromDate) || 'From Date'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {fromDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    fromDateRef.current = null;
                                                    setFromDate(null);
                                                    fetchPerformanceMetrics();
                                                    fetchProjects();
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>
                            <DatePicker
                                placeholder="To"
                                value={toDate}
                                onChange={(date) => {
                                    toDateRef.current = date;
                                    setToDate(date);
                                    setActiveFilter(null);
                                    fetchPerformanceMetrics();
                                    fetchProjects();
                                }}
                            >
                                <div className="relative flex items-center justify-between lg:justify-start gap-2 bg-black/40 border border-white/[0.05] rounded-xl pl-4 pr-2 py-2.5 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden w-full lg:w-auto">
                                    {/* Inner Top Shadow for carved-in look */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <div className="flex items-center gap-2 relative z-10 shrink-0">
                                        <IconCalendar className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform relative z-10" />
                                        <span className="min-w-20">{systemFormatDate(toDate) || 'To Date'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 relative z-10">
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        {toDate && (
                                            <div
                                                className="p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-brand-primary transition-all pointer-events-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toDateRef.current = null;
                                                    setToDate(null);
                                                    fetchPerformanceMetrics();
                                                    fetchProjects();
                                                }}
                                            >
                                                <IconX className="w-3 h-3" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DatePicker>
                            </div>

                            <div className="h-8 w-px bg-white/10 mx-1 hidden lg:block" />

                            <div className="w-full lg:w-44 lg:shrink-0">
                                <Dropdown
                                    value={selectedAccount}
                                    onChange={(val) => handleAccountChange(val)}
                                    options={accountOptions}
                                    placeholder="All Accounts"
                                    showSearch={true}
                                    isMulti={true}
                                    menuClassName="!w-[340px]"
                                >
                                    <div className="relative flex items-center justify-between gap-2 bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-sm font-bold text-white hover:bg-black/50 transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
                                        {/* Inner Top Shadow for carved-in look */}
                                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                        {/* Subtle Diagonal Machined Sheen */}
                                        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                        <span className="truncate relative z-10">
                                            {selectedAccount.includes('all') ? 'All Accounts' :
                                                selectedAccount.length === 1 ? (accounts.find(acc => acc.id === selectedAccount[0])?.prefix || 'Account') :
                                                    `${selectedAccount.length} Accounts`}
                                        </span>
                                        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center justify-center flex-wrap gap-2 w-full xl:w-auto xl:justify-end overflow-visible">
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'This Week' },
                                { id: 'month', label: 'This Month' }
                            ].map((filter) => (
                                <div
                                    key={filter.id}
                                    onClick={() => handleQuickFilter(filter.id as any)}
                                    className={`relative flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl px-4 h-10 text-[10px] font-black uppercase tracking-[0.1em] transition-all cursor-pointer group shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden min-w-[90px] ${activeFilter === filter.id
                                        ? 'border-brand-primary/40 bg-brand-primary/5'
                                        : 'hover:bg-black/50 hover:border-white/10'
                                        }`}
                                >
                                    {/* Inner Top Shadow for carved-in look */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                                    {/* Subtle Diagonal Machined Sheen */}
                                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                                    <span className={`relative z-10 transition-colors ${activeFilter === filter.id ? 'text-brand-primary' : 'text-gray-400 group-hover:text-white'
                                        }`}>
                                        {filter.label}
                                    </span>
                                </div>
                            ))}
                            <Button
                                variant="metallic"
                                onClick={() => setIsPerformanceModalOpen(true)}
                                leftIcon={<IconPlus className="w-4 h-4 text-white" />}
                                className="pl-3 pr-3.5 py-2 text-xs font-bold uppercase tracking-wider h-10 min-w-max"
                            >
                                Enter Stats
                            </Button>
                            {activeTab !== 'gig-stats' && (
                                <Button
                                    variant="metallic"
                                    size="sm"
                                    leftIcon={<IconChartBar className="w-4 h-4 block" />}
                                    className="whitespace-nowrap h-10 min-h-[40px] px-4 inline-flex items-center justify-center box-border"
                                    onClick={handleExportCSV}
                                >
                                    Export CSV
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {activeTab === 'sales' && !isProjectOpsManager ? (
                <>
                    {/* Summary Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Pipeline Revenue */}
                        <Card
                            isElevated={true}
                            disableHover={activeSummaryFilter === 'pipeline'}
                            className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'pipeline'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full"
                            onClick={() => setActiveSummaryFilter('pipeline')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-5 relative z-10 w-full">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'pipeline' ? 'text-white/80' : 'text-gray-400'}`}>Pipeline Revenue</p>
                                        <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'pipeline' ? 'text-white' : 'text-brand-warning'}`}>${stats.pipelineRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={activeSummaryFilter === 'pipeline' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('in progress')}>
                                                {stats.pipelineCount} Projects
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'pipeline' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>In Pipeline</span>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'pipeline'
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                        }`}>
                                        <IconClock className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Secured Revenue */}
                        <Card
                            isElevated={true}
                            disableHover={activeSummaryFilter === 'secured'}
                            className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'secured'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full"
                            onClick={() => setActiveSummaryFilter('secured')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-5 relative z-10 w-full">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'secured' ? 'text-white/80' : 'text-gray-400'}`}>Secured Revenue</p>
                                        <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'secured' ? 'text-white' : 'text-brand-success'}`}>${stats.securedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={activeSummaryFilter === 'secured' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('approved')}>
                                                {stats.securedCount} Projects
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'secured' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Revenue Approved</span>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'secured'
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                        }`}>
                                        <IconCheckCircle className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Cancelled Projects */}
                        <Card
                            isElevated={true}
                            disableHover={activeSummaryFilter === 'cancelled'}
                            className={`h-full p-0 border-2 transition-all group cursor-pointer overflow-hidden ${activeSummaryFilter === 'cancelled'
                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                                : 'border-white/10 bg-[#1A1A1A] hover:border-brand-primary/30'
                                }`}
                            bodyClassName="h-full"
                            onClick={() => setActiveSummaryFilter('cancelled')}
                        >
                            {/* Full Surface Metallic Shine */}
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-70" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                            <div className="p-5 relative z-10 w-full">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${activeSummaryFilter === 'cancelled' ? 'text-white/80' : 'text-gray-400'}`}>Cancelled</p>
                                        <p className={`text-2xl font-black mb-1 ${activeSummaryFilter === 'cancelled' ? 'text-white' : 'text-brand-error'}`}>${stats.cancelledRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={activeSummaryFilter === 'cancelled' ? 'inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white' : getStatusCapsuleClasses('error')}>
                                                {stats.cancelledCount} Projects
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeSummaryFilter === 'cancelled' ? 'text-white/70' : 'text-gray-500 opacity-60'}`}>Revenue Cancelled</span>
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl border transition-all ${activeSummaryFilter === 'cancelled'
                                        ? 'bg-white/20 border-white/30 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 group-hover:text-brand-primary'
                                        }`}>
                                        <IconXCircle className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Table<AnalyticsProject>
                            columns={[


                                {
                                    header: 'S. No.',
                                    key: 'sno',
                                    className: 'w-1 whitespace-nowrap px-4',
                                    render: (_, idx) => <span className="text-gray-500 font-medium">{idx + 1}</span>
                                },
                                {
                                    header: 'Project ID',
                                    key: 'project_id',
                                    className: 'whitespace-nowrap'
                                },

                                {
                                    header: 'Account',
                                    key: 'account_name',
                                    className: 'whitespace-nowrap font-bold text-brand-primary'
                                },
                                {
                                    header: 'Day',
                                    key: 'day'
                                },
                                {
                                    header: 'Date',
                                    key: 'formattedDate'
                                },
                                {
                                    header: 'Assignee',
                                    key: 'freelancer',
                                    render: (p: AnalyticsProject) => <span className="text-gray-300">{p.freelancer || '-'}</span>
                                },
                                {
                                    header: 'Client',
                                    key: 'client'
                                },
                                {
                                    header: 'Agent',
                                    key: 'agent'
                                },
                                {
                                    header: 'Converted By',
                                    key: 'converted_by',
                                    render: (p) => <span className="text-gray-400">{p.converted_by || '-'}</span>
                                },
                                {
                                    header: 'Sale',
                                    key: 'sale',
                                    className: 'max-w-[150px]'
                                },
                                {
                                    header: 'Medium',
                                    key: 'medium'
                                },
                                {
                                    header: 'Order Type',
                                    key: 'order_type',
                                    className: 'whitespace-nowrap min-w-[120px]',
                                    render: (p) => <span className="text-gray-400 font-medium">{p.converted_by ? 'Query' : 'Direct Order'}</span>
                                },
                                {
                                    header: 'Price',
                                    key: 'price',
                                    className: 'text-right',
                                    render: (p) => <span className="text-brand-success font-bold">${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                },
                                {
                                    header: 'Status',
                                    key: 'status',
                                    render: (p) => {
                                        const status = p.status || 'In Progress';
                                        return (
                                            <span className={getStatusCapsuleClasses(status)}>
                                                {status}
                                            </span>
                                        );
                                    }
                                },
                                ...(activeSummaryFilter === 'cancelled' ? [{
                                    header: 'Cancellation Reason',
                                    key: 'cancellation_reason',
                                    className: 'max-w-[200px]',
                                    render: (p: AnalyticsProject) => (
                                        <div className="flex items-center justify-between gap-2 group/reason">
                                            <span className="text-gray-400 truncate block text-xs flex-1" title={p.cancellation_reason}>
                                                {p.cancellation_reason}
                                            </span>
                                            {p.cancellation_reason && p.cancellation_reason !== '-' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCancellationReasonModal({ isOpen: true, text: p.cancellation_reason! });
                                                    }}
                                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-brand-error/10 border border-brand-error/20 text-brand-error hover:bg-brand-error/20 transition-all ml-2 shrink-0 group-hover/btn:scale-105"
                                                    title="View Full Reason"
                                                >
                                                    <IconChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                </button>
                                            )}
                                        </div>
                                    )
                                }] : [])
                            ]}
                            data={filteredProjects}
                            isLoading={loading}
                            isMetallicHeader={true}
                        />
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <PerformanceChart data={reconciledMetrics} isLoading={metricsLoading} />

                    <PerformanceBarChart rawData={performanceMetricData} accountsList={accounts} isLoading={metricsLoading} />

                    {/* Detailed Metrics Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily Performance Log</h3>
                        </div>
                        <Table
                            columns={[
                                {
                                    header: 'Date',
                                    key: 'date',
                                    render: (row) => <span className="text-gray-300">{systemFormatDate(new Date(row.date))}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Account">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                ACC
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'account',
                                    render: (row) => <span className="text-brand-primary font-bold uppercase tracking-wider">{row.accounts?.prefix?.toUpperCase() || '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Success Score">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                SS
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'success_score',
                                    render: (row) => <span className="text-white font-bold">{row.success_score || '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Rating">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                RTG
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'rating',
                                    render: (row) => <span className="text-white">{row.rating || '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Click Through Rate">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                CTR
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'ctr',
                                    render: (row) => <span className="text-yellow-400 font-bold">{row.ctr ? `${row.ctr}%` : '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Conversion Rate">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                CR
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'conversion_rate',
                                    render: (row) => <span className="text-purple-400 font-bold">{row.conversion_rate ? `${row.conversion_rate}%` : '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Impressions">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                IMP
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'impressions',
                                    render: (row) => <span className="text-gray-300">{row.impressions || 0}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Clicks">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                CLK
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'clicks',
                                    render: (row) => <span className="text-blue-400">{row.clicks || 0}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Orders">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                ORD
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'orders',
                                    render: (row) => <span className="text-green-400 font-bold">{row.orders || 0}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Cancelled Orders">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                CNL
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'cancelled_orders',
                                    render: (row) => <span className="text-red-400 font-bold">{row.cancelled_orders || 0}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="On-Time Delivery">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                OTD
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'on_time_delivery',
                                    render: (row) => <span className="text-white font-bold">{row.on_time_delivery ? `${row.on_time_delivery}%` : '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Average Selling Price">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                ASP
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'avg_selling_price',
                                    render: (row) => <span className="text-white">{row.avg_selling_price ? `$${row.avg_selling_price}` : '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Response Rate">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                RR
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'response_rate',
                                    render: (row) => <span className="text-white">{row.response_rate ? `${row.response_rate}%` : '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Repeat Business Score">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                RBS
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'repeat_business_score',
                                    render: (row) => <span className="text-white">{row.repeat_business_score ? `${row.repeat_business_score}%` : '-'}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Fake Orders">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                FOs
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'fos',
                                    render: (row) => <span className="text-pink-400 font-bold">{row.fos || 0}</span>
                                },
                                {
                                    header: (
                                        <Tooltip content="Cancellation Rate">
                                            <span className="cursor-help border-b border-white/20 border-dotted hover:text-brand-primary transition-colors uppercase">
                                                CNR
                                            </span>
                                        </Tooltip>
                                    ),
                                    key: 'cancellation_rate',
                                    render: (row) => <span className="text-red-400 font-bold">{row.cancellation_rate ? `${row.cancellation_rate}%` : '-'}</span>
                                },
                                {
                                    header: 'Filled By',
                                    key: 'user_id',
                                    render: (row) => <span className="text-sm text-gray-300">{formatDisplayName(row.profiles?.name) || '—'}</span>
                                },
                            ]}
                            data={[...reconciledMetrics].reverse()}
                            isLoading={metricsLoading}
                            isMetallicHeader={true}
                        />
                    </div>
                </div>
            )
            }

            <Modal
                isOpen={cancellationReasonModal.isOpen}
                onClose={() => setCancellationReasonModal({ isOpen: false, text: '' })}
                title="Cancellation Reason"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button
                            variant="metallic"
                            onClick={() => setCancellationReasonModal({ isOpen: false, text: '' })}
                        >
                            Close
                        </Button>
                    </div>
                }
            >
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {cancellationReasonModal.text}
                    </p>
                </div>
            </Modal>

            {/* Performance Tracking Modal */}
            <Modal
                isOpen={isPerformanceModalOpen}
                onClose={() => setIsPerformanceModalOpen(false)}
                title="Performance Tracking"
                size="md"

                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <Button
                            variant="flat"
                            onClick={() => setIsPerformanceModalOpen(false)}
                            disabled={isSubmittingPerformance}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic"
                            onClick={() => {
                                document.getElementById('perf-form-submit')?.click();
                            }}
                            isLoading={isSubmittingPerformance}
                        >
                            Submit
                        </Button>
                    </div>
                }
            >
                <PerformanceForm
                    userId={profile?.id}
                    onComplete={() => {
                        setIsPerformanceModalOpen(false);
                        fetchPerformanceMetrics();
                        fetchProjects();
                    }}
                    onSubmitStatusChange={setIsSubmittingPerformance}
                />
            </Modal>
        </div >
    );
};

export default Analytics;
