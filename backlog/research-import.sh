#!/bin/bash
# research-import.sh - Auto-import RESEARCH-* files to Documentation Hub
# Run this to sync memory/RESEARCH-*.md files to artifacts

set -e

MEMORY_DIR="$HOME/.openclaw/workspace/memory"
API_BASE="http://localhost:3474/api"
IMPORTED_LOG="$HOME/.openclaw/workspace/backlog/research-imported.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📚 Research Import to Documentation Hub"
echo "=========================================="

# Create log if missing
touch "$IMPORTED_LOG"

# Find all RESEARCH-* files not yet imported
find "$MEMORY_DIR" -maxdepth 1 -name "RESEARCH-*.md" -type f | while read -r filepath; do
    filename=$(basename "$filepath")
    
    # Check if already imported
    if grep -q "^$filename$" "$IMPORTED_LOG" 2>/dev/null; then
        echo "⏭️  Already imported: $filename"
        continue
    fi
    
    # Extract title from first H1
    title=$(grep -m 1 "^# " "$filepath" | sed 's/^# //' || echo "$filename")
    
    # Extract description from file
    description=$(grep -m 1 "^\*\*" "$filepath" | sed 's/\*\*//g' | cut -c1-200 || echo "Research document")
    
    # Read content
    content=$(cat "$filepath")
    
    # Escape content for JSON
    content_escaped=$(echo "$content" | jq -Rs '.')
    
    echo "📄 Importing: $filename"
    echo "   Title: $title"
    
    # Create artifact via API
    response=$(curl -s -X POST "$API_BASE/artifacts" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"$title\",
            \"description\": \"$description\",
            \"file_name\": \"$filename\",
            \"content\": $content_escaped,
            \"created_by\": \"research-import\"
        }" 2>&1 || echo "ERROR")
    
    if echo "$response" | grep -q '"id"'; then
        artifact_id=$(echo "$response" | jq -r '.id')
        artifact_number=$(echo "$response" | jq -r '.artifact_number')
        echo "$filename" >> "$IMPORTED_LOG"
        echo -e "${GREEN}✅ Imported as $artifact_number (ID: $artifact_id)${NC}"
    elif echo "$response" | grep -q 'Duplicate'; then
        echo "$filename" >> "$IMPORTED_LOG"
        echo -e "${YELLOW}⚠️  Duplicate (skipping)${NC}"
    else
        echo -e "${YELLOW}❌ Failed: $response${NC}"
    fi
    
    echo ""
done

echo "=========================================="
echo "Import complete!"
echo ""
echo "View in Documentation Hub: http://localhost:3474/artifacts"
