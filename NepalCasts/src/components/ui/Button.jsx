export default function Button({ children, variant = 'primary', size = 'md', className = '', onClick = () => { }, type = 'button', loading = false, disabled = false, ...props }) {
    const variants = {
        primary: 'bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-bold tracking-wide shadow-md active:scale-95 border border-white/5',
        secondary: 'bg-white/10 text-white hover:bg-white/15 border border-white/10 font-semibold',
        ghost: 'text-gray-300 hover:text-white hover:bg-white/5',
        danger: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 font-semibold',
        outline: 'border border-[#522C69]/50 text-white hover:bg-[#522C69]/20 font-semibold',
    };
    const sizes = {
        sm: 'px-3.5 py-1.5 text-xs rounded-lg',
        md: 'px-5 py-2.5 text-sm rounded-xl',
        lg: 'px-6 py-3 text-base rounded-xl',
        xl: 'px-8 py-4 text-lg rounded-2xl',
    };
    return (<button type={type} onClick={onClick} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading && (<svg className="animate-spin h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>)}
      {children}
    </button>);
}
