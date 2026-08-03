export default function GlassCard({ children, className = '', strong = false, onClick = undefined }) {
    return (<div onClick={onClick} className={`rounded-[2.5rem] ${strong ? 'glass-strong' : 'glass'} ${className} ${onClick ? 'cursor-pointer' : ''}`}>
      {children}
    </div>);
}
