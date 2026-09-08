import React from 'react';
import { Link } from 'react-router-dom';
export const LogoIcon = ({ className = 'w-12 h-12' }) => (
  <picture className="inline-block shrink-0">
    <source srcSet="/logo.webp" type="image/webp" />
    <img
      src="/logo.png"
      alt="NepalCasts Logo"
      loading="eager"
      decoding="async"
      className={`${className} object-contain`}
    />
  </picture>
);
const Logo = ({ size = 'md', className = '', showText = true }) => {
    const sizes = {
        sm: { box: 'w-10 h-10', font: 'text-sm' },
        md: { box: 'w-14 h-14', font: 'text-xl' },
        lg: { box: 'w-20 h-20', font: 'text-2xl' },
    };
    const s = sizes[size] || sizes.md;
    return (<Link to="/" className={`flex items-center ${showText ? 'gap-2.5' : ''} group/logo w-fit mx-auto ${className}`}>
      <LogoIcon className={`${s.box} transition-transform group-hover/logo:scale-110`}/>
      {showText && (<span className={`${s.font} font-black text-white tracking-wider group-hover/logo:text-[#522C69] transition-colors`}>
          NepalCasts
        </span>)}
    </Link>);
};
export default Logo;
