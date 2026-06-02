import React from 'react';
import { TableProps } from '../types';

export function Table<T>({
  columns = [],
  data = [],
  onRowClick,
  emptyMessage = "No data available",
  className = "",
  isLoading = false,
  skeletonCount = 6,
  isMetallicHeader = false,
  disableRowHover = false,
  dense = false
}: TableProps<T>) {

  const headerStyle = isMetallicHeader ? {
    backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%), linear-gradient(115deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.02) 100%)',
    backgroundSize: '100% 100%'
  } : {};

  return (
    <div className={`w-full relative ${className}`}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 rounded-2xl border border-surface-border bg-surface-card shadow-nova">
        <table className="w-full text-left border-collapse table-auto">
          {/* Real header — always visible so columns never shift */}
          <thead className={isMetallicHeader ? 'relative z-20' : ''}>
            <tr
              className={isMetallicHeader ? 'bg-[#1A1A1A] relative' : 'bg-surface-overlay border-b border-surface-border'}
              style={headerStyle}
            >
              {columns.map((col, idx) => {
                const headerAlignmentClasses = col.className
                  ? col.className.split(' ').filter(c =>
                    (c.startsWith('text-') && ['left', 'center', 'right'].includes(c.split('-')[1])) ||
                    c.startsWith('w-') || c.startsWith('min-w-') || c === 'whitespace-nowrap'
                  ).join(' ')
                  : '';
                return (
                  <th
                    key={idx}
                    className={`${dense ? 'px-3.5 py-2.5' : 'px-6 py-4'} text-[11px] font-bold uppercase tracking-widest whitespace-nowrap ${isMetallicHeader ? 'text-white' : 'text-gray-400'} ${headerAlignmentClasses}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-border/40">
            {isLoading ? (
              // Skeleton rows - standardized to ITEM_PER_PAGE to prevent layout shift
              [...Array(skeletonCount)].map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col, colIdx) => {
                    const isLast = colIdx === columns.length - 1;
                    return (
                      <td key={colIdx} className={`px-6 ${col.className || ''}`} style={{ height: '58px' }}>
                        <div className="flex flex-col gap-2 justify-center h-full">
                          <div className={`h-[7px] rounded-full bg-white/[0.06] relative overflow-hidden ${isLast ? 'w-4 ml-auto' : 'w-3/4'}`}>
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent animate-[shimmer_2s_infinite]" style={{ animationDelay: `${rowIdx * 100}ms` }} />
                          </div>
                          {colIdx < 4 && !isLast && (
                            <div className="h-[5px] rounded-full w-1/2 bg-white/[0.03] relative overflow-hidden">
                              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-[shimmer_2s_infinite]" style={{ animationDelay: `${rowIdx * 100 + 200}ms` }} />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-bold text-white mb-2">No Data</h3>
                    <p className="max-w-[200px] mx-auto">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                let skipRemaining = 0;
                return (
                  <tr
                    key={(item as any).id || (item as any).project_id || (item as any).id?.toString() || rowIdx}
                    onClick={() => onRowClick?.(item)}
                    className={`transition-all duration-200 ease-out group ${disableRowHover ? '' : onRowClick ? 'cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.08]' : 'hover:bg-white/[0.03]'}`}
                    style={{ height: '58px' }}
                  >
                    {columns.map((col, colIdx) => {
                      if (skipRemaining > 0) {
                        skipRemaining--;
                        return null;
                      }
                      if ((col as any).shouldSkip && (col as any).shouldSkip(item)) {
                        return null;
                      }
                      const span = (col as any).colSpan ? (col as any).colSpan(item) : 1;
                      if (span > 1) {
                        skipRemaining = span - 1;
                      }
                      return (
                        <td 
                          key={colIdx} 
                          colSpan={span}
                          className={`${dense ? 'px-3 py-2 text-xs' : 'px-6 py-3 text-sm'} text-gray-300 ${colIdx % 2 === 1 && span === 1 ? 'bg-white/[0.02]' : ''} ${col.className || ''}`}
                        >
                          {col.render ? col.render(item, rowIdx) : (item as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
 
      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-3">
        {isLoading ? (
          [...Array(skeletonCount > 4 ? 4 : skeletonCount)].map((_, idx) => (
            <div key={idx} className="p-4 space-y-4 rounded-2xl border border-white/5 bg-surface-card" style={{ height: '140px' }}>
              <div className="h-6 w-1/3 bg-white/5 rounded-lg animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : !data || data.length === 0 ? (
          <div className="py-12 px-6 text-center bg-surface-card rounded-2xl border border-surface-border">
            <h3 className="text-white font-bold">No Data</h3>
            <p className="text-gray-500 text-sm">{emptyMessage}</p>
          </div>
        ) : (
          data.map((item, rowIdx) => {
            // Find special columns
            const idCol = columns.find(c => c.header?.toString().toLowerCase().includes('id'));
            const titleCol = columns.find(c => c.header?.toString().toLowerCase().includes('title'));
            const statusCol = columns.find(c => c.header?.toString().toLowerCase().includes('status'));
            const actionsCol = columns.find(c => c.key === 'actions');
 
            const mobileCols: any[] = [];
            let skipCount = 0;
            columns.forEach(col => {
              if (col === idCol || col === titleCol || col === statusCol || col === actionsCol) {
                return;
              }
              if (skipCount > 0) {
                skipCount--;
                return;
              }
              if ((col as any).shouldSkip && (col as any).shouldSkip(item)) {
                return;
              }
              const span = (col as any).colSpan ? (col as any).colSpan(item) : 1;
              if (span > 1) {
                skipCount = span - 1;
              }
              mobileCols.push(col);
            });
 
            return (
              <div
                key={(item as any).id || (item as any).project_id || rowIdx}
                onClick={() => onRowClick?.(item)}
                className="group active:scale-[0.98] transition-all bg-surface-card rounded-2xl border border-surface-border overflow-hidden shadow-sm"
              >
                {/* Mobile Card Header */}
                <div className="p-4 border-b border-white/[0.03] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-black tracking-tighter">
                    {idCol && <span>{idCol.render ? idCol.render(item, rowIdx) : (item as any)[idCol.key]}</span>}
                  </div>
                  {actionsCol && (
                    <div className="shrink-0">
                      {actionsCol.render ? actionsCol.render(item, rowIdx) : (item as any)[actionsCol.key]}
                    </div>
                  )}
                </div>
 
                {/* Mobile Card Body - Label Value Rows */}
                <div className="divide-y divide-white/[0.02]">
                  {/* Project Title Row (Moved here) */}
                  {titleCol && (
                    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.01]">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {titleCol.header}
                      </span>
                      <div className="text-right text-xs text-white font-black ml-4 truncate max-w-[200px]">
                        {titleCol.render ? titleCol.render(item, rowIdx) : (item as any)[titleCol.key]}
                      </div>
                    </div>
                  )}
                  {mobileCols.map((col, colIdx) => (
                    <div key={colIdx} className="flex items-center justify-between px-4 py-3 bg-white/[0.01]">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {col.header}
                      </span>
                      <div className="text-right text-xs text-gray-300 font-medium ml-4">
                        {col.render ? col.render(item, rowIdx) : (item as any)[col.key]}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Card Footer - Status */}
                {statusCol && (
                  <div className="p-4 bg-white/[0.02] flex items-center justify-between border-t border-white/[0.03]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      {statusCol.header}
                    </span>
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {statusCol.render ? statusCol.render(item, rowIdx) : (item as any)[statusCol.key]}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}