
import React, { useState, useEffect, useCallback } from 'react';
import { ToastItem, ToastType, ToastPosition } from '../types';
import { IconCheck, IconAlertTriangle, IconInfo, IconXCircle } from './Icons';

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start animation almost immediately
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  }, [onClose, toast.id]);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(handleClose, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleClose]);

  return (
    <div
      className={`relative flex items-center gap-4 md:gap-5 pl-4 md:pl-5 pr-3 py-4 md:py-6 min-h-[80px] md:min-h-[100px] min-w-[280px] md:min-w-[400px] max-w-[90vw] md:max-w-lg bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
    >
      {/* Global Diagonal Sheen (Metallic effect) */}
      <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.02)_0%,transparent_40%,rgba(255,255,255,0.01)_100%)] pointer-events-none z-10" />

      {/* Full Surface Metallic Shine */}
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.05)_40%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0.02)_100%)] pointer-events-none opacity-40 z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_70%)] pointer-events-none z-10" />

      {/* Glossy top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none z-20" />

      {/* Icon */}
      <div className={`relative z-20 shrink-0 w-10 md:w-14 h-10 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]`}>
        {toast.type === 'success' && <IconCheck className="text-brand-success w-5 h-5 md:w-7 md:h-7" strokeWidth={3} />}
        {toast.type === 'error' && <IconXCircle className="text-brand-error w-5 h-5 md:w-7 md:h-7" strokeWidth={3} />}
        {toast.type === 'info' && <IconInfo className="text-brand-info w-5 h-5 md:w-7 md:h-7" strokeWidth={3} />}
      </div>

      {/* Content */}
      <div className="relative z-20 flex-1 min-w-0 flex flex-col justify-center py-1">
        <h4 className="text-[15px] md:text-[18px] font-bold text-white tracking-tight leading-tight mb-1 md:mb-2">{toast.title}</h4>
        {toast.message && <p className="text-[12px] md:text-[14px] text-gray-400 font-medium leading-relaxed">{toast.message}</p>}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 md:top-4 md:right-4 z-40 p-1 md:p-2 text-gray-600 hover:text-white transition-all rounded-lg hover:bg-white/5 active:scale-95"
      >
        <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Progress Bar */}
      {toast.duration !== 0 && (
        <div className="absolute left-4 right-4 md:left-5 md:right-5 bottom-2 md:bottom-2.5 h-[2px] bg-white/[0.03] rounded-full overflow-hidden z-20">
          <div
            className={`h-full transition-all linear ${toast.type === 'success' ? 'bg-brand-success' : toast.type === 'error' ? 'bg-brand-error' : 'bg-brand-info'
              } opacity-50 ${isVisible ? 'w-full' : 'w-0'}`}
            style={{ transitionDuration: `${toast.duration || 4000}ms` }}
          />
        </div>
      )}
    </div>
  );
};

export const addToast = (toast: Omit<ToastItem, 'id'>) => {
  // Play default toast sound if not silent
  if (!toast.silent) {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    audio.volume = 0.4;
    audio.play().catch(e => console.warn('Toast sound play failed:', e));
  }

  const event = new CustomEvent('add-toast', {
    detail: { ...toast, id: Math.random().toString(36).substring(2, 9) }
  });
  window.dispatchEvent(event);
};

export const ToastContainer: React.FC<{ position?: ToastPosition }> = ({ position = 'bottom-right' }) => {
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleAdd = (e: any) => {
      const newToast = e.detail;
      setActiveToasts(prev => {
        // Prevent exact duplicates within a short period
        const isDuplicate = prev.some(t => t.title === newToast.title && t.message === newToast.message);
        if (isDuplicate) return prev;
        return [...prev, newToast];
      });
    };

    window.addEventListener('add-toast', handleAdd);
    return () => window.removeEventListener('add-toast', handleAdd);
  }, []);

  const removeToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const positionStyles: Record<ToastPosition, string> = {
    'top-center': 'top-8 left-1/2 -translate-x-1/2 items-center justify-start',
    'bottom-center': 'bottom-8 left-1/2 -translate-x-1/2 items-center justify-end',
    'bottom-right': 'bottom-8 md:right-8 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 items-center md:items-end justify-end',
  };

  return (
    <div
      className={`fixed z-[999999] flex flex-col gap-3 pointer-events-none ${positionStyles[position]}`}
      style={{ zIndex: 999999 }}
    >
      {activeToasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  );
};
