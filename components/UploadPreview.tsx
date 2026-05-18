
import React from 'react';
import { UploadPreviewProps } from '../types';
import { IconPlus, IconEye, IconRefreshCw, IconTrash, IconAlertTriangle } from './Icons';

export const UploadPreview: React.FC<UploadPreviewProps> = ({
  status = 'idle',
  progress = 0,
  imageSrc,
  variant = 'rectangular',
  fileName,
  fileSize,
  errorMessage,
  onRemove,
  onReplace,
  onView,
  onUpload,
  className = '',
}) => {
  const isCircular = variant === 'circular';
  const isRecessed = variant === 'recessed';

  const containerBase = `group relative w-full ${isCircular
    ? 'aspect-square rounded-full max-w-[160px] mx-auto shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]'
    : isRecessed
      ? 'aspect-[2.5/1] rounded-2xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)]'
      : 'aspect-[1.586/1] rounded-3xl'
    } ${isRecessed ? 'border' : 'border-none'} overflow-hidden transition-all duration-300 ease-out`;

  const stateStyles = {
    idle: isRecessed
      ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 cursor-pointer"
      : `bg-black/40 ${isCircular ? 'border-dashed' : 'border-none'} border-surface-border hover:bg-black/60 cursor-pointer`,
    uploading: "bg-surface-overlay border-surface-border cursor-wait",
    success: `bg-black/40 ${isCircular ? 'border-none' : 'border-none'} border-surface-border hover:border-white/20`,
    error: "bg-surface-card border-brand-error/20",
  };

  return (
    <div
      className={`${containerBase} ${stateStyles[status]} ${className}`}
      onClick={(status === 'idle' || status === 'error') ? onUpload : undefined}
    >
      {/* Recessed Effect Overlays for Circular and Rectangular variants */}
      {(isCircular || (!isCircular && !isRecessed)) && (
        <div className={`absolute inset-0 pointer-events-none z-10 ${isCircular ? 'rounded-full' : 'rounded-3xl'} overflow-hidden`}>
          {/* Inner Top Shadow for depth */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-black/60 to-transparent opacity-60" />
          {/* Subtle Diagonal Machined Sheen */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_48%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.02)_52%,transparent_100%)] opacity-30" />
          {/* Inner Inset Shadow */}
          <div className={`absolute inset-0 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] ${isCircular ? 'rounded-full' : 'rounded-3xl'}`} />
        </div>
      )}

      {/* Recessed Effect Overlays for Recessed Variant */}
      {isRecessed && (
        <>
          {/* Top Edge Highlight for Elevation */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />
          {/* Diagonal Metallic Shine Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none opacity-40 z-10" />
          {/* Center-weighted Shadow Depth Falloff */}
          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.9)] opacity-70 pointer-events-none z-0" />
        </>
      )}

      {/* Background/Placeholder State */}
      <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-3">
        {imageSrc && status !== 'error' ? (
          <img
            src={imageSrc}
            alt="" // Remove 'Preview' text to prevent broken image look
            className={`w-full h-full object-cover transition-all duration-700 ${status === 'uploading' ? 'opacity-40 blur-[2px]' : ''}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : status === 'success' ? (
          <div className="flex flex-col items-center justify-center p-4 text-brand-primary">
            <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {fileName && <p className="text-[10px] font-medium text-white/80 max-w-[90%] truncate px-2">{fileName}</p>}
            {fileSize && <p className="text-[9px] text-gray-500 uppercase tracking-wider">{fileSize}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-500 z-20">
            <div className={`p-4 ${isCircular ? 'rounded-full' : 'rounded-2xl'} ${isRecessed ? 'bg-white/[0.05] border-white/10 text-gray-400 group-hover:text-brand-primary group-hover:border-brand-primary/30 shadow-lg' : 'bg-black/20 border-white/[0.05]'} border transition-all duration-300`}>
              <IconPlus size={isCircular ? 24 : 32} />
            </div>
            {!isCircular && status === 'idle' && (
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">Upload Asset</p>
                <p className="text-xs text-gray-500">Any file format up to 500MB</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Uploading Spinner Overlay */}
      {status === 'uploading' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* Success Actions Overlay */}
      {status === 'success' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2">
          <div className={`flex ${isCircular ? 'flex-col gap-2' : 'items-center justify-between w-full p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0'}`}>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onReplace?.(); }}
                className={`${isCircular ? 'p-2' : 'p-2.5'} bg-white/10 hover:bg-brand-primary border border-white/10 rounded-xl text-white transition-all shadow-xl backdrop-blur-md`}
              >
                <IconRefreshCw size={isCircular ? 14 : 18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                className={`${isCircular ? 'p-2' : 'p-2.5'} bg-white/10 hover:bg-brand-error border border-white/10 rounded-xl text-white transition-all shadow-xl backdrop-blur-md`}
              >
                <IconTrash size={isCircular ? 14 : 18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 bg-surface-bg/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="p-2 rounded-full bg-brand-error/20 text-brand-error mb-2 border border-brand-error/20 shadow-inner">
            <IconAlertTriangle size={isCircular ? 20 : 28} />
          </div>
          {!isCircular && (
            <p className="text-[10px] text-brand-error font-bold uppercase mb-4 tracking-wider">Upload Failed</p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onReplace?.(); }}
            className="px-4 py-2 bg-brand-error text-white rounded-xl text-[10px] font-bold hover:brightness-110 transition-all shadow-lg shadow-brand-error/20"
          >
            {isCircular ? <IconRefreshCw size={14} /> : 'Try Again'}
          </button>
        </div>
      )}
    </div>
  );
};
