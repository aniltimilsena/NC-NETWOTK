import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Film, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      <Helmet>
        <title>404 — Screen Not Found | NepalCasts</title>
      </Helmet>

      {/* Cinematic ambient background glow orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern overlay for tech-cinematic vibe */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-2xl shadow-2xl text-center space-y-8 relative overflow-hidden"
      >
        {/* Glow accent line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00BFFF] to-transparent" />

        {/* Animated Clapperboard Header Illustration */}
        <div className="flex justify-center">
          <motion.div 
            animate={{ rotate: [0, -8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#00BFFF] shadow-inner"
          >
            <Film size={32} strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Big 404 / "Cut!" Text Block */}
        <div className="relative">
          <h1 className="text-8xl font-black text-white/[0.03] tracking-widest leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-4xl font-extrabold text-white tracking-normal uppercase bg-gradient-to-r from-white via-white to-red-400 bg-clip-text text-transparent"
            >
              Cut!
            </motion.span>
          </div>
        </div>

        {/* Messaging */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Scene/Screen Not Found</h2>
          <p className="text-xs sm:text-sm text-nc-secondary leading-relaxed max-w-xs mx-auto">
            The page you are looking for has been moved, deleted, or does not exist in our production script.
          </p>
        </div>

        {/* Return Button */}
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] hover:from-[#00E5F5] hover:to-[#3CA4FC] text-black font-extrabold text-sm rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(0,242,254,0.2)] hover:shadow-[0_0_35px_rgba(0,242,254,0.4)]"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Return to Script</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
