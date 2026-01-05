import React, { useState } from 'react';
import { PhoneCall } from 'lucide-react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "h-10", variant = 'color' }) => {
  const [imgError, setImgError] = useState(false);

  // Fallback SVG Logo (Used if logo.png is missing)
  if (imgError) {
    const textColor = variant === 'white' ? 'text-white' : 'text-slate-900';
    const highlightColor = variant === 'white' ? 'text-brand-300' : 'text-brand-600';
    const iconBg = variant === 'white' ? 'bg-white/10' : 'bg-brand-600';

    return (
      <div className={`flex items-center gap-2 font-bold text-xl tracking-tight select-none ${textColor} ${className}`}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBg} shadow-sm flex-shrink-0`}>
          <PhoneCall className="w-4 h-4 text-white" />
        </div>
        <span>Trade<span className={highlightColor}>Receptionist</span></span>
      </div>
    );
  }

  // Primary Image Logo
  // We use /logo.png as a root relative path which works in standard web servers
  return (
    <img 
      src="/logo.png" 
      alt="Trade Receptionist" 
      className={`${className} w-auto object-contain`}
      onError={() => setImgError(true)}
    />
  );
};