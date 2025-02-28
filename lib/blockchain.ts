"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";

// Constants for Flashblocks API endpoints
const FLASHBLOCKS_WS_ENDPOINT = "wss://sepolia.flashblocks.base.org/ws";
const FLASHBLOCKS_RPC_ENDPOINT = "https://sepolia-preconf.base.org";
const STANDARD_RPC_ENDPOINT = "https://sepolia.base.org";

// Private key for transactions (should be stored securely in a real application)
const PRIVATE_KEY =
  "0x4e52f7040ffc8cc461ae3f173b477cd630070a28eef0cb0ada947011ebb51346";

// Types for Flashblocks data
export interface FlashblockInitial {
  payload_id: string;
  index: number;
  base: {
    parent_hash: string;
    fee_recipient: string;
    block_number: string;
    gas_limit: string;
    timestamp: string;
    base_fee_per_gas: string;
    // other base fields
  };
  diff: {
    state_root: string;
    block_hash: string;
    gas_used: string;
    transactions: string[];
    withdrawals: never[];
    // other diff fields
  };
  metadata: {
    block_number: number;
    new_account_balances: Record<string, string>;
    receipts: Record<string, Record<string, unknown>>;
  };
}

export interface FlashblockDiff {
  payload_id: string;
  index: number;
  diff: {
    state_root: string;
    block_hash: string;
    gas_used: string;
    transactions: string[];
    withdrawals: never[];
    // other diff fields
  };
  metadata: {
    block_number: number;
    new_account_balances: Record<string, string>;
    receipts: Record<string, Record<string, unknown>>;
  };
}

export type Flashblock = FlashblockInitial | FlashblockDiff;

export interface StandardBlock {
  number: string;
  hash: string;
  transactions: Record<string, unknown>[];
  timestamp: string;
  gasUsed: string;
  // other fields
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: string;
  status: string;
  gasUsed: string;
  // other fields
}

export interface BlockchainData {
  standardBlocks: StandardBlock[];
  flashBlocks: Flashblock[];
  latestStandardBlock: StandardBlock | null;
  latestFlashBlock: Flashblock | null;
  standardBlockCount: number;
  flashBlockCount: number;
  isConnected: boolean;
  connectionError: string | null;
}

