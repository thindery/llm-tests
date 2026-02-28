#!/bin/bash
# ralph-ac.sh - Wrapper for ralph-ac.js
# Usage: ./ralph-ac.sh <ticket> --given="..." --when="..." --then="..."
#        ./ralph-ac.sh <ticket> --file=ac.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/ralph-ac.js" "$@"
