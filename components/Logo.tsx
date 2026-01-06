import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'color' }) => {
  // Status: 'loading', 'loaded', or 'error'
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const isWhite = variant === 'white';
  
  const textColor = isWhite ? 'text-white' : 'text-slate-900';
  const highlightColor = isWhite ? '#ffedd5' : '#ea580c';
  const iconBg = isWhite ? 'rgba(255,255,255,0.2)' : '#ea580c';

  // The Fallback SVG - Always looks professional
  const FallbackLogo = (
    <div 
      className={`flex items-center gap-2.5 font-sans select-none h-full w-full ${className}`} 
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div 
        className="flex items-center justify-center rounded-xl flex-shrink-0 shadow-sm"
        style={{ 
            backgroundColor: iconBg,
            width: '32px',
            height: '32px',
            minWidth: '32px'
        }}
      >
        <svg 
          width="18" 
          height="18" 
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

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* 
         STRATEGY:
         1. Always attempt to load the image, but keep it HIDDEN (display: none) initially.
         2. If 'onLoad' fires, it means the browser has the data. We switch status to 'loaded'.
         3. If 'onError' fires (404 or bad path), we switch status to 'error'.
         
         Result: The user NEVER sees a broken image icon. They see the Fallback until the split-second the real logo is ready.
      */}
      <img 
        src="/logo.png?v=1" 
        alt="Trade Receptionist" 
        className={`h-full w-auto object-contain transition-opacity duration-300 ${imgStatus === 'loaded' ? 'block opacity-100' : 'hidden opacity-0'}`}
        // 'eager' ensures the browser prioritizes checking this file immediately
        loading="eager" 
        onLoad={() => setImgStatus('loaded')}
        onError={() => setImgStatus('error')}
      />
      
      {/* Show Fallback if we are loading OR if there was an error */}
      {imgStatus !== 'loaded' && FallbackLogo}
    </div>
  );
};