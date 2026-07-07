import React from 'react';
import { motion } from 'framer-motion';
import { LogoIcon } from './ui/Logo';

export default function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } 
      }}
    >
      {/* Background Subtle Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,191,255,0.06)_0%,transparent_75%)] pointer-events-none" />

      {/* Cinematic Logo Container */}
      <motion.div 
        className="relative flex flex-col items-center justify-center w-full max-w-sm px-6"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1.1, opacity: 1 }}
        exit={{ 
          scale: 1.0, 
          opacity: 0, 
          transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } 
        }}
        transition={{ 
          duration: 1.8, 
          ease: [0.4, 0, 0.2, 1] 
        }}
      >
        {/* Glowing aura behind logo */}
        <motion.div 
          className="absolute -inset-6 bg-[#00BFFF]/10 rounded-full blur-3xl pointer-events-none" 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.8, 0.4], scale: [0.8, 1.2, 1.0] }}
          transition={{ duration: 2.2, ease: [0.4, 0, 0.2, 1] }}
        />

        <motion.div 
          className="relative w-44 h-44 drop-shadow-[0_0_35px_rgba(0,191,255,0.25)]"
          initial={{ opacity: 0, rotate: -5 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <LogoIcon className="w-full h-full" />
        </motion.div>

        {/* Golden sweep light sheen overlay */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none mix-blend-color-dodge">
          <motion.div 
            className="w-[150%] h-[300%] bg-gradient-to-r from-transparent via-[#FACC15]/30 to-transparent -top-full -left-full rotate-[35deg]"
            initial={{ x: "-100%", y: "-100%" }}
            animate={{ x: "100%", y: "100%" }}
            transition={{ 
              delay: 0.2, 
              duration: 1.6, 
              ease: [0.4, 0, 0.2, 1] 
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
