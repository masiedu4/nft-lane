# NFT Lane Frontend

Next.js frontend for the NFT Lane with Viem wallet integration and production-ready RPC bridge.

## Features

- **Next.js 15** with App Router
- **Viem** for Ethereum wallet interactions
- **RPC Bridge** at `/api/rpc` - bridges frontend to Derived Lane backend
- **NFT Minting UI** with form validation

## Getting Started

### Prerequisites

- Node.js 18+
- Derived Lane running on port 9545

### Installation

```bash
npm install
```

### Development

```bash
BACKEND_URL=http://localhost:9545 npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
Frontend UI → RPC Bridge (/api/rpc) → Derived Lane (9545) → NFT Lane Backend
```

The RPC bridge implements all necessary Ethereum JSON-RPC methods to allow Viem to communicate with the Derived Lane backend.

## Key Components

- **`app/page.tsx`** - Main NFT minting page
- **`components/MintForm.tsx`** - NFT minting form component
- **`app/api/rpc/route.ts`** - Production RPC bridge
- **`lib/lane-client.ts`** - Viem client configuration

## Environment Variables

- `BACKEND_URL` - Derived Lane RPC URL (default: `http://localhost:9545`)

## Supported RPC Methods

The RPC bridge implements:

- `eth_chainId`
- `eth_accounts`
- `eth_getBalance`
- `eth_getTransactionCount`
- `eth_estimateGas`
- `eth_gasPrice`
- `eth_fillTransaction`
- `eth_getBlockByNumber`
- `eth_sendTransaction`
- `eth_sendRawTransaction`
- `eth_getTransactionReceipt`

## Documentation

See main project [SETUP_GUIDE.md](../SETUP_GUIDE.md) for complete setup instructions.
