#!/usr/bin/env python3
"""
research-import.py - Import RESEARCH-* files to Documentation Hub
"""

import os
import sqlite3
import hashlib
import glob
from datetime import datetime

MEMORY_DIR = os.path.expanduser("~/.openclaw/workspace/memory")
DB_PATH = os.path.expanduser("~/projects/remy-tracker/remy.db")
IMPORTED_LOG = os.path.expanduser("~/.openclaw/workspace/backlog/research-imported.log")

def get_content_hash(filepath):
    """Calculate MD5 hash of file content"""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def get_next_artifact_number(conn):
    """Generate next artifact number"""
    cursor = conn.execute("SELECT COUNT(*) FROM artifacts")
    count = cursor.fetchone()[0]
    return f"DOC-{count + 1:03d}"

def extract_title(filepath):
    """Extract title from first H1 in markdown"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('# '):
                    return line[2:].strip()
    except:
        pass
    return os.path.basename(filepath)

def main():
    print("📚 Research Import to Documentation Hub")
    print("=" * 50)
    print()
    
    # Load imported log
    imported = set()
    if os.path.exists(IMPORTED_LOG):
        with open(IMPORTED_LOG, 'r') as f:
            imported = set(line.strip() for line in f if line.strip())
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    # Find research files
    pattern = os.path.join(MEMORY_DIR, "RESEARCH-*.md")
    files = sorted(glob.glob(pattern))
    
    imported_count = 0
    skipped_count = 0
    error_count = 0
    
    for filepath in files:
        filename = os.path.basename(filepath)
        
        # Skip if already imported
        if filename in imported:
            print(f"⏭️  Skip: {filename} (already imported)")
            skipped_count += 1
            continue
        
        # Extract metadata
        title = extract_title(filepath)
        file_size = os.path.getsize(filepath)
        content_hash = get_content_hash(filepath)
        
        # Check for duplicate hash
        cursor = conn.execute("SELECT id, artifact_number FROM artifacts WHERE content_hash = ? LIMIT 1", (content_hash,))
        existing = cursor.fetchone()
        if existing:
            print(f"⚠️  Skip: {filename} (duplicate of {existing[1]})")
            with open(IMPORTED_LOG, 'a') as f:
                f.write(filename + '\n')
            skipped_count += 1
            continue
        
        # Read content
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Generate artifact number
        artifact_number = get_next_artifact_number(conn)
        
        # Extract date from filename (default to today)
        date_str = datetime.now().strftime('%Y-%m-%d')
        parts = filename.replace('RESEARCH-', '').replace('.md', '').split('-')
        if len(parts) >= 3:
            date_str = f"{parts[-3]}-{parts[-2]}-{parts[-1]}"
        
        description = f"Research report from {date_str} - Auto-imported from memory"
        
        # Insert into database
        try:
            conn.execute("""
                INSERT INTO artifacts 
                    (artifact_number, title, description, file_name, file_size, mime_type, 
                     content_hash, content, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                artifact_number, title, description, filename, file_size,
                'text/markdown', content_hash, content, 'research-import'
            ))
            conn.commit()
            
            with open(IMPORTED_LOG, 'a') as f:
                f.write(filename + '\n')
            
            print(f"✅ Imported: {filename} → {artifact_number}")
            imported_count += 1
            
        except Exception as e:
            print(f"❌ Error: {filename} - {e}")
            error_count += 1
    
    conn.close()
    
    print()
    print("=" * 50)
    print("Import complete!")
    print()
    print(f"📊 Summary:")
    print(f"   Imported: {imported_count} files")
    print(f"   Skipped: {skipped_count} files")
    print(f"   Errors: {error_count} files")
    print()
    print("🔗 View in Documentation Hub:")
    print("   http://localhost:3474/artifacts")

if __name__ == "__main__":
    main()
