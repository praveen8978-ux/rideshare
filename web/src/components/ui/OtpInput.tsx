'use client';
import React, { useRef, useState } from 'react';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({ length = 6, onComplete, disabled }) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...values];
    next[i] = val.slice(-1);
    setValues(next);
    if (val && i < length - 1) inputs.current[i + 1]?.focus();
    if (next.every(v => v) && next.join('').length === length) onComplete(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !values[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length === length) {
      setValues(pasted.split(''));
      onComplete(pasted);
      inputs.current[length - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`
            w-12 h-13 text-center text-xl font-display font-semibold rounded-2xl border-2
            transition-all duration-200 outline-none font-mono
            ${v ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-mist-200 bg-white text-ink-900'}
            focus:border-violet-500 focus:ring-4 focus:ring-violet-100
            disabled:opacity-50
          `}
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
};