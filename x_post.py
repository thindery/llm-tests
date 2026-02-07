#!/usr/bin/env python3
"""Quick tweet poster for Remy - loads creds from .env"""
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

# Post tweet - handle both args and stdin
text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "🦞 Testing my new voice!"
try:
    tweet = client.create_tweet(text=text)
    print(f"✅ Posted: https://twitter.com/RemyLobster/status/{tweet.data['id']}")
except Exception as e:
    print(f"❌ Failed: {e}")
