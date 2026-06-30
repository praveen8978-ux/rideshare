import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label, error, hint, icon, rightElement, className = '', ...props
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-[13px] font-medium text-ink-700 mb-1.5 tracking-tight">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mist-400">
          {icon}
        </div>
      )}
      <input
        className={`
          w-full rounded-2xl border bg-white/70 backdrop-blur-sm text-ink-900 placeholder-mist-400
          py-3 pr-4 text-[15px] input-ring
          ${icon ? 'pl-11' : 'pl-4'}
          ${error ? 'border-danger-400 focus:ring-danger-200' : 'border-mist-200'}
          ${className}
        `}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
    {error && <p className="mt-1.5 text-xs text-danger-500 flex items-center gap-1">⚠ {error}</p>}
    {hint && !error && <p className="mt-1.5 text-xs text-mist-500">{hint}</p>}
  </div>
);