import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export interface BackButtonProps {
  onClick?: () => void;
  to?: string;
  fallbackTo?: string;
  className?: string;
  ariaLabel?: string;
  iconClassName?: string;
}

export default function BackButton({
  onClick,
  to,
  fallbackTo = '/',
  className = '',
  ariaLabel = 'Back',
  iconClassName = 'w-6 h-6',
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer active:scale-95 shrink-0 ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <ChevronLeft className={iconClassName} strokeWidth={2.2} />
    </button>
  );
}
