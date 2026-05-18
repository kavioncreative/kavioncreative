
import React from 'react';

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Base Icon wrapper for consistency
 */
const IconBase: React.FC<IconProps & { children: React.ReactNode }> = ({
  className = "w-5 h-5",
  size,
  strokeWidth = 2,
  children,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {children}
  </svg>
);

export const IconPowerToggle: React.FC<IconProps> = (props) => (
  <IconBase {...props} strokeWidth={2.5}>
    <path d="M12 2v10" />
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
  </IconBase>
);

// --- NAVIGATION ICONS ---

export const IconLayout: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </IconBase>
);

export const IconUser: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </IconBase>
);

export const IconUsers: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconBase>
);

export const IconReply: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </IconBase>
);

export const IconCreditCard: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </IconBase>
);

export const IconChartBar: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </IconBase>
);

export const IconMessageSquare: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </IconBase>
);

export const IconMessage2: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M8 9h8" />
    <path d="M8 13h6" />
    <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12z" />
  </IconBase>
);

export const IconLoader2: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </IconBase>
);

export const IconMaximize2: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </IconBase>
);

export const IconMail: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </IconBase>
);

export const IconPhone: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-2.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </IconBase>
);

export const IconSmartphone: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </IconBase>
);

export const IconShare: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </IconBase>
);

export const IconCamera: React.FC<IconProps> = (props) => (
  <IconBase {...props} strokeWidth={1.5}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </IconBase>
);

export const IconLoader: React.FC<IconProps> = ({ className = "w-5 h-5", ...props }) => (
  <IconBase className={`${className} animate-spin`} {...props}>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </IconBase>
);

export const IconBriefcase: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </IconBase>
);

// --- UI ACTIONS ---

export const IconBrush: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-3.91 3.91-5.03 5.02-5.03 5.02L2 22l2.04-.04s1.11-1.12 5.02-5.03" />
    <path d="m18 7 3 3" />
  </IconBase>
);

export const IconPen: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="m2 2 5 2" />
    <path d="m2 2 2 5" />
    <path d="m2 2 5 5" />
  </IconBase>
);

export const IconPlus: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </IconBase>
);

export const IconSearch: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </IconBase>
);

export const IconFilter: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </IconBase>
);

export const IconEdit: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z" />
  </IconBase>
);

export const IconTrash: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </IconBase>
);

export const IconMoreVertical: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </IconBase>
);

export const IconMoreHorizontal: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </IconBase>
);

export const IconCloudUpload: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M17.5 19a5.5 5.5 0 0 0 0-11h-1.2A8 8 0 1 0 2 13.5a5.5 5.5 0 0 0 5.5 5.5" />
    <path d="M12 11v8" />
    <path d="m9 14 3-3 3 3" />
  </IconBase>
);

export const IconEye: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </IconBase>
);

export const IconEyeOff: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </IconBase>
);

export const IconRefreshCw: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </IconBase>
);

export const IconLink: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </IconBase>
);

export const IconSave: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </IconBase>
);

export const IconRotateCcw: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M1 4v6h6" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </IconBase>
);

// --- STATUS ICONS ---

export const IconCheck: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="20 6 9 17 4 12" />
  </IconBase>
);

export const IconCheckCircle: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </IconBase>
);

export const IconCheckSquare: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </IconBase>
);

export const IconAlertTriangle: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </IconBase>
);

export const IconXCircle: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </IconBase>
);

export const IconInfo: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </IconBase>
);

export const IconClock: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconBase>
);

// --- UTILITY ICONS ---

export const IconSettings: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </IconBase>
);

export const IconCalendar: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </IconBase>
);

export const IconBell: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </IconBase>
);

export const IconLogout: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </IconBase>
);

export const IconChevronLeft: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="15 18 9 12 15 6" />
  </IconBase>
);

export const IconChevronRight: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="9 18 15 12 9 6" />
  </IconBase>
);

export const IconChevronDown: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="6 9 12 15 18 9" />
  </IconBase>
);

