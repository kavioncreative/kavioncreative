import React from 'react';

interface ElevatedMetallicCardProps {
    title: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    headerClassName?: string;
}

/**
 * Nova — Elevated Metallic Card
 * 
 * A premium, reusable card component featuring:
 * - Soft rounded container (3xl)
 * - Elevated header with a subtle metallic light-sweep
 * - Center-weighted shadow depth falloff
 * - Clean, non-glossy surface adherence
 */
export const ElevatedMetallicCard: React.FC<ElevatedMetallicCardProps & { rightElement?: React.ReactNode }> = ({
    title,
    children,
    className = "",
    bodyClassName = "p-8",
    headerClassName = "px-8 py-4",
    rightElement
}) => {
    return (
        <div className={`bg-surface-card border border-surface-border rounded-3xl overflow-hidden group hover:border-surface-border shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 ${className}`}>
            {/* Elevated Header Section */}
            <div className={`${headerClassName} border-b border-surface-border bg-white/[0.03] relative z-20 overflow-hidden`}>
                {/* Diagonal Metallic Shine Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" />

                <div className="flex items-center justify-between relative z-10 w-full">
                    {/* Heading Layer */}
                    <h4 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest relative z-10">
                        {title}
                    </h4>

                    {/* Optional Right Element */}
                    {rightElement && (
                        <div className="flex items-center gap-2 relative z-10">
                            {rightElement}
                        </div>
                    )}
                </div>

                {/* Center-weighted Shadow Depth Falloff */}
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none -z-10">
                    <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                </div>
            </div>

            {/* Card Content Body */}
            <div className={bodyClassName}>
                {children}
            </div>
        </div>
    );
};
