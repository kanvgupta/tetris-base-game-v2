"use client"

import { useState } from "react"
import { GameContainer } from "@/components/game-container"
import { StatsDashboard } from "@/components/stats-dashboard"
import { TransactionForm } from "@/components/transaction-form"
import { InfoPanel } from "@/components/info-panel"
import { BlockExplorer } from "@/components/block-explorer"
import { Sparkles, Info } from "lucide-react"

export default function Home() {
  const [score, setScore] = useState(0)
  const [standardBlocksCaught, setStandardBlocksCaught] = useState(0)
  const [flashBlocksCaught, setFlashBlocksCaught] = useState(0)
  const [isGameActive, setIsGameActive] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [gameFinished, setGameFinished] = useState(false)

  const handleStartGame = () => {
    setScore(0)
    setStandardBlocksCaught(0)
    setFlashBlocksCaught(0)
    setIsGameActive(true)
    setShowInfo(false)
    setGameFinished(false)
  }

  const handleBlockCaught = (blockType: "standard" | "flash", points: number) => {
    setScore((prev) => prev + points)
    if (blockType === "standard") {
      setStandardBlocksCaught((prev) => prev + 1)
    } else {
      setFlashBlocksCaught((prev) => prev + 1)
    }
  }

  const handleGameEnd = () => {
    setIsGameActive(false)
    setGameFinished(true)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-6 lg:p-8 text-white">
      <div className="z-10 w-full max-w-7xl items-center justify-between font-mono text-sm flex mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-orange-500 text-glow flex items-center">
          <Sparkles className="mr-2 h-6 w-6 text-blue-400" />
          FlashCatch
        </h1>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="px-4 py-2 rounded-lg glass-effect hover:bg-gray-700/50 transition-all duration-300 flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          {showInfo ? "Hide Info" : "Show Info"}
        </button>
      </div>

      <div className="flex flex-col w-full max-w-7xl gap-6 my-4">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-3/4">
            {!isGameActive && !showInfo && (
              <div className="flex flex-col items-center justify-center h-[800px] game-container-bg rounded-2xl shadow-2xl border border-gray-700/50">
                <h2 className="text-3xl mb-6 font-bold text-glow">Ready to catch some blocks?</h2>
                <button
                  onClick={handleStartGame}
                  className="px-8 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform hover:scale-105"
                >
                  Start Game
                </button>
              </div>
            )}

            {isGameActive && (
              <GameContainer onBlockCaught={handleBlockCaught} onGameEnd={handleGameEnd} />
            )}

            {showInfo && <InfoPanel onStartGame={handleStartGame} />}
          </div>

          <div className="w-full lg:w-1/4">
            <StatsDashboard
              score={score}
              standardBlocksCaught={standardBlocksCaught}
              flashBlocksCaught={flashBlocksCaught}
              gameFinished={gameFinished}
            />
          </div>
        </div>

        <div className="w-full">
          <TransactionForm />
        </div>
        
        <div className="w-full">
          <BlockExplorer />
        </div>
      </div>
    </main>
  )
}

