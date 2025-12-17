
import { createWalletClient, http, defineChain, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Derived Lane Chain Definition
export const derivedLane = defineChain({
  id: 31337, // Default Anvil chain ID. If derived lane uses something else, we might need to change this.
  name: 'Derived Lane',
  network: 'derived-lane',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:3000/api/rpc'],
    },
    public: {
      http: ['http://localhost:3000/api/rpc'],
    },
  },
});

// Default Dev Private Key (Anvil Account #2)
// 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
const DEFAULT_DEV_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const DERIVED_LANE_ADDRESS = '0x0000000000000000000000000000000000000042';

export interface MintData {
  token_id?: string;
  metadata: Record<string, any>;
  owner?: string;
}

export async function sendMintTransaction(data: MintData, privateKey: Hex = DEFAULT_DEV_KEY) {
  try {
    const account = privateKeyToAccount(privateKey);

    const client = createWalletClient({
      account,
      chain: derivedLane,
      transport: http(),
    });

    const jsonData = JSON.stringify(data);
    const hexData = `0x${Buffer.from(jsonData).toString('hex')}` as Hex;

    console.log('Sending transaction to derived lane...', {
      to: DERIVED_LANE_ADDRESS,
      data: jsonData, // Log clear JSON for debugging
      hex: hexData,
    });

    const hash = await client.sendTransaction({
      to: DERIVED_LANE_ADDRESS,
      value: 0n,
      data: hexData,
    });

    return { success: true, hash };
  } catch (error) {
    console.error('Error sending transaction:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
