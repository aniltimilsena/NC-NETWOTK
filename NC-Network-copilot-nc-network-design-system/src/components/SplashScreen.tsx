import React from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
    >
      {/* Background Subtle Radial Glow in Gold */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(242,178,42,0.06)_0%,transparent_60%)] pointer-events-none" />

      {/* Cinematic Logo Container */}
      <motion.div 
        className="relative flex flex-col items-center w-full max-w-sm px-4"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* SVG Curved Logo Design */}
        <svg viewBox="0 0 400 300" className="w-full h-auto drop-shadow-[0_0_35px_rgba(242,178,42,0.25)]">
          <defs>
            {/* Cinematic Metallic Gold Gradient */}
            <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFEAA5" />
              <stop offset="35%" stopColor="#F2B22A" />
              <stop offset="75%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#6E2C00" />
            </linearGradient>
          </defs>

          {/* Giant Bold "NC" Text */}
          <text 
            x="200" 
            y="145" 
            textAnchor="middle" 
            fontSize="140" 
            fontWeight="900" 
            fontFamily="'Inter', 'Impact', 'Arial Black', sans-serif" 
            fill="url(#gold-gradient)" 
            letterSpacing="-0.02em"
          >
            NC
          </text>

          {/* Path for curved "NETWORK" text - arches upwards in the center */}
          <path id="curve-path" d="M 60,215 Q 200,190 340,215" fill="transparent" />

          {/* Curved "NETWORK" Text along path */}
          <text 
            fontSize="26" 
            fontWeight="900" 
            fontFamily="'Inter', 'Arial Black', sans-serif" 
            letterSpacing="0.25em" 
            fill="url(#gold-gradient)"
          >
            <textPath href="#curve-path" startOffset="50%" textAnchor="middle">
              NETWORK
            </textPath>
          </text>
        </svg>
      </motion.div>
    </motion.div>
  );
}
