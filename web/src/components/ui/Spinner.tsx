import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  fullScreen?: boolean;
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'text-violet-500', fullScreen }) => {
  const spinner = (
    <svg className={`animate-spin ${sizes[size]} ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-mist-50/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-sm text-mist-500 font-medium tracking-tight">Loading...</p>
        </div>
      </div>
    );
  }
  return spinner;
};