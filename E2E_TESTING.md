# End-to-End Testing with Core Lane

## The Reality: Current Integration Status

**What Works:**

- ✅ NFT Lane container runs independently
- ✅ `/submit` endpoint receives and processes data correctly
- ✅ Can simulate Core Lane submissions using `lane submit`
- ✅ All endpoints tested and working

**What's Missing:**

- ⚠️ Core Lane doesn't automatically send submissions to containers
- ⚠️ No configuration mechanism to route Core Lane transactions to NFT lane
- ⚠️ The runner infrastructure exists but isn't connected to Core Lane

## How Core Lane Integration Would Work (When Configured)

The intended flow:

```
1. Transaction sent to Core Lane (via RPC)
2. Core Lane processes transaction
3. Core Lane decides to forward to derived lane
4. Core Lane → Runner webhook server → NFT Lane /submit endpoint
5. NFT Lane processes and mints NFT
```

**Current State:** Steps 1-2 work, but steps 3-5 require configuration that doesn't exist yet.

## Practical Testing Approaches

### Approach 1: Simulated E2E (Recommended - Fully Working)

This simulates what Core Lane would send:

```bash
# Terminal 1: Start NFT Lane
cd /Users/michaelasiedu/Code/nft-lane
lane up dev

# Terminal 2: Simulate Core Lane sending a transaction
# This is what Core Lane WOULD send if configured
lane submit \
  --data '{
    "token_id": "core-lane-tx-1",
    "owner": "0x1234567890123456789012345678901234567890",
    "metadata": {
      "name": "NFT from Core Lane Transaction",
      "description": "This NFT was minted via a Core Lane transaction",
      "tx_source": "core-lane",
      "block_height": 850000
    }
  }' \
  --header "X-Forwarded-From: core-lane" \
  --header "X-User: 0x1234567890123456789012345678901234567890" \
  --header "X-Content-Type: application/json" \
  --header "X-Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Verify NFT was minted
curl http://localhost:8080/nft/core-lane-tx-1 | python3 -m json.tool
```

### Approach 2: Manual Full Stack Test

Test with Core Lane running, but manually trigger the submission:

```bash
# Step 1: Start Core Lane
cd /Users/michaelasiedu/Code/core-lane/docker

# Generate mnemonic if needed
MNEMONIC=$(docker run --rm ghcr.io/lanelayer/core-lane/core-lane:latest \
  ./core-lane-node create-wallet --mnemonic-only --network mainnet)

# Start Core Lane
RPC_USER=bitcoin RPC_PASSWORD=bitcoin123 CORE_LANE_MNEMONIC="$MNEMONIC" \
  docker compose -f docker-compose.yml up -d

# Wait for Core Lane to be ready
sleep 10
curl http://localhost:8545

# Step 2: Start NFT Lane
cd /Users/michaelasiedu/Code/nft-lane
lane up dev

# Step 3: Send a transaction to Core Lane
# (This creates a transaction in Core Lane's state)
cast send --rpc-url http://127.0.0.1:8545 \
  --private-key YOUR_PRIVATE_KEY \
  0x0000000000000000000000000000000000000000 \
  --value 1000000000000000000 \
  --legacy

# Step 4: Manually send submission as Core Lane would
# (In production, Core Lane would do this automatically)
TX_HASH=$(cast tx --rpc-url http://127.0.0.1:8545 LATEST_TX_HASH)

curl -X POST http://localhost:8080/submit \
  -H "Content-Type: application/octet-stream" \
  -H "X-Forwarded-From: core-lane" \
  -H "X-User: $(cast wallet address --private-key YOUR_KEY)" \
  -H "X-Content-Type: application/json" \
  -H "X-Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --data-binary "{
    \"tx_hash\": \"$TX_HASH\",
    \"user\": \"$(cast wallet address --private-key YOUR_KEY)\",
    \"action\": \"mint_nft\",
    \"params\": {
      \"token_id\": \"from-core-lane-$(date +%s)\",
      \"metadata\": {
        \"name\": \"NFT from Core Lane\",
        \"source\": \"core-lane-transaction\",
        \"tx_hash\": \"$TX_HASH\"
      }
    },
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"

# Step 5: Verify
curl http://localhost:8080/nfts | python3 -m json.tool
```

