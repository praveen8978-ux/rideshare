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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        className={`
          w-full rounded-xl border bg-white text-gray-900 placeholder-gray-400
          py-2.5 pr-4 text-sm input-ring
          ${icon ? 'pl-10' : 'pl-4'}
          ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-200'}
          ${className}
        `}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
    {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
    {hint && !error && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
  </div>
);