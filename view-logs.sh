#!/bin/bash

# Cleaner log viewer for NFT Lane backend services

CORE_LANE_LOG="/Users/michaelasiedu/Code/core-lane/core-lane.log"
DERIVED_LANE_LOG="/Users/michaelasiedu/Code/core-lane/derived-lane.log"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "📊 NFT Lane Transaction Monitor"
echo "================================"
echo ""
echo "Showing only transaction-related logs..."
echo "Press Ctrl+C to stop"
echo ""

# Function to format and filter logs
format_log() {
  local service=$1
  local line=$2
  
  # Skip DEBUG messages unless they're transaction-related
  if echo "$line" | grep -q "DEBUG" && ! echo "$line" | grep -q "Transaction\|eth_send"; then
    return
  fi
  
  # Color code by service
  case $service in
    "core")
      prefix="${GREEN}[CORE LANE]${NC}"
      ;;
    "derived")
      prefix="${BLUE}[DERIVED LANE]${NC}"
      ;;
    *)
      prefix="[LOG]"
      ;;
  esac
  
  # Highlight important events
  if echo "$line" | grep -q "Transaction forwarded\|forwarded to upstream"; then
    echo -e "${CYAN}${prefix}${NC} $line"
  elif echo "$line" | grep -q "processing.*transactions"; then
    tx_count=$(echo "$line" | grep -oP '\(\K[0-9]+(?= transactions)' || echo "0")
    if [ "$tx_count" != "0" ]; then
      echo -e "${YELLOW}${prefix}${NC} $line"
    fi
  elif echo "$line" | grep -q "ERROR\|error\|failed\|Failed"; then
    echo -e "${RED}${prefix}${NC} $line"
  elif echo "$line" | grep -q "eth_sendRawTransaction\|eth_sendTransaction"; then
    echo -e "${CYAN}${prefix}${NC} $line"
  elif echo "$line" | grep -q "INFO.*Transaction\|INFO.*transaction"; then
    echo -e "${prefix} $line"
  fi
}

# Tail both logs and format them
(tail -f "$CORE_LANE_LOG" 2>/dev/null | while IFS= read -r line; do format_log "core" "$line"; done) &
CORE_PID=$!

(tail -f "$DERIVED_LANE_LOG" 2>/dev/null | while IFS= read -r line; do format_log "derived" "$line"; done) &
DERIVED_PID=$!

# Wait for interrupt
trap "kill $CORE_PID $DERIVED_PID 2>/dev/null; exit" INT TERM
wait

