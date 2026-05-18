import React from 'react';
import { ButtonProps } from '../types';

const baseStyles = 'relative overflow-hidden flex items-center justify-center whitespace-nowrap font-medium transition-[background-color,color,opacity,transform,filter,backdrop-filter] duration-300 ease-out outline-none focus:ring-0 ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed rounded-xl box-border transform-gpu';

const variants = {
  // Primary: Enhanced hover with subtle lift and glow shadow
  primary: 'bg-brand-primary text-white border border-transparent hover:-translate-y-0.5 hover:shadow-[0_12px_20px_-10px_rgba(255,77,45,0.5),0_0_15px_-3px_rgba(255,77,45,0.2)] active:translate-y-0 active:shadow-none',
  // Metallic: Premium orange with gradient, inner highlights, and depth
  metallic: 'relative overflow-hidden bg-gradient-to-b from-[#FF6B4B] to-[#D9361A] text-white border border-[#FF4D2D] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45),inset_0_-1.5px_1.5px_rgba(0,0,0,0.25),0_4px_12px_-2px_rgba(217,54,26,0.35)] hover:brightness-[1.1] hover:-translate-y-0.5 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.55),inset_0_-1.5px_1.5px_rgba(0,0,0,0.3),0_8px_20px_-4px_rgba(217,54,26,0.45)] active:translate-y-0 active:brightness-[0.95] active:shadow-inner active:scale-95',
  // Secondary: Stronger contrast for secondary buttons
  secondary: 'bg-surface-overlay text-white border border-surface-border hover:bg-white/[0.08] hover:border-white/20',
  // Consistently 1px border for outlines
  outline: 'bg-transparent border border-surface-border text-white hover:border-white/40 hover:bg-white/[0.02]',
  // Subtle background shift for ghost buttons
  ghost: 'bg-transparent text-gray-400 border border-transparent hover:text-white hover:bg-white/[0.06]',
  error: 'bg-brand-error text-white border border-transparent hover:brightness-110 hover:shadow-lg hover:shadow-brand-error/20',
  success: 'bg-brand-success text-white border border-transparent hover:brightness-110 hover:shadow-lg hover:shadow-brand-success/20',
  // Recessed: Deep sunken/machined look (Nova Recessed)
  recessed: 'bg-black/40 text-gray-400 border border-white/[0.05] shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)] hover:bg-black/50 hover:text-white transition-all focus:outline-none focus:border-white/[0.05] focus:shadow-[inset_0_2px_12px_rgba(0,0,0,0.6)]',
  // Metallic Error: Premium red variant with same effect
  'metallic-error': 'relative overflow-hidden bg-gradient-to-b from-[#EF4444] to-[#991B1B] text-white border border-[#B91C1C] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)] hover:brightness-[1.1] hover:-translate-y-0.5 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.25)] active:translate-y-0 active:brightness-[0.95] active:shadow-inner',
  // Metallic Dispute: Matches brand-error (#EF4444) precisely
  'metallic-dispute': 'relative overflow-hidden bg-gradient-to-b from-[#EF4444] to-[#CC2D2D] text-white border border-[#EF4444] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1.5px_1.5px_rgba(0,0,0,0.25),0_4px_12px_-2px_rgba(239,68,68,0.35)] hover:brightness-[1.1] hover:-translate-y-0.5 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-1.5px_1.5px_rgba(0,0,0,0.3),0_8px_20px_-4px_rgba(239,68,68,0.45)] active:translate-y-0 active:brightness-[0.95] active:shadow-inner active:scale-95',
  // Metallic ArtHelp: Matches #38bdf8 exactly
  'metallic-arthelp': 'relative overflow-hidden bg-gradient-to-b from-[#38bdf8] to-[#0ea5e9] text-white border border-[#0ea5e9] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1.5px_1.5px_rgba(0,0,0,0.25),0_4px_12px_-2px_rgba(56,189,248,0.35)] hover:brightness-[1.1] hover:-translate-y-0.5 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-1.5px_1.5px_rgba(0,0,0,0.3),0_8px_20px_-4px_rgba(56,189,248,0.45)] active:translate-y-0 active:brightness-[0.95] active:shadow-inner active:scale-95',
  'metallic-success': 'relative overflow-hidden bg-gradient-to-b from-[#4ADE80] to-[#16A34A] text-white border border-[#22C55E] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),inset_0_-1.5px_1.5px_rgba(0,0,0,0.25)] hover:brightness-[1.1] hover:-translate-y-0.5 hover:shadow-[inset_0_1.5px_0_rgba(255,255,255,0.5),inset_0_-1.5px_1.5px_rgba(0,0,0,0.3)] active:translate-y-0 active:brightness-[0.95] active:shadow-inner active:scale-95',
};

const sizes = {
  sm: 'h-[34px] px-3 py-0 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
  xl: 'px-10 py-5 text-lg',
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      style={{
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'subpixel-antialiased',
        ...style
      }}
      {...props}
    >
      {/* Metallic Shine Overlay */}
      {(variant === 'metallic' || variant === 'metallic-error' || variant === 'metallic-dispute' || variant === 'metallic-arthelp' || variant === 'metallic-success') && (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] pointer-events-none opacity-50 z-[1]" />
      )}
      {variant === 'recessed' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {/* Inner Top Shadow for carved-in look */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent" />
          {/* Subtle Diagonal Machined Sheen */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30" />
        </div>
      )}

      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : leftIcon && <span className="mr-2 relative z-10">{leftIcon}</span>}
      <span className="relative z-10">{children}</span>
      {!isLoading && rightIcon && <span className="ml-2 relative z-10">{rightIcon}</span>}
    </button>
  );
};

export default Button;