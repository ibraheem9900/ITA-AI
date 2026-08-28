import { useState } from 'react';

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showRing?: boolean;
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm',
  md: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl',
  lg: 'w-24 h-24 text-3xl',
};

const ringMap = {
  xs: '',
  sm: 'ring-2 ring-gray-600 hover:ring-cyan-500/60',
  md: 'ring-4 border-gray-900 shadow-xl shadow-blue-500/20',
  lg: 'ring-4 border-gray-800',
};

export default function Avatar({ src, name, size = 'sm', showRing = true, className = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  
  const sizeClass = sizeMap[size];
  const ringClass = showRing ? ringMap[size] : '';
  
  // Letter fallback when no image or image failed
  if (!src || imgError) {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center font-bold text-white ${ringClass} ${className}`}>
        {name?.charAt(0).toUpperCase() || 'U'}
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={name || 'Avatar'}
      className={`${sizeClass} rounded-full object-cover ${ringClass} ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
