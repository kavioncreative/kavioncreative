
import { DashboardView } from '../layouts/DashboardLayout';

const VIEW_MAP: Record<string, DashboardView> = {
    'dashboard': 'Dashboard',
    'tasks': 'Tasks',
    'projects': 'Projects',
    'analytics': 'Analytics',
    'leads': 'Leads',
    'finances': 'Finances',
    'earnings': 'Earnings',
    'accounts': 'Accounts',
    'assets': 'Assets',
    'chats': 'Chats',
    'users': 'Users',
    'workload': 'Workload',
    'tickets': 'Tickets',
    'channels': 'Channels',
    'forms': 'Forms',
    'integrations': 'Integrations',
    'settings': 'Settings',
    'reminders': 'Reminders',
    'profile': 'Profile',
    'user-details-v2': 'UserDetailsV2',
    'algorithm-studio': 'AlgorithmStudio',
    'applicants': 'Applicants',
    'team-slabs': 'TeamSlabs',
    'team-earnings': 'TeamEarnings',
    'team-designer-stats': 'TeamDesignerEarnings',
    'guide': 'Guide',
    'guide-add-project': 'GuideAddProject',
    'guide-remove-project': 'GuideRemoveProject',
    'guide-mark-cancelled': 'GuideMarkCancelled',
    'guide-mark-approved': 'GuideMarkApproved',
    'guide-trigger-dispute': 'GuideTriggerDispute',
    'guide-trigger-art-help': 'GuideTriggerArtHelp',
    'guide-post-comments': 'GuidePostComments',
    'guide-send-files': 'GuideSendFiles',
    'activity-logs': 'ActivityLogs',
    'training': 'Training',
    'my-notes': 'MyNotes',
    'notifications': 'Notifications',
};

export const PATH_MAP: Record<DashboardView, string> = Object.entries(VIEW_MAP).reduce((acc, [path, view]) => {
    acc[view] = path;
    return acc;
}, {} as Record<DashboardView, string>);

export const getInitialView = (): { view: DashboardView; projectId: string | null; userId: string | null; leadId: string | null } => {
    const segments = window.location.pathname.substring(1).split('/');
    const firstSegment = segments[0]?.toLowerCase();

    if (firstSegment && VIEW_MAP[firstSegment]) {
        const view = VIEW_MAP[firstSegment];
        const secondSegment = segments[1];

        if (secondSegment) {
            // Handle Projects detail
            const projectTabs = [
                'progress', 'revision', 'revision-urgent', 'urgent', 'approval',
                'cancelled', 'all', 'done', 'revision-done', 'revision-urgent-done',
                'urgent-done', 'approved', 'completed', 'disputes', 'trash'
            ];
            if (view === 'Projects' && !projectTabs.includes(secondSegment.toLowerCase())) {
                const decodedProjectId = decodeURIComponent(secondSegment);
                return { view: 'Projects', projectId: decodedProjectId, userId: null };
            }

            // Handle Users detail
            if (view === 'Users' && !['users', 'teams', 'shifts', 'performance'].includes(secondSegment.toLowerCase())) {
                return { view: 'Users', projectId: null, userId: decodeURIComponent(secondSegment), leadId: null };
            }

            // Handle Leads detail
            const leadTabs = [
                'new', 'active', 'offer-sent', 'converted', 'project-completed',
                'upsell-sent', 'interested', 'upsell-won', 'not-interested', 'lost', 'all'
            ];
            if (view === 'Leads' && !leadTabs.includes(secondSegment.toLowerCase())) {
                return { view: 'Leads', projectId: null, userId: null, leadId: decodeURIComponent(secondSegment) };
            }
        }

        return { view, projectId: null, userId: null, leadId: null };
    }

    const saved = localStorage.getItem('lastDashboardView') as DashboardView;
    if (saved && Object.values(VIEW_MAP).includes(saved)) {
        return { view: saved, projectId: null, userId: null, leadId: null };
    }

    return { view: 'Dashboard', projectId: null, userId: null, leadId: null };
};

export const getInitialTab = (view: string, defaultTab: string): string => {
    const segments = window.location.pathname.substring(1).split('/');
    const firstSegment = segments[0]?.toLowerCase();
    const normalizedView = (VIEW_MAP[view.toLowerCase()] || (view as DashboardView)) as DashboardView;
    const pathKey = PATH_MAP[normalizedView];

    const allowedTabs: Record<string, string[]> = {
        'Analytics': ['pipeline', 'secured', 'cancelled'],
        'Settings': ['profile', 'page-access', 'account-access'],
        'Projects': [
            'progress', 'revision', 'revision-urgent', 'urgent', 'approval',
            'cancelled', 'all', 'done', 'revision-done', 'revision-urgent-done',
            'urgent-done', 'approved', 'disputes', 'trash'
        ],
        'Users': ['users', 'teams', 'shifts', 'performance']
    };

    if (firstSegment === pathKey) {
        const secondSegment = segments[1]?.toLowerCase();
        if (secondSegment && allowedTabs[normalizedView]?.includes(secondSegment)) {
            return secondSegment;
        }

        // Always favor the defaultTab (e.g. 'all') at the view root (/projects)
        if (!secondSegment || secondSegment === '') {
            return defaultTab;
        }
    }

    const saved = localStorage.getItem(`lastTab_${view}`);
    if (saved && allowedTabs[normalizedView]?.includes(saved)) {
        return saved;
    }

    return defaultTab;
};

export const updateRoute = (view: DashboardView, tab?: string, projectId?: string | null, userId?: string | null, leadId?: string | null) => {
    const viewPath = PATH_MAP[view];
    let newPath = `/${viewPath}`;

    if (view === 'Projects' && projectId) {
        newPath += `/${encodeURIComponent(projectId.replace(/\s+/g, '-'))}`;
    } else if (view === 'Users' && userId) {
        newPath += `/${encodeURIComponent(userId)}`;
    } else if (view === 'Leads' && leadId) {
        newPath += `/${encodeURIComponent(leadId)}`;
    } else if (tab) {
        newPath += `/${tab.toLowerCase()}`;
    }

    if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
    }

    localStorage.setItem('lastDashboardView', view);

    // When navigating to a view root (no tab, no project, no user, no lead),
    // clear any stored tab so it doesn't override the default on next mount.
    if (!tab && !projectId && !userId && !leadId) {
        localStorage.removeItem(`lastTab_${view}`);
    }

    const allowedTabs: Record<string, string[]> = {
        'Analytics': ['pipeline', 'secured', 'cancelled'],
        'Settings': ['profile', 'page-access', 'account-access'],
        'Projects': [
            'progress', 'revision', 'revision-urgent', 'urgent', 'approval',
            'cancelled', 'all', 'done', 'revision-done', 'revision-urgent-done',
            'urgent-done', 'approved'
        ],
        'Users': ['users', 'teams', 'shifts', 'performance']
    };

    if (tab && !projectId && !userId && !leadId) {
        const normalizedView = VIEW_MAP[view] || (view as DashboardView);
        if (allowedTabs[normalizedView]?.includes(tab.toLowerCase())) {
            localStorage.setItem(`lastTab_${view}`, tab.toLowerCase());
        }
    }
};

export const navigateToProjectDetails = (projectId: string) => {
    const newPath = `/projects/${encodeURIComponent(projectId)}`;
    window.history.pushState(null, '', newPath);
    // Explicitly returning navigation intent
    return { view: 'Projects' as DashboardView, projectId };
};
