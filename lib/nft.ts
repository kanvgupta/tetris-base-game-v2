"use client";

// Get environment variables
const getEnvVars = () => {
  const contractAddress =
    process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
    "0x657eF6d2173313d4F6F4FF53d6561Cc58Fe968dE";
  const explorerUrl =
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.basescan.org";
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

  return { contractAddress, explorerUrl, rpcUrl };
};

// Function to mint an NFT with the user's score
export async function mintNFT(
  toAddress: string,
  score: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { rpcUrl } = getEnvVars();

    // For client-side, we need to make a server request to handle the private key securely
    const response = await fetch("/api/mint-nft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toAddress,
        score,
        rpcUrl, // Pass the RPC URL to the API
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to mint NFT");
    }

    return {
      success: true,
      txHash: data.txHash,
    };
  } catch (error) {
    console.error("Error minting NFT:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Function to get the explorer URL for a transaction
export function getExplorerUrl(txHash: string): string {
  const { explorerUrl } = getEnvVars();
  return `${explorerUrl}/tx/${txHash}`;
}
