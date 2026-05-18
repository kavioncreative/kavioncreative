import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { trackUserAction } from "../utils/scorecardTracking";
import Button from "../components/Button";
import {
  IconChevronLeft,
  IconLayoutSidebar,
  IconBriefcase,
  IconClock,
  IconUser,
  IconCreditCard,
  IconAlertTriangle,
  IconPaperclip,
  IconSend,
  IconCheckCircle,
  IconMoreVertical,
  IconX,
  IconFile,
  IconFileImage,
  IconFileText,
  IconChartBar,
  IconFileVideo,
  IconFileArchive,
  IconDownload,
  IconLink,
  IconRefreshCw,
  IconChevronRight,
  IconCalendar,
  IconStar,
  IconEdit,
  IconSave,
  IconUsers,
  IconTrash,
  IconPlus,
  IconLock,
  IconTag,
  IconReply,
  IconEye,
  IconMessageSquare,
  IconCheck,
  IconPhotoOff,
  IconCloudUpload,
  IconSearch,
} from "../components/Icons";
import { LabelManagerModal } from "../components/LabelManagerModal";
import { formatDeadlineDate, formatTime, getTimeLeft, formatDisplayName, truncateByWords } from '../utils/formatter';
import { Countdown } from '../components/Countdown';
import { Calendar } from '../components/Calendar';
import { DatePicker } from "../components/DatePicker";
import { TimeSelect } from "../components/TimeSelect";
import { ElevatedMetallicCard } from "../components/ElevatedMetallicCard";
import { Dropdown } from "../components/Dropdown";
import { Input, TextArea } from "../components/Input";
import { Modal } from "../components/Surfaces";
import { addToast } from "../components/Toast";
import { useNotifications } from "../contexts/NotificationContext";
import { useUser } from "../contexts/UserContext";
import { Avatar } from "../components/Avatar";
import { useAccounts } from "../contexts/AccountContext";
import { getStatusCapsuleClasses, getRoleCapsuleClasses } from "../components/Badge";
import { Checkbox } from "../components/Selection";
import ReactMarkdown from "react-markdown";
// Imports moved to utils/markdown.tsx

import {
  markdownPlugins,
  markdownComponents,
  parseCodesLogicMarkdown,
} from "../utils/markdown";
import { uploadFile } from "../utils/storage";

// Re-exporting from markdown utility for any legacy components although prefer direct imports
export { markdownPlugins, markdownComponents, parseCodesLogicMarkdown };

interface ProjectDetailsProps {
  projectId: string;
  initialData?: any;
  onBack: () => void;
  onStatusChange?: (newStatus: string) => void;
  onIdChange?: (oldId: string, newId: string) => void;
  onUpdate?: () => void;
}

// Helper for dynamic status styles driven by CodesLogic tokens

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />
);

const SafeImage = ({
  src,
  alt,
  className,
  style,
  onError
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: (e: any) => void;
}) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(() => {
    if (!src) return null;
    // FAST PATH: If image is a reasonably sized data URI, use it immediately for 'instant' feel
    // Threshold: 1.5MB (approx 2M chars in Base64)
    if (src.startsWith('data:') && src.length < 2000000) return src;

    // SLOW PATH: If it's a giant Data URI, wait for conversion to avoid browser hang
    if (src.startsWith('data:')) return null;

    return src.replace(/([^:])\/\//g, '$1/');
  });

  useEffect(() => {
    // If we've already set the displayUrl in fast path, no need to convert
    if (displayUrl && displayUrl.startsWith('data:')) return;

    let currentBlobUrl: string | null = null;

    const convertToBlob = async () => {
      if (src && src.startsWith('data:')) {
        try {
          const parts = src.split(',');
          if (parts.length < 2) throw new Error('Invalid');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';

          let b64 = parts[1].replace(/[^A-Za-z0-9+/]/g, '');
          while (b64.length % 4 !== 0) b64 += '=';

          const bstr = atob(b64);
          const u8arr = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }

          const blob = new Blob([u8arr], { type: mime });
          currentBlobUrl = URL.createObjectURL(blob);
          setDisplayUrl(currentBlobUrl);
        } catch (err) {
          if (src.length < 100000) {
            try {
              const response = await fetch(src);
              const blob = await response.blob();
              currentBlobUrl = URL.createObjectURL(blob);
              setDisplayUrl(currentBlobUrl);
              return;
            } catch (e) { }
          }
          console.warn("Image repair failed for:", alt);
          setDisplayUrl("FAILED");
        }
      } else {
        setDisplayUrl(src ? src.replace(/([^:])\/\//g, '$1/') : null);
      }
    };

    convertToBlob();
    return () => {
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    };
  }, [src, displayUrl]);

  if (displayUrl === "FAILED") {
    return (
      <div className={`flex flex-col items-center justify-center bg-white/5 rounded-lg border border-white/10 ${className}`} style={style}>
        <IconPhotoOff size={24} className="text-white/20" />
      </div>
    );
  }

  if (!displayUrl && src && src.startsWith('data:')) {
    // Return a skeleton while converting
    // Adding min-h-64 ensures the container doesn't collapse to 0 height in modals
    return (
      <div
        className={`bg-white/5 rounded-lg animate-pulse flex items-center justify-center min-h-[300px] w-full ${className}`}
        style={style}
      >
        <div className="w-10 h-10 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={displayUrl || undefined}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        if (displayUrl && displayUrl.startsWith('blob:')) {
          console.error("Blob URL failed to render:", displayUrl);
        }
        onError?.(e);
      }}
    />
  );
};

const ZoomableImage = React.memo(
  ({
    url,
    alt,
    isRequestingChanges,
  }: {
    url: string;
    alt: string;
    isRequestingChanges: boolean;
  }) => {
    const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleNativeWheel = (e: WheelEvent) => {
        if (e.ctrlKey) return;
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;

        setZoomState((prev) => {
          const newScale = Math.min(Math.max(prev.scale * zoomFactor, 1), 15);
          if (newScale === prev.scale) return prev;

          const scaleRatio = newScale / prev.scale;
          return {
            scale: newScale,
            x: newScale <= 1 ? 0 : mouseX - (mouseX - prev.x) * scaleRatio,
            y: newScale <= 1 ? 0 : mouseY - (mouseY - prev.y) * scaleRatio,
          };
        });
      };

      container.addEventListener("wheel", handleNativeWheel, {
        passive: false,
      });
      return () => container.removeEventListener("wheel", handleNativeWheel);
    }, [url]);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (zoomState.scale <= 1) return;
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;

      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      // Throttled update for maximum smoothness
      requestAnimationFrame(() => {
        if (!isDraggingRef.current) return;
        setZoomState((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }));
      });
    };

    const [hasError, setHasError] = useState(false);
    const [displayUrl, setDisplayUrl] = useState(url);

    useEffect(() => {
      setHasError(false);
    }, [url]);

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    if (hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-brand-error/20 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-brand-error/10 flex items-center justify-center text-brand-error">
            <IconAlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Image Failed to Load</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              This could be due to a network issue or a missing file in storage.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setHasError(false); }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Retry
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`flex-1 flex items-center justify-center bg-black/20 rounded-2xl border border-white/[0.05] p-2 overflow-hidden shadow-inner relative transition-all duration-500 ${isRequestingChanges ? "lg:w-[60%]" : "w-full"} ${zoomState.scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={() => setZoomState({ scale: 1, x: 0, y: 0 })}
      >
        <SafeImage
          src={url}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none pointer-events-none"
          onError={() => {
            console.error("ZoomableImage failed to load:", url);
            setHasError(true);
          }}
          style={{
            transform: `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
            transition: isDraggingRef.current
              ? "none"
              : "transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)",
          }}
        />
      </div>
    );
  },
);

