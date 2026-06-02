/**
 * Formats a date string (YYYY-MM-DD) into a standard display format.
 * @param dateStr Date string (e.g., "2026-01-09")
 * @returns Formatted string (e.g., "09 Jan 2026")
 */
export const formatDeadlineDate = (dateStr: string | Date | null | undefined): string => {
    if (!dateStr) return '';

    try {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr instanceof Date ? dateStr.toDateString() : dateStr;

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateStr instanceof Date ? dateStr.toDateString() : dateStr;
    }
};

/**
 * Formats a 24-hour time string (HH:mm) into a 12-hour AM/PM string.
 * @param timeStr 24-hour time string (e.g., "17:00")
 * @returns 12-hour formatted string (e.g., "5:00 PM")
 */
export const formatTime = (timeStr: string | null | undefined): string => {
    if (!timeStr) return '';

    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return timeStr;

        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');

        return `${displayHours}:${displayMinutes} ${period}`;
    } catch (e) {
        return timeStr;
    }
};

const constructLateLabel = (label: string, status?: string): string => {
    if (!label) return '';
    if (!status) return label;

    const s = status.trim().toLowerCase();
    const designerStatuses = ['in progress', 'revision', 'revision urgent', 'urgent', 'final files'];
    const pmStatuses = ['done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done'];

    const duration = label.toUpperCase().replace(' LATE', '');
    
    if (designerStatuses.includes(s)) {
        if (duration === 'DUE NOW') return 'DUE NOW BY DESIGNER';
        return `${duration} LATE BY DESIGNER`;
    } else if (pmStatuses.includes(s)) {
        if (duration === 'DUE NOW') return 'DUE NOW BY PROJECT MANAGER';
        return `${duration} LATE BY PROJECT MANAGER`;
    }

    return label;
};

/**
 * Calculates the time remaining or overdue status with strict color logic.
 * @param deadlineAt Timestamp string (UTC) or Date object
 * @returns { label: string, color: 'text-brand-success' | 'text-brand-warning' | 'text-brand-error' | 'text-gray-500', isLate?: boolean, lateLabel?: string }
 */
