import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'color' }) => {
  const [imgError, setImgError] = useState(false);
  const isWhite = variant === 'white';
  
  // Custom brand styles for fallback
  const textColor = isWhite ? 'text-white' : 'text-slate-900';
  const highlightColor = isWhite ? '#ffedd5' : '#ea580c';
  const iconBg = isWhite ? 'rgba(255,255,255,0.2)' : '#ea580c';

  // If the image hasn't failed yet, try to render it.
  // Note: We use a height class (h-10) by default to ensure it fits well in navbars.
  if (!imgError) {
    return (
      <div className={`flex items-center ${className}`}>
        <img 
          src="/logo.png" 
          alt="Trade Receptionist" 
          className="h-10 w-auto object-contain max-w-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback SVG Logo if 'logo.png' is missing or fails to load
  return (
    <div 
      className={`flex items-center gap-2.5 font-sans select-none ${className}`} 
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div 
        className="flex items-center justify-center rounded-xl flex-shrink-0 shadow-sm"
        style={{ 
            backgroundColor: iconBg,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '36px',
            height: '36px',
            minWidth: '36px',
            minHeight: '36px'
        }}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </div>
      
      <span className={`font-extrabold text-xl tracking-tight leading-none ${textColor}`} style={{ whiteSpace: 'nowrap' }}>
        Trade<span style={{ color: highlightColor }}>Receptionist</span>
      </span>
    </div>
  );
};