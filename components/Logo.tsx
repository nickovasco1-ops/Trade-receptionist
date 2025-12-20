import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'color' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ className = "h-10", variant = 'color' }) => {
  // NOTE: This component now looks for a file named 'logo.png' in your public folder.
  // Ensure you have renamed your image file to 'logo.png' and placed it in the root directory.
  
  return (
    <img 
      src="/logo.png" 
      alt="Trade Receptionist - 24/7 AI Call Answering Service" 
      className={`${className} w-auto object-contain`}
      width="150"
      height="40"
    />
  );
};