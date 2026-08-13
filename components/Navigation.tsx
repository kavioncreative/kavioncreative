import React from 'react';

export const Tabs: React.FC<{
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}> = ({ tabs, activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-black/40 border border-white/5 rounded-2xl w-full sm:w-fit shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative flex items-center justify-center sm:justify-start gap-1.5 xs:gap-2 px-2 xs:px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-colors duration-200 text-[10px] xs:text-xs sm:text-sm font-bold sm:font-medium outline-none overflow-hidden flex-1 min-w-[calc(50%-4px)] sm:min-w-0 sm:flex-none ${activeTab === tab.id
            ? 'text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
        >
          {/* Active State Background & Border */}
          {activeTab === tab.id && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_10px_15px_-3px_rgba(255,77,45,0.3)] rounded-xl duration-200" />
          )}

          {/* Metallic Shine Overlay */}
          {activeTab === tab.id && (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
          )}

          <span className="relative z-20 flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export const Breadcrumbs: React.FC<{ items: { label: string; href?: string }[] }> = ({ items }) => {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="text-gray-600">/</span>}
          <span className={`${idx === items.length - 1 ? 'text-white font-medium' : 'text-gray-500 hover:text-gray-300 transition-colors'}`}>
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};

export const Pagination: React.FC<{ current: number; total: number; onChange: (p: number) => void }> = ({ current, total, onChange }) => {
  if (total <= 1) return null;

  // Build the page number sequence with ellipsis markers
  const getPageNumbers = (): (number | '...')[] => {
    const delta = 2; // neighbours on each side of current
    const pages: (number | '...')[] = [];
    const rangeStart = Math.max(2, current - delta);
    const rangeEnd = Math.min(total - 1, current + delta);

    pages.push(1);

    if (rangeStart > 2) pages.push('...');

    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);

    if (rangeEnd < total - 1) pages.push('...');

    if (total > 1) pages.push(total);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const PageBtn = ({ page, active }: { page: number; active: boolean }) => (
    <button
      onClick={() => onChange(page)}
      className={`relative w-9 h-9 rounded-xl transition-all duration-200 font-bold outline-none overflow-hidden text-sm ${active ? 'text-white' : 'bg-surface-overlay border border-surface-border text-gray-400 hover:text-white hover:bg-surface-card'
        }`}
    >
      {active && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] border border-[#FF4D2D] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2),0_4px_12px_-2px_rgba(255,77,45,0.3)] rounded-xl duration-200" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-10" />
        </>
      )}
      <span className="relative z-20">{page}</span>
    </button>
  );

  const NavBtn = ({ dir }: { dir: 'prev' | 'next' }) => {
    const disabled = dir === 'prev' ? current === 1 : current === total;
    return (
      <button
        disabled={disabled}
        onClick={() => onChange(dir === 'prev' ? current - 1 : current + 1)}
        className="p-2 bg-surface-overlay border border-surface-border rounded-xl disabled:opacity-30 hover:bg-surface-card transition-colors outline-none"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dir === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
        </svg>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      <NavBtn dir="prev" />
      {pageNumbers.map((page, idx) =>
        page === '...'
          ? <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-gray-600 font-bold text-sm select-none">…</span>
          : <PageBtn key={page} page={page} active={page === current} />
      )}
      <NavBtn dir="next" />
    </div>
  );
};