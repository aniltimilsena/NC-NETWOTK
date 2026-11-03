export default function GlassCard({
  children,
  className = '',
  strong = false,
  onClick = undefined,
  style = {}
}) {
  const hasCustomRounded = className.includes('rounded');
  const hasNoBorder = className.includes('border-0') || className.includes('border-none') || className.includes('!border');
  return (
    <div
      onClick={onClick}
      style={{ ...(hasNoBorder ? { border: 'none' } : {}), ...style }}
      className={`bg-white ${hasCustomRounded ? '' : 'rounded-2xl'} ${
        strong ? 'border border-[#D5D1C7] shadow-elevated' : 'border border-[#E7E5E0] shadow-card'
      } ${hasNoBorder ? '!border-0 !border-none' : ''} ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </div>
  );
}
