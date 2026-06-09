import { Link } from 'react-router-dom';

const Logo = ({ size = 'md', className = '', onNavigate }) => {
  const BRAND_YELLOW = '#FACC15';
  const sizes = {
    sm: { box: 'w-7 h-7', text: 'text-[12px]', font: 'text-sm' },
    md: { box: 'w-9 h-9', text: 'text-[15px]', font: 'text-xl' },
    lg: { box: 'w-12 h-12', text: 'text-[20px]', font: 'text-2xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <Link 
      to="/" 
      className={`flex items-center gap-2.5 group/logo w-fit mx-auto ${className}`}
    >
      <div 
        className={`${s.box} rounded-xl bg-nc-pro flex items-center justify-center shadow-lg shadow-[#FACC15]/20 transition-transform group-hover/logo:scale-110`}
        style={{ backgroundColor: BRAND_YELLOW }}
      >
        <span className={`${s.text} text-black font-black leading-none`}>NC</span>
      </div>
      <span className={`${s.font} font-bold text-white tracking-wide`}>Network</span>
    </Link>
  );
};

export default Logo;
