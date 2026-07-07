import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      <Helmet>
        <title>404 — Screen Not Found | NepalCasts</title>
      </Helmet>

      {/* Decorative neon blur element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

        <h1 className="text-8xl font-black text-white/10 tracking-widest relative">
          404
          <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white tracking-normal uppercase select-none">
            Cut!
          </span>
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Scene/Screen Not Found</h2>
          <p className="text-sm text-nc-muted leading-relaxed">
            The page you are looking for has been moved, deleted, or does not exist in our system.
          </p>
        </div>

        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-nc-accent text-[#0A0A0F] font-black text-sm rounded-xl hover:bg-sky-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-nc-accent/20"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
