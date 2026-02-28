#!/bin/bash
# Dev Agent Pre-flight Check Script
# Usage: source preflight-check.sh
# Exits with error if not in correct repository

REPO_PATH="/projects/remy-tracker"
EXPECTED_HOME="$HOME$REPO_PATH"

echo "=== Pre-flight Check ==="
echo "Required path: $EXPECTED_HOME"
echo "Current path:  $PWD"
echo ""

if [[ "$PWD" != *"$REPO_PATH"* ]]; then
    echo "❌ ERROR: Must run from ~/projects/remy-tracker/"
    echo "   Current directory does not contain '$REPO_PATH'"
    echo ""
    echo "To fix:"
    echo "   cd ~/projects/remy-tracker"
    exit 1
fi

# Verify git repo works
if ! git status &>/dev/null; then
    echo "❌ ERROR: Current directory is not a valid git repository"
    echo "   Run 'git status' manually to diagnose"
    exit 1
fi

echo "✅ Pre-flight check passed"
echo "   Repository: $PWD"
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "   Branch: $BRANCH"
echo ""
