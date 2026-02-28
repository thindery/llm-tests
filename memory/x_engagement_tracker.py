#!/usr/bin/env python3
"""
X Engagement Tracker - Check follower stats using X API v2
"""

import os
import sys
import tweepy
import json
from datetime import datetime

# Load credentials from environment
X_API_KEY = os.getenv("X_API_KEY")
X_API_SECRET = os.getenv("X_API_SECRET")
X_ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN")
X_ACCESS_TOKEN_SECRET = os.getenv("X_ACCESS_TOKEN_SECRET")
X_USER_ID = os.getenv("X_USER_ID")

# Data file to store historical stats
DATA_FILE = os.path.expanduser("~/.openclaw/workspace/memory/x_follower_stats.json")

def load_stats():
    """Load previous follower stats"""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"history": []}

def save_stats(stats):
    """Save follower stats to file"""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(stats, f, indent=2)

def get_client():
    """Create Tweepy client with credentials"""
    return tweepy.Client(
        consumer_key=X_API_KEY,
        consumer_secret=X_API_SECRET,
        access_token=X_ACCESS_TOKEN,
        access_token_secret=X_ACCESS_TOKEN_SECRET
    )

def check_followers():
    """Get current follower count"""
    try:
        client = get_client()
        
        # Get user info including public metrics
        user = client.get_me(user_fields=['public_metrics', 'username', 'name'])
        
        if user and user.data:
            metrics = user.data.public_metrics
            current_followers = metrics.get('followers_count', 0)
            following_count = metrics.get('following_count', 0)
            tweet_count = metrics.get('tweet_count', 0)
            
            # Load previous stats
            stats = load_stats()
            
            # Calculate growth
            previous_followers = 0
            if stats["history"]:
                previous_followers = stats["history"][-1].get("followers", 0)
            
            growth = current_followers - previous_followers
            
            # Create entry
            entry = {
                "timestamp": datetime.now().isoformat(),
                "followers": current_followers,
                "following": following_count,
                "tweets": tweet_count
            }
            
            stats["history"].append(entry)
            stats["username"] = user.data.username
            stats["display_name"] = user.data.name
            
            # Keep only last 30 days of history
            if len(stats["history"]) > 30:
                stats["history"] = stats["history"][-30:]
            
            save_stats(stats)
            
            # Print results
            print(f"Account: @{user.data.username} ({user.data.name})")
            print(f"Followers: {current_followers}")
            print(f"Growth: {growth:+d}")
            print(f"Following: {following_count}")
            print(f"Tweets: {tweet_count}")
            
            return {
                "username": user.data.username,
                "display_name": user.data.name,
                "followers": current_followers,
                "following": following_count,
                "tweets": tweet_count,
                "growth": growth,
                "previous_followers": previous_followers
            }
        else:
            print("ERROR: Could not retrieve user data")
            return None
            
    except Exception as e:
        print(f"ERROR: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: x_engagement_tracker.py <command>")
        print("Commands:")
        print("  check - Get current follower stats")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "check":
        result = check_followers()
        if result:
            print(json.dumps(result))
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
