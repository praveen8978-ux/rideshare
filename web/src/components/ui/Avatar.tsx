import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}

const sizes = {
  sm: { div: 'w-9 h-9',   text: 'text-xs',   ring: 'w-2 h-2' },
  md: { div: 'w-11 h-11', text: 'text-sm',   ring: 'w-2.5 h-2.5' },
  lg: { div: 'w-13 h-13', text: 'text-base', ring: 'w-3 h-3' },
  xl: { div: 'w-20 h-20', text: 'text-2xl',  ring: 'w-4 h-4' },
};

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', online }) => {
  const s = sizes[size];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="relative inline-block">
      <div className={`${s.div} rounded-2xl overflow-hidden bg-gradient-to-br from-violet-400 to-violet-700 flex items-center justify-center ring-2 ring-white shadow-violet`}>
        {src ? (
          <Image src={src} alt={name} fill className="object-cover" />
        ) : (
          <span className={`${s.text} font-display font-semibold text-white`}>{initials}</span>
        )}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${s.ring} rounded-full border-2 border-white ${online ? 'bg-success-500' : 'bg-mist-300'}`} />
      )}
    </div>
  );
};