// Custom hook for blockchain data
export function useBlockchainData(): BlockchainData {
  const [standardBlocks, setStandardBlocks] = useState<StandardBlock[]>([]);
  const [flashBlocks, setFlashBlocks] = useState<Flashblock[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const standardBlockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const flashBlockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const blockchainListenerId = useRef<string>(`blockchain-data-${Date.now()}`);

  // Function to fetch the latest standard block
  const fetchLatestStandardBlock = async () => {
    try {
      // Use only the latest tag for standard blocks
      const response = await fetch(STANDARD_RPC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: ["latest", true],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.result) {
        const newBlock: StandardBlock = data.result;
        setStandardBlocks((prev) => {
          // Only add if it's a new block
          if (prev.length === 0 || prev[0].number !== newBlock.number) {
            return [newBlock, ...prev].slice(0, 10); // Keep only the 10 most recent blocks
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error fetching latest standard block:", error);
    }
  };

  // Connect to WebSocket and set up standard block polling
  useEffect(() => {
    // Set up WebSocket connection for Flashblocks
    const setupWebSocketConnection = async () => {
      try {
        // Use the shared WebSocket connection
        await getConnectedWebSocket();
        setIsConnected(true);
        setConnectionError(null);

        // Add this component as a listener
        globalWsConnection.listeners.add(blockchainListenerId.current);

        // Set up event handler for flashblock messages
        const messageHandler = (event: CustomEvent) => {
          try {
            const flashblock: Flashblock = event.detail;

            console.log(
              `Processing flashblock: payload_id=${flashblock.payload_id}, index=${flashblock.index}`
            );

            // Add the new flashblock to the state
            setFlashBlocks((prev) => {
              // Check if we already have this block (by payload_id and index)
              const exists = prev.some(
                (block) =>
                  block.payload_id === flashblock.payload_id &&
                  block.index === flashblock.index
              );

              console.log(
                `Flashblock exists already? ${exists ? "Yes" : "No"}`
              );

              if (!exists) {
                // Add the new block to the array
                const updatedBlocks = [flashblock, ...prev];
                console.log(`Updated blocks count: ${updatedBlocks.length}`);

                // Group by payload_id
                const groupedByPayload = new Map<string, Flashblock[]>();

                updatedBlocks.forEach((block) => {
                  if (!groupedByPayload.has(block.payload_id)) {
                    groupedByPayload.set(block.payload_id, []);
                  }
                  groupedByPayload.get(block.payload_id)!.push(block);
                });

                console.log(
                  `Grouped by payload: ${groupedByPayload.size} unique payloads`
                );

                // Sort each group by index
                groupedByPayload.forEach((blocks) => {
                  blocks.sort((a, b) => a.index - b.index);
                });

                // Get unique payload_ids and sort them by timestamp (newest first)
                // For each payload, we'll use the timestamp from the index 0 block if available
                const payloadIds = Array.from(groupedByPayload.keys());
                payloadIds.sort((a, b) => {
                  const aBlocks = groupedByPayload.get(a)!;
                  const bBlocks = groupedByPayload.get(b)!;

                  // Find index 0 blocks for each payload
                  const aInitial = aBlocks.find((block) => block.index === 0);
                  const bInitial = bBlocks.find((block) => block.index === 0);

                  // If we have index 0 blocks, compare their timestamps
                  if (
                    aInitial &&
                    "base" in aInitial &&
                    bInitial &&
                    "base" in bInitial
                  ) {
                    const aTimestamp = parseInt(aInitial.base.timestamp, 16);
                    const bTimestamp = parseInt(bInitial.base.timestamp, 16);
                    return bTimestamp - aTimestamp; // Newest first
                  }

                  // If we don't have index 0 blocks, compare by block_number in metadata
                  const aBlockNumber = aBlocks[0]?.metadata?.block_number || 0;
                  const bBlockNumber = bBlocks[0]?.metadata?.block_number || 0;
                  return bBlockNumber - aBlockNumber; // Newest first
                });

                // Flatten the sorted groups into a single array
                const sortedBlocks: Flashblock[] = [];
                payloadIds.forEach((payloadId) => {
                  sortedBlocks.push(...groupedByPayload.get(payloadId)!);
                });

                const finalBlocks = sortedBlocks.slice(0, 50); // Keep only the 50 most recent flashblocks
                console.log(`Final blocks count: ${finalBlocks.length}`);

                // Count blocks by index for debugging
                const indexCounts: Record<number, number> = {};
                finalBlocks.forEach((block) => {
                  indexCounts[block.index] =
                    (indexCounts[block.index] || 0) + 1;
                });
                console.log(`Blocks by index: ${JSON.stringify(indexCounts)}`);

                return finalBlocks;
              }
              return prev;
            });
          } catch (error) {
            console.error("Error processing flashblock data:", error);
          }
        };

        // Add the event listener
        window.addEventListener(
          blockchainListenerId.current,
          messageHandler as EventListener
        );

        // Return cleanup function
        return () => {
          window.removeEventListener(
            blockchainListenerId.current,
            messageHandler as EventListener
          );
          globalWsConnection.listeners.delete(blockchainListenerId.current);
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        setConnectionError("Failed to connect to Flashblocks WebSocket");
        setIsConnected(false);
        return () => {};
      }
    };

    // Start WebSocket connection
    const cleanupWebSocket = setupWebSocketConnection();

    // Poll for standard blocks more frequently (every 1 second instead of 2)
    standardBlockIntervalRef.current = setInterval(
      fetchLatestStandardBlock,
      1000
    );

    // Initial fetch for standard blocks
    fetchLatestStandardBlock();

    // Cleanup
    return () => {
      cleanupWebSocket.then((cleanup) => cleanup());

      if (standardBlockIntervalRef.current) {
        clearInterval(standardBlockIntervalRef.current);
      }

      if (flashBlockIntervalRef.current) {
        clearInterval(flashBlockIntervalRef.current);
      }
    };
  }, []);

  return {
    standardBlocks,
    flashBlocks,
    latestStandardBlock: standardBlocks.length > 0 ? standardBlocks[0] : null,
    latestFlashBlock: flashBlocks.length > 0 ? flashBlocks[0] : null,
    standardBlockCount: standardBlocks.length,
    flashBlockCount: flashBlocks.length,
    isConnected,
    connectionError,
  };
}

// WebSocket connection manager
const globalWsConnection: {
  ws: WebSocket | null;
  isConnected: boolean;
  connectionPromise: Promise<WebSocket> | null;
  connectionResolve: ((ws: WebSocket) => void) | null;
  connectionReject: ((error: Error) => void) | null;
  listeners: Set<string>;
} = {
  ws: null,
  isConnected: false,
  connectionPromise: null,
  connectionResolve: null,
  connectionReject: null,
  listeners: new Set(),
};

// Function to get a connected WebSocket
export function getConnectedWebSocket(): Promise<WebSocket> {
  // If we already have a connected WebSocket, return it
  if (globalWsConnection.ws && globalWsConnection.isConnected) {
    return Promise.resolve(globalWsConnection.ws);
  }

  // If we're already connecting, return the existing promise
  if (globalWsConnection.connectionPromise) {
    return globalWsConnection.connectionPromise;
  }

  // Create a new connection promise
  globalWsConnection.connectionPromise = new Promise<WebSocket>(
    (resolve, reject) => {
      globalWsConnection.connectionResolve = resolve;
      globalWsConnection.connectionReject = reject;

      try {
        // Close any existing connection
        if (globalWsConnection.ws) {
          globalWsConnection.ws.close();
          globalWsConnection.ws = null;
        }

        // Create a new WebSocket connection
        const ws = new WebSocket(FLASHBLOCKS_WS_ENDPOINT);
        globalWsConnection.ws = ws;

        ws.onopen = () => {
          console.log("Global WebSocket connected to Flashblocks");
          globalWsConnection.isConnected = true;
          if (globalWsConnection.connectionResolve) {
            globalWsConnection.connectionResolve(ws);
          }
        };

        ws.onclose = () => {
          console.log("Global WebSocket connection closed");
          globalWsConnection.isConnected = false;
          globalWsConnection.ws = null;
          globalWsConnection.connectionPromise = null;
          globalWsConnection.connectionResolve = null;
          globalWsConnection.connectionReject = null;

          // Reconnect after a delay if we have active listeners
          if (globalWsConnection.listeners.size > 0) {
            setTimeout(() => {
              getConnectedWebSocket().catch(console.error);
            }, 5000);
          }
        };

        ws.onerror = (error) => {
          console.error("Global WebSocket error:", error);
          if (globalWsConnection.connectionReject) {
            globalWsConnection.connectionReject(
              new Error("WebSocket connection failed")
            );
          }
        };

        ws.onmessage = async (event) => {
          try {
            // Handle the message data which could be a Blob or string
            let jsonData: string;

            if (event.data instanceof Blob) {
              // If it's a Blob, read it as text first
              jsonData = await event.data.text();
            } else {
              // If it's already a string
              jsonData = event.data;
            }

            // Now parse the JSON string
            const flashblock: Flashblock = JSON.parse(jsonData);

            // Log the received flashblock for debugging
            console.log(
              `Received flashblock: payload_id=${flashblock.payload_id}, index=${flashblock.index}`
            );

            // Dispatch to any listeners
            // Convert Set to Array to avoid iteration issues
            Array.from(globalWsConnection.listeners).forEach((listener) => {
              // Use a custom event to dispatch the flashblock data
              const customEvent = new CustomEvent(listener, {
                detail: flashblock,
              });
              window.dispatchEvent(customEvent);
            });
          } catch (error) {
            console.error("Error parsing flashblock data:", error);
          }
        };
      } catch (error) {
        console.error("Error setting up WebSocket:", error);
        if (globalWsConnection.connectionReject) {
          globalWsConnection.connectionReject(
            new Error("Failed to set up WebSocket connection")
          );
        }
      }
    }
  );

  return globalWsConnection.connectionPromise;
}

// Function to send a transaction
export async function sendTransaction(type: "standard" | "flash"): Promise<{
  hash: string;
  confirmationTime: number;
  network: string;
}> {
  const startTime = performance.now();

  try {
    // Always use the standard RPC endpoint for sending transactions
    // The Flashblocks endpoint doesn't support eth_sendRawTransaction
    const provider = new ethers.providers.JsonRpcProvider(
      STANDARD_RPC_ENDPOINT
    );

    // If this is a flash transaction, ensure WebSocket is connected first
    if (type === "flash") {
      try {
        console.log(
          "Ensuring WebSocket connection before sending flash transaction..."
        );
        await getConnectedWebSocket();
        console.log("WebSocket connected successfully");
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
        throw new Error(
          "Failed to connect to Flashblocks WebSocket. Cannot send flash transaction."
        );
      }
    }

    // Create wallet from private key
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Get wallet address from private key
    const walletAddress = wallet.address;
    console.log(`Using wallet address: ${walletAddress}`);

    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    console.log(
      `Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`
    );

    // Create a random recipient address (for demonstration)
    // In a real app, you would use a specific address
    const randomAddress = ethers.Wallet.createRandom().address;

    // Create transaction object - sending 1 wei
    const tx = {
      to: randomAddress,
      value: 1, // 1 wei
      gasPrice: gasPrice,
      gasLimit: ethers.utils.hexlify(21000), // Standard gas limit for simple transfers
    };

    console.log(`Sending 1 wei to ${randomAddress}`);

    // Send transaction
    const transaction = await wallet.sendTransaction(tx);
    console.log(`Transaction sent: ${transaction.hash}`);

    // For flash transactions, we'll use the WebSocket to track confirmation
    // For standard transactions, we'll just return immediately and let the UI handle polling
    if (type === "flash") {
      // We need to wait for the transaction to be confirmed in a flashblock
      // We'll use a promise to make this function async/await compatible
      return new Promise((resolve) => {
        const cleanupPromise = trackFlashTransactionConfirmation(
          transaction.hash,
          (receipt, confirmationTime) => {
            // Transaction confirmed via WebSocket
            resolve({
              hash: transaction.hash,
              confirmationTime,
              network: "Base Sepolia Flashblocks",
            });
          },
          (error) => {
            console.error("Error tracking flash transaction:", error);

            // If WebSocket tracking fails, fall back to the polling method
            let confirmed = false;
            let attempts = 0;
            const maxAttempts = 100; // Increase max attempts for better fallback

            const pollReceipt = async () => {
              while (!confirmed && attempts < maxAttempts) {
                attempts++;

                try {
                  const receipt = await getTransactionReceipt(
                    transaction.hash,
                    "flash"
                  );

                  if (receipt && receipt.status === "0x1") {
                    confirmed = true;
                    const endTime = performance.now();
                    const confirmationTime = (endTime - startTime) / 1000;

                    resolve({
                      hash: transaction.hash,
                      confirmationTime,
                      network: "Base Sepolia Flashblocks",
                    });
                    return;
                  }
                } catch (err) {
                  console.error("Error polling for receipt:", err);
                }

                // Wait before trying again - faster polling (100ms)
                await new Promise((r) => setTimeout(r, 100));
              }

              // If we've reached max attempts without confirmation, resolve anyway
              const endTime = performance.now();
              resolve({
                hash: transaction.hash,
                confirmationTime: (endTime - startTime) / 1000,
                network: "Base Sepolia Flashblocks",
              });
            };

            // Start polling as fallback
            pollReceipt();
          }
        );

        // Set a timeout to clean up the WebSocket if it takes too long
        setTimeout(async () => {
          const cleanup = await cleanupPromise;
          cleanup();
          // Don't reject here, let the polling fallback handle it
        }, 30000); // 30 seconds timeout
      });
    }

    // For standard transactions, just return immediately
    const endTime = performance.now();
    const submissionTime = (endTime - startTime) / 1000; // Convert to seconds

    return {
      hash: transaction.hash,
      // For standard transactions, this initial confirmationTime will be replaced
      // by the UI component with the actual time from transaction sent to confirmation
      confirmationTime: submissionTime,
      network:
        type === "standard"
          ? "Base Sepolia Standard"
          : "Base Sepolia Flashblocks",
    };
  } catch (error) {
    console.error("Transaction error:", error);
    throw error;
  }
}

// Function to get transaction receipt with confirmation count
export async function getTransactionReceipt(
  txHash: string,
  type: "standard" | "flash" = "standard"
): Promise<TransactionReceipt | null> {
  try {
    // Use the appropriate endpoint based on transaction type
    const endpoint =
      type === "standard" ? STANDARD_RPC_ENDPOINT : FLASHBLOCKS_RPC_ENDPOINT;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: 1,
      }),
    });

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Error getting transaction receipt:", error);
    return null;
  }
}

// Function to check if a transaction is confirmed
export async function isTransactionConfirmed(
  txHash: string,
  type: "standard" | "flash" = "standard"
): Promise<{
  confirmed: boolean;
  receipt: TransactionReceipt | null;
  confirmations: number;
}> {
  try {
    // Get the transaction receipt
    const receipt = await getTransactionReceipt(txHash, type);

    if (!receipt) {
      return { confirmed: false, receipt: null, confirmations: 0 };
    }

    // For flash transactions, we need to check if it's in a flashblock
    if (type === "flash") {
      // For flash transactions, a receipt with status 0x1 from the preconf endpoint means it's confirmed
      // We can also check if the transaction is in the latest block
      const latestBlockResponse = await fetch(FLASHBLOCKS_RPC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: ["latest", true],
          id: 1,
        }),
      });

      const latestBlockData = await latestBlockResponse.json();

      if (latestBlockData.result && latestBlockData.result.transactions) {
        // Check if our transaction is in the latest block's transactions
        const isInLatestBlock = latestBlockData.result.transactions.some(
          (tx: { hash: string } | string) => {
            const txHash = typeof tx === "string" ? tx : tx.hash;
            return (
              txHash.toLowerCase() === receipt.transactionHash.toLowerCase()
            );
          }
        );

        // If it's in the latest block and has status 0x1, it's confirmed in a flashblock
        if (isInLatestBlock && receipt.status === "0x1") {
          return {
            confirmed: true,
            receipt,
            confirmations: 1,
          };
        }
      }

      // If it has a receipt with status 0x1 but is not in the latest block,
      // it might be already included in a standard block
      if (receipt.status === "0x1") {
        return {
          confirmed: true,
          receipt,
          confirmations: 1,
        };
      }

      return {
        confirmed: false,
        receipt,
        confirmations: 0,
      };
    }

    // For standard transactions, a receipt with status 0x1 means it's confirmed
    // We can optimize by avoiding the extra blockNumber call in most cases
    if (receipt.status === "0x1") {
      // Only get the current block number if we need confirmations count
      // For basic confirmation check, we can just return true
      try {
        // For standard transactions, we need to check the current block number
        const endpoint = STANDARD_RPC_ENDPOINT;
        const blockNumberResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        });

        const blockNumberData = await blockNumberResponse.json();
        const currentBlockNumber = parseInt(blockNumberData.result, 16);
        const txBlockNumber = parseInt(receipt.blockNumber, 16);

        const confirmations = currentBlockNumber - txBlockNumber + 1;

        return {
          confirmed: true,
          receipt,
          confirmations,
        };
      } catch (error) {
        // If getting block number fails, still return confirmed with default confirmations
        console.error("Error getting block number:", error);
        return {
          confirmed: true,
          receipt,
          confirmations: 1,
        };
      }
    }

    return {
      confirmed: false,
      receipt,
      confirmations: 0,
    };
  } catch (error) {
    console.error("Error checking transaction confirmation:", error);
    return { confirmed: false, receipt: null, confirmations: 0 };
  }
}

