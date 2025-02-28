import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ABI for the NFT contract's mint function
const NFT_ABI = parseAbi(["function mint(address to, uint256 score) external"]);

// Default Base Sepolia RPC URL
const DEFAULT_BASE_SEPOLIA_RPC = "https://sepolia.base.org";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { toAddress, score, rpcUrl } = body;

    // Validate input
    if (!toAddress || !score) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (!isAddress(toAddress)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    // Get environment variables
    const contractAddress =
      process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
      "0x657eF6d2173313d4F6F4FF53d6561Cc58Fe968dE";

    // Debug environment variables (without revealing the actual key)
    console.log("Environment variables check:");
    console.log(
      `- NEXT_PUBLIC_NFT_CONTRACT_ADDRESS exists: ${!!process.env
        .NEXT_PUBLIC_NFT_CONTRACT_ADDRESS}`
    );
    console.log(`- PRIVATE_KEY exists: ${!!process.env.PRIVATE_KEY}`);

    // Get private key from environment or use a fallback for development
    // WARNING: NEVER use hardcoded private keys in production!
    const privateKey =
      process.env.PRIVATE_KEY || "YOUR_FALLBACK_PRIVATE_KEY_FOR_DEVELOPMENT";

    if (
      !privateKey ||
      privateKey === "YOUR_FALLBACK_PRIVATE_KEY_FOR_DEVELOPMENT"
    ) {
      console.error("Private key not found in environment variables");
      return NextResponse.json(
        {
          error:
            "Server configuration error: Missing private key in environment variables",
        },
        { status: 500 }
      );
    }

    // Format and validate the private key
    let formattedPrivateKey = privateKey.trim();

    // Ensure it starts with 0x
    if (!formattedPrivateKey.startsWith("0x")) {
      formattedPrivateKey = `0x${formattedPrivateKey}`;
    }

    // Check if it's a valid length for a private key (should be 66 chars including 0x)
    if (formattedPrivateKey.length !== 66) {
      console.error(
        `Invalid private key length: ${formattedPrivateKey.length} (expected 66)`
      );
      return NextResponse.json(
        {
          error: "Server configuration error: Invalid private key format",
          details: `Private key has incorrect length: ${formattedPrivateKey.length} (expected 66)`,
          success: false,
        },
        { status: 500 }
      );
    }

    // Log private key format (safely)
    console.log(
      `Private key format check: starts with 0x: ${formattedPrivateKey.startsWith(
        "0x"
      )}, length: ${formattedPrivateKey.length}`
    );

    // Use the RPC URL from the client or fall back to the default
    const baseSepoliaRpc = rpcUrl || DEFAULT_BASE_SEPOLIA_RPC;

    console.log(`Connecting to Base Sepolia at ${baseSepoliaRpc}`);
    console.log(`Contract address: ${contractAddress}`);
    console.log(`Minting NFT for address: ${toAddress} with score: ${score}`);

    // Create account from private key
    try {
      const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
      console.log(`Successfully created account from private key`);
      console.log(`Account address: ${account.address}`);

      // Create public client for reading from the blockchain
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(baseSepoliaRpc),
      });

      // Create wallet client for sending transactions
      const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(baseSepoliaRpc),
      });

      // Test the connection
      try {
        const blockNumber = await publicClient.getBlockNumber();
        console.log(
          `Connected to network. Current block number: ${blockNumber}`
        );
      } catch (networkError) {
        console.error("Network connection error:", networkError);
        return NextResponse.json(
          {
            error:
              "Failed to connect to Base Sepolia network. Please try again later.",
            details: String(networkError),
            success: false,
          },
          { status: 500 }
        );
      }

      console.log(`Using wallet address: ${account.address}`);

      // Call mint function
      console.log("Sending mint transaction...");
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: NFT_ABI,
        functionName: "mint",
        args: [toAddress as `0x${string}`, BigInt(score)],
      });

      console.log(`Transaction sent: ${hash}`);

      // Wait for transaction to be mined
      console.log("Waiting for transaction confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Return transaction hash
      return NextResponse.json({
        success: true,
        txHash: hash,
      });
    } catch (accountError) {
      console.error("Error creating account from private key:", accountError);

      // Provide more detailed error information based on the error type
      let errorDetails = String(accountError);

      if (errorDetails.includes("invalid hexadecimal")) {
        errorDetails =
          "Private key contains invalid characters. It should be a hexadecimal string.";
      } else if (errorDetails.includes("expected byte array")) {
        errorDetails =
          "Private key has an invalid format. Check that it's a valid Ethereum private key.";
      }

      // Log a masked version of the key for debugging (showing only first and last 4 chars)
      const maskedKey =
        formattedPrivateKey.length > 10
          ? `${formattedPrivateKey.substring(
              0,
              6
            )}...${formattedPrivateKey.substring(
              formattedPrivateKey.length - 4
            )}`
          : "[key too short]";

      console.error(`Failed with key format: ${maskedKey}`);

      return NextResponse.json(
        {
          error: "Failed to create account from private key",
          details: errorDetails,
          success: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error minting NFT:", error);

    // Provide more detailed error information
    let errorMessage = "Unknown error occurred";
    let errorDetails = null;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for specific error types
      if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout")
      ) {
        errorMessage = "Network connection error. Please try again later.";
        errorDetails = "Could not connect to Base Sepolia network";
      } else if (errorMessage.includes("insufficient funds")) {
        errorMessage = "Wallet has insufficient funds to mint the NFT";
      } else if (errorMessage.includes("reverted")) {
        errorMessage =
          "Contract execution failed. The NFT could not be minted.";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        success: false,
      },
      { status: 500 }
    );
  }
}