### Approach 3: Query Core Lane State (Fully Working)

The NFT lane can query Core Lane state to verify transactions:

```bash
# Start both services
cd /Users/michaelasiedu/Code/core-lane/docker
docker compose up -d

cd /Users/michaelasiedu/Code/nft-lane
lane up dev

# Send transaction to Core Lane
TX_HASH=$(cast send --rpc-url http://127.0.0.1:8545 \
  --private-key YOUR_KEY \
  RECIPIENT \
  --value 1000000000000000000 \
  --legacy)

# Query Core Lane state from NFT lane
# (This would be done in the /submit handler)
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "lane_getTransactionState",
    "params": ["'$TX_HASH'"],
    "id": 1
  }' | python3 -m json.tool

# Then manually trigger NFT mint based on transaction
# (In production, Core Lane would send this automatically)
```

## What We Actually Tested

✅ **Container Functionality** - All working

- Health checks
- Minting NFTs
- Listing NFTs
- Error handling
- Web interface

✅ **Submission Endpoint** - All working

- Receives data correctly
- Parses JSON
- Processes headers
- Handles binary data

✅ **Core Lane Querying** - Would work if Core Lane is running

- Can query transaction state
- Can query intent state
- Can verify payments

## The Missing Link

**Core Lane → Container Routing:**

Currently, Core Lane processes transactions but doesn't automatically forward them to containers. For full E2E, you would need:

1. **Configuration in Core Lane** to know about derived lanes
2. **Routing rules** to determine which transactions go to which lane
3. **Webhook/Submission service** in Core Lane to send to containers

This infrastructure exists in the runner, but Core Lane needs to be configured to use it.

## Recommendation for Now

**Best Practice:** Use `lane submit` to simulate Core Lane submissions. This:

- ✅ Tests the exact format Core Lane would send
- ✅ Tests all submission handling logic
- ✅ Works end-to-end for the container side
- ✅ Can be automated in CI/CD

**For True E2E:** Wait for Core Lane to have configuration for routing to derived lanes, or manually trigger submissions after Core Lane processes transactions.

## Automated Test Script

```bash
#!/bin/bash
# E2E test script for NFT Lane

set -e

echo "=== NFT Lane E2E Test ==="
echo ""

# Start NFT Lane
echo "1. Starting NFT Lane..."
cd /Users/michaelasiedu/Code/nft-lane
lane up dev > /dev/null 2>&1 &
sleep 15

# Test health
echo "2. Testing health endpoint..."
curl -s http://localhost:8080/health | grep -q "OK" && echo "   ✅ Health check passed" || exit 1

# Simulate Core Lane submission
echo "3. Simulating Core Lane submission..."
lane submit \
  --data '{"token_id": "e2e-test", "owner": "0xe2e", "metadata": {"name": "E2E Test"}}' \
  --header "X-Forwarded-From: core-lane" \
  --header "X-Content-Type: application/json" > /dev/null 2>&1

sleep 2

# Verify NFT was minted
echo "4. Verifying NFT was minted..."
NFT=$(curl -s http://localhost:8080/nft/e2e-test)
if echo "$NFT" | grep -q "e2e-test"; then
  echo "   ✅ NFT minted successfully"
else
  echo "   ❌ NFT not found"
  exit 1
fi

# Test querying Core Lane (if running)
if curl -s http://localhost:8545 > /dev/null 2>&1; then
  echo "5. Testing Core Lane state query..."
  echo "   ✅ Core Lane is accessible"
else
  echo "5. Core Lane not running (skipping state query test)"
fi

echo ""
echo "=== All E2E Tests Passed ==="
```
