"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { FallingBlock } from "@/components/falling-block"
import { Catcher } from "@/components/catcher"
import { Clock } from "lucide-react"

interface GameContainerProps {
  onBlockCaught: (blockType: "standard" | "flash", points: number) => void
  onGameEnd: () => void
}

interface Block {
  id: string
  type: "standard" | "flash"
  x: number
  y: number
  speed: number
  value: number
}

export function GameContainer({ onBlockCaught, onGameEnd }: GameContainerProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [catcherPosition, setCatcherPosition] = useState(50)
  const [gameTime, setGameTime] = useState(20)
  const [gameWidth, setGameWidth] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [showCombo, setShowCombo] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const catcherWidth = 120
  const catcherHeight = 24
  
  // Refs for performance optimization
  const blocksRef = useRef<Block[]>(blocks)
  const catcherPositionRef = useRef(catcherPosition)
  const comboRef = useRef(combo)
  const rafRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const lastMoveTimeRef = useRef<number>(0)
  
  // Update refs when state changes
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  
  useEffect(() => {
    catcherPositionRef.current = catcherPosition;
  }, [catcherPosition]);
  
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  // Set game width on mount
  useEffect(() => {
    if (containerRef.current) {
      setGameWidth(containerRef.current.offsetWidth)
    }

    const handleResize = () => {
      if (containerRef.current) {
        setGameWidth(containerRef.current.offsetWidth)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Game timer
  useEffect(() => {
    if (gameTime <= 0) {
      onGameEnd()
      return
    }

    const timer = setInterval(() => {
      setGameTime((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [gameTime, onGameEnd])

  // Generate blocks with useCallback
  const generateBlock = useCallback(() => {
    if (gameWidth === 0) return;
    
    // 70% chance for standard block, 30% for flash block
    const isStandard = Math.random() > 0.3
    const blockType = isStandard ? "standard" : "flash"
    const blockSpeed = isStandard ? 3 + Math.random() * 2 : 8 + Math.random() * 4
    const blockValue = isStandard ? 10 : 50

    const newBlock: Block = {
      id: Math.random().toString(36).substring(2, 9),
      type: blockType,
      x: Math.random() * (gameWidth - 50),
      y: -50,
      speed: blockSpeed,
      value: blockValue,
    }

    setBlocks((prev) => [...prev, newBlock])
  }, [gameWidth]);

  // Block generation interval
  useEffect(() => {
    const blockInterval = setInterval(generateBlock, 1000)
    return () => clearInterval(blockInterval)
  }, [generateBlock])

  // Optimized block movement with requestAnimationFrame
  const moveBlocks = useCallback((timestamp: number) => {
    // Throttle to ~60fps
    if (timestamp - lastFrameTimeRef.current < 16) {
      rafRef.current = requestAnimationFrame(moveBlocks);
      return;
    }
    
    lastFrameTimeRef.current = timestamp;
    
    setBlocks((prev) => {
      return prev
        .map((block) => {
          // Check if block is caught
          if (
            block.y > 750 - catcherHeight &&
            block.y < 750 + catcherHeight &&
            block.x > catcherPositionRef.current - catcherWidth / 2 - 25 &&
            block.x < catcherPositionRef.current + catcherWidth / 2 + 25
          ) {
            // Increase combo for consecutive catches
            const newCombo = comboRef.current + 1;
            setCombo(newCombo);
            setShowCombo(true);
            setTimeout(() => setShowCombo(false), 1000);

            // Apply combo bonus
            const comboBonus = Math.min(Math.floor(newCombo / 3), 5);
            const totalPoints = block.value + comboBonus;

            setScore((prev) => prev + totalPoints);
            onBlockCaught(block.type, totalPoints);

            return { ...block, y: 1000 }; // Move it out of view
          }

          // Move block down
          return { ...block, y: block.y + block.speed };
        })
        .filter((block) => block.y < 800); // Remove blocks that are out of view
    });
    
    rafRef.current = requestAnimationFrame(moveBlocks);
  }, [catcherHeight, catcherWidth, onBlockCaught]);

  // Start and clean up animation frame
  useEffect(() => {
    rafRef.current = requestAnimationFrame(moveBlocks);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [moveBlocks]);

  // Throttled mouse movement handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    // Throttle to every 16ms (~60fps)
    if (now - lastMoveTimeRef.current < 16) return;
    
    lastMoveTimeRef.current = now;
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setCatcherPosition(Math.max(60, Math.min(gameWidth - 60, x)));
    }
  }, [gameWidth]);

  // Throttled touch movement handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const now = performance.now();
    // Throttle to every 16ms (~60fps)
    if (now - lastMoveTimeRef.current < 16) return;
    
    lastMoveTimeRef.current = now;
    
    if (containerRef.current && e.touches[0]) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      setCatcherPosition(Math.max(60, Math.min(gameWidth - 60, x)));
    }
  }, [gameWidth]);

  // Memoize blocks to prevent unnecessary re-renders
  const memoizedBlocks = useMemo(() => {
    return blocks.map((block) => (
      <FallingBlock key={block.id} type={block.type} x={block.x} y={block.y} />
    ));
  }, [blocks]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[800px] game-container-bg rounded-2xl overflow-hidden cursor-none shadow-2xl border border-gray-700/50"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Game timer */}
      <div className="absolute top-4 right-4 glass-effect px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
        <Clock className="h-4 w-4 text-orange-400" />
        <span className="font-mono font-bold">{gameTime}s</span>
      </div>

      {/* Score display */}
      <div className="absolute top-4 left-4 glass-effect px-4 py-2 rounded-xl shadow-lg">
        <span className="font-mono font-bold">Score: {score}</span>
      </div>

      {/* Combo display */}
      {showCombo && combo > 1 && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 glass-effect px-4 py-2 rounded-xl shadow-lg bg-gradient-to-r from-blue-500/70 to-orange-500/70 animate-pulse">
          <span className="font-mono font-bold">Combo x{combo}!</span>
        </div>
      )}

      {/* Falling blocks - using memoized blocks */}
      {memoizedBlocks}

      {/* Catcher */}
      <Catcher position={catcherPosition} />
    </div>
  )
}

