import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "", variant = 'color' }) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  // New Premium Asset URL (Large format)
  const LOGO_URL = "https://image2url.com/r2/bucket2/images/1767744278349-91123512-574d-4fca-8510-c4c3c15cc910.png";

  return (
    <div className={`relative flex items-center ${className}`}>
      <img 
        src={LOGO_URL} 
        alt="Trade Receptionist Logo" 
        // object-contain ensures aspect ratio is preserved.
        // object-left ensures it anchors to the start, maximizing visibility.
        className={`h-full w-full object-contain object-left block transition-opacity duration-500 ${imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        loading="eager" 
        onLoad={() => setImgStatus('loaded')}
        onError={() => setImgStatus('error')}
      />
    </div>
  );
};