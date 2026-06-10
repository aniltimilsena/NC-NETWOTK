import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';

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
    { label: "Trust & Safety", to: "/trust-safety" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms of Service", to: "/terms" },
  ];

  return (
    <footer className="bg-[#0A0A0A] border-t border-white/5 pt-5 lg:pt-10 pb-10 md:pb-12 mt-auto relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-nc-accent/5 rounded-full blur-[120px] -z-10" />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">

        {/* ── Desktop layout (≥lg): full multi-column ─────────── */}
        <div className="hidden lg:grid grid-cols-5 gap-8 mb-16">
          {/* Logo Column */}
          <div className="col-span-1 flex flex-col items-start text-left space-y-2">
            <Logo size="md" className="mx-0" />
          </div>

          {/* Nav Sections: Discover, Create, Account */}
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col items-start text-left space-y-3">
              <h4 className="text-white font-black text-[10px] uppercase tracking-widest opacity-80">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.to}
                      className="text-nc-muted hover:text-white text-[13px] transition-colors block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Legal Section */}
          <div className="flex flex-col items-start text-left space-y-3">
            <h4 className="text-white font-black text-[10px] uppercase tracking-widest opacity-80">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.to}
                    className="text-nc-muted hover:text-white text-[13px] transition-colors block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Mobile layout (<lg): logo + legal only ───── */}
        <div className="flex lg:hidden flex-row justify-center items-center flex-wrap gap-4 sm:gap-6 text-center mb-8">
          {/* Logo */}
          <Logo size="sm" />

          {/* Legal Links */}
          <nav aria-label="Legal" className="flex flex-row justify-center flex-wrap gap-2 sm:gap-4 w-auto">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="relative py-1 px-3 text-nc-muted hover:text-white text-[12px] font-bold transition-colors after:absolute after:inset-x-0 after:top-1/2 after:-translate-y-1/2 after:h-[44px] after:content-['']"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Bottom bar (shared) ─────────────────────────────── */}
        <div className="pt-8 border-t border-white/5 flex flex-row justify-between items-center gap-4 flex-wrap text-left">
          <p className="text-xs text-[#444] font-medium">
            &copy; {new Date().getFullYear()} NC Network Entertainment. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-8">
            <button className="text-[#1877F2] transition-all duration-300 transform hover:scale-110 hover:brightness-110" aria-label="Facebook">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.2 2.238.2v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </button>
            <button className="group relative transition-all duration-300 transform hover:scale-110" aria-label="Instagram">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="instagram-gradient-footer" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <path className="fill-[url(#instagram-gradient-footer)] group-hover:brightness-110 transition-all duration-300" fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="text-white transition-all duration-300 transform hover:scale-110 hover:opacity-80" aria-label="X / Twitter">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

