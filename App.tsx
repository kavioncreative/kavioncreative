import React, { useState, useEffect } from 'react';
import Dashboard from './sections/Dashboard';
import Projects, { ProjectsHandle } from './sections/Projects';
import Finances from './sections/Finances';
import Accounts from './sections/Accounts';
import Assets from './sections/Assets';
import Chats from './sections/Chats';
import Users, { UsersHandle } from './sections/Users';
import Channels from './sections/Channels';
import Integrations from './sections/Integrations';
import Workload from './sections/Workload';
import CapacityTickets from './sections/CapacityTickets';
import Settings, { SettingsHandle } from './sections/Settings';
import { Modal } from './components/Surfaces';
import Button from './components/Button';
import { IconSettings } from './components/Icons';
import Earnings from './sections/Earnings';
import ProjectDetails from './sections/ProjectDetails';
import UserDetails from './sections/UserDetails';
import UserDetailsV2 from './sections/UserDetailsV2';
import CompleteProfile from './sections/CompleteProfile';
import PendingApproval from './sections/PendingApproval';
import Reminders from './sections/Reminders';
import Analytics from './sections/Analytics';
import Tasks from './sections/Tasks';

import AlgorithmStudio from './sections/AlgorithmStudio';
import FreelancerLevelsGuide from './sections/FreelancerLevelsGuide';
import Applicants from './sections/Applicants';
import Guide from './sections/Guide';
import GuideAddProject from './sections/GuideAddProject';
import GuideRemoveProject from './sections/GuideRemoveProject';
import GuideMarkCancelled from './sections/GuideMarkCancelled';
import GuideMarkApproved from './sections/GuideMarkApproved';
import GuideTriggerDispute from './sections/GuideTriggerDispute';
import GuideTriggerArtHelp from './sections/GuideTriggerArtHelp';
import GuidePostComments from './sections/GuidePostComments';
import GuideSendFiles from './sections/GuideSendFiles';
import TeamSlabs from './sections/TeamSlabs';
import TeamEarnings from './sections/TeamEarnings';
import { AttendanceTracker } from './components/AttendanceTracker';
import TeamDesignerEarnings from './sections/TeamDesignerEarnings';
import Leads, { LeadsHandle } from './sections/Leads';
import LeadDetails from './sections/LeadDetails';
import Team from './sections/Team';
import ActivityLogs from './sections/ActivityLogs';
import Training from './sections/Training';
import MyNotes from './sections/MyNotes';
import { DocViewer } from './sections/DocViewer';
import Notifications from './sections/Notifications';

import { DashboardLayout, DashboardView } from './layouts/DashboardLayout';
import { SignInScreen } from './sections/AuthScreens';
import { LegalPage } from './sections/Legal';
import ThanksScreen from './sections/ThanksScreen';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ToastContainer } from './components/Toast';
import { getInitialView, updateRoute, PATH_MAP } from './utils/routing';
import { NotificationProvider } from './contexts/NotificationContext';
import { UserProvider } from './contexts/UserContext';
import { AccountProvider } from './contexts/AccountContext';
import { ReminderOverlay } from './components/ReminderOverlay';
import { AiAgent } from './components/AiAgent';


type View = 'dashboard' | 'signin' | 'complete-profile' | 'pending-approval' | 'deactivated' | 'welcome' | 'terms' | 'privacy';

