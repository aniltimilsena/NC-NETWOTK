export default function SkillBar({ name, level }) {
    return (<div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-nc-secondary">{name}</span>
        <span className="text-sm font-semibold text-nc-accent">{level}%</span>
      </div>
      <div className="h-1.5 bg-nc-border rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-nc-accent to-sky-300 rounded-full transition-all duration-1000" style={{ width: `${level}%` }}/>
      </div>
    </div>);
}
