// test change
import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../lib/supabase';
import { Tabs, Pagination } from '../components/Navigation';
import Button from '../components/Button';
import { Table } from '../components/Table';
import { IconPlus, IconSearch, IconEye, IconTrash, IconAlertTriangle, IconInfo, IconX, IconFile, IconFileFilled, IconFileText, IconFileImage, IconFileVideo, IconFileArchive, IconCalendar, IconMaximize, IconChevronRight, IconRefreshCw, IconTag, IconArrowRight, IconMessageSquare, IconUser, IconDollar, IconCheck, IconAlertCircle, IconMoreVertical, IconClock, IconCloudUpload, IconPaperclip, IconDownload } from '../components/Icons';
import { LabelManagerModal } from '../components/LabelManagerModal';
import { Modal } from '../components/Surfaces';
import { Input, TextArea } from '../components/Input';
import { DatePicker } from '../components/DatePicker';
import { formatDeadlineDate, formatTime, getTimeLeft, formatDisplayName, truncateByWords } from '../utils/formatter';
import { Countdown } from '../components/Countdown';
import { Calendar } from '../components/Calendar';
import { TimeSelect } from '../components/TimeSelect';
import { Dropdown } from '../components/Dropdown';
import { Radio, Checkbox } from '../components/Selection';
import { addToast } from '../components/Toast';
import { getInitialTab, updateRoute } from '../utils/routing';
import { useNotifications } from '../contexts/NotificationContext';
import { triggerWebhooks } from '../utils/webhookTrigger';
import { useUser } from '../contexts/UserContext';
import { getStatusCapsuleClasses } from '../components/Badge';
import { useAccounts } from '../contexts/AccountContext';
import ReactMarkdown from 'react-markdown';
import { uploadFile } from '../utils/storage';
import { markdownComponents, markdownPlugins, parseCodesLogicMarkdown } from './ProjectDetails';
import { COUNTRIES } from '../utils/countries';

interface ProjectsProps {
    onProjectOpen?: (id: string, data?: any) => void;
    onLeadOpen?: (lead: any) => void;
    isProjectOpen?: boolean;
    isLeadOpen?: boolean;
}

export interface ProjectsHandle {
    refresh: () => void;
    switchToStatusTab: (status: string) => void;
    switchToLeadTab: (status: string) => void;
}

