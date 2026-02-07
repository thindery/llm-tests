#!/usr/bin/env python3
"""Delete a tweet by ID"""
import os
import sys
import tweepy

# Load env
env_path = '/Users/thindery/.openclaw/workspace/.env'
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Setup client
client = tweepy.Client(
    consumer_key=os.environ.get('X_API_KEY'),
    consumer_secret=os.environ.get('X_API_SECRET'),
    access_token=os.environ.get('X_ACCESS_TOKEN'),
    access_token_secret=os.environ.get('X_ACCESS_TOKEN_SECRET')
)

# Delete tweet
tweet_id = sys.argv[1] if len(sys.argv) > 1 else None
if not tweet_id:
    print("Usage: python x_delete.py <tweet_id>")
    sys.exit(1)

try:
    client.delete_tweet(id=tweet_id)
    print(f"✅ Deleted tweet {tweet_id}")
except Exception as e:
    print(f"❌ Failed: {e}")
