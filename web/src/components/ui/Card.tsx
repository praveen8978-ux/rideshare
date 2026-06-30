import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glass?: boolean;
}

const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' };

export const Card: React.FC<CardProps> = ({
  children, className = '', hover, onClick, padding = 'md', glass,
}) => (
  <div
    onClick={onClick}
    className={`
      ${glass ? 'glass-card' : 'bg-white border border-mist-100'}
      rounded-3xl
      ${hover ? 'card-hover cursor-pointer' : ''}
      ${paddings[padding]}
      ${className}
    `}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title, subtitle, action,
}) => (
  <div className="flex items-start justify-between mb-4">
    <div>
      <h3 className="font-display font-semibold text-ink-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-sm text-mist-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);