export const getTimeLeft = (
    deadlineAt: string | Date | null | undefined, 
    status?: string, 
    isClientTime: boolean = false,
    submittedAt?: string | Date | null,
    updatedAt?: string | Date | null
) => {
    // 1. Check for terminal statuses FIRST — regardless of deadline presence
    if (status) {
        const s = status.trim().toLowerCase();
        let terminalStatuses = [
            'approved',
            'sent for approval',
            'done',
            'revision done',
            'revision urgent done',
            'urgent done',
            'final files done',
            'final-files-done',
            'cancelled',
        ];

        // If calculating Client Time Left, do NOT stop the clock for Done categories or Sent For Approval.
        // It only stops when the order is formally closed (e.g. Approved or Cancelled).
        if (isClientTime) {
            terminalStatuses = ['approved', 'cancelled'];
        }

        if (terminalStatuses.includes(s) && !isClientTime) {
            // For done statuses (which are terminal for the assignee), we only return empty if we aren't displaying submission info.
            const pmStatuses = ['done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done'];
            if (!pmStatuses.includes(s)) {
                return { label: '', color: 'text-gray-500', isLate: false, lateLabel: '', isClientDeadlineOverdue: false };
            }
        }
    }

    try {
        // 2. Consistent PKT "Now" Calculation (UTC+5)
        const now = new Date();
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const pktNowMs = utcMs + (5 * 3600000);
        const pktNow = new Date(pktNowMs);

        // Check if we are in a done status
        const s = status ? status.trim().toLowerCase() : '';
        const pmStatuses = ['done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done'];
        const isDoneType = pmStatuses.includes(s);

        // Parse Client Deadline to see if it is overdue
        let isClientDeadlineOverdue = false;
        let clientDiffInHours = 0;
        let hasClientDeadline = false;
        if (deadlineAt) {
            let deadline: Date;
            if (deadlineAt instanceof Date) {
                deadline = new Date(deadlineAt.getTime());
            } else {
                const cleanStr = deadlineAt.replace('T', ' ').replace('Z', '').split('.')[0];
                deadline = new Date(cleanStr);
            }
            if (!isNaN(deadline.getTime())) {
                hasClientDeadline = true;
                const clientDiffInMs = deadline.getTime() - pktNow.getTime();
                clientDiffInHours = clientDiffInMs / (1000 * 60 * 60);
                isClientDeadlineOverdue = clientDiffInHours < 0;
            }
        }

        if (isDoneType) {
            const shouldShowSubmissionMarquee = !isClientTime || isClientDeadlineOverdue;

            if (shouldShowSubmissionMarquee) {
                const rawTimestamp = submittedAt || updatedAt;
                let submissionTime = pktNow;
                if (rawTimestamp) {
                    if (rawTimestamp instanceof Date) {
                        submissionTime = rawTimestamp;
                    } else {
                        const cleanStr = rawTimestamp.replace('T', ' ').replace('Z', '').split('.')[0];
                        submissionTime = new Date(cleanStr);
                        if (isNaN(submissionTime.getTime())) {
                            submissionTime = pktNow;
                        }
                    }
                }

                const timeDiffMs = pktNow.getTime() - submissionTime.getTime();
                const diffInHours = timeDiffMs / (1000 * 60 * 60);

                let timeLabel = '';
                if (diffInHours < (1 / 60)) {
                    timeLabel = 'Just Now';
                } else if (diffInHours < 1) {
                    const minutes = Math.floor(diffInHours * 60);
                    timeLabel = `${minutes} Min${minutes > 1 ? 's' : ''} Ago`;
                } else if (diffInHours < 24) {
                    const hours = Math.floor(diffInHours);
                    timeLabel = `${hours} Hour${hours > 1 ? 's' : ''} Ago`;
                } else {
                    const days = Math.floor(diffInHours / 24);
                    const hours = Math.floor(diffInHours % 24);
                    timeLabel = hours === 0 ? `${days} Day${days > 1 ? 's' : ''} Ago` : `${days}d ${hours}h Ago`;
                }

                const lateLabel = `SUBMITTED BY DESIGNER ${timeLabel.toUpperCase()}`;

                let color = 'text-brand-success';
                if (hasClientDeadline) {
                    if (clientDiffInHours < 0) {
                        color = 'text-brand-error';
                    } else if (clientDiffInHours < 24) {
                        color = 'text-brand-warning';
                    }
                }

                return {
                    label: lateLabel,
                    color,
                    isLate: true,
                    lateLabel,
                    isClientDeadlineOverdue
                };
            }
        }

        // 2. No deadline — nothing to show (if it wasn't processed by done submission marquee above)
        if (!deadlineAt) {
            return { label: '', color: 'text-gray-500', isLate: false, lateLabel: '', isClientDeadlineOverdue };
        }
        // 3. Parse Deadline
        let deadline: Date;
        if (deadlineAt instanceof Date) {
            // Assume the date object represents the wall clock time for the deadline
            deadline = new Date(deadlineAt.getTime());
        } else {
            // String parsing - replace T/Z to avoid UTC interpretation if it's meant to be wall time
            const cleanStr = deadlineAt.replace('T', ' ').replace('Z', '').split('.')[0];
            deadline = new Date(cleanStr);
        }

        // 4. Validate Date
        if (isNaN(deadline.getTime())) {
            return { label: 'TBD', color: 'text-gray-500', isLate: false, lateLabel: '', isClientDeadlineOverdue };
        }

        // 5. Calculate Difference
        const diffInMs = deadline.getTime() - pktNow.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        // 6. Handle Edge Case (NaN result)
        if (isNaN(diffInHours)) {
            return { label: '--', color: 'text-gray-500', isLate: false, lateLabel: '', isClientDeadlineOverdue };
        }

        // 7. Determine Color
        let color = 'text-gray-500';
        if (diffInHours >= 24) color = 'text-brand-success';
        else if (diffInHours > 0) color = 'text-brand-warning';
        else color = 'text-brand-error';

        // 8. Generate Label
        let label = '';
        const absDiff = Math.abs(diffInHours);

        if (diffInHours > 0) {
            if (diffInHours >= 24) {
                const days = Math.floor(diffInHours / 24);
                const hours = Math.floor(diffInHours % 24);
                label = hours === 0 ? `${days} Day${days > 1 ? 's' : ''} Left` : `${days}d ${hours}h Left`;
            } else if (diffInHours >= 1) {
                const hours = Math.floor(diffInHours);
                label = `${hours} Hour${hours > 1 ? 's' : ''} Left`;
            } else {
                const minutes = Math.ceil(diffInHours * 60);
                label = `${minutes} Min${minutes > 1 ? 's' : ''} Left`;
            }
        } else {
            const absDiff = Math.abs(diffInHours);
            if (absDiff < (1 / 60)) {
                label = 'Due Now';
            } else if (absDiff < 1) {
                const minutes = Math.floor(absDiff * 60);
                label = `${minutes} Min${minutes > 1 ? 's' : ''} Late`;
            } else if (absDiff < 24) {
                const hours = Math.floor(absDiff);
                label = `${hours} Hour${hours > 1 ? 's' : ''} Late`;
            } else {
                const days = Math.floor(absDiff / 24);
                const hours = Math.floor(absDiff % 24);
                label = hours === 0 ? `${days} Day${days > 1 ? 's' : ''} Late` : `${days}d ${hours}h Late`;
            }
        }

        const isLate = diffInHours < 0;
        const lateLabel = isLate ? constructLateLabel(label, status || undefined) : '';

        return { 
            label, 
            color,
            isLate,
            lateLabel,
            isClientDeadlineOverdue
        };
    } catch (e) {
        console.error('TimeLeft Error:', e);
        return { label: '--', color: 'text-gray-500', isLate: false, lateLabel: '', isClientDeadlineOverdue: false };
    }
};

/**
 * Capitalizes the first letter of each word in a string.
 * @param name User's display name
 * @returns Formatted name in title case
 */
export const formatDisplayName = (name: string | null | undefined): string => {
    if (!name) return '';
    return name
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Truncates a string to a specific number of words.
 * @param text The text to truncate
 * @param limit The number of words to keep
 * @returns Truncated string with ellipsis if needed
 */
export const truncateByWords = (text: string | null | undefined, limit: number = 2): string => {
    if (!text) return '';
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= limit) return text;
    return words.slice(0, limit).join(' ') + '...';
};

