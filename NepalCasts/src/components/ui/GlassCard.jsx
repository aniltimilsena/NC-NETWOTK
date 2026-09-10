export default function GlassCard({ children, className = '', strong = false, onClick = undefined, style = {} }) {
    const hasCustomRounded = className.includes('rounded');
    const hasNoBorder = className.includes('border-0') || className.includes('border-none') || className.includes('!border');
    return (<div onClick={onClick} style={{ ...(hasNoBorder ? { border: 'none' } : {}), ...style }} className={`${hasCustomRounded ? '' : 'rounded-[2.5rem]'} ${strong ? 'glass-strong' : 'glass'} ${hasNoBorder ? '!border-0 !border-none' : ''} ${className} ${onClick ? 'cursor-pointer' : ''}`}>
      {children}
    </div>);
}
