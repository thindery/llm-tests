#!/bin/bash
# JSON Validation Script
# Usage: ./validate-json.sh '<json_string>'
# Returns 0 if valid, 1 if invalid

JSON_INPUT="$1"

if [ -z "$JSON_INPUT" ]; then
    echo "❌ No JSON provided"
    exit 1
fi

# Try to parse with jq
if echo "$JSON_INPUT" | jq empty 2>/dev/null; then
    echo "✅ Valid JSON"
    exit 0
else
    echo "❌ Invalid JSON"
    # Show the error
    echo "$JSON_INPUT" | jq empty 2>&1
    exit 1
fi
