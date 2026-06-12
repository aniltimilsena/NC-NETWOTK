import React from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 bg-[#0A0A0F] z-[9999] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
    >
      {/* Radial Glow Effect */}
      <div className="absolute w-[400px] h-[400px] bg-nc-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center">
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Glowing ambient ring */}
          <motion.div 
            className="absolute -inset-4 rounded-full border-2 border-nc-accent/30 pointer-events-none"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <img src="/logo.png" alt="NC Network" className="w-24 h-24 object-contain relative z-10" />
        </motion.div>

        {/* Brand Text */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white text-2xl font-bold tracking-wider font-display mb-2"
        >
          NC NETWORK
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-white text-xs font-sans uppercase tracking-[0.25em]"
        >
          Talent Discovery Platform
        </motion.p>

        {/* Progress Line */}
        <div className="w-32 h-[3px] bg-white/5 rounded-full overflow-hidden mt-8 relative">
          <motion.div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-nc-accent to-nc-blue rounded-full"
            initial={{ left: "-100%", width: "100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
