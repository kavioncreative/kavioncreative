import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import {
  IconLayout,
  IconCreditCard,
  IconCloudUpload,
  IconUser,
  IconUsers,
  IconFilter,
  IconRefreshCw,
  IconSettings,
  IconLogout,
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconMessageSquare,
  IconLink,
  IconBriefcase,
  IconLayoutSidebar,
  IconBuilding,
  IconBox,
  IconDollar,
  IconChartLine,
  IconFileText,
  IconClock,
  IconShield,
  IconAlertTriangle,
  IconAlertCircle,
  IconInfo,
  IconSearch,
  IconCpu,
  IconActivity,
  IconMenu,
  IconX,
  IconApplicant,
  IconFolder,
  IconTicket,
  IconFunnel,
  IconHistory,
  IconFileVideo
} from '../components/Icons';
import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabase';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { Card, Modal } from '../components/Surfaces';
import Button from '../components/Button';
import { addToast } from '../components/Toast';

import { useUser } from '../contexts/UserContext';
import { formatDisplayName } from '../utils/formatter';
import { PerformanceForm } from '../components/PerformanceForm';
import { Dropdown } from '../components/Dropdown';
import { updateRoute } from '../utils/routing';

export type DashboardView = 'Dashboard' | 'Tasks' | 'Analytics' | 'Leads' | 'Projects' | 'Finances' | 'Earnings' | 'Accounts' | 'ActivityLogs' | 'Assets' | 'Chats' | 'Users' | 'Team' | 'Workload' | 'Tickets' | 'Channels' | 'Forms' | 'Integrations' | 'Settings' | 'Reminders' | 'Profile' | 'UserDetailsV2' | 'AlgorithmStudio' | 'LevelsGuide' | 'Applicants' | 'TeamSlabs' | 'TeamEarnings' | 'TeamDesignerEarnings' | 'Training' | 'MyNotes' | 'Notifications' | 'Guide' | 'GuideAddProject' | 'GuideRemoveProject' | 'GuideMarkCancelled' | 'GuideMarkApproved' | 'GuideTriggerDispute' | 'GuideTriggerArtHelp' | 'GuidePostComments' | 'GuideSendFiles' | 'GuideVideoIntro' | 'GuideSystemWorks' | 'GuideWorkflowSummary' | 'GuidePaymentOverview' | 'GuideJoinDesigner';

