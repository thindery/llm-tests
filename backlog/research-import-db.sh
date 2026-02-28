#!/bin/bash
# research-import-db.sh - Direct DB import of research files to artifacts
# Bypasses API and inserts directly to SQLite

set -e

MEMORY_DIR="$HOME/.openclaw/workspace/memory"
DB_PATH="$HOME/projects/remy-tracker/remy.db"
IMPORTED_LOG="$HOME/.openclaw/workspace/backlog/research-imported.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "📚 Research Import to Documentation Hub (Direct DB)"
echo "=================================================="
echo ""

# Create log if missing
touch "$IMPORTED_LOG"

# Function to generate artifact number
generate_number() {
    local count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM artifacts" 2>/dev/null || echo "0")
    local next=$((count + 1))
    printf "DOC-%03d" $next
}

# Function to calculate content hash (simple MD5)
calculate_hash() {
    md5 -q "$1" 2>/dev/null
}

# Find and import RESEARCH-* files
import_count=0
skip_count=0
error_count=0

find "$MEMORY_DIR" -maxdepth 1 -name "RESEARCH-*.md" -type f | sort | while read -r filepath; do
    filename=$(basename "$filepath")
    
    # Check if already imported
    if grep -q "^$filename$" "$IMPORTED_LOG" 2>/dev/null; then
        echo -e "${BLUE}⏭️  Skip:${NC} $filename (already imported)"
        ((skip_count++)) || true
        continue
    fi
    
    # Extract title from first H1
    title=$(grep -m 1 "^# " "$filepath" 2>/dev/null | sed 's/^# //' | sed 's/"/\"/g' || echo "$filename")
    
    # Extract date from filename
    file_date=$(echo "$filename" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1 || date +%Y-%m-%d)
    
    # Create description
    description="Research report from $file_date - Auto-imported from memory"
    
    # Get file size
    file_size=$(stat -f%z "$filepath" 2>/dev/null || stat -c%s "$filepath" 2>/dev/null || echo "0")
    
    # Calculate content hash
    content_hash=$(calculate_hash "$filepath")
    
    # Check for duplicate
    existing=$(sqlite3 "$DB_PATH" "SELECT id FROM artifacts WHERE content_hash = '$content_hash' LIMIT 1" 2>/dev/null || echo "")
    
    if [ -n "$existing" ]; then
        echo "$filename" >> "$IMPORTED_LOG"
        echo -e "${YELLOW}⚠️  Skip:${NC} $filename (duplicate, exists as artifact #$existing)"
        ((skip_count++)) || true
        continue
    fi
    
    # Generate artifact number
    artifact_number=$(generate_number)
    
    # Read content (escape single quotes)
    content=$(cat "$filepath" | sed "s/'/''/g")
    
    # Insert into database
    result=$(sqlite3 "$DB_PATH" "
        INSERT INTO artifacts 
            (artifact_number, title, description, file_name, file_size, mime_type, content_hash, content, created_by, created_at)
        VALUES 
            ('$artifact_number', '$(echo "$title" | sed "s/'/''/g")', '$(echo "$description" | sed "s/'/''/g")', '$filename', $file_size, 'text/markdown', '$content_hash', '$(echo "$content" | sed "s/'/''/g")', 'research-import', datetime('now'));
        SELECT last_insert_rowid();
    " 2>&1) || result=""
    
    if [ -n "$result" ] && [ "$result" != "" ]; then
        echo "$filename" >> "$IMPORTED_LOG"
        echo -e "${GREEN}✅ Imported:${NC} $filename → $artifact_number (ID: $result)"
        ((import_count++)) || true
    else
        echo -e "${YELLOW}❌ Error:${NC} Failed to import $filename"
        ((error_count++)) || true
    fi
done

echo ""
echo "=================================================="
echo -e "${GREEN}Import complete!${NC}"
echo ""
echo "📊 Summary:"
echo "   Imported: $import_count files"
echo "   Skipped: $skip_count files"
echo "   Errors: $error_count files"
echo ""
echo "🔗 View in Documentation Hub:"
echo "   http://localhost:3474/artifacts"
