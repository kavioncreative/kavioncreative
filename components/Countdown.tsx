import React, { useState, useEffect } from 'react';
import { getTimeLeft } from '../utils/formatter';

interface CountdownProps {
    date: string | Date | null | undefined;
    status?: string | null;
    className?: string;
    isClientTime?: boolean;
}

/**
 * A real-time countdown component that updates every minute.
 * Solves the issue where 'Time Left' becomes stale on long-lived pages.
 */
export const Countdown: React.FC<CountdownProps> = ({ date, status, className = '', isClientTime = false }) => {
    // Initial state calculation
    const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(date, status || undefined, isClientTime));

    useEffect(() => {
        // Function to update the time
        const updateTimer = () => {
            const timerData = getTimeLeft(date, status || undefined, isClientTime);
            setTimeLeft(timerData);
        };

        // Update immediately if props change
        updateTimer();

        // 1. Set up the interval (Every 60 seconds is enough for "Minutes Left")
        // If we want seconds, we can do 1000ms.
        const intervalId = setInterval(updateTimer, 60000);

        // Cleanup
        return () => clearInterval(intervalId);
    }, [date, status]);

    if (!timeLeft.label) return null;

    return (
        <span className={`${timeLeft.color} ${className}`}>
            {timeLeft.label}
        </span>
    );
};

export default Countdown;
