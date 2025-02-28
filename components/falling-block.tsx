"use client"

import React from "react"
import { motion } from "framer-motion"

interface FallingBlockProps {
  type: "standard" | "flash"
  x: number
  y: number
}

// Memoize the component to prevent unnecessary re-renders
const FallingBlock = React.memo(({ type, x, y }: FallingBlockProps) => {
  const blockColor =
    type === "standard"
      ? "bg-gradient-to-br from-blue-500 to-blue-700"
      : "bg-gradient-to-br from-orange-500 to-orange-700"

  const blockSize = type === "standard" ? "w-14 h-14" : "w-12 h-12"
  const blockIcon = type === "standard" ? "⬢" : "⚡"
  const blockGlow = type === "standard" ? "0 0 20px rgba(59, 130, 246, 0.7)" : "0 0 20px rgba(249, 115, 22, 0.7)"

  // Optimize animations by pre-computing values
  const rotateAnimation = type === "standard" 
    ? { rotate: [0, 5, -5, 0] }
    : { rotate: [0, 15, -15, 0] }
    
  const rotateDuration = type === "standard" ? 3 : 1.5

  return (
    <motion.div
      className={`absolute ${blockSize} ${blockColor} rounded-xl flex items-center justify-center text-white font-bold shadow-lg border border-white/20`}
      style={{
        x,
        y,
        boxShadow: blockGlow,
      }}
      initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...rotateAnimation,
      }}
      transition={{
        duration: 0.3,
        rotate: {
          repeat: Number.POSITIVE_INFINITY,
          duration: rotateDuration,
          ease: "easeInOut",
        },
      }}
    >
      <span className="text-xl">{blockIcon}</span>
    </motion.div>
  )
})

// Add display name for debugging
FallingBlock.displayName = "FallingBlock"

export { FallingBlock }

