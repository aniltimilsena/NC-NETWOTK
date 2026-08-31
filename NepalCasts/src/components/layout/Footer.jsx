import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const legalLinks = [
    { label: "About", to: "/about" },
    { label: "Trust & Safety", to: "/trust-safety" },
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Contact", to: "/contact" },
    { label: "Help", to: "/help" },
  ];

  return (
    <footer className="block lg:hidden bg-transparent border-0 pt-3 pb-3 px-4 text-center mt-2 space-y-2 select-none">
      {/* Brand Logo */}
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-sm font-black text-white tracking-widest uppercase font-apple">
          NEPAL<span className="text-[#ffb400]">CASTS</span>
        </span>
      </div>

      <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
        Nepal&apos;s unified talent discovery and casting network.
      </p>

      {/* Navigation Links */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-gray-400 font-medium pt-0.5">
        {legalLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Copyright */}
      <div className="pt-1 text-[10px] text-gray-600 font-medium">
        &copy; {new Date().getFullYear()} NepalCasts. All rights reserved.
      </div>
    </footer>
  );
}