// --- NEW ICONS ---

export const IconArrowRight: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </IconBase>
);

export const IconUserPlus: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </IconBase>
);

export const IconMaximize: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </IconBase>
);

export const IconDollar: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </IconBase>
);

export const IconBuilding: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-8h6v8" />
  </IconBase>
);

export const IconBank: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M3 21h18" />
    <path d="M3 10h18" />
    <path d="m5 6 7-3 7 3" />
    <path d="M4 10v11" />
    <path d="M20 10v11" />
    <path d="M8 14v3" />
    <path d="M12 14v3" />
    <path d="M16 14v3" />
  </IconBase>
);

export const IconBox: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </IconBase>
);

export const IconLayoutSidebar: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </IconBase>
);

export const IconMenu: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </IconBase>
);


export const IconX: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconBase>
);

export const IconFile: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </IconBase>
);

export const IconFileFilled: React.FC<IconProps> = ({ className = "w-5 h-5", ...props }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" opacity="0.3" />
  </svg>
);

export const IconFileText: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </IconBase>
);

export const IconFileImage: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </IconBase>
);

export const IconFileVideo: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="m22 8-6 4 6 4V8Z" />
    <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
  </IconBase>
);

export const IconFileArchive: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="12" y1="9" x2="12" y2="21" />
  </IconBase>
);

export const IconSend: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </IconBase>
);

export const IconCopy: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </IconBase>
);

export const IconPaperclip: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </IconBase>
);

export const IconDownload: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </IconBase>
);

export const IconTrendingUp: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </IconBase>
);

export const IconArrowUpRight: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </IconBase>
);

export const IconLock: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconBase>
);

export const IconUnlock: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </IconBase>
);

export const IconExternalLink: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </IconBase>
);


export const IconDatabase: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </IconBase>
);

export const IconShield: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </IconBase>
);

export const IconChartLine: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </IconBase>
);

export const IconActivity: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </IconBase>
);

export const IconTrendingDown: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </IconBase>
);

export const IconCpu: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2" />
    <path d="M15 20v2" />
    <path d="M2 15h2" />
    <path d="M2 9h2" />
    <path d="M20 15h2" />
    <path d="M20 9h2" />
    <path d="M9 2v2" />
    <path d="M9 20v2" />
  </IconBase>
);

export const IconLayers: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </IconBase>
);

export const IconCode: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </IconBase>
);

export const IconPhotoOff: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="15" y1="8" x2="15.01" y2="8" />
    <path d="m19.121 19.122-3.864-3.864L5 15.257V5.001l1.121-1.121" />
    <path d="m14.232 10.232 1.414-1.414L21 14.168V21.001l-1.879-1.879" />
    <path d="M11 5h8a2 2 0 0 1 2 2v7" />
    <path d="M7 19h10c.341 0 .662-.085.941-.235" />
    <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </IconBase>
);

export const IconTerminal: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </IconBase>
);

export const IconZap: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </IconBase>
);

export const IconMapPin: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
);

export const IconStar: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </IconBase>
);

export const IconAward: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="8" r="7" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </IconBase>
);

export const IconRosette: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    <path d="m9 12 2 2 4-4" />
  </IconBase>
);

export const IconShieldNew: React.FC<IconProps> = (props) => (
  <IconBase viewBox="0 0 24 24" stroke="none" {...props}>
    <defs>
      <linearGradient id="grad-shield-new" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#26d9b3" />
        <stop offset="100%" stopColor="#16a085" />
      </linearGradient>
    </defs>
    <path d="M4 3h16v11l-8 5-8-5V3z" fill="url(#grad-shield-new)" />
    <path d="M4 3h16v0.5H4V3z" fill="white" fillOpacity="0.4" />
    <path d="M4 3v11l8 5 8-5V3H4zM5 4h14v9.5l-7 4.3-7-4.3V4z" fill="black" fillOpacity="0.1" />
  </IconBase>
);

