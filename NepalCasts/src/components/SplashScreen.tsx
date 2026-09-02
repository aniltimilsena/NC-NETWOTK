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
            <motion.div
                className="relative flex flex-col items-center justify-center w-full max-w-sm px-6"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                exit={{
                    scale: 1.0,
                    opacity: 0,
                    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
                }}
                transition={{
                    duration: 1.5,
                    ease: [0.4, 0, 0.2, 1]
                }}
            >
                <motion.div
                    className="relative w-40 h-40"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                >
                    <LogoIcon className="w-full h-full" />
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
