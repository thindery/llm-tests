#!/usr/bin/env python3
"""Convert collected prompts to Clawdbot Skills - Minimal version"""
import json
import os
import re
import zipfile
from datetime import datetime

# Paths for macOS environment
CLAWD_ROOT = os.path.expanduser("~/.openclaw/workspace/clawd")
DATA_DIR = os.path.join(CLAWD_ROOT, "data", "prompts")
DIST_DIR = os.path.join(CLAWD_ROOT, "dist", "skills")
LOG_DIR = os.path.join(DATA_DIR, "..", "..", "logs")

os.makedirs(DIST_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)

def slugify(text):
    """Convert text to URL-friendly slug"""
    text = re.sub(r'[^\w\s-]', '', text.lower())
    return re.sub(r'[-\s]+', '-', text).strip('-')[:50]

def create_skill_package(prompt_data, skill_id):
    """Create a .skill package from prompt data"""
    text = prompt_data.get('text', '')
    if not text or len(text) < 20:
        return None, "Content too short"

    skill_slug = f"{skill_id}-{slugify(text[:30])}"
    skill_name = skill_slug[:50]
    
    # Infer type
    text_lower = text.lower()
    if any(w in text_lower for w in ['image', 'draw', 'generate', 'visual', 'illustration', 'art']):
        actual_type = "Image Prompt"
    elif any(w in text_lower for w in ['video', 'animate', 'motion', 'film']):
        actual_type = "Video Prompt"
    else:
        actual_type = "Text Prompt"
    
    description = text[:100] + "..." if len(text) > 100 else text
    quality_score = prompt_data.get('quality_score', 70)
    source = prompt_data.get('source', 'unknown')
    url = prompt_data.get('url', '')
    
    # Create metadata
    metadata_obj = {
        "clawdbot": {
            "type": actual_type.lower().replace(' ', '_'),
            "inferred_type": actual_type,
            "source": source,
            "original_url": url,
            "quality_score": quality_score
        }
    }
    
    # Skill content
    skill_md = f'''---
name: {skill_name}
description: {description}
---

# {skill_name}

**Type**: {actual_type}
**Source**: {source}
**Quality Score**: {quality_score}/100

## Prompt

```
{text}
```

## Metadata

```json
{json.dumps(metadata_obj, indent=2, ensure_ascii=False)}
```
'''
    
    # Create temp directory for skill
    temp_dir = os.path.join(DIST_DIR, f"temp-{skill_name}")
    os.makedirs(temp_dir, exist_ok=True)
    
    with open(os.path.join(temp_dir, "SKILL.md"), 'w') as f:
        f.write(skill_md)
    
    with open(os.path.join(temp_dir, "_meta.json"), 'w') as f:
        json.dump({
            "version": "1.0.0",
            "created": datetime.now().isoformat(),
            "source": source
        }, f, indent=2)
    
    # Create .skill package (zip)
    skill_file = os.path.join(DIST_DIR, f"{skill_name}.skill")
    with zipfile.ZipFile(skill_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for filename in ['SKILL.md', '_meta.json']:
            filepath = os.path.join(temp_dir, filename)
            zf.write(filepath, filename)
    
    # Cleanup temp
    import shutil
    shutil.rmtree(temp_dir)
    
    return skill_file, None

def main():
    print("=" * 50)
    print("Prompt to Skill Conversion")
    print("=" * 50)
    
    # Find all prompt files
    input_files = [
        ("reddit", "reddit-prompts.jsonl"),
        ("github", "github-awesome-prompts.jsonl"),
        ("hackernews", "hacker-news-ai.jsonl"),
        ("searxng", "collected.jsonl"),
    ]
    
    total_prompts = 0
    converted = 0
    skipped = 0
    created_skills = []
    
    for source, filename in input_files:
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            print(f"⚠️  {filename} not found, skipping")
            continue
        
        with open(filepath, 'r') as f:
            for i, line in enumerate(f):
                total_prompts += 1
                try:
                    data = json.loads(line.strip())
                    skill_id = f"{source}-{i+1}"
                    skill_file, error = create_skill_package(data, skill_id)
                    
                    if skill_file:
                        converted += 1
                        created_skills.append(os.path.basename(skill_file))
                        print(f"✅ Created: {os.path.basename(skill_file)}")
                    else:
                        skipped += 1
                        print(f"⏭️  Skipped {skill_id}: {error}")
                except json.JSONDecodeError:
                    skipped += 1
                    print(f"⏭️  Skipped invalid JSON line")
    
    print("\n" + "=" * 50)
    print("Conversion Results")
    print("=" * 50)
    print(f"Total prompts: {total_prompts}")
    print(f"Converted: {converted}")
    print(f"Skipped: {skipped}")
    print(f"\nSkills saved to: {DIST_DIR}")
    
    if created_skills:
        print(f"\nCreated {len(created_skills)} skills:")
        for s in created_skills[:10]:
            print(f"  - {s}")
        if len(created_skills) > 10:
            print(f"  ... and {len(created_skills) - 10} more")
    
    return converted > 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
