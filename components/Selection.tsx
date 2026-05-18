
import React from 'react';

interface SelectionProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'metallic' | 'recessed';
}

export const Checkbox: React.FC<SelectionProps> = ({ label, checked, onChange, onClick, disabled, variant = 'primary', className = '' }) => {
  const isMetallic = variant === 'metallic';

  return (
    <label
      onClick={onClick}
      className={`flex items-center gap-3 cursor-pointer select-none group relative transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isMetallic
        ? `p-5 border rounded-2xl overflow-hidden ${checked
          ? 'bg-white/[0.08] border-brand-primary shadow-[0_8px_24px_-4px_rgba(255,77,45,0.25)]'
          : 'bg-white/[0.03] border-white/10 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] hover:bg-white/[0.06] hover:border-white/20'
        }`
        : ''
        } ${className}`}>

      {isMetallic && (
        <>
          {/* Top Edge Highlight for Elevation */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          {/* Diagonal Metallic Shine Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] pointer-events-none opacity-40" />
          {/* Center-weighted Shadow Depth Falloff */}
          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-4 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none" />
        </>
      )}

      <div className="relative z-10 font-bold shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
        />
        <div className={`w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center relative overflow-hidden ${variant === 'recessed'
          ? checked
            ? 'bg-brand-primary border-brand-primary shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_12px_rgba(255,77,45,0.4)]'
            : 'bg-black/40 border-white/[0.05] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]'
          : checked
            ? 'bg-brand-primary border-brand-primary shadow-[0_0_12px_rgba(255,77,45,0.4)]'
            : 'bg-black/20 border-white/10 group-hover:border-white/30'
          }`}>
          {variant === 'recessed' && !checked && (
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          )}
          {checked && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-in zoom-in-50 duration-200" />}
        </div>
      </div>
      {label && (
        <span className={`text-[15px] transition-colors duration-300 relative z-10 ${isMetallic ? 'font-bold tracking-tight' : 'font-medium'} ${checked ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
          {label}
        </span>
      )}
    </label>
  );
};

export const Radio: React.FC<SelectionProps & { name?: string }> = ({ label, checked, onChange, onClick, disabled, name, variant = 'primary', className = '' }) => {
  const isMetallic = variant === 'metallic';

  return (
    <label
      onClick={onClick}
      className={`flex items-center gap-4 cursor-pointer select-none group relative transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isMetallic
        ? `p-5 border rounded-2xl overflow-hidden ${checked
          ? 'bg-white/[0.08] border-brand-primary shadow-[0_8px_24px_-4px_rgba(255,77,45,0.25)]'
          : 'bg-white/[0.03] border-white/10 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)] hover:bg-white/[0.06] hover:border-white/20'
        }`
        : ''
        } ${className}`}>

      {isMetallic && (
        <>
          {/* Top Edge Highlight for Elevation */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          {/* Diagonal Metallic Shine Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] pointer-events-none opacity-40" />
          {/* Center-weighted Shadow Depth Falloff */}
          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-4 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none" />
        </>
      )}

      <div className="relative z-10 shrink-0">
        <input
          type="radio"
          name={name}
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
        />
        <div className={`w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center relative overflow-hidden ${variant === 'recessed'
          ? checked
            ? 'bg-brand-primary border-brand-primary shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_12px_rgba(255,77,45,0.4)]'
            : 'bg-black/40 border-white/[0.05] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]'
          : checked
            ? 'bg-brand-primary border-brand-primary shadow-[0_0_12px_rgba(255,77,45,0.3)]'
            : 'bg-black/20 border-white/10 group-hover:border-white/30'
          }`}>
          {variant === 'recessed' && !checked && (
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
          )}
          {checked && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-in zoom-in-50 duration-200" />}
        </div>
      </div>
      {label && (
        <span className={`text-[15px] transition-colors duration-300 relative z-10 ${isMetallic ? 'font-bold tracking-tight' : 'font-medium'} ${checked ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
          {label}
        </span>
      )}
    </label>
  );
};

export const Switch: React.FC<SelectionProps> = ({ label, checked, onChange, onClick, disabled, variant = 'primary', className = '' }) => {
  const isMetallic = variant === 'metallic';

  if (isMetallic) {
    return (
      <label
        onClick={onClick}
        className={`flex items-center gap-3 cursor-pointer select-none group/switch-label ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="relative group/switch">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={(e) => !disabled && onChange?.(e.target.checked)}
          />

          {/* Machined Matte Bezel - Wide Pillar Aspect */}
          <div className={`
            w-16 h-8 rounded-full p-[1.5px] transition-all duration-500 relative
            bg-gradient-to-b from-[#666] via-[#333] to-[#222]
            shadow-[0_2px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)]
          `}>
            {/* Deep Recessed Track */}
            <div className={`
              w-full h-full rounded-full transition-all duration-500 relative overflow-hidden bg-[#0a0a0a]
              shadow-[inset_0_4px_10px_rgba(0,0,0,1)]
            `}>
              {/* Active Orange Fill - Now using opacity fade to prevent black background leakage during transition */}
              <div className={`
                absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out
                bg-gradient-to-b from-[#FF6B4B] to-[#D9361A]
                ${checked ? 'opacity-100' : 'opacity-0'}
              `} />

              {/* Gunmetal Matte Handle - Elongated Pill with Balanced Gaps */}
              <div className={`
                absolute top-0.5 bottom-0.5 w-9 rounded-full z-10 
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                bg-gradient-to-b from-[#3a3a3a] via-[#222] to-[#1a1a1a]
                shadow-[0_4px_12px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.15)]
                flex items-center justify-end px-2.5
                ${checked ? 'left-[23px]' : 'left-[2px]'}
              `}>
                {/* Integrated LED Indicator - Crisp & Localized */}
                <div className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-500 relative z-20
                  ${checked
                    ? 'bg-[#FF6B4B] shadow-[0_0_8px_rgba(255,107,75,0.8),0_0_2px_rgba(255,255,255,0.4)]'
                    : 'bg-[#333] shadow-[inset_0_1px_0.5px_rgba(0,0,0,0.8)]'}
                `} />
              </div>
            </div>
          </div>
        </div>
        {label && (
          <span className={`text-sm transition-colors duration-300 ${checked ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
            {label}
          </span>
        )}
      </label>
    );
  }

  return (
    <label
      onClick={onClick}
      className={`flex items-center gap-3 cursor-pointer select-none transition-opacity duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="relative group">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => !disabled && onChange?.(e.target.checked)}
        />
        {/* Track */}
        <div className={`
          w-11 h-6 rounded-full transition-all duration-300 border
          ${checked
            ? 'bg-brand-primary border-brand-primary/20 shadow-[0_0_12px_rgba(255,77,45,0.2)]'
            : 'bg-black/40 border-white/10 group-hover:border-white/20'}
        `} />
        {/* Handle */}
        <div className={`
          absolute top-1 w-4 h-4 rounded-full transition-all duration-300 shadow-sm
          ${checked
            ? 'left-[22px] bg-white'
            : 'left-1 bg-gray-400 group-hover:bg-gray-300'}
        `} />
      </div>
      {label && (
        <span className={`text-sm transition-colors duration-300 ${checked ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
          {label}
        </span>
      )}
    </label>
  );
};
