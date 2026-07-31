import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      <SEO title="403 Access Denied | NepalCasts" description="You do not have permission to access this page." />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-2xl shadow-2xl text-center space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-inner">
            <ShieldAlert size={32} strokeWidth={1.5} />
          </div>
        </div>

        <div className="relative">
          <h1 className="text-8xl font-black text-white/[0.03] tracking-widest leading-none select-none">
            403
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-extrabold text-red-400 tracking-normal uppercase">
              Access Denied
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Restricted Area</h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
            You do not have permission or credentials to view this production resource.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-extrabold text-sm rounded-2xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Return to Safety</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
