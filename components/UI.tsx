import React, { useRef, useState } from 'react';

// --- Buttons ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - (left + width / 2);
    const y = e.clientY - (top + height / 2);
    // Magnetic strength
    setPosition({ x: x * 0.15, y: y * 0.15 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  // Added tracking-wide for premium feel
  const baseStyles = "inline-flex items-center justify-center rounded-full font-bold tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none relative z-10";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-500/25 border border-transparent",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 border border-transparent",
    outline: "border-2 border-slate-200 bg-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
  };

  const sizes = {
    sm: "h-10 px-5 text-xs uppercase",
    md: "h-12 px-7 text-sm",
    lg: "h-14 px-9 text-base"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

// --- Cards ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 ${className}`}>
    {children}
  </div>
);

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`backdrop-blur-xl bg-white/80 border border-white/50 shadow-xl shadow-brand-900/5 rounded-3xl ${className}`}>
    {children}
  </div>
);

// --- Section Wrapper ---
export const Section: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  id?: string;
  bg?: 'white' | 'gray' | 'gradient';
}> = ({ children, className = '', id, bg = 'white' }) => {
  const bgStyles = {
    white: "bg-white",
    gray: "bg-gray-50",
    gradient: "bg-gradient-to-b from-white to-brand-50/30"
  };

  // Increased padding from py-16/24 to py-20/32 for more polished vertical rhythm
  return (
    <section id={id} className={`py-20 md:py-32 ${bgStyles[bg]} ${className}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {children}
      </div>
    </section>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 mb-6 tracking-wide uppercase border border-brand-100/50">
    {children}
  </span>
);