import React from 'react';
import { Link } from 'react-router-dom';

export const LogoIcon = ({ className = 'w-12 h-12' }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00BFFF" />
        <stop offset="50%" stopColor="#8A2BE2" />
        <stop offset="100%" stopColor="#FFD700" />
      </linearGradient>
      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <g filter="url(#neonGlow)">
      {/* Sleek Himalayas outline */}
      <path 
        d="M15 75L42 35L58 58L78 25L92 75H15Z" 
        stroke="url(#logoGlow)" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Floating Golden Sun representing Nepal flag and Spotlight */}
      <circle cx="62" cy="40" r="5" fill="#FFD700" />
      {/* Inner Play Symbol inside the central peak */}
      <path 
        d="M43 50L53 56L43 62V50Z" 
        fill="#00BFFF" 
        stroke="#00BFFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>
  </svg>
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
      <span className={`${s.font} font-black text-white tracking-wider group-hover/logo:text-[#00BFFF] transition-colors`}>
        NepalCasts
      </span>
    </Link>
  );
};

export default Logo;
