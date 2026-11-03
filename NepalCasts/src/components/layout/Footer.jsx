import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const pathname = location?.pathname || '';
  const isHomePage = pathname === '/' || pathname === '';

  if (!isHomePage) return null;

  const legalLinks = [
    { label: "About", to: "/about" },
    { label: "Trust & Safety", to: "/trust-safety" },
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Contact", to: "/contact" },
    { label: "Help", to: "/help" },
  ];

  return (
    <footer className="w-full bg-[#FAF8F4] border-t border-[#E7E5E0] pt-6 pb-6 px-4 text-center mt-6 space-y-3 select-none">
      {/* Brand Logo */}
      <div className="flex items-center justify-center gap-1.5">
        <span className="font-display text-base font-semibold text-[#202923] tracking-widest uppercase">
          NEPALCASTS
        </span>
      </div>

      <p className="text-xs text-[#626860] max-w-sm mx-auto leading-relaxed font-inter">
        Nepal&apos;s unified talent discovery and casting network.
      </p>

      {/* Navigation Links */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#626860] font-medium pt-1 font-inter">
        {legalLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="hover:text-[#194332] transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Copyright */}
      <div className="pt-2 text-[11px] text-[#777C75] font-inter">
        &copy; {new Date().getFullYear()} NepalCasts. All rights reserved.
      </div>
    </footer>
  );
}