export const IconShieldTopRated: React.FC<IconProps> = (props) => (
  <IconBase viewBox="0 0 24 24" stroke="none" {...props}>
    <defs>
      <linearGradient id="grad-shield-tr-light" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#5dade2" />
        <stop offset="100%" stopColor="#3498db" />
      </linearGradient>
      <linearGradient id="grad-shield-tr-dark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#3498db" />
        <stop offset="100%" stopColor="#2980b9" />
      </linearGradient>
    </defs>
    <path d="M4 3h16v11l-8 5-8-5V3z" fill="url(#grad-shield-tr-dark)" />
    <path d="M20 3L4 3V13.5L12 18.5z" fill="url(#grad-shield-tr-light)" />
    <path d="M20 3L4 3L20 13V3z" fill="white" fillOpacity="0.3" />
    <path d="M4 3h16v0.5H4V3z" fill="white" fillOpacity="0.5" />
  </IconBase>
);

export const IconShieldTopRatedPlus: React.FC<IconProps> = (props) => (
  <IconBase viewBox="0 0 24 24" stroke="none" {...props}>
    <defs>
      <linearGradient id="grad-shield-trp-1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f48fb1" />
        <stop offset="100%" stopColor="#e91e63" />
      </linearGradient>
      <linearGradient id="grad-shield-trp-2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f06292" />
        <stop offset="100%" stopColor="#d81b60" />
      </linearGradient>
    </defs>
    <path d="M4 3h16v11l-8 5-8-5V3z" fill="url(#grad-shield-trp-1)" />
    <path d="M4 3L12 8L20 3H4z" fill="white" fillOpacity="0.3" />
    <path d="M4 3L12 8V19L4 14V3z" fill="white" fillOpacity="0.1" />
    <path d="M4 3h16v0.5H4V3z" fill="white" fillOpacity="0.5" />
  </IconBase>
);

export const IconShieldExpert: React.FC<IconProps> = (props) => (
  <IconBase viewBox="0 0 24 24" stroke="none" {...props}>
    <defs>
      <linearGradient id="grad-shield-expert" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f4d03f" />
        <stop offset="100%" stopColor="#f1c40f" />
      </linearGradient>
    </defs>
    <path d="M4 3h16v11l-8 5-8-5V3z" fill="url(#grad-shield-expert)" />
    <path d="M4 3h16v0.5H4V3z" fill="white" fillOpacity="0.6" />
    <path d="M12 6.2l1.24 2.51 2.77.4-2.01 1.96.47 2.76-2.47-1.3-2.47 1.3.47-2.76-2.01-1.96 2.77-.4L12 6.2z" fill="white" />
    <path d="M4 3v11l8 5 8-5V3H4zM5 4h14v9.5l-7 4.3-7-4.3V4z" fill="black" fillOpacity="0.1" />
  </IconBase>
);

export const IconPlay: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </IconBase>
);
export const IconVolumeHigh: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
  </IconBase>
);

export const IconVolumeMute: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
  </IconBase>
);

export const IconStop: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </IconBase>
);

export const IconAlertCircle: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </IconBase>
);

export const IconUserCircle: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 0 0 1 3.834 2.855" />
  </IconBase>
);

export const IconFolder: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M5 19h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.382l-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2z" />
  </IconBase>
);

export const IconApplicant: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 18c0-2 2-3.5 5-3.5s5 1.5 5 3.5" />
  </IconBase>
);

export const IconTicket: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 0 0 4v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-4Z" />
    <path d="M13 3v2" />
    <path d="M13 8v2" />
    <path d="M13 14v2" />
    <path d="M13 19v2" />
  </IconBase>
);

export const IconGlobe: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </IconBase>
);

export const IconTag: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </IconBase>
);

export const IconTarget: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </IconBase>
);

export const IconFunnel: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </IconBase>
);

export const IconHistory: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </IconBase>
);

export const IconList: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </IconBase>
);


export const IconVideo: React.FC<IconProps> = (props) => (
  <IconBase {...props}>
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </IconBase>
);
