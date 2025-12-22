# NFT Lane - Production Setup Guide

Complete guide for deploying NFT Lane on LaneLayer with full Bitcoin anchoring.

## Prerequisites

- Docker and Docker Buildx
- Rust toolchain (`cargo`)
- Node.js 18+ and npm
- Foundry (`cast` command)
- LaneLayer CLI: `npm i -g @lanelayer/cli`

---

## 🏗️ Production Setup

Full LaneLayer architecture with Bitcoin anchoring.

### Architecture

```
Frontend (3000)
    ↓
RPC Bridge (/api/rpc)
    ↓
Derived Lane Node (9545)
    ↓
Your Lane (Cartesi VM)
    ↓
Core Lane (8546)
    ↓
Bitcoin Regtest
```

### Step 1: Build Core Lane

```bash
cd /Users/michaelasiedu/Code/core-lane
cargo build
```

### Step 2: Build Cartesi Snapshot

```bash
cd /Users/michaelasiedu/Code/nft-lane
lane build prod
```

**Output location:**

```
~/.cache/lane/6074828c/d78434d4/vc-cm-snapshot-release.squashfs
```

### Step 3: Start Core Lane

**Terminal 1:**

```bash
cd /Users/michaelasiedu/Code/core-lane
./scripts/dev-environment.sh start
```

**Wait for:** `[SUCCESS] Development environment started successfully!`

**Starts:**

- Bitcoin regtest network (Docker)
- Core Lane node on port 8546
- Filler bot (mines blocks every 10 seconds)

### Step 4: Start Derived Lane

**Terminal 2:**

```bash
export CARTESI_SNAPSHOT_PATH="/Users/michaelasiedu/.cache/lane/6074828c/d78434d4/vc-cm-snapshot-release.squashfs"
export DERIVED_DA_ADDRESS="0xa980b2407851c1844ce205e72a1db237"

cd /Users/michaelasiedu/Code/core-lane
./scripts/derived-dev-environment.sh start
```

**Wait for:** Derived Lane node to start on port 9545

### Step 5: Start Frontend

**Terminal 3:**

```bash
cd /Users/michaelasiedu/Code/nft-lane/frontend
BACKEND_URL=http://localhost:9545 npm run dev
```

Open http://localhost:3000

---

## 🧪 Testing

### Frontend UI

1. Open http://localhost:3000
2. Fill in form:
   - Token ID: `my-nft-1`
   - Owner: `Your Name`
   - Name: `Test NFT`
   - Description: `Minted on LaneLayer`
3. Click "Mint NFT"
4. Watch Terminal 2 (Derived Lane) logs for processing

### CLI Testing

```bash
NFT_DATA='{"token_id":"test-1","owner":"0x1234","metadata":{"name":"Test"}}'
HEX_DATA=$(echo -n "$NFT_DATA" | xxd -p | tr -d '\n' | sed 's/^/0x/')

cast send \
  --rpc-url http://127.0.0.1:9545 \
  --private-key 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a \
  0x0000000000000000000000000000000000000042 \
  --value 0 \
  $HEX_DATA
```

---

## 🔑 Ports & Addresses

### Ports

| Service      | Port | Purpose        |
| ------------ | ---- | -------------- |
| Frontend     | 3000 | User interface |
| Derived Lane | 9545 | Lane RPC       |
| Core Lane    | 8546 | Settlement     |

### Test Accounts (Anvil)

**Account #2** (recommended for testing):

```
Address:     0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

**Account #0** (Core Lane controller):

```
Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 🧹 Cleanup

```bash
# Terminal 1: Stop Core Lane
cd /Users/michaelasiedu/Code/core-lane
./scripts/dev-environment.sh stop

# Terminal 2: Stop Derived Lane
Ctrl+C

# Terminal 3: Stop Frontend
Ctrl+C
```

---

## 📚 Additional Resources

- **README.md:** Project overview and architecture
- **app.py:** Backend `/submit` endpoint logic
- **frontend/app/api/rpc/route.ts:** RPC bridge implementation
