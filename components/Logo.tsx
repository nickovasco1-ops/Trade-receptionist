import React, { useState } from 'react';
import { PhoneCall } from 'lucide-react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "h-10", variant = 'color' }) => {
  // --- ROBUST PATH STRATEGY ---
  const getCandidates = () => {
    const candidates: string[] = [];
    
    // 1. PRIMARY: Try resolving 'logo.png' relative to THIS file (components/Logo.tsx)
    // This tells Vite to bundle the file if it exists in the same folder.
    try {
      const localAsset = new URL('./logo.png', import.meta.url).href;
      candidates.push(localAsset);
    } catch (e) {
      // Ignore
    }

    // 2. ROOT FALLBACK: Try resolving from project root (../logo.png)
    try {
      const rootAsset = new URL('../logo.png', import.meta.url).href;
      candidates.push(rootAsset);
    } catch (e) {
      // Ignore
    }

    // 3. PUBLIC FOLDER: Standard Vite Base URL
    const viteBase = (import.meta as any).env?.BASE_URL;
    if (viteBase && typeof viteBase === 'string') {
      const prefix = viteBase.endsWith('/') ? viteBase : `${viteBase}/`;
      candidates.push(`${prefix}logo.png`);
    }

    // 4. ABSOLUTE: Final fallback
    candidates.push('/logo.png');

    return candidates;
  };

  const [candidates] = useState<string[]>(getCandidates());
  const [srcIndex, setSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    const nextIndex = srcIndex + 1;
    if (nextIndex < candidates.length) {
      setSrcIndex(nextIndex);
    } else {
      setHasError(true);
    }
  };

  // --- FALLBACK SVG RENDER ---
  if (hasError) {
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

  // --- PRIMARY IMAGE RENDER ---
  return (
    <img 
      src={candidates[srcIndex]} 
      alt="Trade Receptionist Logo" 
      className={`${className} w-auto object-contain transition-opacity duration-300`}
      onError={handleError}
      style={{ minHeight: '32px', minWidth: '32px', display: 'block' }}
    />
  );
};