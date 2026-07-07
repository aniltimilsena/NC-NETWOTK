import { Link } from 'react-router-dom';

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
      <img 
        src="/logo.png" 
        alt="NepalCasts" 
        className={`${s.box} object-contain rounded-xl transition-transform group-hover/logo:scale-110`}
      />
      <span className={`${s.font} font-bold text-white tracking-wide`}>NepalCasts</span>
    </Link>
  );
};

export default Logo;
