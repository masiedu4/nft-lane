#!/usr/bin/env python3
"""
NFT Minting Lane - A simple derived lane for minting and managing NFTs
"""

import aiohttp
from aiohttp import web
from datetime import datetime, timezone
import os
import json
import logging
import asyncio
from typing import Dict, Optional

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# In-memory NFT storage
# Format: {token_id: {"owner": str, "metadata": dict, "minted_at": str}}
nft_store: Dict[str, Dict] = {}
next_token_id = 1


# CORS headers
def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


async def health(request):
    """Health check endpoint"""
    return web.json_response(
        {
            "status": "OK",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "service": "nft-lane",
            "version": "1.0.0",
            "nfts_minted": len(nft_store),
        },
        headers=cors_headers(),
    )


async def mint_nft(request):
    """Mint a new NFT"""
    try:
        data = await request.json()
        token_id = data.get("token_id")
        metadata = data.get("metadata", {})
        owner = data.get("owner", "unknown")

        # If no token_id provided, auto-generate one
        if not token_id:
            global next_token_id
            token_id = str(next_token_id)
            next_token_id += 1
        else:
            token_id = str(token_id)

        # Check if token already exists
        if token_id in nft_store:
            return web.json_response(
                {"status": "error", "message": f"Token ID {token_id} already exists"},
                status=400,
                headers=cors_headers(),
            )

        # Create NFT
        nft_store[token_id] = {
            "owner": owner,
            "metadata": metadata,
            "minted_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(f"Minted NFT: token_id={token_id}, owner={owner}")

        return web.json_response(
            {
                "status": "ok",
                "message": "NFT minted successfully",
                "token_id": token_id,
                "nft": nft_store[token_id],
            },
            headers=cors_headers(),
        )
    except Exception as e:
        logger.exception("Error minting NFT")
        return web.json_response(
            {"status": "error", "message": str(e)}, status=500, headers=cors_headers()
        )


async def get_nft(request):
    """Get a specific NFT by token ID"""
    token_id = request.match_info.get("token_id")
    if not token_id:
        return web.json_response(
            {"status": "error", "message": "Token ID required"},
            status=400,
            headers=cors_headers(),
        )

    if token_id not in nft_store:
        return web.json_response(
            {"status": "error", "message": f"NFT {token_id} not found"},
            status=404,
            headers=cors_headers(),
        )

    return web.json_response(
        {"status": "ok", "token_id": token_id, "nft": nft_store[token_id]},
        headers=cors_headers(),
    )


async def list_nfts(request):
    """List all NFTs"""
    nfts = []
    for token_id, nft_data in nft_store.items():
        nfts.append({"token_id": token_id, **nft_data})

    return web.json_response(
        {"status": "ok", "count": len(nfts), "nfts": nfts}, headers=cors_headers()
    )


async def submit_handler(request):
    """
    Handle raw data submissions from core-lane.

    This endpoint receives raw binary data (application/octet-stream) with
    optional metadata passed via X- prefixed HTTP headers.
    """
    try:
        # Read raw binary data
        data = await request.read()

        # Extract metadata from headers
        forwarded_from = request.headers.get("X-Forwarded-From")
        content_type = request.headers.get("X-Content-Type")
        user = request.headers.get("X-User")
        timestamp = request.headers.get("X-Timestamp")

        logger.info(
            f"Received {len(data)} bytes from {forwarded_from or 'unknown source'}"
        )

        # Try to parse as JSON if possible
        try:
            # Try to decode as UTF-8 and parse as JSON
            json_str = data.decode("utf-8")
            json_data = json.loads(json_str)

            # Check if it's a mint request
            if isinstance(json_data, dict) and (
                "token_id" in json_data or "metadata" in json_data
            ):
                # Process as NFT mint request
                token_id = json_data.get("token_id")
                metadata = json_data.get("metadata", {})
                owner = user or json_data.get("owner", "unknown")

                # Auto-generate token_id if not provided
                if not token_id:
                    global next_token_id
                    token_id = str(next_token_id)
                    next_token_id += 1
                else:
                    token_id = str(token_id)

                # Check if token already exists
                if token_id not in nft_store:
                    nft_store[token_id] = {
                        "owner": owner,
                        "metadata": metadata,
                        "minted_at": datetime.now(timezone.utc).isoformat(),
                    }
                    logger.info(
                        f"Minted NFT from core-lane submission: token_id={token_id}, owner={owner}"
                    )
                else:
                    logger.info(f"Token {token_id} already exists, skipping mint")

        except (UnicodeDecodeError, json.JSONDecodeError):
            # Not JSON, process as raw data
            logger.info(f"Processing {len(data)} bytes of raw data")
            # Could extract NFT data from binary format if needed

        return web.json_response(
            {
                "status": "ok",
                "message": "Submission processed successfully",
                "bytes_received": len(data),
            },
            status=200,
            headers=cors_headers(),
        )
    except Exception as e:
        logger.exception("Unexpected error processing submission")
        return web.json_response(
            {"status": "error", "message": str(e)},
            status=500,
            headers=cors_headers(),
        )


async def options_handler(request):
    """Handle CORS preflight requests"""
    return web.Response(headers=cors_headers())


# Set up routes
app = web.Application()

# API routes
app.router.add_get("/health", health)
app.router.add_post("/mint", mint_nft)
app.router.add_get("/nfts", list_nfts)
app.router.add_get("/nft/{token_id}", get_nft)
app.router.add_post("/submit", submit_handler)

# CORS preflight
app.router.add_options("/{path:.*}", options_handler)

# Serve static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.router.add_static("/", static_dir, show_index=True)


def run_app():
    """Function to run the app, used by watchgod/watchfiles"""
    port = int(os.environ.get("PORT", 8080))
    web.run_app(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    run_app()
