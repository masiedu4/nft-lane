# NFT Lane - A Simple Derived Lane for LaneLayer

A demonstration of a derived lane on LaneLayer that allows minting and managing NFTs.

## What is This?

This is a simple NFT minting application built as a **derived lane** on LaneLayer. It demonstrates how to:

- Build a containerized application that receives transactions from Core Lane
- Process NFT minting requests
- Serve a web interface for interacting with the lane
- Deploy to production using the LaneLayer CLI

## Features

- **Mint NFTs**: Create new NFTs with custom token IDs, owners, and metadata
- **View NFTs**: Browse all minted NFTs in a gallery
- **Core Lane Integration**: Receives transaction data via the `/submit` endpoint
- **Web Interface**: User-friendly UI for minting and viewing NFTs
- **REST API**: Full API for programmatic access

## Quick Start

### Prerequisites

- Docker and Docker Buildx
- Node.js and npm (for LaneLayer CLI)
- [LaneLayer CLI](https://github.com/lanelayer/cli) installed globally

### Installation

1. Install the LaneLayer CLI:

```bash
npm install -g @lanelayer/cli
```

2. This project was created using:

```bash
lane create nft-lane --template python
```

### Development

1. Start the development environment:

```bash
cd nft-lane
lane up dev
```

2. Access the app:

   - Web UI: http://localhost:8080
   - Health check: http://localhost:8080/health
   - API docs: See endpoints below

3. Stop the environment:

```bash
lane down
```

### Building for Production

1. Build the production container:

```bash
lane build prod
```

2. Test locally (optional):

```bash
lane up stage
```

3. Push to registry:

```bash
lane push <your-registry>/nft-lane:latest
```

## API Endpoints

### `GET /health`

Health check endpoint. Returns service status and NFT count.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "nft-lane",
  "version": "1.0.0",
  "nfts_minted": 5
}
```

### `POST /mint`

Mint a new NFT.

**Request Body:**

```json
{
  "token_id": "1", // Optional - auto-generated if not provided
  "owner": "0x1234...",
  "metadata": {
    "name": "My NFT",
    "description": "A cool NFT",
    "image": "https://..."
  }
}
```

**Response:**

```json
{
  "status": "ok",
  "message": "NFT minted successfully",
  "token_id": "1",
  "nft": {
    "owner": "0x1234...",
    "metadata": {...},
    "minted_at": "2024-01-01T00:00:00Z"
  }
}
```

### `GET /nfts`

List all minted NFTs.

**Response:**

```json
{
  "status": "ok",
  "count": 5,
  "nfts": [
    {
      "token_id": "1",
      "owner": "0x1234...",
      "metadata": {...},
      "minted_at": "2024-01-01T00:00:00Z"
    },
    ...
  ]
}
```

### `GET /nft/{token_id}`

Get a specific NFT by token ID.

**Response:**

```json
{
  "status": "ok",
  "token_id": "1",
  "nft": {
    "owner": "0x1234...",
    "metadata": {...},
    "minted_at": "2024-01-01T00:00:00Z"
  }
}
```

### `POST /submit`

Receive transaction data from Core Lane. This endpoint is called automatically by Core Lane when transactions are submitted.

**Note:** This endpoint accepts raw binary data or JSON. If JSON is provided with `token_id` or `metadata` fields, it will be processed as a mint request.

## Deployment to Fly.io

1. Build and push the container:

```bash
lane build prod
lane push <registry>/nft-lane:latest
```

2. Deploy to Fly.io:

```bash
flyctl deploy
```

Or use the Fly.io dashboard to deploy from the registry.

The `fly.toml` file is already configured for deployment.

## Architecture

### Derived Lane Concept

A **derived lane** is a containerized application that:

- Runs independently as an HTTP server
- Has a `/submit` endpoint ready to receive transaction data from Core Lane
- Processes data according to its own logic (NFT minting in this case)
- Can query Core Lane state when needed
- Is built and deployed using the LaneLayer CLI

### Current Integration Status

**What's Implemented:**

- ✅ `/submit` endpoint that receives and processes data
- ✅ Parsing of JSON mint requests from submissions
- ✅ Integration with Core Lane's submission format
- ✅ Ready to receive data when Core Lane is configured to send it

**What's Missing (Configuration):**

- ⚠️ Core Lane needs to be configured to send submissions to this container
- ⚠️ The runner infrastructure (which bridges Core Lane to containers) needs to be set up
- ⚠️ In production, Core Lane would POST to a runner's webhook server, which forwards to containers

### Data Flow (When Fully Configured)

```
Bitcoin → Core Lane → Runner (webhook server) → Derived Lane Container (/submit) → NFT Storage
```

**Current State:**

- The container's `/submit` endpoint is ready and tested
- You can manually test it using `lane submit` or curl
- For full integration, Core Lane would need to be configured to route transactions to this container via the runner

**For Testing:**

- Use `lane submit` command to simulate Core Lane submissions
- Use curl to POST directly to `/submit` endpoint
- The endpoint accepts the same format that Core Lane would send

## Project Structure

```
nft-lane/
├── app.py              # Main application with NFT logic
├── Dockerfile          # Container build configuration
├── package.json        # Project metadata
├── fly.toml           # Fly.io deployment configuration
├── README.md          # This file
└── static/
    ├── index.html     # Web UI for minting and viewing NFTs
    └── about.html     # Documentation about LaneLayer
```

## Storage

Currently, NFTs are stored in-memory. This means:

- ✅ Simple and fast for demos
- ❌ Data is lost on restart
- ❌ Not suitable for production

For production, consider:

- File-based storage (JSON file)
- SQLite database
- PostgreSQL/MySQL
- Distributed storage solutions

## Learn More

- Visit `/about.html` in the web interface for an introduction to LaneLayer
- Check out the [LaneLayer CLI documentation](https://github.com/lanelayer/cli)
- Explore the [Core Lane repository](https://github.com/lanelayer/core-lane)

## License

Unlicensed (as per LaneLayer project)
