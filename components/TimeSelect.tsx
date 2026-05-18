import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TimeSelectProps } from '../types';
import { formatTime } from '../utils/formatter';

export const TimeSelect: React.FC<TimeSelectProps & { children?: React.ReactNode }> = ({
  value = "",
  onChange,
  label,
  placeholder = "Set deadline...",
  disabled,
  error,
  isInline = false,
  variant = 'primary',
  className = "",
  applyLabel = "Apply Deadline",
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const childrenRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [popoverState, setPopoverState] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    isReady: boolean;
  }>({ top: 0, left: 0, placement: 'bottom', isReady: false });

  // Preset labels for the trigger metadata
  const presets = [
    { value: '09:00', suffix: 'SOD' },
    { value: '12:00', suffix: 'NOON' },
    { value: '23:59', suffix: 'EOD' },
  ];

  // Parse 24h value to 12h display components for the picker logic
  const { displayHour, minutes, period } = useMemo(() => {
    const parts = (value || "00:00").split(":");
    const h24 = parseInt(parts[0] || "0", 10);
    const m = parts[1] || "00";

    const p = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;

    return {
      displayHour: h12.toString().padStart(2, '0'),
      minutes: m,
      period: p
    };
  }, [value]);

  const displayValue = useMemo(() => formatTime(value), [value]);

  const updateCoords = () => {
    const target = children ? childrenRef.current : triggerRef.current;
    if (target) {
      const rect = target.getBoundingClientRect();
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const shouldFlip = spaceBelow < 280 && spaceAbove > 340;

      if (shouldFlip) {
        setPopoverState({
          top: rect.top - gap,
          left: rect.left,
          placement: 'top',
          isReady: true
        });
      } else {
        setPopoverState({
          top: rect.bottom + gap,
          left: rect.left,
          placement: 'bottom',
          isReady: true
        });
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = (children ? childrenRef.current : triggerRef.current)?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideTrigger && !isInsideMenu) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen && !isInline) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    } else if (isOpen && isInline) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    } else {
      setPopoverState(prev => ({ ...prev, isReady: false }));
    }

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isInline, children]);

  const handleSelect = (newHour12?: string, newMinute?: string, newPeriod?: string) => {
    const h12 = newHour12 !== undefined ? parseInt(newHour12, 10) : parseInt(displayHour, 10);
    const m = newMinute !== undefined ? newMinute : minutes;
    const p = newPeriod !== undefined ? newPeriod : period;

    // Convert 12h + Period back to 24h for the value prop
    let h24 = h12 % 12;
    if (p === 'PM') h24 += 12;

    const hStr = h24.toString().padStart(2, '0');
    onChange(`${hStr}:${m}`);

    // Logic: If user clicks a preset or the mods (AM/PM), we might close?
    // Actually, let's keep it open for manual selection but allow fast selection via presets if they were available.
  };

  const hourOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')), []);
  const periodOptions = ['AM', 'PM'];

  const matchedPreset = presets.find(p => p.value === value);

  // Trigger field
  const defaultTrigger = (
    <button
      type="button"
      ref={triggerRef}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          if (!isOpen && !isInline) updateCoords();
          setIsOpen(!isOpen);
        }
      }}
      className={`w-full flex items-center justify-between transition-all duration-300 ease-out outline-none rounded-xl px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden focus:outline-none focus:ring-0 ${variant === 'metallic'
        ? 'bg-black/40 border-none font-bold shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] focus:bg-black/60'
        : variant === 'recessed'
          ? 'bg-black/40 border border-white/[0.05] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] focus:border-white/[0.08] focus:bg-black/50'
          : `bg-surface-input border-2 focus:border-brand-primary ${error ? 'border-brand-error' : isOpen ? 'border-brand-primary' : 'border-surface-border'}`
        }`}
    >
      {(variant === 'metallic' || variant === 'recessed') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {/* Inner Top Shadow for carved-in look */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent" />
          {/* Subtle Diagonal Machined Sheen */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30" />
          {/* Bottom Rim Light (For depth) */}
          {variant === 'metallic' && (
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.06] shadow-[0_-1px_2px_rgba(255,255,255,0.05)]" />
          )}
        </div>
      )}
      <div className="flex items-center gap-2 overflow-hidden">
        <span className={`text-sm tracking-tight ${!value ? 'text-gray-600' : 'text-gray-300 font-bold'}`}>
          {displayValue || placeholder}
        </span>
        {matchedPreset && (
          <span className="text-[10px] font-bold bg-white/[0.05] text-gray-500 px-1.5 py-0.5 rounded border border-white/5 uppercase tracking-tighter">
            {matchedPreset.suffix}
          </span>
        )}
      </div>
    </button>
  );

  const panel = (
    <div
      ref={menuRef}
      className={`
        ${isInline ? 'mt-2 border border-surface-border' : `fixed z-[99999] shadow-2xl border border-surface-border animate-in fade-in duration-150 ${popoverState.placement === 'bottom' ? 'origin-top' : 'origin-bottom -translate-y-full'}`} 
        w-[280px] bg-surface-card rounded-2xl overflow-hidden p-2 flex flex-col
      `}
      style={!isInline ? {
        top: `${popoverState.top}px`,
        left: `${popoverState.left}px`,
      } : {}}
    >
      <div className="flex gap-1 h-56">
        {/* Hours Column (12h) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-border pr-1">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] p-2 sticky top-0 bg-surface-card z-10 text-center">Hrs</p>
          <div className="space-y-0.5" >
            {hourOptions.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => handleSelect(h)}
                className={`w-full text-center py-2 rounded-lg text-xs font-bold transition-all outline-none focus:ring-0 ring-0 relative overflow-hidden ${displayHour === h
                  ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_-2px_rgba(255,77,45,0.4)]'
                  : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'
                  }`}
              >
                {displayHour === h && (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
                )}
                <span className="relative z-10">{h}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Minutes Column */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-border px-1 border-l border-white/[0.03]">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] p-2 sticky top-0 bg-surface-card z-10 text-center">Min</p>
          <div className="space-y-0.5">
            {minuteOptions.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => handleSelect(undefined, m)}
                className={`w-full text-center py-2 rounded-lg text-xs font-bold transition-all outline-none focus:ring-0 ring-0 relative overflow-hidden ${minutes === m
                  ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_-2px_rgba(255,77,45,0.4)]'
                  : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'
                  }`}
              >
                {minutes === m && (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
                )}
                <span className="relative z-10">{m}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AM/PM Column */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-border pl-1 border-l border-white/[0.03]">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] p-2 sticky top-0 bg-surface-card z-10 text-center">Mod</p>
          <div className="space-y-0.5">
            {periodOptions.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelect(undefined, undefined, p)}
                className={`w-full text-center py-2 rounded-lg text-xs font-bold transition-all outline-none focus:ring-0 ring-0 relative overflow-hidden ${period === p
                  ? 'bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_-2px_rgba(255,77,45,0.4)]'
                  : 'text-gray-500 hover:bg-white/[0.05] hover:text-white'
                  }`}
              >
                {period === p && (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
                )}
                <span className="relative z-10">{p}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isInline && (
        <div className="mt-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="w-full py-2.5 bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white text-[11px] font-bold rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_16px_-4px_rgba(255,77,45,0.4)] transition-all hover:brightness-[1.05] active:brightness-[0.95] active:scale-[0.98] uppercase tracking-widest relative overflow-hidden outline-none focus:ring-0 ring-0"
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50" />
            <span className="relative z-10">{applyLabel}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col gap-2 w-full relative ${className}`} ref={containerRef}>
      {label && <label className="text-sm font-medium text-gray-500 ml-1">{label}</label>}
      {!isInline && (
        children ? (
          <div
            ref={childrenRef}
            onClick={() => {
              if (!disabled) {
                if (!isOpen) updateCoords();
                setIsOpen(!isOpen);
              }
            }}
            className="cursor-pointer"
          >
            {children}
          </div>
        ) : (
          defaultTrigger
        )
      )}
      {isInline && isOpen && panel}
      {!isInline && isOpen && popoverState.isReady && createPortal(panel, document.body)}
      {error && <span className="text-xs ml-1 text-brand-error">{error}</span>}
    </div>
  );
};