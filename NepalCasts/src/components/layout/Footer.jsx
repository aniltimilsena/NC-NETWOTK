import { Link } from 'react-router-dom';
export default function Footer({ user }) {
    const navSections = [
        {
            title: "Discover",
            links: [
                { label: "Home", to: "/" },
                { label: "Talent Directory", to: "/talents" },
                { label: "Casting Board", to: "/casting" },
                { label: "PRO Membership", to: "/premium" },
            ]
        },
        {
            title: "Create",
            links: [
                { label: "Post a Project", to: "/casting/create" },
                { label: "Build Profile", to: "/profile/create" },
                { label: "Find Work", to: "/casting" },
            ]
        },
        {
            title: "Account",
            links: [
                { label: "My Profile", to: user ? `/profile/${user.uid}` : "/signin" },
                { label: "Inbox", to: "/messages" },
                { label: "Alerts", to: "/notifications" },
                { label: "Settings", to: "/settings" },
            ]
        },
    ];
    const legalLinks = [
        { label: "Trust", to: "/trust-safety" },
        { label: "Privacy", to: "/privacy" },
        { label: "Terms", to: "/terms" },
    ];
    return (<footer className="bg-[#0A0A0A] border-0 pt-1 pb-2 lg:pt-3 lg:pb-4 mt-auto relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-nc-accent/5 rounded-full blur-[120px] -z-10"/>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">



        
        <div className="flex lg:hidden flex-row items-center justify-center flex-wrap gap-x-1 text-center text-[10px] text-[#555]">
          {legalLinks.map((link, i) => (
            <span key={link.label} className="flex items-center gap-x-1">
              {i !== 0 && <span className="opacity-40">·</span>}
              <Link to={link.to} className="hover:text-white transition-colors">{link.label}</Link>
            </span>
          ))}
          <span className="opacity-40">·</span>
          <span>&copy; {new Date().getFullYear()} NepalCasts</span>
        </div>


      </div>
    </footer>);
}
