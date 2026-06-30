import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variants = {
  primary:   'bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-white shadow-violet hover:shadow-violet-lg',
  dark:      'bg-ink-900 hover:bg-ink-800 text-white shadow-glass',
  secondary: 'bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/60',
  outline:   'bg-white/60 backdrop-blur-sm hover:bg-white text-ink-800 border border-mist-300 hover:border-violet-300',
  ghost:     'bg-transparent hover:bg-mist-100 text-mist-600',
  danger:    'bg-danger-500 hover:bg-danger-600 text-white shadow-sm',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-sm gap-1.5 rounded-xl',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3.5 text-[15px] gap-2 rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon,
  fullWidth, children, disabled, className = '', ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`
      inline-flex items-center justify-center font-medium tracking-tight
      transition-all duration-200 focus:outline-none focus:ring-2
      focus:ring-violet-400 focus:ring-offset-2
      disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
      ${variants[variant]} ${sizes[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `}
    {...props}
  >
    {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
    {children}
  </button>
);