import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { KebabMenuOption } from '../types';

export const KebabMenu: React.FC<{ options: KebabMenuOption[], className?: string }> = ({ options, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const menuHeight = options.length * 40 + 16; // Approximate height: padding + approx 40px per option
      const spaceBelow = windowHeight - rect.bottom;

      if (spaceBelow < menuHeight && rect.top > spaceBelow) {
        setPlacement('top');
        setMenuPosition({
          top: rect.top - 8,
          left: rect.right - 192,
        });
      } else {
        setPlacement('bottom');
        setMenuPosition({
          top: rect.bottom + 8,
          left: rect.right - 192,
        });
      }
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const menuContent = (
    <div
      ref={menuRef}
      className={`fixed w-48 z-[99999] bg-surface-card border border-surface-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ${placement === 'bottom' ? 'origin-top-right' : 'origin-bottom-right'} px-1.5 py-1.5 space-y-0.5 max-h-[calc(100vh-40px)] overflow-y-auto`}
      style={{
        top: placement === 'bottom' ? `${menuPosition.top}px` : 'auto',
        bottom: placement === 'top' ? `${window.innerHeight - menuPosition.top}px` : 'auto',
        left: `${Math.max(8, menuPosition.left)}px`,
      }}
    >
      {options.map((option, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            if (option.disabled) return;
            option.onClick();
            setIsOpen(false);
          }}
          disabled={option.disabled}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-all duration-200 rounded-lg group ${option.variant === 'danger'
            ? 'text-brand-error hover:bg-brand-error/10'
            : 'text-gray-300 hover:bg-white/[0.08] hover:text-white'
            } ${option.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {option.icon && <span className="shrink-0">{option.icon}</span>}
          <span className="truncate">{option.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="p-2 text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
};
