import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ServerCrash, ArrowLeft, RefreshCw } from 'lucide-react';
import SEO from '../components/SEO';

export default function ServerError() {
  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden select-none">
      <SEO title="500 Internal Server Error | NepalCasts" description="An unexpected error occurred on our servers." />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-12 backdrop-blur-2xl shadow-2xl text-center space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <ServerCrash size={32} strokeWidth={1.5} />
          </div>
        </div>

        <div className="relative">
          <h1 className="text-8xl font-black text-white/[0.03] tracking-widest leading-none select-none">
            500
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-extrabold text-amber-400 tracking-normal uppercase">
              Script Malfunction
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Internal Server Error</h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
            Our technical crew has been notified and is resolving the issue.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer"
          >
            <RefreshCw size={16} strokeWidth={2.5} />
            <span>Reload Scene</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#00BFFF] text-black font-extrabold text-sm rounded-2xl hover:brightness-110 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Back to Home</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
