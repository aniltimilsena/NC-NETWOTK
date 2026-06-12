import React, { useState, useEffect } from 'react';
import { getAvatar, DEFAULT_AVATAR } from '../../utils/avatars';

interface AvatarProps {
  user?: {
    photoURL?: string;
    profileImage?: string;
    image?: string;
    gender?: string;
    displayName?: string;
    name?: string;
  } | null;
  src?: string;
  gender?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | string;
  verified?: boolean;
  className?: string;
}

export default function Avatar({ 
  user,
  src: manualSrc, 
  gender: manualGender,
  name, 
  size = 'md', 
  verified = false, 
  className = '' 
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const initialSrc = manualSrc || (user ? (user.photoURL || user.profileImage || user.image) : null);
  const resolvedGender = manualGender || user?.gender;
  
  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
  }, [initialSrc, resolvedGender]);
  
  const sizes: Record<string, string> = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
    xl: 'w-32 h-32 text-3xl',
    '2xl': 'w-48 h-48 sm:w-64 sm:h-64 text-6xl',
  };

  const fallbackAvatar = getAvatar(null, resolvedGender);
  const currentSrc = imageError ? null : (initialSrc || fallbackAvatar);
  
  // Generate initials from name
  const getInitials = () => {
    const displayName = name || user?.displayName || user?.name || '';
    if (!displayName) return '?';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || '?';
  };

  // Determine gradient based on gender
  const getGradient = () => {
    const g = resolvedGender?.toLowerCase();
    if (g === 'female' || g === 'f') return 'from-pink-500/80 to-purple-600/80';
    if (g === 'male' || g === 'm') return 'from-blue-500/80 to-cyan-600/80';
    return 'from-sky-500/80 to-indigo-600/80';
  };

  const sizeClass = sizes[size] || sizes.md;

  return (
    <div className={`relative flex-shrink-0 rounded-full overflow-hidden border-2 border-nc-accent/20 group-hover/avatar:border-nc-accent transition-all duration-500 bg-nc-card flex items-center justify-center ${sizeClass} ${className}`}>
      {currentSrc ? (
        <img 
          src={currentSrc} 
          alt={name || 'User avatar'} 
          onError={(e) => {
            if (!imageError) {
              const genderFallback = getAvatar(null, resolvedGender);
              if (e.currentTarget.src !== genderFallback && genderFallback !== DEFAULT_AVATAR) {
                e.currentTarget.src = genderFallback;
              } else {
                setImageError(true);
              }
            }
          }}
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradient()}`}>
          <span className="font-black text-white drop-shadow-sm select-none" style={{ fontSize: 'inherit' }}>
            {getInitials()}
          </span>
        </div>
      )}
      
      {verified && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-nc-blue rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg ring-2 ring-nc-dark">
          ✓
        </div>
      )}
    </div>
  );
}
