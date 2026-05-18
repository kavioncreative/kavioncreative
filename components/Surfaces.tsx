import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconCheckCircle } from './Icons';
import Button from './Button';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  isElevated?: boolean;
  disableHover?: boolean;
  bodyClassName?: string;
}
export const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '', onClick, hoverable, isElevated, disableHover, bodyClassName = '' }) => {
  const hasPadding = className.includes('p-') || className.includes('px-') || className.includes('py-');

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      className={`relative bg-surface-card rounded-2xl border border-surface-border transition-all duration-300 ease-out overflow-hidden w-full ${!hasPadding ? 'p-6' : ''} ${isElevated
        ? 'bg-white/[0.03] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)]'
        : 'shadow-nova'
        } ${onClick || hoverable
          ? `cursor-pointer ${!disableHover ? 'hover:border-white/30 hover:bg-white/[0.03] hover:shadow-xl hover:shadow-black/40' : ''}`
          : ''
        } ${className}`}
    >
      {isElevated && (
        <>
          {/* Diagonal Metallic Shine Effect - Temporarily disabled to fix rendering artifacts */}
          {/* <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none" /> */}

          {/* Center-weighted Shadow Depth Falloff - Temporarily disabled to fix rendering artifacts */}
          {/* <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none -z-10">
            <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
          </div> */}
        </>
      )}

      {(title || subtitle) && (
        <div className="mb-4 relative z-10">
          {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      )}
      <div className={`relative z-10 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  hideHeader?: boolean;
  isElevatedFooter?: boolean;
  isElevatedHeader?: boolean;
  closeOnOutsideClick?: boolean;
  noBodyPadding?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  hideHeader = false,
  isElevatedFooter = false,
  isElevatedHeader = false,
  closeOnOutsideClick = true,
  noBodyPadding = false
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-lg',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] w-full',
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={closeOnOutsideClick ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className={`relative bg-surface-bg border border-surface-border rounded-3xl w-full ${sizeClasses[size]} shadow-2xl animate-in fade-in zoom-in duration-300 transition-all duration-500 ease-out flex flex-col overflow-hidden max-h-[90vh]`}>

        {/* Header - Sticky with enhanced desktop spacing */}
        {!hideHeader && (
          <div className={`flex items-center justify-between px-8 py-6 lg:px-10 lg:py-8 border-b border-white/[0.05] relative overflow-hidden shrink-0 ${isElevatedHeader ? 'bg-white/[0.03] rounded-t-3xl' : 'bg-white/[0.02] rounded-t-3xl'}`}>
            {isElevatedHeader && (
              <>
                {/* Full Surface Metallic Shine */}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                {/* Center-weighted Shadow Depth Falloff */}
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] -z-10 pointer-events-none">
                  <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                </div>
              </>
            )}
            <h2 className="relative z-10 text-xl font-bold text-white tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="relative z-10 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body - Scrollable with enhanced desktop breathing room */}
        <div className={`overflow-y-auto scrollbar-thin scrollbar-thumb-surface-border scrollbar-track-transparent flex flex-col justify-start ${noBodyPadding ? '' : 'px-6 py-6 lg:px-10 lg:py-8'}`}>
          {children}
        </div>

        {/* Footer - Sticky with consistent desktop spacing */}
        {footer && (
          <div className={`px-8 py-6 lg:px-10 lg:py-8 border-t border-white/[0.05] relative overflow-hidden shrink-0 ${isElevatedFooter ? 'bg-white/[0.03] rounded-b-3xl' : 'bg-white/[0.02] rounded-b-3xl'}`}>
            {isElevatedFooter && (
              <>
                {/* Full Surface Metallic Shine */}
                <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none" />

                {/* Center-weighted Shadow Depth Falloff */}
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] -z-10 pointer-events-none">
                  <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
                </div>
              </>
            )}
            <div className="relative z-10">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  primaryAction,
  secondaryAction
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm" hideHeader>
      <div className="flex flex-col items-center text-center py-6 lg:py-10">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-brand-success/10 flex items-center justify-center text-brand-success">
            <IconCheckCircle size={48} strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-full border border-brand-success/20 animate-ping opacity-30" />
        </div>

        <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3">
          {title}
        </h3>
        <p className="text-gray-400 text-sm lg:text-base mb-10 max-w-sm leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col w-full gap-3">
          <Button
            variant="metallic"
            onClick={primaryAction.onClick}
            className="w-full py-4 text-base font-bold"
          >
            {primaryAction.label}
          </Button>
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              className="w-full text-gray-500 hover:text-white"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactNode; className?: string; hideArrow?: boolean }> = ({ content, children, className = '', hideArrow = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width
      });
    }
  };

  return (
    <div
      className="relative inline-block"
      ref={triggerRef}
      onMouseEnter={() => {
        updateCoords();
        setIsVisible(true);
      }}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && createPortal(
        <div
          className={`fixed z-[99999] px-4 py-3 bg-surface-overlay border border-white/10 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-300 min-w-max ${className}`}
          style={{
            top: `${coords.top - 12}px`,
            left: `${coords.left + coords.width / 2}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="relative z-10">
            {content}
          </div>
          {/* Enhanced Layered Arrow */}
          {!hideArrow && (
            <>
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[10px] border-transparent border-t-white/10"
              />
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-[10px] border-transparent border-t-surface-overlay"
              />
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

interface ElevatedMetallicCardProps {
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  title?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const ElevatedMetallicCard: React.FC<ElevatedMetallicCardProps> = ({ children, title, className = '', headerClassName = '', bodyClassName = '', onClick }) => {
  return (
    <div onClick={onClick} className={`relative w-full rounded-2xl border border-surface-border bg-surface-card overflow-hidden group shadow-lg flex flex-col ${className}`}>

      {/* Global Diagonal Sheen (Metallic effect) */}
      <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.02)_0%,transparent_40%,rgba(255,255,255,0.01)_100%)] pointer-events-none z-10" />


      {/* 5. Header (Optional) */}
      {title && (
        <div className={`relative z-20 w-full flex-none flex items-center justify-between border-b border-surface-border bg-white/[0.01] p-4 overflow-hidden ${headerClassName}`}>
          {/* Full Surface Metallic Shine */}
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1)_0%,transparent_70%)] pointer-events-none" />

          {/* Center-weighted Shadow Depth Falloff */}
          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none -z-10">
            <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
          </div>

          {/* Content Wrapper to ensure z-index above effects */}
          <div className="relative z-10 w-full flex items-center justify-between">
            {/* Ensure text styling is flexible if title is a node */}
            {typeof title === 'string' ? (
              <h3 className="text-sm font-bold text-brand-primary uppercase tracking-wider">{title}</h3>
            ) : (
              title
            )}
          </div>
        </div>
      )}

      {/* 6. Body */}
      <div className={`relative z-20 flex-1 flex flex-col ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};