const formatLegacyInstruction = (text: string) => {
  if (
    !text ||
    !text.includes("If it's Initial Delivery") ||
    text.includes("- Logo Options Sheet")
  )
    return text;

  return text
    .replace(
      /If it's Initial Delivery, please upload:/g,
      "**If it's Initial Delivery, please upload:**",
    )
    .replace(
      /If it's a Revision, please upload:/g,
      "**If it's a Revision, please upload:**",
    )
    .replace(
      /Logo Options Sheet – PNG format/g,
      "- Logo Options Sheet – PNG format",
    )
    .replace(
      /Presentation of Each Option – PNG format/g,
      "- Presentation of Each Option – PNG format",
    )
    .replace(/Source File – AI format/g, "- Source File – AI format")
    .replace(
      /ZIP file \(must include all the above files\)/g,
      "- ZIP file (must include all the above files)",
    )
    .replace(
      /Note: Submitting only a ZIP file without the individual files is not allowed and will not be accepted. Thank you!/g,
      "**Note: Submitting only a ZIP file without the individual files is not allowed and will not be accepted. Thank you!**",
    );
};

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  projectId,
  initialData,
  onBack,
  onStatusChange,
  onIdChange,
  onUpdate,
}) => {
  const [project, setProject] = useState<any>(() => {
    if (
      initialData &&
      (initialData.id === projectId || initialData.project_id === projectId)
    ) {
      return initialData;
    }

    const idKey = projectId.replace(/-/g, " ");
    // 1. Try to find the exact full project from its dedicated cache for 0ms loads
    const detailCache = localStorage.getItem(`nova_project_detail_${idKey}`);
    if (detailCache) return JSON.parse(detailCache);

    // 2. Fallback to basic tabular cache to avoid blank titles
    const cachedProjects = localStorage.getItem("nova_projects_cache");
    if (cachedProjects) {
      const projects = JSON.parse(cachedProjects);
      return (
        projects.find((p: any) => p.id === projectId || p.id === idKey) || null
      );
    }
    return null;
  });
  const canonicalId = project?.project_id || project?.id || projectId;
  const [isProjectLoading, setIsProjectLoading] = useState(() => {
    if (project && "brief" in project && project.brief) return false;
    return true;
  });
  const [isCommentsLoading, setIsCommentsLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);
  const [deadlineType, setDeadlineType] = useState<"assignee" | "client">(
    "assignee",
  );
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalTime, setModalTime] = useState("17:00");
  const [activeShortcut, setActiveShortcut] = useState<number | null>(null);
  const [timelineComments, setTimelineComments] = useState<any[]>([]);
  const [qaComments, setQaComments] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]); // Current active list for rendering
  const [contextComments, setContextComments] = useState<any[]>([]); // Full history for Revision Context modal

  const [replyTo, setReplyTo] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // On mobile screens, the sidebar should NEVER start collapsed (2px lines)
    if (typeof window !== "undefined" && window.innerWidth < 1024) return false;
    return true;
  });
  const [currentRole, setCurrentRole] = useState("Project Manager");
  const [timelineHasMore, setTimelineHasMore] = useState(false);
  const [qaHasMore, setQaHasMore] = useState(false);
  const [hasMore, setHasMore] = useState(false); // Current active hasMore state
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const { addNotification } = useNotifications();
  const { profile, effectiveRole } = useUser();
  const userRole = effectiveRole?.toLowerCase().trim() || "";
  const isAdmin = userRole === "super admin" || userRole === "admin";
  const isProjectManagerOnly = userRole === "project manager";
  const isDesignTeam =
    userRole === "freelancer" ||
    userRole === "team lead" ||
    userRole === "team designer";
  const isProjectManager =
    userRole.includes("manager") ||
    userRole.includes("admin") ||
    userRole.includes("operations");
  const isFreelancer =
    userRole === "freelancer" ||
    userRole === "team lead" ||
    userRole === "team designer";

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const { hasPermission } = useUser();
  const canEdit = isAdmin || userRole === "project manager";
  const { accounts } = useAccounts();

  // Review & View State
  const [viewMode, setViewMode] = useState<"timeline" | "review">("timeline");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [revieweeAvatarUrl, setRevieweeAvatarUrl] = useState<string | null>(
    null,
  );
  const [activityTab, setActivityTab] = useState<"timeline" | "qa" | "discussion">("timeline");
  const [discussionComments, setDiscussionComments] = useState<any[]>([]);
  const [discussionHasMore, setDiscussionHasMore] = useState(false);
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isQaActionLoading, setIsQaActionLoading] = useState(false);
  const [teamProfileData, setTeamProfileData] = useState<
    Record<string, { avatar_url?: string; phone?: string }>
  >({});
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [projectTeammates, setProjectTeammates] = useState<any[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"metadata" | "brief">(
    "metadata",
  );
  const [teamDesigners, setTeamDesigners] = useState<any[]>([]);
  const isTeamLead =
    userRole === "team lead" || profile?.role?.toLowerCase() === "team lead";
  const isTeamDesigner =
    userRole === "team designer" ||
    profile?.role?.toLowerCase() === "team designer";

  // QA Submission Modal State
  const [isSubmitQaModalOpen, setIsSubmitQaModalOpen] = useState(false);
  const [qaLogos, setQaLogos] = useState<any[]>([]);
  const [isQaUploading, setIsQaUploading] = useState(false);

  // Brief File Upload State
  const [isBriefUploading, setIsBriefUploading] = useState(false);
  const isAnyUploading = isBriefUploading || isPostingComment || isQaUploading;
  const briefFileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Label Management State
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name: string;
    id?: string;
    category?: string;
    is_approved?: boolean;
    type?: string;
  } | null>(null);
  const [qaFeedbackText, setQaFeedbackText] = useState("");
  const [isQaFeedbackLoading, setIsQaFeedbackLoading] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  
  // Art Help & Dispute States
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({ 
    type: 'arthelp' as 'arthelp' | 'dispute', 
    reason: '', 
    message: '', 
    resolverId: '' 
  });
  const [isSolveModalOpen, setIsSolveModalOpen] = useState(false);
  const [solveForm, setSolveForm] = useState({
    action: 'reassign' as 'reassign' | 'upload',
    reassignTo: '',
    files: [] as any[],
    step: 1
  });

  const reassignmentOptions = useMemo(() => {
    const combined = [...teamDesigners, ...freelancers, ...managers];
    
    // Deduplicate by ID
    const uniqueUsers = Array.from(
      new Map(combined.map(u => [u.id || u.member_id, u])).values()
    );

    return uniqueUsers
      .filter(u => {
        const r = (u.role || "").toLowerCase();
        return r.includes('admin') || r.includes('lead') || r.includes('freelancer');
      })
      .map(u => ({ 
        label: u.name, 
        description: u.role, 
        descriptionClassName: getRoleCapsuleClasses(u.role),
        value: u.id || u.member_id 
      }));
  }, [teamDesigners, freelancers, managers]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAlertActionLoading, setIsAlertActionLoading] = useState(false);
  const [resolvers, setResolvers] = useState<any[]>([]);

  // Fetch teammates (other members of the primary manager's teams)
  useEffect(() => {
    const fetchTeammates = async () => {
      if (!project?.primary_manager_id) return;

      try {
        // 1. Get the primary manager's team IDs
        const { data: userTeams } = await supabase
          .from("team_members")
          .select("team_id")
          .eq("member_id", project.primary_manager_id);

        if (userTeams && userTeams.length > 0) {
          const teamIds = userTeams.map((t) => t.team_id);

          // 2. Fetch all members of these teams
          const { data: members } = await supabase
            .from("team_members")
            .select("profiles(id, name, role, phone)")
            .in("team_id", teamIds)
            .neq("member_id", project.primary_manager_id);

          if (members) {
            const uniqueMembers = Array.from(
              new Map(
                members
                  .filter((m: any) => m.profiles)
                  .map((m: any) => [
                    m.profiles.id,
                    {
                      id: m.profiles.id,
                      name: m.profiles.name,
                      role: m.profiles.role,
                    },
                  ]),
              ).values(),
            );
            setProjectTeammates(uniqueMembers);
          }
        }
      } catch (err) {
        console.error("Error fetching teammates:", err);
      }
    };
    fetchTeammates();
  }, [project?.primary_manager_id]);

  // Fetch team designers if user is a Team Lead or the project PM
  useEffect(() => {
    const fetchTeamDesigners = async () => {
      if (!profile?.id) return;

      // Only fetch if Team Lead OR PM is viewing
      if (!isTeamLead && !isProjectManager) return;

      try {
        if (isAdmin || isProjectManager) {
          // Admins/PMs see ALL designers to allow cross-team assignment
          const { data: allDesigners } = await supabase
            .from("profiles")
            .select("id, name, phone, role")
            .filter("role", "in", '("Team Designer","Freelancer","Designer","Graphic Designer","team designer","freelancer","designer","graphic designer")');
          
          if (allDesigners) {
            setTeamDesigners(allDesigners);
            return;
          }
        }

        const { data: teams } = await supabase
          .from("teams")
          .select("id")
          .eq("leader_id", profile.id);

        if (teams && teams.length > 0) {
          const teamIds = teams.map((t) => t.id);

          const { data: members } = await supabase
            .from("team_members")
            .select("profiles(id, name, role)")
            .in("team_id", teamIds);

          if (members) {
            const uniqueDesigners = Array.from(
              new Map(
                members
                  .filter(
                    (m: any) => m.profiles && m.profiles.id !== profile.id,
                  )
                  .map((m: any) => [m.profiles.id, m.profiles]),
              ).values(),
            );
            setTeamDesigners(uniqueDesigners);
          }
        }
      } catch (err) {
        console.error("Error fetching team designers:", err);
      }
    };
    fetchTeamDesigners();
  }, [isTeamLead, isProjectManager, profile?.id]);

  // MARK AS READ EFFECT
  useEffect(() => {
    if (profile?.id && canonicalId) {
      const markAsRead = async () => {
        try {
          await supabase.from("project_read_states").upsert({
            user_id: profile.id,
            project_id: canonicalId,
            last_read_at: new Date().toISOString(),
          }, { onConflict: 'user_id,project_id' });
        } catch (err) {
          console.error("Error marking project as read:", err);
        }
      };
      markAsRead();
    }
  }, [profile?.id, canonicalId]);

  const [teamDesignerProfile, setTeamDesignerProfile] = useState<any>(null);

  useEffect(() => {
    const designerId = project?.team_designer_id;
    if (designerId) {
      const fetchDesigner = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("name, phone, avatar_url")
          .eq("id", designerId)
          .maybeSingle();
        if (data) setTeamDesignerProfile(data);
      };
      fetchDesigner();
    } else {
      setTeamDesignerProfile(null);
    }
  }, [project?.team_designer_id]);

  // Aggregate all collaborators: Explicitly assigned + Team members
  const allCollaborators = useMemo(() => {
    const collaborators = project?.collaborators || [];
    const teammates = projectTeammates.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role || "Member",
      phone: t.phone,
    }));

    const seen = new Set();
    const result: any[] = [];

    // Exclude the Primary Manager from the collaborators list to avoid redundancy
    if (project?.primary_manager_id) seen.add(project.primary_manager_id);
    if (project?.primary_manager?.name) seen.add(project.primary_manager.name);

    // Priority 1: Explicitly assigned collaborators
    collaborators.forEach((c: any) => {
      const key = c.id || c.name;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    });

    // Priority 2: Other members from the primary manager's team
    teammates.forEach((t) => {
      const key = t.id || t.name;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(t);
      }
    });

    return result;
  }, [project?.collaborators, projectTeammates]);

  // Fetch profile data (avatars & phones) for all team members mentioned in project
  useEffect(() => {
    const fetchTeamProfileData = async () => {
      if (!project) return;
      const names = new Set<string>();
      if (project.assignee) names.add(project.assignee);
      if (project.primary_manager?.name)
        names.add(project.primary_manager.name);

      // Use unified allCollaborators list
      allCollaborators.forEach((c: any) => {
        if (c.name) names.add(c.name);
      });

      // Add Team Designer manually extracted if found via any source
      const tdObj = Array.isArray(project?.team_designer) ? project.team_designer[0] : project?.team_designer;
      if (tdObj?.name) names.add(tdObj.name);
      if (teamDesignerProfile?.name) names.add(teamDesignerProfile.name);

      const tdCollab = project?.collaborators?.find((c: any) => 
        c.name !== project?.assignee && 
        c.name !== project?.primary_manager?.name && 
        !c.role?.toLowerCase()?.includes('admin') &&
        !c.role?.toLowerCase()?.includes('manager')
      );
      if (tdCollab?.name) names.add(tdCollab.name);

      if (names.size === 0) return;

      const nameList = Array.from(names);
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url, phone")
        .in("name", nameList);

      if (data) {
        const map: Record<string, { avatar_url?: string; phone?: string }> = {};
        data.forEach((p) => {
          map[p.name] = {
            avatar_url: p.avatar_url || undefined,
            phone: p.phone || undefined,
          };
        });
        setTeamProfileData((prev) => ({ ...prev, ...map }));
      }
    };
    fetchTeamProfileData();
  }, [project?.project_id, allCollaborators]);

  // Auto-set viewMode to review if approved
  useEffect(() => {
    if (project?.status?.toLowerCase().includes("approved")) {
      setViewMode("review");
    } else {
      setViewMode("timeline");
    }
  }, [project?.status]);

  // Fetch reviewee avatar when project is approved
  useEffect(() => {
    const fetchRevieweeAvatar = async () => {
      if (!project?.status?.toLowerCase().includes("approved")) return;
      const targetName = isFreelancer
        ? project?.primary_manager?.name
        : project?.assignee;
      if (!targetName) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .or(`name.eq."${targetName}",email.eq."${targetName}"`)
        .maybeSingle();
      if (data?.avatar_url) setRevieweeAvatarUrl(data.avatar_url);
    };
    fetchRevieweeAvatar();
  }, [
    project?.status,
    project?.assignee,
    project?.primary_manager?.name,
    isFreelancer,
  ]);

  // Check for existing review and fetch all reviews for admins
  useEffect(() => {
    const fetchReviews = async () => {
      if (
        !profile?.id ||
        !canonicalId ||
        !project?.status?.toLowerCase().includes("approved")
      )
        return;

      const isAdmin = ["Super Admin", "Admin"].includes(profile.role);
      setIsReviewsLoading(true);

      // 1. Fetch ALL reviews for the project if Admin
      if (isAdmin) {
        const { data: multipleReviews } = await supabase
          .from("project_reviews")
          .select("*")
          .eq("project_id", canonicalId)
          .order("created_at", { ascending: true });

        if (multipleReviews && multipleReviews.length > 0) {
          const reviewerIds = multipleReviews
            .map((r: any) => r.reviewer_id)
            .filter(Boolean);
          const reviewerNames = multipleReviews
            .map((r: any) => r.reviewer_name)
            .filter(Boolean);

          // Fetch profiles by ID OR Name for maximum robustness
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .or(
              `id.in.(${reviewerIds.map((id) => `"${id}"`).join(",")}),name.in.(${reviewerNames.map((name) => `"${name}"`).join(",")})`,
            );

          // Create lookup maps
          const avatarMapById = new Map();
          const avatarMapByName = new Map();
          profileData?.forEach((p) => {
            if (p.id) avatarMapById.set(p.id, p.avatar_url);
            if (p.name) avatarMapByName.set(p.name, p.avatar_url);
          });

          // Merge avatars into reviews
          const reviewsWithAvatars = multipleReviews.map((rev: any) => ({
            ...rev,
            avatar_url:
              avatarMapById.get(rev.reviewer_id) ||
              avatarMapByName.get(rev.reviewer_name),
          }));

          setAllReviews(reviewsWithAvatars);
        } else if (multipleReviews) {
          setAllReviews(multipleReviews);
        }
      }

      // 2. Check for current user's review
      const { data, error } = await supabase
        .from("project_reviews")
        .select("*")
        .eq("project_id", canonicalId)
        .eq("reviewer_id", profile.id)
        .maybeSingle();

      if (!error && data) {
        setExistingReview(data);
        setRating(data.rating);
        setReviewText(data.review_text);
        setReviewSubmitted(true);
      }
      setIsReviewsLoading(false);
    };
    fetchReviews();
  }, [canonicalId, profile?.id, project?.status, profile?.role]);

  // Sync role from profile
  useEffect(() => {
    if (profile?.role) {
      setCurrentRole(profile.role);
    }
  }, [profile]);

  // Fetch lists for editing
  useEffect(() => {
    const fetchEditLists = async () => {
      if (!canEdit) return;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, role, avatar_url, phone, status")
        .eq("status", "Active")
        .order("name");
      if (profiles) {
        setAllProfiles(profiles);
        setManagers(
          profiles.filter(
            (p) =>
              p.role?.toLowerCase().includes("manager") ||
              p.role?.toLowerCase().includes("admin") ||
              p.role?.toLowerCase().includes("operations"),
          ),
        );
        setFreelancers(
          profiles.filter((p) => {
            const role = p.role?.toLowerCase() || "";
            return (
              role.includes("freelancer") ||
              role.includes("designer") ||
              role.includes("presentation") ||
              role.includes("team lead") ||
              role.includes("team designer") ||
              role.includes("super admin")
            );
          }),
        );
      }
    };
    fetchEditLists();
  }, [canEdit]);

  const startEditing = () => {
    if (!project) return;
    setEditState({
      project_id: project?.project_id || "",
      project_title: project?.project_title || "",
      options_required: project?.options_required ?? 1,
      client_name: project?.client_name || "",
      assignee: project?.assignee || "",
      primary_manager_id: project?.primary_manager_id || null,
      collaborators: [...(project?.collaborators || [])],
      addons: project?.addons || [],
      brief: project?.brief || "",
      price: project?.price || 0,
      account_id: project?.account_id || null,
      order_type: project?.order_type || "Direct Order",
      client_type: project?.client_type || "new",
      converted_by: project?.converted_by || null,
      attachments: [...(project?.attachments || [])],
      team_designer_id: project?.team_designer_id || null,
      assignee_id: project?.assignee_id || null,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editState || isSaving) return;
    setIsSaving(true);

    try {
      const originalId = project.project_id;
      const selectedAccount = accounts.find(
        (a) => a.id === editState.account_id,
      );
      const updates: any = {
        project_title: editState.project_title,
        options_required: editState.options_required,
        client_name: editState.client_name,
        assignee: editState.assignee,
        primary_manager_id: editState.primary_manager_id || null,
        account_id: editState.account_id || null,
        account: selectedAccount?.name || project.account,
        addons: editState.addons,
        brief: editState.brief,
        price: editState.price,
        order_type: editState.order_type,
        client_type: editState.client_type,
        converted_by:
          editState.order_type === "Query"
            ? editState.converted_by || null
            : null,
        attachments: editState.attachments,
        team_designer_id: editState.team_designer_id || null,
        assignee_id: editState.assignee_id || null,
        updated_at: new Date().toISOString(),
      };

      // Only include project_id in updates if it has actually changed to avoid
      // unnecessary foreign key constraint checks that lack ON UPDATE CASCADE
      if (editState.project_id !== originalId) {
        updates.project_id = editState.project_id;
      }

      // 1. Update Project
      const { error: projectError } = await supabase
        .from("projects")
        .update(updates)
        .eq("project_id", originalId);

      if (projectError) throw projectError;

      // 2. Sync Collaborators
      // Delete existing relations
      await supabase
        .from("project_collaborators")
        .delete()
        .eq("project_id", editState.project_id);

      // Insert new ones (Clean duplicates and filter invalid IDs)
      if (editState.collaborators.length > 0) {
        const uniqueCollabs = Array.from(
          new Map(
            editState.collaborators
              .filter(
                (c: any) =>
                  c.id &&
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    c.id,
                  ),
              )
              .map((c: any) => [c.id, c]),
          ).values(),
        );

        const collabInserts = uniqueCollabs.map((c: any) => ({
          project_id: editState.project_id,
          member_id: c.id,
        }));

        if (collabInserts.length > 0) {
          const { error: collabError } = await supabase
            .from("project_collaborators")
            .insert(collabInserts);
          if (collabError) {
            console.error("Collaborator Sync Error:", collabError);
            // We continue if collaborators fail, to at least save the project details
          }
        }
      }

      // 3. Log what changed (Quiet Logging)
      const changes: string[] = [];

      // Normalize values for comparison
      const oldTitle = project.project_title || "";
      const newTitle = editState.project_title || "";
      const oldPM = project.primary_manager_id || null;
      const newPM = editState.primary_manager_id || null;
      const oldAssignee = project.assignee || "Unassigned";
      const newAssignee = editState.assignee || "Unassigned";
      const oldPrice = Number(project.price) || 0;
      const newPrice = Number(editState.price) || 0;
      const oldOptions = project.options_required ?? 1;
      const newOptions = editState.options_required ?? 1;
      const oldClient = project.client_name || "";
      const newClient = editState.client_name || "";

      const oldBrief = (project.brief || "").trim();
      const newBrief = (editState.brief || "").trim();

      const oldOrderType = project.order_type || "Direct Order";
      const newOrderType = editState.order_type || "Direct Order";
      const oldClientType = project.client_type || "new";
      const newClientType = editState.client_type || "new";

      const oldConvertedBy = project.converted_by || null;
      const newConvertedBy = editState.converted_by || null;

      if (originalId !== editState.project_id)
        changes.push(`ID: ${originalId} → ${editState.project_id}`);
      if (oldTitle !== newTitle)
        changes.push(`Title: ${oldTitle} → ${newTitle}`);
      if (oldClient !== newClient)
        changes.push(`Client: ${oldClient} → ${newClient}`);
      if (oldOptions !== newOptions)
        changes.push(`Options: ${oldOptions} → ${newOptions}`);
      if (oldAssignee !== newAssignee)
        changes.push(`Assignee: ${oldAssignee} → ${newAssignee}`);

      if (oldPM !== newPM) {
        const newManagerName =
          managers.find((m) => m.id === newPM)?.name || "Support";
        const oldManagerName =
          managers.find((m) => m.id === oldPM)?.name || "Support";
        changes.push(`PM: ${oldManagerName} → ${newManagerName}`);
      }

      if (oldPrice !== newPrice)
        changes.push(`Budget: $${oldPrice} → $${newPrice}`);
      if (oldBrief !== newBrief) changes.push(`Brief: Changed`);
      if (oldOrderType !== newOrderType)
        changes.push(`Order Type: ${oldOrderType} → ${newOrderType}`);
      if (oldClientType !== newClientType)
        changes.push(`Client Type: ${oldClientType} → ${newClientType}`);
      if (oldConvertedBy !== newConvertedBy) {
        const oldConvName =
          managers.find((m) => m.id === oldConvertedBy)?.name || "None";
        const newConvName =
          managers.find((m) => m.id === newConvertedBy)?.name || "None";
        changes.push(`Converted By: ${oldConvName} → ${newConvName}`);
      }

      if (changes.length > 0) {
        const userName = profile?.name || "System";
        const logContent = `[${userName}] updated: ${changes.join(" | ")}`;

        await supabase.from("project_comments").insert({
          project_id: editState.project_id,
          content: logContent,
          author_name: userName,
          author_role: "system_log",
        });
      }

      // 4. Update UI & Local Cache/Parent
      if (originalId !== editState.project_id && onIdChange) {
        onIdChange(originalId, editState.project_id);
      }
      await fetchProject(editState.project_id);
      await fetchComments(editState.project_id);
      if (onUpdate) onUpdate();
      setIsEditing(false);
      addToast({
        title: "Success",
        message: "Project details and financial links synced successfully",
        type: "success",
      });
    } catch (err: any) {
      console.error("Error saving project:", err);
      addToast({
        title: "Error",
        message: err.message || "Failed to update project",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };
  interface Attachment {
    file: File;
    id: string;
    status: "uploading" | "success" | "error";
    previewUrl?: string;
  }

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Grouping files into local structure
      const newFiles: Attachment[] = files.map((file: File) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: "uploading" as const,
      }));

      setAttachments((prev) => [...prev, ...newFiles]);

      // Upload each file and update state
      const uploadPromises = newFiles.map(async (att) => {
        try {
          const uploaded = await uploadFile(att.file);
          setAttachments((prev) =>
            prev.map((p) =>
              p.id === att.id
                ? { ...p, status: "success", previewUrl: uploaded.url, url: uploaded.url } as any
                : p,
            ),
          );
        } catch (err) {
          console.error("Upload error for file:", att.file.name, err);
          setAttachments((prev) =>
            prev.map((p) =>
              p.id === att.id ? { ...p, status: "error" } as any : p,
            ),
          );
        }
      });

      await Promise.all(uploadPromises);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBriefFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsBriefUploading(true);
    const newFiles = Array.from(e.target.files);
    const successfulUploads: any[] = [];
    const errors: string[] = [];

    try {
      for (const file of newFiles) {
        try {
          const uploaded = await uploadFile(file);
          successfulUploads.push(uploaded);
        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err);
          errors.push(file.name);
        }
      }

      if (successfulUploads.length > 0) {
        setEditState((prev: any) => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...successfulUploads],
        }));

        addToast({
          title: "Upload Successful",
          message: `${successfulUploads.length} file(s) uploaded successfully`,
          type: "success",
        });
      }

      if (errors.length > 0) {
        addToast({
          title: "Partial Success",
          message: `Failed to upload: ${errors.join(", ")}`,
          type: "error",
        });
      }
    } catch (err: any) {
      console.error("Critical error uploading brief files:", err);
      addToast({
        title: "Upload Error",
        message: err.message || "Failed to process uploads",
        type: "error",
      });
    } finally {
      setIsBriefUploading(false);
      if (briefFileInputRef.current) briefFileInputRef.current.value = "";
    }
  };

  const removeBriefFile = (index: number) => {
    setEditState((prev: any) => ({
      ...prev,
      attachments: prev.attachments.filter((_: any, i: number) => i !== index),
    }));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      const removed = newAttachments.splice(index, 1)[0];
      if (removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return newAttachments;
    });
  };

  const fetchComments = async (
    targetId?: string,
    forceTab?: "timeline" | "qa" | "discussion",
  ) => {
    const idToUse = targetId || project?.project_id;
    if (!idToUse) return;

    const activeMode = forceTab || activityTab;

    try {
      let query = supabase
        .from("project_comments")
        .select("*, parent:parent_id(id, content, author_name)")
        .eq("project_id", idToUse);

      // Category-based filtering
      if (activeMode === "discussion") {
        query = query.eq("category", "discussion");
      } else if (activeMode === "qa") {
        query = query.eq("is_internal", true);
      } else {
        // Timeline: official comments only, exclude explicit discussion/internal items
        query = query.eq("is_internal", false).neq("category", "discussion");
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error && data) {
        let finalComments = [];
        let finalHasMore = false;

        if (data.length > 3) {
          finalHasMore = true;
          const visibleComments = data.slice(0, 3);
          finalComments = visibleComments.reverse();
        } else {
          finalHasMore = false;
          finalComments = [...data].reverse();
        }

        if (activeMode === "timeline") {
          setTimelineComments(finalComments);
          setTimelineHasMore(finalHasMore);
        } else if (activeMode === "qa") {
          setQaComments(finalComments);
          setQaHasMore(finalHasMore);
        } else {
          setDiscussionComments(finalComments);
          setDiscussionHasMore(finalHasMore);
        }
      } else if (error) {
        console.error("fetchComments error:", error);
      }
    } catch (err) {
      console.error("fetchComments critical error:", err);
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const fetchOlderComments = async () => {
    if (isLoadingOlder || activeComments.length === 0 || !project?.project_id) return;
    setIsLoadingOlder(true);

    // Get the timestamp of the oldest comment we currently have
    const oldestTimestamp = activeComments[0].created_at;

    try {
      let query = supabase
        .from("project_comments")
        .select("*, parent:parent_id(id, content, author_name)")
        .eq("project_id", project.project_id)
        .lt("created_at", oldestTimestamp);

      // Category-based filtering
      if (activityTab === "discussion") {
        query = query.eq("category", "discussion");
      } else if (activityTab === "qa") {
        query = query.eq("is_internal", true);
      } else {
        query = query.eq("is_internal", false).neq("category", "discussion");
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(7);

      if (!error && data) {
        let nextComments = [];
        let nextHasMore = false;

        if (data.length > 6) {
          nextHasMore = true;
          const newBatch = data.slice(0, 6);
          nextComments = newBatch.reverse();
        } else {
          nextHasMore = false;
          nextComments = data.reverse();
        }

        if (activityTab === "timeline") {
          const updated = [...nextComments, ...timelineComments];
          setTimelineComments(updated);
          setTimelineHasMore(nextHasMore);
        } else if (activityTab === "qa") {
          const updated = [...nextComments, ...qaComments];
          setQaComments(updated);
          setQaHasMore(nextHasMore);
        } else {
          const updated = [...nextComments, ...discussionComments];
          setDiscussionComments(updated);
          setDiscussionHasMore(nextHasMore);
        }
      }
    } catch (err) {
      console.error("fetchOlderComments error:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const fetchProject = async (overrideId?: string) => {
    const targetId = overrideId || projectId;
    let query = supabase
      .from("projects_with_collaborators")
      .select(
        "*, team_designer_id, team_designer:profiles!team_designer_id(name, phone), primary_manager_id, primary_manager:profiles!primary_manager_id (name, phone)",
      );

    const { data, error } = await query
      .or(
        `project_id.eq."${targetId}",project_id.eq."${targetId.replace(/-/g, " ")}",project_id.eq."${targetId.replace(/ /g, "-")}"`,
      )
      .maybeSingle();

    if (!error && data) {
      let finalData = { ...data };
      
      // Resolution for repeat client names that are missing in the database
      if ((!data.client_name || data.client_name === 'repeat') && data.previous_logo_no) {
        const { data: original } = await supabase
          .from("projects")
          .select("client_name")
          .eq("project_id", data.previous_logo_no)
          .maybeSingle();
        
        if (original?.client_name && original.client_name !== 'repeat') {
          finalData.client_name = original.client_name;
        }
      }

      setProject(finalData);
      const idKey = data.project_id.replace(/-/g, " ");

      // Optimization: Remove large fields before caching in localStorage to avoid QuotaExceededError
      // NOTE: Now that we use Storage URLs instead of Base64, attachments are safe to cache.
      const cacheData = { ...data };
      delete cacheData.brief;

      try {
        localStorage.setItem(
          `nova_project_detail_${idKey}`,
          JSON.stringify(cacheData),
        );

        const cached = localStorage.getItem("nova_projects_cache");
        if (cached) {
          const projects = JSON.parse(cached);
          const idx = projects.findIndex(
            (p: any) =>
              (p.project_id || p.id) === data.project_id ||
              (p.project_id || p.id) === idKey,
          );
          if (idx !== -1) {
            projects[idx] = {
              ...projects[idx],
              project_title: data.project_title,
              client_name: data.client_name,
              client_type: data.client_type,
              status: data.status,
              due_date: data.due_date,
              due_time: data.due_time,
              assignee: data.assignee,
              price: data.price,
              order_type: data.order_type,
            };
            localStorage.setItem(
              "nova_projects_cache",
              JSON.stringify(projects),
            );
          }
        }
      } catch (e) {
        console.warn(
          "LocalStorage quota exceeded, skipping detail cache update",
        );
      }

      return data.project_id;
    }
    return null;
  };

  const forceDownload = async (url: string, filename: string, mimeType?: string) => {
    if (!url) return;

    const getExtensionFromMime = (mime: string): string => {
      const map: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          "xlsx",
        "application/zip": "zip",
        "application/x-zip-compressed": "zip",
        "application/postscript": "ai",
        "image/vnd.adobe.photoshop": "psd",
        "text/plain": "txt",
        "video/mp4": "mp4",
        "image/svg+xml": "svg",
      };
      return map[mime] || "";
    };

    let finalFilename = filename;

    // First attempt: Early fix if we already know the MIME type
    if (!finalFilename.includes(".") && mimeType) {
      const ext = getExtensionFromMime(mimeType);
      if (ext) finalFilename += `.${ext}`;
    }

    try {
      // Step 2: Attempt to fetch the file to get its real MIME type from the response
      const response = await fetch(url, { method: "GET", mode: "cors" });
      const blob = await response.blob();

      // Ensure extension based on MIME type if missing
      if (!finalFilename.includes(".")) {
        const ext = getExtensionFromMime(blob.type);
        if (ext) finalFilename += `.${ext}`;
      }

      // Trigger download using Blob URL
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (err) {
      console.warn("Standard fetch failed, falling back to direct link", err);

      const link = document.createElement("a");
      if ((url.includes(".sslip.io") || url.includes("supabase.co")) && !url.includes("?")) {
        link.href = `${url}?download=${encodeURIComponent(finalFilename)}`;
      } else {
        link.href = url;
      }
      link.download = finalFilename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper component for consistent file icons
  const FileIcon: React.FC<{
    name: string;
    type?: string;
    url?: string;
    className?: string;
  }> = ({ name, type, url, className = "w-full h-full" }) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const isImage =
      type?.startsWith("image/") ||
      ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

    // Map extensions to specialized brand icons from /public
    if (ext === "ai")
      return (
        <img
          src="/ai-document.png"
          className={`${className} object-contain p-2`}
          alt="AI"
        />
      );
    if (ext === "psd")
      return (
        <img
          src="/psd-icon.png"
          className={`${className} object-contain p-2`}
          alt="PSD"
        />
      );
    if (ext === "pdf")
      return (
        <img
          src="/pdf-icon.png"
          className={`${className} object-contain p-2`}
          alt="PDF"
        />
      );
    if (ext === "eps")
      return (
        <img
          src="/eps-icon.png"
          className={`${className} object-contain p-2`}
          alt="EPS"
        />
      );
    if (["zip", "rar", "7z"].includes(ext))
      return (
        <img
          src="/zip-icon.png"
          className={`${className} object-contain p-2`}
          alt="ZIP"
        />
      );
    if (["doc", "docx"].includes(ext))
      return (
        <img
          src="/doc-icon.png"
          className={`${className} object-contain p-2`}
          alt="Word"
        />
      );
    if (["xls", "xlsx"].includes(ext))
      return (
        <img
          src="/xls-icon.png"
          className={`${className} object-contain p-2`}
          alt="Excel"
        />
      );
    if (ext === "txt")
      return (
        <img
          src="/txt-icon.png"
          className={`${className} object-contain p-2`}
          alt="TXT"
        />
      );
    if (["html", "htm"].includes(ext))
      return (
        <img
          src="/html-icon.png"
          className={`${className} object-contain p-2`}
          alt="HTML"
        />
      );
    if (ext === "mp3")
      return (
        <img
          src="/mp3-icon.png"
          className={`${className} object-contain p-2`}
          alt="MP3"
        />
      );
    if (ext === "gif")
      return (
        <img
          src="/gif-icon.png"
          className={`${className} object-contain p-2`}
          alt="GIF"
        />
      );

    // Image preview if it's a generic image
    if (isImage && url) {
      return (
        <>
          <SafeImage
            src={url}
            className="w-full h-full object-cover"
            alt={name}
            onError={(e) => {
              console.warn(`FileIcon image failed: ${name}`, url.substring(0, 50));
            }}
          />
          <div className="absolute inset-0 bg-black/5" />
        </>
      );
    }

    // Final Gradient Fallback for everything else
    let gradient = "from-slate-600 to-slate-700";
    let Icon = IconFile;
    if (["mp4", "mov", "avi"].includes(ext)) {
      gradient = "from-violet-500 to-purple-600";
      Icon = IconFileVideo;
    }

    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${gradient} p-2 shadow-inner h-full w-full`}
      >
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <Icon size={24} className="text-white drop-shadow-md relative z-10" />
        <span className="text-[9px] font-bold text-white uppercase mt-1 tracking-widest drop-shadow-sm relative z-10 opacity-90">
          {ext.slice(0, 4)}
        </span>
      </div>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      // Reset edit mode when changing projects to avoid stale data or crashes
      setIsEditing(false);
      setEditState(null);

      // Assume the project ID matches what we display, replace URL dashes with spaces
      const normalizedId = projectId.replace(/-/g, " ");

      if (!project || !("brief" in project)) setIsProjectLoading(true);
      setIsCommentsLoading(true);

      // Clear caches when changing projects
      setTimelineComments([]);
      setQaComments([]);
      setComments([]);
      setTimelineHasMore(false);
      setQaHasMore(false);
      setHasMore(false);

      // Fetch concurrently without blocking
      fetchProject().finally(() => setIsProjectLoading(false));
      fetchComments(normalizedId).finally(() => setIsCommentsLoading(false));
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handle Context history fetch for Revision modal
  useEffect(() => {
    const fetchContextHistory = async () => {
      if (isRequestingChanges && (project?.project_id || canonicalId)) {
        const targetId = project?.project_id || canonicalId;

        // Fetch ALL non-internal comments for the full context view
        const { data, error } = await supabase
          .from("project_comments")
          .select("*, parent:parent_id(id, content, author_name)")
          .eq("project_id", targetId)
          .eq("is_internal", false)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setContextComments([...data].reverse());
        }
      }
    };
    fetchContextHistory();
  }, [isRequestingChanges, project?.project_id, canonicalId]);

  // Derived state for the currently active tab - eliminating the 'comments' state mirror
  const fetchResolvers = async () => {
    try {
      // Resolvers are Team Leads and Super Admins
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('role', ['Team Lead', 'Super Admin', 'Admin', 'operations', 'Operations', 'Freelancer', 'Team Designer', 'Project Manager']);
      if (data) setResolvers(data);
    } catch (err) {
      console.error("Error fetching resolvers:", err);
    }
  };

  useEffect(() => {
    fetchResolvers();
  }, [project?.id]); // Refetch if project context changes, but primarily on mount

  const handleTriggerAlert = async () => {
    if (!alertForm.reason || !alertForm.resolverId) {
      addToast({ title: "Required", message: "Please select reason and resolver", type: "error" });
      return;
    }

    setIsAlertActionLoading(true);
    try {
      const resolver = resolvers.find(r => r.id === alertForm.resolverId);
      const resolverName = resolver ? resolver.name : "Management";

      const { error: projectError } = await supabase
        .from('projects')
        .update({
          alert_type: alertForm.type,
          alert_status: 'triggered',
          alert_initiator_id: profile.id,
          alert_resolver_id: alertForm.resolverId,
          alert_reason: alertForm.reason,
          alert_additional_message: alertForm.message,
          has_art_help: alertForm.type === 'arthelp',
          has_dispute: alertForm.type === 'dispute'
        })
        .eq('project_id', canonicalId);

      if (projectError) throw projectError;

      // Add to Timeline
      const userName = profile?.name || "System";
      await supabase.from("project_comments").insert({
        project_id: canonicalId,
        content: `**[${alertForm.type.toUpperCase()} TRIGGERED]**\n\n**ResolverName:** ${resolverName}\n**Reason:** ${alertForm.reason}${alertForm.message ? `\n**Message:** ${alertForm.message}` : ''}`,
        author_name: userName,
        author_role: alertForm.type === 'arthelp' ? "art_help_log" : "dispute_log",
      });

      addToast({ title: "Success", message: `${alertForm.type === 'arthelp' ? 'Art Help' : 'Dispute'} has been triggered`, type: "success" });
      setIsAlertModalOpen(false);
      setAlertForm({ type: 'arthelp', reason: '', message: '', resolverId: '' });
      fetchProject();
      fetchComments();
    } catch (err: any) {
      addToast({ title: "Error", message: err.message, type: "error" });
    } finally {
      setIsAlertActionLoading(false);
    }
  };

  const handleSolveAlert = async () => {
    if (solveForm.action === 'reassign' && !solveForm.reassignTo) {
      addToast({ title: "Required", message: "Please select user to reassign", type: "error" });
      return;
    }

    setIsAlertActionLoading(true);
    try {
      const resolverName = profile?.name || "System";
      let logContent = "";

      if (solveForm.action === 'reassign') {
        const targetUser = [...teamDesigners, ...freelancers, ...managers].find(u => (u.id || u.member_id) === solveForm.reassignTo);
        const targetName = targetUser?.name || "Unknown";
        const targetRole = (targetUser?.role || "").toLowerCase();
        
        const updates: any = {
          assignee: targetName,
          assignee_id: solveForm.reassignTo,
          alert_status: 'resolved'
        };

        // Reassignment logic for TL vs Freelancer
        if (targetRole.includes('lead')) {
          updates.team_lead_id = solveForm.reassignTo;
          // Clear team designer if moving to a lead who works directly
          updates.team_designer_id = null;
        } else if (targetRole.includes('designer') || targetRole.includes('freelancer')) {
          updates.team_designer_id = solveForm.reassignTo;
          // If we assigned a designer, we might want to keep the current lead or clear it
          // For now, keep the resolver as the lead if they are a lead
          if (profile?.role?.toLowerCase() === 'team lead') {
            updates.team_lead_id = profile.id;
          }
        }

        await supabase.from('projects').update(updates).eq('project_id', canonicalId);
        logContent = `Project has been **reassigned** to **${targetName}** by ${resolverName}.`;
      } else {
        // Upload Design
        await supabase.from('projects').update({ alert_status: 'resolved' }).eq('project_id', canonicalId);
        logContent = `New design has been uploaded by ${resolverName}.`;
      }

      await supabase.from("project_comments").insert({
        project_id: canonicalId,
        content: logContent,
        author_name: resolverName,
        author_role: "alert_resolved_log",
        attachments: solveForm.files
      });

      addToast({ title: "Resolved", message: "Case marked as resolved. Pending PM confirmation.", type: "success" });
      setIsSolveModalOpen(false);
      setSolveForm(prev => ({ ...prev, step: 1, reassignTo: '', files: [] }));
      fetchProject();
      fetchComments();
    } catch (err: any) {
      addToast({ title: "Error", message: err.message, type: "error" });
    } finally {
      setIsAlertActionLoading(false);
    }
  };

  const handleConfirmResolution = async () => {
    setIsAlertActionLoading(true);
    try {
      const pmName = profile?.name || "System";
      
      await supabase.from('projects').update({
        alert_type: null,
        alert_status: null,
        alert_initiator_id: null,
        alert_resolver_id: null,
        alert_reason: null,
        alert_additional_message: null,
        has_art_help: false,
        has_dispute: false
      }).eq('project_id', canonicalId);

      await supabase.from("project_comments").insert({
        project_id: canonicalId,
        content: `${pmName} has confirmed the resolution and officially closed the case.`,
        author_name: pmName,
        author_role: "alert_confirmed_log",
      });

      addToast({ title: "Confirmed", message: "Case officially closed and tag removed", type: "success" });
      setIsConfirmModalOpen(false);
      fetchProject();
      fetchComments();
    } catch (err: any) {
      addToast({ title: "Error", message: err.message, type: "error" });
    } finally {
      setIsAlertActionLoading(false);
    }
  };

  const activeComments = useMemo(() => {
    if (activityTab === "qa") return qaComments;
    if (activityTab === "discussion") return discussionComments;
    return timelineComments;
  }, [activityTab, qaComments, timelineComments, discussionComments]);

  // Derived state for 'hasMore' 
  const currentHasMore = useMemo(() => {
    if (activityTab === "qa") return qaHasMore;
    if (activityTab === "discussion") return discussionHasMore;
    return timelineHasMore;
  }, [activityTab, qaHasMore, timelineHasMore, discussionHasMore]);

  // Real-time synchronization for Project Details
  useEffect(() => {
    if (!canonicalId) return;

    const channel = supabase
      .channel(`project-details-global-${canonicalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_comments",
          filter: `project_id=eq.${canonicalId}`,
        },
        (payload) => {
          console.log("Real-time comment/log event received:", payload);
          // Small delay to ensure DB transaction is fully visible to subsequent selects
          setTimeout(() => {
            fetchComments();
          }, 300);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `project_id=eq.${canonicalId}`,
        },
        (payload) => {
          console.log("Real-time project updated:", payload);
          setTimeout(() => {
            fetchProject();
          }, 300);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canonicalId]);

  // Handle tab switching - silent background refresh
  useEffect(() => {
    if (!project?.project_id) return;

    // Background refresh without blocking (Silent update)
    if (activeComments.length === 0) {
      setIsCommentsLoading(true);
      fetchComments(project.project_id).finally(() => setIsCommentsLoading(false));
    } else {
      fetchComments(project.project_id);
    }
  }, [activityTab, project?.project_id]);

  const handlePostComment = async (
    automatedContent?: string,
    automatedAttachments?: any[],
    forceInternal?: boolean,
    category?: string,
  ) => {
    const commentToPost =
      automatedContent !== undefined ? automatedContent : newComment;
    const attachmentsToPost =
      automatedAttachments !== undefined ? automatedAttachments : attachments;

    if (
      (!commentToPost.trim() && attachmentsToPost.length === 0) ||
      isPostingComment
    )
      return;

    setIsPostingComment(true);

    // Save current values for background sync and potential error recovery
    const commentText = commentToPost.trim();
    const commentAttachments = attachmentsToPost;
    const currentReplyTo = replyTo;

    // Generate a stable ID for both UI key and Database ID
    const stableId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `temp-${Date.now()}`;

    // Create optimistic comment for instant UI feedback
    const finalCategory = category || (automatedContent !== undefined ? "system" : (activityTab === "discussion" ? "discussion" : (activityTab === "qa" ? "qa_feedback" : "comment")));
    const finalIsInternal = activityTab === "qa";

    const optimisticComment = {
      id: stableId,
      project_id: canonicalId,
      content: commentText || " ",
      parent_id: currentReplyTo?.id || null,
      parent: currentReplyTo
        ? {
          id: currentReplyTo.id,
          content: currentReplyTo.content,
          author_name: currentReplyTo.author_name,
        }
        : null,
      attachments: commentAttachments.map((att) => ({
        name: att.file.name,
        type: att.file.type,
        size: att.file.size,
        url: att.originalFile?.url || att.previewUrl || att.url,
      })),
      author_id: profile?.id,
      author_name: profile?.name || "User",
      author_role: currentRole,
      is_internal: finalIsInternal,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      category: finalCategory,
    };

    // Add optimistic comment immediately
    const updateLists = (prev: any[]) => [...prev, optimisticComment];
    setComments(updateLists);
    if (finalCategory === "discussion") {
      setDiscussionComments(updateLists);
    } else if (finalIsInternal) {
      setQaComments(updateLists);
    } else {
      setTimelineComments(updateLists);
    }

    // Clear input immediately for better UX if NOT automated
    if (automatedContent === undefined) {
      setNewComment("");
      setAttachments([]);
      setReplyTo(null);
    }

    // Prepare sync with database - ONLY include successful uploads
    const payloadAttachments = commentAttachments
      .filter(att => att.status === "success" && (att.originalFile?.url || att.previewUrl || att.url))
      .map((att) => ({
        name: att.file.name,
        type: att.file.type,
        size: att.file.size,
        url: att.originalFile?.url || att.previewUrl || att.url,
      }));

    // Auto Status Update for Timeline (Submit Work logic)
    let finalStatus = project?.status;
    const isSubmittingWork = 
      activityTab === "timeline" && 
      payloadAttachments.length > 0 && 
      isFreelancer;

    if (isSubmittingWork) {
      const current = (project?.status || "In Progress").trim().toLowerCase();
      if (current === "in progress") finalStatus = "Done";
      else if (current === "revision") finalStatus = "Revision Done";
      else if (current === "urgent") finalStatus = "Urgent Done";
      else if (current === "final files") finalStatus = "Final Files Done";
      else if (current === "revision urgent") finalStatus = "Revision Urgent Done";
    }

    const insertPayload: any = {
      id: stableId,
      project_id: canonicalId,
      content: commentText || " ",
      attachments: payloadAttachments,
      author_id: profile?.id, // Added for unread tracking
      author_name: profile?.name || "User",
      author_role: currentRole,
      is_internal: finalIsInternal,
      category: finalCategory,
    };

    if (currentReplyTo?.id) {
      insertPayload.parent_id = currentReplyTo.id;
    }

    // End loading state for the button


    try {
      // 1. Post Comment
      const { error: insertError } = await supabase
        .from("project_comments")
        .insert([insertPayload]);

      if (insertError) throw insertError;

      // --- SCORECARD TRACKING ---
      if (profile?.id && profile.role !== "Client" && automatedContent === undefined && finalCategory === "comment") {
        trackUserAction(profile.id, "comment", canonicalId).catch(console.error);
        if (payloadAttachments.length > 0) {
          trackUserAction(profile.id, "file_sent", canonicalId).catch(console.error);
        }
      }
      // --------------------------

      // 2. Auto Status Update
      if (isSubmittingWork && finalStatus !== project?.status) {
        const previousStatus = project?.status || "In Progress";
        const { error: statusError } = await supabase
          .from("projects")
          .update({
            status: finalStatus,
            updated_at: new Date().toISOString()
          })
          .eq("project_id", canonicalId);

        if (!statusError) {
          setProject((prev: any) => prev ? { ...prev, status: finalStatus } : null);
          
          // 2a. Log status change in timeline for visual feedback
          const logPayload = {
            project_id: canonicalId,
            content: `STATUS_CHANGED:${previousStatus}:${finalStatus}`,
            author_name: profile?.name || "User",
            author_role: currentRole,
            author_id: profile?.id, // For unread tracking
            is_internal: false,
            created_at: new Date().toISOString(),
            isOptimistic: true
          };
          
          // Add optimistically to timeline
          setTimelineComments(prev => [...prev, logPayload]);
          
          await supabase.from("project_comments").insert([{
            project_id: logPayload.project_id,
            content: logPayload.content,
            author_name: logPayload.author_name,
            author_role: logPayload.author_role,
            author_id: logPayload.author_id,
            is_internal: logPayload.is_internal,
            category: 'system'
          }]);
        }
      }

      addToast({
        type: "success",
        title: "Comment Sent",
        message: isSubmittingWork ? `Work submitted. Status moved to ${finalStatus}` : "Your message has been posted",
      });

      // 3. QA Logic
      if (activityTab === "qa" && (isTeamLead || isProjectManager) && project?.qa_status === "pending_qa") {
        await supabase.from("projects").update({ qa_status: "qa_revision" }).eq("project_id", canonicalId);
        setProject((prev) => prev ? { ...prev, qa_status: "qa_revision" } : null);
      }

      // 4. Notifications
      const commentSnippet = commentText.length > 30 ? commentText.substring(0, 30) + "..." : commentText;
      const notificationMessage = payloadAttachments.length > 0
        ? `Files added to timeline : ${project?.project_title || canonicalId}`
        : `${commentSnippet || "New message"} : ${project?.project_title || canonicalId}`;

      const assigneeProfile = projectTeammates.find((t) => t.name === project?.assignee);
      const targetUserId = profile?.id !== assigneeProfile?.id ? assigneeProfile?.id || project?.primary_manager_id : project?.primary_manager_id;

      if (targetUserId && targetUserId !== profile?.id) {
        await addNotification({
          type: "timeline_update",
          reference_id: canonicalId,
          message: notificationMessage,
          user_id: targetUserId,
          is_read: false,
        });
      }

      // 5. Success cleanup - Mark as persistent
      const markPersistent = (prev: any[]) =>
        prev.map((c) =>
          c.id === stableId ? { ...c, isOptimistic: false } : c,
        );
      setComments(markPersistent);
      if (finalCategory === "discussion") {
        setDiscussionComments(markPersistent);
      } else if (finalIsInternal) {
        setQaComments(markPersistent);
      } else {
        setTimelineComments(markPersistent);
      }

    } catch (error: any) {
      console.error("Error posting comment:", error);
      // Remove optimistic comment on error
      const filterOut = (prev: any[]) => prev.filter((c) => c.id !== stableId);
      setComments(filterOut);
      if (finalCategory === "discussion") {
        setDiscussionComments(filterOut);
      } else if (finalIsInternal) {
        setQaComments(filterOut);
      } else {
        setTimelineComments(filterOut);
      }

      // Restore input state
      setNewComment(commentText);
      setAttachments(commentAttachments);
      setReplyTo(currentReplyTo);

      addToast({
        type: "error",
        title: "Post Failed",
        message: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleQaAction = async (
    action: "submit" | "revision" | "approve",
    feedback: string = "",
    attachments: any[] = [],
  ) => {
    if (!project || isQaActionLoading) return;
    setIsQaActionLoading(true);

    const newQaStatus =
      action === "submit"
        ? "pending_qa"
        : action === "revision"
          ? "qa_revision"
          : "qa_approved";
    const actionLabel =
      action === "submit"
        ? "SUBMITTED FOR QA"
        : action === "revision"
          ? "QA REVISION REQUESTED"
          : "QA APPROVED";

    try {
      // Update project status
      const { error: projectError } = await supabase
        .from("projects")
        .update({ qa_status: newQaStatus })
        .eq("project_id", project.project_id);

      if (projectError) throw projectError;

      // Post internal notification comment
      const { error: commentError } = await supabase
        .from("project_comments")
        .insert([
          {
            project_id: project.project_id,
            content: `**${actionLabel}**\n\n${feedback}`,
            author_name: profile?.name || "System",
            author_role: currentRole,
            is_internal: true,
            attachments: attachments.map((a) => ({
              ...a,
              category: "qa_preview",
              id:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              is_approved: false,
            })),
          },
        ]);

      if (commentError) throw commentError;

      // Local updates
      setProject((prev) => (prev ? { ...prev, qa_status: newQaStatus } : null));
      fetchComments(project.project_id, "qa");
      addToast({
        type: "success",
        title: "QA Action Success",
        message: `Project status updated to ${newQaStatus}`,
      });

      // Clear local caches to prevent stale data in Projects.tsx list
      try {
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("nova_projects_cache_") ||
            key.startsWith("nova_projects_counts_cache")
          ) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) { }

      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error("QA Action Error:", err);
      addToast({
        type: "error",
        title: "QA Action Failed",
        message: err.message,
      });
    } finally {
      setIsQaActionLoading(false);
    }
  };

  const handleDateChange = async (date: Date) => {
    // ... handled in modal now ...
  };

  const handleUpdateDeadlineModal = async () => {
    if (!project || !modalDate || !modalTime) return;

    const yyyy = modalDate.getFullYear();
    const mm_month = String(modalDate.getMonth() + 1).padStart(2, "0");
    const dd_date = String(modalDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm_month}-${dd_date}`;
    const timeStr = modalTime;

    const isClient = deadlineType === "client";
    const dateField = isClient ? "client_due_date" : "due_date";
    const timeField = isClient ? "client_due_time" : "due_time";

    const previousDate = project[dateField];
    const previousTime = project[timeField];

    setProject((prev: any) => ({
      ...prev,
      [dateField]: dateStr,
      [timeField]: timeStr,
    }));
    setIsDeadlineModalOpen(false);
    setActiveShortcut(null);

    const { error } = await supabase
      .from("projects")
      .update({ [dateField]: dateStr, [timeField]: timeStr })
      .eq("project_id", canonicalId);

    if (error) {
      console.error("Error updating deadline:", error);
      setProject((prev: any) => ({
        ...prev,
        [dateField]: previousDate,
        [timeField]: previousTime,
      }));
      addToast({
        type: "error",
        title: "Update Failed",
        message: `Could not update ${isClient ? "client" : "assignee"} deadline`,
      });
      return;
    }

    addToast({
      type: "success",
      title: "Deadline Updated",
      message: `${isClient ? "Client" : "Assignee"} deadline set to ${formatDeadlineDate(dateStr)} ${formatTime(timeStr)}`,
    });

    const stableId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `temp-${Date.now()}`;
    const prefix = isClient ? "CLIENT_DEADLINE_UPDATED" : "DEADLINE_UPDATED";
    const content = `${prefix}|${previousDate || "Not Set"}|${dateStr}|${previousTime || "Not Set"}|${timeStr}`;

    const optimisticCard = {
      id: stableId,
      project_id: canonicalId,
      content,
      author_name: profile?.name || "User",
      author_role: currentRole,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setComments((prev) => [...prev, optimisticCard]);

    const { error: timelineError } = await supabase
      .from("project_comments")
      .insert([
        {
          id: stableId,
          project_id: canonicalId,
          content,
          author_name: profile?.name || "User",
          author_role: currentRole,
        },
      ]);

    if (timelineError)
      console.error("Error logging deadline update:", timelineError);
  };

  const handleDeleteComment = (commentId: string) => {
    console.log("DEBUG: handleDeleteComment triggered for ID:", commentId);
    if (!commentId) {
      addToast({ title: "Error", message: "Missing item ID", type: "error" });
      return;
    }
    setItemToDelete(commentId);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      console.log("DEBUG: Executing Supabase delete for ID:", itemToDelete);
      const { error, count } = await supabase
        .from("project_comments")
        .delete({ count: "exact" })
        .eq("id", itemToDelete);

      console.log("DEBUG: Supabase response - Count:", count, "Error:", error);

      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      if (count === 0) {
        console.warn(
          "Delete failed: No rows affected. Check RLS or if ID exists.",
        );
        addToast({
          title: "Delete Failed",
          message: "Item not found or permission denied on server.",
          type: "error",
        });
      } else {
        const filterOut = (prev: any[]) =>
          prev.filter((c) => c.id !== itemToDelete);
        setComments(filterOut);
        setTimelineComments(filterOut);
        setQaComments(filterOut);
        addToast({
          title: "Success",
          message: "Item removed from timeline",
          type: "success",
        });
      }
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      addToast({
        title: "Error",
        message: err.message || "Failed to delete item",
        type: "error",
      });
    } finally {
      setItemToDelete(null);
    }
  };

  const isImageFile = (name: string, type?: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return type?.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext);
  };

  const handleAttachmentClick = (file: {
    url?: string;
    name: string;
    type?: string;
    id?: string;
    category?: string;
    is_approved?: boolean;
  }) => {
    if (!file.url) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage =
      file.type?.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext);

    if (isImage) {
      setPreviewImage({
        url: file.url,
        name: file.name,
        id: file.id,
        category: file.category,
        is_approved: file.is_approved,
        type: file.type,
      });
    } else {
      forceDownload(file.url, file.name, file.type);
    }
  };

  const handleDeadlineShortcut = async (hours: number) => {
    if (!project) return;
    setActiveShortcut(hours);
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const yyyy = futureDate.getFullYear();
    const mm_month = String(futureDate.getMonth() + 1).padStart(2, "0");
    const dd = String(futureDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm_month}-${dd}`;
    const hh = String(futureDate.getHours()).padStart(2, "0");
    const mm = String(futureDate.getMinutes()).padStart(2, "0");
    const timeStr = `${hh}:${mm}`;

    const previousDate = project.due_date;
    const previousTime = project.due_time;

    // Optimistic update
    setProject((prev: any) => ({
      ...prev,
      due_date: dateStr,
      due_time: timeStr,
    }));

    const { error } = await supabase
      .from("projects")
      .update({ due_date: dateStr, due_time: timeStr })
      .eq("project_id", canonicalId);

    if (error) {
      console.error("Error updating deadline shortcut:", error);
      setProject((prev: any) => ({
        ...prev,
        due_date: previousDate,
        due_time: previousTime,
      }));
      addToast({
        type: "error",
        title: "Update Failed",
        message: "Could not update deadline",
      });
    } else {
      addToast({
        type: "success",
        title: "Deadline Updated",
        message: `Set to ${formatDeadlineDate(dateStr)} ${formatTime(timeStr)}`,
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return;

    const previousStatus = project.status;
    setProject((prev: any) => ({ ...prev, status: newStatus }));

    // If moving to Approved, ensure we mark payout_completed as true in the local state update
    // (The DB trigger will handle the actual logic, but we update UI state for consistency)
    if (newStatus.toLowerCase().includes("approved")) {
      setProject((prev: any) => ({ ...prev, payout_completed: true }));
    }

    const tableName = "projects";
    const idColumn = "project_id";

    let updatePayload: any = { status: newStatus };
    if (["Sent For Approval", "Approved", "Cancelled", "In Progress"].includes(newStatus)) {
      updatePayload.qa_status = null;
    }

    const { error } = await supabase
      .from(tableName)
      .update(updatePayload)
      .eq(idColumn, canonicalId);

    if (error) {
      console.error("Error updating status:", error);
      setProject((prev: any) => ({ ...prev, status: previousStatus }));
      addToast({
        type: "error",
        title: "Update Failed",
        message: "Could not update project status",
      });
    } else {
      // --- SCORECARD TRACKING ---
      if (profile?.id && profile.role !== "Client") {
        trackUserAction(profile.id, "status_change", canonicalId).catch(console.error);
      }
      // --------------------------

      // 1. Generate a stable ID for both UI key and Database ID
      const stableId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `temp-${Date.now()}`;

      // 2. Optimistic Status Change Card
      const optimisticStatusCard = {
        id: stableId,
        project_id: canonicalId,
        content: `STATUS_CHANGED:${previousStatus || "Pending"}:${newStatus}`,
        author_name: profile?.name || "User",
        author_role: currentRole,
        created_at: new Date().toISOString(),
        isOptimistic: true,
      };

      // 3. Update UI Immediately
      const updateLists = (prev: any[]) => [...prev, optimisticStatusCard];
      setComments(updateLists);
      // Route to correct tab state to ensure immediate visibility
      if (activityTab === "qa") {
        setQaComments(updateLists);
      } else if (activityTab === "discussion") {
        setDiscussionComments(updateLists);
      } else {
        setTimelineComments(updateLists);
      }

      addToast({
        type: "success",
        title: "Status Updated",
        message: `Project status is now ${newStatus}`,
      });

      // 4. Process side effects in background (Async)
      const syncSideEffects = async () => {
        // Record status change in timeline
        const { error: timelineError } = await supabase
          .from("project_comments")
          .insert([
            {
              id: stableId,
              project_id: canonicalId,
              content: `STATUS_CHANGED:${previousStatus || "Pending"}:${newStatus}`,
              author_name: profile?.name || "User",
              author_role: currentRole,
            },
          ]);

        if (timelineError)
          console.error("Error syncing status timeline:", timelineError);

        // 1. Generate Status-specific flags
        const normalizedStatus = newStatus.toLowerCase().trim();
        const isDoneType = normalizedStatus.includes("done");

        // DEBUG LOGS
        console.log("--- STATUS CHANGE NOTIF DEBUG ---", {
          newStatus,
          isDoneType,
          primaryManagerId: project?.primary_manager_id,
          collaboratorsCount: project?.collaborators?.length || 0,
          projectTitle: project?.project_title,
        });

        if (isDoneType) {
          // RULE: PMs and POMs are notified ONLY when project is marked as DONE (by freelancer usually)

          // 1. Notify Primary Manager
          if (
            project?.primary_manager_id &&
            project.primary_manager_id !== profile?.id
          ) {
            addNotification({
              type: "project_done",
              reference_id: canonicalId,
              message: `Project marked as ${newStatus}: ${project?.project_title || canonicalId}`,
              user_id: project.primary_manager_id,
              is_read: false,
            }).catch((e) => console.error("PM Notification Error:", e));
          }

          // 2. Notify Collaborators (usually other PMs)
          if (Array.isArray(project?.collaborators)) {
            project.collaborators.forEach((collab: any) => {
              if (collab.id && collab.id !== profile?.id) {
                // Don't notify the person who made the change
                addNotification({
                  type: "project_done",
                  reference_id: canonicalId,
                  message: `Project marked as ${newStatus}: ${project?.project_title || canonicalId}`,
                  user_id: collab.id,
                  is_read: false,
                }).catch((e) => console.error("Collab Notification Error:", e));
              }
            });
          }
        } else {
          // RULE: For non-done statuses (Revision, In Progress, Approved, etc.), PMs/POMs should NOT be notified.
          // We only notify the assigned freelancer to inform them of the change.

          const assigneeProfile = projectTeammates.find(
            (t) => t.name === project?.assignee,
          );

          // ONLY notify the assignee if they exist and are not the one who made the change
          if (assigneeProfile?.id && assigneeProfile.id !== profile?.id) {
            addNotification({
              type: "status_update",
              reference_id: canonicalId,
              message: `Status changed to ${newStatus} : ${project?.project_title || canonicalId}`,
              user_id: assigneeProfile.id,
              is_read: false,
            }).catch((e) =>
              console.error("Assignee Status Update Notification Error:", e),
            );
          }
        }

        // Update tab parent
        if (onStatusChange) onStatusChange(newStatus);
      };

      syncSideEffects();
    }
  };

  const handleReopenProject = async () => {
    if (!project) return;

    // 1. We NO LONGER update the status to 'Revision' automatically.
    // We just switch the UI view to the timeline and log the event.
    setViewMode("timeline");

    // 2. Log the "REOPENED" event in the timeline
    const stableId = crypto.randomUUID();
    const { error: logError } = await supabase.from("project_comments").insert([
      {
        id: stableId,
        project_id: canonicalId,
        content: `PROJECT_REOPENED:${project.status || "Approved"}:${project.status || "Approved"}`,
        author_name: profile?.name || "User",
        author_role: currentRole,
      },
    ]);

    if (logError) console.error("Error logging reopen event:", logError);

    // 3. Update UI locally so the "Reopened" card appears immediately
    setComments((prev) => [
      ...prev,
      {
        id: stableId,
        project_id: canonicalId,
        content: `PROJECT_REOPENED:${project.status || "Approved"}:${project.status || "Approved"}`,
        author_name: profile?.name || "User",
        author_role: currentRole,
        created_at: new Date().toISOString(),
      },
    ]);

    addToast({
      type: "success",
      title: "Project Reopened",
      message: "You can now view history and change status manually.",
    });
  };

  const handleTimeChange = async (newTime: string) => {
    if (!project) return;
    setActiveShortcut(null);

    const previousTime = project.due_time;
    setProject((prev: any) => ({ ...prev, due_time: newTime }));

    const { error } = await supabase
      .from("projects")
      .update({ due_time: newTime })
      .eq("project_id", canonicalId);
    if (error) {
      console.error("Error updating time:", error);
      setProject((prev: any) => ({ ...prev, due_time: previousTime }));
      addToast({
        type: "error",
        title: "Update Failed",
        message: "Could not update project deadline time",
      });
    } else {
      addToast({
        type: "success",
        title: "Time Updated",
        message: `Deadline time set to ${formatTime(newTime)}`,
      });
    }
  };


  const handleSubmitReview = async () => {
    if (
      rating === 0 ||
      !reviewText.trim() ||
      isSubmittingReview ||
      !profile?.id
    )
      return;

    const targetName = isFreelancer
      ? project?.primary_manager?.name || "Project Manager"
      : project?.assignee || "Freelancer";

    setIsSubmittingReview(true);
    try {
      const { data, error } = await supabase
        .from("project_reviews")
        .insert([
          {
            project_id: canonicalId,
            reviewer_id: profile.id,
            reviewer_name: profile.name,
            reviewer_role: profile.role,
            reviewee_name: targetName,
            rating,
            review_text: reviewText,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setExistingReview(data);
      setReviewSubmitted(true);
      addToast({
        type: "success",
        title: "Review Submitted",
        message: "Thank you for your feedback!",
      });
    } catch (err: any) {
      console.error("Review submission error:", err);
      addToast({
        type: "error",
        title: "Submission Failed",
        message: err.message || "Could not submit review.",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const renderReviewContent = () => {
    const isAdmin = ["Super Admin", "Admin"].includes(profile?.role || "");

    // Loading state for Admin to prevent flicker
    if (isAdmin && isReviewsLoading) {
      return (
        <div className="flex flex-col flex-1 h-full">
          <div className="w-full flex-1 flex flex-col">
            <ElevatedMetallicCard
              title="Loading Reviews..."
              headerClassName="px-10 py-6"
              bodyClassName="p-10 flex-1 flex flex-col items-center justify-center"
              className="flex-1 flex flex-col mb-10"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
                  Syncing Feed...
                </p>
              </div>
            </ElevatedMetallicCard>
          </div>
        </div>
      );
    }

    const targetName = isFreelancer
      ? project?.primary_manager?.name || "Project Manager"
      : project?.assignee || "Freelancer";

    // Admin View: Show summary of reviews if ANY reviews exist
    if (isAdmin && allReviews.length > 0) {
      return (
        <div className="flex flex-col flex-1 h-full animate-in fade-in zoom-in duration-700">
          <div className="w-full flex-1 flex flex-col">
            <ElevatedMetallicCard
              title="Project Reviews Summary"
              headerClassName="px-10 py-6"
              bodyClassName="p-10 flex-1 flex flex-col overflow-y-auto"
              className="flex-1 flex flex-col mb-10"
            >
              <div className="space-y-12">
                {allReviews.map((rev, idx) => {
                  const isOwnReview = rev.reviewer_id === profile?.id;
                  const rating = rev.rating;

                  // Premium Star Colors
                  let fromColor = "#22c55e";
                  let toColor = "#15803d";
                  let borderColor = "#16a34a";

                  if (rating > 0 && rating < 3) {
                    fromColor = "#EF4444";
                    toColor = "#b91c1c";
                    borderColor = "#dc2626";
                  } else if (rating > 0 && rating < 4) {
                    fromColor = "#facc15";
                    toColor = "#a16207";
                    borderColor = "#ca8a04";
                  }

                  return (
                    <div
                      key={rev.id || idx}
                      className="space-y-6 animate-in fade-in slide-in-from-top-4"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-left">
                          <Avatar
                            src={rev.avatar_url}
                            initials={rev.reviewer_name
                              ?.slice(0, 2)
                              .toUpperCase()}
                            size="lg"
                            className={
                              isOwnReview
                                ? "ring-2 ring-brand-primary/30 ring-offset-2 ring-offset-black"
                                : ""
                            }
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-white uppercase tracking-tight">
                                {rev.reviewer_name}
                              </p>
                              {isOwnReview && (
                                <span className="text-[8px] font-black bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/30 uppercase tracking-[0.1em]">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                              {rev.reviewer_role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((s) => {
                              const isStarActive = s <= rev.rating;
                              return (
                                <div
                                  key={s}
                                  className="relative w-6 h-6 rounded-lg flex items-center justify-center overflow-hidden"
                                >
                                  {!isStarActive ? (
                                    <div className="absolute inset-0 rounded-lg bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)] flex items-center justify-center">
                                      <IconStar
                                        size={10}
                                        className="text-white/10"
                                        fill="none"
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className="absolute inset-0 rounded-lg flex items-center justify-center shadow-lg"
                                      style={{
                                        background: `linear-gradient(to bottom, ${fromColor}, ${toColor})`,
                                        border: `1px solid ${borderColor}`,
                                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px -4px ${borderColor}80`,
                                      }}
                                    >
                                      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] pointer-events-none" />
                                      <IconStar
                                        size={10}
                                        className="relative z-10 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
                                        fill="currentColor"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span className="text-xs font-black text-white/50 ml-1 tracking-tighter">
                            {rev.rating}.0
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-6 rounded-3xl border shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] ${isOwnReview ? "bg-brand-primary/5 border-brand-primary/10" : "bg-black/20 border-white/[0.04]"}`}
                      >
                        <p className="text-sm text-gray-300 leading-relaxed italic">
                          "{rev.review_text}"
                        </p>
                        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-4 text-right">
                          {new Date(rev.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-center">
                  <Button
                    variant="metallic"
                    className="h-12 px-10 text-[10px] font-black uppercase tracking-widest"
                    onClick={() => setViewMode("timeline")}
                  >
                    Open Timeline
                  </Button>
                </div>
              </div>
            </ElevatedMetallicCard>
          </div>
        </div>
      );
    }

    // Standard User View or Admin with no reviews yet
    return (
      <div className="flex flex-col flex-1 h-full">
        <div className="w-full flex-1 flex flex-col">
          <ElevatedMetallicCard
            title={isAdmin ? "Submit Administrative Review" : "Project Review"}
            headerClassName="px-10 py-6"
            bodyClassName="p-10 flex-1 flex flex-col"
            className="flex-1 flex flex-col mb-10"
          >
            <div className="flex-1 flex flex-col space-y-10">
              {/* Target User Info or Post-Submission Message */}
              <div className="flex flex-col items-center text-center space-y-6">
                {reviewSubmitted && !isAdmin ? (
                  <>
                    <div className="w-20 h-20 rounded-full bg-brand-success/10 border border-brand-success/20 flex items-center justify-center text-brand-success mb-2 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                      <IconCheckCircle
                        size={40}
                        className="animate-in zoom-in duration-500"
                      />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                      Review Successfully Logged
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest max-w-xs leading-relaxed">
                      Your feedback has been privately stored for Administrative
                      Review.
                    </p>

                    {/* Project Overview Card */}
                    <div className="w-full mt-10 p-8 bg-black/40 rounded-3xl border border-white/5 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)] flex flex-col gap-6 text-left">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                          Project ID
                        </span>
                        <span className="text-sm font-mono text-brand-primary font-bold tracking-wider">
                          {project?.project_id}
                        </span>
                      </div>
                      <div className="flex justify-between items-start border-b border-white/5 pb-4">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest pt-1">
                          Project Title
                        </span>
                        <span className="text-sm font-bold text-white text-right max-w-[200px] leading-snug">
                          {project?.project_title}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                          Approval Date
                        </span>
                        <span className="text-sm font-bold text-gray-300">
                          {project?.updated_at
                            ? new Date(project.updated_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar
                      src={revieweeAvatarUrl || undefined}
                      initials={formatDisplayName(targetName)
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                      size="xl"
                    />
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      {formatDisplayName(targetName)}
                    </h2>
                  </>
                )}
              </div>

              {/* Conditional Rendering of Submission Form or Details */}
              {(!reviewSubmitted || isAdmin) && (
                <>
                  {/* Star Rating */}
                  <div className="flex flex-col items-center gap-6">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">
                      {reviewSubmitted ? "Your Rating" : "Rate your experience"}
                    </p>
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isActive = star <= rating;

                        let fromColor = "#22c55e";
                        let toColor = "#15803d";
                        let borderColor = "#16a34a";

                        if (rating > 0 && rating < 3) {
                          fromColor = "#EF4444";
                          toColor = "#b91c1c";
                          borderColor = "#dc2626";
                        } else if (rating > 0 && rating < 4) {
                          fromColor = "#facc15";
                          toColor = "#a16207";
                          borderColor = "#ca8a04";
                        }

                        return reviewSubmitted ? (
                          // Read-only star
                          <div
                            key={star}
                            className="relative w-12 h-12 rounded-xl flex items-center justify-center"
                          >
                            {!isActive ? (
                              <div className="absolute inset-0 rounded-xl bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] flex items-center justify-center">
                                <IconStar
                                  size={20}
                                  className="text-white/10"
                                  fill="none"
                                />
                              </div>
                            ) : (
                              <div
                                className="absolute inset-0 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
                                style={{
                                  background: `linear-gradient(to bottom, ${fromColor}, ${toColor})`,
                                  border: `1px solid ${borderColor}`,
                                  boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.35), 0 8px 20px -6px ${borderColor}60`,
                                }}
                              >
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.18)_50%,transparent_100%)] pointer-events-none" />
                                <IconStar
                                  size={20}
                                  className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                                  fill="currentColor"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          // Interactive star
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 group/star"
                          >
                            {!isActive ? (
                              <div className="absolute inset-0 rounded-xl bg-white/[0.02] border border-white/[0.05] shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] flex items-center justify-center group-hover/star:bg-white/[0.05] transition-colors">
                                <IconStar
                                  size={20}
                                  className="text-white/10 group-hover/star:text-white/20"
                                  fill="none"
                                />
                              </div>
                            ) : (
                              <div
                                className="absolute inset-0 rounded-xl flex items-center justify-center overflow-hidden shadow-lg"
                                style={{
                                  background: `linear-gradient(to bottom, ${fromColor}, ${toColor})`,
                                  border: `1px solid ${borderColor}`,
                                  boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.35), 0 8px 20px -6px ${borderColor}60`,
                                }}
                              >
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.18)_50%,transparent_100%)] pointer-events-none" />
                                <IconStar
                                  size={20}
                                  className="relative z-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                                  fill="currentColor"
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] text-center">
                      {reviewSubmitted ? "Your Review" : "Written Review"}
                    </p>
                    {reviewSubmitted ? (
                      // Read-only review text
                      <div className="relative z-10 min-h-[120px] p-6 bg-black/20 rounded-3xl border border-white/[0.04] shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center text-center">
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {reviewText}
                        </p>
                        {existingReview?.created_at && (
                          <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider mt-4">
                            Submitted{" "}
                            {new Date(
                              existingReview.created_at,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      // Editable textarea
                      <div className="relative z-10 min-h-[160px] p-6 bg-black/40 rounded-3xl border border-white/5 shadow-[inset_0_4px_24px_rgba(0,0,0,0.5)] focus-within:border-brand-primary/30 transition-all duration-500">
                        <textarea
                          className="w-full h-full bg-transparent border-none outline-none text-sm text-white placeholder-gray-700 resize-none leading-relaxed"
                          placeholder={`Describe your experience working with ${formatDisplayName(targetName)}...`}
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-center gap-4">
                {reviewSubmitted ? (
                  <Button
                    variant="metallic"
                    className="px-12 py-3 rounded-2xl h-14 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20"
                    onClick={() => setViewMode("timeline")}
                  >
                    Open Thread
                  </Button>
                ) : (
                  <Button
                    variant="metallic"
                    className="px-12 py-3 rounded-2xl h-14 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20"
                    onClick={handleSubmitReview}
                    isLoading={isSubmittingReview}
                    disabled={rating === 0 || !reviewText.trim()}
                  >
                    Submit Review
                  </Button>
                )}
              </div>
            </div>
          </ElevatedMetallicCard>
        </div>
      </div>
    );
  };

  // Removed global early returns for loading and project-not-found states
  // to allow the sidebar and header to render immediately.

  return (
    <div className="ProjectDetails flex flex-col lg:flex-row h-full w-full overflow-hidden bg-surface-bg animate-project-entry">
      {/* 1. LEFT COLUMN - METADATA SIDEBAR */}
      <aside
        className={`${isSidebarCollapsed ? "lg:w-[80px]" : "lg:w-[360px]"} ${mobileView === "metadata" ? "flex" : "hidden lg:flex"} w-full lg:flex flex-col h-full lg:border-r border-surface-border bg-surface-bg shrink-0 transition-all duration-300 ease-in-out relative z-30`}
      >
        {/* Fixed Header */}
        <header
          className={`h-20 shrink-0 border-b border-surface-border flex items-center ${isSidebarCollapsed ? "px-0" : "px-6 lg:px-10"}`}
        >
          <div
            className={`w-full flex items-center ${isSidebarCollapsed ? "lg:justify-center" : "justify-between"}`}
          >
            {(!isSidebarCollapsed || (typeof window !== "undefined" && window.innerWidth < 1024)) && (
              <>
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all shrink-0"
                >
                  <IconChevronLeft size={20} />
                </button>
                <h3 className="flex-1 text-center text-sm font-bold text-white uppercase tracking-widest whitespace-nowrap px-4">
                  {isEditing ? "Editing Details" : "Project Details"}
                </h3>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      onClick={isEditing ? handleSaveEdit : startEditing}
                      disabled={isSaving || isBriefUploading}
                      className={`p-2 rounded-xl transition-all shrink-0 ${isEditing ? "bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                      title={isEditing ? "Save Changes" : "Edit Project"}
                    >
                      {isSaving ? (
                        <IconRefreshCw size={20} className="animate-spin" />
                      ) : isEditing ? (
                        <IconSave size={20} />
                      ) : (
                        <IconEdit size={20} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setMobileView("brief")}
                    className="lg:hidden p-2 text-gray-500 hover:text-white transition-all shrink-0"
                    title="View Brief"
                  >
                    <IconChevronRight size={20} />
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-3 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all shrink-0 hidden lg:flex items-center justify-center"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <IconLayoutSidebar size={24} />
            </button>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div
          className={`flex-1 space-y-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? "lg:px-0 py-10 no-scrollbar" : "p-6 lg:p-10 scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent"}`}
        >
          <MetadataSection
            title="Details"
            isCollapsed={isSidebarCollapsed}
            collapsedHeight="lg:h-72"
          >
            <MetadataItem
              label="Project ID"
              value={
                isProjectLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : isEditing ? (
                  <div className="flex items-center gap-2 w-full group/id-field">
                    <Input
                      variant="flat"
                      size="none"
                      className="w-full opacity-60 cursor-not-allowed"
                      inputClassName="font-mono !p-0 !h-auto !bg-transparent"
                      value={editState.project_id}
                      readOnly
                    />
                    <IconLock
                      size={12}
                      className="text-gray-600 group-hover/id-field:text-brand-warning transition-colors"
                    />
                  </div>
                ) : (
                  project?.project_id || ""
                )
              }
              isRecessed={isEditing}
            />
            <MetadataItem
              label="Project Title"
              value={
                isProjectLoading ? (
                  <Skeleton className="h-4 w-48" />
                ) : isEditing ? (
                  <Input
                    variant="flat"
                    size="none"
                    className="w-full"
                    inputClassName="!p-0 !h-auto !bg-transparent"
                    value={editState.project_title}
                    onChange={(e) =>
                      setEditState({
                        ...editState,
                        project_title: e.target.value,
                      })
                    }
                  />
                ) : (
                  project?.project_title || "Untitled"
                )
              }
              isRecessed={isEditing}
            />
            <MetadataItem
              label="Options Required"
              value={
                isProjectLoading ? (
                  <Skeleton className="h-4 w-12" />
                ) : isEditing ? (
                  <Input
                    type="number"
                    variant="flat"
                    size="none"
                    className="w-full"
                    inputClassName="!p-0 !h-auto !bg-transparent"
                    value={editState.options_required}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setEditState({
                          ...editState,
                          options_required: "" as any,
                        });
                        return;
                      }
                      setEditState({
                        ...editState,
                        options_required: parseInt(val) || 0,
                      });
                    }}
                    min={1}
                    max={20}
                  />
                ) : project?.options_required !== undefined &&
                  project?.options_required !== null ? (
                  String(project.options_required)
                ) : (
                  "N/A"
                )
              }
              isRecessed={isEditing}
            />
            <MetadataItem
              label="Client"
              value={
                isProjectLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : isEditing ? (
                  <Input
                    variant="flat"
                    size="none"
                    className="w-full"
                    inputClassName="!p-0 !h-auto !bg-transparent"
                    value={editState.client_name}
                    onChange={(e) =>
                      setEditState({
                        ...editState,
                        client_name: e.target.value,
                      })
                    }
                  />
                ) : (
                  formatDisplayName(
                    (project?.client_name && project?.client_name !== "repeat")
                      ? project.client_name
                      : (project?.client_type === 'repeat' ? 'Repeat Buyer' : (project?.client_type || "Unknown"))
                  ) || "Unknown"
                )
              }
              isRecessed={isEditing}
            />
            {isProjectLoading ? (
              <MetadataItem
                label="Assignee"
                value={<Skeleton className="h-4 w-40" />}
              />
            ) : isEditing ? (
              <Dropdown
                options={[
                  { label: "Unassigned", value: "" },
                  ...freelancers.map((f) => ({ label: f.name, value: f.id })),
                ]}
                value={editState.assignee_id || ""}
                onChange={(val) => {
                  const f = freelancers.find(
                    (freelancer) => freelancer.id === val,
                  );
                  setEditState({
                    ...editState,
                    assignee_id: val || null,
                    assignee: f?.name || "",
                  });
                }}
                showSearch
                className="w-full"
              >
                <MetadataItem
                  label="Assignee"
                  value={formatDisplayName(editState.assignee) || "Unassigned"}
                  isRecessed
                  isSelect
                />
              </Dropdown>
            ) : (
              <MetadataItem
                label="Assignee"
                value={
                  project?.assignee ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-white">
                        {formatDisplayName(project.assignee)}
                      </span>
                      {teamProfileData[project.assignee]?.phone && (
                        <div className="flex items-center gap-2 group/phone cursor-pointer">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover/phone:text-brand-primary transition-colors">
                            Phone
                          </span>
                          <span className="text-xs font-mono text-gray-300 group-hover/phone:text-white transition-colors tracking-wide">
                            {teamProfileData[project.assignee].phone}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    "Unassigned"
                  )
                }
              />
            )}

            {/* Team Designer Assignment (Visibility: Team Leads or Admins) */}
            {(isTeamLead || isProjectManager) &&
              (isProjectLoading ? (
                <MetadataItem
                  label="Team Designer"
                  value={<Skeleton className="h-4 w-40" />}
                />
              ) : isEditing ? (
                <Dropdown
                  options={[
                    { label: "None", value: "" },
                    ...teamDesigners.map((td) => ({
                      label: td.name,
                      value: td.id,
                    })),
                  ]}
                  value={editState.team_designer_id || ""}
                  onChange={(val) =>
                    setEditState({
                      ...editState,
                      team_designer_id: val || null,
                    })
                  }
                  showSearch
                  className="w-full"
                >
                  <MetadataItem
                    label="Team Designer"
                    value={
                      teamDesigners.find(
                        (td) => td.id === editState.team_designer_id,
                      )?.name || "Unassigned"
                    }
                    isRecessed
                    isSelect
                  />
                </Dropdown>
              ) : (
                <MetadataItem
                  label="Team Designer"
                  value={
                    (() => {
                      // 1. Check joined object (from fetch)
                      const tdObj = Array.isArray(project?.team_designer) ? project?.team_designer[0] : project?.team_designer;
                      
                      // 2. Check manual background fetch (our dedicated state)
                      const tdManual = teamDesignerProfile;

                      // 3. Check local team state (if available)
                      const tdInState = teamDesigners.find(td => td.id === (project?.team_designer_id || tdObj?.id || tdManual?.id));
                      
                      // 4. Fallback: Search in collaborators for someone who is NOT the lead/PM
                      const pmName = project?.primary_manager?.name;
                      const assigneeName = project?.assignee;
                      
                      const tdCollab = project?.collaborators?.find((c: any) => 
                        c.name !== assigneeName && 
                        c.name !== pmName && 
                        !c.role?.toLowerCase()?.includes('admin') &&
                        !c.role?.toLowerCase()?.includes('manager')
                      );
                      
                      const name = tdObj?.name || tdInState?.name || tdManual?.name || tdCollab?.name;
                      const phone = tdObj?.phone || tdInState?.phone || tdManual?.phone || (tdCollab?.name ? teamProfileData[tdCollab.name]?.phone : null);

                      if (!name) return "Unassigned";

                      return (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-white">
                            {formatDisplayName(name)}
                          </span>
                          {phone && (
                            <div className="flex items-center gap-2 group/phone cursor-pointer">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover/phone:text-brand-primary transition-colors">
                                Phone
                              </span>
                              <span className="text-xs font-mono text-gray-300 group-hover/phone:text-white transition-colors tracking-wide">
                                {phone}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  }
                />
              ))}
            {isProjectManager && (
              <>
                {isProjectLoading ? (
                  <MetadataItem
                    label="Order Type"
                    value={<Skeleton className="h-4 w-32" />}
                  />
                ) : isEditing && canEdit ? (
                  <Dropdown
                    options={[
                      { label: "Direct Order", value: "Direct Order" },
                      { label: "Query", value: "Query" },
                    ]}
                    value={editState.order_type}
                    onChange={(val) =>
                      setEditState({ ...editState, order_type: val })
                    }
                    className="w-full"
                  >
                    <MetadataItem
                      label="Order Type"
                      value={editState.order_type}
                      isRecessed
                      isSelect
                    />
                  </Dropdown>
                ) : (
                  <MetadataItem
                    label="Order Type"
                    value={project?.order_type || "Direct Order"}
                  />
                )}
                {isProjectLoading ? (
                  <MetadataItem
                    label="Client Type"
                    value={<Skeleton className="h-4 w-32" />}
                  />
                ) : isEditing && canEdit ? (
                  <Dropdown
                    options={[
                      { label: "New Client", value: "new" },
                      { label: "Repeat Client", value: "repeat" },
                    ]}
                    value={editState.client_type}
                    onChange={(val) =>
                      setEditState({ ...editState, client_type: val })
                    }
                    className="w-full"
                  >
                    <MetadataItem
                      label="Client Type"
                      value={
                        editState.client_type === "new"
                          ? "New Client"
                          : "Repeat Client"
                      }
                      isRecessed
                      isSelect
                    />
                  </Dropdown>
                ) : (
                  <MetadataItem
                    label="Client Type"
                    value={
                      project?.client_type === "new"
                        ? "New Client"
                        : "Repeat Client"
                    }
                  />
                )}
                {(isEditing
                  ? editState.order_type === "Query"
                  : project?.order_type === "Query") &&
                  (isProjectLoading ? (
                    <MetadataItem
                      label="Converted By"
                      value={<Skeleton className="h-4 w-32" />}
                    />
                  ) : isEditing && canEdit ? (
                    <Dropdown
                      options={[
                        { label: "Select PM", value: "" },
                        ...managers.map((m) => ({
                          label: m.name,
                          value: m.name,
                        })),
                      ]}
                      value={editState.converted_by || ""}
                      onChange={(val) =>
                        setEditState({ ...editState, converted_by: val })
                      }
                      showSearch
                      className="w-full"
                    >
                      <MetadataItem
                        label="Converted By"
                        value={editState.converted_by || "Select PM"}
                        isRecessed
                        isSelect
                      />
                    </Dropdown>
                  ) : (
                    <MetadataItem
                      label="Converted By"
                      value={project?.converted_by || "None"}
                    />
                  ))}
              </>
            )}
          </MetadataSection>

          <MetadataSection
            title="Team"
            isCollapsed={isSidebarCollapsed}
            collapsedHeight="lg:h-72"
          >
            {isProjectLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : isTeamDesigner ? (
              // Team Designer View: Show ONLY their Team Lead (the project assignee)
              <MetadataItem
                label="Team Lead"
                value={
                  project?.assignee ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-white">
                        {formatDisplayName(project.assignee)}
                      </span>
                      {teamProfileData[project.assignee]?.phone && (
                        <div className="flex items-center gap-2 group/phone cursor-pointer">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover/phone:text-brand-primary transition-colors">
                            Phone
                          </span>
                          <span className="text-xs font-mono text-gray-300 group-hover/phone:text-white transition-colors tracking-wide">
                            {teamProfileData[project.assignee].phone}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    "Unassigned"
                  )
                }
              />
            ) : (
              // Other roles (TL, Freelancer, PM): Show full team hierarchy
              <>
                {isEditing ? (
                  <Dropdown
                    options={managers.map((m) => ({
                      label: m.name,
                      value: m.id,
                    }))}
                    value={editState.primary_manager_id || ""}
                    onChange={(val) =>
                      setEditState({ ...editState, primary_manager_id: val })
                    }
                    showSearch
                    className="w-full"
                  >
                    <MetadataItem
                      label="Project Manager"
                      value={
                        managers.find(
                          (m) => m.id === editState.primary_manager_id,
                        )?.name || "Support"
                      }
                      isRecessed
                      isSelect
                    />
                  </Dropdown>
                ) : (
                  <MetadataItem
                    label="Project Manager"
                    value={
                      project?.primary_manager ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-white">
                            {formatDisplayName(project.primary_manager.name) ||
                              "Support"}
                          </span>
                          {project.primary_manager.phone && (
                            <div className="flex items-center gap-2 group/phone cursor-pointer">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover/phone:text-brand-primary transition-colors">
                                Phone
                              </span>
                              <span className="text-xs font-mono text-gray-300 group-hover/phone:text-white transition-colors tracking-wide">
                                {project.primary_manager.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        "Support"
                      )
                    }
                  />
                )}
                {allCollaborators.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                      Collaborators
                    </p>
                    <div className="space-y-5 pt-3">
                      {allCollaborators.map((c: any, idx: number) => (
                        <CollaboratorItem
                          key={idx}
                          name={c.name}
                          role={c.role || "Member"}
                          phone={c.phone || teamProfileData[c.name]?.phone}
                          avatarUrl={teamProfileData[c.name]?.avatar_url}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </MetadataSection>

          {/* Status Section */}
          <MetadataSection
            title="Status & Timeline"
            isCollapsed={isSidebarCollapsed}
            collapsedHeight="lg:h-[480px]"
          >
            <div className="space-y-5">
              {/* Client Deadline */}
              {!isFreelancer && (
                <div className="space-y-5 pb-5 border-b border-white/5">
                  <MetadataItem
                    label="Client Deadline Date"
                    value={
                      project?.client_due_date
                        ? formatDeadlineDate(project.client_due_date)
                        : "Not Set"
                    }
                    isDate
                    isRecessed
                  />
                  <MetadataItem
                    label="Client Deadline Time"
                    value={
                      project?.client_due_time
                        ? formatTime(project.client_due_time)
                        : "Not Set"
                    }
                    isTime
                    isRecessed
                  />
                  <div className="pt-2">
                    <Button
                      variant="metallic"
                      onClick={() => {
                        setDeadlineType("client");
                        setModalDate(
                          project?.client_due_date
                            ? new Date(project.client_due_date)
                            : new Date(),
                        );
                        setModalTime(project?.client_due_time || "17:00");
                        setIsDeadlineModalOpen(true);
                      }}
                      className="w-full justify-center h-10 text-[10px] font-black uppercase tracking-widest px-2"
                    >
                      Edit Client Deadline
                    </Button>
                  </div>
                  <MetadataItem
                    label="Client Time Left"
                    value={(() => {
                      let targetDate = null;
                      if (project?.client_due_date) {
                        const time = project?.client_due_time || "00:00";
                        targetDate = `${project?.client_due_date}T${time.length === 5 ? time + ":00" : time}`;
                      }
                      return (
                        <Countdown 
                          date={targetDate} 
                          status={project?.status} 
                          isClientTime={true}
                          className="font-bold uppercase tracking-wider" 
                        />
                      );
                    })()}
                  />
                </div>
              )}

              {/* Assignee Deadline */}
              <MetadataItem
                label="Assignee Deadline Date"
                value={
                  project?.due_date
                    ? formatDeadlineDate(project.due_date)
                    : "Not Set"
                }
                isDate
                isRecessed
              />

              <MetadataItem
                label="Assignee Deadline Time"
                value={
                  project?.due_time ? formatTime(project.due_time) : "Not Set"
                }
                isTime
                isRecessed
              />

              {!isFreelancer && (
                <div className="pt-2">
                  <Button
                    variant="metallic"
                    onClick={() => {
                      setDeadlineType("assignee");
                      setModalDate(
                        project?.due_date
                          ? new Date(project.due_date)
                          : new Date(),
                      );
                      setModalTime(project?.due_time || "17:00");
                      setIsDeadlineModalOpen(true);
                    }}
                    className="w-full justify-center h-10 text-[10px] font-black uppercase tracking-widest px-2"
                  >
                    Edit Assignee Deadline
                  </Button>
                </div>
              )}

              <MetadataItem
                label="Assignee Time Left"
                value={(() => {
                  let targetDate = null;
                  if (project?.due_date) {
                    const time = project?.due_time || "00:00";
                    targetDate = `${project?.due_date}T${time.length === 5 ? time + ":00" : time}`;
                  }
                  return (
                    <Countdown 
                      date={targetDate} 
                      status={project?.status} 
                      className="font-bold uppercase tracking-wider" 
                    />
                  );
                })()}
              />

              {profile?.role === "Freelancer" &&
                project?.status?.trim().toLowerCase() === "approved" ? (
                <MetadataItem
                  label="Current Status"
                  value="Approved"
                  valueClassName="text-brand-success font-bold"
                />
              ) : (
                <Dropdown
                  value={project?.status || "In Progress"}
                  onChange={handleStatusChange}
                  options={useMemo(() => {
                    // 1. Management Roles: See full control list
                    if (isAdmin || isProjectManager) {
                      return [
                        { label: "In Progress", value: "In Progress" },
                        { label: "Done", value: "Done" },
                        { label: "Revision", value: "Revision" },
                        { label: "Revision Done", value: "Revision Done" },
                        { label: "Urgent", value: "Urgent" },
                        { label: "Urgent Done", value: "Urgent Done" },
                        { label: "Revision Urgent", value: "Revision Urgent" },
                        {
                          label: "Revision Urgent Done",
                          value: "Revision Urgent Done",
                        },
                        { label: "Final Files", value: "Final Files" },
                        {
                          label: "Final Files Done",
                          value: "Final Files Done",
                        },
                        {
                          label: "Sent For Approval",
                          value: "Sent For Approval",
                        },
                      ];
                    }

                    // 2. Design Team: Dynamic context-aware options
                    if (isDesignTeam) {
                      const currentStatus = (project?.status || "In Progress")
                        .trim()
                        .toLowerCase();
                      const dynamicOptions = [];

                      if (currentStatus === "in progress")
                        dynamicOptions.push({ label: "Done", value: "Done" });
                      if (currentStatus === "revision")
                        dynamicOptions.push({
                          label: "Revision Done",
                          value: "Revision Done",
                        });
                      if (currentStatus === "urgent")
                        dynamicOptions.push({
                          label: "Urgent Done",
                          value: "Urgent Done",
                        });
                      if (currentStatus === "final files")
                        dynamicOptions.push({
                          label: "Final Files Done",
                          value: "Final Files Done",
                        });
                      if (currentStatus === "revision urgent")
                        dynamicOptions.push({
                          label: "Revision Urgent Done",
                          value: "Revision Urgent Done",
                        });

                      // If already finished or in a state with no designer-level 'Done' variant
                      if (dynamicOptions.length === 0) {
                        return [
                          {
                            label: project?.status || "Done",
                            value: project?.status || "Done",
                          },
                        ];
                      }
                      return dynamicOptions;
                    }

                    return [{ label: "In Progress", value: "In Progress" }];
                  }, [isAdmin, isProjectManager, isDesignTeam, project?.status])}
                  size="md"
                >
                  <MetadataItem
                    label="Current Status"
                    value={project?.status || "In Progress"}
                    isSelect
                  />
                </Dropdown>
              )}
            </div>
          </MetadataSection>

          {/* Financials */}
          <MetadataSection
            title="Financials"
            isCollapsed={isSidebarCollapsed}
            collapsedHeight="lg:h-40"
          >
            {/* Budget is only visible to internal staff (PM/Admin), not Lead roles or Freelancers */}
            {/* Budget is only visible to internal staff (PM/Admin), not Lead roles or Freelancers */}
            {!isFreelancer && !userRole?.includes("team") && (
              <MetadataItem
                label="Budget"
                value={
                  isEditing ? (
                    <Input
                      type="number"
                      variant="flat"
                      size="none"
                      className="w-full"
                      inputClassName="!p-0 !h-auto font-bold !text-brand-primary !bg-transparent"
                      value={editState.price}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setEditState({ ...editState, price: "" as any });
                          return;
                        }
                        setEditState({
                          ...editState,
                          price: parseFloat(val) || 0,
                        });
                      }}
                    />
                  ) : (
                    `$${project?.price || "0"}`
                  )
                }
                leftIcon={isEditing && <span className="text-gray-500">$</span>}
                isAccent
                isRecessed={isEditing}
              />
            )}

            {/* If Team Designer viewing: they see their slab fee as "Payout" */}
            {userRole.includes("team designer") ? (
              <MetadataItem
                label="Payout"
                value={`$${project?.team_designer_fee || "0"}`}
                isAccent
              />
            ) : (
              /* If Team Lead or PM/Freelancer viewing */
              <>
                <MetadataItem
                  label={isFreelancer ? "Payout" : "Designer Fee"}
                  value={`$${project?.designer_fee || "0"}`}
                  isAccent={isFreelancer}
                />
                {/* Show the extra Team Designer share only to Team Leads or PMs */}
                {(project?.team_designer_id ||
                  project?.team_designer_fee > 0) &&
                  !userRole.includes("freelancer") && (
                    <MetadataItem
                      label="Team Designer Fee"
                      value={`$${project?.team_designer_fee || "0"}`}
                    />
                  )}
              </>
            )}
          </MetadataSection>

          {/* Configuration */}
          <MetadataSection
            title="Configuration"
            isCollapsed={isSidebarCollapsed}
            collapsedHeight="lg:h-52"
          >
            <div className="space-y-5">
              <MetadataItem
                label="Add-ons"
                value={
                  isEditing ? (
                    <div className="space-y-4 pt-2">
                      {[
                        "Social Media Kit",
                        "Stationery Designs",
                        "Logo",
                        "None",
                        "Other",
                      ].map((item) => {
                        const addonsData = editState.addons;
                        let isSelected = false;
                        let currentOther = "";

                        if (Array.isArray(addonsData)) {
                          isSelected = addonsData.includes(item);
                        } else if (
                          addonsData &&
                          typeof addonsData === "object"
                        ) {
                          isSelected = (addonsData.items || []).includes(item);
                          currentOther = addonsData.other || "";
                        }

                        return (
                          <div key={item} className="space-y-2">
                            <Checkbox
                              label={item}
                              variant="primary"
                              checked={isSelected}
                              onChange={() => {
                                let newItems = [];
                                let otherText = currentOther;

                                if (Array.isArray(addonsData)) {
                                  newItems = [...addonsData];
                                } else if (
                                  addonsData &&
                                  typeof addonsData === "object"
                                ) {
                                  newItems = [...(addonsData.items || [])];
                                  otherText = addonsData.other || "";
                                }

                                if (item === "None") {
                                  newItems = ["None"];
                                  otherText = "";
                                } else {
                                  newItems = newItems.filter(
                                    (i) => i !== "None",
                                  );
                                  if (newItems.includes(item)) {
                                    newItems = newItems.filter(
                                      (i) => i !== item,
                                    );
                                  } else {
                                    newItems.push(item);
                                  }
                                }

                                setEditState({
                                  ...editState,
                                  addons: { items: newItems, other: otherText },
                                });
                              }}
                            />
                            {item === "Other" && isSelected && (
                              <div className="pl-9 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Input
                                  variant="recessed"
                                  size="sm"
                                  className="w-full mt-1"
                                  inputClassName="text-[12px] text-brand-primary font-bold placeholder:text-gray-600"
                                  placeholder="Type other addon..."
                                  value={currentOther}
                                  onChange={(e) => {
                                    let items = [];
                                    if (Array.isArray(addonsData)) {
                                      items = [...addonsData];
                                    } else if (
                                      addonsData &&
                                      typeof addonsData === "object"
                                    ) {
                                      items = [...(addonsData.items || [])];
                                    }
                                    setEditState({
                                      ...editState,
                                      addons: { items, other: e.target.value },
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    (() => {
                      const addonsData = project?.addons;
                      let addonsArray: string[] = [];

                      // Normalize addons data
                      if (Array.isArray(addonsData)) {
                        addonsArray = addonsData.filter(
                          (item) =>
                            item &&
                            typeof item === "string" &&
                            item.trim() !== "" &&
                            item.toLowerCase() !== "none",
                        );
                      } else if (addonsData && typeof addonsData === "object") {
                        const items = (addonsData as any).items;
                        const other = (addonsData as any).other;
                        if (Array.isArray(items)) {
                          addonsArray = items
                            .map((item: string) =>
                              item === "Other" && other ? other : item,
                            )
                            .filter(
                              (item: string) =>
                                item &&
                                typeof item === "string" &&
                                item.trim() !== "" &&
                                item.toLowerCase() !== "none" &&
                                item !== "Other",
                            );
                        }
                      }

                      if (addonsArray.length === 0) return "None";

                      return (
                        <div className="flex flex-col gap-2 pt-1">
                          {addonsArray.map((addon, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center justify-center self-start px-3 py-1 bg-brand-primary/10 rounded-md text-[10px] font-black text-brand-primary uppercase tracking-wider shadow-sm leading-none h-[22px]"
                            >
                              {addon}
                            </span>
                          ))}
                        </div>
                      );
                    })()
                  )
                }
              />

              {!isFreelancer && (
                <div className="space-y-4">
                  {/* Unified Trigger Alert Field */}
                  {!project?.alert_status || project?.alert_status === 'none' || project?.alert_status === 'confirmed' ? (
                    <Dropdown
                      value="None"
                      onChange={(val) => {
                        if (val !== 'None') {
                          setAlertForm(prev => ({ ...prev, type: val === 'Art Help' ? 'arthelp' : 'dispute' }));
                          setIsAlertModalOpen(true);
                        }
                      }}
                      options={[
                        { label: "None", value: "None", icon: <div className="w-4 h-4 rounded-full border border-gray-600" /> },
                        { label: "Art Help", value: "Art Help", icon: <IconAlertTriangle size={16} className="text-brand-info" /> },
                        { label: "Dispute", value: "Dispute", icon: <IconAlertTriangle size={16} className="text-brand-error" /> },
                      ]}
                      size="md"
                    >
                      <MetadataItem label="Trigger Alert" value="None" isSelect />
                    </Dropdown>
                  ) : (
                    <MetadataItem 
                      label={<span className={project.alert_type === 'dispute' ? 'text-brand-error' : 'text-brand-info'}>Trigger Alert</span>} 
                      value={
                        <div className="flex items-center gap-2">
                           <span className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${project.alert_type === 'dispute' ? 'bg-brand-error/[0.15] text-brand-error' : 'bg-brand-info/[0.15] text-brand-info'}`}>
                              {project.alert_type === 'dispute' ? 'Dispute' : 'Art Help'}
                           </span>
                           <span className={`text-[8px] font-bold uppercase tracking-widest leading-none text-gray-500`}>
                             {project.alert_status === 'resolved' ? 'Pending Confirmation' : project.alert_status}
                           </span>
                        </div>
                      }
                    />
                  )}


                  {/* Initiator Confirmation */}
                  {project?.alert_status === 'resolved' && (isAdmin || isProjectManager) && (
                    <Button
                      variant="metallic-success"
                      className="w-full h-11 text-[11px] font-black uppercase tracking-widest"
                      onClick={() => setIsConfirmModalOpen(true)}
                    >
                      Confirm Resolution
                    </Button>
                  )}
                </div>
              )}

              {/* Reopen Project: Only visible on the Review screen for Approved projects (Not for Freelancers) */}
              {project?.status?.toLowerCase().includes("approved") &&
                viewMode === "review" &&
                profile?.role !== "Freelancer" && (
                  <Button
                    variant="metallic"
                    className="w-full h-11 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/10"
                    leftIcon={<IconRefreshCw size={14} />}
                    onClick={handleReopenProject}
                  >
                    Reopen Project
                  </Button>
                )}

              {/* Back to Review: Visible on Timeline if project is approved or review is submitted (Not for Freelancers) */}
              {(project?.status?.toLowerCase().includes("approved") ||
                project?.payout_completed ||
                reviewSubmitted) &&
                viewMode === "timeline" &&
                profile?.role !== "Freelancer" && (
                  <Button
                    variant="metallic"
                    className="w-full h-11 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/10"
                    leftIcon={<IconStar size={14} />}
                    onClick={() => setViewMode("review")}
                  >
                    Back to Review
                  </Button>
                )}
            </div>
          </MetadataSection>

          {/* QA Workflow Control Section */}
          {isDesignTeam && (
            <MetadataSection
              title="QA Workflow"
              isCollapsed={isSidebarCollapsed}
              collapsedHeight="lg:h-40"
            >
              <div className="space-y-5">
                <MetadataItem
                  label="QA Status"
                  value={
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${project?.qa_status === "qa_approved"
                            ? "bg-brand-success"
                            : project?.qa_status === "pending_qa"
                              ? "bg-brand-warning"
                              : project?.qa_status === "qa_revision"
                                ? "bg-brand-error"
                                : "bg-gray-600"
                          }`}
                      />
                      <span className="uppercase">
                        {project?.qa_status?.replace("_", " ") || "Not Started"}
                      </span>
                    </div>
                  }
                />

                {/* DESIGNER ACTIONS: Submit for QA */}
                {(userRole.includes("team designer") || userRole.includes("freelancer")) &&
                  (!project?.qa_status ||
                    project?.qa_status === "qa_revision") && (
                    <Button
                      variant="metallic"
                      className="w-full h-11 text-[11px] font-black uppercase tracking-widest shadow-lg"
                      leftIcon={<IconSend size={14} />}
                      onClick={() => setIsSubmitQaModalOpen(true)}
                      isLoading={isQaActionLoading}
                    >
                      Submit for QA
                    </Button>
                  )}

                {/* QA ACTION CONTROLS: Lead/Manager Approve or Request Revision */}
                {(isTeamLead || isProjectManager || isAdmin) &&
                  project?.qa_status === "pending_qa" && (
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        variant="metallic"
                        className="w-full h-11 text-[11px] font-black uppercase tracking-widest bg-brand-success/20 border-brand-success/30 hover:bg-brand-success text-white"
                        leftIcon={<IconCheckCircle size={14} />}
                        onClick={() =>
                          handleQaAction(
                            "approve",
                            "Design approved. Proceed to final files.",
                          )
                        }
                        isLoading={isQaActionLoading}
                      >
                        Approve Design
                      </Button>
                      <Button
                        variant="recessed"
                        className="w-full h-11 text-[11px] font-black uppercase tracking-widest border-brand-error/20 text-brand-error hover:bg-brand-error/10"
                        leftIcon={<IconEdit size={14} />}
                        onClick={() =>
                          handleQaAction(
                            "revision",
                            "Revision requested. Please check feedback in QA Chat.",
                          )
                        }
                        isLoading={isQaActionLoading}
                      >
                        Request Changes
                      </Button>
                    </div>
                  )}

                {project?.qa_status === "qa_approved" && (
                  <div className="p-4 rounded-xl bg-brand-success/10 border border-brand-success/20 text-center animate-in fade-in zoom-in duration-500">
                    <p className="text-[10px] font-black text-brand-success uppercase tracking-widest">
                      QA Verification Complete
                    </p>
                  </div>
                )}
              </div>
            </MetadataSection>
          )}

          {effectiveRole === "Super Admin" && (
            <>
              {/* Labels */}
              <MetadataSection
                title="Project Labels"
                isCollapsed={isSidebarCollapsed}
                collapsedHeight="lg:h-40"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <IconTag size={12} />
                      Active Labels
                    </p>
                    {!isFreelancer && (
                      <button
                        onClick={() => setIsLabelModalOpen(true)}
                        className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline"
                      >
                        Manage
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {project?.labels && project.labels.length > 0 ? (
                      project.labels.map((label: any) => (
                        <div
                          key={label.id}
                          className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                          style={{
                            backgroundColor: `${label.color}15`,
                            color: label.color,
                            border: `1px solid ${label.color}30`,
                          }}
                        >
                          <div
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                          {!isFreelancer && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const { error } = await supabase
                                    .from("project_label_assignments")
                                    .delete()
                                    .eq("project_id", canonicalId)
                                    .eq("label_id", label.id);
                                  if (error) throw error;
                                  setProject((prev: any) => ({
                                    ...prev,
                                    labels: (prev.labels || []).filter(
                                      (l: any) => l.id !== label.id,
                                    ),
                                  }));
                                  addToast({
                                    type: "success",
                                    title: "Removed",
                                    message: "Label removed",
                                  });
                                } catch (err: any) {
                                  addToast({
                                    type: "error",
                                    title: "Error",
                                    message: err.message,
                                  });
                                }
                              }}
                              className="ml-1 hover:text-white"
                            >
                              <IconX size={10} />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-600 italic px-1">
                        No labels assigned.
                      </p>
                    )}
                  </div>
                </div>
              </MetadataSection>

              <LabelManagerModal
                isOpen={isLabelModalOpen}
                onClose={() => setIsLabelModalOpen(false)}
                type="project"
                onLabelsChange={() => fetchProject(canonicalId)}
              />
            </>
          )}
        </div>
      </aside>

      {/* 2. RIGHT COLUMN - MAIN CONTENT AREA */}
      <div
        className={`flex-1 ${mobileView === "brief" ? "flex" : "hidden lg:flex"} flex-col h-full min-w-0 bg-transparent`}
      >
        {/* 1. Primary Header (Back + Title) */}
        <header className="h-16 lg:h-20 shrink-0 border-b border-surface-border flex items-center bg-surface-bg/40 backdrop-blur-xl z-20 transition-all duration-300">
          <div className="w-full px-6 lg:px-10 flex items-center justify-center lg:justify-between relative">
            {/* Left Aligned Project Title & Back Button */}
            <div className="flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-start">
              <button
                onClick={() => setMobileView("metadata")}
                className="lg:hidden p-2 absolute left-4 text-gray-400 hover:text-white transition-all shrink-0 active:scale-95"
              >
                <IconChevronLeft size={20} />
              </button>
              {isProjectLoading ? (
                <Skeleton className="h-7 w-64" />
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight text-center lg:text-left">
                    <span className="lg:hidden">Project Brief</span>
                    <span className="hidden lg:inline">
                      {project?.project_title || "Untitled Project"}
                    </span>
                  </h1>
                  {/* Desktop Only: Status Chips beside title */}
                  <div className="hidden lg:flex items-center gap-3">
                    {project?.has_dispute && (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error">
                        Dispute
                      </span>
                    )}
                    {project?.has_art_help && project?.alert_status !== 'resolved' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-info/15 text-brand-info">
                        Art Help
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Aligned Status (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-2">
              {isProjectLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  {(() => {
                    const addonsData = project?.addons;
                    let addonsArray: string[] = [];
                    if (Array.isArray(addonsData)) {
                      addonsArray = addonsData.filter(item => item && item.trim() !== "" && item.toLowerCase() !== "none");
                    } else if (addonsData && typeof addonsData === "object") {
                      const items = (addonsData as any).items;
                      const other = (addonsData as any).other;
                      if (Array.isArray(items)) {
                        addonsArray = items.map((item: string) => item === "Other" && other ? other : item).filter((item: string) => item && item.trim() !== "" && item.toLowerCase() !== "none" && item !== "Other");
                      }
                    }
                    if (addonsArray.length === 0) return null;
                    const label = addonsArray.length === 1 ? `${addonsArray[0]} Included` : "Multiple Add-ons Included";
                    return (
                      <span className="px-3 py-1 bg-brand-addon-indicator/10 rounded-md text-[10px] font-black text-brand-addon-indicator uppercase tracking-wider">
                        {label}
                      </span>
                    );
                  })()}
                  <span className={getStatusCapsuleClasses(project?.status || "In Progress")}>
                    {project?.status || "In Progress"}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 2. Secondary Mobile-Only Header Bar (Status Chips) */}
        {!isProjectLoading && project && (
          <div className="lg:hidden shrink-0 h-14 border-b border-surface-border flex items-center bg-surface-bg/40 backdrop-blur-xl z-10 transition-all duration-300">
            <div className="w-full px-6 flex items-center justify-center gap-2 flex-wrap overflow-x-auto no-scrollbar py-2">
              {project?.has_dispute && (
                <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-error/15 text-brand-error">
                  Dispute
                </span>
              )}
              {project?.has_art_help && (
                <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-info/15 text-brand-info">
                  Art Help
                </span>
              )}
              {(() => {
                const addonsData = project?.addons;
                let addonsArray: string[] = [];
                if (Array.isArray(addonsData)) {
                  addonsArray = addonsData.filter(item => item && item.trim() !== "" && item.toLowerCase() !== "none");
                } else if (addonsData && typeof addonsData === "object") {
                  const items = (addonsData as any).items;
                  const other = (addonsData as any).other;
                  if (Array.isArray(items)) {
                    addonsArray = items.map((item: string) => item === "Other" && other ? other : item).filter((item: string) => item && item.trim() !== "" && item.toLowerCase() !== "none" && item !== "Other");
                  }
                }
                if (addonsArray.length === 0) return null;
                const label = addonsArray.length === 1 ? `${addonsArray[0]} Included` : "Multiple Add-ons Included";
                return (
                  <span className="shrink-0 px-3 py-1 bg-brand-addon-indicator/10 rounded-md text-[10px] font-black text-brand-addon-indicator uppercase tracking-wider">
                    {label}
                  </span>
                );
              })()}
              <span className={`shrink-0 ${getStatusCapsuleClasses(project?.status || "In Progress")}`}>
                {project?.status || "In Progress"}
              </span>
            </div>
          </div>
        )}

        {/* Top Section - Project content (scrollable) */}
        <main className="flex-1 overflow-y-auto nova-canvas scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent">
          <div
            className={`w-full p-6 lg:p-10 flex flex-col relative z-10 bg-transparent ${viewMode === "review" ? "h-full" : "min-h-full"}`}
          >
            {!project && !isProjectLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-6">
                <div className="w-16 h-16 rounded-full bg-brand-error/10 flex items-center justify-center text-brand-error">
                  <IconAlertTriangle size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Project Not Found
                  </h3>
                  <Button onClick={onBack} variant="secondary">
                    Go Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {viewMode === "review" ? (
                  renderReviewContent()
                ) : (
                  <>
                    {/* 1. Project Brief Section (Always visible if project exists/is loading) */}
                    <section className="shrink-0">
                      <ElevatedMetallicCard title="Project Brief">
                        <div className="space-y-10">
                          {/* 1. Brief Text */}
                          <div className="space-y-6 text-gray-300 text-sm">
                            {isProjectLoading ? (
                              <div className="space-y-3">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                              </div>
                            ) : isEditing && editState ? (
                              <TextArea
                                variant="recessed"
                                className="w-full"
                                inputClassName="min-h-[400px]"
                                value={editState.brief}
                                onChange={(e) =>
                                  setEditState({
                                    ...editState,
                                    brief: e.target.value,
                                  })
                                }
                                placeholder="Project Brief..."
                              />
                            ) : project?.brief ? (
                              <ReactMarkdown
                                components={markdownComponents}
                                remarkPlugins={markdownPlugins}
                              >
                                {parseCodesLogicMarkdown(project.brief)}
                              </ReactMarkdown>
                            ) : (
                              <p className="text-gray-500 italic">
                                No brief provided.
                              </p>
                            )}
                          </div>

                          {/* 2. Attachments Section */}
                          {(isEditing && editState
                            ? editState.attachments?.length > 0 || true
                            : project?.attachments &&
                            Array.isArray(project.attachments) &&
                            project.attachments.length > 0) && (
                              <div className="pt-8 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                                    Attachments
                                  </h4>
                                  {isEditing && (
                                    <>
                                      <input
                                        type="file"
                                        ref={briefFileInputRef}
                                        onChange={handleBriefFileSelect}
                                        multiple
                                        className="hidden"
                                      />
                                      <button
                                        onClick={() =>
                                          briefFileInputRef.current?.click()
                                        }
                                        disabled={isBriefUploading}
                                        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all duration-300 disabled:opacity-50"
                                      >
                                        {isBriefUploading ? (
                                          <IconRefreshCw
                                            size={12}
                                            className="animate-spin text-brand-primary"
                                          />
                                        ) : (
                                          <IconPlus
                                            size={12}
                                            className="text-brand-primary group-hover:scale-110 transition-transform"
                                          />
                                        )}
                                        <span className="text-[10px] font-black text-gray-400 group-hover:text-white uppercase tracking-widest transition-colors">
                                          {isBriefUploading
                                            ? "Processing..."
                                            : "Add Files"}
                                        </span>
                                      </button>
                                    </>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-4">
                                  {(isEditing && editState
                                    ? editState.attachments || []
                                    : project?.attachments || []
                                  ).map((file: any, i: number) => (
                                    <div
                                      key={i}
                                      className="group/posted-file relative cursor-pointer hover:scale-[1.02] transition-transform"
                                      onClick={() => handleAttachmentClick(file)}
                                    >
                                      <div className="w-20 h-20 rounded-xl border border-surface-border bg-surface-overlay flex flex-col items-center justify-center relative overflow-hidden">
                                        <FileIcon
                                          name={file.name}
                                          type={file.type}
                                          url={file.url}
                                        />
                                      </div>

                                      {/* OVERLAY for Download/Copy or Delete if Editing */}
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/posted-file:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20 backdrop-blur-[1px]">
                                        {isEditing ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeBriefFile(i);
                                            }}
                                            className="p-1.5 rounded-full bg-brand-error/20 hover:bg-brand-error text-brand-error hover:text-white transition-colors border border-brand-error/30"
                                            title="Delete"
                                          >
                                            <IconTrash size={14} />
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (
                                                  isImageFile(
                                                    file.name,
                                                    file.type,
                                                  )
                                                ) {
                                                  handleAttachmentClick(file);
                                                } else {
                                                  forceDownload(
                                                    file.url,
                                                    file.name || "download",
                                                  );
                                                }
                                              }}
                                              className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                              title={
                                                isImageFile(file.name, file.type)
                                                  ? "Preview"
                                                  : "Download"
                                              }
                                            >
                                              {isImageFile(
                                                file.name,
                                                file.type,
                                              ) ? (
                                                <IconEye size={14} />
                                              ) : (
                                                <IconDownload size={14} />
                                              )}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </ElevatedMetallicCard>
                    </section>

                    {/* 2. Top Separator */}
                    <div className="border-t border-surface-border w-full my-10" />

                    {/* 3. Activity Timeline Section */}
                    <section className="flex-1 flex flex-col mb-10 min-h-[400px]">
                      {/* ACTIVITY TAB TOGGLE */}
                      {(isDesignTeam || isProjectManager) && (
                        <div className="flex items-center gap-2 mb-8 bg-black/40 p-1.5 rounded-2xl border border-white/5 mx-auto md:ml-0 md:self-start shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] backdrop-blur-md">
                          <button
                            onClick={() => setActivityTab("timeline")}
                            className={`flex items-center justify-center px-3 md:px-8 py-2 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-500 relative group overflow-hidden ${activityTab === "timeline"
                                ? "bg-gradient-to-b from-[#FF7A5C] via-[#FF6B4B] to-[#D45900] text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-t border-white/30 border-x border-white/10 border-b border-black/40 scale-[1.02]"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                              }`}
                          >
                            Project Timeline
                            {activityTab === "timeline" && (
                              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                            )}
                          </button>
                          <button
                            onClick={() => setActivityTab("qa")}
                            className={`flex items-center justify-center px-3 md:px-8 py-2 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-500 relative group overflow-hidden ${activityTab === "qa"
                                ? "bg-gradient-to-b from-[#A78BFA] via-[#8B5CF6] to-[#6D28D9] text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-t border-white/30 border-x border-white/10 border-b border-black/40 scale-[1.02]"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                              }`}
                            title="Internal QA Discussions"
                          >
                            QA History
                            {activityTab === "qa" && (
                              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                            )}
                          </button>

                          <button
                            onClick={() => setActivityTab("discussion")}
                            className={`flex items-center justify-center px-3 md:px-8 py-2 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all duration-500 relative group overflow-hidden ${activityTab === "discussion"
                                ? "bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-t border-white/30 border-x border-white/10 border-b border-black/40 scale-[1.02]"
                                : "text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent"
                              }`}
                            title="Team Chat"
                          >
                            Discussion
                            {activityTab === "discussion" && (
                              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                            )}
                          </button>
                        </div>
                      )}

                      {isCommentsLoading && activeComments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                          <div
                            className={`w-10 h-10 border-2 rounded-full animate-spin ${activityTab === "qa"
                                ? "border-violet-500/20 border-t-violet-500"
                                : "border-brand-primary/20 border-t-brand-primary"
                              }`}
                          />
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.3em] ml-1">
                            Loading history
                          </p>
                        </div>
                      ) : activeComments.length > 0 ? (
                        <div className="space-y-8">
                          {/* System Logs Expandable Card */}
                          {(() => {
                            const systemLogs = activeComments.filter(
                              (c) => c.author_role === "system_log",
                            );
                            if (systemLogs.length === 0) return null;
                            return (
                              <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 mb-8">
                                {/* Header - Always Visible */}
                                <div
                                  onClick={() =>
                                    setIsLogsExpanded(!isLogsExpanded)
                                  }
                                  className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden cursor-pointer flex items-center justify-between group/header"
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />
                                  <div className="flex items-center gap-3 relative z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary leading-none">
                                      SYSTEM ACTIVITY LOGS
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                      {systemLogs.length}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 relative z-10">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover/header:text-gray-400 transition-colors">
                                      {isLogsExpanded
                                        ? "Hide Details"
                                        : "View Details"}
                                    </span>
                                    <IconChevronRight
                                      size={14}
                                      className={`text-gray-600 group-hover/header:text-brand-primary transition-transform duration-500 ${isLogsExpanded ? "rotate-90" : ""}`}
                                    />
                                  </div>
                                </div>

                                {/* Body - Toggleable */}
                                {isLogsExpanded && (
                                  <div
                                    className={`p-6 bg-white/[0.01] space-y-2 ${isCommentsLoading ? "" : "animate-in fade-in slide-in-from-top-2 duration-500"}`}
                                  >
                                    {systemLogs.map((log, lIdx) => {
                                      const updatedMatch = log.content?.match(
                                        /^\[(.*?)\] updated: (.*)$/,
                                      );

                                      return (
                                        <div
                                          key={log.id || lIdx}
                                          className="relative bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 px-6 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] group/log-card overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
                                        >
                                          {/* Diagonal Metallic Shine Effect */}
                                          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] pointer-events-none" />
                                          {/* Single Line Flow */}
                                          <div className="relative z-10 flex items-center justify-between gap-6 w-full group/log-row">
                                            {/* Left: Identity */}
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                              <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none">
                                                  {new Date(log.created_at)
                                                    .toLocaleString("en-GB", {
                                                      day: "numeric",
                                                      month: "short",
                                                      hour: "numeric",
                                                      minute: "2-digit",
                                                      hour12: true,
                                                    })
                                                    .toUpperCase()}
                                                </span>
                                              </div>
                                              <div className="w-px h-3 bg-white/10" />
                                              <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.1em] leading-none">
                                                {updatedMatch
                                                  ? updatedMatch[1]
                                                  : "SYSTEM"}
                                              </span>
                                            </div>

                                            {/* Right: Activity Details */}
                                            <div className="flex-grow flex justify-end items-center gap-4">
                                              {updatedMatch ? (
                                                <div className="flex items-center gap-8">
                                                  {updatedMatch[2]
                                                    .split(" | ")
                                                    .map(
                                                      (
                                                        change: string,
                                                        cIdx: number,
                                                      ) => {
                                                        const [field, values] =
                                                          change.split(": ");
                                                        const [oldVal, newVal] =
                                                          (values || "").split(
                                                            / [-→] /,
                                                          );
                                                        return (
                                                          <div
                                                            key={cIdx}
                                                            className="flex items-center gap-4 text-[12px]"
                                                          >
                                                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                                                              {field}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                              <span className="text-gray-500 font-medium text-[11px]">
                                                                {oldVal ||
                                                                  "None"}
                                                              </span>
                                                              <span className="text-brand-primary/30 text-[10px]">
                                                                →
                                                              </span>
                                                              <span className="text-white font-bold text-[12px]">
                                                                {newVal ||
                                                                  values}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        );
                                                      },
                                                    )}
                                                </div>
                                              ) : (
                                                <p className="text-[11px] text-gray-300 leading-none font-medium text-right">
                                                  {log.content?.replace(
                                                    /^🚀 /,
                                                    "",
                                                  )}
                                                </p>
                                              )}

                                              {/* Delete Button for Super Admin - Only visible in Edit mode */}
                                              {isEditing &&
                                                (hasPermission(
                                                  "delete_timeline_items",
                                                ) ||
                                                  canEdit) && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteComment(
                                                        log.id,
                                                      );
                                                    }}
                                                    className="p-1 rounded bg-brand-error/10 text-brand-error border border-brand-error/20 opacity-0 group-hover/log-row:opacity-100 transition-all hover:bg-brand-error hover:text-white relative z-50"
                                                    title="Delete Log Entry"
                                                  >
                                                    <IconTrash size={12} />
                                                  </button>
                                                )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Pagination: Show Older Activities Button */}
                          {currentHasMore && (
                            <div className="flex justify-center pb-4">
                              <button
                                onClick={fetchOlderComments}
                                disabled={isLoadingOlder}
                                className="group flex flex-col items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 disabled:opacity-50"
                              >
                                {isLoadingOlder ? (
                                  <div className="w-4 h-4 border-2 border-brand-primary/20 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <IconRefreshCw
                                      size={12}
                                      className="text-brand-primary group-hover:rotate-180 transition-transform duration-700"
                                    />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                                      Show Older Activities
                                    </span>
                                  </div>
                                )}
                              </button>
                            </div>
                          )}

                          {activeComments
                            .filter((c) => c.author_role !== "system_log")
                            .map((comment, index) => (
                              <div
                                key={comment.id || `comment-${index}`}
                                className={
                                  isCommentsLoading
                                    ? ""
                                    : "animate-in fade-in slide-in-from-left-4"
                                }
                                style={{
                                  animationDelay: isCommentsLoading
                                    ? "0ms"
                                    : `${Math.min(index, 10) * 100}ms`,
                                }}
                              >
                                {(() => {
                                  // 1. Status Change Event
                                  const isStatusChange =
                                    comment.content?.startsWith(
                                      "STATUS_CHANGED:",
                                    );
                                  if (isStatusChange) {
                                    const parts = comment.content.split(":");
                                    const oldStatus = parts[1];
                                    const newStatus = parts[2];
                                    return (
                                      <div className="space-y-8 mb-8">
                                        <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
                                          <div className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden">
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />
                                            <div className="flex justify-between items-center relative z-10 w-full">
                                              <span
                                                className={`text-[10px] font-bold uppercase tracking-widest ${getStatusCapsuleClasses(
                                                  newStatus,
                                                )
                                                    .split(" ")
                                                    .find((c) =>
                                                      c.includes("text-"),
                                                    ) || "text-brand-primary"
                                                  }`}
                                              >
                                                STATUS CHANGED
                                              </span>
                                              {isEditing &&
                                                (hasPermission(
                                                  "delete_timeline_items",
                                                ) ||
                                                  canEdit) && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteComment(
                                                        comment.id,
                                                      );
                                                    }}
                                                    className="p-1 rounded bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all scale-75 relative z-50"
                                                    title="Delete Status Change"
                                                  >
                                                    <IconTrash size={14} />
                                                  </button>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none -z-10">
                                              <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Changed By
                                            </span>
                                            <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                              {comment.author_name || "User"}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Date
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                                {new Date(
                                                  comment.created_at,
                                                ).toLocaleDateString("en-GB", {
                                                  day: "2-digit",
                                                  month: "long",
                                                  year: "numeric",
                                                })}
                                              </span>
                                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                {new Date(comment.created_at)
                                                  .toLocaleTimeString("en-GB", {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                    hour12: true,
                                                  })
                                                  .toUpperCase()}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Previous Status
                                            </span>
                                            <span
                                              className={`${getStatusCapsuleClasses(oldStatus)} opacity-50`}
                                            >
                                              {oldStatus}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Current Status
                                            </span>
                                            <span
                                              className={getStatusCapsuleClasses(
                                                newStatus,
                                              )}
                                            >
                                              {newStatus}
                                            </span>
                                          </div>
                                        </div>
                                        {newStatus
                                          .toLowerCase()
                                          .includes("approved") && (
                                            <div className="w-full animate-in fade-in slide-in-from-top-2 duration-700">
                                              <div className="w-full bg-brand-warning/10 border border-brand-warning/30 rounded-2xl p-5 flex items-start gap-4 shadow-[0_8px_32px_-8px_rgba(245,158,11,0.15)] overflow-hidden relative group/alert">
                                                <div className="absolute inset-0 bg-gradient-to-r from-brand-warning/5 via-transparent to-transparent pointer-events-none" />
                                                <div className="p-2.5 rounded-xl bg-brand-warning/15 border border-brand-warning/30 text-brand-warning shrink-0 shadow-lg group-hover/alert:scale-110 transition-transform duration-500">
                                                  <IconAlertTriangle size={20} />
                                                </div>
                                                <div className="space-y-1 py-1">
                                                  <p className="text-sm font-black text-white uppercase tracking-wider mb-1">
                                                    Project Approved
                                                  </p>
                                                  <p className="text-[12px] font-bold text-brand-warning/90 leading-relaxed uppercase tracking-widest">
                                                    This Project Is Approved, But
                                                    It can reopen IF The Client
                                                    Asks For Any Revisions.
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    );
                                  }

                                  // 2. Deadline Update Event
                                  const isDeadlineUpdate =
                                    comment.content?.startsWith(
                                      "DEADLINE_UPDATED|",
                                    ) ||
                                    comment.content?.startsWith(
                                      "DEADLINE_UPDATED:",
                                    ) ||
                                    comment.content?.startsWith(
                                      "CLIENT_DEADLINE_UPDATED|",
                                    );
                                  if (isDeadlineUpdate) {
                                    const isClient =
                                      comment.content?.startsWith(
                                        "CLIENT_DEADLINE_UPDATED",
                                      );
                                    const isPipe =
                                      comment.content?.includes("|");
                                    const parts = comment.content?.split(
                                      isPipe ? "|" : ":",
                                    );
                                    let oldDate, newDate, oldTime, newTime;
                                    if (isPipe) {
                                      oldDate = parts[1];
                                      newDate = parts[2];
                                      oldTime = parts[3];
                                      newTime = parts[4];
                                    } else {
                                      oldDate = parts[1];
                                      newDate = parts[2];
                                      oldTime =
                                        parts[3] === "Not Set"
                                          ? "Not Set"
                                          : `${parts[3]}:${parts[4]}`;
                                      newTime =
                                        parts.length > 6
                                          ? `${parts[5]}:${parts[6]}`
                                          : parts.length > 5 &&
                                            parts[3] === "Not Set"
                                            ? `${parts[4]}:${parts[5]}`
                                            : parts[4];
                                    }

                                    const formatDateLong = (dStr: string) => {
                                      try {
                                        const d = new Date(dStr);
                                        if (isNaN(d.getTime())) return dStr;
                                        return d.toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "long",
                                          year: "numeric",
                                        });
                                      } catch (e) {
                                        return dStr;
                                      }
                                    };

                                    const formattedOldDate =
                                      oldDate === "Not Set"
                                        ? "Not Set"
                                        : formatDateLong(oldDate);
                                    const formattedNewDate =
                                      formatDateLong(newDate);
                                    const formattedOldTime =
                                      oldTime === "Not Set"
                                        ? "Not Set"
                                        : formatTime(oldTime);
                                    const formattedNewTime =
                                      formatTime(newTime);

                                    if (isClient && isFreelancer) return null;

                                    return (
                                      <div className="space-y-8 mb-8">
                                        <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
                                          <div className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden">
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />
                                            <div className="flex justify-between items-center relative z-10 w-full">
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF6B4B]">
                                                {isClient
                                                  ? "CLIENT DEADLINE UPDATED"
                                                  : "DEADLINE UPDATED"}
                                              </span>
                                              {isEditing &&
                                                (hasPermission(
                                                  "delete_timeline_items",
                                                ) ||
                                                  canEdit) && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteComment(
                                                        comment.id,
                                                      );
                                                    }}
                                                    className="p-1 rounded bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all scale-75 relative z-50"
                                                    title="Delete Deadline Update"
                                                  >
                                                    <IconTrash size={14} />
                                                  </button>
                                                )}
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Changed By
                                            </span>
                                            <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                              {comment.author_name || "User"}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Previous Deadline
                                            </span>
                                            <div className="flex items-center gap-2 opacity-50">
                                              <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                                {formattedOldDate}
                                              </span>
                                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                {formattedOldTime}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Current Deadline
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] font-bold text-[#FF6B4B] uppercase tracking-widest">
                                                {formattedNewDate}
                                              </span>
                                              <span className="text-[11px] font-bold text-[#FF6B4B]/60 uppercase tracking-widest">
                                                {formattedNewTime}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // 3. Project Assigned Event
                                  const isAssigned =
                                    comment.content?.startsWith(
                                      "PROJECT_ASSIGNED|",
                                    ) ||
                                    comment.content?.startsWith(
                                      "PROJECT_ASSIGNED:",
                                    );
                                  if (isAssigned) {
                                    const isPipe =
                                      comment.content?.includes("|");
                                    const parts =
                                      comment.content?.split(
                                        isPipe ? "|" : ":",
                                      ) || [];
                                    const createdAt = parts[1];
                                    const assignedTo = parts[2];
                                    return (
                                      <div className="space-y-8 mb-8">
                                        <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
                                          <div className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden">
                                            <div className="flex justify-between items-center relative z-10 w-full">
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                                                PROJECT ASSIGNED
                                              </span>
                                              {isEditing &&
                                                (hasPermission(
                                                  "delete_timeline_items",
                                                ) ||
                                                  canEdit) && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteComment(
                                                        comment.id,
                                                      );
                                                    }}
                                                    className="p-1 rounded bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all scale-75 relative z-50"
                                                    title="Delete Project Assignment"
                                                  >
                                                    <IconTrash size={14} />
                                                  </button>
                                                )}
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Assigned To
                                            </span>
                                            <span className="text-[11px] font-bold text-brand-primary uppercase tracking-widest">
                                              {assignedTo}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Date
                                            </span>
                                            <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                              {new Date(
                                                createdAt || comment.created_at,
                                              ).toLocaleDateString("en-GB", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                              })}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // 4. Project Reopened Event
                                  const isReopenEvent =
                                    comment.content?.startsWith(
                                      "PROJECT_REOPENED:",
                                    );
                                  if (isReopenEvent) {
                                    const parts = comment.content.split(":");
                                    const oldStatus = parts[1] || "Approved";
                                    return (
                                      <div className="space-y-8 mb-8">
                                        <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
                                          <div className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden">
                                            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />
                                            <div className="flex justify-between items-center relative z-10 w-full">
                                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFB02E]">
                                                PROJECT REOPENED
                                              </span>
                                              {isEditing &&
                                                (hasPermission(
                                                  "delete_timeline_items",
                                                ) ||
                                                  canEdit) && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteComment(
                                                        comment.id,
                                                      );
                                                    }}
                                                    className="p-1 rounded bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all scale-75 relative z-50"
                                                    title="Delete Reopen Record"
                                                  >
                                                    <IconTrash size={14} />
                                                  </button>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none -z-10">
                                              <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Reopened By
                                            </span>
                                            <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                              {comment.author_name || "User"}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Date
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                                {new Date(
                                                  comment.created_at,
                                                ).toLocaleDateString("en-GB", {
                                                  day: "2-digit",
                                                  month: "long",
                                                  year: "numeric",
                                                })}
                                              </span>
                                              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                                {new Date(comment.created_at)
                                                  .toLocaleTimeString("en-GB", {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                    hour12: true,
                                                  })
                                                  .toUpperCase()}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Previous Status
                                            </span>
                                            <span
                                              className={`${getStatusCapsuleClasses(oldStatus)} opacity-50`}
                                            >
                                              {oldStatus}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between px-6 py-4 bg-white/[0.01]">
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              Current Status
                                            </span>
                                            <span
                                              className={getStatusCapsuleClasses(
                                                "In Progress",
                                              )}
                                            >
                                              Reopened
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }


                                // 6. Art Help / Dispute Card Rendering (Unified Stack Style)
                                if (comment.author_role === "art_help_log" || comment.author_role === "dispute_log" || comment.author_role === "alert_resolved_log" || comment.author_role === "alert_confirmed_log") {
                                  const isTrigger = comment.author_role.includes("_log") && !comment.author_role.includes("resolved") && !comment.author_role.includes("confirmed");
                                  const isResolved = comment.author_role === "alert_resolved_log";
                                  const isConfirmed = comment.author_role === "alert_confirmed_log";
                                  const isDispute = comment.author_role === "dispute_log";
                                  const isActuallyResolved = isResolved && project.alert_status === 'resolved';
                                  const isOfficiallyClosed = isConfirmed || (isResolved && project.alert_status === null && project.has_art_help === false);

                                  const themeColor = isDispute ? "#EF4444" : (isTrigger ? "#0EA5E9" : (isOfficiallyClosed ? "#4ade80" : "#818cf8"));
                                  const darkerColor = isDispute ? "#b91c1c" : "#0369a1";
                                  const labelText = isDispute ? "DISPUTE TRIGGERED" : (isTrigger ? "ART HELP TRIGGERED" : (isOfficiallyClosed ? `${project.alert_type === 'dispute' ? 'DISPUTE' : 'ART HELP'} RESOLVED` : "PENDING CONFIRMATION"));

                                  // Extract data with robust regex for both plain and markdown formats
                                  let reason = "";
                                  let additionalMessage = "";
                                  let extractedResolverName = "";
                                  if (isTrigger) {
                                     // Handle Markdown Bold format or plain
                                     const reasonMatch = comment.content?.match(/\*\*Reason:\*\*\s*(.*?)(?=\s*(?:\n|\*\*Message:\*\*|$))/s) || 
                                                        comment.content?.match(/Reason:\s*(.*?)(?=\s*(?:\n|Message:|$))/s);
                                     
                                     const messageMatch = comment.content?.split("**Message:** ")[1] || 
                                                         comment.content?.split("Message: ")[1];

                                     const resolverMatch = comment.content?.match(/\*\*ResolverName:\*\*\s*(.*?)(?=\s*(?:\n|\*\*Reason:\*\*|$))/s) ||
                                                          comment.content?.match(/ResolverName:\s*(.*?)(?=\s*(?:\n|Reason:|$))/s);
                                     
                                     reason = reasonMatch ? reasonMatch[1].trim() : (comment.content || "");
                                     additionalMessage = messageMatch ? messageMatch.trim() : "";
                                     extractedResolverName = resolverMatch ? resolverMatch[1].trim() : "";
                                  } else {
                                     reason = comment.content || "";
                                  }

                                  const resolverName = extractedResolverName || 
                                                       resolvers?.find(r => r.id === project.alert_resolver_id)?.name || 
                                                       "Management";

                                  return (
                                    <div className="space-y-8 mb-8">
                                      <div className="bg-surface-card border border-surface-border rounded-3xl overflow-hidden group shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300">
                                        {/* Header Row */}
                                        <div className="px-6 py-4 border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden">
                                          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />
                                          <div className="flex justify-between items-center relative z-10 w-full">
                                            <div className="flex items-center gap-3">
                                               {isOfficiallyClosed ? (
                                                  <div className="flex items-center gap-2.5">
                                                   <div className="w-5 h-5 rounded-full flex items-center justify-center border" style={{ backgroundColor: `${themeColor}26`, borderColor: `${themeColor}40` }}>
                                                     <IconCheck size={12} className="stroke-[3.5px]" style={{ color: themeColor }} />
                                                   </div>
                                                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{labelText}</span>
                                                 </div>
                                               ) : (
                                                  <div className="flex items-center gap-2.5">
                                                     <span className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider`} style={{ backgroundColor: `${themeColor}26`, color: themeColor }}>
                                                        {labelText.split(' ')[0]}
                                                     </span>
                                                     <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                        {labelText.split(' ').slice(1).join(' ')}
                                                     </span>
                                                  </div>
                                               )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                              {/* Contextual Solve Button for Resolver */}
                                              {isTrigger && project.alert_status === 'triggered' && project.alert_resolver_id === profile?.id && (
                                                 <Button
                                                    variant={isDispute ? "metallic-dispute" : "metallic-arthelp"}
                                                    size="sm"
                                                    onClick={() => setIsSolveModalOpen(true)}
                                                    className="font-black uppercase tracking-widest text-[10px]"
                                                  >
                                                    Solve Case
                                                  </Button>
                                               )}

                                            {isEditing && (hasPermission("delete_timeline_items") || canEdit) && (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                                className="text-brand-error/40 hover:text-brand-error transition-colors p-1"
                                                title="Delete Record"
                                              >
                                                <IconTrash size={12} />
                                              </button>
                                            )}
                                          </div>
                                           </div>
                                         </div>
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                            {isTrigger ? "Initiated By" : (isResolved ? "Resolved By" : "Closed By")}
                                          </span>
                                          <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                            {comment.author_name || "System"}
                                          </span>
                                        </div>

                                        {/* Date Row */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-white/[0.01]">
                                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Date</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                              {new Date(comment.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </span>
                                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                              {new Date(comment.created_at).toLocaleTimeString("en-GB", { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Reason / Status Row */}
                                        <div className={`flex flex-col gap-2 px-6 py-5 ${additionalMessage ? 'border-b border-surface-border' : ''} bg-white/[0.01]`}>
                                          <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>
                                            {isTrigger ? "Client Comment" : "Status Message"}
                                          </span>
                                          <div className="border-l-2 pl-4" style={{ borderColor: `${themeColor}40` }}>
                                            {(() => {
                                              let displayReason = reason.replace(/\*\*|\[|\]/g, '');
                                              displayReason = displayReason.replace(/^(ARTHELP|DISPUTE|CASE)\s+(RESOLVED|CLOSED)[:\s]*/i, '');
                                               displayReason = displayReason.replace(/\.?\s*Alert\s+tag\s+removed\.?$/i, '.');
                                              if (reason.includes('|')) {
                                                const parts = reason.split('|');
                                                // @ts-ignore
                                                return (
                                                  <p className="text-[13px] font-medium text-white/90 leading-relaxed">
                                                    <span className="font-black text-white">{parts[0].replace(/RESOLVED/i, 'SUBMITTED')}: </span>
                                                    <span className="opacity-80">{parts[1]}</span>
                                                  </p>
                                                );
                                              }
                                              return <p className="text-[13px] font-medium text-white/90 leading-relaxed">{displayReason}</p>;
                                             })()}
                                             </div>
                                           </div>

                                        {/* Dynamic Message for Resolver Row */}
                                        {additionalMessage && (
                                          <div className="flex flex-col gap-2 px-6 py-5 bg-white/[0.01]">
                                            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>
                                              Message for {resolverName}
                                            </span>
                                            <p className="text-[13px] font-medium text-white/90 leading-relaxed border-l-2 pl-4" style={{ borderColor: `${themeColor}40` }}>
                                              {additionalMessage}
                                            </p>
                                          </div>
                                        )}

                                        {/* Attachments Row */}
                                        {comment.attachments && Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                                          <div className="px-6 py-5 bg-white/[0.02] border-t border-surface-border">
                                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Evidence / Resolution Files</p>
                                            <div className="flex flex-wrap gap-3">
                                              {comment.attachments.map((file: any, i: number) => (
                                                <div 
                                                  key={i} 
                                                  className="group/posted-file relative cursor-pointer hover:scale-[1.02] transition-all"
                                                  onClick={() => handleAttachmentClick(file)}
                                                >
                                                  <div className="w-16 h-16 rounded-xl border border-surface-border bg-surface-overlay flex items-center justify-center relative overflow-hidden">
                                                    <FileIcon name={file.name} type={file.type} url={file.url} />
                                                  </div>
                                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/posted-file:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 backdrop-blur-[1px] rounded-xl">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isImageFile(file.name, file.type)) {
                                                          handleAttachmentClick(file);
                                                        } else {
                                                          forceDownload(file.url, file.name || "download");
                                                        }
                                                      }}
                                                      className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                    >
                                                      {isImageFile(file.name, file.type) ? <IconEye size={12} /> : <IconDownload size={12} />}
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }

                                // 7. Default Comment View
                                  return (
                                    <div className="mb-8">
                                      <ElevatedMetallicCard
                                        title={
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-white uppercase tracking-widest leading-none">
                                              {formatDisplayName(
                                                comment.author_name,
                                              ) || "User"}
                                            </span>
                                            <div className="w-1 h-1 rounded-full bg-gray-600" />
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                                              {new Date(comment.created_at)
                                                .toLocaleString("en-GB", {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "numeric",
                                                  minute: "2-digit",
                                                  hour12: true,
                                                })
                                                .toUpperCase()}
                                            </span>
                                          </div>
                                        }
                                        bodyClassName="p-6"
                                        headerClassName="px-6 py-3"
                                        rightElement={
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setReplyTo({
                                                  id: comment.id,
                                                  content: comment.content,
                                                  author_name:
                                                    comment.author_name,
                                                });
                                                // Focus the input area
                                                setTimeout(() => {
                                                  commentInputRef.current?.focus();
                                                  commentInputRef.current?.scrollIntoView(
                                                    {
                                                      behavior: "smooth",
                                                      block: "center",
                                                    },
                                                  );
                                                }, 100);
                                              }}
                                              className="p-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:border-brand-primary/50 hover:bg-brand-primary/10 hover:text-brand-primary transition-all relative z-50 group/reply"
                                              title="Reply to comment"
                                            >
                                              <IconReply
                                                size={14}
                                                className="group-hover/reply:-translate-x-0.5 transition-transform"
                                              />
                                            </button>
                                            {isEditing &&
                                              (hasPermission(
                                                "delete_timeline_items",
                                              ) ||
                                                canEdit) ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteComment(
                                                    comment.id,
                                                  );
                                                }}
                                                className="p-1.5 rounded-lg bg-brand-error/10 text-brand-error border border-brand-error/20 hover:bg-brand-error hover:text-white transition-all relative z-50"
                                                title="Delete Comment"
                                              >
                                                <IconTrash size={14} />
                                              </button>
                                            ) : undefined}
                                          </div>
                                        }
                                      >
                                        {comment.parent && (
                                          <div className="mb-4 pl-3 border-l-2 border-brand-primary/30 bg-white/[0.03] rounded-r-lg py-2 pr-4 animate-in fade-in slide-in-from-left-2">
                                            <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">
                                              Replying to{" "}
                                              {comment.parent.author_name ||
                                                "User"}
                                            </p>
                                            <p className="text-xs text-gray-500 line-clamp-2 italic">
                                              {comment.parent.content}
                                            </p>
                                          </div>
                                        )}
                                        {comment.content && (
                                          <div className="flex flex-col gap-3">
                                            {/* TOP PART: The 'Approved by' Line (Shows outside if it's a QA instruction) */}
                                            {comment.category ===
                                              "qa_instruction" &&
                                              comment.content.includes(
                                                "✅ Approved by",
                                              ) && (
                                                <div className="text-sm text-gray-300 font-bold px-1 animate-in fade-in slide-in-from-bottom-1">
                                                  {
                                                    comment.content.split(
                                                      "\n\n",
                                                    )[0]
                                                  }
                                                </div>
                                              )}

                                            {/* BOTTOM PART: The Highlighted Alert Card */}
                                            <div
                                              className={`text-sm leading-relaxed ${comment.category === "qa_instruction" ? "p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 shadow-inner" : "text-gray-300"}`}
                                            >
                                              {comment.category ===
                                                "qa_instruction" && (
                                                  <div className="flex items-center gap-2 mb-3 order-first">
                                                    <div className="p-1 rounded-md bg-brand-primary/10 border border-brand-primary/20">
                                                      <IconFileText
                                                        size={14}
                                                        className="text-brand-primary"
                                                      />
                                                    </div>
                                                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                                                      Submission Instructions
                                                    </span>
                                                  </div>
                                                )}
                                              <div
                                                className={
                                                  comment.category ===
                                                    "qa_instruction"
                                                    ? "text-white/90 font-medium"
                                                    : ""
                                                }
                                              >
                                                <ReactMarkdown
                                                  components={
                                                    markdownComponents
                                                  }
                                                  remarkPlugins={
                                                    markdownPlugins
                                                  }
                                                >
                                                  {comment.category ===
                                                    "qa_instruction" &&
                                                    comment.content.includes(
                                                      "\n\n",
                                                    )
                                                    ? parseCodesLogicMarkdown(
                                                      formatLegacyInstruction(
                                                        comment.content
                                                          .split("\n\n")
                                                          .slice(1)
                                                          .join("\n\n"),
                                                      ),
                                                    )
                                                    : parseCodesLogicMarkdown(
                                                      formatLegacyInstruction(
                                                        comment.content,
                                                      ),
                                                    )}
                                                </ReactMarkdown>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {comment.attachments &&
                                          Array.isArray(comment.attachments) &&
                                          comment.attachments.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-3">
                                              {comment.attachments.map(
                                                (file: any, i: number) => (
                                                  <div
                                                    key={i}
                                                    className="group/posted-file relative cursor-pointer hover:scale-[1.02] transition-transform"
                                                    onClick={() =>
                                                      handleAttachmentClick(
                                                        file,
                                                      )
                                                    }
                                                  >
                                                    <div className="w-20 h-20 rounded-xl border border-surface-border bg-surface-overlay flex items-center justify-center relative overflow-hidden">
                                                      <FileIcon
                                                        name={file.name}
                                                        type={file.type}
                                                        url={file.url}
                                                      />

                                                      {file.is_approved && (
                                                        <div className="absolute top-1 right-1 z-30 bg-brand-success/90 backdrop-blur-sm p-1 rounded-lg border border-brand-success/30 shadow-lg animate-in zoom-in duration-300">
                                                          <IconCheck
                                                            size={10}
                                                            className="text-white drop-shadow-sm stroke-[3px]"
                                                          />
                                                        </div>
                                                      )}
                                                    </div>
                                                    {/* DOWNLOAD/PREVIEW OVERLAY */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/posted-file:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 backdrop-blur-[1px]">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (
                                                            isImageFile(
                                                              file.name,
                                                              file.type,
                                                            )
                                                          ) {
                                                            handleAttachmentClick(
                                                              file,
                                                            );
                                                          } else {
                                                            forceDownload(
                                                              file.url,
                                                              file.name ||
                                                              "download",
                                                            );
                                                          }
                                                        }}
                                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                                        title={
                                                          isImageFile(
                                                            file.name,
                                                            file.type,
                                                          )
                                                            ? "Preview"
                                                            : "Download"
                                                        }
                                                      >
                                                        {isImageFile(
                                                          file.name,
                                                          file.type,
                                                        ) ? (
                                                          <IconEye size={14} />
                                                        ) : (
                                                          <IconDownload
                                                            size={14}
                                                          />
                                                        )}
                                                      </button>
                                                    </div>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                      </ElevatedMetallicCard>
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            No activity recorded yet
                          </p>
                        </div>
                      )}
                    </section>

                    {/* 4. Bottom Separator */}
                    <div className={`border-t border-surface-border w-full mt-10 ${activityTab === "qa" ? "mb-2" : "mb-10"}`} />

                    {/* 5. Comment Composer (Input Area) */}
                    {/* 5. Comment Composer (Input Area) - Hidden on QA Tab */}
                    {activityTab !== "qa" && (
                      <section>
                        <ElevatedMetallicCard
                          title={
                            activityTab === "discussion" ? (
                              <span className="text-[#38bdf8]">
                                Team Discussion
                              </span>
                            ) : (
                              "Upload Files"
                            )
                          }
                          headerClassName="px-8 py-3"
                          bodyClassName={activityTab === "timeline" && isFreelancer ? "p-5 px-8" : "p-8"}
                          className=""
                        >
                          <div className="space-y-4">
                            {!(activityTab === "timeline" && isFreelancer) && (
                              <>
                                {replyTo && (
                                  <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex-1 min-w-0 border-l-2 border-brand-primary/40 pl-3">
                                      <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">
                                        Replying to {replyTo.author_name || "User"}
                                      </p>
                                      <p className="text-xs text-gray-400 line-clamp-1 italic font-medium">
                                        {replyTo.content}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setReplyTo(null)}
                                      className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all shrink-0"
                                    >
                                      <IconX size={14} />
                                    </button>
                                  </div>
                                )}
                                <TextArea
                                  ref={commentInputRef}
                                  variant="recessed"
                                  placeholder={activityTab === "discussion" ? "Ask a question or share an update with the team..." : "Write a comment..."}
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handlePostComment();
                                    }
                                  }}
                                  className="relative z-10"
                                  inputClassName="min-h-[140px]"
                                />
                              </>
                            )}

                            {/* Attachment Preview */}
                            {attachments.length > 0 && (
                              <div className="flex flex-wrap gap-3 px-1 relative z-10">
                                {attachments.map((att, i) => (
                                  <div
                                    key={att.id}
                                    className="relative group/file cursor-pointer"
                                    onClick={() =>
                                      handleAttachmentClick({
                                        url: att.previewUrl,
                                        name: att.file.name,
                                        type: att.file.type,
                                      })
                                    }
                                  >
                                    <div
                                      className={`
                                                            w-20 h-20 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300
                                                            ${att.status === "uploading" ? "bg-surface-card border-brand-primary/30" : "bg-surface-overlay border-surface-border"}
                                                        `}
                                    >
                                      {/* Loading State */}
                                      {att.status === "uploading" && (
                                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                          <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mb-2" />
                                        </div>
                                      )}

                                      <FileIcon
                                        name={att.file.name}
                                        type={att.file.type}
                                        url={att.previewUrl}
                                      />
                                    </div>

                                    {/* OVERLAY for Download/Preview */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/file:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 z-20 backdrop-blur-[1px]">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const fileData = {
                                            url: att.previewUrl,
                                            name: att.file.name,
                                            type: att.file.type,
                                          };
                                          if (
                                            isImageFile(
                                              att.file.name,
                                              att.file.type,
                                            )
                                          ) {
                                            handleAttachmentClick(fileData);
                                          } else {
                                            forceDownload(
                                              att.previewUrl,
                                              att.file.name || "download",
                                              att.file.type
                                            );
                                          }
                                        }}
                                        className="p-1.5 rounded-full bg-white/10 hover:bg-brand-primary text-white transition-colors border border-white/10 hover:border-brand-primary"
                                        title={
                                          isImageFile(
                                            att.file.name,
                                            att.file.type,
                                          )
                                            ? "Preview"
                                            : "Download"
                                        }
                                      >
                                        {isImageFile(
                                          att.file.name,
                                          att.file.type,
                                        ) ? (
                                          <IconEye size={14} />
                                        ) : (
                                          <IconDownload size={14} />
                                        )}
                                      </button>
                                    </div>

                                    {/* Remove Button (Hover) */}
                                    <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover/file:opacity-100 transition-opacity z-30">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeAttachment(i);
                                        }}
                                        className="bg-surface-card border border-surface-border text-gray-400 hover:text-brand-error p-1 rounded-full shadow-lg"
                                      >
                                        <IconX size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}


                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-2.5 px-6 py-3 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 bg-black/20 border border-white/[0.02] text-gray-500 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] hover:bg-white/5 hover:text-white hover:border-white/20 hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-[1.02] active:scale-[0.98] group w-full sm:w-auto"
                              >
                                <IconPaperclip size={14} className="group-hover:text-brand-primary group-hover:-rotate-12 transition-all duration-300" />
                                Attach Files
                                {attachments.length > 0 && (
                                  <span className="text-brand-primary font-black ml-1">
                                    ({attachments.length})
                                  </span>
                                )}
                              </button>
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Button
                                  variant="metallic"
                                  className={`flex-1 sm:flex-none px-8 py-3 sm:py-2.5 h-auto sm:h-[38px] text-xs font-bold uppercase tracking-widest transition-all duration-500 ${activityTab === "discussion" ? "bg-sky-500/10 border-sky-500/20 !from-sky-500 !to-sky-600" : ""}`}
                                  leftIcon={<IconSend size={14} />}
                                  onClick={() => handlePostComment()}
                                  isLoading={isPostingComment}
                                  disabled={
                                    (!newComment.trim() &&
                                      attachments.length === 0) ||
                                    attachments.some(
                                      (a) => a.status === "uploading" || a.status === "error",
                                    )
                                  }
                                >
                                  {activityTab === "discussion"
                                    ? "Send Message"
                                    : isFreelancer
                                      ? (attachments.length > 0 ? "Submit Work & Mark Done" : "Submit Work")
                                      : "Post Comment"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </ElevatedMetallicCard>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          multiple
                          onChange={handleFileSelect}
                        />
                      </section>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Deadline Update Modal */}
        <Modal
          isOpen={isDeadlineModalOpen}
          onClose={() => {
            setIsDeadlineModalOpen(false);
            setActiveShortcut(null);
          }}
          title="Update Deadline"
          isElevatedHeader
          isElevatedFooter
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="recessed"
                className="uppercase tracking-widest text-xs px-6 h-10 border-white/5 hover:bg-white/5"
                onClick={() => {
                  setIsDeadlineModalOpen(false);
                  setActiveShortcut(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="metallic"
                className="uppercase tracking-widest text-xs px-8 h-10"
                onClick={handleUpdateDeadlineModal}
              >
                Update Deadline
              </Button>
            </div>
          }
        >
          <div className="space-y-6 pt-2 pb-2">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-3">
                Set the new delivery date and time for this project.
              </p>
              <div className="flex flex-wrap gap-2">
                {[2, 6, 8, 12, 24].map((hours) => (
                  <Button
                    key={hours}
                    variant="recessed"
                    size="sm"
                    onClick={() => {
                      setActiveShortcut(hours);
                      const futureDate = new Date(
                        Date.now() + hours * 60 * 60 * 1000,
                      );
                      setModalDate(futureDate);
                      const hh = String(futureDate.getHours()).padStart(2, "0");
                      const mm = String(futureDate.getMinutes()).padStart(
                        2,
                        "0",
                      );
                      setModalTime(`${hh}:${mm}`);
                    }}
                    className={`!px-3 !py-1.5 !h-auto !text-[10px] font-bold uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${activeShortcut === hours
                        ? "!text-white !border-white/20 !bg-white/10"
                        : ""
                      }`}
                  >
                    +{hours} Hrs
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <DatePicker
                value={modalDate}
                onChange={(date: Date) => setModalDate(date)}
                variant="recessed"
              />
              <TimeSelect
                value={modalTime}
                onChange={(time: string) => setModalTime(time)}
                variant="recessed"
              />
            </div>
          </div>
        </Modal>

        {/* Confirmation Modal for Deletion */}
        <Modal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          title="Confirm Deletion"
          size="sm"
          isElevatedFooter={true}
          footer={
            <div className="flex gap-3 w-full">
              <Button
                variant="recessed"
                className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white border-white/5"
                onClick={() => setItemToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="metallic-error"
                className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest transition-all duration-300"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          }
        >
          <div className="space-y-6 pt-4 pb-0">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-error/10 border border-brand-error/20 flex items-center justify-center text-brand-error mb-2">
                <IconTrash size={32} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                Are you sure?
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                This action will permanently delete this item from the project
                timeline. This cannot be undone.
              </p>
            </div>
          </div>
        </Modal>

        {/* Attachment Preview Modal */}
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={previewImage?.name || "Image Preview"}
          size="xl"
          isElevatedFooter
          isElevatedHeader
          footer={
            <div className="flex justify-end items-center gap-3 w-full">
              {/* Primary Groups */}
              <div className="flex gap-3 items-center">
                <Button
                  variant="recessed"
                  onClick={() => {
                    setPreviewImage(null);
                    setIsRequestingChanges(false);
                  }}
                  className="uppercase tracking-widest text-[10px] font-black px-6 h-10 border-white/5 hover:bg-white/5"
                >
                  Cancel
                </Button>

                {previewImage?.category !== "qa_preview" && (
                  <Button
                    variant="metallic"
                    onClick={() => {
                      if (previewImage?.url) {
                        forceDownload(
                          previewImage.url,
                          previewImage.name || "download",
                          previewImage.type
                        );
                      }
                    }}
                    className="uppercase tracking-widest text-[10px] font-black px-8 h-10 shadow-lg shadow-brand-primary/10"
                    leftIcon={<IconDownload size={14} />}
                  >
                    Download
                  </Button>
                )}

                {/* QA Actions for Managers */}

                {(isTeamLead || isProjectManager) &&
                  previewImage?.category === "qa_preview" && (
                    <div className="flex gap-3">
                      {!isRequestingChanges ? (
                        <>
                          <Button
                            variant="metallic-error"
                            className="uppercase tracking-widest text-[10px] font-black px-6 h-10 transition-all active:scale-95 border-brand-error/20"
                            onClick={() => setIsRequestingChanges(true)}
                            leftIcon={<IconMessageSquare size={14} />}
                          >
                            Request Changes
                          </Button>
                          <Button
                            variant="metallic"
                            className={`uppercase tracking-widest text-[10px] font-black px-8 h-10 shadow-lg shadow-brand-primary/10 ${previewImage.is_approved ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                            onClick={async () => {
                              if (previewImage.is_approved) return;

                              try {
                                // 1. Find the comment that contains this attachment
                                const sourceComment = activeComments.find((c) =>
                                  c.attachments?.some(
                                    (a: any) =>
                                      a.url === previewImage.url ||
                                      (previewImage.id &&
                                        a.id === previewImage.id),
                                  ),
                                );

                                if (!sourceComment) {
                                  throw new Error(
                                    "Could not find original comment link",
                                  );
                                }

                                // 2. Update the specific attachment in the JSON array
                                const updatedAttachments =
                                  sourceComment.attachments.map((a: any) => {
                                    if (
                                      a.url === previewImage.url ||
                                      (previewImage.id &&
                                        a.id === previewImage.id)
                                    ) {
                                      return { ...a, is_approved: true };
                                    }
                                    return a;
                                  });

                                // 3. Update comments table
                                const { error: commentError } = await supabase
                                  .from("project_comments")
                                  .update({ attachments: updatedAttachments })
                                  .eq("id", sourceComment.id);

                                if (commentError) throw commentError;

                                // 4. Update project qa_status to approved
                                if (project?.project_id) {
                                  const { error: projectError } = await supabase
                                    .from("projects")
                                    .update({ qa_status: "qa_approved" })
                                    .eq("project_id", project.project_id);

                                  if (projectError) throw projectError;
                                  setProject((prev) =>
                                    prev
                                      ? { ...prev, qa_status: "qa_approved" }
                                      : null,
                                  );
                                }

                                // 5. Explicitly notify the designer (internal)
                                const approverName =
                                  profile?.name || "Team Lead";

                                const approvalMessage =
                                  `✅ Approved by ${approverName}\n\n` +
                                  `**If it's Initial Delivery, please upload:**\n\n` +
                                  `- Logo Options Sheet – PNG format\n` +
                                  `- Presentation of Each Option – PNG format\n` +
                                  `- Source File – AI format\n` +
                                  `- ZIP file (must include all the above files)\n\n` +
                                  `**If it's a Revision, please upload:**\n\n` +
                                  `- Logo Options Sheet – PNG format\n` +
                                  `- Source File – AI format\n` +
                                  `- ZIP file (must include all the above files)\n\n` +
                                  `**Note: Submitting only a ZIP file without the individual files is not allowed and will not be accepted. Thank you!**`;

                                await handlePostComment(
                                  approvalMessage,
                                  [],
                                  true,
                                  "qa_instruction",
                                );

                                // 6. Update local comments state to show the change immediately
                                const updateFn = (prev: any[]) =>
                                  prev.map((c: any) =>
                                    c.id === sourceComment.id
                                      ? {
                                        ...c,
                                        attachments: updatedAttachments,
                                      }
                                      : c,
                                  );

                                setComments(updateFn);
                                setQaComments(updateFn);
                                setTimelineComments(updateFn);

                                addToast({
                                  type: "success",
                                  title: "File Approved",
                                  message:
                                    "The design has been marked as approved.",
                                });
                                setPreviewImage(null);
                              } catch (err: any) {
                                console.error("Error approving design:", err);
                                addToast({
                                  type: "error",
                                  title: "Approval Failed",
                                  message:
                                    err.message ||
                                    "Could not update approval status.",
                                });
                              }
                            }}
                            disabled={previewImage.is_approved}
                            leftIcon={<IconCheck size={14} />}
                          >
                            {previewImage.is_approved
                              ? "Already Approved"
                              : "Approve Design"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="metallic"
                          className="uppercase tracking-widest text-[10px] font-black px-10 h-10 shadow-lg shadow-brand-primary/20 animate-in slide-in-from-right-3 duration-300"
                          onClick={async () => {
                            if (!qaFeedbackText.trim()) {
                              addToast({
                                type: "info",
                                title: "Input Required",
                                message:
                                  "Please write your feedback before posting.",
                              });
                              return;
                            }

                            setIsQaFeedbackLoading(true);
                            try {
                              await handlePostComment(
                                "⚠️ QA Revision Requested per design: \n\n" +
                                qaFeedbackText,
                                [],
                                true,
                              );
                              setQaFeedbackText("");
                              setIsRequestingChanges(false);
                              setPreviewImage(null);

                              addToast({
                                type: "success",
                                title: "Feedback Sent",
                                message: "Your changes have been requested.",
                              });
                            } catch (err) {
                              console.error("Error posting QA feedback:", err);
                            } finally {
                              setIsQaFeedbackLoading(false);
                            }
                          }}
                          isLoading={isQaFeedbackLoading}
                          leftIcon={<IconSend size={14} />}
                        >
                          Post Changes
                        </Button>
                      )}
                    </div>
                  )}
              </div>
            </div>
          }
        >
          <div
            className={`flex flex-col lg:flex-row gap-6 transition-all duration-500 overflow-hidden h-[75vh] ${isRequestingChanges ? "lg:h-[85vh]" : ""}`}
          >
            {/* LEFT: IMAGE COMPONENT */}
            {previewImage && (
              <ZoomableImage
                key={previewImage.url}
                url={previewImage.url}
                alt={previewImage.name}
                isRequestingChanges={isRequestingChanges}
              />
            )}

            {/* RIGHT: FEEDBACK COMPONENT (Shown only when requesting changes) */}
            {isRequestingChanges && (
              <div className="lg:w-2/5 flex flex-col gap-4 animate-in slide-in-from-right-5 duration-500 max-h-full">
                <div className="flex flex-col h-full bg-surface-base/50 rounded-2xl border border-white/[0.05] p-5 shadow-xl backdrop-blur-md overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-brand-error uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-error animate-pulse" />
                      Revision Context
                    </h3>
                    <button
                      onClick={() => {
                        setIsRequestingChanges(false);
                        // Note: We don't clear the feedback text here so it persists
                      }}
                      className="p-1 rounded-lg hover:bg-white/5 text-gray-500 transition-colors"
                    >
                      <IconX size={16} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {/* SCROLLABLE HISTORY PANEL */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                      {/* Brief Section */}
                      <div className="rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                          <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] flex items-center gap-2">
                            <IconFileText size={14} /> Project Brief
                          </p>
                        </div>
                        <div className="p-5 text-[13px] text-gray-300 font-normal leading-[1.7] antialiased">
                          <ReactMarkdown
                            components={markdownComponents}
                            remarkPlugins={markdownPlugins}
                          >
                            {parseCodesLogicMarkdown(
                              project?.brief || "No brief provided.",
                            )}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Filtered Timeline (Relevant Non-Internal Comments) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1 mb-2">
                          <div className="h-px flex-1 bg-white/5" />
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-none shrink-0">
                            Recent Context
                          </p>
                          <div className="h-px flex-1 bg-white/5" />
                        </div>

                        {contextComments.length > 0 ? (
                          contextComments
                            .filter((comm) => {
                              const content = comm.content || "";
                              const isInternal = comm.is_internal;
                              const isSystemLog =
                                comm.author_role === "system_log";
                              const isStatusChange =
                                content.includes("STATUS_CHANGED:");
                              const isAutomatedLog =
                                content.includes("|") &&
                                (content.includes("PROJECT_ASSIGNED") ||
                                  content.includes("DEADLINE_UPDATED") ||
                                  content.includes("CLIENT_DEADLINE_UPDATED"));

                              // Only show non-internal, non-system, non-automated comments
                              return (
                                !isInternal &&
                                !isSystemLog &&
                                !isStatusChange &&
                                !isAutomatedLog
                              );
                            })
                            .map((comm) => (
                              <div
                                key={comm.id}
                                className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden shadow-sm"
                              >
                                <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.04] flex items-center justify-between">
                                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none">
                                    {comm.author_role}
                                  </span>
                                  <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider leading-none">
                                    {comm.created_at &&
                                      new Date(comm.created_at)
                                        .toLocaleString("en-GB", {
                                          day: "numeric",
                                          month: "short",
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })
                                        .toUpperCase()}
                                  </span>
                                </div>
                                <div className="p-4 text-[13px] text-gray-300 font-normal leading-[1.6] antialiased">
                                  <ReactMarkdown
                                    components={markdownComponents}
                                    remarkPlugins={markdownPlugins}
                                  >
                                    {parseCodesLogicMarkdown(comm.content)}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-[11px] text-gray-500 font-medium italic px-1 text-center py-4">
                            No previous timeline activity found.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* FEEDBACK INPUT PANEL (Fixed bottom) */}
                    <div className="pt-4 border-t border-white/5 space-y-3 shrink-0">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-gray-200 uppercase tracking-widest">
                          Your Feedback
                        </p>
                        <button
                          onClick={() => setQaFeedbackText("")}
                          className="text-[9px] font-bold text-gray-500 hover:text-brand-error uppercase tracking-widest transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <TextArea
                        variant="recessed"
                        placeholder="Write specific revision points..."
                        value={qaFeedbackText}
                        onChange={(e) => setQaFeedbackText(e.target.value)}
                        className="w-full"
                        inputClassName="min-h-[160px] max-h-[160px] p-4 text-xs font-medium text-gray-300 placeholder:text-gray-600 focus:border-brand-error/30"
                      />
                      <p className="text-[9px] text-brand-error/60 font-bold leading-relaxed tracking-wider uppercase px-1">
                        Automatically moves to Revision state
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Submit for QA Modal */}
        <Modal
          isOpen={isSubmitQaModalOpen}
          onClose={() => {
            if (!isQaUploading) {
              setIsSubmitQaModalOpen(false);
              setQaLogos([]);
            }
          }}
          title="Submit Project for QA"
          size="md"
          isElevatedHeader
          isElevatedFooter
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button
                variant="recessed"
                onClick={() => {
                  setIsSubmitQaModalOpen(false);
                  setQaLogos([]);
                }}
                disabled={isQaUploading}
                className="uppercase tracking-widest text-xs px-6 h-10 border-white/5 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                variant="metallic"
                className={`uppercase tracking-widest text-xs px-8 h-10 ${qaLogos.length > 0 ? "bg-brand-primary text-white" : "opacity-50"}`}
                onClick={async () => {
                  if (qaLogos.length === 0) {
                    addToast({
                      type: "info",
                      title: "Action Required",
                      message: "Please upload at least one logo.",
                    });
                    return;
                  }

                  setIsQaUploading(true);
                  try {
                    // The attachments should already be in the data URI format in qaLogos state
                    await handleQaAction(
                      "submit",
                      "Please review the uploaded design previews.",
                      qaLogos,
                    );
                    setIsSubmitQaModalOpen(false);
                    setQaLogos([]);
                  } catch (err) {
                    console.error("QA Submission Error:", err);
                  } finally {
                    setIsQaUploading(false);
                  }
                }}
                disabled={isQaUploading || qaLogos.length === 0}
                leftIcon={
                  isQaUploading ? (
                    <IconRefreshCw size={14} className="animate-spin" />
                  ) : (
                    <IconSend size={14} />
                  )
                }
              >
                {isQaUploading ? "Submitting..." : "Submit to QA"}
              </Button>
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex items-start gap-4 shadow-inner">
              <div className="p-2.5 rounded-lg bg-brand-primary/10 text-brand-primary">
                <IconAlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Final Check Required
                </h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">
                  Please ensure all logos are correctly placed in the options
                  sheet before submitting.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                  Upload Logos Placed In Options Sheet
                </p>
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  {qaLogos.length} Files Selected
                </span>
              </div>

              <label className="group relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/5 hover:border-brand-primary/30 bg-black/20 hover:bg-black/30 rounded-2xl cursor-pointer transition-all duration-500">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setIsQaUploading(true);
                    const successfulUploads: any[] = [];
                    const errors: string[] = [];

                    try {
                      const fileList = Array.from(files);
                      for (const file of fileList) {
                        try {
                          const uploaded = await uploadFile(file);
                          successfulUploads.push(uploaded);
                        } catch (err: any) {
                          console.error(`QA file upload failed for ${file.name}:`, err);
                          errors.push(file.name);
                        }
                      }

                      if (successfulUploads.length > 0) {
                        setQaLogos((prev) => [
                          ...prev,
                          ...successfulUploads
                        ]);

                        addToast({
                          title: "Files Uploaded",
                          message: `${successfulUploads.length} logo(s) ready for QA preview.`,
                          type: "success",
                        });
                      }

                      if (errors.length > 0) {
                        addToast({
                          title: "Partial Failure",
                          message: `Could not upload: ${errors.join(", ")}`,
                          type: "error",
                        });
                      }
                    } catch (err: any) {
                      console.error("QA Process Error:", err);
                      addToast({
                        title: "Process Error",
                        message: err.message || "Failed to handle files",
                        type: "error",
                      });
                    } finally {
                      setIsQaUploading(false);
                      if (e.target) e.target.value = "";
                    }
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-white/5 border border-white/5 group-hover:scale-110 group-hover:bg-brand-primary/10 group-hover:border-brand-primary/20 transition-all duration-500">
                    <IconPlus
                      size={24}
                      className="text-gray-500 group-hover:text-brand-primary transition-colors"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-[9px] text-gray-600 font-medium uppercase mt-1 tracking-wider">
                      JPG, PNG, SVG up to 10MB
                    </p>
                  </div>
                </div>
              </label>

              {qaLogos.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-4 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                  {qaLogos.map((logo, idx) => (
                    <div
                      key={idx}
                      className="group/logo relative animate-in fade-in zoom-in duration-300"
                    >
                      <div className="w-16 h-16 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                        <img
                          src={logo.url}
                          className="w-full h-full object-cover"
                          alt="Logo preview"
                        />
                      </div>
                      <button
                        onClick={() =>
                          setQaLogos((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-brand-error text-white flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-all shadow-lg hover:scale-110 z-10"
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* Art Help & Dispute Trigger Modal */}
        <Modal
          isOpen={isAlertModalOpen}
          onClose={() => setIsAlertModalOpen(false)}
          title={`Trigger ${alertForm.type === 'arthelp' ? 'Art Help' : 'Dispute'}`}
          size="md"
          isElevatedHeader
          isElevatedFooter
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button 
                variant="recessed" 
                onClick={() => setIsAlertModalOpen(false)}
                className="uppercase tracking-widest text-xs px-6 h-11 border-white/5 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                variant="metallic" 
                onClick={handleTriggerAlert} 
                isLoading={isAlertActionLoading}
                className={`uppercase tracking-widest text-[11px] font-black px-10 h-11 shadow-lg ${
                  alertForm.type === 'arthelp' 
                  ? 'bg-brand-primary text-white shadow-brand-primary/20' 
                  : 'bg-brand-error text-white shadow-brand-error/20'
                }`}
              >
                Trigger {alertForm.type === 'arthelp' ? 'Art Help' : 'Dispute'}
              </Button>
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            <div className="p-4 rounded-xl bg-brand-primary/5 border border-white/5 flex items-start gap-4 shadow-inner mb-2">
               <div className={`p-2.5 rounded-lg ${alertForm.type === 'arthelp' ? 'bg-brand-info/10 text-brand-info' : 'bg-brand-error/10 text-brand-error'}`}>
                  <IconAlertTriangle size={20} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">Active Warning</h3>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    This will alert the management and assign a resolver to fix the project status.
                  </p>
               </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block px-1">Reason for {alertForm.type === 'arthelp' ? 'Art Help' : 'Dispute'}</label>
              <TextArea 
                variant="recessed" 
                placeholder="Paste recent client comments..." 
                value={alertForm.reason}
                onChange={(e) => setAlertForm(prev => ({ ...prev, reason: e.target.value }))}
                inputClassName="min-h-[100px] p-5 text-sm font-medium"
              />
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block px-1">Additional Message (Optional)</label>
              <TextArea 
                variant="recessed" 
                placeholder={`e.g. Please Look Into This ${resolvers.find(r => r.id === alertForm.resolverId)?.name || "Resolver Name"}.`} 
                value={alertForm.message}
                onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
                inputClassName="min-h-[120px] p-5 text-sm font-medium"
              />
            </div>

            <div className="space-y-4 pb-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block px-1">Assign Resolver</label>
              <Dropdown
                options={resolvers.map(r => ({ label: `${r.name} (${r.role})`, value: r.id }))}
                value={alertForm.resolverId}
                onChange={(val) => setAlertForm(prev => ({ ...prev, resolverId: val }))}
                placeholder="Select TL or Super Admin"
                showSearch
              >
                <div className="w-full h-14 bg-black/25 border border-surface-border/40 rounded-xl px-5 flex items-center justify-between cursor-pointer hover:border-white/10 transition-all shadow-inner">
                   <span className="text-sm font-medium text-gray-300">
                      {resolvers.find(r => r.id === alertForm.resolverId)?.name || "Select TL or Super Admin"}
                   </span>
                   <IconUser size={18} className="text-gray-600" />
                </div>
              </Dropdown>
            </div>
          </div>
        </Modal>

        {/* Solve Alert Modal */}
        <Modal
          isOpen={isSolveModalOpen}
          onClose={() => {
            setIsSolveModalOpen(false);
            setSolveForm(prev => ({ ...prev, step: 1, action: 'reassign', reassignTo: '', files: [] }));
          }}
          title={
            <div className="flex items-center gap-3 text-left">
              {solveForm.step === 2 && (
                <button 
                  onClick={() => setSolveForm(prev => ({ ...prev, step: 1 }))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all mr-1"
                >
                  <IconChevronLeft size={16} />
                </button>
              )}
              <span>Solve {project?.alert_type === 'arthelp' ? 'Art Help' : 'Dispute'}</span>
            </div>
          }
          size="md"
          isElevatedHeader
          isElevatedFooter
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button 
                variant="recessed" 
                onClick={() => {
                  setIsSolveModalOpen(false);
                  setSolveForm(prev => ({ ...prev, step: 1, action: 'reassign', reassignTo: '', files: [] }));
                }} 
                className="uppercase tracking-widest text-xs px-6 h-11 border-white/5 hover:bg-white/5"
              >
                Cancel
              </Button>
              {solveForm.step === 2 && (
                <Button 
                  variant="metallic" 
                  onClick={handleSolveAlert} 
                  isLoading={isAlertActionLoading}
                  className="bg-brand-primary text-white uppercase tracking-widest text-[11px] font-black px-10 h-11 shadow-lg shadow-black/20"
                >
                  Submit Resolution
                </Button>
              )}
            </div>
          }
        >
          <div className="min-h-[300px] flex flex-col pt-2 text-left">
             {solveForm.step === 1 ? (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col gap-1 px-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Step 01 / 02</p>
                    <h3 className="text-lg font-bold text-white tracking-tight">Select Action Strategy</h3>
                    <p className="text-xs text-gray-500">How would you like to resolve this Art Help request?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => setSolveForm(prev => ({ ...prev, action: 'reassign', step: 2 }))}
                      className="flex items-center gap-5 p-6 rounded-3xl border border-white/5 bg-white/[0.03] hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all group text-left"
                    >
                      <div className="p-4 rounded-2xl bg-white/5 text-gray-500 group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-all">
                        <IconRefreshCw size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold text-white tracking-tight">Reassign Project</p>
                        <p className="text-xs text-gray-500 mt-0.5">Move this project to a new Team Lead or Freelancer.</p>
                      </div>
                      <IconChevronRight size={20} className="text-gray-700 group-hover:text-brand-primary transition-all" />
                    </button>

                    <button 
                      onClick={() => setSolveForm(prev => ({ ...prev, action: 'upload', step: 2 }))}
                      className="flex items-center gap-5 p-6 rounded-3xl border border-white/5 bg-white/[0.03] hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all group text-left"
                    >
                      <div className="p-4 rounded-2xl bg-white/5 text-gray-500 group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-all">
                        <IconCloudUpload size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold text-white tracking-tight">Upload Final Result</p>
                        <p className="text-xs text-gray-500 mt-0.5">Solve directly by uploading the corrected design files.</p>
                      </div>
                      <IconChevronRight size={20} className="text-gray-700 group-hover:text-brand-primary transition-all" />
                    </button>
                  </div>
               </div>
             ) : (
               <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="flex flex-col gap-1 px-1">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Step 02 / 02</p>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                       {solveForm.action === 'reassign' ? "Select New Assignee" : "Upload Result Files"}
                    </h3>
                    <p className="text-xs text-gray-500">Provide the final details to mark this case as resolved.</p>
                  </div>

                  {solveForm.action === 'reassign' ? (
                    <div className="space-y-4">
                      <Dropdown
                        options={reassignmentOptions}
                        value={solveForm.reassignTo}
                        onChange={(val) => setSolveForm(prev => ({ ...prev, reassignTo: val }))}
                        placeholder="Search TL or Freelancer..."
                        showSearch
                      >
                         <div className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl px-6 flex items-center justify-between cursor-pointer hover:bg-black/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] group relative overflow-hidden">
                           {/* Depth Overlays */}
                           <div className="absolute inset-x-0 top-0 h-px bg-white/[0.03] pointer-events-none" />
                           <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01),transparent)] pointer-events-none" />
                           
                           <span className={`text-sm font-bold relative z-10 uppercase tracking-wide ${solveForm.reassignTo ? "text-white" : "text-gray-500"}`}>
                              {[...teamDesigners, ...freelancers, ...managers].find(u => (u.id || u.member_id) === solveForm.reassignTo)?.name || "Select Assignee"}
                           </span>
                           <IconSearch size={20} className="text-gray-500 group-hover:text-brand-primary transition-colors relative z-10" />
                        </div>
                      </Dropdown>
                      <p className="text-[10px] text-gray-500 italic px-2">Project will be moved to the new assignee and marked as pending confirmation.</p>
                    </div>
                  ) : (
                     <div className="space-y-4">
                        <div className="relative group">
                          <label className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-[32px] transition-all relative overflow-hidden ${isAlertActionLoading ? 'border-brand-primary/50 bg-brand-primary/5 cursor-not-allowed' : 'border-white/5 hover:border-brand-primary/30 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer'}`}>
                             <input 
                               type="file" 
                               multiple 
                               className="hidden" 
                               disabled={isAlertActionLoading}
                               onChange={async (e) => {
                                 if (!e.target.files) return;
                                 setIsAlertActionLoading(true);
                                 try {
                                   const files = Array.from(e.target.files);
                                   const successful = [];
                                   for (const file of files) {
                                      try {
                                        const uploaded = await uploadFile(file, 'attachments');
                                        if (uploaded?.url) {
                                          successful.push({ name: file.name, url: uploaded.url, type: file.type, size: file.size });
                                        }
                                      } catch (err) { 
                                        console.error('File upload failed:', err);
                                        addToast({ title: "Upload Failed", message: `Could not upload ${file.name}`, type: "error" });
                                      }
                                   }
                                   if (successful.length > 0) {
                                     setSolveForm(prev => ({ ...prev, files: [...prev.files, ...successful] }));
                                     addToast({ title: "Ready", message: `${successful.length} file(s) ready for submission`, type: "success" });
                                   }
                                 } finally {
                                   setIsAlertActionLoading(false);
                                   // Reset input so same file can be selected again
                                   e.target.value = '';
                                 }
                               }}
                             />

                             {isAlertActionLoading ? (
                               <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                 <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary shadow-xl shadow-black/20">
                                    <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                                 </div>
                                 <div className="text-center">
                                    <p className="text-sm font-black text-brand-primary uppercase tracking-widest">Uploading Files...</p>
                                    <p className="text-[10px] text-brand-primary/60 uppercase tracking-widest mt-1 font-bold">Please wait a moment</p>
                                 </div>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center gap-3 relative z-10 text-center px-6 transition-all duration-300">
                                 <div className="p-4 rounded-2xl bg-white/5 text-gray-500 group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-all shadow-xl shadow-black/20">
                                   <IconCloudUpload size={32} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-white uppercase tracking-tight">Click or Drag Files</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Upload the corrected designs here</p>
                                 </div>
                               </div>
                             )}
                          </label>
                        </div>

                        {solveForm.files.length > 0 && (
                          <div className="space-y-2 mt-6">
                             <div className="flex items-center gap-2 px-1 mb-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/80" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ready For Submission ({solveForm.files.length})</span>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                                {solveForm.files.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                                     <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                        <IconCheck size={18} />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold text-white truncate uppercase tracking-tighter">{file.name}</p>
                                        <p className="text-[9px] font-medium text-gray-500 uppercase tracking-widest">Successfully Uploaded</p>
                                     </div>
                                     <button 
                                       onClick={() => setSolveForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))}
                                       className="p-2 rounded-xl hover:bg-brand-error/10 text-gray-600 hover:text-brand-error transition-all"
                                     >
                                       <IconX size={14} />
                                     </button>
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}
                     </div>
                  )}
               </div>
             )}
          </div>
        </Modal>

        {/* Confirm Resolution Modal */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Confirm Case Resolution"
          size="sm"
          isElevatedHeader
          isElevatedFooter
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button variant="recessed" onClick={() => setIsConfirmModalOpen(false)} className="uppercase tracking-widest text-xs px-6 h-11 border-white/5 hover:bg-white/5">Not Yet</Button>
              <Button 
                variant="metallic-success" 
                onClick={handleConfirmResolution} 
                isLoading={isAlertActionLoading}
                className="uppercase tracking-widest text-[11px] font-black px-10 h-11"
              >
                Yes, Close Case
              </Button>
            </div>
          }
        >
          <div className="py-8 text-center space-y-5">
             <div className="w-20 h-20 rounded-full bg-brand-success/10 flex items-center justify-center mx-auto text-brand-success shadow-inner border border-brand-success/20">
                <IconCheck size={40} />
             </div>
             <div className="space-y-2">
               <h4 className="text-lg font-bold text-white uppercase tracking-tight">Satisfaction Check</h4>
               <p className="text-sm font-medium text-gray-400 leading-relaxed max-w-[280px] mx-auto">Are you sure this Art Help/Dispute has been resolved to your satisfaction? This will remove the status tag.</p>
             </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

// UI Subcomponents
const MetadataSection: React.FC<{
  title: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  collapsedHeight?: string;
}> = ({ title, children, isCollapsed, collapsedHeight = "h-14" }) => {
  // RULE: Metadata Sections MUST remain visible on mobile. Never collapse them into 2px lines.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const shouldCollapse = isCollapsed && !isMobile;

  return (
    <div className="w-full flex justify-center">
      {shouldCollapse ? (
        <div
          className={`w-[2px] ${collapsedHeight} bg-surface-border rounded-full transition-all duration-300`}
        />
      ) : (
      <div className="w-full min-w-[280px]">
        <ElevatedMetallicCard
          title={title}
          headerClassName="px-6 py-4"
          bodyClassName="p-6 space-y-5"
          className="hover:border-white/5 transition-all group"
        >
          {children}
        </ElevatedMetallicCard>
      </div>
      )}
    </div>
  );
};

const MetadataItem: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  isMono?: boolean;
  isAccent?: boolean;
  isSelect?: boolean;
  isRecessed?: boolean;
  isDate?: boolean;
  isTime?: boolean;
  leftIcon?: React.ReactNode;
  valueClassName?: string;
  onClick?: () => void;
}> = ({
  label,
  value,
  isMono,
  isAccent,
  isSelect,
  isRecessed,
  isDate,
  isTime,
  leftIcon,
  valueClassName,
  onClick,
}) => (
    <div
      className={`px-1 group/item ${onClick || isSelect ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 group-hover/item:text-brand-primary/70 transition-colors uppercase">
        {label}
      </p>
      <div
        className={`
            w-full flex items-center justify-between transition-all duration-300 relative overflow-hidden
            ${isSelect || isRecessed
            ? "bg-black/25 border border-surface-border/40 rounded-xl px-4 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.02)]"
            : "bg-transparent border-2 border-transparent px-0 py-1"
          }
            ${isSelect ? "cursor-pointer hover:border-white/10 active:scale-[0.98]" : ""}
        `}
      >
        {/* Subtle Vertical Metallic Gradient for isSelect/isRecessed */}
        {(isSelect || isRecessed) && (
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01),transparent)] pointer-events-none" />
        )}

        <div
          className={`
                relative z-10 w-full flex items-center gap-2
                ${isMono ? "font-mono" : "font-bold"} 
                ${isAccent ? "text-brand-primary text-base" : "text-sm"}
                ${isSelect ? "text-white" : valueClassName || "text-gray-300"}
            `}
        >
          {isDate && (
            <IconCalendar
              size={16}
              className={
                isSelect || isRecessed ? "text-brand-primary" : "text-gray-500"
              }
            />
          )}
          {isTime && (
            <IconClock
              size={16}
              className={
                isSelect || isRecessed ? "text-brand-primary" : "text-gray-500"
              }
            />
          )}
          {leftIcon && <div className="text-gray-500">{leftIcon}</div>}
          <div className="flex-1 overflow-hidden">{value}</div>
        </div>
        {isSelect && (
          <svg
            className="w-4 h-4 text-gray-600 group-hover/item:text-brand-primary transition-colors shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>
    </div>
  );

const CollaboratorItem: React.FC<{
  name: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
}> = ({ name, phone }) => {
  return (
    <div className="flex flex-col gap-1.5 leading-tight">
      <span className="text-sm font-bold text-white">
        {formatDisplayName(name)}
      </span>

      {phone && (
        <div className="flex items-center gap-2 group/phone cursor-pointer transition-colors">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover/phone:text-brand-primary transition-colors">
            Phone
          </span>
          <span className="text-xs font-mono text-gray-300 group-hover/phone:text-white transition-colors tracking-wide">
            {phone}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
