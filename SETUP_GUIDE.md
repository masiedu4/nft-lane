# LaneLayer Derived Lane Setup Guide

Complete step-by-step guide to set up and test a derived lane.

## Prerequisites

- Docker installed and running
- Rust toolchain installed
- Node.js and npm installed
- `cast` (Foundry) installed

## Step 0: Install LaneLayer CLI and Use Sample Project

```bash
# Install LaneLayer CLI
npm i -g @lanelayer/cli

# Use the sample-python project (or create your own)
cd ~/Code/cli/packages/sample-python
```

**What this does:**

- Installs the LaneLayer CLI globally
- Uses the sample Python project as a starting point
- The sample project includes a simple HTTP server with `/health` and `/submit` endpoints

**Note:** You can also create your own project with `lane create my-lane --template python`, but for this guide we'll use the sample-python project.

## Step 1: Build Core Lane

Navigate to the Core Lane repository and build with Cargo:

```bash
cd ~/Code/core-lane
cargo build
```

**What this does:**

- Builds the Core Lane node binary in debug mode (faster for development)
- The dev environment script expects `target/debug/core-lane-node`
- For production, you can use `cargo build --release` or build with Docker

**Alternative (Docker):** If you prefer Docker, you can build the container:

```bash
docker build -t core-lane:dev .
```

However, the dev environment script uses the Cargo-built binary directly.

## Step 2: Build Your Lane with Cartesi Machine Snapshot

Navigate to your lane project and build it:

```bash
cd ~/Code/cli/packages/sample-python  # or your project directory
lane build prod --guest-agent-image ghcr.io/lanelayer/lane-guest-agent@sha256:ca4809fa4f3c708cf919f2e7c5971b38f76348a27228d7cf04c51f01a8bf8373
```

**What this does:**

- Builds your lane container
- Creates a Cartesi Machine snapshot
- Saves snapshot to cache directory

**Output location:** `~/.cache/lane/[hash]/[hash]/vc-cm-snapshot-release`

## Step 3: Find the Cartesi Machine Snapshot

After the build completes, note the cache directory path from the output. It will look like:

```
Cache directory: ~/.cache/lane/[hash]/[hash]
```

The snapshot directory is: `[cache-dir]/vc-cm-snapshot-release`

**Verify it exists:**

```bash
ls -la ~/.cache/lane/*/vc-cm-snapshot-release
```

## Step 4: Start Core Lane Dev Environment

```bash
cd ~/Code/core-lane
./scripts/dev-environment.sh start
```

**What this does:**

- Starts Bitcoin regtest network in Docker
- Creates BDK wallet for Core Lane
- Starts Core Lane node on port 8546
- Funds test addresses (Anvil accounts)
- Starts filler bot for transaction processing

**Wait for:** "Development environment started successfully!"

**RPC Endpoints:**

- **Core Lane RPC:** `http://127.0.0.1:8546`
- **Derived Lane RPC:** `http://127.0.0.1:9545` (starts in next step)

## Step 5: Set Environment Variables and Start Derived Lane

The derived lane runs as a separate process. Set these environment variables and start it:

```bash
export DERIVED_DA_ADDRESS=0x0000000000000000000000000000000000000665
export LANELAYER_HTTP_RUNNER_SNAPSHOT=~/.cache/lane/[hash]/[hash]/vc-cm-snapshot-release
export CORE_LANE_DA_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Replace `[hash]/[hash]`** with the actual path from Step 3.

**What these do:**

- `DERIVED_DA_ADDRESS`: The data availability address for your derived lane
- `LANELAYER_HTTP_RUNNER_SNAPSHOT`: Path to the Cartesi Machine snapshot
- `CORE_LANE_DA_PRIVATE_KEY`: Private key for signing transactions forwarded to Core Lane (use Anvil account #0 key)

**Start the derived lane:**

```bash
cd ~/Code/core-lane
./scripts/derived-dev-environment.sh start
```

**What this does:**

- Starts the derived lane node on port 9545
- Connects to Core Lane RPC to sync blocks
- Processes transactions and executes them in the Cartesi Machine

**Keep this running** in a separate terminal.

## Step 6: Send Transaction to Derived Lane

In a new terminal, send data to the derived lane using port **9545**:

```bash
cast send \
  --rpc-url http://127.0.0.1:9545 \
  --private-key 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a \
  0x0000000000000000000000000000000000000042 \
  --value 0 \
  0x48656c6c6f
