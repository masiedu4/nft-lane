#!/bin/bash

# Simple script to view NFT transaction flow in a cleaner format

echo "🔍 NFT Transaction Monitor"
echo "=========================="
echo ""
echo "Watching for transactions..."
echo "Press Ctrl+C to stop"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Watch Derived Lane logs for transaction forwarding
tail -f /Users/michaelasiedu/Code/core-lane/derived-lane.log 2>/dev/null | while IFS= read -r line; do
  # Filter for important transaction-related messages
  if echo "$line" | grep -q "Transaction forwarded\|eth_sendRawTransaction\|forwarded to upstream"; then
    echo -e "${GREEN}[DERIVED LANE]${NC} $line"
  elif echo "$line" | grep -q "processing core block.*transactions"; then
    # Extract transaction count
    tx_count=$(echo "$line" | grep -oP '\(\K[0-9]+(?= transactions)')
    if [ "$tx_count" != "0" ]; then
      echo -e "${BLUE}[BLOCK PROCESSING]${NC} $line"
    fi
  elif echo "$line" | grep -q "ERROR\|error\|failed"; then
    echo -e "${YELLOW}[ERROR]${NC} $line"
  fi
done

