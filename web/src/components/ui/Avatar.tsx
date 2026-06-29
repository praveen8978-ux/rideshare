import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}

const sizes = {
  sm: { div: 'w-8 h-8',   text: 'text-xs',  ring: 'w-2 h-2' },
  md: { div: 'w-10 h-10', text: 'text-sm',  ring: 'w-2.5 h-2.5' },
  lg: { div: 'w-12 h-12', text: 'text-base', ring: 'w-3 h-3' },
  xl: { div: 'w-16 h-16', text: 'text-xl',  ring: 'w-3.5 h-3.5' },
};

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', online }) => {
  const s = sizes[size];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="relative inline-block">
      <div className={`${s.div} rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white`}>
        {src ? (
          <Image src={src} alt={name} fill className="object-cover" />
        ) : (
          <span className={`${s.text} font-semibold text-white`}>{initials}</span>
        )}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${s.ring} rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
      )}
    </div>
  );
};