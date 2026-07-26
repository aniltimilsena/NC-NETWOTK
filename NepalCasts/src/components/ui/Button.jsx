export default function Button({ children, variant = 'primary', size = 'md', className = '', onClick = () => { }, type = 'button', loading = false, disabled = false, ...props }) {
    const variants = {
        primary: 'bg-gradient-to-br from-sky-400 to-sky-600 text-black font-bold hover:from-sky-500 hover:to-sky-700 shadow-[0_4px_20px_rgba(56,189,248,0.25)]',
        secondary: 'bg-nc-surface border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/50',
        ghost: 'text-nc-secondary hover:text-white hover:bg-white/5',
        danger: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30',
        outline: 'border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/50',
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg',
    };
    return (<button type={type} onClick={onClick} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading && (<svg className="animate-spin h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>)}
      {children}
    </button>);
}
