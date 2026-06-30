import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variants = {
  default: 'bg-mist-100 text-mist-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger:  'bg-danger-50 text-danger-600',
  info:    'bg-violet-50 text-violet-700',
  violet:  'bg-ink-900 text-violet-200',
};

const dots = {
  default: 'bg-mist-400',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-violet-500',
  violet:  'bg-violet-400',
};

export const Badge: React.FC<BadgeProps> = ({
  label, variant = 'default', size = 'sm', dot,
}) => (
  <span className={`
    inline-flex items-center gap-1.5 font-medium rounded-full tracking-tight
    ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}
    ${variants[variant]}
  `}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${dots[variant]}`} />}
    {label}
  </span>
);