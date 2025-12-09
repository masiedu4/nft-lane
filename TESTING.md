# End-to-End Testing Guide for NFT Lane

This guide explains how to test the NFT Lane application end-to-end, including integration with Core Lane.

## Current Testing Status

### ✅ What Works Now

1. **Standalone Container Testing** - The NFT lane works independently
2. **API Testing** - All endpoints work correctly
3. **Simulated Core Lane Submissions** - Using `lane submit` command
4. **Web Interface** - Full UI for minting and viewing NFTs

### ⚠️ What Requires Configuration

1. **Full Core Lane Integration** - Core Lane needs to be configured to send submissions to this container
2. **Runner Setup** - The runner infrastructure that bridges Core Lane to containers needs configuration
3. **Transaction Routing** - Core Lane needs to know which transactions should go to this derived lane

## Testing Approaches

### 1. Standalone Testing (Current - Fully Working)

Test the NFT lane container independently:

```bash
# Start the NFT lane
cd /Users/michaelasiedu/Code/nft-lane
lane up dev

# Test health endpoint
curl http://localhost:8080/health

# Mint an NFT via API
curl -X POST http://localhost:8080/mint \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "0x1234...",
    "metadata": {"name": "Test NFT", "description": "Testing"}
  }'

# List NFTs
curl http://localhost:8080/nfts

# Test web interface
open http://localhost:8080
```

### 2. Simulated Core Lane Submissions (Current - Fully Working)

Simulate what Core Lane would send using the `lane submit` command:

```bash
# Make sure container is running
lane up dev

# Simulate Core Lane sending a mint request
lane submit \
  --data '{"token_id": "100", "owner": "0xcorelane", "metadata": {"name": "From Core Lane", "source": "core-lane"}}' \
  --header "X-Forwarded-From: core-lane" \
  --header "X-User: 0xcorelane" \
  --header "X-Content-Type: application/json"

# Verify NFT was minted
curl http://localhost:8080/nft/100
```

### 3. Full End-to-End with Core Lane (Requires Setup)

For true end-to-end testing with Core Lane, you would need:

#### Step 1: Start Core Lane

```bash
cd /Users/michaelasiedu/Code/core-lane

# Generate mnemonic
MNEMONIC=$(docker run --rm ghcr.io/lanelayer/core-lane/core-lane:latest \
  ./core-lane-node create-wallet --mnemonic-only --network mainnet)

# Start Core Lane
cd docker
RPC_USER=bitcoin RPC_PASSWORD=bitcoin123 CORE_LANE_MNEMONIC="$MNEMONIC" \
  docker compose -f docker-compose.yml up -d

# Verify Core Lane is running
curl http://localhost:8545
```

#### Step 2: Start NFT Lane Container

```bash
cd /Users/michaelasiedu/Code/nft-lane
lane up dev
```

#### Step 3: Configure Core Lane to Send to NFT Lane

**This is the missing piece** - Core Lane would need to be configured to:

- Know about the NFT lane container
- Route specific transactions to it
- Send submissions via the runner infrastructure

Currently, this configuration mechanism isn't fully implemented. The infrastructure exists (runner webhook server), but Core Lane needs to be told to use it.

#### Step 4: Send Transaction to Core Lane

```bash
# Send a transaction to Core Lane that should trigger NFT minting
# This would require Core Lane to be configured to forward to NFT lane
cast send --rpc-url http://127.0.0.1:8545 \
  --private-key YOUR_PRIVATE_KEY \
  TARGET_ADDRESS \
  --value AMOUNT \
  --legacy
```

#### Step 5: Verify NFT Lane Received It

```bash
# Check NFT lane logs
cd /Users/michaelasiedu/Code/nft-lane
lane logs --follow

# Check if NFT was minted
curl http://localhost:8080/nfts
```

## Alternative: Manual End-to-End Test

Since the automatic routing isn't configured, you can manually test the full flow:

### Test Script

```bash
#!/bin/bash
# Manual end-to-end test

# 1. Start Core Lane (if not running)
cd /Users/michaelasiedu/Code/core-lane/docker
docker compose up -d

# 2. Start NFT Lane
cd /Users/michaelasiedu/Code/nft-lane
lane up dev

# 3. Send transaction to Core Lane
# (This would normally trigger submission, but we'll simulate it)

# 4. Manually send submission as Core Lane would
curl -X POST http://localhost:8080/submit \
  -H "Content-Type: application/octet-stream" \
  -H "X-Forwarded-From: core-lane" \
  -H "X-User: 0x$(cast wallet address --private-key YOUR_KEY)" \
  -H "X-Content-Type: application/json" \
  --data-binary '{
    "token_id": "e2e-test-1",
    "owner": "0x$(cast wallet address --private-key YOUR_KEY)",
    "metadata": {
      "name": "E2E Test NFT",
      "description": "Created via Core Lane transaction",
      "source": "core-lane-e2e-test"
    }
  }'

# 5. Verify
curl http://localhost:8080/nft/e2e-test-1
```

## What's Actually Tested

Based on our comprehensive testing:

✅ **Container Functionality**

- Health endpoint
- Mint endpoint (auto-gen and explicit IDs)
- List NFTs endpoint
- Get specific NFT endpoint
- Submit endpoint (receives and processes data)
- Error handling (duplicates, invalid data, 404s)
- CORS support
- Static file serving

✅ **Core Lane Integration Format**

- `/submit` endpoint accepts the format Core Lane would send
- Parses JSON submissions correctly
- Processes headers (X-Forwarded-From, X-User, X-Content-Type)
- Handles binary and JSON data

✅ **Web Interface**

- Minting form works
- NFT gallery displays correctly
- API integration works

## What's Missing for Full E2E

❌ **Core Lane Configuration**

- No mechanism to tell Core Lane about this container
- No routing rules for which transactions go to NFT lane
- No automatic submission forwarding

❌ **Runner Integration**

- Runner exists but isn't connected to Core Lane
- Webhook server exists but Core Lane doesn't send to it

## Recommendation

For now, the best testing approach is:

1. **Use `lane submit`** to simulate Core Lane submissions (fully working)
2. **Test all endpoints** directly (fully working)
3. **Use the web interface** (fully working)

For true end-to-end with Core Lane, you would need to:

- Configure Core Lane to send submissions to containers
- Set up the runner infrastructure
- Define routing rules

The NFT lane is **ready** to receive Core Lane submissions - it just needs Core Lane to be configured to send them.
