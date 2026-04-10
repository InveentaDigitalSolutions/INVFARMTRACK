import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy-900"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: "32px 32px",
      }} />

      {/* Logo animation */}
      <motion.div className="relative flex flex-col items-center">
        {/* Leaf icon with glow */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(196, 217, 62, 0)",
                "0 0 40px 10px rgba(196, 217, 62, 0.15)",
                "0 0 0 0 rgba(196, 217, 62, 0)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.8 }}
            className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500"
          >
            <Leaf className="w-10 h-10 text-navy-900" />
          </motion.div>
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Broton </span>
            <span className="text-lime-400">Verde</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-[11px] text-navy-500 tracking-[0.2em] uppercase mt-2"
          >
            Digital Nursery Intelligence
          </motion.p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.3 }}
          className="mt-10 w-48"
        >
          <div className="h-[2px] rounded-full bg-navy-800 overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 1.1, duration: 1.8, ease: "easeInOut" }}
              onAnimationComplete={onComplete}
              className="h-full rounded-full bg-gradient-to-r from-lime-400 to-green-500"
            />
          </div>
        </motion.div>

        {/* Powered by */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="mt-16 flex items-center gap-1.5"
        >
          <span className="text-[9px] text-navy-600 tracking-wider uppercase">Powered by</span>
          <span className="text-[11px] text-navy-500 font-medium tracking-wide">
            <span className="text-lime-500">.</span>inveenta
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