function ProjectsComponent(props: ProjectsProps, ref: React.Ref<ProjectsHandle>) {
    const { onProjectOpen, onLeadOpen, isProjectOpen, isLeadOpen } = props;

    useImperativeHandle(ref, () => ({        // Expose refresh function to parent
        refresh: () => {
            fetchProjects();
            fetchTabCounts(true);
            fetchLeads(true);
            fetchLeadsTabCounts(true);
        },
        switchToStatusTab: (status: string) => {
            setViewMode('projects');
            const tabId = Object.keys(statusMap).find(key => statusMap[key] === status);
            if (tabId) {
                setActiveTab(tabId);
            }
        },
        switchToLeadTab: (status: string) => {
            setViewMode('leads');
            const tabId = Object.keys(leadsStatusMap).find(key => leadsStatusMap[key].toLowerCase() === status.toLowerCase());
            if (tabId) {
                setLeadsActiveTab(tabId);
            }
        }
    }));
    const initialTab = getInitialTab('Projects', 'all');
    const [viewMode, setViewMode] = useState<'projects' | 'leads'>('projects');
    const [activeTab, setActiveTab] = useState(initialTab);
    const [leadsActiveTab, setLeadsActiveTab] = useState('new');

    // Track last successful fetch to prevent redundant calls
    const lastFetchParamsRef = useRef<string>('{}');

    // Map tab IDs to their corresponding data status
    const statusMap: Record<string, string> = useMemo(() => ({
        all: '',
        progress: 'In Progress',
        revision: 'Revision',
        'revision-urgent': 'Revision Urgent',
        urgent: 'Urgent',
        approval: 'Sent For Approval',
        cancelled: 'Cancelled',
        done: 'Done',
        'revision-done': 'Revision Done',
        'revision-urgent-done': 'Revision Urgent Done',
        'urgent-done': 'Urgent Done',
        'approved': 'Approved',
        'final-files': 'Final Files',
        'final-files-done': 'Final Files Done'
    }), []);

    const leadsStatusMap: Record<string, string> = useMemo(() => ({
        'new': 'New',
        'active': 'Active',
        'offer-sent': 'Offer Sent',
        'converted': 'Converted',
        'project-completed': 'Project Completed',
        'upsell-sent': 'Upsell Sent',
        'interested': 'Interested',
        'upsell-won': 'Upsell Won',
        'not-interested': 'Not Interested',
        'lost': 'Lost'
    }), []);

    useEffect(() => {
        // Only update route when no project is open to avoid overwriting project URLs
        if (!isProjectOpen) {
            updateRoute('Projects', activeTab);
        }
    }, [activeTab, isProjectOpen]);

    useEffect(() => {
        const handlePopState = () => {
            setActiveTab(getInitialTab('Projects', 'all'));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedMove, setSelectedMove] = useState<string | null>(null);
    const [orderType, setOrderType] = useState<string | null>(null);
    const [price, setPrice] = useState('');
    const [assigneeManualPrice, setAssigneeManualPrice] = useState('');
    const [soldItems, setSoldItems] = useState<string[]>([]);
    const [otherSoldText, setOtherSoldText] = useState('');
    const { accounts, loading: accountsLoading } = useAccounts();
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [logoNoType, setLogoNoType] = useState<string | null>(null);
    const [manualLogoNo, setManualLogoNo] = useState('');
    const [clientType, setClientType] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [previousLogoNo, setPreviousLogoNo] = useState('');
    const [isLinkedToOrder, setIsLinkedToOrder] = useState(false);
    const [linkedProjectData, setLinkedProjectData] = useState<any>(null);
    const [isSearchingLinkedProject, setIsSearchingLinkedProject] = useState(false);
    const [medium, setMedium] = useState<string | null>(null);
    const [projectTitle, setProjectTitle] = useState('');
    const [projectBriefText, setProjectBriefText] = useState('');
    const [projectBriefFiles, setProjectBriefFiles] = useState<File[]>([]);
    const [optionsRequired, setOptionsRequired] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [addons, setAddons] = useState<string[]>([]);
    const [addonsOther, setAddonsOther] = useState('');
    const [isBriefExpanded, setIsBriefExpanded] = useState(false);
    const [briefMode, setBriefMode] = useState<'edit' | 'preview'>('edit');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [dueTime, setDueTime] = useState('');
    const [clientDueDate, setClientDueDate] = useState<Date | null>(null);
    const [clientDueTime, setClientDueTime] = useState('');
    const [activeShortcut, setActiveShortcut] = useState<number | null>(null);
    const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
    const [removalReason, setRemovalReason] = useState<string | null>(null);
    const [removalOtherText, setRemovalOtherText] = useState('');
    const [removeProjectId, setRemoveProjectId] = useState('');
    const [cancellationReason, setCancellationReason] = useState<string | null>(null);
    const [cancellationOtherText, setCancellationOtherText] = useState('');
    const [cancelProjectId, setCancelProjectId] = useState('');
    const [approveTips, setApproveTips] = useState<string | null>(null);
    const [approveAmount, setApproveAmount] = useState('');
    const [approveProjectId, setApproveProjectId] = useState('');
    const [approveDate, setApproveDate] = useState<Date | null>(new Date());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState<any>(null);
    const [showReview, setShowReview] = useState(false);
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStatusExpanded, setIsStatusExpanded] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]); // Current filtered freelancers
    const [allFreelancers, setAllFreelancers] = useState<any[]>([]); // Source of truth for all freelancers
    const [freelancerWorkload, setFreelancerWorkload] = useState<Record<string, { assigned: number, inProgress: number }>>({});
    const [pmCollaborators, setPmCollaborators] = useState<any[]>([]); // Project Managers for collaborators
    const [convertedBy, setConvertedBy] = useState<string | null>(null);
    const [teamPMs, setTeamPMs] = useState<any[]>([]); // Project Managers for "Converted By" dropdown
    const [searchQuery, setSearchQuery] = useState('');
    const [leadIntakeDate, setLeadIntakeDate] = useState<Date | null>(new Date());
    const [leadIntakeTime, setLeadIntakeTime] = useState<string>(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [location, setLocation] = useState('');
    const [isLocationDetected, setIsLocationDetected] = useState(false);
    const [alertFilter, setAlertFilter] = useState<'dispute' | 'arthelp' | null>(null);
    const [repeatClients, setRepeatClients] = useState<{ label: string, value: string }[]>([]);

    // Team Lead specific state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [taggingProjectId, setTaggingProjectId] = useState<string | null>(null);

    const [assignStep, setAssignStep] = useState(1);
    const [assignProjectId, setAssignProjectId] = useState('');
    const [assignDesignerId, setAssignDesignerId] = useState<string | null>(null);
    const [assignDueDate, setAssignDueDate] = useState<Date | null>(null);
    const [assignDueTime, setAssignDueTime] = useState('');
    const [assignTlDeadline, setAssignTlDeadline] = useState<Date | null>(null);
    const [assignTlTime, setAssignTlTime] = useState('');
    const [assignIsSubmitting, setAssignIsSubmitting] = useState(false);
    const [teamLeadDesigners, setTeamLeadDesigners] = useState<any[]>([]);
    const [teamSlabs, setTeamSlabs] = useState<any[]>([]);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const lastCountsFetchRef = useRef<number>(0);
    const lastLeadsCountsFetchRef = useRef<number>(0);

    // Permission Cache Context (Optimizes main query by preventing re-fetches)
    const [permittedAccounts, setPermittedAccounts] = useState<string[] | null>(null);
    const [collabProjectIds, setCollabProjectIds] = useState<string[] | null>(null);
    const [pmAccountIds, setPmAccountIds] = useState<string[] | null>(null);
    const [isPermissionsLoading, setIsPermissionsLoading] = useState(false);

    const [tableData, setTableData] = useState<any[] | null>(() => {
        // Try page-specific cache first (defaults to page 1)
        const pageCache = localStorage.getItem(`nova_projects_cache_${initialTab}_page_1`);
        if (pageCache) return JSON.parse(pageCache);

        const cached = localStorage.getItem(`nova_projects_cache_${initialTab}`);
        if (!cached) {
            const legacy = localStorage.getItem('nova_projects_cache');
            return legacy ? JSON.parse(legacy) : null;
        }
        return JSON.parse(cached);
    });
    // Stale-while-revalidate: if we have cached data, don't show skeleton on initial load
    const [loading, setLoading] = useState(() => {
        const hasTabCache = !!localStorage.getItem(`nova_projects_cache_${initialTab}`);
        const hasLegacyCache = !!localStorage.getItem('nova_projects_cache');
        return !(hasTabCache || hasLegacyCache);
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');


    const { profile, effectiveRole, hasPermission } = useUser();
    const userRole = effectiveRole?.toLowerCase().trim() || '';
    const isProjectManager = userRole.includes('manager') || userRole.includes('admin') || userRole.includes('operations');
    const isTeamLead = userRole.includes('team lead');
    const isTeamDesigner = userRole.includes('team designer');
    const isFreelancer = userRole.includes('freelancer') || userRole.includes('designer') || userRole.includes('presentation') || isTeamLead || isTeamDesigner;
    const { addNotification } = useNotifications();

    const ITEMS_PER_PAGE = 8;
    const [totalCount, setTotalCount] = useState<number>(() => {
        const cached = localStorage.getItem(`nova_projects_total_count_${initialTab}`);
        return cached ? parseInt(cached) : 0;
    });
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [projectCounts, setProjectCounts] = useState<Record<string, number>>(() => {
        const cached = localStorage.getItem('nova_projects_counts_cache');
        return cached ? JSON.parse(cached) : {};
    });

    const [leadsData, setLeadsData] = useState<any[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(false);
    const [leadsTabCounts, setLeadsTabCounts] = useState<Record<string, number>>(() => {
        const cached = localStorage.getItem('nova_leads_counts_cache');
        return cached ? JSON.parse(cached) : {};
    });
    const [leadsTotalCount, setLeadsTotalCount] = useState(0);

    // UNREAD STATES
    const [readStates, setReadStates] = useState<Record<string, string>>(() => {
        const cached = localStorage.getItem('nova_read_states_cache');
        return cached ? JSON.parse(cached) : {};
    });
    const [hasFetchedReadStates, setHasFetchedReadStates] = useState(false);

    // Fetch read states for current user
    useEffect(() => {
        if (!profile?.id) return;

        const fetchReadStates = async () => {
            const { data, error } = await supabase
                .from('project_read_states')
                .select('project_id, last_read_at')
                .eq('user_id', profile.id);

            if (!error && data) {
                const states: Record<string, string> = {};
                data.forEach(s => {
                    states[s.project_id] = s.last_read_at;
                });
                setReadStates(states);
                setHasFetchedReadStates(true);
                localStorage.setItem('nova_read_states_cache', JSON.stringify(states));
            } else {
                setHasFetchedReadStates(true);
            }
        };
        fetchReadStates();
    }, [profile?.id, isProjectOpen]); // Refresh when modal closes too

    const row1Tabs = useMemo(() => [
        { id: 'progress', label: `In Progress${projectCounts['progress'] > 0 ? ` ${projectCounts['progress']}` : ''}` },
        { id: 'revision', label: `Revision${projectCounts['revision'] > 0 ? ` ${projectCounts['revision']}` : ''}` },
        { id: 'revision-urgent', label: `Revision Urgent${projectCounts['revision-urgent'] > 0 ? ` ${projectCounts['revision-urgent']}` : ''}` },
        { id: 'urgent', label: `Urgent${projectCounts['urgent'] > 0 ? ` ${projectCounts['urgent']}` : ''}` },
        ...(isTeamLead || isProjectManager ? [{ id: 'qa', label: `QA Review${projectCounts['qa'] > 0 ? ` ${projectCounts['qa']}` : ''}` }] : []),
        ...(isFreelancer ? [{ id: 'sent-for-qa', label: `Sent For QA${projectCounts['sent-for-qa'] > 0 ? ` ${projectCounts['sent-for-qa']}` : ''}` }] : []),
        ...(isFreelancer || isProjectManager ? [{ id: 'final-files', label: `Final Files${projectCounts['final-files'] > 0 ? ` ${projectCounts['final-files']}` : ''}` }] : []),
        { id: 'approval', label: `Sent For Approval${projectCounts['approval'] > 0 ? ` ${projectCounts['approval']}` : ''}` },
        { id: 'cancelled', label: `Cancelled${projectCounts['cancelled'] > 0 ? ` ${projectCounts['cancelled']}` : ''}` },
    ], [projectCounts, isFreelancer, isProjectManager, isTeamLead]);

    const row2Tabs = useMemo(() => [
        { id: 'all', label: `All${projectCounts['all'] > 0 ? ` ${projectCounts['all']}` : ''}` },
        { id: 'done', label: `Done${projectCounts['done'] > 0 ? ` ${projectCounts['done']}` : ''}` },
        { id: 'revision-done', label: `Revision Done${projectCounts['revision-done'] > 0 ? ` ${projectCounts['revision-done']}` : ''}` },
        { id: 'revision-urgent-done', label: `Revision Urgent Done${projectCounts['revision-urgent-done'] > 0 ? ` ${projectCounts['revision-urgent-done']}` : ''}` },
        { id: 'urgent-done', label: `Urgent Done${projectCounts['urgent-done'] > 0 ? ` ${projectCounts['urgent-done']}` : ''}` },
        ...(isFreelancer || isProjectManager ? [{ id: 'final-files-done', label: `Final Files Done${projectCounts['final-files-done'] > 0 ? ` ${projectCounts['final-files-done']}` : ''}` }] : []),
        { id: 'approved', label: `Approved${projectCounts['approved'] > 0 ? ` ${projectCounts['approved']}` : ''}` },
    ], [projectCounts, isFreelancer, isProjectManager]);

    const leadsTabs = useMemo(() => [
        { id: 'new', label: `New Inquiries${leadsTabCounts['new'] > 0 ? ` ${leadsTabCounts['new']}` : ''}` },
        { id: 'active', label: `Active${leadsTabCounts['active'] > 0 ? ` ${leadsTabCounts['active']}` : ''}` },
        { id: 'offer-sent', label: `Offer Sent${leadsTabCounts['offer-sent'] > 0 ? ` ${leadsTabCounts['offer-sent']}` : ''}` },
        { id: 'converted', label: `Converted${leadsTabCounts['converted'] > 0 ? ` ${leadsTabCounts['converted']}` : ''}` },
        { id: 'project-completed', label: `Project Completed${leadsTabCounts['project-completed'] > 0 ? ` ${leadsTabCounts['project-completed']}` : ''}` },
        { id: 'upsell-sent', label: `Upsell Sent${leadsTabCounts['upsell-sent'] > 0 ? ` ${leadsTabCounts['upsell-sent']}` : ''}` },
        { id: 'interested', label: `Interested${leadsTabCounts['interested'] > 0 ? ` ${leadsTabCounts['interested']}` : ''}` },
        { id: 'upsell-won', label: `Upsell Won${leadsTabCounts['upsell-won'] > 0 ? ` ${leadsTabCounts['upsell-won']}` : ''}` },
        { id: 'not-interested', label: `Not Interested${leadsTabCounts['not-interested'] > 0 ? ` ${leadsTabCounts['not-interested']}` : ''}` },
        { id: 'lost', label: `Lost${leadsTabCounts['lost'] > 0 ? ` ${leadsTabCounts['lost']}` : ''}` }
    ], [leadsTabCounts]);

    // 0. Permission Pre-Query Logic (Cache in memory to avoid blocking latency)
    useEffect(() => {
        if (!profile?.id || !userRole || effectiveRole === 'Super Admin') return;

        async function prefetchPermissions() {
            setIsPermissionsLoading(true);
            try {
                const isAdminLike = ['admin', 'project operations manager'].includes(userRole);
                const isLeadRole = userRole.includes('team lead');
                const isPM = userRole === 'project manager' || isLeadRole;
                const isFreelancer = ['freelancer', 'designer', 'presentation', 'graphic designer', 'presentation designer'].some(r => userRole.includes(r)) || isLeadRole;

                const queries: Promise<any>[] = [];

                // All non-super-admins need collaboration checks
                queries.push(supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id) as any);

                if (isAdminLike) {
                    queries.push(supabase.from('user_account_access').select('account_id').eq('user_id', profile.id) as any);
                }

                if (isPM) {
                    queries.push(supabase.from('team_members').select('team_id').eq('member_id', profile.id) as any);
                }

                const results = await Promise.all(queries);

                // Result 0 is ALWAYS collaboration
                setCollabProjectIds(results[0].data?.map((c: any) => c.project_id) || []);

                if (isAdminLike) {
                    // Result 1 is account access
                    setPermittedAccounts(results[1].data?.map((pa: any) => pa.account_id) || []);
                }

                if (isPM) {
                    const pmResultIndex = isAdminLike ? 2 : 1;
                    const userTeams = results[pmResultIndex]?.data || [];
                    if (userTeams.length > 0) {
                        const teamIds = userTeams.map((t: any) => t.team_id);
                        const { data: teamAccountLinks } = await supabase
                            .from('team_accounts').select('account_id').in('team_id', teamIds);
                        if (teamAccountLinks) {
                            setPmAccountIds([...new Set(teamAccountLinks.map((ta: any) => ta.account_id))]);
                        } else {
                            setPmAccountIds([]);
                        }
                    } else {
                        setPmAccountIds([]);
                    }
                }
            } catch (err) {
                console.error('Permission prefetch error:', err);
                // Fallback to empty arrays to unblock the main query
                setPermittedAccounts([]);
                setCollabProjectIds([]);
                setPmAccountIds([]);
            } finally {
                setIsPermissionsLoading(false);
            }
        }

        prefetchPermissions();
    }, [profile?.id, userRole, effectiveRole]);


    const isPermissionsReady = useMemo(() => {
        if (effectiveRole === 'Super Admin') return true;
        const isPM = userRole === 'project manager';
        // For PM, we need BOTH collabProjectIds AND pmAccountIds to be ready
        // because pmAccountIds requires a 2-step async fetch (teams → team_accounts)
        // Without this, fetchProjects runs with pmAccountIds=null before it's loaded
        if (isPM) {
            return collabProjectIds !== null && pmAccountIds !== null;
        }
        // For other roles, ready as soon as any permission set is loaded
        return permittedAccounts !== null || collabProjectIds !== null || pmAccountIds !== null;
    }, [permittedAccounts, collabProjectIds, pmAccountIds, effectiveRole, userRole]);


    async function fetchProjects(isForce = false) {
        if (!profile || !effectiveRole) {
            setLoading(false);
            return;
        }

        try {
            // Build current signature
            const currentSig = JSON.stringify({
                role: userRole,
                page: currentPage,
                tab: activeTab,
                alert: alertFilter,
                search: debouncedSearchQuery,
                sig: refreshSignal
            });

            // Performance check: skip if params haven't changed AND not a force-refresh
            if (!isForce && currentSig === lastFetchParamsRef.current && tableData && tableData.length > 0) {
                return;
            }

            // Stale-while-revalidate: only show skeleton if we have NO cached data
            const hasCachedData = !!localStorage.getItem('nova_projects_cache');
            if (isForce && !hasCachedData) setLoading(true); // Replaced isInitial with isForce

            // 0. Ensure permissions are loaded before proceeding (unless Super Admin)
            const isSuperAdmin = effectiveRole === 'Super Admin';
            if (!isSuperAdmin && !permittedAccounts && !collabProjectIds && !pmAccountIds) {
                // If permissions haven't even started loading, or we're waiting for them
                // fetchProjects will be re-triggered by the permissions useEffect anyway
                return;
            }

            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            // 0. Build base query with selected columns for faster transfer and less CPU 
            let query = supabase
                .from('projects_with_collaborators')
                .select(`
                    id, project_id, project_title, client_name, client_type, previous_logo_no, assignee, 
                    assignee_id, team_designer_id, client_due_date, client_due_time, 
                    due_date, due_time, status, qa_status, price, designer_fee, team_designer_fee, 
                    has_dispute, has_art_help, created_at,
                    team_designer:profiles!team_designer_id(name, phone)
                `, { count: (debouncedSearchQuery.trim() || alertFilter) ? 'exact' : undefined });

            // 1. Role-based filtering logic
            const isAdminLike = ['admin', 'super admin', 'project operations manager'].includes(userRole || '');
            const isLeadRole = userRole.includes('team lead');
            const isPM = userRole === 'project manager'; // Changed to ONLY project manager to allow Leads to fall into the Freelancer branch (which I've upgraded with account access)
            const isFreelancer = ['freelancer', 'designer', 'presentation', 'graphic designer', 'presentation designer'].some(r => userRole?.includes(r)) || isLeadRole;

            if (isAdminLike && !isSuperAdmin) {
                const accIds = permittedAccounts || [];
                const projIds = collabProjectIds || [];

                if (accIds.length > 0 || projIds.length > 0) {
                    const orConditions: string[] = [];
                    if (accIds.length > 0) orConditions.push(`account_id.in.(${accIds.map(id => `"${id}"`).join(',')})`);
                    if (projIds.length > 0) orConditions.push(`project_id.in.(${projIds.map(id => `"${id}"`).join(',')})`);
                    query = query.or(orConditions.join(','));
                } else {
                    setTableData([]);
                    setLoading(false);
                    return;
                }
                query = query.neq('status', 'Removed');

            } else if (isSuperAdmin) {
                // Super Admin — no filters needed except removing hidden
                query = query.neq('status', 'Removed');

            } else if (isPM) {
                const projIds = collabProjectIds || [];
                const accIds = pmAccountIds || [];

                if (accIds.length > 0 || projIds.length > 0) {
                    const orParts: string[] = [];
                    if (accIds.length > 0) orParts.push(`account_id.in.(${accIds.map(id => `"${id}"`).join(',')})`);
                    if (projIds.length > 0) orParts.push(`project_id.in.(${projIds.map(id => `"${id}"`).join(',')})`);
                    query = query.or(orParts.join(',')).neq('status', 'Removed');
                } else {
                    setTableData([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }

            } else if (isFreelancer) {
                const projIds = collabProjectIds || [];
                const accIds = isLeadRole ? (pmAccountIds || []) : [];
                const freelancerName = profile.name || profile.email;

                // For Lead roles, we combine account access + direct assignment
                // For regular freelancers, we only check direct assignment/collab
                let filterStr = `assignee_id.eq.${profile.id},team_designer_id.eq.${profile.id},assignee.ilike."${freelancerName}",assignee.ilike."${profile.email}"`;

                if (projIds.length > 0) {
                    filterStr += `,project_id.in.(${projIds.map(id => `"${id}"`).join(',')})`;
                }

                if (accIds.length > 0) {
                    filterStr += `,account_id.in.(${accIds.map(id => `"${id}"`).join(',')})`;
                }

                query = query.or(filterStr).neq('status', 'Removed');

            } else {
                // Fallback for any other specific roles — restrict to collaborations only
                const projIds = collabProjectIds || [];
                if (projIds.length > 0) {
                    query = query.in('project_id', projIds).neq('status', 'Removed');
                } else {
                    setTableData([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }
            }

            // QA workflow isolation removed per user request - projects now show in both QA and their base status tabs

            // 3. Tab Filter - Apply status filter if not on "All" tab AND no search query is active
            if (activeTab === 'qa') {
                // Show projects explicitly waiting for manager/lead review
                query = query.in('qa_status', ['pending_qa', 'qa_revision'])
                    .not('status', 'eq', 'Sent For Approval')
                    .not('status', 'eq', 'Approved')
                    .not('status', 'eq', 'Cancelled');
            } else if (activeTab === 'sent-for-qa') {
                query = query.in('qa_status', ['pending_qa', 'qa_revision'])
                    .not('status', 'eq', 'Sent For Approval')
                    .not('status', 'eq', 'Approved')
                    .not('status', 'eq', 'Cancelled');
            } else if (activeTab !== 'all' && !debouncedSearchQuery.trim() && !alertFilter) {
                const targetStatus = statusMap[activeTab];
                if (targetStatus) {
                    query = query.ilike('status', targetStatus);
                }
            }

            // 3. Alert Filter - Only apply if not searching for a global experience
            if (!debouncedSearchQuery.trim() && activeTab !== 'qa') {
                if (alertFilter === 'dispute') query = query.eq('has_dispute', true);
                else if (alertFilter === 'arthelp') query = query.eq('has_art_help', true);
            }

            // 4. Partial Match Search (Contains) - Matches letters no matter the spelling is complete or not
            if (debouncedSearchQuery.trim()) {
                const q = debouncedSearchQuery.trim();
                const searchFilter = `project_id.ilike.%${q}%,project_title.ilike.%${q}%,client_name.ilike.%${q}%,assignee.ilike.%${q}%`;
                if (activeTab === 'qa') {
                    // When searching in QA tab, we still want to respect the QA status but allow global search within that status
                    query = query.or(searchFilter);
                } else {
                    query = query.or(searchFilter);
                }
            }

            // 5. Execute with ordering & pagination
            // Urgency sorting: Earliest deadlines first (Late things at top), Nulls at bottom
            const { data, count, error } = await query
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('due_time', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false })
                .range(from, to);

            // Removed debug logging from the render cycle for better performance

            if (!error && data) {
                // Fetch unread comment status separately from raw projects table (Option B)
                const projectIds = data.map(p => p.project_id).filter(Boolean);
                if (projectIds.length > 0) {
                    // Fetch assigned labels separately (Option B fallback)
                    try {
                        const { data: assignmentsData, error: assignmentsError } = await supabase
                            .from('project_label_assignments')
                            .select('project_id, label:labels(id, name, color)')
                            .in('project_id', projectIds);

                        // Initialize labels as empty array for each project first
                        data.forEach(p => {
                            p.labels = [];
                        });

                        if (!assignmentsError && assignmentsData) {
                            assignmentsData.forEach((item: any) => {
                                if (item.project_id && item.label) {
                                    const projectItem = data.find(p => p.project_id === item.project_id);
                                    if (projectItem) {
                                        projectItem.labels.push(item.label);
                                    }
                                }
                            });
                        }
                    } catch (err) {
                        console.error('Error fetching project labels:', err);
                    }

                    try {
                        const { data: commentsData, error: commentsError } = await supabase
                            .from('projects')
                            .select('project_id, latest_comment_at, latest_comment_author_id')
                            .in('project_id', projectIds);

                        if (!commentsError && commentsData) {
                            const commentsMap = (commentsData || []).reduce((acc: any, c: any) => {
                                acc[c.project_id] = c;
                                return acc;
                            }, {});

                            data.forEach(p => {
                                const commentInfo = commentsMap[p.project_id];
                                if (commentInfo) {
                                    p.latest_comment_at = commentInfo.latest_comment_at;
                                    p.latest_comment_author_id = commentInfo.latest_comment_author_id;
                                }
                            });
                        }
                    } catch (err) {
                        console.error('Error fetching unread comment status:', err);
                    }
                }
                // Resolution for repeat client names that are missing in the database
                const repeatLookups = data.filter(p => (!p.client_name || p.client_name === 'repeat') && p.previous_logo_no);
                let resolvedNames: Record<string, string> = {};

                if (repeatLookups.length > 0) {
                    const idsToFetch = repeatLookups.map(p => p.previous_logo_no);
                    const { data: resolvedData } = await supabase
                        .from('projects')
                        .select('project_id, client_name')
                        .in('project_id', idsToFetch);

                    if (resolvedData) {
                        resolvedData.forEach(rp => {
                            if (rp.client_name && rp.client_name !== 'repeat') {
                                resolvedNames[rp.project_id] = rp.client_name;
                            }
                        });
                    }
                }

                const mappedData = data.map(p => {
                    // Handle nested team_designer correctly from PostgREST join
                    const teamDesignerObj = Array.isArray(p.team_designer) ? p.team_designer[0] : p.team_designer;
                    const tdName = teamDesignerObj?.name;

                    return {
                        ...p,
                        id: p.project_id,
                        title: p.project_title || 'Untitled',
                        client: (p.client_name && p.client_name !== 'repeat')
                            ? p.client_name
                            : (resolvedNames[p.previous_logo_no || ''] || (p.client_type === 'repeat' ? 'Repeat Buyer' : (p.client_type || 'Unknown'))),
                        assignee: (userRole.includes('team lead') || userRole.includes('team designer')) && tdName
                            ? tdName
                            : (p.assignee || 'Unassigned'),
                        clientDueDate: formatDeadlineDate(p.client_due_date),
                        clientDueTime: p.client_due_time ? p.client_due_time.substring(0, 5) : '',
                        dueDate: formatDeadlineDate(p.due_date),
                        dueTime: p.due_time ? p.due_time.substring(0, 5) : '',
                        status: p.status,
                        price: p.price ? `$${p.price}` : '',
                        payout: isTeamDesigner
                            ? (p.team_designer_fee != null ? `$${parseFloat(p.team_designer_fee).toFixed(2).replace(/\.00$/, '')}` : '$0')
                            : (p.designer_fee != null ? `$${parseFloat(p.designer_fee).toFixed(2).replace(/\.00$/, '')}` : (isFreelancer ? '$0' : '')),
                        teamDesignerFee: p.team_designer_fee ? `$${p.team_designer_fee}` : '$0',
                        clientDateRaw: p.client_due_date ? `${p.client_due_date}T${p.client_due_time || '00:00:00'}` : null,
                        dateRaw: p.due_date ? `${p.due_date}T${p.due_time || '00:00:00'}` : null,
                        clientTimeLeft: getTimeLeft(p.client_due_date ? `${p.client_due_date}T${p.client_due_time || '00:00:00'}` : null, p.status, true),
                        timeLeft: getTimeLeft(p.due_date ? `${p.due_date}T${p.due_time || '00:00:00'}` : null, p.status),
                        hasDispute: p.has_dispute || false,
                        hasArtHelp: p.has_art_help || false,
                        qaStatus: p.qa_status || null
                    };
                });

                // Optimization: Data is already minimal from query
                const cacheData = mappedData;

                setTableData(mappedData);

                // Only cache if NOT searching to prevent search results from polluting status-specific caches
                if (!debouncedSearchQuery.trim()) {
                    try {
                        // Cache with page specificity to distinguish between different pages of the same tab
                        localStorage.setItem(`nova_projects_cache_${activeTab}_page_${currentPage}`, JSON.stringify(cacheData));

                        // Also keep a general tab cache for backward compatibility / quick fallback
                        localStorage.setItem(`nova_projects_cache_${activeTab}`, JSON.stringify(cacheData));

                        if (activeTab === 'all') {
                            localStorage.setItem('nova_projects_cache', JSON.stringify(cacheData));
                        }
                    } catch (e) {
                        console.warn('LocalStorage quota exceeded, skipping cache update:', e);
                        if (e instanceof DOMException && (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError')) {
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('nova_projects_cache_') || key.startsWith('nova_project_detail_')) {
                                    localStorage.removeItem(key);
                                }
                            });
                        }
                    }
                }

                // OPTIMIZATION: Use pre-calculated tab count only if NOT searching and NOT using alert filters
                if (debouncedSearchQuery.trim() || alertFilter) {
                    if (count !== null) {
                        setTotalCount(count);
                    }
                } else {
                    const tabTotal = (projectCounts as any)[activeTab] || 0;
                    setTotalCount(tabTotal);
                }
            }

            if (error && error.code !== 'PGRST103') throw error;

        } catch (error: any) {
            console.error('Error fetching projects:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                full: error
            });
            addToast({ type: 'error', title: 'Fetch Error', message: error.message || 'Could not load projects.' });
        } finally {
            setLoading(false);
        }
    }

    async function fetchLeads(isForce = false) {
        if (!profile || !effectiveRole) return;
        setLeadsLoading(true);
        try {
            let query = supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (leadsActiveTab !== 'all') {
                query = query.eq('status', leadsStatusMap[leadsActiveTab]);
            }

            if (debouncedSearchQuery.trim()) {
                query = query.or(`client_name.ilike.%${debouncedSearchQuery}%,project_title.ilike.%${debouncedSearchQuery}%`);
            }

            const safePage = Math.max(1, currentPage);
            const from = (safePage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, count, error } = await query.range(from, to);

            if (error && error.code === 'PGRST103') {
                setLeadsData([]);
            } else if (error) {
                throw error;
            } else {
                setLeadsData(data || []);
                if (count !== null) setLeadsTotalCount(count);
            }
        } catch (err: any) {
            console.error('Error fetching leads:', err);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load leads.' });
        } finally {
            setLeadsLoading(false);
        }
    }

    async function fetchLeadsTabCounts(force = false) {
        if (!profile || !effectiveRole) return;
        const now = Date.now();
        if (!force && now - lastLeadsCountsFetchRef.current < 5000) return; // 5s throttle
        lastLeadsCountsFetchRef.current = now;

        try {
            const { data, error } = await supabase
                .from('leads')
                .select('status');

            if (error) throw error;

            const counts: Record<string, number> = {};
            data?.forEach(l => {
                if (!l.status) return;
                const tabId = Object.keys(leadsStatusMap).find(
                    key => leadsStatusMap[key].toLowerCase() === l.status.toLowerCase()
                );
                if (tabId) {
                    counts[tabId] = (counts[tabId] || 0) + 1;
                }
            });
            setLeadsTabCounts(counts);
            localStorage.setItem('nova_leads_counts_cache', JSON.stringify(counts));
        } catch (err) {
            console.error('Error fetching lead counts:', err);
        }
    }

    const fetchRepeatClients = async () => {
        try {
            // Fetch unique client names from projects
            const { data: projectClients } = await supabase
                .from('projects')
                .select('client_name')
                .not('client_name', 'is', null);

            // Fetch unique client names from leads
            const { data: leadClients } = await supabase
                .from('leads')
                .select('client_name')
                .not('client_name', 'is', null);

            const allNames = new Set([
                ...(projectClients || []).map(p => p.client_name),
                ...(leadClients || []).map(l => l.client_name)
            ]);

            const options = Array.from(allNames)
                .sort()
                .map(name => ({ label: name, value: name }));

            setRepeatClients(options);
        } catch (err) {
            console.error('Error fetching repeat clients:', err);
        }
    };
    const fetchLinkedProjectDetails = async (id: string) => {
        let cleanId = id.trim().toUpperCase();

        // Auto-fix format: "ARS123456" -> "ARS 123456"
        if (cleanId.match(/^[A-Z]{2,4}\d{6}$/)) {
            const prefix = cleanId.match(/^[A-Z]{2,4}/)![0];
            const suffix = cleanId.slice(prefix.length);
            cleanId = `${prefix} ${suffix}`;
        }

        if (!cleanId.match(/^[A-Z]{2,4}\s\d{6}$/)) {
            setLinkedProjectData(null);
            return;
        }

        setIsSearchingLinkedProject(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('assignee, assignee_id, status')
                .eq('project_id', cleanId)
                .maybeSingle();

            if (!error && data) {
                setLinkedProjectData(data);

                // Auto-detect account for Direct Order repeat clients based on linked project prefix
                const accPrefix = cleanId.split(' ')[0];
                const matchedAcc = accounts.find(a => a.prefix === accPrefix);
                if (matchedAcc) {
                    setSelectedAccount(matchedAcc.id);
                }
            } else {
                setLinkedProjectData(null);
            }
        } catch (err) {
            console.error('Error fetching linked project:', err);
            setLinkedProjectData(null);
        } finally {
            setIsSearchingLinkedProject(false);
        }
    };

    const handleClientSelection = async (name: string) => {
        if (!name || clientType !== 'repeat') return;

        // Reset current details before fetching new ones
        setLocation('');
        setIsLocationDetected(false);
        setSelectedAccount('');

        try {
            // Check leads for the most recent entry with this client name
            const { data: leadData } = await supabase
                .from('leads')
                .select('location, account')
                .eq('client_name', name)
                .order('created_at', { ascending: false })
                .limit(1);

            if (leadData && leadData[0]) {
                const lead = leadData[0];
                if (lead.location) {
                    setLocation(lead.location);
                    setIsLocationDetected(true);
                }

                // If it's an inquiry, we might want to pre-select the account too
                if (orderType === 'Inquiry' && lead.account) {
                    // Find the account ID that matches this prefix
                    const accObj = accounts.find(a => a.name === lead.account);
                    if (accObj) setSelectedAccount(accObj.id);
                }
            }
        } catch (err) {
            console.error('Error fetching client details:', err);
        }
    };

    async function handleDeleteLead() {
        if (!leadToDelete || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadToDelete.id);
            if (error) throw error;
            addToast({ type: 'success', title: 'Lead Deleted', message: 'The lead has been successfully removed.' });
            setIsDeleteConfirmOpen(false);
            setLeadToDelete(null);
            fetchLeads(true);
            fetchLeadsTabCounts(true);
        } catch (err: any) {
            console.error('Delete error:', err);
            addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete lead.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    async function fetchTabCounts(force = false) {
        if (!profile || !effectiveRole) return;

        const now = Date.now();
        if (!force && now - lastCountsFetchRef.current < 5000) return; // 5s throttle
        lastCountsFetchRef.current = now;

        try {
            // OPTIMIZATION: Try to get counts via server-side aggregation first (RPC)
            // designers bypass this to use the strict manual exclusion logic
            if (!isTeamDesigner && !isProjectManager) {
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('get_project_status_counts');

                    if (!rpcError && rpcData) {
                        const counts: Record<string, number> = {
                            all: rpcData.all || 0,
                            dispute: rpcData.dispute || 0,
                            arthelp: rpcData.arthelp || 0,
                            qa: rpcData.qa_pending || 0,
                            'sent-for-qa': rpcData.qa_pending || 0,
                            progress: 0,
                            revision: 0,
                            'revision-urgent': 0,
                            urgent: 0,
                            approval: 0,
                            cancelled: 0,
                            done: 0,
                            'revision-done': 0,
                            'revision-urgent-done': 0,
                            'urgent-done': 0,
                            'approved': 0,
                            'final-files': 0,
                            'final-files-done': 0
                        };

                        // Map raw status names from DB to internal tab IDs
                        Object.entries(rpcData).forEach(([rawKey, count]) => {
                            const s = rawKey.trim().toLowerCase();
                            Object.entries(statusMap).forEach(([tabKey, mappedStatus]) => {
                                if (s === mappedStatus.toLowerCase()) {
                                    counts[tabKey] = (count as number);
                                }
                            });
                        });

                        setProjectCounts(counts);
                        localStorage.setItem('nova_projects_counts_cache', JSON.stringify(counts));
                        return; // Successfully used RPC, stop here
                    }
                } catch (rpcErr) {
                    console.warn('RPC optimized counts failed, falling back to query method');
                }
            }

            // FALLBACK: Original method (fetches columns and counts on client)
            let query = supabase
                .from('projects')
                .select('status, has_dispute, has_art_help, qa_status')
                .neq('status', 'Removed');

            const roleLower = userRole?.toLowerCase()?.trim();

            if (roleLower === 'admin' || roleLower === 'super admin' || roleLower === 'project operations manager') {
                if (effectiveRole !== 'Super Admin') {
                    const [{ data: permittedAccounts }, { data: collabDataCountsAdmin }] = await Promise.all([
                        supabase.from('user_account_access').select('account_id').eq('user_id', profile.id),
                        supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id)
                    ]);
                    const accountIds = permittedAccounts?.map(pa => pa.account_id) || [];
                    const collabProjectIds = collabDataCountsAdmin?.map(c => c.project_id) || [];

                    if (accountIds.length > 0 || collabProjectIds.length > 0) {
                        const orParts: string[] = [];
                        if (accountIds.length > 0) orParts.push(`account_id.in.(${accountIds.map(id => `"${id}"`).join(',')})`);
                        if (collabProjectIds.length > 0) orParts.push(`project_id.in.(${collabProjectIds.map(id => `"${id}"`).join(',')})`);
                        query = query.or(orParts.join(','));
                    } else {
                        setProjectCounts({ all: 0, dispute: 0, arthelp: 0 });
                        return;
                    }
                }
            } else if (isFreelancer) {
                const [{ data: collabDataCounts }, { data: userAccess }] = await Promise.all([
                    supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id),
                    isTeamLead ? supabase.from('user_account_access').select('account_id').eq('user_id', profile.id) : Promise.resolve({ data: [] })
                ]);
                const collabIds = collabDataCounts?.map(c => c.project_id) || [];
                const accIds = userAccess?.map(ua => ua.account_id) || [];
                const freelancerName = profile.name || profile.email;
                let filterStr = `assignee_id.eq.${profile.id},team_designer_id.eq.${profile.id},assignee.ilike."${freelancerName}",assignee.ilike."${profile.email}"`;
                if (collabIds.length > 0) filterStr += `,project_id.in.(${collabIds.map(id => `"${id}"`).join(',')})`;
                if (accIds.length > 0) filterStr += `,account_id.in.(${accIds.map(id => `"${id}"`).join(',')})`;
                query = query.or(filterStr);
            } else if (roleLower === 'project manager') {
                const [{ data: collabDataCountsPM }, { data: userTeams }] = await Promise.all([
                    supabase.from('project_collaborators').select('project_id').eq('member_id', profile.id),
                    supabase.from('team_members').select('team_id').eq('member_id', profile.id)
                ]);
                const collabProjectIdsPM = collabDataCountsPM?.map(c => c.project_id) || [];
                let accountIds: string[] = [];
                if (userTeams && userTeams.length > 0) {
                    const teamIds = userTeams.map(t => t.team_id);
                    const { data: teamAccountLinks } = await supabase.from('team_accounts').select('account_id').in('team_id', teamIds);
                    if (teamAccountLinks) accountIds = [...new Set(teamAccountLinks.map(ta => ta.account_id))];
                }
                if (accountIds.length > 0 || collabProjectIdsPM.length > 0) {
                    const orParts: string[] = [];
                    if (accountIds.length > 0) orParts.push(`account_id.in.(${accountIds.map(id => `"${id}"`).join(',')})`);
                    if (collabProjectIdsPM.length > 0) orParts.push(`project_id.in.(${collabProjectIdsPM.map(id => `"${id}"`).join(',')})`);
                    query = query.or(orParts.join(','));
                } else {
                    setProjectCounts({ all: 0, dispute: 0, arthelp: 0 });
                    return;
                }
            } else if (effectiveRole !== 'Super Admin') {
                setProjectCounts({ all: 0, dispute: 0, arthelp: 0 });
                return;
            }

            const { data, error } = await query;
            if (!error && data) {
                const counts: Record<string, number> = {
                    all: 0, dispute: 0, arthelp: 0, qa: 0, 'sent-for-qa': 0, progress: 0, revision: 0,
                    'revision-urgent': 0, urgent: 0, approval: 0, cancelled: 0, done: 0, 'revision-done': 0,
                    'revision-urgent-done': 0, 'urgent-done': 0, 'approved': 0, 'final-files': 0, 'final-files-done': 0
                };

                data.forEach(p => {
                    const s = p.status?.trim().toLowerCase();
                    const isPendingQa = p.qa_status === 'pending_qa';
                    const isExplicitInQa = ['pending_qa', 'qa_revision'].includes(p.qa_status || '');
                    const isPostQaStatus = ['sent for approval', 'approved', 'cancelled'].includes(s || '');

                    Object.entries(statusMap).forEach(([key, mappedStatus]) => {
                        if (s === mappedStatus.toLowerCase()) {
                            counts[key] = (counts[key] || 0) + 1;
                        }
                    });
                    if (isExplicitInQa && !isPostQaStatus) counts.qa++;
                    if (isPendingQa && !isPostQaStatus) counts['sent-for-qa']++;
                    if (p.has_dispute) counts.dispute++;
                    if (p.has_art_help) counts.arthelp++;
                });

                counts.all = data.length;
                setProjectCounts(counts);
                try {
                    localStorage.setItem('nova_projects_counts_cache', JSON.stringify(counts));
                } catch (e) { }
            }
        } catch (err: any) {
            console.error('Error fetching tab counts:', err);
        }
    }

    // 1. Debounce the search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 2. Reset to page 1 when filters or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, leadsActiveTab, alertFilter, debouncedSearchQuery]);

    // 3. Main projects fetch effect with sequencing to prevent multiple redundant fetches
    useEffect(() => {
        if (!isPermissionsReady) return;

        if (viewMode === 'projects') {
            fetchProjects();
        } else {
            fetchLeads();
        }
        fetchTabCounts();
        fetchLeadsTabCounts();
        fetchRepeatClients();
    }, [
        currentPage,
        activeTab,
        leadsActiveTab,
        alertFilter,
        debouncedSearchQuery,
        isPermissionsReady,
        refreshSignal,
        viewMode
    ]);

    useEffect(() => {
        if (isLinkedToOrder && previousLogoNo.length >= 6) {
            const timer = setTimeout(() => {
                fetchLinkedProjectDetails(previousLogoNo);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [previousLogoNo, isLinkedToOrder]);

    // 4. Tab counts effect - runs less frequently with local storage cache lookup
    useEffect(() => {
        if (profile && effectiveRole) {
            // Check local cache first before even considering a fetch (even with RPC throttle)
            const cachedCountsStr = localStorage.getItem('nova_projects_counts_cache');
            if (cachedCountsStr) {
                try {
                    const counts = JSON.parse(cachedCountsStr);
                    if (counts && Object.keys(counts).length > 0) {
                        setProjectCounts(counts);
                    }
                } catch (e) { }
            }
            const cachedLeadsCountsStr = localStorage.getItem('nova_leads_counts_cache');
            if (cachedLeadsCountsStr) {
                try {
                    const counts = JSON.parse(cachedLeadsCountsStr);
                    if (counts && Object.keys(counts).length > 0) {
                        setLeadsTabCounts(counts);
                    }
                } catch (e) { }
            }
            fetchTabCounts();
            fetchLeadsTabCounts();
            fetchRepeatClients();
        }
    }, [profile?.id, effectiveRole, userRole, refreshSignal]);


    useEffect(() => {
        if (!debouncedSearchQuery.trim() && !alertFilter) {
            const count = projectCounts[activeTab] || 0;
            setTotalCount(count);
        }
    }, [projectCounts, activeTab, debouncedSearchQuery, alertFilter]);


    useEffect(() => {
        const fetchFreelancers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, email, role, daily_capacity')
                .eq('status', 'Active')
                .or('role.ilike.%freelancer%,role.ilike.%designer%,role.ilike.%presentation%,role.ilike.%team lead%,role.ilike.%team designer%')
                .order('name', { ascending: true });

            if (!error && data) {
                setAllFreelancers(data);
                setTeamMembers(data); // Default to all initially
            }
        };
        fetchFreelancers();
    }, []);

    // Fetch designers assigned to this Team Lead (from their design team)
    useEffect(() => {
        if (!isTeamLead || !profile?.id) return;

        const fetchTeamLeadDesigners = async () => {
            // Find the design team where this user is the leader
            const { data: teams } = await supabase
                .from('teams')
                .select('id')
                .eq('leader_id', profile.id)
                .eq('type', 'design');

            if (!teams || teams.length === 0) return;

            const teamIds = teams.map((t: any) => t.id);

            const { data: members } = await supabase
                .from('team_members')
                .select('member_id, profiles!inner(id, name, email, role, status, daily_capacity)')
                .eq('profiles.status', 'Active')
                .in('team_id', teamIds);

            if (members) {
                const designers = members
                    .filter((m: any) => m.profiles)
                    .map((m: any) => m.profiles);
                setTeamLeadDesigners(designers);
            }
        };

        const fetchTeamSlabs = async () => {
            const { data } = await supabase
                .from('team_pricing_slabs')
                .select('*')
                .eq('team_lead_id', profile.id);
            if (data) setTeamSlabs(data);
        };

        fetchTeamLeadDesigners();
        fetchTeamSlabs();
    }, [isTeamLead, profile?.id]);

    const fetchFreelancerWorkload = async () => {
        try {
            // Use SAME calendar-day window as the Workload section (midnight to end of today)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: projects, error } = await supabase
                .from('projects')
                .select('assignee, status')
                .gte('created_at', todayStart.toISOString())
                .lte('created_at', todayEnd.toISOString());

            if (error) throw error;

            const stats: Record<string, { assigned: number, inProgress: number }> = {};
            (projects || []).forEach(p => {
                if (p.assignee) {
                    if (!stats[p.assignee]) stats[p.assignee] = { assigned: 0, inProgress: 0 };
                    stats[p.assignee].assigned += 1;

                    // Match SAME done-detection logic as Workload.tsx
                    const status = (p.status || '').toLowerCase();
                    const isFinished = status.includes('done') || ['approved', 'delivered', 'cancelled'].includes(status);
                    if (!isFinished) {
                        stats[p.assignee].inProgress += 1;
                    }
                }
            });
            setFreelancerWorkload(stats);
        } catch (err) {
            console.error('Error fetching freelancer workload:', err);
        }
    };

    useEffect(() => {
        if (isModalOpen || isAssignModalOpen) {
            fetchFreelancerWorkload();
        }
    }, [isModalOpen, isAssignModalOpen]);

    // Smart Freelancer Filtering Logic
    useEffect(() => {
        const filterFreelancersByAccount = async () => {
            if (!selectedAccount) {
                setTeamMembers(allFreelancers);
                return;
            }

            try {
                // 1. Get Team ID linked to this account
                const { data: teamAccount } = await supabase
                    .from('team_accounts')
                    .select('team_id')
                    .eq('account_id', selectedAccount)
                    .single();

                if (teamAccount) {
                    // 2. Get Freelancers in that team
                    const { data: teamFreelancers } = await supabase
                        .from('team_members')
                        .select('member_id, profiles(id, name, email, role)')
                        .eq('team_id', teamAccount.team_id);

                    if (teamFreelancers && teamFreelancers.length > 0) {
                        const filtered = teamFreelancers
                            .filter((f: any) => {
                                const r = f.profiles?.role?.toLowerCase().trim() || '';
                                return r === 'freelancer' || r === 'team lead';
                            })
                            .map((f: any) => f.profiles);

                        if (filtered.length > 0) {
                            setTeamMembers(filtered);
                            return;
                        }
                    }
                }

                // Fallback to all freelancers if no team members found
                setTeamMembers(allFreelancers);
            } catch (err) {
                console.error('Error filtering freelancers:', err);
                setTeamMembers(allFreelancers);
            }
        };

        filterFreelancersByAccount();
    }, [selectedAccount, allFreelancers]);



    // 6. Real-time Project List Sync
    useEffect(() => {
        if (!profile?.id || !isPermissionsReady) return;

        // Use a static channel name to avoid unnecessary re-subscriptions
        const channel = supabase
            .channel('nova-projects-global-sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects' },
                (payload) => {
                    console.log('Real-time project update received:', payload);

                    // 1. Optimistic removal for DELETE events
                    if (payload.eventType === 'DELETE') {
                        const deletedProjId = payload.old.id || payload.old.project_id;
                        setTableData(prev => {
                            if (!prev) return prev;
                            return prev.filter(p =>
                                p.id !== deletedProjId &&
                                p.project_id !== deletedProjId
                            );
                        });
                    }

                    // 2. Increment signal and trigger full refreshes
                    setRefreshSignal(prev => prev + 1);
                    fetchProjects(true); // Explicitly force re-fetch
                    fetchTabCounts(true);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to projects real-time updates');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, isPermissionsReady]); // Only re-subscribe if user or permissions readiness changes

    // 7. Deferred Secondary Data Fetchers (Run srf jab modal open ho)
    useEffect(() => {
        const isAnyModalOpen = isModalOpen || isAssignModalOpen;
        if (!isAnyModalOpen || !profile) return;

        const fetchSecondaryData = async () => {
            // 1. Fetch Freelancers
            const { data: designers } = await supabase
                .from('profiles')
                .select('id, name, email, role, daily_capacity')
                .eq('status', 'Active')
                .or('role.ilike.freelancer,role.ilike.team lead');
            if (designers) setAllFreelancers(designers);

            // 2. PM Collaborators
            if (['project manager', 'admin', 'super admin', 'project operations manager'].includes(userRole || '')) {
                const { data: userTeams } = await supabase.from('team_members').select('team_id').eq('member_id', profile.id);
                if (userTeams && userTeams.length > 0) {
                    const teamIds = userTeams.map(t => t.team_id);
                    const { data: teamMembers } = await supabase.from('team_members').select('member_id, profiles(id, name, email, role)').in('team_id', teamIds);
                    if (teamMembers) {
                        setPmCollaborators(Array.from(new Map(teamMembers.filter((m: any) => ['project manager', 'project operations manager'].includes(m.profiles?.role?.toLowerCase().trim())).map((m: any) => [m.profiles.id, m.profiles])).values()));
                    }
                }
            }

            // 3. Team PMs (Converted By) - Now team-based
            const { data: userTeams } = await supabase.from('team_members').select('team_id').eq('member_id', profile.id);
            if (userTeams && userTeams.length > 0) {
                const teamIds = userTeams.map(t => t.team_id);
                const { data: teamMembers } = await supabase
                    .from('team_members')
                    .select('profiles(id, name, email, role, status)')
                    .in('team_id', teamIds);

                if (teamMembers) {
                    // Extract unique profile objects
                    const uniquePMs = Array.from(
                        new Map(
                            teamMembers
                                .map(m => m.profiles)
                                .filter((p: any) =>
                                    p &&
                                    p.status === 'Active' &&
                                    !['freelancer', 'team designer'].includes(p.role?.toLowerCase().trim())
                                )
                                .map((p: any) => [p.id, p])
                        ).values()
                    );
                    setTeamPMs(uniquePMs);
                }
            } else {
                // Fallback: If not in any team, just show self
                setTeamPMs([profile]);
            }
        };

        fetchSecondaryData();
    }, [isModalOpen, isAssignModalOpen, profile?.id, userRole]);

    const handleSoldItemSelect = (item: string) => {
        setSoldItems([item]);
        // Clear other text if Other is not selected
        if (item !== 'Other') {
            setOtherSoldText('');
        }
    };

    const toggleAddon = (item: string) => {
        setAddons(prev => {
            const next = prev.includes(item)
                ? prev.filter(i => i !== item)
                : [...prev, item];
            // Clear other text if Other is deselected
            if (item === 'Other' && !next.includes('Other')) {
                setAddonsOther('');
            }
            return next;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        // Reset the input value so the same file fails can be selected again if needed
        e.target.value = '';

        setIsUploading(true);
        // Simulate upload delay
        setTimeout(() => {
            setProjectBriefFiles(prev => [...prev, ...selectedFiles]);
            setIsUploading(false);
        }, 1500);
    };

    const removeFile = (index: number) => {
        setProjectBriefFiles(prev => prev.filter((_, i) => i !== index));
    };


    const accountOptions = useMemo(() => {
        return accounts.map(acc => ({
            value: acc.id,
            label: acc.name,
            description: acc.prefix
        }));
    }, [accounts]);

    const currentPrefix = useMemo(() => {
        const acc = accounts.find(a => a.id === selectedAccount);
        return acc?.prefix || 'ARS';
    }, [accounts, selectedAccount]);



    const columns = [
        {
            header: 'Project ID',
            key: 'id',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) => {
                const lastRead = readStates[item.project_id];

                // OPTIMIZATION: Wait for readStates to be ready to avoid "false positive" flickering
                const hasUnread = hasFetchedReadStates &&
                    item.latest_comment_at &&
                    (!lastRead || new Date(item.latest_comment_at) > new Date(lastRead)) &&
                    item.latest_comment_author_id !== profile?.id;

                return (
                    <div className="flex items-center gap-3">
                        {/* Solid Dot like Mock */}
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-opacity duration-300 ${hasUnread ? "bg-sky-500" : "bg-transparent opacity-0"}`} title={hasUnread ? "New Message" : ""} />
                        <span className="text-white font-medium">
                            {item.id}
                        </span>
                        {item.hasDispute && (
                            <span className="md:hidden inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black !bg-brand-error/20 !text-brand-error uppercase tracking-wider whitespace-nowrap">
                                Dispute
                            </span>
                        )}
                        {item.hasArtHelp && (
                            <span className="md:hidden inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black !bg-brand-info/20 !text-brand-info uppercase tracking-wider whitespace-nowrap">
                                Art Help
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Project Title',
            key: 'title',
            className: 'min-w-[120px]',
            render: (item: any) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{item.title}</span>
                        {item.hasDispute && (
                            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black !bg-brand-error/20 !text-brand-error uppercase tracking-wider whitespace-nowrap">
                                Dispute
                            </span>
                        )}
                        {item.hasArtHelp && (
                            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black !bg-brand-info/20 !text-brand-info uppercase tracking-wider whitespace-nowrap">
                                Art Help
                            </span>
                        )}
                    </div>
                    {item.labels && item.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {item.labels.map((label: any) => (
                                <span
                                    key={label.id}
                                    className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 h-[16px] leading-none whitespace-nowrap animate-in fade-in duration-300"
                                    style={{
                                        backgroundColor: `${label.color}15`,
                                        color: label.color,
                                        border: `1px solid ${label.color}25`,
                                    }}
                                >
                                    {label.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Client Name',
            key: 'client',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-white font-medium">{item.client}</span>
                    {item.client_type === 'repeat' && (
                        <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">REPEAT {item.previous_logo_no ? `: ${item.previous_logo_no}` : ''}</span>
                    )}
                </div>
            )
        },
        {
            header: 'Assignee',
            key: 'assignee',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) => {
                if (userRole?.toLowerCase().trim() === 'team lead') {
                    if (item.assignee_id === profile?.id && !item.team_designer_id) {
                        return <span className="text-orange-500 font-black uppercase tracking-tighter">Unassigned</span>;
                    }
                }
                return formatDisplayName(item.assignee);
            }
        },
        ...(!isFreelancer ? [{
            header: 'Client Time Left',
            key: 'clientTimeLeft',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) =>
                <Countdown date={item.clientDateRaw} status={item.status} isClientTime={true} className="text-sm font-bold uppercase tracking-wider" />
        }] : []),
        {
            header: 'Assignee Deadline',
            key: 'dueDate',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-white font-medium">{item.dueDate}</span>
                    <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">{formatTime(item.dueTime)}</span>
                </div>
            )
        },
        {
            header: 'Assignee Time Left',
            key: 'timeLeft',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) =>
                <Countdown date={item.dateRaw} status={item.status} className="text-sm font-bold uppercase tracking-wider" />
        },
        {
            header: 'Status',
            key: 'status',
            className: 'whitespace-nowrap min-w-max',
            render: (item: any) => {
                let status = item.status?.trim() || 'In Progress';

                // Use the main status without QA overrides for consistency with the tabs
                status = item.status?.trim() || 'In Progress';

                return (
                    <div className="flex flex-col gap-1 items-start">
                        <div className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest inline-block ${getStatusCapsuleClasses(status)}`}>
                            {status}
                        </div>
                    </div>
                );
            }
        },
        ...(isFreelancer
            ? [{ header: 'Payout', key: 'payout', className: 'w-24 text-center', render: (item: any) => <span className="text-brand-success font-bold block w-full">{item.payout}</span> }]
            : [{ header: 'Price', key: 'price', className: 'w-24 text-center' }]
        ),
        {
            header: '',
            key: 'actions',
            className: 'w-20 text-right',
            render: (item: any) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                        variant="flat"
                        options={[
                            { label: 'Open', value: 'open', icon: <IconEye className="w-4 h-4" /> },
                            { label: 'Add Tag', value: 'add-tag', icon: <IconTag className="w-4 h-4" /> }
                        ]}
                        onChange={(val) => {
                            if (val === 'open') onProjectOpen?.(item.id, item);
                            if (val === 'add-tag') {
                                setTaggingProjectId(item.project_id || item.id);
                                setIsLabelModalOpen(true);
                            }
                        }}
                        className="w-fit ml-auto"
                        menuClassName=""
                    >
                        <button
                            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all duration-200 group active:scale-95"
                        >
                            <IconMoreVertical className="w-5 h-5" />
                        </button>
                    </Dropdown>
                </div>
            )
        },
    ];

    const leadsColumns = [
        {
            header: 'Lead Intake Date',
            key: 'created_at',
            render: (item: any) => (
                <span className="text-white font-medium">
                    {new Date(item.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            )
        },
        {
            header: 'Client Name',
            key: 'client_name',
            className: 'min-w-[220px]',
            render: (item: any) => (
                <div className="flex flex-col">
                    <span className="text-white font-medium">{item.client_name}</span>
                    {item.client_type?.toLowerCase() === 'repeat' && (
                        <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">
                            REPEAT {item.previous_order_id ? `: ${item.previous_order_id}` : ''}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Client Interest',
            key: 'project_title',
            render: (item: any) => (
                <span className="text-white font-medium">{item.project_title}</span>
            )
        },
        {
            header: 'Account',
            key: 'account',
            className: 'w-[100px]',
            render: (item: any) => (
                <span className="text-gray-300 font-bold">{item.account || '—'}</span>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (item: any) => (
                <div className={`px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest inline-block ${getStatusCapsuleClasses(item.status)}`}>
                    {item.status}
                </div>
            )
        },
        {
            header: 'Location',
            key: 'location',
            render: (item: any) => (
                <div className="flex items-center gap-2">
                    <span className="text-gray-300">{item.location || '—'}</span>
                </div>
            )
        },
        {
            header: '',
            key: 'actions',
            className: 'w-20 text-right',
            render: (item: any) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                        variant="flat"
                        options={[
                            { label: 'Open', value: 'open', icon: <IconEye className="w-4 h-4" /> },
                            { label: 'Delete', value: 'delete', icon: <IconTrash className="w-4 h-4" />, variant: 'danger' }
                        ]}
                        onChange={(val) => {
                            if (val === 'open') {
                                onLeadOpen?.(item);
                            } else if (val === 'delete') {
                                setLeadToDelete(item);
                                setIsDeleteConfirmOpen(true);
                            }
                        }}
                        className="w-fit ml-auto"
                    >
                        <button className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all duration-200">
                            <IconMoreVertical className="w-5 h-5" />
                        </button>
                    </Dropdown>
                </div>
            )
        }
    ];

    const handleDeadlineShortcut = (hours: number) => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

        // Update both date and time states
        setDueDate(futureDate);

        // Format time as HH:mm
        const hh = String(futureDate.getHours()).padStart(2, '0');
        const mm = String(futureDate.getMinutes()).padStart(2, '0');
        setDueTime(`${hh}:${mm}`);
        setActiveShortcut(hours);
    };

    const handleReset = () => {
        setSelectedMove(null);
        setOrderType(null);
        setPrice('');
        setAssigneeManualPrice('');
        setOtherSoldText('');
        setSelectedAccount(null);
        setLogoNoType(null);
        setActiveShortcut(null);
        setManualLogoNo('');
        setClientType(null);
        setClientName('');
        setPreviousLogoNo('');
        setIsLinkedToOrder(false);
        setLinkedProjectData(null);
        setIsSearchingLinkedProject(false);
        setMedium(null);
        setProjectTitle('');
        setProjectBriefText('');
        setProjectBriefFiles([]);
        setOptionsRequired(null);
        setIsUploading(false);
        setAddons([]);
        setAddonsOther('');
        setIsBriefExpanded(false);
        setBriefMode('edit');
        setDueDate(null);
        setDueTime('');
        setClientDueDate(null);
        setClientDueTime('');
        setSelectedAssignee(null);
        setCurrentStep(1);
        setRemovalReason(null);
        setRemovalOtherText('');
        setRemoveProjectId('');
        setConvertedBy(null);
        setCancellationReason(null);
        setCancellationOtherText('');
        setCancelProjectId('');
        setApproveTips(null);
        setApproveAmount('');
        setApproveProjectId('');
        setApproveDate(new Date());
        setLeadIntakeDate(new Date());
        const now = new Date();
        setLeadIntakeTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        setShowReview(false);
        setIsReviewLoading(false);
    };

    const getStatusColor = (tabId: string) => {
        const s = tabId.toLowerCase();
        if (s.includes('approved')) return 'bg-green-600';
        if (s.includes('progress') || s.includes('pending')) return 'bg-amber-600';
        if (s.includes('done') || s.includes('complete') || s.includes('delivered')) return 'bg-sky-500';
        if (s.includes('revision')) return 'bg-orange-500';
        if (s.includes('final')) return 'bg-indigo-500';
        if (s.includes('urgent') || s.includes('error') || s.includes('cancelled')) return 'bg-red-600';
        if (s.includes('qa') || s.includes('sent-for-qa')) return 'bg-amber-500';
        if (s.includes('approval')) return 'bg-emerald-600';
        return 'bg-gray-500';
    };

    return (

        <div className="flex flex-col min-h-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-6">

            {/* Mobile Navigation & Controls (md:hidden) */}
            <div className="md:hidden flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
                {/* Status Expander */}
                <div className="flex flex-col gap-2">
                    {/* Status Expander Header */}
                    <button
                        onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                        className="group relative flex items-center justify-between w-full h-14 px-5 bg-black/40 rounded-2xl transition-all duration-300 active:scale-[0.95] overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] border border-white/[0.03]"
                    >
                        {/* Recessed Depth Overlays */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {/* Inner Top Shadow for carved-in look */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/80 to-transparent opacity-80" />
                            {/* Subtle Diagonal Machined Sheen */}
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-20" />
                        </div>

                        <div className="flex items-center gap-3.5 relative z-10">
                            {(() => {
                                const tId = activeTab;
                                const dColor = getStatusColor(tId);

                                const currentLabel = [...row1Tabs, ...row2Tabs].find(t => t.id === activeTab)?.label || 'All';

                                // Clean label for header (remove count if exists, e.g. "In Progress 5" -> "In Progress")
                                const headerLabel = currentLabel.replace(/\s\d+$/, '').toUpperCase();

                                return (
                                    <>
                                        <div className={`w-2 h-2 rounded-full ${dColor} shadow-[0_0_12px_currentColor] brightness-125`} />
                                        <span className="text-[13px] font-black uppercase tracking-[0.1em] text-white leading-none">
                                            {headerLabel}
                                        </span>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 group-hover:border-brand-primary/30 transition-all duration-300 group-active:bg-brand-primary/10">
                            <IconChevronRight
                                className={`w-5 h-5 text-gray-400 group-hover:text-brand-primary transition-transform duration-500 ${isStatusExpanded ? 'rotate-90 text-brand-primary scale-110' : ''}`}
                            />
                        </div>
                    </button>


                    {/* Status Menu Items */}
                    {isStatusExpanded && (
                        <div className="mt-2 overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-nova animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-3 grid grid-cols-1 gap-3">
                                {[
                                    'all', 'progress', 'done', 'revision', 'revision-done',
                                    'urgent', 'urgent-done', 'revision-urgent', 'revision-urgent-done',
                                    'qa', 'sent-for-qa', 'final-files', 'final-files-done',
                                    'approval', 'approved', 'cancelled',
                                    ...(isProjectManager ? [
                                        'leads-new', 'leads-active', 'leads-offer-sent', 'leads-converted',
                                        'leads-project-completed', 'leads-upsell-sent', 'leads-interested',
                                        'leads-upsell-won', 'leads-not-interested', 'leads-lost'
                                    ] : [])
                                ].map((tabId) => {
                                    const isLeadTab = tabId.startsWith('leads-');
                                    const cleanTabId = isLeadTab ? tabId.replace('leads-', '') : tabId;
                                    const tab = isLeadTab
                                        ? leadsTabs.find(t => t.id === cleanTabId)
                                        : [...row1Tabs, ...row2Tabs].find(t => t.id === tabId);

                                    if (!tab) return null;
                                    const isActive = isLeadTab ? (viewMode === 'leads' && leadsActiveTab === cleanTabId) : (viewMode === 'projects' && activeTab === tabId);

                                    // Determine dot color based on status ID using reconciled helper
                                    const dotColor = isLeadTab ? 'bg-sky-500' : getStatusColor(tabId);

                                    return (
                                        <button
                                            key={tabId}
                                            onClick={() => {
                                                if (isLeadTab) {
                                                    setViewMode('leads');
                                                    setLeadsActiveTab(cleanTabId);
                                                } else {
                                                    setViewMode('projects');
                                                    setActiveTab(tabId);
                                                }
                                                setIsStatusExpanded(false);
                                            }}
                                            className={`
                                                group relative flex items-center gap-4 w-full p-4 border rounded-2xl transition-all duration-300 outline-none overflow-hidden
                                                ${isActive
                                                    ? 'bg-white/[0.08] border-brand-primary shadow-[0_8px_24px_-4px_rgba(255,107,75,0.25)]'
                                                    : 'bg-white/[0.03] border-white/10 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)] hover:bg-white/[0.06] hover:border-white/20'}
                                            `}
                                        >
                                            {/* Metallic Shine Overlays */}
                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] pointer-events-none opacity-40" />

                                            {/* Radio Indicator */}
                                            <div className="relative z-10 shrink-0">
                                                <div className={`
                                                    w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center relative overflow-hidden
                                                    ${isActive
                                                        ? 'bg-brand-primary border-brand-primary shadow-[0_0_12px_rgba(255,107,75,0.4)]'
                                                        : 'bg-black/20 border-white/10 group-hover:border-white/30'}
                                                `}>
                                                    {isActive && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-in zoom-in-50 duration-200" />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 relative z-10 flex-1 overflow-hidden">
                                                <span className={`
                                                    text-[11px] font-black uppercase tracking-[0.15em] transition-colors duration-300 truncate
                                                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                                                `}>
                                                    {tab.label.replace(/\s\d+$/, '')}
                                                </span>
                                                {(() => {
                                                    const countMatch = tab.label.match(/\d+$/);
                                                    if (!countMatch) return null;
                                                    const textColor = dotColor.replace('bg-', 'text-');
                                                    return (
                                                        <span className={`text-[11px] font-black ${textColor} filter brightness-110`}>
                                                            {countMatch[0]}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Action Button */}
                {!isFreelancer && !isTeamLead && (
                    <Button
                        variant="metallic"
                        className="w-full !rounded-xl !py-4 font-black tracking-widest shadow-nova text-xs"
                        onClick={() => setIsModalOpen(true)}
                    >
                        CHOOSE YOUR MOVE
                    </Button>
                )}
                {isTeamLead && (
                    <Button
                        variant="metallic"
                        className="w-full !rounded-xl !py-4 font-black tracking-widest shadow-nova text-xs"
                        onClick={() => { setIsAssignModalOpen(true); setAssignStep(1); }}
                    >
                        ASSIGN PROJECT
                    </Button>
                )}

                {/* Alerts & Filter Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAlertFilter(prev => prev === 'dispute' ? null : 'dispute')}
                            className={`
                                flex-1 !rounded-xl transition-all duration-300 text-[9px] font-black h-12 uppercase tracking-widest px-4
                                ${alertFilter === 'dispute'
                                    ? '!bg-brand-error !text-white !border-brand-error shadow-[0_4px_12px_rgba(239,68,68,0.2)]'
                                    : '!bg-brand-error/10 !text-brand-error !border-brand-error/20'
                                }
                            `}
                        >
                            Dispute{projectCounts['dispute'] > 0 ? ` ${projectCounts['dispute']}` : ''}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAlertFilter(prev => prev === 'arthelp' ? null : 'arthelp')}
                            className={`
                                flex-1 !rounded-xl transition-all duration-300 text-[9px] font-black h-12 uppercase tracking-widest px-4
                                ${alertFilter === 'arthelp'
                                    ? '!bg-brand-info !text-white !border-brand-info shadow-[0_4px_12px_rgba(14,165,233,0.2)]'
                                    : '!bg-brand-info/10 !text-brand-info !border-brand-info/20'
                                }
                            `}
                        >
                            Art Help{projectCounts['arthelp'] > 0 ? ` ${projectCounts['arthelp']}` : ''}
                        </Button>
                    </div>


                </div>

                {/* Search Bar - Full Width */}
                <div className="flex gap-2">
                    <Input
                        variant="metallic"
                        size="md"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        leftIcon={<IconSearch className="w-4 h-4" />}
                        className="flex-1 !rounded-xl"
                    />
                    <Button
                        variant="metallic"
                        size="md"
                        onClick={() => setIsLabelModalOpen(true)}
                        className="px-4 !rounded-xl"
                    >
                        <IconTag className="w-4 h-4" />
                    </Button>
                </div>
            </div>
            {/* Desktop Navigation & Header (hidden on mobile) */}
            <div className="hidden md:flex flex-col gap-3">
                {/* Row 0 Tabs (Leads) - Centered horizontally */}
                {isProjectManager && (
                    <div className="w-full flex justify-center mb-1">
                        <Tabs
                            tabs={leadsTabs}
                            activeTab={viewMode === 'leads' ? leadsActiveTab : ''}
                            onTabChange={(id) => {
                                setViewMode('leads');
                                setLeadsActiveTab(id);
                            }}
                        />
                    </div>
                )}

                {/* Row 1 Tabs - Centered horizontally */}
                <div className="w-full flex justify-center">
                    <Tabs
                        tabs={row1Tabs}
                        activeTab={viewMode === 'projects' ? activeTab : ''}
                        onTabChange={(id) => {
                            setViewMode('projects');
                            setActiveTab(id);
                        }}
                    />
                </div>

                {/* 
                        Row 2 Tabs + Action Button
                        Treating them as 1 group while centralizing.
                    */}
                <div className="w-full flex justify-center items-center gap-3">
                    <Tabs
                        tabs={row2Tabs}
                        activeTab={viewMode === 'projects' ? activeTab : ''}
                        onTabChange={(id) => {
                            setViewMode('projects');
                            setActiveTab(id);
                        }}
                    />

                    {!isFreelancer && !isTeamLead && (
                        <Button
                            variant="metallic"
                            size="md"
                            leftIcon={<IconPlus className="w-4 h-4" />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            {isTeamLead ? 'Assign Project' : 'Choose Your Move'}
                        </Button>
                    )}

                    {isTeamLead && (
                        <Button
                            variant="metallic"
                            size="md"
                            leftIcon={<IconPlus className="w-4 h-4" />}
                            onClick={() => { setIsAssignModalOpen(true); setAssignStep(1); }}
                        >
                            Assign Project
                        </Button>
                    )}
                </div>

            </div>

            {/* Desktop-only secondary controls row */}
            <div className="hidden md:flex items-center justify-between gap-4">
                {/* Secondary Actions - Top Left of Table */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setAlertFilter(prev => prev === 'dispute' ? null : 'dispute');
                            setViewMode('projects');
                        }}
                        className={`
                            rounded-xl border-transparent transition-all duration-300
                            ${alertFilter === 'dispute'
                                ? '!bg-brand-error !text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                : '!bg-brand-error/10 !text-brand-error hover:!bg-brand-error/20'
                            }
                            focus:!ring-brand-error/30 focus:!ring-offset-0 focus:!border-brand-error/40
                        `}
                    >
                        Disputes{projectCounts['dispute'] > 0 ? ` ${projectCounts['dispute']}` : ''}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setAlertFilter(prev => prev === 'arthelp' ? null : 'arthelp');
                            setViewMode('projects');
                        }}
                        className={`
                            rounded-xl border-transparent transition-all duration-300
                            ${alertFilter === 'arthelp'
                                ? '!bg-brand-info !text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                                : '!bg-brand-info/10 !text-brand-info hover:!bg-brand-info/20'
                            }
                            focus:!ring-brand-info/30 focus:!ring-offset-0 focus:!border-brand-info/40
                        `}
                    >
                        Art Helps{projectCounts['arthelp'] > 0 ? ` ${projectCounts['arthelp']}` : ''}
                    </Button>
                </div>

                {/* Search - Top Right of Table */}
                <div className="flex items-center gap-3 w-[350px]">
                    <div className="flex-1">
                        <Input
                            size="sm"
                            variant="metallic"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<IconSearch className="w-4 h-4" />}
                            rightIcon={null}
                            className="w-full"
                        />
                    </div>
                    {effectiveRole === 'Super Admin' && (
                        <Button
                            variant="metallic"
                            size="sm"
                            onClick={() => setIsLabelModalOpen(true)}
                            leftIcon={<IconTag className="w-4 h-4" />}
                            className="px-4 whitespace-nowrap"
                        >
                            Manage Labels
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 relative">
                <div className={`h-full transition-all duration-300 ${loading ? 'min-h-[522px]' : ''}`}>
                    <Table
                        columns={viewMode === 'leads' ? leadsColumns : columns}
                        data={viewMode === 'leads' ? leadsData : (tableData || [])}
                        emptyMessage={viewMode === 'leads' ? "No leads found." : "No projects found."}
                        isLoading={viewMode === 'leads' ? leadsLoading : loading}
                        skeletonCount={ITEMS_PER_PAGE}
                        isMetallicHeader={true}
                        className={viewMode === 'leads' ? "leads-table" : "projects-table"}
                    />
                </div>
            </div>


            {/* Pagination Controls */}
            {(viewMode === 'leads' ? leadsTotalCount : totalCount) > 0 && (
                <div className="flex justify-end">
                    <Pagination
                        current={currentPage}
                        total={Math.ceil((viewMode === 'leads' ? leadsTotalCount : totalCount) / ITEMS_PER_PAGE)}
                        onChange={(page) => {
                            setCurrentPage(page);
                            // Scroll to top of table or page
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
                </div>
            )}

            {/* Choose Your Move Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    handleReset();
                }}
                closeOnOutsideClick={false}
                title={(() => {
                    if (showReview) return "Final Review";
                    if (currentStep === 1) return "Choose Your Move";

                    if (selectedMove === 'Add') {
                        if (orderType === 'Inquiry') {
                            switch (currentStep) {
                                case 2: return "Order Type";
                                case 3: return "Client Type";
                                case 4: return "Medium";
                                case 5: return "Client Details";
                                case 6: return "Account";
                                case 7: return "Client Interest";
                                default: return "Choose Your Move";
                            }
                        } else {
                            switch (currentStep) {
                                case 2: return "Order Type";
                                case 3: return "Client Type";
                                case 4: return "Medium";
                                case 5: return "Client Details";
                                case 6: return "Price";
                                case 7: return "Account";
                                case 8: return "Project ID";
                                case 9: return "What Have You Sold?";
                                case 10: return "Project Title";
                                case 11: return "Project Brief";
                                case 12: return "Any Addons?";
                                case 13: return "Deadline";
                                case 14: return "Assignee";
                                default: return "Choose Your Move";
                            }
                        }
                    } else if (selectedMove === 'Remove') {
                        switch (currentStep) {
                            case 2: return "Removal Reason";
                            case 3: return "Project ID";
                            default: return "Choose Your Move";
                        }
                    } else if (selectedMove === 'Cancel') {
                        switch (currentStep) {
                            case 2: return "Cancellation Reason";
                            case 3: return "Project ID";
                            default: return "Choose Your Move";
                        }
                    } else if (selectedMove === 'Approve') {
                        switch (currentStep) {
                            case 2: return "Approval Date";
                            case 3: return "Any Tips?";
                            case 4: return approveTips === 'Yes' ? "How Much?" : "Project ID";
                            case 5: return "Project ID";
                            default: return "Choose Your Move";
                        }
                    }

                    return "Choose Your Move";
                })()}
                size={showReview ? "full" : "sm"}
                isElevatedFooter
                footer={(
                    <div className="flex justify-end gap-3 items-center">
                        {showReview ? (
                            <>
                                <Button
                                    variant="recessed"
                                    onClick={() => setShowReview(false)}
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="metallic"
                                    isLoading={isSubmitting}
                                    disabled={
                                        isSubmitting || (
                                            selectedMove === 'Remove'
                                                ? (!removalReason || (removalReason === 'Other' && !removalOtherText.trim()) || !removeProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                                : selectedMove === 'Cancel'
                                                    ? (!cancellationReason || (cancellationReason === 'Other' && !cancellationOtherText.trim()) || !cancelProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                                    : selectedMove === 'Approve'
                                                        ? (!approveDate || !approveTips || (approveTips === 'Yes' && !approveAmount) || !approveProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                                        : (orderType === 'Inquiry'
                                                            ? (!clientName.trim() || !leadIntakeDate || !location.trim())
                                                            : (!selectedAssignee || !dueDate || !projectTitle.trim() || !selectedAccount)
                                                        )
                                        )
                                    }
                                    onClick={async () => {
                                        console.log('--- SUBMISSION START ---');
                                        setIsSubmitting(true);

                                        try {
                                            const move = selectedMove;
                                            const title = (projectTitle || '').trim();
                                            const account = selectedAccount;
                                            const prefix = currentPrefix || 'ARS';
                                            const type = orderType;
                                            const designType = logoNoType;
                                            const manualPId = (manualLogoNo || '').trim();
                                            const items = Array.isArray(soldItems) ? [...soldItems] : [];
                                            const otherItems = otherSoldText || '';
                                            const addonsList = Array.isArray(addons) ? [...addons] : [];
                                            const addonsOtherText = addonsOther || '';
                                            const client = clientType;
                                            const name = clientName || '';
                                            const prevLogo = previousLogoNo || '';
                                            const projectMedium = client === 'repeat' ? 'Repeat Order' : medium;
                                            const projectPriceString = price || '0';
                                            const manualPayoutValue = assigneeManualPrice ? parseFloat(String(assigneeManualPrice).replace(/[^0-9.]/g, '')) : null;
                                            const brief = projectBriefText || '';
                                            const date = dueDate;
                                            const time = dueTime || '17:00';
                                            const assignee = selectedAssignee;

                                            console.log('Validated State:', { move, title, account, date });

                                            if (move === 'Add' && type === 'Direct Order' && (!account || !title || !date)) {
                                                throw new Error('Please fill in Account, Project Title, and Due Date.');
                                            }

                                            if (move === 'Remove') {
                                                console.log('Executing REMOVE - PERMANENT DELETE');

                                                // 1. Delete associated notifications first
                                                const { error: notifError } = await supabase
                                                    .from('notifications')
                                                    .delete()
                                                    .eq('reference_id', removeProjectId);

                                                if (notifError) console.warn('Error deleting notifications:', notifError);

                                                // 2. Delete the project (will cascade to comments/earnings/etc via foreign keys if set up, or just remove the source of data)
                                                const { error: err } = await supabase.from('projects')
                                                    .delete()
                                                    .eq('project_id', removeProjectId);

                                                if (err) throw err;

                                            } else if (move === 'Cancel') {
                                                console.log('Executing CANCEL');
                                                // Fetch project for previous status before updating
                                                const { data: proj } = await supabase.from('projects').select('status').eq('project_id', cancelProjectId).single();
                                                const previousStatus = proj?.status || 'In Progress';

                                                const { error: cancelError } = await supabase.from('projects')
                                                    .update({
                                                        action_move: 'Cancel',
                                                        cancellation_reason: cancellationReason === 'Other' ? cancellationOtherText : cancellationReason,
                                                        status: 'Cancelled',
                                                        updated_at: new Date().toISOString()
                                                    })
                                                    .eq('project_id', cancelProjectId);
                                                if (cancelError) throw cancelError;

                                                // Insert Status Change Card
                                                await supabase.from('project_comments').insert([{
                                                    project_id: cancelProjectId,
                                                    content: `STATUS_CHANGED:${previousStatus}:Cancelled`,
                                                    author_name: profile?.name || 'User',
                                                    author_role: profile?.role || 'Staff'
                                                }]);

                                                setActiveTab('cancelled');

                                            } else if (move === 'Approve') {
                                                console.log('Executing APPROVE');

                                                // First, fetch the project to get assignee and platform commission details
                                                const { data: projectData, error: fetchError } = await supabase
                                                    .from('projects')
                                                    .select('assignee, platform_commission_id, price, status')
                                                    .eq('project_id', approveProjectId)
                                                    .single();

                                                if (fetchError) {
                                                    console.error('Error fetching project:', fetchError);
                                                    throw fetchError;
                                                }

                                                // Fetch clearance days from platform commission
                                                let clearanceDays = 14; // Default
                                                if (projectData?.platform_commission_id) {
                                                    const { data: commissionData } = await supabase
                                                        .from('platform_commissions')
                                                        .select('clearance_days')
                                                        .eq('id', projectData.platform_commission_id)
                                                        .single();

                                                    if (commissionData?.clearance_days) {
                                                        clearanceDays = commissionData.clearance_days;
                                                    }
                                                }

                                                const previousStatus = projectData?.status || 'In Progress';

                                                // Update project with approval and clearance tracking
                                                const { error: approveError } = await supabase.from('projects')
                                                    .update({
                                                        action_move: 'Approve',
                                                        tips_given: approveTips === 'Yes',
                                                        tip_amount: approveTips === 'Yes' ? parseFloat(approveAmount) : 0,
                                                        status: 'Approved',
                                                        funds_status: 'Pending',
                                                        due_date: date ? (date instanceof Date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : String(date).split('T')[0]) : null,
                                                        due_time: time,
                                                        clearance_start_date: (() => {
                                                            const d = approveDate || new Date();
                                                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                        })(),
                                                        clearance_days: clearanceDays,
                                                        updated_at: new Date().toISOString()
                                                    })
                                                    .eq('project_id', approveProjectId);
                                                if (approveError) throw approveError;

                                                // Insert Status Change Card
                                                await supabase.from('project_comments').insert([{
                                                    project_id: approveProjectId,
                                                    content: `STATUS_CHANGED:${previousStatus}:Approved`,
                                                    author_name: profile?.name || 'User',
                                                    author_role: profile?.role || 'Staff'
                                                }]);

                                                setActiveTab('approved');

                                            } else if (orderType === 'Inquiry') {
                                                console.log('Executing ADD (Inquiry)');
                                                const leadPayload = {
                                                    client_name: name,
                                                    project_title: items.length > 0 ? items.join(', ') : (otherItems || 'Logo'),
                                                    client_type: client,
                                                    location: location || null,
                                                    message_date: (() => {
                                                        const d = leadIntakeDate ? new Date(leadIntakeDate) : new Date();
                                                        if (leadIntakeTime) {
                                                            const [h, m] = leadIntakeTime.split(':');
                                                            d.setHours(parseInt(h), parseInt(m));
                                                        }
                                                        return d.toISOString();
                                                    })(),
                                                    status: 'New',
                                                    previous_order_id: client === 'repeat' ? prevLogo : null,
                                                    account: prefix || null,
                                                    source: client === 'repeat' ? 'Repeat Order' : (medium || 'Internal'),
                                                    added_by: profile?.name || 'Unknown'
                                                };

                                                console.log('Inserting Lead payload:', leadPayload);
                                                const { error: leadError } = await supabase
                                                    .from('leads')
                                                    .insert([leadPayload]);

                                                if (leadError) throw leadError;

                                                // Redirect to Leads section and Inquiry tab
                                                setViewMode('leads');
                                                setLeadsActiveTab('new');
                                                setIsModalOpen(false);
                                                addToast({ type: 'success', title: 'Success', message: 'Inquiry added successfully!' });

                                            } else if (move === 'Add') {
                                                // ADD Branch (Direct Order)
                                                console.log('Executing ADD');
                                                const pId = (designType === 'Add Manually' && manualPId)
                                                    ? manualPId
                                                    : `${prefix} ${Math.floor(100000 + Math.random() * 900000)}`;

                                                const accObj = accounts.find(a => a.id === account);
                                                const accountName = accObj?.name || account;

                                                const itemsSoldJson = {
                                                    items: items,
                                                    other: items.includes('Other') ? otherItems : null
                                                };

                                                const addonsJson = {
                                                    items: addonsList,
                                                    other: addonsList.includes('Other') ? addonsOtherText : null
                                                };

                                                // Robust Date Formatting
                                                let formattedDate = null;
                                                const d: any = date;
                                                try {
                                                    if (d instanceof Date) {
                                                        const yyyy = d.getFullYear();
                                                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                        const dd_date = String(d.getDate()).padStart(2, '0');
                                                        formattedDate = `${yyyy}-${mm}-${dd_date}`;
                                                    } else if (typeof d === 'string' && d.includes('T')) {
                                                        formattedDate = d.split('T')[0];
                                                    } else {
                                                        formattedDate = d; // fallback to raw
                                                    }
                                                } catch (dateErr) {
                                                    console.warn('Date formatting failed, using raw:', date);
                                                    formattedDate = date;
                                                }

                                                // Process Attachments using Supabase Storage
                                                const attachmentsJson = await Promise.all(projectBriefFiles.map(async file => {
                                                    try {
                                                        const uploaded = await uploadFile(file);
                                                        return {
                                                            name: file.name,
                                                            type: file.type,
                                                            size: file.size,
                                                            url: uploaded.url
                                                        };
                                                    } catch (err) {
                                                        console.error('Failed to upload file:', file.name, err);
                                                        return null;
                                                    }
                                                })).then(results => results.filter(r => r !== null));

                                                // Determine Primary Manager & Collaborators based on Converted By selection
                                                let primaryManagerId = profile?.id;
                                                let finalCollaborators: any[] = [];

                                                // NOTE: Converted By logic was removed from direct order path
                                                finalCollaborators = pmCollaborators.map(m => ({ id: m.id, name: m.name, role: m.role }));

                                                const payload = {
                                                    project_id: pId,
                                                    action_move: 'Add',
                                                    project_title: title,
                                                    account: accountName,
                                                    account_id: account,
                                                    client_type: client,
                                                    client_name: name,
                                                    previous_logo_no: client === 'repeat' ? prevLogo : null,
                                                    items_sold: itemsSoldJson,
                                                    addons: addonsJson,
                                                    medium: projectMedium,
                                                    price: parseFloat(String(projectPriceString).replace(/[^0-9.]/g, '')) || 0,
                                                    brief: brief,
                                                    options_required: optionsRequired ? parseInt(optionsRequired) : null,
                                                    attachments: attachmentsJson, // Added attachments
                                                    client_due_date: clientDueDate ? `${clientDueDate.getFullYear()}-${String(clientDueDate.getMonth() + 1).padStart(2, '0')}-${String(clientDueDate.getDate()).padStart(2, '0')}` : null,
                                                    client_due_time: clientDueTime || null,
                                                    due_date: formattedDate,
                                                    due_time: time,
                                                    converted_by: null,
                                                    order_type: 'Direct',
                                                    assignee: assignee,
                                                    assignee_id: selectedAssigneeId,
                                                    primary_manager_id: primaryManagerId,
                                                    collaborators: finalCollaborators,
                                                    designer_fee: manualPayoutValue, // Pass manual payout if provided, trigger will handle the rest
                                                    status: 'In Progress',
                                                    created_at: new Date().toISOString()
                                                };

                                                console.log('Inserting payload:', payload);
                                                // Using select() without single() for more reliability in some environments
                                                const { data: insertedData, error: insertError } = await supabase
                                                    .from('projects')
                                                    .insert([payload])
                                                    .select();

                                                if (insertError) throw insertError;

                                                // Best Approach: Insert into relational collaborators table
                                                if (insertedData && insertedData[0] && finalCollaborators.length > 0) {
                                                    const collabPayload = finalCollaborators.map(c => ({
                                                        project_id: insertedData[0].project_id,
                                                        member_id: c.id,
                                                        role: c.role || 'Collaborator'
                                                    }));

                                                    const { error: collabError } = await supabase
                                                        .from('project_collaborators')
                                                        .insert(collabPayload);

                                                    if (collabError) {
                                                        console.error('Relational Collaborator Insert Error:', collabError);
                                                        // We don't throw here to avoid failing project creation if only collaborators fail
                                                    }
                                                }

                                                const inserted = insertedData && insertedData[0];
                                                if (inserted) {
                                                    console.log('Insertion confirmed:', inserted.project_id);

                                                    // Create PROJECT ASSIGNED activity record for the timeline
                                                    const activityPayload = {
                                                        project_id: inserted.project_id,
                                                        content: `PROJECT_ASSIGNED|${new Date().toISOString()}|${inserted.assignee || 'Unassigned'}`,
                                                        author_name: profile?.name || 'User',
                                                        author_role: effectiveRole || 'User',
                                                        created_at: new Date().toISOString(),
                                                        category: 'system'
                                                    };

                                                    supabase.from('project_comments').insert([activityPayload]).then(({ error }) => {
                                                        if (error) console.error('BG Activity Creation Error:', error);
                                                    });

                                                    const mapped = {
                                                        ...inserted,
                                                        id: inserted.project_id,
                                                        title: inserted.project_title || 'Untitled',
                                                        client: (inserted.client_name && inserted.client_name !== 'repeat') ? inserted.client_name : (inserted.previous_logo_no || inserted.client_type || 'Unknown'),
                                                        assignee: inserted.assignee || 'Unassigned',
                                                        clientDueDate: formatDeadlineDate(inserted.client_due_date),
                                                        clientDueTime: inserted.client_due_time ? inserted.client_due_time.substring(0, 5) : '',
                                                        dueDate: formatDeadlineDate(inserted.due_date),
                                                        dueTime: inserted.due_time ? inserted.due_time.substring(0, 5) : '',
                                                        status: inserted.status,
                                                        price: inserted.price ? `$${inserted.price}` : '',
                                                        payout: inserted.designer_fee ? `$${inserted.designer_fee}` : (isFreelancer ? '$0' : ''),
                                                        clientDateRaw: inserted.client_due_date ? `${inserted.client_due_date}T${inserted.client_due_time || '00:00:00'}` : null,
                                                        dateRaw: inserted.due_date ? `${inserted.due_date}T${inserted.due_time || '00:00:00'}` : null,
                                                        clientTimeLeft: getTimeLeft(inserted.client_due_date ? `${inserted.client_due_date}T${inserted.client_due_time || '00:00:00'}` : null, inserted.status, true),
                                                        timeLeft: getTimeLeft(inserted.due_date ? `${inserted.due_date}T${inserted.due_time || '00:00:00'}` : null, inserted.status),
                                                        hasDispute: false,
                                                        hasArtHelp: false
                                                    };
                                                    setTableData(prev => [mapped, ...(prev || [])]);

                                                    // Optimistically mark as read for the creator to avoid immediate blue dot
                                                    setReadStates(prev => ({
                                                        ...prev,
                                                        [inserted.project_id]: new Date().toISOString()
                                                    }));

                                                    // Silent side effects
                                                    const assigneeProfile = allFreelancers.find(f => f.name === inserted.assignee || f.email === inserted.assignee);
                                                    if (assigneeProfile) {
                                                        addNotification({
                                                            type: 'project_assigned',
                                                            reference_id: inserted.project_id,
                                                            message: `You have been assigned to: ${inserted.project_title || 'Untitled'}`,
                                                            user_id: assigneeProfile.id,
                                                            is_read: false
                                                        }).catch(e => console.error('BG Notification Error:', e));
                                                    } else {
                                                        // Fallback global notification if assignee profile not found (optional, but keep it clean)
                                                        addNotification({
                                                            type: 'project_created',
                                                            reference_id: inserted.project_id,
                                                            message: `New project created: ${inserted.project_title || 'Untitled'}`,
                                                            user_id: null, // Global if no user targeted
                                                            is_read: false
                                                        }).catch(e => console.error('BG Notification Error:', e));
                                                    }

                                                    triggerWebhooks('projectCreated', {
                                                        ...inserted,
                                                        order_type: type,
                                                        logo_no_type: designType,
                                                        sold_items: items,
                                                        other_sold_text: otherItems,
                                                        addons_list: addonsList,
                                                        addons_other_text: addonsOtherText
                                                    }).catch(e => console.error('BG Webhook Error:', e));
                                                }
                                            }

                                            addToast({ type: 'success', title: 'Success', message: 'Project details submitted successfully', silent: true });

                                            if (move !== 'Add') {
                                                await fetchProjects();
                                            }

                                            setIsModalOpen(false);
                                            handleReset();

                                        } catch (e: any) {
                                            console.error('SUBMISSION ERROR:', e);
                                            addToast({
                                                type: 'error',
                                                title: 'Submission Failed',
                                                message: e.message || 'Check database connection'
                                            });
                                        } finally {
                                            setIsSubmitting(false);
                                            console.log('--- SUBMISSION END ---');
                                        }
                                    }}
                                >
                                    Submit
                                </Button>
                            </>
                        ) : (
                            <>
                                {currentStep === 1 ? (
                                    <Button
                                        variant="recessed"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            handleReset();
                                        }}
                                        className="!px-10 !h-12 !text-[11px] font-black uppercase tracking-[0.15em]"
                                    >
                                        Cancel
                                    </Button>
                                ) : (
                                    <Button
                                        variant="recessed"
                                        onClick={() => {
                                            if (orderType === 'Inquiry' && clientType === 'repeat' && currentStep === 7) {
                                                setCurrentStep(5);
                                            } else if (clientType === 'repeat' && currentStep === 5) {
                                                setCurrentStep(3);
                                            } else if (orderType === 'Direct Order' && clientType === 'repeat' && currentStep === 8) {
                                                setCurrentStep(6);
                                            } else {
                                                setCurrentStep(prev => prev - 1);
                                            }
                                        }}
                                        disabled={isReviewLoading}
                                        className="!px-10 !h-12 !text-[11px] font-black uppercase tracking-[0.15em]"
                                    >
                                        Back
                                    </Button>
                                )}
                                <Button
                                    variant="metallic"
                                    isLoading={isReviewLoading}
                                    className="!px-12 !h-12 !text-[11px] font-black uppercase tracking-[0.15em]"
                                    disabled={
                                        currentStep === 1 ? !selectedMove :
                                            selectedMove === 'Remove' ? (
                                                currentStep === 2 ? (!removalReason || (removalReason === 'Other' && !removalOtherText.trim())) :
                                                    currentStep === 3 ? !removeProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) :
                                                        false
                                            ) :
                                                selectedMove === 'Cancel' ? (
                                                    currentStep === 2 ? (!cancellationReason || (cancellationReason === 'Other' && !cancellationOtherText.trim())) :
                                                        currentStep === 3 ? !cancelProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) :
                                                            false
                                                ) :
                                                    selectedMove === 'Approve' ? (
                                                        currentStep === 2 ? !approveDate :
                                                            currentStep === 3 ? !approveTips :
                                                                currentStep === 4 && approveTips === 'Yes' ? !approveAmount :
                                                                    (currentStep === 5 || (currentStep === 4 && approveTips === 'No')) ? !approveProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) :
                                                                        false
                                                    ) :
                                                        (
                                                            currentStep === 2 ? !orderType :
                                                                currentStep === 3 ? !clientType :
                                                                    orderType === 'Inquiry' ? (
                                                                        currentStep === 4 ? !medium :
                                                                            currentStep === 5 ? (
                                                                                !clientName.trim() ||
                                                                                ((clientType === 'new' || (clientType === 'repeat' && !isLocationDetected)) && !location.trim()) ||
                                                                                !leadIntakeDate
                                                                            ) :
                                                                                currentStep === 6 ? !selectedAccount :
                                                                                    currentStep === 7 ? (
                                                                                        soldItems.length === 0 ||
                                                                                        (soldItems.includes('Other') && !otherSoldText.trim())
                                                                                    ) :
                                                                                        false
                                                                    ) : (
                                                                        currentStep === 4 ? !medium :
                                                                            currentStep === 5 ? !clientName.trim() :
                                                                                currentStep === 6 ? !price.trim() :
                                                                                    currentStep === 7 ? !selectedAccount :
                                                                                        currentStep === 8 ? (logoNoType === 'Add Manually' && !manualLogoNo.trim()) :
                                                                                            currentStep === 9 ? (soldItems.length === 0 || (soldItems.includes('Other') && !otherSoldText.trim())) :
                                                                                                currentStep === 10 ? !projectTitle.trim() :
                                                                                                    currentStep === 11 ? isUploading :
                                                                                                        currentStep === 12 ? false :
                                                                                                            currentStep === 13 ? (!dueDate) :
                                                                                                                currentStep === 14 ? !selectedAssignee :
                                                                                                                    false
                                                                    )
                                                        )
                                    }
                                    onClick={() => {
                                        const getMaxSteps = () => {
                                            if (selectedMove === 'Remove') return 3;
                                            if (selectedMove === 'Cancel') return 3;
                                            if (selectedMove === 'Add') {
                                                if (orderType === 'Inquiry') {
                                                    return 7;
                                                }
                                                // Increased to 14 for Direct Order
                                                return 14;
                                            }
                                            if (selectedMove === 'Approve') {
                                                return approveTips === 'Yes' ? 5 : 4;
                                            }
                                            return 1;
                                        };
                                        const maxSteps = getMaxSteps();

                                        if (currentStep < maxSteps) {
                                            if (selectedMove === 'Approve' && currentStep === 3 && approveTips === 'No') {
                                                setCurrentStep(prev => prev + 1);
                                            } else if (clientType === 'repeat' && currentStep === 3) {
                                                setCurrentStep(5);
                                            } else if (orderType === 'Inquiry' && clientType === 'repeat' && currentStep === 5) {
                                                setCurrentStep(7);
                                            } else if (orderType === 'Direct Order' && clientType === 'repeat' && currentStep === 6) {
                                                setCurrentStep(8);
                                            } else {
                                                setCurrentStep(prev => prev + 1);
                                            }
                                        } else {
                                            setIsReviewLoading(true);
                                            setTimeout(() => {
                                                setIsReviewLoading(false);
                                                setShowReview(true);
                                            }, 800);
                                        }
                                    }}
                                >
                                    {((selectedMove === 'Remove' && currentStep === 3) ||
                                        (selectedMove === 'Cancel' && currentStep === 3) ||
                                        (selectedMove === 'Add' && (
                                            (orderType === 'Inquiry' && currentStep === 7) ||
                                            (orderType === 'Direct Order' && currentStep === 14)
                                        )) ||
                                        (selectedMove === 'Approve' && (currentStep === 5 || (currentStep === 4 && approveTips === 'No')))) ? 'Review' : 'Next'}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            >
                {isReviewLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl animate-in fade-in duration-300">
                        <div className="w-10 h-10 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                    </div>
                )}

                <div className={`space-y-6 ${isReviewLoading ? 'pointer-events-none' : ''}`}>
                    {!showReview && (
                        <>
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <Radio
                                        label="Add"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Add'}
                                        onChange={() => {
                                            if (selectedMove !== 'Add') handleReset();
                                            setSelectedMove('Add');
                                        }}
                                    />
                                    <Radio
                                        label="Remove"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Remove'}
                                        onChange={() => {
                                            if (selectedMove !== 'Remove') handleReset();
                                            setSelectedMove('Remove');
                                        }}
                                    />
                                    <Radio
                                        label="Cancel"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Cancel'}
                                        onChange={() => {
                                            if (selectedMove !== 'Cancel') handleReset();
                                            setSelectedMove('Cancel');
                                        }}
                                    />
                                    <Radio
                                        label="Approve"
                                        name="move-type"
                                        variant="metallic"
                                        checked={selectedMove === 'Approve'}
                                        onChange={() => {
                                            if (selectedMove !== 'Approve') handleReset();
                                            setSelectedMove('Approve');
                                        }}
                                    />
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Approve' && (
                                <div className="space-y-6">
                                    <DatePicker
                                        value={approveDate}
                                        onChange={(date) => setApproveDate(date)}
                                    >
                                        <div className="w-full relative flex items-center justify-between h-14 px-5 bg-black/40 border border-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:bg-black/50 transition-all transition-all duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                    <IconCalendar className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-white uppercase tracking-wider">
                                                    {approveDate ? formatDeadlineDate(approveDate) : 'Select Approval Date'}
                                                </span>
                                            </div>
                                            <IconChevronRight className="w-5 h-5 text-gray-500" />
                                        </div>
                                    </DatePicker>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Approve' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Radio
                                            label="Yes"
                                            name="approve-tips"
                                            variant="metallic"
                                            checked={approveTips === 'Yes'}
                                            onChange={() => setApproveTips('Yes')}
                                        />
                                        <Radio
                                            label="No"
                                            name="approve-tips"
                                            variant="metallic"
                                            checked={approveTips === 'No'}
                                            onChange={() => setApproveTips('No')}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedMove === 'Approve' && currentStep === 4 && approveTips === 'Yes' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="Type here"
                                            value={approveAmount}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setApproveAmount(val);
                                                }
                                            }}
                                            size="lg"
                                            leftIcon={<span className="text-gray-500">$</span>}
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedMove === 'Approve' && ((currentStep === 5) || (currentStep === 4 && approveTips === 'No')) && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="eg ARS 123456"
                                            value={approveProjectId}
                                            onChange={(e) => setApproveProjectId(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Remove' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {['Editing Required', 'Haram', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Radio
                                                    label={item}
                                                    name="removal-reason"
                                                    variant="metallic"
                                                    checked={removalReason === item}
                                                    onChange={() => setRemovalReason(item)}
                                                />
                                                {item === 'Other' && removalReason === 'Other' && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type reason here"
                                                            value={removalOtherText}
                                                            onChange={(e) => setRemovalOtherText(e.target.value)}
                                                            size="lg"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Cancel' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {['Client Was Unclear', 'Designs Were Not Good Enough', 'Client Not Satisfied', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Radio
                                                    label={item}
                                                    name="cancellation-reason"
                                                    variant="metallic"
                                                    checked={cancellationReason === item}
                                                    onChange={() => setCancellationReason(item)}
                                                />
                                                {item === 'Other' && cancellationReason === 'Other' && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type reason here"
                                                            value={cancellationOtherText}
                                                            onChange={(e) => setCancellationOtherText(e.target.value)}
                                                            size="lg"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && selectedMove === 'Add' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2 w-full">
                                        <div className="space-y-4">
                                            <Radio
                                                label="Inquiry"
                                                name="order-type"
                                                variant="metallic"
                                                checked={orderType === 'Inquiry'}
                                                onChange={() => setOrderType('Inquiry')}
                                            />
                                            <Radio
                                                label="Direct Order"
                                                name="order-type"
                                                variant="metallic"
                                                checked={orderType === 'Direct Order'}
                                                onChange={() => {
                                                    setOrderType('Direct Order');
                                                    setConvertedBy(null); // Reset converted by if direct
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Add' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Radio
                                            label="New Client"
                                            name="client-type"
                                            variant="metallic"
                                            checked={clientType === 'new'}
                                            onChange={() => setClientType('new')}
                                        />
                                        <Radio
                                            label="Repeat Client"
                                            name="client-type"
                                            variant="metallic"
                                            checked={clientType === 'repeat'}
                                            onChange={() => setClientType('repeat')}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Cancel' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="eg ARS 123456"
                                            value={cancelProjectId}
                                            onChange={(e) => setCancelProjectId(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && selectedMove === 'Remove' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Input
                                            variant="metallic"
                                            placeholder="eg ARS 123456"
                                            value={removeProjectId}
                                            onChange={(e) => setRemoveProjectId(e.target.value)}
                                            size="lg"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && selectedMove === 'Add' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Radio
                                            label="Ranking"
                                            name="medium-type"
                                            variant="metallic"
                                            checked={medium === 'Ranking'}
                                            onChange={() => setMedium('Ranking')}
                                        />
                                        <Radio
                                            label="Promoted"
                                            name="medium-type"
                                            variant="metallic"
                                            checked={medium === 'Promoted'}
                                            onChange={() => setMedium('Promoted')}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 5 && selectedMove === 'Add' && (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        {orderType === 'Inquiry' && (
                                            <div className="space-y-4 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">Inquiry Intake Date</p>
                                                    <DatePicker
                                                        value={leadIntakeDate}
                                                        onChange={(date) => setLeadIntakeDate(date)}
                                                    >
                                                        <div className="w-full relative flex items-center justify-between h-14 px-5 bg-black/40 border border-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:bg-black/50 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                                    <IconCalendar className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-sm font-bold text-white uppercase tracking-wider">
                                                                    {leadIntakeDate ? formatDeadlineDate(leadIntakeDate) : 'Intake Date'}
                                                                </span>
                                                            </div>
                                                            <IconChevronRight className="w-5 h-5 text-gray-500" />
                                                        </div>
                                                    </DatePicker>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">Inquiry Intake Time</p>
                                                    <TimeSelect
                                                        variant="metallic"
                                                        value={leadIntakeTime}
                                                        onChange={setLeadIntakeTime}
                                                        placeholder="Select Time"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">BUYER NAME</p>
                                            {clientType === 'repeat' ? (
                                                <Dropdown
                                                    variant="metallic"
                                                    options={repeatClients}
                                                    value={clientName}
                                                    onChange={(val) => {
                                                        setClientName(val);
                                                        handleClientSelection(val);
                                                    }}
                                                    placeholder="Search existing client..."
                                                    showSearch
                                                    size="lg"
                                                />
                                            ) : (
                                                <Input
                                                    variant="metallic"
                                                    placeholder="Enter buyer name"
                                                    value={clientName}
                                                    onChange={(e) => setClientName(e.target.value)}
                                                    size="lg"
                                                />
                                            )}
                                        </div>

                                        {(clientType === 'new' || (clientType === 'repeat' && !isLocationDetected)) && (
                                            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">LOCATION</p>
                                                <Dropdown
                                                    variant="metallic"
                                                    options={COUNTRIES}
                                                    value={location}
                                                    onChange={(val) => setLocation(val)}
                                                    placeholder="Select country..."
                                                    showSearch
                                                    size="lg"
                                                />
                                            </div>
                                        )}

                                        {clientType === 'repeat' && (
                                            <div className="space-y-4 pt-2">
                                                <Checkbox
                                                    label="Link To Existing Project"
                                                    checked={isLinkedToOrder}
                                                    onChange={setIsLinkedToOrder}
                                                    variant="metallic"
                                                />

                                                {isLinkedToOrder && (
                                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="flex items-center justify-between px-1">
                                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">PREVIOUS PROJECT ID</p>
                                                        </div>
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="eg ARS 123456"
                                                            value={previousLogoNo}
                                                            onChange={(e) => {
                                                                const val = e.target.value.toUpperCase();
                                                                setPreviousLogoNo(val);

                                                                // Smart Account Detection
                                                                const prefix = val.split(' ')[0];
                                                                if (prefix && prefix.length >= 2) {
                                                                    const matchedAccount = accountOptions.find(acc => acc.description?.toUpperCase() === prefix.toUpperCase());
                                                                    if (matchedAccount) {
                                                                        setSelectedAccount(matchedAccount.value);
                                                                    }
                                                                }
                                                            }}
                                                            size="lg"
                                                            isLoading={isSearchingLinkedProject}
                                                        />
                                                        {linkedProjectData && (
                                                            <div className="mt-2 px-3 py-2 rounded-xl bg-brand-warning/5 border border-brand-warning/10 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-warning animate-pulse" />
                                                                <span className="text-[10px] font-black text-white uppercase tracking-wider">Project Found: Linked to {linkedProjectData.assignee || 'Freelancer'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 6 && selectedMove === 'Add' && orderType === 'Direct Order' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Project Price</p>
                                            <Input
                                                variant="metallic"
                                                placeholder="eg 20"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                leftIcon={<span className="text-gray-500">$</span>}
                                                size="lg"
                                            />
                                        </div>

                                        <div className="h-px bg-white/[0.05] w-full" />

                                        <div className="space-y-4">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Assignee Payout (Optional)</p>
                                            <Input
                                                variant="metallic"
                                                placeholder="Leave empty for Tiered (Auto)"
                                                value={assigneeManualPrice}
                                                onChange={(e) => setAssigneeManualPrice(e.target.value)}
                                                leftIcon={<span className="text-gray-500">$</span>}
                                                size="lg"
                                            />
                                        </div>

                                        <div className="mt-6 p-4 bg-brand-warning/10 border border-brand-warning/20 rounded-2xl">
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand-warning/20 flex items-center justify-center text-brand-warning shrink-0">
                                                    <IconAlertCircle size={18} />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-brand-warning uppercase tracking-[0.2em]">NOTE:</p>
                                                    <p className="text-[11px] font-bold text-brand-warning leading-relaxed uppercase">
                                                        LEAVE ASSIGNEE PAYOUT (OPTIONAL) FIELD, EMPTY FOR NORMAL LOGOS. FOR SPECIAL PROJECTS (ANIMATION/WEB), DISCUSS PRICE WITH MANAGEMENT BEFORE ADDING.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {((currentStep === 7 && selectedMove === 'Add' && orderType === 'Direct Order') ||
                                (currentStep === 6 && selectedMove === 'Add' && orderType === 'Inquiry')) && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">ACCOUNT</p>
                                                <Dropdown
                                                    variant="metallic"
                                                    placeholder="Select Account"
                                                    options={accountOptions}
                                                    value={selectedAccount || ''}
                                                    onChange={(id) => {
                                                        setSelectedAccount(id);
                                                    }}
                                                    showSearch
                                                    size="lg"
                                                />
                                                {!selectedAccount && (
                                                    <p className="text-[10px] font-medium text-brand-error animate-in fade-in slide-in-from-top-1 px-1">
                                                        Account is required
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            {currentStep === 7 && selectedMove === 'Add' && orderType === 'Inquiry' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">CLIENT INTEREST</p>
                                            {['Logo', 'Social Media Kit', 'Stationery Designs', 'Other'].map((item) => (
                                                <React.Fragment key={item}>
                                                    <Radio
                                                        label={item}
                                                        variant="metallic"
                                                        checked={soldItems.includes(item)}
                                                        onChange={() => handleSoldItemSelect(item)}
                                                    />
                                                    {item === 'Other' && soldItems.includes('Other') && (
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type here"
                                                            value={otherSoldText}
                                                            onChange={(e) => setOtherSoldText(e.target.value)}
                                                            size="lg"
                                                        />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 8 && selectedMove === 'Add' && orderType === 'Direct Order' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Radio
                                            label="Auto Generate"
                                            name="logo-no-type"
                                            variant="metallic"
                                            checked={logoNoType === 'Auto Generate'}
                                            onChange={() => setLogoNoType('Auto Generate')}
                                        />
                                        <Radio
                                            label="Add Manually"
                                            name="logo-no-type"
                                            variant="metallic"
                                            checked={logoNoType === 'Add Manually'}
                                            onChange={() => setLogoNoType('Add Manually')}
                                        />
                                    </div>
                                    {logoNoType === 'Add Manually' && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-1">
                                                <Input
                                                    variant="metallic"
                                                    placeholder={`${currentPrefix} 876923`}
                                                    value={manualLogoNo}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase();
                                                        setManualLogoNo(val);

                                                        // Smart Account Detection
                                                        const prefix = val.split(' ')[0];
                                                        if (prefix && prefix.length >= 2) {
                                                            const matchedAccount = accountOptions.find(acc => acc.description?.toUpperCase() === prefix.toUpperCase());
                                                            if (matchedAccount) {
                                                                setSelectedAccount(matchedAccount.value);
                                                            }
                                                        }
                                                    }}
                                                    size="lg"
                                                />
                                                {selectedAccount && (
                                                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-brand-success/5 border border-brand-success/10 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                                        <div className="w-1 h-1 rounded-full bg-brand-success animate-pulse" />
                                                        <span className="text-[9px] font-black text-brand-success uppercase tracking-wider">Account Detected: {accountOptions.find(acc => acc.value === selectedAccount)?.label || selectedAccount}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 10 && selectedMove === 'Add' && orderType === 'Direct Order' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">PROJECT TITLE</p>
                                            <Input
                                                variant="metallic"
                                                placeholder="Type here"
                                                value={projectTitle}
                                                onChange={(e) => setProjectTitle(e.target.value)}
                                                size="lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 11 && selectedMove === 'Add' && orderType === 'Direct Order' && (
                                <div className="flex flex-col space-y-6">
                                    {/* Options Required Section */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">
                                            Options Required
                                        </label>
                                        <Input
                                            variant="recessed"
                                            placeholder="How Many Options Required?"
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={optionsRequired || ''}
                                            onChange={(e) => setOptionsRequired(e.target.value)}
                                            className="w-full"
                                            size="lg"
                                        />
                                    </div>

                                    {/* Edit/Preview Toggle */}
                                    <div className="inline-flex p-1 bg-black/60 border border-white/[0.05] rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] w-fit mb-4">
                                        <button
                                            onClick={() => setBriefMode('edit')}
                                            className={`px-10 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${briefMode === 'edit'
                                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_8px_20px_-4px_rgba(217,54,26,0.4)] scale-[1.02]'
                                                : 'text-gray-500 hover:text-white'
                                                }`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setBriefMode('preview')}
                                            className={`px-10 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${briefMode === 'preview'
                                                ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),0_8px_20px_-4px_rgba(217,54,26,0.4)] scale-[1.02]'
                                                : 'text-gray-500 hover:text-white'
                                                }`}
                                        >
                                            Preview
                                        </button>
                                    </div>

                                    {briefMode === 'edit' ? (
                                        <div className="space-y-4">
                                            {/* Compact Unified Container */}
                                            <div className="bg-black/60 border border-white/[0.05] rounded-2xl shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col focus-within:bg-black/80 transition-all duration-300">
                                                <TextArea
                                                    variant="flat"
                                                    placeholder="Describe the project..."
                                                    value={projectBriefText}
                                                    onChange={(e) => setProjectBriefText(e.target.value)}
                                                    onExpand={() => setIsBriefExpanded(true)}
                                                    className="!min-h-[100px] !bg-transparent !p-4 !text-sm"
                                                />

                                                {/* Streamlined Elevated Action Strip (Patti) */}
                                                <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between bg-surface-card relative overflow-hidden shadow-[0_-4px_10px_rgba(0,0,0,0.4)]">
                                                    <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.01)_100%)] pointer-events-none" />

                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <input
                                                            type="file"
                                                            id="brief-files-step-7"
                                                            multiple
                                                            className="hidden"
                                                            onChange={handleFileSelect}
                                                        />
                                                        <label
                                                            htmlFor="brief-files-step-7"
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all duration-300 cursor-pointer group active:scale-95"
                                                        >
                                                            {isUploading ? (
                                                                <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <IconPaperclip className="w-4 h-4 text-brand-primary group-hover:text-white transition-colors" />
                                                            )}
                                                            <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                                                                {isUploading ? 'Uploading...' : 'Attach'}
                                                            </span>
                                                        </label>
                                                    </div>

                                                    <div className="flex items-center gap-2 relative z-10">
                                                        {/* Empty for spacing or future use */}
                                                    </div>
                                                </div>
                                            </div>

                                            {projectBriefFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-4 mt-10">
                                                    {projectBriefFiles.map((file, index) => {
                                                        const ext = file.name.split('.').pop()?.toLowerCase();
                                                        let iconSrc = '/doc-icon.png'; // Default

                                                        if (ext === 'ai') iconSrc = '/ai-document.png';
                                                        else if (ext === 'psd') iconSrc = '/psd-icon.png';
                                                        else if (ext === 'pdf') iconSrc = '/pdf-icon.png';
                                                        else if (['zip', 'rar', '7z'].includes(ext || '')) iconSrc = '/zip-icon.png';
                                                        else if (ext === 'jpg' || ext === 'jpeg') iconSrc = '/jpg-icon.png';
                                                        else if (ext === 'png') iconSrc = '/png-icon.png';
                                                        else if (ext === 'eps') iconSrc = '/eps-icon.png';
                                                        else if (ext === 'doc' || ext === 'docx') iconSrc = '/doc-icon.png';
                                                        else if (ext === 'xls' || ext === 'xlsx') iconSrc = '/xls-icon.png';
                                                        else if (ext === 'ppt' || ext === 'pptx') iconSrc = '/ppt-icon.png';
                                                        else if (ext === 'txt') iconSrc = '/txt-icon.png';
                                                        else if (ext === 'avi' || ext === 'mp4') iconSrc = '/avi-icon.png';
                                                        else if (ext === 'mp3' || ext === 'wav') iconSrc = '/mp3-icon.png';
                                                        else if (ext === 'html') iconSrc = '/html-icon.png';
                                                        else if (ext === 'gif') iconSrc = '/gif-icon.png';

                                                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
                                                        const previewUrl = isImage ? URL.createObjectURL(file) : iconSrc;

                                                        return (
                                                            <div key={index} title={file.name} className="relative group w-24 flex flex-col items-center animate-in fade-in zoom-in duration-300 cursor-default">
                                                                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-300 shadow-lg mb-2 overflow-hidden relative">
                                                                    <img
                                                                        src={previewUrl}
                                                                        alt={file.name}
                                                                        className={`w-full h-full ${isImage ? 'object-cover' : 'object-contain p-4'} opacity-90 group-hover:opacity-100 transition-opacity`}
                                                                    />

                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-10">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setPreviewFile(file);
                                                                                setIsPreviewOpen(true);
                                                                            }}
                                                                            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary transition-all duration-300 transform scale-90 group-hover:scale-100"
                                                                            title="Preview"
                                                                        >
                                                                            <IconEye className="w-4 h-4" />
                                                                        </button>

                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                removeFile(index);
                                                                            }}
                                                                            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-brand-error hover:border-brand-error transition-all duration-300 transform scale-90 group-hover:scale-100"
                                                                            title="Remove"
                                                                        >
                                                                            <IconX className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400 truncate w-full text-center group-hover:text-white transition-colors px-1">
                                                                    {file.name}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="min-h-[140px] p-6 bg-black/60 rounded-2xl border border-white/[0.05] shadow-[inset_0_4px_16px_rgba(0,0,0,0.9),inset_0_1px_3px_rgba(0,0,0,0.5)] animate-in fade-in duration-500 relative overflow-hidden">
                                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                                            {projectBriefText.trim() ? (
                                                <ReactMarkdown components={markdownComponents} remarkPlugins={markdownPlugins}>
                                                    {parseCodesLogicMarkdown(projectBriefText)}
                                                </ReactMarkdown>
                                            ) : (
                                                <p className="text-gray-500 italic text-sm">Nothing to preview. Start typing...</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Brief File Preview Modal */}
                            <Modal
                                isOpen={isPreviewOpen}
                                onClose={() => {
                                    setIsPreviewOpen(false);
                                    setPreviewFile(null);
                                }}
                                title="File Preview"
                                size="xl"
                                isElevatedHeader
                                isElevatedFooter
                                footer={
                                    <div className="flex justify-end items-center gap-3 w-full">
                                        <Button
                                            variant="recessed"
                                            onClick={() => {
                                                setIsPreviewOpen(false);
                                                setPreviewFile(null);
                                            }}
                                            className="uppercase tracking-widest text-[10px] font-black px-6 h-10 border-white/5 hover:bg-white/5"
                                        >
                                            Close
                                        </Button>
                                        <Button
                                            variant="metallic"
                                            onClick={() => {
                                                if (previewFile) {
                                                    const url = URL.createObjectURL(previewFile);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = previewFile.name;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                }
                                            }}
                                            className="uppercase tracking-widest text-[10px] font-black px-8 h-10 shadow-lg shadow-brand-primary/10"
                                            leftIcon={<IconDownload size={14} />}
                                        >
                                            Download
                                        </Button>
                                    </div>
                                }
                            >
                                <div className="flex flex-col items-center justify-center p-4 min-h-[400px]">
                                    {previewFile && (
                                        <div className="w-full">
                                            <div className="w-full rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-2xl flex items-center justify-center min-h-[400px]">
                                                {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.name.split('.').pop()?.toLowerCase() || '') ? (
                                                    <img
                                                        src={URL.createObjectURL(previewFile)}
                                                        alt={previewFile.name}
                                                        className="max-w-full max-h-[60vh] object-contain animate-in fade-in zoom-in duration-500"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-6 py-20 opacity-50">
                                                        <IconFileArchive size={80} className="text-gray-500" />
                                                        <p className="text-gray-400 font-bold uppercase tracking-[0.2em]">Preview not available for this file type</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Modal>

                            {/* Price block has been moved to Step 5 */}

                            {currentStep === 9 && selectedMove === 'Add' && orderType === 'Direct Order' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {/* For Direct Order, Step 9 is now Items Sold */}
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">WHAT HAVE YOU SOLD?</p>
                                        {['Logo', 'Social Media Kit', 'Stationery Designs', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Radio
                                                    label={item}
                                                    variant="metallic"
                                                    checked={soldItems.includes(item)}
                                                    onChange={() => handleSoldItemSelect(item)}
                                                />
                                                {item === 'Other' && soldItems.includes('Other') && (
                                                    <Input
                                                        variant="metallic"
                                                        placeholder="Type here"
                                                        value={otherSoldText}
                                                        onChange={(e) => setOtherSoldText(e.target.value)}
                                                        size="lg"
                                                    />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 12 && (
                                <div className="space-y-6">
                                    {/* For Direct Order, Step 10 is Any Addons? */}
                                    <div className="space-y-4">
                                        {['Social Media Kit', 'Stationery Designs', 'None', 'Other'].map((item) => (
                                            <React.Fragment key={item}>
                                                <Checkbox
                                                    label={item}
                                                    variant="metallic"
                                                    checked={addons.includes(item)}
                                                    onChange={() => toggleAddon(item)}
                                                />
                                                {item === 'Other' && addons.includes('Other') && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Type here"
                                                            value={addonsOther}
                                                            onChange={(e) => setAddonsOther(e.target.value)}
                                                            size="lg"
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 13 && (
                                <div className="space-y-6">
                                    {/* For Direct Order, Step 11 is Deadline */}
                                    <div className="space-y-6">
                                        {/* Client Deadline Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-px flex-1 bg-white/10"></div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] whitespace-nowrap px-2">CLIENT DEADLINE</span>
                                                <div className="h-px flex-1 bg-white/10"></div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <DatePicker
                                                    variant="metallic"
                                                    placeholder="Select Date"
                                                    value={clientDueDate}
                                                    onChange={(date) => setClientDueDate(date)}
                                                    disabled={isReviewLoading}
                                                />
                                                <TimeSelect
                                                    variant="metallic"
                                                    placeholder="Select Time"
                                                    value={clientDueTime}
                                                    onChange={(val) => setClientDueTime(val)}
                                                    disabled={isReviewLoading}
                                                />
                                            </div>
                                        </div>

                                        {/* Assignee Deadline Section */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-px flex-1 bg-white/10"></div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] whitespace-nowrap px-2">ASSIGNEE DEADLINE</span>
                                                <div className="h-px flex-1 bg-white/10"></div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Shortcuts */}
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {[2, 6, 8, 12, 24].map((hours) => (
                                                        <Button
                                                            key={hours}
                                                            variant="recessed"
                                                            size="sm"
                                                            disabled={isReviewLoading}
                                                            onClick={() => handleDeadlineShortcut(hours)}
                                                            className={`!px-3 !py-1.5 !h-auto !text-[10px] font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${activeShortcut === hours
                                                                ? '!text-white !border-white/20 !bg-white/10'
                                                                : ''
                                                                }`}
                                                        >
                                                            {hours} Hrs
                                                        </Button>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <DatePicker
                                                        variant="metallic"
                                                        placeholder="Select Date"
                                                        value={dueDate}
                                                        onChange={(date) => {
                                                            setDueDate(date);
                                                            setActiveShortcut(null);
                                                        }}
                                                        disabled={isReviewLoading}
                                                    />
                                                    <TimeSelect
                                                        variant="metallic"
                                                        placeholder="Select Time"
                                                        value={dueTime}
                                                        onChange={(val) => {
                                                            setDueTime(val);
                                                            setActiveShortcut(null);
                                                        }}
                                                        disabled={isReviewLoading}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 14 && (
                                <div className="space-y-6">
                                    {/* For Direct Order, Step 12 is Assignee */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">ASSIGNEE</p>
                                            <Dropdown
                                                variant="metallic"
                                                placeholder="Select Assignee"
                                                options={teamMembers
                                                    .filter(m => {
                                                        const r = m.role?.trim().toLowerCase() || '';
                                                        return r.includes('freelancer') ||
                                                            r.includes('designer') ||
                                                            r.includes('presentation') ||
                                                            r.includes('team lead') ||
                                                            r.includes('team designer');
                                                    })
                                                    .sort((a, b) => {
                                                        const statA = freelancerWorkload[a.name || a.email] || { assigned: 0 };
                                                        const statB = freelancerWorkload[b.name || b.email] || { assigned: 0 };
                                                        const remA = (a.daily_capacity || 5) - statA.assigned;
                                                        const remB = (b.daily_capacity || 5) - statB.assigned;
                                                        return remB - remA;
                                                    })
                                                    .map(m => {
                                                        const name = m.name || m.email;
                                                        const stat = freelancerWorkload[name] || { assigned: 0, inProgress: 0 };
                                                        const capacity = m.daily_capacity || 5;
                                                        const usage = stat.assigned / capacity;

                                                        const descriptionClassName = usage >= 1.0
                                                            ? 'bg-brand-error/20 border-brand-error/30 text-brand-error'
                                                            : usage > 0.4
                                                                ? 'bg-brand-warning/20 border-brand-warning/30 text-brand-warning'
                                                                : 'bg-brand-success/20 border-brand-success/30 text-brand-success';

                                                        return {
                                                            label: name,
                                                            value: m.id,
                                                            description: `${stat.assigned} / ${capacity}`,
                                                            descriptionClassName
                                                        };
                                                    })
                                                }
                                                value={selectedAssigneeId || ''}
                                                onChange={(id) => {
                                                    const member = teamMembers.find(m => m.id === id);
                                                    setSelectedAssigneeId(id);
                                                    setSelectedAssignee(member?.name || member?.email || '');
                                                }}
                                                showSearch
                                                disabled={isReviewLoading}
                                            />
                                        </div>

                                        {linkedProjectData && (
                                            <div className="mt-4 p-4 bg-brand-warning/10 border border-brand-warning/20 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-black text-brand-warning uppercase tracking-widest">RECOMMENDATION</p>
                                                    <p className="text-[13px] font-bold text-gray-400 leading-relaxed">
                                                        This project is linked to <span className="text-white">{previousLogoNo}</span>, which was previously handled by <span className="text-brand-warning">{linkedProjectData.assignee || 'a designer'}</span>.
                                                        It is recommended to assign it to them for consistency.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {showReview && (
                        <div className="max-w-3xl mx-auto py-2 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                            <div className="space-y-10">
                                {selectedMove === 'Remove' && (
                                    <div className="space-y-12">
                                        {/* REMOVE BRANCH REVIEW */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Action & Context</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Removal Reason</label>
                                                    <div className="space-y-3">
                                                        {['Editing Required', 'Haram', 'Other'].map((item) => (
                                                            <React.Fragment key={item}>
                                                                <Radio
                                                                    variant="metallic"
                                                                    label={item}
                                                                    name="review-removal-reason"
                                                                    checked={removalReason === item}
                                                                    onChange={() => setRemovalReason(item)}
                                                                    className="text-[12px]"
                                                                />
                                                                {item === 'Other' && removalReason === 'Other' && (
                                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-4 border-l-2 border-brand-primary/20 pl-4">
                                                                        <Input
                                                                            variant="metallic"
                                                                            placeholder="Type reason here"
                                                                            value={removalOtherText}
                                                                            onChange={(e) => setRemovalOtherText(e.target.value)}
                                                                            size="lg"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Input
                                                    variant="metallic"
                                                    label="Project ID"
                                                    value={removeProjectId}
                                                    onChange={(e) => setRemoveProjectId(e.target.value)}
                                                    placeholder="eg ARS 123456"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedMove === 'Add' && (
                                    <div className="space-y-10">
                                        {/* GROUP 1 — MOVE & ORDER */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Move & Order</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Order Type"
                                                    options={[
                                                        { label: 'Inquiry', value: 'Inquiry' },
                                                        { label: 'Direct Order', value: 'Direct Order' }
                                                    ]}
                                                    value={orderType || ''}
                                                    onChange={setOrderType}
                                                />
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 2 — PRICE & ITEMS (Only for Direct) */}
                                        {orderType === 'Direct Order' && (
                                            <>
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Price & Items</h4>
                                                    <div className="space-y-8">
                                                        <Input
                                                            variant="metallic"
                                                            label="Budget / Price"
                                                            placeholder="eg 100"
                                                            value={price}
                                                            onChange={(e) => setPrice(e.target.value)}
                                                            leftIcon={<span className="text-gray-500">$</span>}
                                                        />

                                                        <div className="h-px bg-surface-border/20 w-full" />

                                                        <Input
                                                            variant="metallic"
                                                            label="Assignee Payout Override"
                                                            placeholder="Tiered (Auto)"
                                                            value={assigneeManualPrice}
                                                            onChange={(e) => setAssigneeManualPrice(e.target.value)}
                                                            leftIcon={<span className="text-gray-500">$</span>}
                                                            helperText="If empty, system will calculate automatically based on rules."
                                                        />

                                                        <div className="space-y-4">
                                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Items Sold</label>
                                                            <div className="flex flex-col gap-3">
                                                                {['Logo', 'Social Media Kit', 'Stationery Designs', 'Other'].map(item => (
                                                                    <Radio
                                                                        key={item}
                                                                        variant="metallic"
                                                                        label={item}
                                                                        checked={soldItems.includes(item)}
                                                                        onChange={() => handleSoldItemSelect(item)}
                                                                        className="text-[12px]"
                                                                    />
                                                                ))}
                                                            </div>
                                                            {soldItems.includes('Other') && (
                                                                <Input
                                                                    variant="metallic"
                                                                    placeholder="Specify other items..."
                                                                    value={otherSoldText}
                                                                    onChange={e => setOtherSoldText(e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-surface-border/30 w-full" />
                                            </>
                                        )}

                                        {/* GROUP 3 — PROJECT IDENTITY / LEAD INFO */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">{orderType === 'Inquiry' ? 'Lead Information' : 'Project Identity'}</h4>
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Client Type</label>
                                                    <div className="flex flex-col gap-3">
                                                        {[
                                                            { label: 'New Client', value: 'new' },
                                                            { label: 'Repeat Client', value: 'repeat' }
                                                        ].map(type => (
                                                            <Radio
                                                                key={type.value}
                                                                variant="metallic"
                                                                label={type.label}
                                                                name="client-type-review"
                                                                checked={clientType === type.value}
                                                                onChange={() => setClientType(type.value as 'new' | 'repeat')}
                                                                className="text-[12px]"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {orderType === 'Inquiry' && (
                                                    <div className="space-y-6">
                                                        <DatePicker
                                                            value={leadIntakeDate}
                                                            onChange={(date) => setLeadIntakeDate(date)}
                                                            label="Lead Intake Date"
                                                        >
                                                            <div className="w-full relative flex items-center justify-between h-14 px-5 bg-black/40 border border-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-pointer hover:bg-black/50 transition-all">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                                        <IconCalendar className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                                                                        {leadIntakeDate ? formatDeadlineDate(leadIntakeDate) : 'Intake Date'}
                                                                    </span>
                                                                </div>
                                                                <IconChevronRight className="w-5 h-5 text-gray-500" />
                                                            </div>
                                                        </DatePicker>
                                                        <Dropdown
                                                            variant="metallic"
                                                            label="Location"
                                                            options={COUNTRIES}
                                                            value={location}
                                                            onChange={(val) => setLocation(val)}
                                                            placeholder="Select country..."
                                                            showSearch
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Client Name</label>
                                                    {clientType === 'repeat' ? (
                                                        <Dropdown
                                                            variant="metallic"
                                                            options={repeatClients}
                                                            value={clientName}
                                                            onChange={setClientName}
                                                            placeholder="Search existing client..."
                                                            showSearch
                                                        />
                                                    ) : (
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="Enter name"
                                                            value={clientName}
                                                            onChange={(e) => setClientName(e.target.value)}
                                                        />
                                                    )}
                                                </div>

                                                {clientType === 'repeat' && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Previous Project ID</label>
                                                            <span className="text-[9px] font-bold text-gray-600 uppercase italic">Optional</span>
                                                        </div>
                                                        <Input
                                                            variant="metallic"
                                                            placeholder="eg ARS 123456"
                                                            value={previousLogoNo}
                                                            onChange={(e) => setPreviousLogoNo(e.target.value)}
                                                        />
                                                        {linkedProjectData && (
                                                            <div className="mt-2 px-3 py-1.5 rounded-lg bg-brand-warning/5 border border-brand-warning/10 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                                                <div className="w-1 h-1 rounded-full bg-brand-warning animate-pulse" />
                                                                <span className="text-[9px] font-black text-brand-warning uppercase tracking-wider">Linked to {linkedProjectData.assignee || 'Freelancer'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {orderType === 'Inquiry' && clientType === 'new' && (
                                                    <div className="space-y-6">
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Account</p>
                                                            <Dropdown
                                                                variant="metallic"
                                                                options={accountOptions}
                                                                value={selectedAccount || ''}
                                                                onChange={(id) => setSelectedAccount(id)}
                                                                showSearch
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {orderType === 'Inquiry' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Client Interest</label>
                                                        <div className="flex flex-col gap-3">
                                                            {['Logo', 'Social Media Kit', 'Stationery Designs', 'Other'].map(item => (
                                                                <Radio
                                                                    key={item}
                                                                    variant="metallic"
                                                                    label={item}
                                                                    checked={soldItems.includes(item)}
                                                                    onChange={() => handleSoldItemSelect(item)}
                                                                    className="text-[12px]"
                                                                />
                                                            ))}
                                                        </div>
                                                        {soldItems.includes('Other') && (
                                                            <Input
                                                                variant="metallic"
                                                                placeholder="Specify other interest..."
                                                                value={otherSoldText}
                                                                onChange={e => setOtherSoldText(e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        {/* GROUP 4 — PROJECT TITLE & ID (Only for Direct) */}
                                        {orderType === 'Direct Order' && (
                                            <>
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Project Details</h4>
                                                    <div className="space-y-8">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between px-1">
                                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Project ID</label>
                                                                {selectedAccount && (
                                                                    <span className="text-[9px] font-black text-brand-success uppercase tracking-widest bg-brand-success/5 px-2 py-0.5 rounded border border-brand-success/10">Account: {accountOptions.find(acc => acc.value === selectedAccount)?.label || selectedAccount}</span>
                                                                )}
                                                            </div>
                                                            <Input
                                                                variant="metallic"
                                                                placeholder="eg ARS 123456"
                                                                value={manualLogoNo}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toUpperCase();
                                                                    setManualLogoNo(val);
                                                                    const prefix = val.split(' ')[0];
                                                                    if (prefix && prefix.length >= 2) {
                                                                        const matchedAccount = accountOptions.find(acc => acc.description?.toUpperCase() === prefix.toUpperCase());
                                                                        if (matchedAccount) setSelectedAccount(matchedAccount.value);
                                                                    }
                                                                }}
                                                            />
                                                        </div>

                                                        <Input
                                                            variant="metallic"
                                                            label="Project Title"
                                                            placeholder="eg Modern Minimal Logo"
                                                            value={projectTitle}
                                                            onChange={(e) => setProjectTitle(e.target.value)}
                                                        />

                                                        <div className="space-y-4">
                                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Project Brief</label>
                                                            <Input
                                                                variant="metallic"
                                                                label="Options Required"
                                                                placeholder="How Many Options Required?"
                                                                type="number"
                                                                min={1}
                                                                max={20}
                                                                value={optionsRequired || ''}
                                                                onChange={(e) => setOptionsRequired(e.target.value)}
                                                            />
                                                            {projectBriefText.trim() ? (
                                                                <div className="p-6 bg-black/40 rounded-3xl border border-white/5 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)]">
                                                                    <ReactMarkdown components={markdownComponents} remarkPlugins={markdownPlugins}>
                                                                        {parseCodesLogicMarkdown(projectBriefText)}
                                                                    </ReactMarkdown>
                                                                </div>
                                                            ) : (
                                                                <p className="text-gray-500 italic text-sm">No brief provided.</p>
                                                            )}

                                                            {/* Attachments Preview in Review */}
                                                            {projectBriefFiles.length > 0 && (
                                                                <div className="space-y-3 mt-6">
                                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">References</label>
                                                                    <div className="flex flex-wrap gap-3">
                                                                        {projectBriefFiles.map((file, index) => {
                                                                            const extension = file.name.split('.').pop()?.toLowerCase();
                                                                            const getIcon = () => {
                                                                                let iconName = 'txt-icon.png';
                                                                                const ext = extension || '';
                                                                                if (['jpg', 'jpeg'].includes(ext)) iconName = 'jpg-icon.png';
                                                                                else if (ext === 'png') iconName = 'png-icon.png';
                                                                                else if (['doc', 'docx'].includes(ext)) iconName = 'doc-icon.png';
                                                                                else if (ext === 'pdf') iconName = 'pdf-icon.png';
                                                                                else if (ext === 'ai') iconName = 'ai-document.png';
                                                                                else if (ext === 'psd') iconName = 'psd-icon.png';
                                                                                else if (['zip', 'rar', '7z'].includes(ext)) iconName = 'zip-icon.png';
                                                                                else if (['mp4', 'mov', 'avi'].includes(ext)) iconName = 'avi-icon.png';
                                                                                else if (ext === 'gif') iconName = 'gif-icon.png';
                                                                                else if (['xls', 'xlsx', 'csv'].includes(ext)) iconName = 'xls-icon.png';
                                                                                else if (['ppt', 'pptx'].includes(ext)) iconName = 'ppt-icon.png';
                                                                                else if (ext === 'eps') iconName = 'eps-icon.png';
                                                                                return `/${iconName}`;
                                                                            };

                                                                            return (
                                                                                <div key={index} className="group relative">
                                                                                    <div className="w-12 h-12 rounded-xl border border-surface-border bg-surface-overlay flex items-center justify-center overflow-hidden transition-all duration-300 hover:border-brand-primary/30 shadow-lg">
                                                                                        <img src={getIcon()} alt={extension} className="w-7 h-7 object-contain" />
                                                                                    </div>
                                                                                    <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <button
                                                                                            onClick={() => setProjectBriefFiles(prev => prev.filter((_, i) => i !== index))}
                                                                                            className="bg-surface-card border border-surface-border text-gray-400 hover:text-brand-error p-0.5 rounded-full shadow-xl"
                                                                                        >
                                                                                            <IconX size={10} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-surface-border/30 w-full" />

                                                {/* GROUP 5 — TIMELINE & ADDONS */}
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Timeline & Addons</h4>

                                                    <div className="space-y-8">
                                                        {/* Shortcuts in Review section */}
                                                        <div className="flex flex-wrap gap-2">
                                                            {[2, 6, 8, 12, 24].map((hours) => (
                                                                <Button
                                                                    key={hours}
                                                                    variant="recessed"
                                                                    size="sm"
                                                                    onClick={() => handleDeadlineShortcut(hours)}
                                                                    className={`!px-3 !py-1.5 !h-auto !text-[10px] font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${activeShortcut === hours
                                                                        ? '!text-white !border-white/20 !bg-white/10'
                                                                        : ''
                                                                        }`}
                                                                >
                                                                    {hours} Hrs
                                                                </Button>
                                                            ))}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-6">
                                                            <DatePicker
                                                                label="Due Date"
                                                                variant="metallic"
                                                                value={dueDate}
                                                                onChange={(date) => setDueDate(date)}
                                                            />
                                                            <TimeSelect
                                                                label="Due Time"
                                                                variant="metallic"
                                                                placeholder="Select time"
                                                                value={dueTime}
                                                                onChange={setDueTime}
                                                            />
                                                        </div>

                                                        <div className="space-y-4">
                                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Addons</label>
                                                            <div className="flex flex-col gap-3">
                                                                {['Social Media Kit', 'Stationery Designs', 'None', 'Other'].map(item => (
                                                                    <Checkbox
                                                                        key={item}
                                                                        label={item}
                                                                        variant="metallic"
                                                                        checked={addons.includes(item)}
                                                                        onChange={() => toggleAddon(item)}
                                                                    />
                                                                ))}
                                                            </div>
                                                            {addons.includes('Other') && (
                                                                <Input
                                                                    variant="metallic"
                                                                    placeholder="Specify other addons..."
                                                                    value={addonsOther}
                                                                    onChange={e => setAddonsOther(e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="h-px bg-surface-border/30 w-full" />

                                                {/* GROUP 6 — ASSIGNEE */}
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Assignee</h4>
                                                    <Dropdown
                                                        variant="metallic"
                                                        label="Assignee"
                                                        options={teamMembers
                                                            .filter(m => {
                                                                const r = m.role?.trim().toLowerCase() || '';
                                                                return r.includes('freelancer') || r.includes('designer') || r.includes('team lead');
                                                            })
                                                            .sort((a, b) => {
                                                                const statA = freelancerWorkload[a.name || a.email] || { assigned: 0 };
                                                                const statB = freelancerWorkload[b.name || b.email] || { assigned: 0 };
                                                                const remA = (a.daily_capacity || 5) - statA.assigned;
                                                                const remB = (b.daily_capacity || 5) - statB.assigned;
                                                                return remB - remA;
                                                            })
                                                            .map(m => {
                                                                const name = m.name || m.email;
                                                                const stat = freelancerWorkload[name] || { assigned: 0, inProgress: 0 };
                                                                const capacity = m.daily_capacity || 5;
                                                                const usage = stat.assigned / capacity;

                                                                const descriptionClassName = usage >= 1.0
                                                                    ? 'bg-brand-error/20 border-brand-error/30 text-brand-error'
                                                                    : usage > 0.4
                                                                        ? 'bg-brand-warning/20 border-brand-warning/30 text-brand-warning'
                                                                        : 'bg-brand-success/20 border-brand-success/30 text-brand-success';

                                                                return {
                                                                    label: name,
                                                                    value: m.id,
                                                                    description: `${stat.assigned} / ${capacity}`,
                                                                    descriptionClassName
                                                                };
                                                            })
                                                        }
                                                        value={selectedAssigneeId || ''}
                                                        onChange={(id) => {
                                                            const m = teamMembers.find(member => member.id === id);
                                                            setSelectedAssigneeId(id);
                                                            setSelectedAssignee(m?.name || m?.email || '');
                                                        }}
                                                        showSearch
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {selectedMove === 'Cancel' && (
                                    <div className="space-y-10">
                                        {/* CANCEL BRANCH REVIEW */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Action & Context</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <div className="bg-white/[0.03] border border-surface-border rounded-2xl p-6 text-center">
                                                    <p className="text-gray-400 text-sm leading-relaxed">
                                                        You are confirming a <span className="text-white font-bold">{selectedMove}</span> action.
                                                        Please review the selection below before submitting.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Cancellation Reason</h4>
                                            <div className="space-y-3">
                                                {['Client Was Unclear', 'Designs Were Not Good Enough', 'Client Not Satisfied', 'Other'].map((item) => (
                                                    <React.Fragment key={item}>
                                                        <Radio
                                                            variant="metallic"
                                                            label={item}
                                                            name="review-cancellation-reason"
                                                            checked={cancellationReason === item}
                                                            onChange={() => setCancellationReason(item)}
                                                            className="text-[12px]"
                                                        />
                                                        {item === 'Other' && cancellationReason === 'Other' && (
                                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 ml-4 border-l-2 border-brand-primary/20 pl-4">
                                                                <Input
                                                                    variant="metallic"
                                                                    placeholder="Type reason here"
                                                                    value={cancellationOtherText}
                                                                    onChange={(e) => setCancellationOtherText(e.target.value)}
                                                                    size="lg"
                                                                />
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Details</h4>
                                            <div className="space-y-6">
                                                <Input
                                                    variant="metallic"
                                                    label="Project ID"
                                                    value={cancelProjectId}
                                                    onChange={(e) => setCancelProjectId(e.target.value)}
                                                    placeholder="eg ARS 123456"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {selectedMove === 'Approve' && (
                                    <div className="space-y-10">
                                        {/* APPROVE BRANCH REVIEW */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Action & Context</h4>
                                            <div className="space-y-6">
                                                <Dropdown
                                                    variant="metallic"
                                                    label="Action Move"
                                                    options={[
                                                        { label: 'Add', value: 'Add' },
                                                        { label: 'Remove', value: 'Remove' },
                                                        { label: 'Cancel', value: 'Cancel' },
                                                        { label: 'Approve', value: 'Approve' }
                                                    ]}
                                                    value={selectedMove || ''}
                                                    onChange={setSelectedMove}
                                                />
                                                <div className="bg-white/[0.03] border border-surface-border rounded-2xl p-6 text-center">
                                                    <p className="text-gray-400 text-sm leading-relaxed">
                                                        You are confirming an <span className="text-white font-bold">{selectedMove}</span> action.
                                                        Please review the selection below before submitting.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-surface-border/30 w-full" />

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] px-1">Approval Details</h4>
                                            <div className="space-y-6">
                                                <div className="bg-brand-success/5 border border-brand-success/10 rounded-2xl p-6 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-brand-success/10 flex items-center justify-center text-brand-success">
                                                        <IconCalendar className="w-6 h-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-brand-success uppercase tracking-widest">Selected Approval Date</p>
                                                        <p className="text-sm font-bold text-white uppercase tracking-wider">{approveDate ? formatDeadlineDate(approveDate) : 'Not Selected'}</p>
                                                    </div>
                                                </div>

                                                <div className="h-px bg-surface-border/20 w-full" />

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Tips Added?</label>
                                                    <div className="flex flex-col gap-3">
                                                        {['Yes', 'No'].map(val => (
                                                            <Radio
                                                                key={val}
                                                                variant="metallic"
                                                                label={val}
                                                                name="review-approve-tips"
                                                                checked={approveTips === val}
                                                                onChange={() => setApproveTips(val as 'Yes' | 'No')}
                                                                className="text-[12px]"
                                                            />
                                                        ))}
                                                    </div>
                                                    {approveTips === 'Yes' && (
                                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <Input
                                                                variant="metallic"
                                                                label="Tip Amount"
                                                                placeholder="eg 20"
                                                                value={approveAmount}
                                                                onChange={(e) => setApproveAmount(e.target.value)}
                                                                leftIcon={<span className="text-gray-500">$</span>}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <Input
                                                    variant="metallic"
                                                    label="Project ID"
                                                    value={approveProjectId}
                                                    onChange={(e) => setApproveProjectId(e.target.value)}
                                                    placeholder="eg ARS 123456"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={isBriefExpanded}
                onClose={() => setIsBriefExpanded(false)}
                title="Project Brief"
                size="lg"
                footer={(
                    <div className="flex justify-end">
                        <Button variant="metallic" onClick={() => setIsBriefExpanded(false)}>
                            Done
                        </Button>
                    </div>
                )}
            >
                <div className="flex flex-col">
                    <div className="flex justify-start mb-6 shrink-0">
                        <Tabs
                            tabs={[
                                { id: 'edit', label: 'Edit' },
                                { id: 'preview', label: 'Preview' }
                            ]}
                            activeTab={briefMode}
                            onTabChange={(id) => setBriefMode(id as 'edit' | 'preview')}
                        />
                    </div>

                    <div className="select-text pb-8">
                        {briefMode === 'edit' ? (
                            <TextArea
                                variant="metallic"
                                placeholder="Type here"
                                value={projectBriefText}
                                onChange={(e) => setProjectBriefText(e.target.value)}
                                className="w-full"
                                inputClassName="!min-h-[400px]"
                                autoFocus
                            />
                        ) : (
                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)] min-h-[400px]">
                                {projectBriefText.trim() ? (
                                    <ReactMarkdown components={markdownComponents} remarkPlugins={markdownPlugins}>
                                        {parseCodesLogicMarkdown(projectBriefText)}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-gray-500 italic text-sm">Nothing to preview. Start typing...</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Assign Project Modal - Team Lead Only */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setAssignStep(1);
                    setAssignProjectId('');
                    setAssignDesignerId(null);
                    setAssignDueDate(null);
                    setAssignDueTime('');
                }}
                closeOnOutsideClick={false}
                title={
                    assignStep === 1 ? 'Project ID'
                        : assignStep === 2 ? 'Select Assignee'
                            : 'Set Deadline'
                }
                size="sm"
                isElevatedFooter
                footer={(
                    <div className="flex items-center justify-end w-full">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="recessed"
                                onClick={() => {
                                    if (assignStep === 1) {
                                        setIsAssignModalOpen(false);
                                        setAssignProjectId('');
                                        setAssignDesignerId(null);
                                        setAssignDueDate(null);
                                        setAssignDueTime('');
                                    } else {
                                        setAssignStep(s => s - 1);
                                    }
                                }}
                            >
                                {assignStep === 1 ? 'Cancel' : 'Back'}
                            </Button>

                            {assignStep < 3 ? (
                                <Button
                                    variant="metallic"
                                    disabled={
                                        (assignStep === 1 && !assignProjectId.match(/^[A-Z]{2,4}\s\d{6}$/))
                                        || (assignStep === 2 && !assignDesignerId)
                                        || assignIsSubmitting
                                    }
                                    isLoading={assignStep === 1 && assignIsSubmitting}
                                    onClick={async () => {
                                        if (assignStep === 1) {
                                            setAssignIsSubmitting(true);
                                            try {
                                                const { data, error } = await supabase
                                                    .from('projects')
                                                    .select('due_date, due_time')
                                                    .eq('project_id', assignProjectId)
                                                    .single();

                                                if (error) throw error;

                                                if (data) {
                                                    setAssignTlDeadline(data.due_date ? new Date(data.due_date) : null);
                                                    setAssignTlTime(data.due_time || '17:00');
                                                    setAssignStep(2);
                                                }
                                            } catch (err: any) {
                                                addToast({ title: 'Error', message: 'Project ID not found or error fetching data.', type: 'error' });
                                            } finally {
                                                setAssignIsSubmitting(false);
                                            }
                                        } else {
                                            setAssignStep(s => s + 1);
                                        }
                                    }}
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    variant="metallic"
                                    disabled={
                                        !assignDueDate ||
                                        !assignDueTime ||
                                        assignIsSubmitting
                                    }
                                    isLoading={assignIsSubmitting}
                                    onClick={async () => {
                                        if (!assignDueDate || !assignDesignerId || !assignProjectId) return;
                                        setAssignIsSubmitting(true);
                                        try {
                                            const selectedDesigner = teamLeadDesigners.find(d => d.id === assignDesignerId);

                                            // 1. Fetch current project's designer_fee or price to calculate slab share
                                            const { data: existingProject } = await supabase
                                                .from('projects')
                                                .select('designer_fee, price')
                                                .eq('project_id', assignProjectId)
                                                .single();

                                            let teamDesignerFee = 0;
                                            // Robust numeric cleaner
                                            const cleanAmount = (val: any) => {
                                                if (val === null || val === undefined) return 0;
                                                const numericStr = String(val).replace(/[^0-9.]/g, '');
                                                return parseFloat(numericStr) || 0;
                                            };

                                            const designerFee = cleanAmount(existingProject?.designer_fee);
                                            const projectPrice = cleanAmount(existingProject?.price);
                                            // AS PER USER: Base matching on Lead's Cut (designer_fee)
                                            const feeBase = designerFee > 0 ? designerFee : projectPrice;

                                            if (feeBase > 0 && teamSlabs.length > 0) {
                                                const slab = teamSlabs.find(s => {
                                                    const min = cleanAmount(s.min_price);
                                                    const max = cleanAmount(s.max_price) || 999999;
                                                    return feeBase >= min && feeBase <= max;
                                                });

                                                if (slab) {
                                                    const pct = cleanAmount(slab.percentage);
                                                    // NO Math.round -> allow decimals (e.g. 2.5)
                                                    teamDesignerFee = Number((feeBase * (pct / 100)).toFixed(2));
                                                }
                                            }

                                            const d = assignDueDate;
                                            const yyyy = d.getFullYear();
                                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                                            const dd = String(d.getDate()).padStart(2, '0');
                                            const formattedDate = `${yyyy}-${mm}-${dd}`;

                                            const { error } = await supabase
                                                .from('projects')
                                                .update({
                                                    team_designer_id: assignDesignerId,
                                                    team_designer_fee: teamDesignerFee,
                                                    due_date: formattedDate,
                                                    due_time: assignDueTime || '17:00',
                                                    updated_at: new Date().toISOString()
                                                })
                                                .eq('project_id', assignProjectId);

                                            if (error) {
                                                console.error('--- ASSIGNMENT FAILED ---', error);
                                                alert(`ASSIGNMENT FAILED: ${error.message} (Is it an RLS permission issue?)`);
                                                throw error;
                                            }

                                            addToast({ title: 'Project Assigned', message: `Project ${assignProjectId} assigned to ${selectedDesigner?.name}.`, type: 'success' });
                                            setIsAssignModalOpen(false);
                                            setAssignStep(1);
                                            setAssignProjectId('');
                                            setAssignDesignerId(null);
                                            setAssignDueDate(null);
                                            setAssignDueTime('');
                                            fetchProjects();
                                        } catch (err: any) {
                                            addToast({ title: 'Assignment Failed', message: err.message, type: 'error' });
                                        } finally {
                                            setAssignIsSubmitting(false);
                                        }
                                    }}
                                >
                                    Assign
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            >
                <div className="space-y-4">
                    {/* Step 1: Project ID */}
                    {assignStep === 1 && (
                        <div className="space-y-4">
                            <Input
                                variant="metallic"
                                size="md"
                                label="Project ID"
                                placeholder="e.g. ARS 123456"
                                value={assignProjectId}
                                onChange={(e) => setAssignProjectId(e.target.value.toUpperCase())}
                                autoFocus
                            />
                            {assignProjectId.length > 3 && !assignProjectId.match(/^[A-Z]{2,4}\s\d{6}$/) && (
                                <p className="text-xs text-brand-error font-medium">
                                    Format: 2–4 uppercase letters, space, 6 digits (e.g. ARS 123456)
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 2: Select Assignee */}
                    {assignStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">Select the designer from your team to assign this project to.</p>
                            {teamLeadDesigners.length > 0 ? (
                                <Dropdown
                                    options={teamLeadDesigners
                                        .sort((a, b) => {
                                            const statA = freelancerWorkload[a.name || a.email] || { assigned: 0 };
                                            const statB = freelancerWorkload[b.name || b.email] || { assigned: 0 };
                                            const remA = (a.daily_capacity || 5) - statA.assigned;
                                            const remB = (b.daily_capacity || 5) - statB.assigned;
                                            return remB - remA;
                                        })
                                        .map(d => {
                                            const name = d.name || d.email;
                                            const stat = freelancerWorkload[name] || { assigned: 0, inProgress: 0 };
                                            const capacity = d.daily_capacity || 5;
                                            const usage = stat.assigned / capacity;

                                            const descriptionClassName = usage >= 1.0
                                                ? 'bg-brand-error/20 border-brand-error/30 text-brand-error'
                                                : usage > 0.4
                                                    ? 'bg-brand-warning/20 border-brand-warning/30 text-brand-warning'
                                                    : 'bg-brand-success/20 border-brand-success/30 text-brand-success';

                                            return {
                                                label: formatDisplayName(d.name),
                                                value: d.id,
                                                description: `${stat.assigned} / ${capacity}`,
                                                descriptionClassName
                                            };
                                        })
                                    }
                                    value={assignDesignerId || ''}
                                    onChange={(val) => setAssignDesignerId(val as string)}
                                    placeholder="Select Designer"
                                    variant="metallic"
                                    size="md"
                                    showSearch
                                />
                            ) : (
                                <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.05] text-center">
                                    <p className="text-sm text-gray-500 italic">No designers assigned to your team yet.</p>
                                    <p className="text-xs text-gray-600 mt-1">Ask your Super Admin to assign designers to your Design Team.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Set Deadline */}
                    {assignStep === 3 && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-400">Set the deadline for this project.</p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Date</p>
                                    <DatePicker
                                        variant="metallic"
                                        placeholder="Select Date"
                                        value={assignDueDate}
                                        onChange={(date) => setAssignDueDate(date)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Time</p>
                                    <TimeSelect
                                        value={assignDueTime}
                                        onChange={(t) => setAssignDueTime(t)}
                                        variant="metallic"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Shortcuts */}
                            <div className="space-y-3 pt-2">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">Available Shortcuts</p>
                                <div className="flex flex-wrap gap-2">
                                    {[1, 2, 4, 8, 12].map((hours) => {
                                        const now = new Date();
                                        const shortcutDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

                                        return (
                                            <button
                                                key={hours}
                                                onClick={() => {
                                                    setAssignDueDate(shortcutDate);
                                                    const hh = String(shortcutDate.getHours()).padStart(2, '0');
                                                    const mm = String(shortcutDate.getMinutes()).padStart(2, '0');
                                                    setAssignDueTime(`${hh}:${mm}`);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all duration-300
                                                    ${assignDueDate &&
                                                        new Date(assignDueDate.getTime() - (assignDueDate.getMinutes() * 60000)).getTime() === new Date(shortcutDate.getTime() - (shortcutDate.getMinutes() * 60000)).getTime()
                                                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.2)]'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-white'}`}
                                            >
                                                {hours} Hours
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => {
                    setIsDeleteConfirmOpen(false);
                    setLeadToDelete(null);
                }}
                title="Remove Lead"
                size="sm"
                isElevatedFooter
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="recessed"
                            className="w-28 font-bold"
                            onClick={() => {
                                setIsDeleteConfirmOpen(false);
                                setLeadToDelete(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="metallic-error"
                            className="px-8 font-bold !bg-gradient-to-b !from-[#ef4444] !via-[#dc2626] !to-[#991b1b] !border-[#7f1d1d] !shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1.5px_0_rgba(0,0,0,0.3)]"
                            onClick={handleDeleteLead}
                            isLoading={isSubmitting}
                        >
                            Confirm Removal
                        </Button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-brand-error/10 flex items-center justify-center text-brand-error mb-4">
                        <IconTrash size={32} />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">Are you sure?</h3>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-[240px]">
                        This action will permanently delete <span className="text-white font-bold">{leadToDelete?.client_name}</span>'s lead from the system.
                    </p>
                </div>
            </Modal>

            <LabelManagerModal
                isOpen={isLabelModalOpen}
                onClose={() => {
                    setIsLabelModalOpen(false);
                    setTaggingProjectId(null);
                }}
                targetId={taggingProjectId || undefined}
                onLabelsChange={() => fetchProjects()}
                type="project"
            />
        </div >
    );
}
const Projects = forwardRef(ProjectsComponent);

export default Projects;
