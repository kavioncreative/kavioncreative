import React from 'react';

export const Alert: React.FC<{ type: 'success' | 'error' | 'warning' | 'info'; title: string; children?: React.ReactNode }> = ({ type, title, children }) => {
  const styles = {
    success: { bg: 'bg-brand-success/10', border: 'border-brand-success/30', text: 'text-brand-success', icon: 'M5 13l4 4L19 7' },
    error: { bg: 'bg-brand-error/10', border: 'border-brand-error/30', text: 'text-brand-error', icon: 'M6 18L18 6M6 6l12 12' },
    warning: { bg: 'bg-brand-warning/10', border: 'border-brand-warning/30', text: 'text-brand-warning', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    info: { bg: 'bg-brand-info/10', border: 'border-brand-info/30', text: 'text-brand-info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  };
  const s = styles[type];
  return (
    <div className={`flex gap-4 p-4 rounded-2xl border ${s.bg} ${s.border}`}>
      <div className={s.text}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
        </svg>
      </div>
      <div>
        <h4 className={`font-bold ${s.text}`}>{title}</h4>
        {children && <div className="text-sm opacity-80 mt-1">{children}</div>}
      </div>
    </div>
  );
};

/**
 * Enhanced Skeleton with Shimmer Effect
 */
export const Skeleton: React.FC<{ className?: string; variant?: 'rect' | 'circle' | 'text' }> = ({ className = '', variant = 'rect' }) => {
  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded h-3 w-full',
  };

  return (
    <div className={`relative overflow-hidden bg-white/[0.03] ${variantStyles[variant]} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
    </div>
  );
};

/**
 * Full Page Loader Overlay - Refined for premium, icon-free experience
 */
export const PageLoader: React.FC<{ label?: string }> = ({ label = "Loading Nova..." }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-bg/95 backdrop-blur-2xl animate-in fade-in duration-700">
      <div className="w-64 h-[2px] bg-white/[0.03] rounded-full overflow-hidden mb-8 relative">
        <div className="absolute inset-0 bg-brand-primary -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-brand-primary/80 to-transparent" />
      </div>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.5em] animate-pulse">{label}</p>
    </div>
  );
};

/**
 * Container/Section Level Loader
 */
export const SectionLoader: React.FC<{ className?: string; label?: string }> = ({ className = '', label }) => {
  return (
    <div className={`relative min-h-[200px] flex flex-col items-center justify-center bg-surface-card/30 rounded-3xl border border-surface-border/50 ${className}`}>
      <div className="flex gap-1.5 mb-3">
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
      </div>
      {label && <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>}
    </div>
  );
};


/**
 * Pre-defined Skeletons for common UI patterns
 */
export const SkeletonCard: React.FC = () => (
  <div className="bg-surface-card rounded-2xl p-6 border border-surface-border space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="w-10 h-10" variant="circle" />
      <Skeleton className="w-12 h-5" />
    </div>
    <div className="space-y-2">
      <Skeleton className="w-2/3 h-4" />
      <Skeleton className="w-1/2 h-8" />
    </div>
    <div className="pt-4 flex gap-2">
      <Skeleton className="flex-1 h-10" />
      <Skeleton className="w-10 h-10" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ rows = 5, columns = 6, className = "" }) => (
  <div className={`w-full rounded-2xl border border-surface-border bg-surface-card overflow-hidden ${className}`}>
    {/* Skeleton Header */}
    <div className="px-6 py-4 border-b border-surface-border flex gap-8 bg-surface-overlay/20">
      {[...Array(columns)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-2 opacity-50 ${i === 0 ? 'w-24' : i === columns - 1 ? 'w-16 ml-auto' : 'flex-1 max-w-[100px]'}`}
        />
      ))}
    </div>
    {/* Skeleton Body - row height matches actual table (py-[22px] + two bars = ~65px) */}
    <div className="divide-y divide-surface-border/40">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-[22px] flex items-center gap-8">
          {[...Array(columns)].map((_, j) => (
            <div
              key={j}
              className={`flex flex-col gap-1.5 ${j === 0 ? 'w-40' : j === columns - 1 ? 'w-12 ml-auto' : 'flex-1 max-w-[120px]'}`}
            >
              <Skeleton className={`h-2 opacity-20 w-full`} />
              {/* Second bar on first 2 cols to simulate multi-line cell content */}
              {j < 2 && <Skeleton className="h-[6px] opacity-10 w-3/5" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonForm: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-full h-12" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="w-full h-12" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="w-32 h-4" />
      <Skeleton className="w-full h-12" />
    </div>
    <div className="space-y-2">
      <Skeleton className="w-24 h-4" />
      <Skeleton className="w-full h-32" />
    </div>
    <div className="pt-4">
      <Skeleton className="w-full h-14" />
    </div>
  </div>
);

export const EmptyState: React.FC<{ title: string; description: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({ title, description, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-surface-card rounded-3xl border border-dashed border-surface-border">
      <div className="mb-6 text-gray-600">
        {icon || (
          <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-sm mb-8">{description}</p>
      {action}
    </div>
  );
};
