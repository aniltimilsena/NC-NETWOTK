export default function Tag({ children, color = 'default' }) {
  const colors = {
    default: 'bg-[#F3F0E9] text-[#202923] border border-[#E7E5E0]',
    accent: 'bg-[#FAF4EC] text-[#946019] border border-[#EADBC8]',
    blue: 'bg-[#F0F4F2] text-[#194332] border border-[#D5E2DB]',
    green: 'bg-[#EAF2ED] text-[#286847] border border-[#C8DFD2]',
    red: 'bg-[#FEE4E2] text-[#B42318] border border-[#FECDCA]',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-inter tracking-tight ${colors[color] || colors.default}`}>
      {children}
    </span>
  );
}