// Function to get account balance
export async function getAccountBalance(
  address: string,
  type: "standard" | "flash" = "standard"
): Promise<string> {
  try {
    // Use the appropriate endpoint and blockTag based on transaction type
    const endpoint =
      type === "standard" ? STANDARD_RPC_ENDPOINT : FLASHBLOCKS_RPC_ENDPOINT;
    const blockTag = type === "standard" ? "latest" : "latest";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, blockTag],
        id: 1,
      }),
    });

    const data = await response.json();
    return data.result || "0x0";
  } catch (error) {
    console.error("Error getting account balance:", error);
    return "0x0";
  }
}

// Function to track a flash transaction confirmation via WebSocket
export async function trackFlashTransactionConfirmation(
  txHash: string,
  onConfirmed: (
    receipt: Record<string, unknown>,
    confirmationTime: number
  ) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const startTime = performance.now();
  const listenerId = `tx-${txHash}-${Date.now()}`;

  try {
    // Ensure we have a connected WebSocket
    await getConnectedWebSocket();

    // Add this transaction to the listeners
    globalWsConnection.listeners.add(listenerId);

    console.log(`Tracking transaction ${txHash} via WebSocket`);

    // Set up event listener for this transaction
    const messageHandler = (event: CustomEvent) => {
      try {
        const flashblock = event.detail as Flashblock;

        // Check if this flashblock contains our transaction
        let transactionIncluded = false;
        let transactionReceipt = null;

        // Check in the transactions array
        if ("diff" in flashblock && flashblock.diff.transactions) {
          transactionIncluded = flashblock.diff.transactions.some(
            (tx) =>
              typeof tx === "string" &&
              tx.includes(txHash.substring(2).toLowerCase())
          );
        }

        // Check in the receipts object
        if ("metadata" in flashblock && flashblock.metadata.receipts) {
          const receipts = flashblock.metadata.receipts;

          // The transaction hash might be a key in the receipts object
          if (receipts[txHash]) {
            transactionIncluded = true;
            transactionReceipt = receipts[txHash];
          }

          // Or it might be in one of the nested objects
          for (const key in receipts) {
            if (key.toLowerCase() === txHash.toLowerCase()) {
              transactionIncluded = true;
              transactionReceipt = receipts[key];
              break;
            }
          }
        }

        if (transactionIncluded) {
          console.log(`Transaction ${txHash} found in flashblock!`, flashblock);

          // Calculate confirmation time
          const confirmationTime = (performance.now() - startTime) / 1000;

          // Call the callback with the receipt and confirmation time
          onConfirmed(
            transactionReceipt || { status: "0x1" },
            confirmationTime
          );

          // Clean up the listener
          window.removeEventListener(
            listenerId,
            messageHandler as EventListener
          );
          globalWsConnection.listeners.delete(listenerId);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    // Add the event listener
    window.addEventListener(listenerId, messageHandler as EventListener);

    // Return a cleanup function
    return () => {
      window.removeEventListener(listenerId, messageHandler as EventListener);
      globalWsConnection.listeners.delete(listenerId);
      console.log(`Stopped tracking transaction ${txHash}`);
    };
  } catch (error) {
    console.error("Error setting up transaction tracking:", error);
    onError(new Error("Failed to set up transaction tracking"));
    return () => {}; // Return empty cleanup function
  }
}
