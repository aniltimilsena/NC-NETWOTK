export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick = () => {},
  type = 'button',
  loading = false,
  disabled = false,
  ...props
}) {
  const variants = {
    primary:
      'bg-[#194332] hover:bg-[#102F28] active:bg-[#0c241e] text-white font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-[#194332] focus-visible:ring-offset-2 border-0',
    secondary:
      'bg-white hover:bg-[#F3F0E9] active:bg-[#E7E5E0] text-[#202923] border border-[#D5D1C7] font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-[#D5D1C7] focus-visible:ring-offset-2',
    ghost:
      'bg-transparent hover:bg-[#F3F0E9] active:bg-[#E7E5E0] text-[#194332] hover:text-[#102F28] font-medium border-0',
    danger:
      'bg-[#B42318] hover:bg-[#911B12] active:bg-[#7A150D] text-white font-semibold shadow-sm border-0 focus-visible:ring-2 focus-visible:ring-[#B42318] focus-visible:ring-offset-2',
    outline:
      'border border-[#194332] text-[#194332] hover:bg-[#194332]/5 active:bg-[#194332]/10 font-semibold focus-visible:ring-2 focus-visible:ring-[#194332]',
  };

  const sizes = {
    sm: 'h-9 px-3.5 text-xs rounded-lg',
    md: 'h-11 px-5 text-sm rounded-lg',
    lg: 'h-12 px-6 text-base rounded-lg',
    xl: 'h-14 px-8 text-base rounded-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-inter transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer outline-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
