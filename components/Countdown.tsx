import React, { useState, useEffect } from 'react';
import { getTimeLeft } from '../utils/formatter';
import { Tooltip } from './Surfaces';

interface CountdownProps {
    date: string | Date | null | undefined;
    status?: string | null;
    className?: string;
    isClientTime?: boolean;
    isMerged?: boolean;
    submittedAt?: string | Date | null;
    updatedAt?: string | Date | null;
}

/**
 * A real-time countdown component that updates every minute.
 * Solves the issue where 'Time Left' becomes stale on long-lived pages.
 */
export const Countdown: React.FC<CountdownProps> = ({ 
    date, 
    status, 
    className = '', 
    isClientTime = false, 
    isMerged = false,
    submittedAt = null,
    updatedAt = null
}) => {
    // Initial state calculation
    const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(date, status || undefined, isClientTime, submittedAt, updatedAt));

    useEffect(() => {
        // Function to update the time
        const updateTimer = () => {
            const timerData = getTimeLeft(date, status || undefined, isClientTime, submittedAt, updatedAt);
            setTimeLeft(timerData);
        };

        // Update immediately if props change
        updateTimer();

        // 1. Set up the interval (Every 60 seconds is enough for "Minutes Left")
        // If we want seconds, we can do 1000ms.
        const intervalId = setInterval(updateTimer, 60000);

        // Cleanup
        return () => clearInterval(intervalId);
    }, [date, status, submittedAt, updatedAt]);

    if (!timeLeft.label) return null;

    if (timeLeft.isLate && timeLeft.lateLabel) {
        const text = `${timeLeft.lateLabel}   •   `;
        const repeatedText = Array(20).fill(text).join('');
        return (
            <Tooltip 
                content={<span className={`text-xs font-bold uppercase tracking-wider ${timeLeft.color}`}>{timeLeft.lateLabel}</span>}
                wrapperClassName={`marquee-container ${isMerged ? 'merged' : ''} ${timeLeft.color} ${className}`}
            >
                <span className="animate-marquee-slow">
                    {repeatedText}
                </span>
            </Tooltip>
        );
    }

    return (
        <span className={`${timeLeft.color} ${className}`}>
            {timeLeft.label}
        </span>
    );
};

export default Countdown;