export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  onSignOut?: () => void;
  activeItem: DashboardView;
  onItemSelect: (item: DashboardView) => void;
  onProjectOpen?: (projectId: string) => void;
  noPadding?: boolean;
}> = ({ children, onSignOut, activeItem, onItemSelect, onProjectOpen, noPadding }) => {
  const isGuideMode = activeItem.startsWith('Guide');
  const [isExpandedState, setIsExpandedState] = useState(false);
  const isExpanded = isGuideMode || isExpandedState;
  const setIsExpanded = setIsExpandedState;
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { notifications, fetchNotifications } = useNotifications();
  const { profile, loading: profileLoading, permissionsLoaded, simulatedRole, setSimulatedRole, effectiveRole, hasPermission } = useUser();
  const [availableEarnings, setAvailableEarnings] = useState<number | null>(null);
  const [showEarningsHeader, setShowEarningsHeader] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeParts = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).split(' ');

  const timeDisplay = timeParts[0];
  const amPm = timeParts[1];
  
  const dateDisplay = currentTime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const isFreelancer = (effectiveRole?.toLowerCase() === 'freelancer' || 
                        effectiveRole?.toLowerCase() === 'team lead' || 
                        effectiveRole?.toLowerCase() === 'team designer');

  // Initialize showEarningsHeader once profile is available
  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`nova_show_earnings_${profile.id}`);
      setShowEarningsHeader(saved === null ? true : saved === 'true');
    }
  }, [profile?.id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (profile?.id) {
        const saved = localStorage.getItem(`nova_show_earnings_${profile?.id}`);
        setShowEarningsHeader(saved === null ? true : saved === 'true');
      }
    };

    window.addEventListener('nova_earnings_visibility_updated', handleVisibilityChange);
    return () => window.removeEventListener('nova_earnings_visibility_updated', handleVisibilityChange);
  }, [profile?.id]);

  useEffect(() => {
    if (isFreelancer && profile) {
      const fetchAvailableEarnings = async () => {
        try {
          const freelancerName = profile.name || profile.email;
          const { data, error } = await supabase
            .from('projects')
            .select('designer_fee, team_payout, team_designer_fee, team_designer_id, assignee_id, assignee, clearance_start_date, clearance_days, funds_status')
            .or(`assignee_id.eq.${profile.id},team_designer_id.eq.${profile.id},assignee.eq."${freelancerName}",assignee.eq."${profile.email}"`)
            .eq('status', 'Approved');

          if (!error && data) {
            const total = data.reduce((sum, p) => {
              let actualStatus = p.funds_status;
              if (p.funds_status === 'Pending' && p.clearance_start_date && p.clearance_days) {
                const startDate = new Date(p.clearance_start_date);
                const now = new Date();
                const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysPassed >= p.clearance_days) {
                  actualStatus = 'Cleared';
                }
              }

              if (actualStatus === 'Cleared') {
                let pNet = 0;
                const platformPayout = Number(p.designer_fee) || 0;
                const subDesignerCost = Number(p.team_designer_fee) || Number(p.team_payout) || 0;

                if (p.team_designer_id === profile.id) {
                  pNet = subDesignerCost;
                } else if (p.assignee_id === profile.id || p.assignee === freelancerName || p.assignee === profile.email) {
                  pNet = platformPayout - subDesignerCost;
                }
                return sum + pNet;
              }
              return sum;
            }, 0);
            setAvailableEarnings(total);
          }
        } catch (err) {
          console.error('Error fetching available earnings for header:', err);
        }
      };

      fetchAvailableEarnings();
      const interval = setInterval(fetchAvailableEarnings, 300000); // 5 minute refresh
      return () => clearInterval(interval);
    }
  }, [profile]);

  const [activeFormPopup, setActiveFormPopup] = useState<{ id: string, assignmentId: string } | null>(null);
  const [pendingForms, setPendingForms] = useState<{ id: string, assignmentId: string, form_id: string, snoozed_until?: string }[]>([]);
  const [countdownText, setCountdownText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const checkForAssignedForms = async () => {
    if (!profile?.id) return;

    try {
      const now = new Date();
      // Ensure HH:mm format for current time
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentH}:${currentM}`;
      
      // Robust YYYY-MM-DD in local time
      const todayStr = now.getFullYear() + '-' + 
                      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(now.getDate()).padStart(2, '0');

      console.log(`[Forms Debug] Checking at ${currentTimeStr} (${todayStr}) for User: ${profile.id}`);

      const { data: assignments, error: asgError } = await supabase
        .from('form_assignments')
        .select('*')
        .eq('user_id', profile.id);

      if (asgError) {
        console.error('[Forms Debug] DB Error fetching assignments:', asgError);
        return;
      }

      console.log(`[Forms Debug] Found ${(assignments || []).length} assignments in DB`);

      const pending = [];
      let formToTrigger = null;

      for (const asg of (assignments || [])) {
        // Log all raw values for each assignment to help identify format mismatches
        console.log(`[Forms Debug] Checking ASG: ID[${asg.id}] Trigger[${asg.trigger_time}]`);

        // Removing specific column filters to see what the table ACTUALLY has
        const { data: logs, error: logError } = await supabase
          .from('form_logs')
          .select('*')
          .eq('assignment_id', asg.id);

        if (logError) {
          console.error(`[Forms Debug] ❌ Query failed for assignment ${asg.id}:`, logError.message);
          continue;
        }

        if (logs && logs.length > 0) {
          console.log(`[Forms Debug] Found keys in form_logs: ${Object.keys(logs[0]).join(', ')}`);
        }

        // Using a more generic date check once we know the column name
        const isCompletedToday = logs && logs.some(l => {
          // Fallback to whatever timestamp column we find
          const ts = l.created_at || l.timestamp || l.created_on || l.date;
          return ts && String(ts).startsWith(todayStr);
        });
        
        if (!isCompletedToday) {
          pending.push({
            id: asg.form_id,
            assignmentId: asg.id,
            form_id: asg.form_id,
            snoozed_until: asg.snoozed_until
          });

          const isSnoozed = asg.snoozed_until && new Date(asg.snoozed_until) > now;
          
          // Normalize trigger time: handle formats like "9:20", "09:20", "09:20:00"
          let rawTrigger = asg.trigger_time || "09:00";
          let [h, m] = rawTrigger.split(':');
          const triggerTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
          
          const isPastTrigger = currentTimeStr >= triggerTime;
          
          console.log(`[Forms Debug] Form ${asg.form_id}: Trigger[${triggerTime}] Current[${currentTimeStr}] Past[${isPastTrigger}] Snoozed[${isSnoozed}]`);

          if (isPastTrigger && !isSnoozed && !formToTrigger) {
            console.log(`[Forms Debug] 🔥 Triggering popup now for ${asg.form_id}`);
            formToTrigger = { id: asg.form_id, assignmentId: asg.id };
          }
        } else {
          console.log(`[Forms Debug] Form ${asg.form_id} already completed today.`);
        }
      }

      setPendingForms(pending);
      if (formToTrigger && !activeFormPopup) {
        setActiveFormPopup(formToTrigger);
      }
    } catch (error) {
      console.error('[Forms Debug] Unexpected error:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(checkForAssignedForms, 60000);
    checkForAssignedForms();
    return () => clearInterval(interval);
  }, [profile?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (pendingForms.length > 0) {
        const now = new Date();
        // Find forms that are currently snoozed
        const snoozedForms = pendingForms.filter(f => f.snoozed_until && new Date(f.snoozed_until) > now);

        if (snoozedForms.length > 0) {
          const firstForm = snoozedForms[0];
          const snoozeEnd = new Date(firstForm.snoozed_until!);
          const diff = snoozeEnd.getTime() - now.getTime();

          if (diff > 0) {
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setCountdownText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
          } else {
            setCountdownText("0:00");
            // Auto reopen
            if (!activeFormPopup) {
              setActiveFormPopup({ id: firstForm.id, assignmentId: firstForm.assignmentId });
              // Trigger a refresh to clear snooze state
              checkForAssignedForms();
            }
          }
        } else {
          setCountdownText("READY");
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingForms, activeFormPopup]);

  const handleSnooze = async (minutes: number = 15) => {
    if (!activeFormPopup) return;
    try {
      const snoozeTime = new Date(Date.now() + minutes * 60000).toISOString();
      await supabase
        .from('form_assignments')
        .update({ snoozed_until: snoozeTime })
        .eq('id', activeFormPopup.assignmentId);

      setActiveFormPopup(null);
      addToast({ type: 'info', title: 'Snoozed', message: `Form will reappear in ${minutes < 60 ? minutes + ' minutes' : (minutes / 60) + ' hour(s)'}.` });
      // Refresh local state immediately to start the countdown
      checkForAssignedForms();
    } catch (error) {
      console.error('Snooze error:', error);
    }
  };

  const handleFormComplete = async () => {
    if (!activeFormPopup) return;
    try {
      const { error } = await supabase.from('form_logs').insert({
        assignment_id: activeFormPopup.assignmentId,
        user_id: profile?.id,
        form_id: activeFormPopup.id
      });

      if (error) throw error;

      setActiveFormPopup(null);
      addToast({ type: 'success', title: 'Completed', message: 'Thank you for your response.' });
      // Refresh immediately to clear the lurking reminder
      await checkForAssignedForms();
    } catch (error) {
      console.error('Log error:', error);
      addToast({ type: 'error', title: 'Error', message: 'Failed to record completion. Please try again.' });
    }
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    setIsModalOpen(true);

    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    // Refresh notifications from context
    await fetchNotifications();
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id) || [];

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      // Refresh notifications from context
      await fetchNotifications();
    }
  };
  // isFreelancer is already defined above

  const navItems = React.useMemo(() => ([
    { name: 'Dashboard', icon: <IconLayout />, permission: 'view_dashboard' },
    { name: 'Tasks', icon: <IconClock />, permission: 'view_tasks' },
    { name: 'Projects', label: ['Super Admin', 'Admin', 'Project Manager', 'Project Operations Manager'].includes(effectiveRole || '') ? 'Pipeline' : 'Projects', icon: <IconBriefcase />, permission: 'view_projects' },
    { name: 'Analytics', label: 'Gig Stats', icon: <IconChartLine />, permission: 'view_analytics' },
    { name: 'Finances', icon: <IconDollar />, permission: 'view_finances' },
    { name: 'Earnings', icon: <IconDollar />, permission: 'view_personal_earnings' },
    { name: 'Accounts', icon: <IconBuilding />, permission: 'view_accounts' },
    { name: 'ActivityLogs', label: 'Activity Logs', icon: <IconHistory />, permission: 'view_activity_logs' },
    { name: 'Assets', icon: <IconFolder />, permission: 'access_assets' },
    { name: 'Chats', icon: <IconMessageSquare />, permission: 'access_chats' },
    { name: 'Users', icon: <IconUsers />, permission: 'view_users' },
    { name: 'Team', icon: <IconUsers />, permission: 'view_my_team' },
    { name: 'Workload', icon: <IconActivity />, permission: 'view_workload' },
    { name: 'Tickets', icon: <IconTicket />, permission: 'view_capacity_tickets' },
    { name: 'Channels', icon: <IconLink />, permission: 'view_channels' },
    { name: 'Forms', icon: <IconFileText />, permission: 'view_forms' },
    { name: 'Integrations', icon: <IconFilter />, permission: 'access_integrations' },
    { name: 'AlgorithmStudio', label: 'Algorithm', icon: <IconCpu />, permission: 'access_algorithm_studio' },
    { name: 'LevelsGuide', label: 'Level Guide', icon: <IconShield />, permission: 'view_levels_guide' },
    { name: 'Applicants', icon: <IconApplicant />, permission: 'view_applicants' },
    { name: 'TeamSlabs', label: 'Team Slabs', icon: <IconFilter />, permission: 'manage_team_slabs' },
    { name: 'TeamEarnings', label: 'Team Earnings', icon: <IconDollar />, permission: 'view_team_earnings' },
    { name: 'TeamDesignerEarnings', label: 'Team Designer Stats', icon: <IconChartLine />, permission: 'view_team_designer_earnings' },
    { name: 'Profile', label: 'My Profile', icon: <IconUser />, permission: 'view_profile' },
    { name: 'Training', icon: <IconFileVideo />, permission: 'view_training' },
    { name: 'MyNotes', label: 'My Notes', icon: <IconFileText />, permission: 'view_my_notes' },
    { name: 'Reminders', icon: <IconBell />, permission: 'access_reminders' },
    { name: 'Settings', icon: <IconSettings />, permission: 'view_settings' },
  ] as const).filter(item => {
    const hasPerm = hasPermission(item.permission);

    // Show Reminders in sidebar ONLY for Super Admin
    if (item.name === 'Reminders' && effectiveRole !== 'Super Admin') return false;

    // Explicitly hide My Profile for Super Admin as they access it via Settings > Profile tab
    if (item.name === 'Profile' && effectiveRole === 'Super Admin') return false;

    // Hide Earnings nav entry for Admin/Super Admin — they usually access it via Finances > Freelancer Earnings tab
    // However, we still check the permission in case a specific role needs both.
    // For Super Admin specifically, we keep it hidden to avoid clutter.
    if (item.name === 'Earnings' && effectiveRole === 'Super Admin') return false;

    // Hide Earnings if toggle is off
    if (item.name === 'Earnings' && !showEarningsHeader) return false;

    // Hide Team Slabs, Team, Team Earnings, and Team Designer Stats sidebar items from Admin/Super Admin 
    // since they manage it centrally via Finances or Analytics modules.
    const isTeamModule = ['TeamSlabs', 'Team', 'TeamEarnings', 'TeamDesignerEarnings'].includes(item.name);
    if (isTeamModule && (effectiveRole === 'Admin' || effectiveRole === 'Super Admin')) return false;

    return hasPerm;
  }) as { name: DashboardView; label?: string; icon: React.ReactNode }[], [hasPermission, effectiveRole, showEarningsHeader, isFreelancer]);

  // Save the exact number of items for perfect skeleton hydration next time
  useEffect(() => {
    if (!profileLoading && permissionsLoaded) {
      localStorage.setItem('nova_sidebar_item_count', navItems.length.toString());
    }
  }, [navItems.length, profileLoading, permissionsLoaded]);

  const isAccessRestricted = (() => {
    const item = ([
      { name: 'Dashboard', permission: 'view_dashboard' },
      { name: 'Tasks', permission: 'view_tasks' },
      { name: 'Projects', permission: 'view_projects' },
      { name: 'Leads', permission: 'view_leads' },
      { name: 'Analytics', permission: 'view_analytics' },
      { name: 'Finances', permission: 'view_finances' },
      { name: 'Accounts', permission: 'view_accounts' },
      { name: 'Assets', permission: 'access_assets' },
      { name: 'Chats', permission: 'access_chats' },
      { name: 'Reminders', permission: 'access_reminders' },
      { name: 'Users', permission: 'view_users' },
      { name: 'Team', permission: 'view_my_team' },
      { name: 'Workload', permission: 'view_workload' },
      { name: 'Tickets', permission: 'view_capacity_tickets' },

      { name: 'Channels', permission: 'view_channels' },
      { name: 'Forms', permission: 'view_forms' },
      { name: 'Integrations', permission: 'access_integrations' },
      { name: 'Settings', permission: 'view_settings' },
      { name: 'Earnings', permission: 'view_personal_earnings' },
      { name: 'Profile', permission: 'view_profile' },
      { name: 'AlgorithmStudio', permission: 'access_algorithm_studio' },
      { name: 'LevelsGuide', permission: 'view_levels_guide' },
    ] as const).find(i => i.name === activeItem);

    // Only restrict access if BOTH profile and permissions have finished loading
    if (profileLoading || !permissionsLoaded) return false;

    return item ? !hasPermission(item.permission) : false;
  })();

  const guideItems = React.useMemo(() => {
    if (!profile) {
      return [
        { name: 'GuideVideoIntro', label: 'Video Introduction' },
        { name: 'GuideSystemWorks', label: 'How Our System Works' },
        { name: 'GuideWorkflowSummary', label: 'Workflow Overview' },
        { name: 'GuidePaymentOverview', label: 'Payment Overview' },
        { name: 'GuideJoinDesigner', label: 'Join as Designer' },
      ] as const;
    }
    return [
      { name: 'GuideAddProject', label: 'Add Project' },
      { name: 'GuideRemoveProject', label: 'Remove Project' },
      { name: 'GuideMarkCancelled', label: 'Mark Cancelled' },
      { name: 'GuideMarkApproved', label: 'Mark Approved' },
      { name: 'GuideTriggerDispute', label: 'Trigger Dispute' },
      { name: 'GuideTriggerArtHelp', label: 'Trigger Art Help' },
      { name: 'GuidePostComments', label: 'Post Client Comments And Update Status & Time' },
      { name: 'GuideSendFiles', label: 'Send Files To Client And Update Status' },
    ] as const;
  }, [profile]);

  const renderAccessRestricted = () => (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700 p-10 bg-surface-bg select-none">
      <div className="relative group">
        <div className="w-32 h-32 rounded-[2.5rem] bg-brand-primary/5 flex items-center justify-center text-brand-primary/20 transition-all duration-500 group-hover:bg-brand-primary/10 group-hover:text-brand-primary/40 group-hover:scale-110">
          <IconShield size={64} strokeWidth={1} className="animate-pulse" />
        </div>
        <div className="absolute -inset-4 rounded-[3rem] border border-brand-primary/5 animate-[ping_3s_infinite] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-16 h-16 rounded-3xl bg-black flex items-center justify-center shadow-2xl border border-white/5">
            <IconAlertTriangle size={32} className="text-brand-primary animate-bounce" />
          </div>
        </div>
      </div>

      <div className="max-w-md space-y-4">
        <h2 className="text-4xl font-black text-white tracking-tight uppercase italic underline decoration-brand-primary/40 underline-offset-8">Access Restricted</h2>
        <p className="text-gray-400 text-sm leading-relaxed font-medium">
          The simulated role <span className="text-brand-primary font-black px-2 py-0.5 bg-brand-primary/10 rounded-lg border border-brand-primary/20">"{effectiveRole}"</span> does not have the required security clearing for the <span className="text-white font-bold">{activeItem}</span> module.
        </p>
      </div>

      <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 p-4 rounded-3xl backdrop-blur-sm shadow-2xl">
        <div className="w-10 h-10 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
          <IconInfo size={20} />
        </div>
        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-normal text-left max-w-[200px]">
          Please check "Parent Page Access" in the Permissions Matrix to enable this section.
        </p>
      </div>

      {simulatedRole && (
        <Button
          variant="ghost"
          onClick={() => {
            if (simulatedRole) {
              localStorage.setItem('temp_selected_role', simulatedRole);
              // Capture unsaved preview permissions from storage before they are cleared
              const preview = localStorage.getItem('nova_preview_permissions');
              if (preview) {
                localStorage.setItem('temp_preview_permissions', preview);
              }
            }
            setSimulatedRole(null);
            updateRoute('Settings', 'page-access');
            onItemSelect('Settings');
          }}
          className="border border-white/10 hover:bg-white/5 px-8"
        >
          Exit Simulation
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-surface-bg text-white overflow-hidden">
      {/* Sidebar */}
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-surface-border sticky top-0 h-screen transition-all duration-300 ease-in-out z-40 ${isExpanded ? 'w-56' : 'w-20'}`}
      >
        <div className={`${isGuideMode && !profile ? 'h-10' : 'h-20'} shrink-0 flex items-center transition-all duration-300 ${isExpanded ? 'px-5 gap-3' : 'justify-center'} ${!isGuideMode ? 'border-b border-surface-border' : ''}`}>
          {isGuideMode ? (
            <div className={`w-full relative transition-all duration-300 ${isExpanded ? 'px-2' : ''}`}>
              {isExpanded ? (
                profile ? (
                  <div className="relative flex items-center w-full group/search">
                    <div className="absolute left-3 text-gray-500 group-focus-within/search:text-brand-primary transition-colors pointer-events-none">
                      <IconSearch size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search docs..."
                      autoFocus
                      className="w-full bg-surface-card border border-surface-border rounded-xl text-sm py-2.5 pl-9 pr-3 text-white outline-none focus:border-brand-primary placeholder-gray-500 transition-all shadow-inner focus:shadow-[0_0_15px_-3px_rgba(255,77,45,0.2)]"
                    />
                  </div>
                ) : null
              ) : (
                profile ? (
                  <div className="w-11 h-11 rounded-xl bg-surface-card flex items-center justify-center border border-surface-border text-gray-400 mx-auto transition-colors hover:border-brand-primary/50 hover:text-brand-primary hover:bg-white/[0.04]">
                    <IconSearch size={20} />
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <>
              <div className="shrink-0">
                {!profile && profileLoading ? (
                  <div className={`rounded-full bg-white/5 ${isExpanded ? 'w-8 h-8' : 'w-10 h-10'}`} />
                ) : (
                  <Avatar
                    size={isExpanded ? "sm" : "md"}
                    status="online"
                    src={profile?.avatar_url}
                    initials={profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
                    className="transition-all duration-300"
                  />
                )}
              </div>
              <div className={`flex flex-col min-w-0 transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 pointer-events-none w-0 h-0 overflow-hidden'}`}>
                {!profile && profileLoading ? (
                  <>
                    <div className="h-4 w-24 bg-white/5 rounded mb-1" />
                    <div className="h-2 w-12 bg-white/5 rounded" />
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                      {profile?.name
                        ? formatDisplayName(profile.name)
                        : 'Loading...'}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest whitespace-nowrap overflow-hidden text-ellipsis min-w-0">{effectiveRole || 'User'}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <nav className="flex-1 px-3 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 [scrollbar-gutter:stable]">
          {isGuideMode && (
            <div className={`px-2 transition-all duration-300 ${isExpanded ? 'mt-4 mb-3 opacity-100' : 'mt-0 mb-0 opacity-0 h-0 overflow-hidden'}`}>
              <h2 className="text-lg font-bold text-white whitespace-nowrap">Guide</h2>
            </div>
          )}
          <div className="mt-3 pb-4 space-y-2">
            {(profileLoading || (profile && !permissionsLoaded)) ? (
              // Exact number of Skeleton items based on previous session, defaulting to a minimal 3
              Array.from({ length: parseInt(localStorage.getItem('nova_sidebar_item_count') || '8') }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 rounded-xl bg-white/[0.02] border border-transparent animate-pulse flex items-center ${isExpanded ? 'w-full px-4' : 'w-12 mx-auto justify-center px-0'}`}
                >
                  <div className="w-5 h-5 rounded bg-white/5 shrink-0" />
                  {isExpanded && <div className="ml-3 h-4 w-24 bg-white/5 rounded" />}
                </div>
              ))
            ) : !isGuideMode ? (
              navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onItemSelect(item.name)}
                  className={`flex items-center h-12 transition-[color,background-color,opacity] duration-300 font-medium group relative rounded-xl overflow-hidden outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0 ${isExpanded ? 'w-full px-4' : 'w-12 mx-auto justify-center px-0'} ${activeItem === item.name
                    ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent shadow-none-instant'
                    }`}
                >
                  {/* Metallic Shine Overlay */}
                  {activeItem === item.name && (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
                  )}

                  <span className={`shrink-0 transition-colors relative z-10 ${activeItem === item.name ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {item.icon}
                  </span>
                  <span className={`transition-all duration-300 font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 relative z-10 ${isExpanded ? 'ml-3 opacity-100 translate-x-0' : 'ml-0 opacity-0 -translate-x-4 pointer-events-none w-0'}`}>
                    {item.label || item.name}
                  </span>

                  {/* Tooltip for collapsed state */}
                  <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible' : 'opacity-0 invisible pointer-events-none'}`}>
                    {item.label || item.name}
                  </div>
                </button>
              ))
            ) : (
              // Guide Navigation Items
              guideItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onItemSelect(item.name as DashboardView)}
                  className={`flex items-center h-10 transition-[color,background-color,opacity] duration-300 font-medium group relative rounded-xl overflow-hidden outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0 ${isExpanded ? 'w-full px-4' : 'w-12 mx-auto justify-center px-0'} ${activeItem === item.name
                    ? 'bg-white/[0.08] text-white border border-transparent'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                >
                  <span className={`transition-all duration-300 font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 relative z-10 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none w-0'}`}>
                    {item.label || item.name}
                  </span>

                  {/* Tooltip for collapsed state */}
                  <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover:opacity-100 group-hover:visible' : 'opacity-0 invisible pointer-events-none'}`}>
                    {item.label || item.name}
                  </div>
                </button>
              ))
            )}
          </div>
        </nav>

        {!isGuideMode && (
          <div className="mt-auto border-t border-surface-border relative overflow-hidden bg-white/[0.01]">
            {/* Shiny Surface Effect for the dark area */}
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.03)_60%,rgba(255,255,255,0.01)_100%)] pointer-events-none opacity-40 transition-opacity" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04)_0%,transparent_80%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col px-3 pt-2 pb-3 gap-2">
              {/* Collapse / Expand toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full h-11 flex items-center transition-[color,background-color,border-color,transform,opacity] duration-200 group/btn relative rounded-xl px-4 hover:bg-white/[0.04] outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0 border border-transparent"
              >
                <div className="relative z-10 flex items-center w-full">
                  <span className="shrink-0 transition-colors text-gray-400 group-hover/btn:text-white">
                    <IconLayoutSidebar />
                  </span>
                  <span className={`ml-3 font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} text-gray-400 group-hover/btn:text-white`}>
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                </div>
                {/* Tooltip for collapsed state */}
                <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible' : 'opacity-0 invisible pointer-events-none'}`}>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </div>
              </button>

              {/* Sign Out */}
              <button
                onClick={onSignOut}
                className="w-full h-11 flex items-center transition-[color,background-color,border-color,transform,opacity] duration-300 group/btn relative rounded-xl px-4 overflow-hidden bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)] active:scale-95 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0"
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
                <div className="relative z-10 flex items-center w-full">
                  <span className="shrink-0 text-white">
                    <IconLogout />
                  </span>
                  <span className={`ml-3 font-semibold transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'} text-white`}>
                    Sign Out
                  </span>
                </div>
                <div className={`absolute left-full ml-4 px-3 py-2 bg-surface-card border border-surface-border rounded-lg text-xs font-bold text-white whitespace-nowrap shadow-xl z-50 transition-all duration-200 ${!isExpanded ? 'opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible' : 'opacity-0 invisible pointer-events-none'}`}>
                  Sign Out
                </div>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Overlay - (Optional for full screen but kept for fade transition) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Full-Screen Panel */}
      <aside
        className={`fixed inset-0 w-full bg-surface-bg z-[70] lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`shrink-0 flex flex-col ${!isGuideMode ? 'border-b border-surface-border' : ''}`}>
          {/* Close Button Row */}
          <div className="h-14 flex items-center justify-end px-4">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 -mr-1 text-gray-400 hover:text-white transition-colors active:scale-90"
              aria-label="Close navigation"
            >
              <IconX size={24} />
            </button>
          </div>

          {/* Profile Section / Search Section */}
          {isGuideMode ? (
            profile ? (
              <div className="w-full px-6 pb-6 relative">
                <div className="relative flex items-center w-full group/search">
                  <div className="absolute left-3 text-gray-500 group-focus-within/search:text-brand-primary transition-colors pointer-events-none">
                    <IconSearch size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search docs..."
                    autoFocus
                    className="w-full bg-surface-card border border-surface-border rounded-xl text-sm py-2.5 pl-9 pr-3 text-white outline-none focus:border-brand-primary placeholder-gray-500 transition-all shadow-inner focus:shadow-[0_0_15px_-3px_rgba(255,77,45,0.2)]"
                  />
                </div>
              </div>
            ) : null
          ) : (
            <div className="flex flex-col items-center justify-center pt-2 pb-8 px-6 gap-4">
              <div className="shrink-0 drop-shadow-xl">
                {!profile && profileLoading ? (
                  <div className="rounded-full bg-white/5 w-14 h-14 animate-pulse border border-white/10" />
                ) : (
                  <Avatar
                    size="lg"
                    status="online"
                    src={profile?.avatar_url}
                    initials={profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : '??'}
                    className="ring-2 ring-white/[0.03] ring-offset-2 ring-offset-surface-bg"
                  />
                )}
              </div>
              <div className="flex flex-col items-center text-center gap-1.5 min-w-0">
                {!profile && profileLoading ? (
                  <>
                    <div className="h-5 w-32 bg-white/5 rounded mb-1 animate-pulse" />
                    <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold text-white tracking-tight drop-shadow-sm">
                      {profile?.name
                        ? formatDisplayName(profile.name)
                        : 'Loading...'}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">{effectiveRole || 'User'}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-6 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
          <div className="max-w-[320px] mx-auto mt-6 pb-8 space-y-2">
            {isGuideMode && (
              <div className="px-2 mb-4 text-center">
                <h2 className="text-lg font-bold text-white whitespace-nowrap">Guide</h2>
              </div>
            )}
            {(profileLoading || (profile && !permissionsLoaded)) ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-white/[0.02] border border-transparent animate-pulse flex items-center justify-center w-full px-4"
                >
                  <div className="w-5 h-5 rounded bg-white/5 shrink-0" />
                  <div className="ml-3 h-4 w-24 bg-white/5 rounded" />
                </div>
              ))
            ) : !isGuideMode ? (
              navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    onItemSelect(item.name);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-center h-12 transition-[color,background-color,opacity] duration-300 font-medium group relative rounded-xl overflow-hidden outline-none w-full px-4 ${activeItem === item.name
                    ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border border-[#FF4D2D] shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                >
                  <span className={`shrink-0 transition-colors relative z-10 ${activeItem === item.name ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {item.icon}
                  </span>
                  <span className="ml-3 font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 relative z-10">
                    {item.label || item.name}
                  </span>
                </button>
              ))
            ) : (
              guideItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    onItemSelect(item.name as DashboardView);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-center h-10 transition-[color,background-color,opacity] duration-300 font-medium group relative rounded-xl overflow-hidden outline-none w-full px-4 ${activeItem === item.name
                    ? 'bg-white/[0.08] text-white border border-transparent'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                >
                  <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 relative z-10">
                    {item.label || item.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </nav>

        {!isGuideMode && (
          <div className="mt-auto border-t border-surface-border p-6 bg-white/[0.01]">
            <button
              onClick={onSignOut}
              className="max-w-[320px] mx-auto w-full h-12 flex items-center justify-center transition-[color,background-color,border-color,transform,opacity] duration-300 group relative rounded-xl px-4 overflow-hidden bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] active:scale-95 outline-none shadow-lg"
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
              <div className="relative z-10 flex items-center">
                <span className="shrink-0 text-white">
                  <IconLogout />
                </span>
                <span className="ml-3 font-semibold text-white">
                  Sign Out
                </span>
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 transition-all duration-300 overflow-hidden">
        <header className="h-20 border-b border-surface-border flex items-center justify-between px-4 lg:px-8 bg-surface-bg/50 backdrop-blur-xl sticky top-0 z-30 w-full gap-2 lg:gap-4">
          <div className="flex-1 flex items-center gap-2 lg:gap-6 lg:min-w-[200px]">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 -ml-1 text-gray-400 hover:text-white transition-[color,transform] duration-200 outline-none focus:ring-0 active:scale-90"
            >
              <IconMenu size={24} />
            </button>

            <h2 className="text-base lg:text-lg font-bold truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
              {activeItem === 'Profile' ? 'My Profile' : (navItems.find(item => item.name === activeItem)?.label || (isGuideMode ? guideItems.find(item => item.name === activeItem)?.label : activeItem))}
            </h2>
          </div>

          {/* Centered Slot for Clock */}
          {/* Centered Slot for Clock */}
          <div id="header-center-slot" className="flex-none flex justify-center items-center h-full px-2 text-center">
            <div className="relative px-3 sm:px-6 h-8 sm:h-10 flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300 min-w-max group/clock">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />
              
              <span className="relative z-10 text-[12px] sm:text-[15px] font-black text-white tabular-nums tracking-[0.1em] transition-colors duration-300 uppercase flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:block text-white">{dateDisplay}</span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {/* Show full time on desktop, HH:MM on mobile */}
                  <span className="hidden sm:inline">{timeDisplay}</span>
                  <span className="sm:hidden">{timeDisplay.split(':').slice(0, 2).join(':')}</span>
                  <span className="text-brand-primary drop-shadow-[0_0_8px_rgba(255,77,45,0.3)]">{amPm}</span>
                </div>
              </span>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-2 lg:gap-5 lg:min-w-[200px] justify-end">
            {!isGuideMode && (
              <div className="flex items-center gap-1 sm:gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-400 hover:text-white transition-[color,transform,opacity] duration-200 outline-none focus:ring-0 active:scale-90"
                  >
                    <IconBell />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-brand-primary rounded-full border-2 border-surface-bg flex items-center justify-center text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Panel */}
                  {showNotifications && (
                    <div className="absolute top-full right-0 mt-2 w-96 bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="relative p-3 border-b border-white/10 bg-[#1A1A1A] overflow-hidden z-10">
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                        <div className="relative z-10 flex items-center justify-between py-2">
                          <h3 className="font-bold text-sm text-white drop-shadow-sm">Notifications</h3>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications === null ? (
                          <div className="p-8 text-center text-gray-500 text-sm">
                            Loading notifications...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 text-sm">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map(notification => (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`p-4 border-b border-surface-border last:border-0 cursor-pointer transition-colors ${notification.is_read ? 'bg-transparent' : 'bg-brand-primary/5 hover:bg-brand-primary/10'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notification.is_read ? 'bg-gray-600' : 'bg-brand-primary'
                                  }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white">{notification.message}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {/* Footer with View All & Mark all as read */}
                      <div className="relative p-3 border-t border-white/10 bg-[#1A1A1A] overflow-hidden z-10 flex">
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            onItemSelect('Notifications');
                          }}
                          className="flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-[color,opacity] duration-200 relative z-10 outline-none focus:ring-0 text-white hover:text-white/80 border-r border-white/10"
                        >
                          View All
                        </button>
                        <button
                          onClick={markAllAsRead}
                          disabled={unreadCount === 0}
                          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-[color,opacity] duration-200 relative z-10 outline-none focus:ring-0 ${unreadCount > 0 ? 'text-brand-primary hover:text-brand-primary/80' : 'text-gray-500 cursor-not-allowed'}`}
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isGuideMode && !isFreelancer && (
              <button
                className="relative p-2 text-gray-400 hover:text-white transition-[color,transform,opacity] duration-200 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ring-0 border border-transparent"
                onClick={() => {
                  window.open('/guide-add-project', '_blank');
                }}
                title="Guide"
              >
                <IconAlertCircle />
              </button>
            )}

            {/* AI Assistant fixed header action */}
            {['Super Admin', 'Project Manager'].includes(effectiveRole || '') && (
              <button
                className="relative p-2 text-gray-400 hover:text-white transition-[color,transform,opacity] duration-200 outline-none focus:ring-0 active:scale-90"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toggle-ai-agent'));
                }}
                title="AI Assistant"
              >
                <Bot className="w-5 h-5" />
              </button>
            )}

            {isFreelancer && availableEarnings !== null && showEarningsHeader && (
              <div className="relative px-3 sm:px-5 h-9 sm:h-10 flex items-center justify-center bg-black/40 border border-white/[0.05] rounded-xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 group/earnings min-w-0">
                {/* Inner Top Shadow for depth */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
                {/* Subtle Diagonal Machined Sheen */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30 pointer-events-none" />

                <span className="relative z-10 text-xs sm:text-sm font-black text-brand-success tracking-wider group-hover/earnings:text-white transition-colors duration-300 truncate">
                  ${availableEarnings.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </header>

        <main className={`${noPadding ? '' : 'p-6'} flex-1 flex flex-col overflow-y-auto scrollbar-hide relative`}>
          {simulatedRole && (
            <div className="mb-8 p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-between animate-in slide-in-from-top-4 duration-500 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary border border-brand-primary/30">
                  <IconShield size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-brand-primary uppercase">Active Simulation</p>
                  <p className="text-sm font-bold text-white">Viewing as: <span className="text-brand-primary">{simulatedRole}</span></p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (simulatedRole) {
                    localStorage.setItem('temp_selected_role', simulatedRole);
                    // Capture unsaved preview permissions from storage before they are cleared
                    const preview = localStorage.getItem('nova_preview_permissions');
                    if (preview) {
                      localStorage.setItem('temp_preview_permissions', preview);
                    }
                  }
                  setSimulatedRole(null);
                  updateRoute('Settings', 'page-access');
                  onItemSelect('Settings');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Exit Simulation
              </button>
            </div>
          )}
          {isAccessRestricted ? renderAccessRestricted() : children}
        </main>
      </div >

      {/* Click outside to close notifications */}
      {
        showNotifications && (
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowNotifications(false)}
          />
        )
      }

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Notification Details"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="px-8 h-12 text-sm font-bold"
            >
              Close
            </Button>
            {selectedNotification?.reference_id && (
              <Button
                variant="primary"
                onClick={() => {
                  if (onProjectOpen && selectedNotification.reference_id) {
                    onItemSelect('Projects');
                    onProjectOpen(selectedNotification.reference_id);
                    setIsModalOpen(false);
                  }
                }}
                className="px-8 h-12 text-sm font-bold bg-brand-primary"
              >
                Open Project
              </Button>
            )}
          </div>
        }
      >
        {selectedNotification && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-2">
            <div className="space-y-6">
              <div className="space-y-5">
                <h3 className="text-xl font-bold text-white">
                  {selectedNotification.type === 'project_created' && 'New Project Created'}
                  {selectedNotification.type === 'timeline_update' && 'Timeline Update'}
                  {!['project_created', 'timeline_update'].includes(selectedNotification.type) && 'Notification Update'}
                </h3>

                <div className="space-y-4">
                  {selectedNotification.reference_id && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest w-24">Project ID:</span>
                      <span className="text-sm font-mono text-brand-primary font-bold">{selectedNotification.reference_id}</span>
                    </div>
                  )}

                  {selectedNotification.type === 'timeline_update' && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Update Summary</span>
                      <p className="text-sm text-gray-400 bg-white/[0.03] border border-white/5 rounded-xl p-4 leading-relaxed">
                        {selectedNotification.message.includes(':')
                          ? selectedNotification.message.split(':')[0].trim()
                          : selectedNotification.message}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                <span>Log Entry</span>
                <span className="text-gray-400">
                  {new Date(selectedNotification.created_at).toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* Triggered Form Modal */}
      <Modal
        isOpen={!!activeFormPopup}
        onClose={() => setActiveFormPopup(null)}
        title={activeFormPopup?.id === 'performance_tracking' ? "Daily Performance Tracking" : "Active Task"}
        size="md"
        isElevatedFooter
        footer={(
          <div className="flex justify-between items-center w-full">
            <Dropdown
              options={[
                { value: '5', label: '5 Minutes' },
                { value: '10', label: '10 Minutes' },
                { value: '15', label: '15 Minutes' },
                { value: '20', label: '20 Minutes' },
                { value: '25', label: '25 Minutes' },
                { value: '30', label: '30 Minutes' },
              ]}
              value=""
              onChange={(val) => handleSnooze(parseInt(val))}
              className="w-fit"
            >
              <Button
                variant="recessed"
                size="md"
                leftIcon={<IconClock size={16} className="text-gray-600 group-hover/snooze:text-brand-primary transition-colors" />}
                className="h-[46px] px-8 group/snooze text-[11px] font-black uppercase tracking-widest"
                disabled={submitting}
              >
                Snooze...
              </Button>
            </Dropdown>
            <Button
              variant="metallic"
              size="md"
              onClick={() => document.getElementById('perf-form-submit')?.click()}
              isLoading={submitting}
              className="h-[46px] px-8"
            >
              Complete Submission
            </Button>
          </div>
        )}
      >
        <div className="py-2">
          {activeFormPopup?.id === 'performance_tracking' ? (
            <PerformanceForm
              onComplete={handleFormComplete}
              onSubmitStatusChange={setSubmitting}
              userId={profile?.id}
            />
          ) : (
            <>
              <p className="text-white text-sm">This form has been assigned to you for mandatory completion at this time.</p>
              <div className="mt-6 p-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] text-center">
                <IconFileText size={32} className="mx-auto text-brand-primary mb-2" />
                <p className="text-gray-400 text-xs italic">Please navigate to the Forms page to provide full data, or confirm completion here if already done.</p>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Lurking Reminder: Floating icon for pending forms */}
      {
        !activeFormPopup && pendingForms.length > 0 && countdownText === "READY" && (
          <div
            className="fixed bottom-10 right-10 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500"
          >
            <button
              onClick={() => setActiveFormPopup(pendingForms[0])}
              className="group relative flex items-center gap-3.5 p-1.5 pr-6 bg-surface-card border border-surface-border rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-brand-primary/40 transition-all duration-300 hover:-translate-y-1 active:scale-95 overflow-hidden"
            >
              {/* 1. Global Brushed Metal Background */}
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.01)_0%,rgba(255,255,255,0.03)_40%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.03)_60%,rgba(255,255,255,0.01)_100%)] pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

              {/* 2. Machined Sheen Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] pointer-events-none opacity-30" />

              {/* 3. Icon Container (Metallic Primary) */}
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(0,0,0,0.2),0_4px_12px_-2px_rgba(217,54,26,0.5)] flex-shrink-0 group-hover:brightness-[1.1] transition-all">
                {/* Inner Gloss */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none opacity-40" />
                <IconFileText size={22} className="text-white relative z-10 animate-pulse" />

                {/* Badge */}
                <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] bg-white text-[#D9361A] text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.2)] border border-white/50 px-1">
                  {pendingForms.length}
                </div>
              </div>

              <div className="flex flex-col items-start relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                  {countdownText === "READY" ? "TASK READY" : countdownText}
                </span>
                <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors tracking-tight">
                  {pendingForms[0].id === 'performance_tracking' ? 'Performance Tracking' : 'Form Pending'}
                </span>
              </div>

              {/* 4. Highlighted Border (on hover) */}
              <div className="absolute inset-0 border border-brand-primary/0 group-hover:border-brand-primary/20 rounded-full transition-all pointer-events-none" />
            </button>
          </div>
        )
      }
    </div >
  );
};
