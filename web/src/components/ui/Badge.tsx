import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variants = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-green-50  text-green-700',
  warning: 'bg-amber-50  text-amber-700',
  danger:  'bg-red-50    text-red-600',
  info:    'bg-blue-50   text-blue-700',
  purple:  'bg-primary-50 text-primary-700',
};

const dots = {
  default: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-blue-500',
  purple:  'bg-primary-500',
};

export const Badge: React.FC<BadgeProps> = ({
  label, variant = 'default', size = 'sm', dot,
}) => (
  <span className={`
    inline-flex items-center gap-1.5 font-medium rounded-full
    ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
    ${variants[variant]}
  `}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${dots[variant]}`} />}
    {label}
  </span>
);