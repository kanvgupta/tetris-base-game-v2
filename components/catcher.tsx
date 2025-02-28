"use client"

import React from "react"
import { motion } from "framer-motion"

interface CatcherProps {
  position: number
}

// Memoize the component to prevent unnecessary re-renders
const Catcher = React.memo(({ position }: CatcherProps) => {
  // Pre-compute animation values
  const xPosition = position - 60
  
  return (
    <motion.div
      className="absolute bottom-6 flex flex-col items-center"
      style={{
        x: xPosition,
      }}
      animate={{ x: xPosition }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Catcher platform */}
      <div
        className="w-[120px] h-6 bg-gradient-to-r from-blue-500 to-orange-500 rounded-xl relative overflow-hidden"
        style={{
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.5), 0 0 20px rgba(249, 115, 22, 0.5)",
        }}
      >
        {/* Animated light effect */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[pulse_2s_ease-in-out_infinite]"></div>
      </div>

      {/* Catcher trail */}
      <motion.div
        className="w-[8px] h-[80px] rounded-full bg-gradient-to-b from-blue-500/80 to-transparent"
        initial={{ opacity: 0.4, scaleY: 0.8 }}
        animate={{ opacity: [0.4, 0.7, 0.4], scaleY: [0.8, 1, 0.8] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
      />
    </motion.div>
  )
})

// Add display name for debugging
Catcher.displayName = "Catcher"

export { Catcher }

