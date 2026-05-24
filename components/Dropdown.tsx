import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DropdownProps } from '../types';
import { IconSearch } from './Icons';
import { Plus } from 'lucide-react';

export const Dropdown: React.FC<DropdownProps> = ({
  options = [],
  value,
  onChange,
  label,
  placeholder = "Select an option",
  disabled,
  isMulti = false,
  showSearch = false,
  searchPlaceholder = "Search...",
  error,
  className = "",
  size = "md",
  variant = "primary",
  selectionLabel,
  menuClassName = "",
  isCreatable = false,
  onCreate,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, right: 0, width: 0, spaceBelow: 0, spaceTop: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: 'h-10 px-3 py-2 text-sm',
    md: 'h-12 px-4 py-2 text-base',
    lg: 'h-14 px-5 py-3 text-lg',
    none: ''
  };

  // Helper to check if a value is selected
  const isValueSelected = (val: string) => {
    if (isMulti && Array.isArray(value)) {
      return value.includes(val);
    }
    return value === val;
  };

  // Filter options by search query
  const filteredOptions = (options || []).filter(opt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    const label = String(opt.label || "").toLowerCase();
    const desc = String(opt.description || "").toLowerCase();
    return label.includes(query) || desc.includes(query);
  });

  // Partition options for multi-select (using filtered options)
  const selectedOptions = filteredOptions.filter(opt => isValueSelected(opt.value));
  const unselectedOptions = isMulti ? filteredOptions.filter(opt => !isValueSelected(opt.value)) : filteredOptions;

  const hasAnyIcon = useMemo(() => (options || []).some(opt => !!opt.icon), [options]);

  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [horizPlacement, setHorizPlacement] = useState<'left' | 'right'>('left');

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      const spaceBelow = windowHeight - rect.bottom;
      const spaceTop = rect.top;
      const spaceRight = windowWidth - rect.left;

      // Vertical placement
      // Threshold increased to 300px to ensure it flips to top before hitting the bottom
      if (spaceBelow < 300 && spaceTop > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }

      // Horizontal placement: opens left (align right) if not enough space on the right
      // Threshold: 200px or the trigger width, whichever is larger
      if (spaceRight < 200 && rect.right > 200) {
        setHorizPlacement('right');
      } else {
        setHorizPlacement('left');
      }

      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        spaceBelow,
        spaceTop
      });
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
    if (isOpen) setSearchQuery(''); // Clear search when closing
  };

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      let nextValues;
      if (currentValues.includes(optionValue)) {
        nextValues = currentValues.filter(v => v !== optionValue);
      } else {
        nextValues = [...currentValues, optionValue];
      }
      onChange(nextValues);
      // STRICT: Never close for multi-select here
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = dropdownRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      // Portal check: if click is outside both trigger and the floating menu, close it
      if (!isInsideTrigger && !isInsideMenu) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const renderOption = (option: any, isSelected: boolean) => (
    <button
      key={option.value}
      type="button"
      disabled={option.disabled}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleSelect(option.value);
      }}
      className={`w-full flex items-center gap-4 px-3 py-2.5 text-left transition-all duration-200 rounded-lg relative group ${isSelected
        ? 'bg-brand-primary/10 text-brand-primary'
        : option.disabled
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'text-gray-300 hover:bg-white/[0.08] hover:text-white'
        }`}
    >
      {hasAnyIcon && (
        <div className={`shrink-0 w-5 h-5 flex items-center justify-center transition-colors duration-200 ${isSelected ? 'text-brand-primary' : 'text-gray-500 group-hover:text-gray-200'}`}>
          {option.icon}
        </div>
      )}

      <div className="flex items-center justify-between flex-1 gap-4">
        <span className={`font-semibold text-sm transition-colors duration-200 ${option.labelClassName || 'whitespace-nowrap'} ${isSelected ? 'text-brand-primary' : 'text-gray-100 group-hover:text-white'}`}>
          {option.label}
        </span>
        {option.description && (
          <span className={`inline-flex items-center px-3 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider shrink-0 transition-all whitespace-pre-line text-center ${option.descriptionClassName
            ? option.descriptionClassName
            : isSelected
              ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary'
              : 'bg-white/5 border-white/10 text-gray-500 group-hover:bg-white/10 group-hover:border-white/20 group-hover:text-gray-400'
            }`}>
            {option.description}
          </span>
        )}
      </div>

      {isSelected && (
        <svg className="w-5 h-5 ml-2 shrink-0 animate-in zoom-in duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );

  const dropdownMenu = (
    <div
      ref={menuRef}
      className={`fixed z-[99999] bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150 flex flex-col ${placement === 'bottom' ? 'origin-top' : 'origin-bottom'} ${menuClassName}`}
      style={{
        top: placement === 'bottom' ? `${coords.bottom + 8}px` : 'auto',
        bottom: placement === 'top' ? `${window.innerHeight - coords.top + 8}px` : 'auto',
        left: horizPlacement === 'left' ? `${coords.left}px` : 'auto',
        right: horizPlacement === 'right' ? `${window.innerWidth - (coords.right || 0)}px` : 'auto',
        minWidth: menuClassName.includes('w-') ? undefined : variant === 'flat' ? '160px' : `${coords.width}px`,
        width: menuClassName.includes('w-') ? undefined : variant === 'flat' ? 'max-content' : `${coords.width}px`
      }}
    >
      {showSearch && (
        <div className="p-2 border-b border-surface-border flex-shrink-0">
          <div className="relative group">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-input border border-brand-primary/40 transition-all duration-200 outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-primary"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div 
        className="overflow-y-auto py-1.5 px-1.5 space-y-0.5 flex-1
          [&::-webkit-scrollbar]:w-1.5 
          [&::-webkit-scrollbar-track]:bg-transparent 
          [&::-webkit-scrollbar-thumb]:bg-white/10 
          [&::-webkit-scrollbar-thumb]:rounded-full 
          hover:[&::-webkit-scrollbar-thumb]:bg-white/25 
          transition-colors"
        style={{
          maxHeight: `${Math.min(208, Math.max(120, (placement === 'bottom' ? coords.spaceBelow : coords.spaceTop) - (showSearch ? 90 : 54)))}px`
        }}
      >

        {isMulti ? (
          <>
            {selectedOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Selected</div>
                {selectedOptions.map(opt => renderOption(opt, true))}
              </>
            )}

            {selectedOptions.length > 0 && unselectedOptions.length > 0 && (
              <div className="my-1.5 border-t border-surface-border mx-2 opacity-50" />
            )}

            {unselectedOptions.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Available</div>
                {unselectedOptions.map(opt => renderOption(opt, false))}
              </>
            )}

            {filteredOptions.length === 0 && !isCreatable && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                {searchQuery ? 'No results found' : 'No options available'}
              </div>
            )}
            
            {isCreatable && searchQuery && !options.some(o => o.label.toLowerCase() === searchQuery.toLowerCase()) && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all duration-200 rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 mt-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCreate) {
                    onCreate(searchQuery);
                    setSearchQuery("");
                    if (!isMulti) setIsOpen(false);
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs tracking-wider uppercase">Create "{searchQuery}"</span>
              </button>
            )}
          </>
        ) : (
          <>
            {filteredOptions.length === 0 && !isCreatable ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                {searchQuery ? 'No results found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map(opt => renderOption(opt, value === opt.value))
            )}
            
            {isCreatable && searchQuery && !options.some(o => o.label.toLowerCase() === searchQuery.toLowerCase()) && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-all duration-200 rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 mt-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCreate) {
                    onCreate(searchQuery);
                    setSearchQuery("");
                    if (!isMulti) setIsOpen(false);
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs tracking-wider uppercase">Create "{searchQuery}"</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const getTriggerLabel = () => {
    if (isMulti && Array.isArray(value) && value.length > 0) {
      // Find selected options from the original options array to ensure labels are always available
      const currentSelected = options.filter(opt => value.includes(opt.value));
      if (currentSelected.length === 1) return currentSelected[0]?.label || placeholder;
      if (currentSelected.length <= 2) return currentSelected.map(o => o.label).join(', ');
      return `${currentSelected.length} ${selectionLabel || 'items selected'}`;
    }
    const selected = options.find(o => o.value === value);
    return selected ? selected.label : placeholder;
  };

  return (
    <div className={`flex flex-col gap-2 relative ${className.includes('w-fit') ? 'w-fit inline-flex' : 'w-full'} ${className}`} ref={dropdownRef}>
      {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}

      {children ? (
        <div
          ref={triggerRef as any}
          onClick={handleToggle}
          className="w-full cursor-pointer outline-none focus:outline-none"
        >
          {children}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full flex items-center justify-between transition-all duration-300 ease-out outline-none rounded-xl ${sizes[size]} text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border relative overflow-hidden ${variant === 'metallic' || variant === 'recessed'
            ? 'bg-black/40 border-white/[0.05] font-bold shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] focus:bg-black/60 focus:outline-none focus:ring-0 outline-none'
            : variant === 'flat'
              ? 'bg-transparent border-none text-sm focus:bg-white/[0.02] outline-none focus:outline-none focus:ring-0 shadow-none'
              : `bg-surface-input border-2 focus:border-brand-primary outline-none focus:outline-none focus:ring-0 ${error ? 'border-brand-error' : isOpen ? 'border-brand-primary' : 'border-surface-border'}`
            }`}
        >
          {/* Metallic Depth Overlay for Recessed Dropdown */}
          {(variant === 'metallic' || variant === 'recessed') && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Inner Top Shadow for carved-in look */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent" />
              {/* Subtle Diagonal Machined Sheen */}
              <div className={`absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-40`} />
            </div>
          )}
          <div className={`flex items-center ${size === 'sm' ? 'gap-2' : 'gap-3'} overflow-hidden flex-1 mr-2`}>
            {!isMulti && options.find(o => o.value === value)?.icon && <span className="text-brand-primary shrink-0">{options.find(o => o.value === value)?.icon}</span>}
            <div className="flex items-center justify-between flex-1 truncate">
              <span className={`truncate ${(isMulti && (!Array.isArray(value) || value.length === 0)) || (!isMulti && !value) ? 'text-gray-600' : 'text-white'}`}>
                {getTriggerLabel()}
              </span>
              {!isMulti && value && options.find(o => o.value === value)?.description && (
                <span className="text-xs text-gray-500 ml-2 shrink-0">
                  {options.find(o => o.value === value)?.description}
                </span>
              )}
            </div>
          </div>
          <svg
            className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500 transition-transform duration-200 ease-out ${isOpen ? 'rotate-180 text-brand-primary' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && createPortal(dropdownMenu, document.body)}

      {error && <span className="text-xs ml-1 text-brand-error">{error}</span>}
    </div>
  );
};