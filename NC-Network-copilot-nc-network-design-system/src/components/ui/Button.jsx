export default function Button({ children, variant = 'primary', size = 'md', className = '', onClick, type = 'button', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-br from-sky-400 to-sky-600 text-black font-bold hover:from-sky-500 hover:to-sky-700 shadow-[0_4px_20px_rgba(56,189,248,0.25)] active:scale-[0.98]',
    secondary: 'bg-nc-surface border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/50',
    ghost: 'text-nc-secondary hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-full transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
