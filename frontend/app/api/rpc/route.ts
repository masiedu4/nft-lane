import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { parseTransaction, recoverTransactionAddress } from "viem";

/**
 * Production JSON-RPC Bridge for Derived Lane
 *
 * This endpoint provides a minimal but functional Ethereum JSON-RPC interface
 * that bridges frontend transactions to the backend's /submit endpoint.
 *
 * Flow: Frontend → Viem Client → /api/rpc → Backend /submit → NFT Minting
 *
 * Supported Methods:
 * - eth_sendTransaction: Forwards transaction data to backend /submit
 * - eth_sendRawTransaction: Forwards signed transaction data to backend /submit
 * - eth_getTransactionCount: Returns nonce for account
 * - eth_chainId: Returns derived lane chain ID
 * - eth_estimateGas: Returns gas estimate
 * - eth_gasPrice: Returns gas price
 * - eth_getBalance: Returns account balance
 * - eth_getTransactionReceipt: Returns transaction receipt
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9545";
const CHAIN_ID = "0x7a69"; // 31337 in hex (Anvil default)

// In-memory transaction storage for receipts
const transactions = new Map<
  string,
  {
    hash: string;
    from: string;
    to: string;
    data: string;
    timestamp: number;
    status: "pending" | "success" | "failed";
    blockNumber: string;
  }
>();

// Simple nonce tracker per address
const nonces = new Map<string, number>();

// JSON-RPC error codes
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

interface EthTransaction {
  from?: string;
  to?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
  nonce?: string;
  value?: string;
}

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: (string | number | boolean | EthTransaction | null)[];
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: string;
  };
}

function log(message: string, data?: unknown) {
  // Cleaner, more readable log format
  const emoji = message.includes("✅")
    ? ""
    : message.includes("❌")
    ? ""
    : message.includes("📤")
    ? ""
    : message.includes("📦")
    ? ""
    : "→";
  if (data) {
    // For transaction data, show a cleaner format
    if (typeof data === "object" && data !== null && "from" in data) {
      const txData = data as { from?: string; to?: string; data?: string };
      console.log(
        `[RPC] ${emoji} ${message}`,
        `From: ${txData.from?.slice(0, 10)}... | To: ${txData.to?.slice(
          0,
          10
        )}...`
      );
    } else {
      console.log(`[RPC] ${emoji} ${message}`, data);
    }
  } else {
    console.log(`[RPC] ${emoji} ${message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: JsonRpcRequest = await request.json();

    // Validate JSON-RPC structure
    if (
      !body.jsonrpc ||
      body.jsonrpc !== "2.0" ||
      !body.method ||
      body.id === undefined
    ) {
      log("Invalid JSON-RPC request", body);
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id || null,
        error: {
          code: JSON_RPC_ERRORS.INVALID_REQUEST,
          message: "Invalid JSON-RPC request",
        },
      } as JsonRpcResponse);
    }

    log(`← ${body.method}`, body.params);

    // Handle different RPC methods
    switch (body.method) {
      case "eth_fillTransaction": {
        // Viem uses this to fill in missing transaction fields
        const [tx] = body.params || [];
        const txParam = tx as EthTransaction;
        const filledTx = {
          ...txParam,
          gas: txParam.gas || "0x5208",
          gasPrice: txParam.gasPrice || "0x3b9aca00",
          nonce: txParam.nonce || "0x0",
          chainId: CHAIN_ID,
        };
        log("→ eth_fillTransaction", filledTx);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: filledTx,
        } as JsonRpcResponse);
      }

      case "eth_getBlockByNumber": {
        const [blockNumber, fullTx] = body.params || ["latest", false];
        const block = {
          number: "0x1",
          hash: `0x${crypto
            .createHash("sha256")
            .update("block1")
            .digest("hex")}`,
          parentHash: `0x${"0".repeat(64)}`,
          timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
          gasLimit: "0x1c9c380",
          gasUsed: "0x5208",
          miner: "0x0000000000000000000000000000000000000000",
          difficulty: "0x0",
          totalDifficulty: "0x0",
          size: "0x200",
          transactions: fullTx ? [] : [],
          baseFeePerGas: "0x3b9aca00",
        };
        log(`→ eth_getBlockByNumber: ${blockNumber}`, block);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: block,
        } as JsonRpcResponse);
      }

      case "eth_getTransactionCount": {
        const [address] = body.params || [];
        const addressStr = address as string;
        if (!addressStr) {
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "Address is required",
            },
          } as JsonRpcResponse);
        }

        const nonce = nonces.get(addressStr.toLowerCase()) || 0;
        const hexNonce = `0x${nonce.toString(16)}`;
        log(`→ eth_getTransactionCount: ${hexNonce} for ${addressStr}`);

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: hexNonce,
        } as JsonRpcResponse);
      }

      case "eth_estimateGas": {
        // Return a reasonable gas estimate
        const gasEstimate = "0x5208"; // 21000 in hex (standard transfer)
        log(`→ eth_estimateGas: ${gasEstimate}`);

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: gasEstimate,
        } as JsonRpcResponse);
      }

      case "eth_gasPrice": {
        // Return 1 gwei
        const gasPrice = "0x3b9aca00"; // 1 gwei in hex
        log(`→ eth_gasPrice: ${gasPrice}`);

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: gasPrice,
        } as JsonRpcResponse);
      }

      case "eth_getBalance": {
        const [address] = body.params || [];
        const addressStr = address as string;
        // Return 1000 ETH for all addresses
        const balance = "0x3635c9adc5dea00000"; // 1000 ETH in hex
        log(`→ eth_getBalance: ${balance} for ${addressStr}`);

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: balance,
        } as JsonRpcResponse);
      }
      case "eth_sendTransaction": {
        // Extract transaction data
        const [tx] = body.params || [];
        const txParam = tx as EthTransaction;

        if (!txParam) {
          log("❌ Missing transaction");
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "Transaction is required",
            },
          } as JsonRpcResponse);
        }

        log("📤 Forwarding transaction to Derived Lane RPC", {
          from: txParam.from,
          to: txParam.to,
        });

        // Forward the transaction to the Derived Lane RPC
        // Note: eth_sendTransaction requires the transaction to be signed first
        // This is typically done by the wallet, so we forward it as-is
        const derivedLaneResponse = await fetch(BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            method: "eth_sendTransaction",
            params: [txParam],
          }),
        });

        if (!derivedLaneResponse.ok) {
          const errorText = await derivedLaneResponse.text();
          log("❌ Derived Lane RPC error", errorText);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INTERNAL_ERROR,
              message: "Backend submission failed",
              data: errorText,
            },
          } as JsonRpcResponse);
        }

        const derivedLaneResult = await derivedLaneResponse.json();

        if (derivedLaneResult.error) {
          log("❌ Derived Lane RPC returned error", derivedLaneResult.error);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code:
                derivedLaneResult.error.code || JSON_RPC_ERRORS.INTERNAL_ERROR,
              message:
                derivedLaneResult.error.message || "Backend submission failed",
              data: derivedLaneResult.error.data,
            },
          } as JsonRpcResponse);
        }

        const txHash = derivedLaneResult.result as string;
        log(
          `✅ Transaction successful! Hash: ${txHash.slice(
            0,
            10
          )}...${txHash.slice(-8)}`
        );

        // Store transaction for receipt lookup
        const blockNumber = "0x1";

        transactions.set(txHash, {
          hash: txHash,
          from: txParam.from || "0x0",
          to: txParam.to || "0x0000000000000000000000000000000000000042",
          data: txParam.data || "0x",
          timestamp: Date.now(),
          status: "success",
          blockNumber,
        });

        // Increment nonce for sender
        const fromAddress = (txParam.from || "0x0").toLowerCase();
        nonces.set(fromAddress, (nonces.get(fromAddress) || 0) + 1);

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: txHash,
        } as JsonRpcResponse);
      }

      case "eth_sendRawTransaction": {
        // Extract and decode signed raw transaction
        const [rawTx] = body.params || [];
        const rawTxHex = rawTx as string;

        if (!rawTxHex || typeof rawTxHex !== "string") {
          log("❌ Missing raw transaction");
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "Raw transaction is required",
            },
          } as JsonRpcResponse);
        }

        let parsedTx;
        let fromAddress: string;
        try {
          // Use Viem to parse the signed transaction
          const serializedTx = rawTxHex as `0x${string}`;
          parsedTx = parseTransaction(serializedTx);

          // Recover the sender address from the signature
          // Type assertion needed because rawTxHex is validated as a valid transaction
          fromAddress = await recoverTransactionAddress({
            serializedTransaction: serializedTx as `0x02${string}`,
          });

          log("📦 Parsed raw transaction", {
            from: fromAddress,
            to: parsedTx.to,
            data: parsedTx.data,
          });
        } catch (error) {
          log("❌ Failed to parse raw transaction", error);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "Invalid raw transaction format",
            },
          } as JsonRpcResponse);
        }

        if (!parsedTx.data || parsedTx.data === "0x") {
          log("❌ No data in raw transaction");
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "Transaction data is required",
            },
          } as JsonRpcResponse);
        }

        log("📤 Forwarding transaction to Derived Lane", {
          from: fromAddress,
          to: parsedTx.to,
        });

        // Forward the raw transaction to the Derived Lane RPC
        // The Derived Lane node will handle forwarding to Core Lane and execution
        const derivedLaneResponse = await fetch(BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            method: "eth_sendRawTransaction",
            params: [rawTxHex],
          }),
        });

        if (!derivedLaneResponse.ok) {
          const errorText = await derivedLaneResponse.text();
          log("❌ Derived Lane RPC error", errorText);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code: JSON_RPC_ERRORS.INTERNAL_ERROR,
              message: "Backend submission failed",
              data: errorText,
            },
          } as JsonRpcResponse);
        }

        const derivedLaneResult = await derivedLaneResponse.json();

        if (derivedLaneResult.error) {
          log("❌ Derived Lane RPC returned error", derivedLaneResult.error);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            error: {
              code:
                derivedLaneResult.error.code || JSON_RPC_ERRORS.INTERNAL_ERROR,
              message:
                derivedLaneResult.error.message || "Backend submission failed",
              data: derivedLaneResult.error.data,
            },
          } as JsonRpcResponse);
        }

        const txHash = derivedLaneResult.result as string;
        log(
          `✅ Transaction successful! Hash: ${txHash.slice(
            0,
            10
          )}...${txHash.slice(-8)}`
        );

        // Store transaction for receipt lookup
        const blockNumber = "0x1";

        transactions.set(txHash, {
          hash: txHash,
          from: fromAddress,
          to:
            (parsedTx.to as string) ||
            "0x0000000000000000000000000000000000000042",
          data: parsedTx.data || "0x",
          timestamp: Date.now(),
          status: "success",
          blockNumber,
        });

        // Increment nonce for sender
        nonces.set(
          fromAddress.toLowerCase(),
          (nonces.get(fromAddress.toLowerCase()) || 0) + 1
        );

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: txHash,
        } as JsonRpcResponse);
      }

      case "eth_chainId": {
        log(`→ eth_chainId: ${CHAIN_ID}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: CHAIN_ID,
        } as JsonRpcResponse);
      }

      case "eth_accounts": {
        log("→ eth_accounts: []");
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: [],
        } as JsonRpcResponse);
      }

      case "eth_blockNumber": {
        const blockNum = "0x1";
        log(`→ eth_blockNumber: ${blockNum}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: blockNum,
        } as JsonRpcResponse);
      }

      case "eth_getTransactionReceipt": {
        const [txHash] = body.params || [];
        const txHashStr = txHash as string;
        const tx = transactions.get(txHashStr);

        if (!tx) {
          log(`→ eth_getTransactionReceipt: null (not found: ${txHashStr})`);
          return NextResponse.json({
            jsonrpc: "2.0",
            id: body.id,
            result: null,
          } as JsonRpcResponse);
        }

        const receipt = {
          transactionHash: tx.hash,
          blockNumber: tx.blockNumber,
          blockHash: `0x${crypto
            .createHash("sha256")
            .update("block" + tx.blockNumber)
            .digest("hex")}`,
          transactionIndex: "0x0",
          from: tx.from,
          to: tx.to,
          gasUsed: "0x5208",
          cumulativeGasUsed: "0x5208",
          effectiveGasPrice: "0x3b9aca00",
          status: tx.status === "success" ? "0x1" : "0x0",
          logs: [],
          logsBloom: "0x" + "0".repeat(512),
          type: "0x2",
        };

        log(`→ eth_getTransactionReceipt: status=${tx.status}`, receipt);

        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          result: receipt,
        } as JsonRpcResponse);
      }

      default: {
        log(`❌ Unsupported method: ${body.method}`);
        return NextResponse.json({
          jsonrpc: "2.0",
          id: body.id,
          error: {
            code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            message: `Method ${body.method} not supported`,
          },
        } as JsonRpcResponse);
      }
    }
  } catch (error) {
    log("❌ RPC Error", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
    } as JsonRpcResponse);
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "nft-lane-rpc-bridge",
    backend: BACKEND_URL,
    chain_id: CHAIN_ID,
    transactions: transactions.size,
  });
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
