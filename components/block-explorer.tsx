"use client"

import { useState, useEffect } from "react"
import { useBlockchainData } from "@/lib/blockchain"
import { Clock, Zap, ArrowRight, ExternalLink, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export function BlockExplorer() {
  const [activeTab, setActiveTab] = useState<"standard" | "flash">("standard")
  const { standardBlocks, flashBlocks, connectionError } = useBlockchainData()
  const [showFallbackData, setShowFallbackData] = useState(false)
  
  // Log flash blocks whenever they change
  useEffect(() => {
    if (flashBlocks.length > 0) {
      console.log(`BlockExplorer received ${flashBlocks.length} flash blocks`);
      
      // Count blocks by index for debugging
      const indexCounts: Record<number, number> = {};
      flashBlocks.forEach(block => {
        indexCounts[block.index] = (indexCounts[block.index] || 0) + 1;
      });
      
      console.log(`Flash blocks by index: ${JSON.stringify(indexCounts)}`);
    }
  }, [flashBlocks]);
  
  // Set up a timer to show fallback data if no real data is available after a timeout
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if ((activeTab === "standard" && standardBlocks.length === 0) || 
        (activeTab === "flash" && flashBlocks.length === 0)) {
      timer = setTimeout(() => {
        setShowFallbackData(true);
      }, 3000); // Show fallback data after 3 seconds if no real data (reduced from 10s)
    } else {
      setShowFallbackData(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [activeTab, standardBlocks.length, flashBlocks.length]);

  // Create fallback data arrays for display
  const mockStandardBlocks = Array(5).fill(null).map((_, i) => ({
    number: `0x${(22585577 - i).toString(16)}`,
    hash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
    timestamp: `0x${(Math.floor(Date.now() / 1000) - i * 2).toString(16)}`,
    transactions: [],
    gasUsed: `0x${(Math.floor(Math.random() * 100000)).toString(16)}`,
  }));
  
  // Create mock flash blocks with different indexes
  const mockFlashBlocks = [];
  
  // Create 3 different payload groups
  for (let p = 0; p < 3; p++) {
    const payloadId = `0x${Math.random().toString(16).substring(2).padStart(16, '0')}`;
    const blockNumber = 22585577 - p;
    const timestamp = Math.floor(Date.now() / 1000) - p * 10;
    
    // For each payload, create blocks with indexes 0-4
    for (let i = 0; i < 5; i++) {
      if (i === 0) {
        // Index 0 block has base info
        mockFlashBlocks.push({
          payload_id: payloadId,
          index: i,
          base: {
            parent_hash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
            fee_recipient: "0x4200000000000000000000000000000000000011",
            block_number: `0x${blockNumber.toString(16)}`,
            gas_limit: "0x3938700",
            timestamp: `0x${timestamp.toString(16)}`,
            base_fee_per_gas: "0xfa"
          },
          diff: {
            state_root: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
            block_hash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
            gas_used: `0x${(Math.floor(Math.random() * 100000)).toString(16)}`,
            transactions: [`0x${Math.random().toString(16).substring(2).padStart(64, '0')}`],
            withdrawals: []
          },
          metadata: {
            block_number: blockNumber,
            new_account_balances: {},
            receipts: {}
          }
        });
      } else {
        // Index > 0 blocks only have diff info
        mockFlashBlocks.push({
          payload_id: payloadId,
          index: i,
          diff: {
            state_root: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
            block_hash: `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`,
            gas_used: `0x${(Math.floor(Math.random() * 100000)).toString(16)}`,
            transactions: [`0x${Math.random().toString(16).substring(2).padStart(64, '0')}`],
            withdrawals: []
          },
          metadata: {
            block_number: blockNumber,
            new_account_balances: {},
            receipts: {}
          }
        });
      }
    }
  }

  // Determine which blocks to display
  const displayStandardBlocks = standardBlocks.length > 0 ? standardBlocks : (showFallbackData ? mockStandardBlocks : []);
  const displayFlashBlocks = flashBlocks.length > 0 ? flashBlocks : (showFallbackData ? mockFlashBlocks : []);

  // Group flash blocks by payload_id for better display
  const groupedFlashBlocks = displayFlashBlocks.reduce<Record<string, typeof displayFlashBlocks>>((groups, block) => {
    const payloadId = block.payload_id;
    if (!groups[payloadId]) {
      groups[payloadId] = [];
    }
    groups[payloadId].push(block);
    return groups;
  }, {});

  // Sort each group by index
  Object.values(groupedFlashBlocks).forEach(group => {
    group.sort((a, b) => a.index - b.index);
  });

  // Get an array of payload IDs sorted by the block_number of the first block in each group (newest first)
  const sortedPayloadIds = Object.keys(groupedFlashBlocks).sort((a, b) => {
    // Find index 0 blocks for each payload
    const aInitial = groupedFlashBlocks[a].find(block => block.index === 0);
    const bInitial = groupedFlashBlocks[b].find(block => block.index === 0);
    
    // If we have index 0 blocks with base info, compare their timestamps
    if (aInitial && 'base' in aInitial && bInitial && 'base' in bInitial && aInitial.base && bInitial.base) {
      const aTimestamp = parseInt(aInitial.base.timestamp, 16);
      const bTimestamp = parseInt(bInitial.base.timestamp, 16);
      return bTimestamp - aTimestamp; // Newest first
    }
    
    // Otherwise, compare by block_number in metadata
    const aBlockNumber = groupedFlashBlocks[a][0]?.metadata?.block_number || 0;
    const bBlockNumber = groupedFlashBlocks[b][0]?.metadata?.block_number || 0;
    return bBlockNumber - aBlockNumber; // Newest first
  });

  // Count total blocks and blocks by index
  const totalBlocks = displayFlashBlocks.length;
  const blocksByIndex = displayFlashBlocks.reduce((counts: Record<number, number>, block) => {
    counts[block.index] = (counts[block.index] || 0) + 1;
    return counts;
  }, {});
  
  const indexCounts = Object.entries(blocksByIndex)
    .map(([index, count]) => `index ${index}: ${count}`)
    .join(", ");

  console.log(`Displaying ${Object.keys(groupedFlashBlocks).length} payload groups with ${totalBlocks} total blocks (${indexCounts})`);

  return (
    <div className="glass-effect rounded-2xl p-5 w-full shadow-lg border border-gray-700/50">
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <ArrowRight className="h-5 w-5 text-orange-400" />
        Block Explorer
      </h2>

      {connectionError && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">Connection Error</p>
            <p className="text-xs mt-1">{connectionError}</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("standard")}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "standard"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                : "glass-effect text-gray-300 hover:bg-blue-500/20"
            }`}
          >
            <Clock className="h-4 w-4" />
            Standard Blocks (2s)
          </button>

          <button
            onClick={() => setActiveTab("flash")}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === "flash"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                : "glass-effect text-gray-300 hover:bg-orange-500/20"
            }`}
          >
            <Zap className="h-4 w-4" />
            Flash Blocks (200ms)
          </button>
        </div>

        {/* Block List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === "standard" ? (
            displayStandardBlocks.length > 0 ? (
              displayStandardBlocks.map((block, index) => (
                <motion.div
                  key={`${block.hash}-${index}`}
                  className="glass-effect rounded-xl p-3 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-blue-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Block #{parseInt(block.number, 16).toLocaleString()}
                    </h3>
                    <a
                      href={`https://sepolia.basescan.org/block/${parseInt(block.number, 16)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timestamp:</span>
                        <span className="text-white">
                          {new Date(parseInt(block.timestamp, 16) * 1000).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transactions:</span>
                        <span className="text-white">{block.transactions.length}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Gas Used:</span>
                        <span className="text-white">{parseInt(block.gasUsed || '0', 16).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Hash:</span>
                        <span className="text-white truncate w-20">{block.hash.substring(0, 10)}...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>Waiting for standard blocks...</p>
              </div>
            )
          ) : displayFlashBlocks.length > 0 ? (
            sortedPayloadIds.map((payloadId) => (
              <div key={payloadId} className="mb-4">
                <div className="text-xs text-orange-300 mb-2 flex items-center">
                  <span className="bg-orange-500/20 px-2 py-1 rounded">Payload: {payloadId.substring(0, 10)}...</span>
                  <span className="ml-2 text-gray-400">({groupedFlashBlocks[payloadId].length} blocks)</span>
                </div>
                
                <div className="space-y-2 pl-2 border-l-2 border-orange-500/30">
                  {groupedFlashBlocks[payloadId].map((block, blockIndex) => (
                    <motion.div
                      key={`${block.payload_id}-${block.index}`}
                      className={`glass-effect rounded-xl p-3 border ${
                        block.index === 0 
                          ? "border-orange-500/50" 
                          : "border-gray-700/50 hover:border-orange-500/30"
                      } transition-all duration-300`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: blockIndex * 0.05 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-orange-300 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Flash Block #{block.metadata?.block_number.toLocaleString()} 
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            block.index === 0 
                              ? "bg-orange-500/30 text-orange-200" 
                              : "bg-gray-700/50 text-gray-300"
                          }`}>
                            Index: {block.index}
                          </span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Transactions:</span>
                            <span className="text-white">{block.diff?.transactions?.length || 0}</span>
                          </div>
                          {block.index > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Incremental:</span>
                              <span className="text-white">Yes</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Gas Used:</span>
                            <span className="text-white">{parseInt(block.diff?.gas_used || '0', 16).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Block Hash:</span>
                            <span className="text-white truncate w-20">
                              {block.diff?.block_hash ? block.diff.block_hash.substring(0, 10) + '...' : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {block.index === 0 && 'base' in block && block.base && (
                        <div className="mt-2 pt-2 border-t border-gray-700/50">
                          <div className="text-xs text-orange-300 mb-1">Base Block Info:</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Parent Hash:</span>
                                <span className="text-white truncate w-20">
                                  {block.base.parent_hash.substring(0, 10)}...
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Gas Limit:</span>
                                <span className="text-white">{parseInt(block.base.gas_limit, 16).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Timestamp:</span>
                                <span className="text-white">
                                  {new Date(parseInt(block.base.timestamp, 16) * 1000).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Base Fee:</span>
                                <span className="text-white">
                                  {parseInt(block.base.base_fee_per_gas, 16).toLocaleString()} wei
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>Waiting for flash blocks...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 