```

**What this does:**

- Sends transaction from Anvil account #2 to address `0x000042`
- Includes data payload (`0x48656c6c6f` = "Hello" in hex)
- Transaction is processed by the derived lane and executed in the Cartesi Machine
- Your Python function in the lane will receive and process the data

**Address details:**

- **From:** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (Anvil account #2)
- **To:** `0x0000000000000000000000000000000000000042` (Derived lane address)
- **Private key:** `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- **RPC URL:** `http://127.0.0.1:9545` (derived lane, not core lane!)

**Expected result:** You should see a successful transaction with logs indicating "Cartesi machine executed: success=true" in the transaction logs.

## Troubleshooting

### Address has no balance on derived lane

The derived lane needs to be funded separately from Core Lane. You can fund it by making a Core Lane burn:

```bash
cd ~/Code/core-lane
export DERIVED_DA_ADDRESS=0x0000000000000000000000000000000000000665
export CORE_LANE_DA_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
./scripts/derived-dev-environment.sh burn
```

This burns funds from Core Lane to the derived lane address.

### Derived lane RPC not available (port 9545)

- Ensure environment variables are set: `echo $DERIVED_DA_ADDRESS $LANELAYER_HTTP_RUNNER_SNAPSHOT $CORE_LANE_DA_PRIVATE_KEY`
- Ensure Core Lane is running: `curl http://127.0.0.1:8546`
- Check derived lane logs: `tail -f ~/Code/core-lane/derived-lane.log`
- Verify derived lane is running: `curl http://127.0.0.1:9545`

### Snapshot not found

Verify the snapshot path:

```bash
ls -la $LANELAYER_HTTP_RUNNER_SNAPSHOT
```

Make sure the path is correct and the directory exists.

### Transaction timeout or wrong RPC

- **Important:** Use port **9545** for derived lane transactions, not 8546
- Port 8546 is for Core Lane RPC
- Port 9545 is for Derived Lane RPC
- Ensure Core Lane is running: `curl http://127.0.0.1:8546`
- Check derived lane is running: `curl http://127.0.0.1:9545`
- Check Core Lane logs: `tail -f ~/Code/core-lane/core-lane.log`
- Check Derived Lane logs: `tail -f ~/Code/core-lane/derived-lane.log`

### CORE_LANE_DA_PRIVATE_KEY not set

If you see "CORE_LANE_DA_PRIVATE_KEY env var not set", make sure to export it before starting the derived lane:

```bash
export CORE_LANE_DA_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This is the private key for Anvil account #0, used to sign transactions forwarded to Core Lane.

### Address already in use

If the Core Lane node panics with `Address already in use`, port 8546 or 9545 is likely occupied.

Find and kill the process:

```bash
lsof -i :8546
lsof -i :9545
kill -9 <PID>
```

## Cleanup

Stop all services:

```bash
# Stop Derived Lane
cd ~/Code/core-lane
./scripts/derived-dev-environment.sh stop

# Stop Core Lane dev environment
cd ~/Code/core-lane
./scripts/dev-environment.sh stop
```

## Key Files and Locations

- **Core Lane RPC:** `http://127.0.0.1:8546`
- **Derived Lane RPC:** `http://127.0.0.1:9545`
- **Core Lane logs:** `~/Code/core-lane/core-lane.log`
- **Derived Lane logs:** `~/Code/core-lane/derived-lane.log`
- **Snapshot cache:** `~/.cache/lane/[hash]/[hash]/vc-cm-snapshot-release`
- **Sample project:** `~/Code/cli/packages/sample-python`

## Test Addresses (Anvil Default Accounts)

| Index | Address                                      | Private Key                                                          |
| ----- | -------------------------------------------- | -------------------------------------------------------------------- |
| 0     | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| 1     | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| 2     | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| 3     | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

**Note on funding:**

- Core Lane addresses are automatically funded by burning 1,000,000 sats (0.01 BTC) to each address when the dev environment starts
- Derived lane addresses need to be funded separately by making a Core Lane burn transaction
- Use `./scripts/derived-dev-environment.sh burn` to fund addresses on the derived lane
