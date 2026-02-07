#!/usr/bin/env python3
"""GitHub Awesome Prompts Collection - Minimal version"""
import json
import os
from datetime import datetime

DATA_DIR = os.path.expanduser("~/.openclaw/workspace/clawd/data/prompts")
os.makedirs(DATA_DIR, exist_ok=True)

# Minimal placeholder - would fetch from awesome-chatgpt-prompts repo
prompts = [
    {
        "id": "github_001",
        "text": "Act as a Linux terminal. I will type commands and you will reply with what the terminal should show.",
        "source": "github",
        "repo": "awesome-chatgpt-prompts",
        "quality_score": 95,
        "type": "text_prompt",
        "collected_at": datetime.now().isoformat()
    }
]

output_file = os.path.join(DATA_DIR, "github-awesome-prompts.jsonl")
with open(output_file, 'w') as f:
    for p in prompts:
        f.write(json.dumps(p) + '\n')

print(f"Collected {len(prompts)} GitHub prompts")
