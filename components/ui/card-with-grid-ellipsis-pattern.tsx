import React from 'react';
import { motion } from 'framer-motion';

interface CardWithGridEllipsisPatternProps {
  children: React.ReactNode;
  className?: string;
}

export const GridPatternCard: React.FC<CardWithGridEllipsisPatternProps> = ({ children, className = "" }) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Grid Pattern Layer */}
      <div 
        className="absolute inset-10 bg-grid-pattern bg-repeat bg-[length:40px_40px] opacity-100 pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Gradient Overlay for Fading */}
      <div 
        className="absolute inset-0 bg-gradient-to-tr from-background/70 via-background/30 to-background/10 pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export const GridPatternCardBody: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
};
