'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideClose?: boolean;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, size = 'md', hideClose,
}) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass rounded-3xl shadow-glass-lg w-full ${sizes[size]} scale-in overflow-hidden`}>
        {(title || !hideClose) && (
          <div className="flex items-center justify-between p-5 border-b border-mist-100">
            {title && <h2 className="font-display font-semibold text-ink-900 text-lg tracking-tight">{title}</h2>}
            {!hideClose && (
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-mist-100 text-mist-400 hover:text-ink-700 transition-colors ml-auto">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};