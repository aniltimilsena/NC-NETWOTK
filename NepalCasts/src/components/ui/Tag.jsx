export default function Tag({ children, color = 'default' }) {
    const colors = {
        default: 'bg-nc-border text-nc-secondary',
        accent: 'bg-nc-accent/20 text-nc-accent border border-nc-accent/30',
        blue: 'bg-nc-blue/20 text-nc-blue border border-nc-blue/30',
        green: 'bg-green-500/20 text-green-400 border border-green-500/30',
        red: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
    return (<span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>);
}
