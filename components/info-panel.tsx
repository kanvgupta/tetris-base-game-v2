"use client"

import { motion } from "framer-motion"
import { Zap, Clock, GamepadIcon as GameController, Info, Sparkles, ArrowRight } from "lucide-react"

interface InfoPanelProps {
  onStartGame: () => void
}

export function InfoPanel({ onStartGame }: InfoPanelProps) {
  return (
    <motion.div
      className="glass-effect rounded-2xl p-6 h-[800px] overflow-y-auto shadow-lg border border-gray-700/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-orange-500 text-glow flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-blue-400" />
        Welcome to FlashCatch!
      </h2>

      <div className="space-y-8">
        <section className="glass-effect p-5 rounded-xl">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            What is FlashCatch?
          </h3>
          <p className="text-gray-300 leading-relaxed">
            FlashCatch is an interactive game that visualizes the speed difference between traditional 2-second blocks
            and 200-millisecond Flashblocks by <a href="https://www.flashbots.net/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Flashbots</a> on <a href="https://www.base.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Base</a> Sepolia through an engaging, game-like experience.
          </p>
        </section>

        <section className="glass-effect p-5 rounded-xl">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <GameController className="h-5 w-5 text-orange-400" />
            How to Play
          </h3>
          <ul className="list-none space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                1
              </div>
              <span>Move your mouse or finger to control the catcher at the bottom of the screen</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                2
              </div>
              <span>Catch falling blocks to earn points</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                3
              </div>
              <span>
                Blue blocks <Clock className="h-3 w-3 inline mx-1 text-blue-400" /> (standard) are worth 10 points each
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                4
              </div>
              <span>
                Orange blocks <Zap className="h-3 w-3 inline mx-1 text-orange-400" /> (Flashblocks) are worth 50 points
                each but fall much faster
              </span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                5
              </div>
              <span>Chain catches to build combos for bonus points!</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                6
              </div>
              <span>The game lasts for 20 seconds - catch as many blocks as you can!</span>
            </li>
          </ul>
        </section>

        <section className="glass-effect p-5 rounded-xl">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-400" />
            About Flashblocks
          </h3>
          <p className="text-gray-300 leading-relaxed mb-3">
          Flashblocks is a streaming layer that gives users near-instant UX while still running an explicit auction every 200ms. They achieve it by::
          </p>
          <ul className="text-gray-300 leading-relaxed list-disc pl-5 space-y-2">
            <li>Creating and streaming partial blocks every 200ms to other nodes.</li>
            <li>Providing users with early execution confirmations.</li>
            <li>Allowing nodes to incrementally download and continuously execute transactions rather than wait for new blocks.</li>
            <li>Calculating the state root and consensus once for multiple partial blocks, amortizing costly parts of block production.</li>
            <li>Serving early execution state over the existing, unmodified Ethereum JSON-RPC standard, enabling easy wallet and front end integration.</li>
          </ul>
        </section>

        <section className="glass-effect p-5 rounded-xl">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-400" />
            Test Transactions
          </h3>
          <p className="text-gray-300 leading-relaxed">
            In the transaction panel, you can submit test transactions to both networks and see the real-time difference
            in confirmation times between standard blocks and Flashblocks.
          </p>
        </section>

        <div className="flex justify-center mt-8">
          <button
            onClick={onStartGame}
            className="px-8 py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 transform hover:scale-105"
          >
            Start Game
          </button>
        </div>
      </div>
    </motion.div>
  )
}

