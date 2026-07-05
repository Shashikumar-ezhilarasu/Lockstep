"use client";

import { motion } from 'framer-motion';

export default function Loader({ fullScreen = false }: { fullScreen?: boolean }) {
  const containerClass = fullScreen 
    ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAFAF9] backdrop-blur-sm" 
    : "w-full flex flex-col items-center justify-center min-h-[400px] bg-transparent";

  return (
    <div className={containerClass}>
      <div className="relative flex items-center justify-center w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-[#5B4FE8]/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-4 border-t-[#5B4FE8] border-r-transparent border-b-[#5B4FE8] border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="w-3 h-3 rounded-full bg-[#5B4FE8]"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <motion.p 
        className="mt-6 text-sm font-bold text-slate-400 tracking-widest uppercase"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading
      </motion.p>
    </div>
  );
}