const App: React.FC = () => {
    // Check isolated standalone routes before standard rendering
    if (window.location.pathname.startsWith('/d/')) {
        return <DocViewer />;
    }

    const initial = getInitialView();
    
    // Fast-track state initialization from cache to prevent redirects on refresh
    const [view, setView] = useState<View>(() => {
        const cachedStr = localStorage.getItem('user_profile_cache');
        if (cachedStr) {
            try {
                const cachedProfile = JSON.parse(cachedStr);
                const role = cachedProfile.role?.toLowerCase() || '';
                const status = cachedProfile.status?.toLowerCase() || '';
                if (status === 'invited') return 'complete-profile';
                if (status === 'pending') return 'pending-approval';
                if (status === 'disabled' || status === 'deactivated') return 'deactivated';
                if (role) return 'dashboard';
            } catch (e) {
                console.error('Failed to parse profile cache:', e);
            }
        }
        return 'signin';
    });
    
    const [dashboardView, setDashboardView] = useState<DashboardView>(initial.view);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initial.projectId);
    const [selectedProjectData, setSelectedProjectData] = useState<any>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initial.userId);
    const [selectedLead, setSelectedLead] = useState<any | null>(initial.leadId ? { id: initial.leadId } : null);
    
    const [selectedRole, setSelectedRole] = useState<string | null>(() => {
        const cachedStr = localStorage.getItem('user_profile_cache');
        if (cachedStr) {
            try {
                return JSON.parse(cachedStr).role || null;
            } catch (e) { return null; }
        }
        return null;
    });
    
    const [session, setSession] = useState<Session | null>(null);
    const [initialStatus, setInitialStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSettingsDirty, setIsSettingsDirty] = useState(false);
    const [pendingView, setPendingView] = useState<DashboardView | null>(null);
    const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
    const settingsRef = React.useRef<SettingsHandle>(null);
    const projectsRef = React.useRef<ProjectsHandle>(null);
    const usersRef = React.useRef<UsersHandle>(null);
    const leadsRef = React.useRef<LeadsHandle>(null);

  const determineView = (profile: any, currentSession?: Session | null): View => {
    let role = profile?.role?.toLowerCase().trim() || '';
    const status = profile?.status?.trim() || '';
    const hasSeenWelcome = profile?.has_seen_welcome;

    if (!role && currentSession?.user?.user_metadata?.role) {
      role = currentSession.user.user_metadata.role.toLowerCase().trim();
    }

    // Check status-based routing
    if (status.toLowerCase() === 'invited') return 'complete-profile';

    // Admin always goes to dashboard once active
    if (role === 'admin' || role === 'super admin') return 'dashboard';
    if (status.toLowerCase() === 'pending') return 'pending-approval';
    if (status.toLowerCase() === 'disabled' || status.toLowerCase() === 'deactivated') return 'deactivated';

    // If user has active status, show dashboard or welcome
    if (status.toLowerCase() === 'active') {
      return hasSeenWelcome ? 'dashboard' : 'welcome';
    }

    // If user has a role (even without explicit active status), they should go to dashboard
    // This handles cases where profile exists with a role but status might be missing/undefined
    if (role) {
      return hasSeenWelcome ? 'dashboard' : 'welcome';
    }

    // Default to signin if no session/role found
    return 'signin';
  };

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      console.log('🚀 initAuth started');
      try {
        console.log('📡 Fetching session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('✅ Session fetched:', session?.user?.id || 'No session');
        setSession(session);

        if (session) {
          console.log('👤 Fetching profile for:', session.user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('status, role, has_seen_welcome')
            .eq('id', session.user.id)
            .single();

            if (profile) {
              console.log('✅ Profile found in DB:', profile);
              if (profile.role) setSelectedRole(profile.role);
              setInitialStatus(profile.status);
              const targetView = determineView(profile, session);
              console.log('🎯 Routing decision from DB:', targetView);
              
              // Only update view if it's different to avoid flicker
              if (targetView !== view) {
                setView(targetView);
              }
              localStorage.setItem('user_profile_cache', JSON.stringify(profile));
            } else {
              console.warn('⚠️ Profile not found in DB. ProfileError:', profileError);

              const cachedStr = localStorage.getItem('user_profile_cache');
              const cachedProfile = cachedStr ? JSON.parse(cachedStr) : null;

              if (cachedProfile && cachedProfile.id === session.user.id) {
                console.log('♻️ Profile fetch failed or returned 404, but valid cache exists. Respecting cache.');
                if (cachedProfile.role) setSelectedRole(cachedProfile.role);
                setInitialStatus(cachedProfile.status);
                setView(determineView(cachedProfile, session));
              } else {
                // Truly a new user or missing record
                const isNotFoundError = profileError?.code === 'PGRST116' || !profileError;

                if (isNotFoundError) {
                  console.log('ℹ️ Identity check: Profile does not exist, checking metadata...');
                  const metaRole = session.user.user_metadata?.role;
                  if (metaRole) {
                    console.log('📝 Found role in metadata:', metaRole);
                    
                    // SAFEGUARD: If we are already on the dashboard or have an established session, 
                    // don't bounce to setup just because the profile fetch failed to find a record.
                    if (view === 'dashboard' || (cachedProfile && cachedProfile.status?.toLowerCase() === 'active')) {
                      console.log('🛡️ Profile record missing but session/cache suggests active user. Staying on dashboard.');
                      return;
                    }

                    setSelectedRole(metaRole);
                    setInitialStatus('Invited');
                    setView('complete-profile');
                  } else {
                    console.log('❓ No role in metadata, checking saved step...');
                    const savedStep = localStorage.getItem('nova_onboarding_step') as View | null;
                    if (savedStep && savedStep === 'complete-profile' && view !== 'dashboard') {
                      setView(savedStep);
                      const savedRole = localStorage.getItem('nova_selected_role');
                      if (savedRole) setSelectedRole(savedRole);
                    } else if (view !== 'dashboard') {
                      console.log('🚪 Final fallback to signin.');
                      setView('signin');
                      localStorage.removeItem('user_profile_cache');
                    }
                  }
                } else {
                  console.error('🛑 Database connection error. Defaulting to cached view if available or signin.');
                  if (cachedProfile) {
                     setView(determineView(cachedProfile, session));
                  } else {
                     setView('signin');
                  }
                }
              }
            }
        } else {
          const segments = window.location.pathname.substring(1).split('/');
          const firstSegment = segments[0]?.toLowerCase();
          
          if (firstSegment === 'guide' || (firstSegment && firstSegment.startsWith('guide-'))) {
            setView('dashboard');
            // Ensure dashboardView matches the segment if it's a guide subpage
            if (firstSegment.startsWith('guide-')) {
              const view = Object.entries(PATH_MAP).find(([_, path]) => path === firstSegment)?.[0] as DashboardView;
              if (view) setDashboardView(view);
            }
          } else {
            setView('signin');
            setDashboardView('Dashboard');
            localStorage.removeItem('lastDashboardView');
          }
        }
      } catch (err) {
        console.error('❌ Error during initAuth:', err);
        setView('signin');
      } finally {
        console.log('🏁 initAuth finished, setting loading to false');
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session?.user?.id);
      
      // SAFEGUARD: Background token refresh should NOT disrupt the user's view
      if (_event === 'TOKEN_REFRESHED' && view === 'dashboard') {
        console.log('🛡️ Token refreshed in background. Dashboard is active, skipping view recalculation.');
        setSession(session);
        return;
      }

      setSession(session);

      if (session) {
        supabase
          .from('profiles')
          .select('status, role, has_seen_welcome')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            console.log('👤 Profile on auth change:', profile);
            console.log('❌ Profile error on auth change:', profileError);

            if (profile) {
              if (profile.role) setSelectedRole(profile.role);
              setInitialStatus(profile.status);
              const targetView = determineView(profile, session);
              console.log('🎯 Auth change - determined view:', targetView);
              
              // Only update if it's a meaningful change or we're not on dashboard
              if (targetView !== view || view !== 'dashboard') {
                setView(targetView);
              }
              localStorage.setItem('user_profile_cache', JSON.stringify(profile));
            } else if (session.user.user_metadata?.role) {
              // SAFEGUARD: Don't bounce to setup if we're already established
              const cachedStr = localStorage.getItem('user_profile_cache');
              const cachedProfile = cachedStr ? JSON.parse(cachedStr) : null;
              
              if (view === 'dashboard' || (cachedProfile && cachedProfile.status?.toLowerCase() === 'active')) {
                 console.log('🛡️ Auth change: profile fetch failed but staying on dashboard (established session).');
                 return;
              }

              setSelectedRole(session.user.user_metadata.role);
              setInitialStatus('Invited');
              setView('complete-profile');
            }
          });
      } else {
        const segments = window.location.pathname.substring(1).split('/');
        const firstSegment = segments[0]?.toLowerCase();
        
        if (firstSegment === 'guide' || (firstSegment && firstSegment.startsWith('guide-'))) {
          setView('dashboard');
          // If it was a guide sub-path, keep it or fallback to main guide
          if (firstSegment !== 'guide') {
            const view = Object.entries(PATH_MAP).find(([_, path]) => path === firstSegment)?.[0] as DashboardView;
            if (view) setDashboardView(view);
            else setDashboardView('Guide');
          } else {
            setDashboardView('Guide');
          }
        } else {
          setView('signin');
          setDashboardView('Dashboard');
          localStorage.removeItem('lastDashboardView');
        }
      }
    });

    const handlePopState = () => {
      const { view, projectId, userId, leadId } = getInitialView();
      setDashboardView(view);
      setSelectedProjectId(projectId);
      setSelectedUserId(userId);
      setSelectedLead(leadId ? { id: leadId } : null);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Persistent Auth Guard for Documentation routes
  useEffect(() => {
    if (!loading && !session && dashboardView.startsWith('Guide') && dashboardView !== 'Guide') {
      updateRoute('Guide');
      setDashboardView('Guide');
    }
  }, [dashboardView, session, loading]);

  useEffect(() => {
    if (view === 'dashboard') {
      const segments = window.location.pathname.substring(1).split('/');
      const firstSegment = segments[0]?.toLowerCase();
      const targetPath = PATH_MAP[dashboardView];

      if (firstSegment !== targetPath || selectedProjectId || selectedUserId || selectedLead) {
        updateRoute(dashboardView, undefined, selectedProjectId, selectedUserId, selectedLead?.id);
      }
    }
  }, [view, dashboardView, selectedProjectId, selectedUserId, selectedLead]);

  const handleSignOut = async () => {
    // Clear all simulation and temporary state to prevent crosstalk
    const keysToRemove = [
      'nova_simulated_role',
      'nova_preview_permissions',
      'temp_selected_role',
      'temp_preview_permissions',
      'nova_onboarding_step',
      'nova_selected_role'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));

    await supabase.auth.signOut();
    setView('signin');

    // Force a reload to ensure all React contexts are completely reset
    window.location.replace('/');
  };

  const handleItemSelect = (item: DashboardView) => {
    if (isSettingsDirty && dashboardView === 'Settings') {
      setPendingProjectId(null);
      return;
    }
    // Auth Guard for Guides
    if (item.startsWith('Guide') && item !== 'Guide' && !session) {
      updateRoute('Guide');
      setDashboardView('Guide');
      return;
    }

    // Special handling for public guide sections
    const guideSections: Record<string, string> = {
      'GuideVideoIntro': 'video-intro',
      'GuideSystemWorks': 'system-works',
      'GuideWorkflowSummary': 'workflow-summary',
      'GuidePaymentOverview': 'payment-overview',
      'GuideJoinDesigner': 'join-designer'
    };

    if (guideSections[item]) {
      if (dashboardView === 'Guide') {
        document.getElementById(guideSections[item])?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setDashboardView('Guide');
        updateRoute('Guide');
        setTimeout(() => {
          document.getElementById(guideSections[item])?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      setDashboardView(item); // Keep it active in sidebar
      return;
    }

    // Update route immediately BEFORE setting state to ensure child components mount with the correct URL context
    updateRoute(item);

    setDashboardView(item);
    setSelectedProjectId(null);
    setSelectedUserId(null);
    setSelectedLead(null);
  };

  const handleProjectOpen = (projectId: string) => {
    if (isSettingsDirty && dashboardView === 'Settings') {
      setPendingProjectId(projectId);
      setPendingView(null);
      return;
    }
    setSelectedProjectId(projectId);
  };

  const renderDirtyModal = () => (
    <Modal
      isOpen={!!pendingView || !!pendingProjectId}
      onClose={() => {
        setPendingView(null);
        setPendingProjectId(null);
      }}
      title="Unsaved Changes"
      size="sm"
      isElevatedFooter
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              settingsRef.current?.discard();
              const nextView = pendingView;
              const nextProject = pendingProjectId;
              setPendingView(null);
              setPendingProjectId(null);
              if (nextView) {
                setDashboardView(nextView);
                setSelectedProjectId(null);
                setSelectedProjectData(null);
                setSelectedUserId(null);
              } else if (nextProject) {
                setDashboardView('Projects');
                setSelectedProjectId(nextProject);
              }
            }}
            className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
          >
            Discard
          </Button>
          <Button
            variant="metallic"
            onClick={async () => {
              await settingsRef.current?.save();
              const nextView = pendingView;
              const nextProject = pendingProjectId;
              setPendingView(null);
              setPendingProjectId(null);
              if (nextView) {
                setDashboardView(nextView);
                setSelectedProjectId(null);
                setSelectedProjectData(null);
                setSelectedUserId(null);
              } else if (nextProject) {
                setDashboardView('Projects');
                setSelectedProjectId(nextProject);
              }
            }}
            className="px-8 shadow-lg shadow-brand-primary/20"
          >
            Save & Continue
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6 animate-pulse">
          <IconSettings className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Wait! You have unsaved changes</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-[280px]">
          You were in the middle of updating your account settings. Would you like to save these changes before leaving?
        </p>
      </div>
    </Modal>
  );


  const renderDashboardContent = () => {
    try {
      if (dashboardView === 'Projects') {
        return (
          <>
            <div className={(selectedProjectId || selectedLead) ? 'hidden' : 'block h-full'}>
              <Projects
                ref={projectsRef}
                onProjectOpen={(id, data) => {
                  setSelectedProjectId(id);
                  setSelectedProjectData(data);
                }}
                onLeadOpen={setSelectedLead}
                isProjectOpen={!!selectedProjectId}
                isLeadOpen={!!selectedLead}
              />
            </div>
            {selectedProjectId && (
              <ProjectDetails
                projectId={selectedProjectId}
                initialData={selectedProjectData}
                onBack={() => {
                  setSelectedProjectId(null);
                  setSelectedProjectData(null);
                }}
                onStatusChange={(newStatus) => {
                  projectsRef.current?.refresh();
                  if (newStatus) projectsRef.current?.switchToStatusTab(newStatus);
                }}
                onIdChange={(oldId, newId) => {
                  setSelectedProjectId(newId);
                  projectsRef.current?.refresh();
                }}
                onUpdate={() => {
                  projectsRef.current?.refresh();
                }}
              />
            )}
            {selectedLead && (
              <LeadDetails 
                lead={selectedLead}
                onBack={() => {
                  setSelectedLead(null);
                  updateRoute('Projects');
                }}
                onUpdate={(newStatus) => {
                  projectsRef.current?.refresh();
                  if (newStatus) {
                    projectsRef.current?.switchToLeadTab(newStatus);
                    setSelectedLead((prev: any) => ({ ...prev, status: newStatus }));
                  }
                }}
              />
            )}
          </>
        );
      }

      switch (dashboardView) {
        case 'Dashboard': return <Dashboard />;
        case 'Tasks': return <Tasks />;
        case 'Analytics': return <Analytics />;
        case 'Leads': return (
          <>
            <div className={selectedLead ? 'hidden' : 'block h-full'}>
              <Leads 
                ref={leadsRef}
                onLeadOpen={setSelectedLead}
                isLeadOpen={!!selectedLead}
              />
            </div>
            {selectedLead && (
              <LeadDetails 
                lead={selectedLead}
                onBack={() => {
                  setSelectedLead(null);
                  updateRoute('Leads');
                }}
                onUpdate={(newStatus) => {
                  leadsRef.current?.refresh();
                  if (newStatus) {
                    leadsRef.current?.switchToStatusTab(newStatus);
                    setSelectedLead((prev: any) => ({ ...prev, status: newStatus }));
                  }
                }}
              />
            )}
          </>
        );
        case 'Finances': return <Finances />;
        case 'Earnings': return <Earnings />;
        case 'Accounts': return <Accounts />;
        case 'ActivityLogs': return <ActivityLogs />;
        case 'Assets': return <Assets />;
        case 'Chats': return <Chats />;
        case 'Users': return (
          <>
            <div className={selectedUserId ? 'hidden' : 'block h-full'}>
              <Users
                ref={usersRef}
                onUserOpen={setSelectedUserId}
                isUserOpen={!!selectedUserId}
              />
            </div>
            {selectedUserId && (
              <UserDetails
                userId={selectedUserId}
                onBack={() => setSelectedUserId(null)}
                onStatusChange={() => usersRef.current?.refresh()}
                onPreviewV2={() => setDashboardView('UserDetailsV2')}
              />
            )}
          </>
        );
        case 'Team': return (
          <>
            <div className={selectedUserId ? 'hidden' : 'block h-full'}>
              <Team
                onUserOpen={setSelectedUserId}
              />
            </div>
            {selectedUserId && (
              <UserDetails
                userId={selectedUserId}
                onBack={() => setSelectedUserId(null)}
                // We don't have a ref for Team yet but it's fine for now
                onStatusChange={() => {}} 
                onPreviewV2={() => setDashboardView('UserDetailsV2')}
              />
            )}
          </>
        );
        case 'UserDetailsV2': return (
          <UserDetailsV2
            userId={selectedUserId || ''}
            onBack={() => setDashboardView('Users')}
            onStatusChange={() => usersRef.current?.refresh()}
          />
        );
        case 'Workload': return <Workload />;
        case 'Tickets': return <CapacityTickets />;
        case 'Channels': return <Channels />;

        case 'Integrations': return <Integrations />;
        case 'Settings': return (
          <Settings
            ref={settingsRef}
            onBack={() => handleItemSelect('Dashboard')}
            onDirtyChange={setIsSettingsDirty}
          />
        );
        case 'Profile': return (
          <Settings
            ref={settingsRef}
            onBack={() => handleItemSelect('Dashboard')}
            onDirtyChange={setIsSettingsDirty}
            profileOnly
          />
        );
        case 'Reminders': return <Reminders />;
        case 'Training': return <Training />;
        case 'MyNotes': return <MyNotes />;
        case 'Notifications': return <Notifications />;
        case 'AlgorithmStudio': return <AlgorithmStudio />;
        case 'LevelsGuide': return <FreelancerLevelsGuide />;
        case 'Applicants': return <Applicants />;
        case 'Guide':
        case 'GuideVideoIntro':
        case 'GuideSystemWorks':
        case 'GuideWorkflowSummary':
        case 'GuidePaymentOverview':
            return <Guide />;
        case 'GuideAddProject': return <GuideAddProject />;
        case 'GuideRemoveProject': return <GuideRemoveProject />;
        case 'GuideMarkCancelled': return <GuideMarkCancelled />;
        case 'GuideMarkApproved': return <GuideMarkApproved />;
        case 'GuideTriggerDispute': return <GuideTriggerDispute />;
        case 'GuideTriggerArtHelp': return <GuideTriggerArtHelp />;
        case 'GuidePostComments': return <GuidePostComments />;
        case 'GuideSendFiles': return <GuideSendFiles />;
        case 'TeamSlabs': return <TeamSlabs />;
        case 'TeamEarnings': return <TeamEarnings />;
        case 'TeamDesignerEarnings': return <TeamDesignerEarnings />;

        default: return <Dashboard />;
      }
    } catch (err) {
      console.error("Dashboard content render error:", err);
      return <div className="p-20 text-center"><h2 className="text-white">Something went wrong</h2><p className="text-gray-500">Please try refreshing the page.</p></div>;
    }
  };

  return (
    <UserProvider>
      <AccountProvider>
        <NotificationProvider>
          {loading ? (
            <div className="min-h-screen bg-surface-bg flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
            </div>
          ) : view === 'dashboard' ? (
            (dashboardView.startsWith('Guide')) ? (
              renderDashboardContent()
            ) : (session) ? (
              <DashboardLayout
                onSignOut={handleSignOut}
                activeItem={dashboardView}
                onItemSelect={handleItemSelect}
                onProjectOpen={handleProjectOpen}
                noPadding={!!selectedProjectId || !!selectedLead}
              >
                {renderDashboardContent()}
              </DashboardLayout>
            ) : (
              <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
                <div className="w-full text-center">
                  <p className="text-gray-400">Redirecting to sign in...</p>
                </div>
              </div>
            )
          ) : (
            <div className="min-h-screen bg-surface-bg flex items-center justify-center p-6">
              <div className="w-full">
                {view === 'terms' ? (
                  <LegalPage title="Terms of Service" onBack={() => setView('signin')} />
                ) : view === 'privacy' ? (
                  <LegalPage title="Privacy Policy" onBack={() => setView('signin')} />
                ) : view === 'signin' ? (
                  <SignInScreen
                    onNavigate={(v) => setView(v)}
                    onSuccess={async () => {
                      const { data: { session: currentSession } } = await supabase.auth.getSession();
                      if (currentSession) {
                        const { data: profile } = await supabase
                          .from('profiles')
                          .select('status, role, has_seen_welcome')
                          .eq('id', currentSession.user.id)
                          .single();

                        if (profile) {
                          if (profile.role) setSelectedRole(profile.role);
                          setInitialStatus(profile.status);
                          setView(determineView(profile, currentSession));
                        } else if (currentSession.user.user_metadata?.role) {
                          setSelectedRole(currentSession.user.user_metadata.role);
                          setInitialStatus('Invited');
                          setView('complete-profile');
                        } else {
                          setDashboardView('Dashboard');
                          setSelectedProjectId(null);
                          setSelectedProjectData(null);
                          setSelectedUserId(null);
                          setView('dashboard');
                        }
                      } else {
                        setView('dashboard');
                      }
                    }}
                  />
                ) : view === 'complete-profile' ? (
                  <CompleteProfile
                    role={selectedRole}
                    initialStatus={initialStatus}
                    onComplete={(isInvited) => {
                      const isAdmin = selectedRole?.toLowerCase() === 'admin' || selectedRole?.toLowerCase() === 'super admin';

                      if (isInvited) {
                        setDashboardView('Dashboard');
                        setSelectedProjectId(null);
                        setSelectedUserId(null);
                        setView('welcome');
                        localStorage.removeItem('nova_onboarding_step');
                        return;
                      }

                      const nextView = isAdmin ? 'dashboard' : 'pending-approval';
                      if (nextView === 'pending-approval') {
                        localStorage.setItem('nova_onboarding_step', 'pending-approval');
                      } else {
                        localStorage.removeItem('nova_onboarding_step');
                      }
                      setView(nextView as any);
                    }}
                    onBack={() => {
                      setView('signin');
                    }}
                  />
                ) : view === 'pending-approval' ? (
                  <PendingApproval
                    role={selectedRole}
                    onSignOut={async () => {
                      localStorage.removeItem('nova_onboarding_step');
                      localStorage.removeItem('nova_selected_role');
                      await supabase.auth.signOut();
                      setView('signin');
                    }}
                  />
                ) : view === 'deactivated' ? (
                  <PendingApproval
                    role={selectedRole}
                    isDeactivated
                    onSignOut={async () => {
                      await supabase.auth.signOut();
                      setView('signin');
                    }}
                  />
                ) : view === 'welcome' ? (
                  <ThanksScreen
                    onDashboard={() => {
                      setDashboardView('Dashboard');
                      setView('dashboard');
                    }}
                  />
                ) : (
                  <SignInScreen
                    onNavigate={(v) => setView(v)}
                    onSuccess={() => setView('dashboard')}
                  />
                )}
              </div>
            </div>
          )}
          <ReminderOverlay />
          <ToastContainer />
          {view === 'dashboard' && pendingView && renderDirtyModal()}
          <AiAgent />
          {view === 'dashboard' && <AttendanceTracker />}
        </NotificationProvider>
      </AccountProvider>
    </UserProvider>
  );
};

export default App;
