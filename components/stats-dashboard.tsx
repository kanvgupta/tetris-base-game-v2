"use client"
import { useBlockchainData } from "@/lib/blockchain"
import { mintNFT, getExplorerUrl } from "@/lib/nft"
import { BarChart3, Clock, Zap, Wifi, WifiOff, Award, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"

interface StatsDashboardProps {
  score: number
  standardBlocksCaught: number
  flashBlocksCaught: number
  gameFinished: boolean
}

// We'll use these types for our display
interface FlashBlockIndexSummary {
  index: number
  count: number
}

export function StatsDashboard({ score, standardBlocksCaught, flashBlocksCaught, gameFinished }: StatsDashboardProps) {
  const { 
    standardBlocks, 
    flashBlocks, 
    isConnected,
    connectionError
  } = useBlockchainData()
  
  const [standardBlockTime, setStandardBlockTime] = useState("~2.0s")
  const [flashBlockTime, setFlashBlockTime] = useState("~0.2s")
  const [flashBlockIndexes, setFlashBlockIndexes] = useState<FlashBlockIndexSummary[]>([])
  const [latestPayloadId, setLatestPayloadId] = useState<string | null>(null)
  
  // NFT minting state
  const [recipientAddress, setRecipientAddress] = useState("")
  const [isMinting, setIsMinting] = useState(false)
  const [mintError, setMintError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  
  // Calculate average block times based on the last few blocks
  useEffect(() => {
    if (standardBlocks.length >= 2) {
      // Calculate average time between standard blocks
      let totalTime = 0
      let count = 0
      
      for (let i = 0; i < standardBlocks.length - 1; i++) {
        const currentTimestamp = parseInt(standardBlocks[i].timestamp, 16)
        const nextTimestamp = parseInt(standardBlocks[i + 1].timestamp, 16)
        
        if (currentTimestamp && nextTimestamp) {
          totalTime += Math.abs(currentTimestamp - nextTimestamp)
          count++
        }
      }
      
      if (count > 0) {
        const avgTime = (totalTime / count).toFixed(1)
        setStandardBlockTime(`~${avgTime}s`)
      }
    }
    
    // For flash blocks, we know they're around 200ms
    setFlashBlockTime("~0.2s")
  }, [standardBlocks])

  // Process flashblocks to extract index information
  useEffect(() => {
    if (flashBlocks.length > 0) {
      // Group flashblocks by index
      const indexCounts = new Map<number, number>()
      const payloadIds = new Set<string>()
      
      flashBlocks.forEach(block => {
        // Count occurrences of each index
        const index = block.index
        indexCounts.set(index, (indexCounts.get(index) || 0) + 1)
        
        // Track unique payload IDs
        payloadIds.add(block.payload_id)
      })
      
      // Convert to array for display
      const indexSummary: FlashBlockIndexSummary[] = Array.from(indexCounts.entries())
        .map(([index, count]) => ({ index, count }))
        .sort((a, b) => a.index - b.index)
      
      setFlashBlockIndexes(indexSummary)
      
      // Set the latest payload ID (from the most recent block)
      if (flashBlocks[0]) {
        setLatestPayloadId(flashBlocks[0].payload_id)
      }
    }
  }, [flashBlocks])

  // Handle NFT minting
  const handleMintNFT = async () => {
    if (!recipientAddress || !gameFinished) return;
    
    setIsMinting(true);
    setMintError(null);
    setTxHash(null);
    
    try {
      const result = await mintNFT(recipientAddress, score);
      
      if (result.success && result.txHash) {
        setTxHash(result.txHash);
      } else {
        setMintError(result.error || "Failed to mint NFT");
      }
    } catch (error) {
      setMintError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-5 w-full shadow-lg border border-gray-700/50 h-[800px] flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Stats Dashboard
        </h2>
        
        {isConnected ? (
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Connected
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </span>
        )}
      </div>

      <div className="space-y-5 overflow-y-auto flex-grow pr-1">
        <div className="bg-gradient-to-r from-blue-500/20 to-orange-500/20 rounded-xl p-4 shadow-inner">
          <h3 className="text-sm text-gray-300 mb-1">Your Score</h3>
          <p className="text-3xl font-bold text-glow">{score}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-500/20 rounded-xl p-4 shadow-inner">
            <h3 className="text-sm text-blue-300 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Standard Blocks
            </h3>
            <p className="text-2xl font-bold">{standardBlocksCaught}</p>
          </div>

          <div className="bg-orange-500/20 rounded-xl p-4 shadow-inner">
            <h3 className="text-sm text-orange-300 mb-1 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Flash Blocks
            </h3>
            <p className="text-2xl font-bold">{flashBlocksCaught}</p>
          </div>
        </div>

        {/* NFT Minting Section */}
        <div className="bg-purple-500/20 rounded-xl p-4 shadow-inner">
          <h3 className="text-sm text-purple-300 mb-3 flex items-center gap-1">
            <Award className="h-3 w-3" />
            Mint Your Achievement NFT
          </h3>
          
          {gameFinished ? (
            <>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Enter your Ethereum address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <button
                onClick={handleMintNFT}
                disabled={!recipientAddress || isMinting}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                  !recipientAddress || isMinting
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {isMinting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Minting...
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    Mint NFT with Score
                  </>
                )}
              </button>
              
              {mintError && (
                <div className="mt-2 text-red-400 text-xs">
                  Error: {mintError}
                </div>
              )}
              
              {txHash && (
                <div className="mt-2 text-green-400 text-xs flex items-center gap-1">
                  <span>Transaction successful!</span>
                  <a
                    href={getExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    View on explorer <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-400 text-sm">
              Complete the game to mint your achievement NFT
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm text-gray-300 font-medium">Network Stats</h3>

          <div className="flex justify-between items-center glass-effect rounded-xl p-3">
            <span className="text-sm">Standard Block Time:</span>
            <span className="text-sm font-bold text-blue-300">{standardBlockTime}</span>
          </div>

          <div className="flex justify-between items-center glass-effect rounded-xl p-3">
            <span className="text-sm">Flash Block Time:</span>
            <span className="text-sm font-bold text-orange-300">{flashBlockTime}</span>
          </div>

          <div className="flex justify-between items-center glass-effect rounded-xl p-3">
            <span className="text-sm">Speed Up:</span>
            <span className="text-sm font-bold text-blue-300">{`${10}x`}</span>
          </div>
          
          {/* Display Flash Block Indexes */}
          {flashBlockIndexes.length > 0 && (
            <div className="glass-effect rounded-xl p-3">
              <h4 className="text-sm text-orange-300 mb-2">Flash Block Indexes:</h4>
              <div className="flex flex-wrap gap-2">
                {flashBlockIndexes.map(({ index, count }) => (
                  <div key={index} className="px-2 py-1 bg-orange-500/20 rounded-md text-xs">
                    <span className="font-medium">Index {index}:</span> {count}
                  </div>
                ))}
              </div>
              {latestPayloadId && (
                <div className="mt-2 text-xs text-gray-400">
                  Latest Payload ID: {latestPayloadId.substring(0, 10)}...
                </div>
              )}
            </div>
          )}
          
          {connectionError && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-xs">
              {connectionError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



