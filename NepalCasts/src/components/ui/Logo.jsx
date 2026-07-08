import React from 'react';
import { Link } from 'react-router-dom';

export const LogoIcon = ({ className = 'w-12 h-12' }) => (
  <img 
    src="/logo.png" 
    alt="NC Logo Icon" 
    className={`${className} object-contain`} 
  />
);

const Logo = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: { box: 'w-10 h-10', font: 'text-sm' },
    md: { box: 'w-14 h-14', font: 'text-xl' },
    lg: { box: 'w-20 h-20', font: 'text-2xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <Link 
      to="/" 
      className={`flex items-center gap-2.5 group/logo w-fit mx-auto ${className}`}
    >
      <LogoIcon className={`${s.box} transition-transform group-hover/logo:scale-110`} />
      <span className={`${s.font} font-black text-white tracking-wider group-hover/logo:text-[#D4AF37] transition-colors`}>
        NepalCasts
      </span>
    </Link>
  );
};

export default Logo;
