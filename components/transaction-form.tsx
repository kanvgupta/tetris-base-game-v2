"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  sendTransaction, 
  isTransactionConfirmed,
  TransactionReceipt 
} from "@/lib/blockchain"
import { ArrowRight, Clock, ExternalLink, Zap, AlertCircle, CheckCircle2 } from "lucide-react"

export function TransactionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txType, setTxType] = useState<"standard" | "flash">("standard")
  const [txResult, setTxResult] = useState<{
    hash: string
    confirmationTime: number
    network: string
    receipt?: TransactionReceipt | null
    confirmations?: number
    confirmed?: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPollingReceipt, setIsPollingReceipt] = useState(false)

  // Poll for transaction receipt if we have a transaction hash
  // Only needed for standard transactions - flash transactions are handled by WebSocket
  useEffect(() => {
    // Skip for flash transactions or if already confirmed or polling
    if (!txResult?.hash || txType === "flash" || txResult.confirmed || isPollingReceipt) return

    let isMounted = true
    let attempts = 0
    const maxAttempts = 120 // Increase max attempts for longer tracking with faster polling
    const startPollingTime = performance.now(); // Record when polling started
    
    const pollConfirmation = async () => {
      setIsPollingReceipt(true)
      
      try {
        while (isMounted && attempts < maxAttempts) {
          attempts++
          
          // Use the isTransactionConfirmed function
          const { confirmed, receipt, confirmations } = await isTransactionConfirmed(txResult.hash, txType);
          
          if (receipt && isMounted) {
            // If confirmed, update the confirmation time to reflect actual block inclusion time
            if (confirmed) {
              // Calculate time from transaction sent to confirmation
              // Subtract half the polling interval to account for average polling delay
              const rawConfirmationTime = (performance.now() - startPollingTime) / 1000;
              // Adjust for polling interval (on average, confirmation happens halfway between polls)
              const adjustedConfirmationTime = Math.max(0.001, rawConfirmationTime - 0.05);
              
              setTxResult(prev => prev ? { 
                ...prev, 
                receipt, 
                confirmations,
                confirmed,
                confirmationTime: adjustedConfirmationTime
              } : null);
              break;
            } else {
              // Just update receipt and confirmations if not yet confirmed
              setTxResult(prev => prev ? { 
                ...prev, 
                receipt, 
                confirmations,
                confirmed 
              } : null);
            }
          }
          
          // Wait before trying again - reduce to 100ms for more accurate timing
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Error polling for confirmation:", error)
        if (isMounted) {
          setError("Failed to get transaction confirmation")
        }
      } finally {
        if (isMounted) {
          setIsPollingReceipt(false)
        }
      }
    }
    
    // Start polling immediately
    pollConfirmation()
    
    return () => {
      isMounted = false
    }
  }, [txResult, txType, isPollingReceipt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // For flash transactions, sendTransaction will wait for WebSocket confirmation
      // For standard transactions, it returns immediately and we poll in the useEffect
      const result = await sendTransaction(txType)
      
      // For flash transactions, the result already includes the confirmation time
      // For standard transactions, we'll update this as we poll
      setTxResult({
        ...result,
        confirmed: txType === "flash", // Flash transactions are confirmed by the time we get here
      })
    } catch (error) {
      console.error("Transaction error:", error)
      setError("Failed to submit transaction. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-effect rounded-2xl p-5 w-full shadow-lg border border-gray-700/50">
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <ArrowRight className="h-5 w-5 text-orange-400" />
        Test Transaction
      </h2>

      <div className="flex flex-col md:flex-row gap-6">
        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <div className="space-y-3">
            <label className="text-sm text-gray-300 font-medium">Transaction Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  txType === "standard"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                    : "glass-effect text-gray-300 hover:bg-blue-500/20"
                }`}
                onClick={() => setTxType("standard")}
              >
                <Clock className="h-4 w-4" />
                Standard (2s)
              </button>

              <button
                type="button"
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  txType === "flash"
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                    : "glass-effect text-gray-300 hover:bg-orange-500/20"
                }`}
                onClick={() => setTxType("flash")}
              >
                <Zap className="h-4 w-4" />
                Flash (200ms)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-orange-500 hover:from-blue-600 hover:to-orange-600 text-white font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transform hover:scale-[1.02]"
          >
            {isSubmitting ? "Processing..." : "Submit Transaction"}
          </button>
          
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </form>

        {txResult && (
          <motion.div
            className="flex-1 p-4 glass-effect rounded-xl space-y-4 border border-gray-700/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-200">Transaction Result</h3>
              
              {txResult.confirmed ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Confirmed
                </span>
              ) : txResult.receipt ? (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300">
                  Processing ({txResult.confirmations || 0} confirmations)
                </span>
              ) : isPollingReceipt ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 flex items-center gap-1">
                  Confirmed...
                </span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-300">
                  Submitted
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Network:</span>
                  <span className={txType === "standard" ? "text-blue-300" : "text-orange-300"}>
                    {txResult.network}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Confirmation Time:</span>
                  <span className="font-bold text-white">{txResult.confirmationTime.toFixed(2)}s</span>
                </div>
                
                {txResult.receipt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Block Number:</span>
                    <span className="text-white">
                      {parseInt(txResult.receipt.blockNumber, 16).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {txResult.receipt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <span className={txResult.receipt.status === "0x1" ? "text-green-300" : "text-red-300"}>
                      {txResult.receipt.status === "0x1" ? "Success" : "Failed"}
                    </span>
                  </div>
                )}
                
                {txResult.confirmations !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Confirmations:</span>
                    <span className="text-white">{txResult.confirmations}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-gray-400">Transaction Hash:</span>
                <a
                  href={`https://sepolia.basescan.org/tx/${txResult.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 truncate flex items-center gap-1 bg-blue-500/10 p-2 rounded-lg"
                >
                  <span className="truncate">{txResult.hash}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-700/50 text-xs text-gray-400">
              <p>
                {txType === "standard" 
                  ? "Standard transactions are included in regular 2-second blocks." 
                  : "Flash transactions are included in 200ms Flashblocks for faster confirmations using WebSocket."}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

