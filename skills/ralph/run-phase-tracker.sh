#!/bin/bash
# run-phase-tracker.sh - CLI wrapper for phase-tracker.ts
# Usage: ./run-phase-tracker.sh [command] [args...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHASE_TRACKER_TS="${SCRIPT_DIR}/phase-tracker.ts"

# Check if we have bun, ts-node, or node with tsx
if command -v bun >/dev/null 2>&1; then
    exec bun run "$PHASE_TRACKER_TS" "$@"
elif command -v npx >/dev/null 2>&1 && npx ts-node --version >/dev/null 2>&1; then
    exec npx ts-node "$PHASE_TRACKER_TS" "$@"
elif command -v npx >/dev/null 2>&1; then
    # Try tsx
    exec npx tsx "$PHASE_TRACKER_TS" "$@"
else
    echo "❌ No TypeScript runner found. Install bun or tsx:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    echo "   # or"
    echo "   npm install -g tsx"
    exit 1
fi