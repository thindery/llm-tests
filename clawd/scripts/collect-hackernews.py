#!/usr/bin/env python3
"""Hacker News AI Content Collection - Minimal version"""
import json
import os
from datetime import datetime

DATA_DIR = os.path.expanduser("~/.openclaw/workspace/clawd/data/prompts")
os.makedirs(DATA_DIR, exist_ok=True)

# Placeholder - would use HN API
prompts = [
    {
        "id": "hn_001",
        "text": "Show and Discuss: I built an AI tool that summarizes HN threads",
        "source": "hackernews",
        "quality_score": 75,
        "type": "discussion",
        "collected_at": datetime.now().isoformat()
    }
]

output_file = os.path.join(DATA_DIR, "hacker-news-ai.jsonl")
with open(output_file, 'w') as f:
    for p in prompts:
        f.write(json.dumps(p) + '\n')

print(f"Collected {len(prompts)} HN items")
