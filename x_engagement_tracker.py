#!/usr/bin/env python3
"""X (Twitter) Engagement Tracker for @RemyLobster
Loads creds from .env, fetches follower stats, compares to previous run"""

import os
import sys
import json
from datetime import datetime
import tweepy

# Paths
WORKSPACE = '/Users/thindery/.openclaw/workspace'
ENV_PATH = os.path.join(WORKSPACE, '.env')
STATS_PATH = os.path.join(WORKSPACE, 'data', 'x_stats.json')

def load_env():
    """Load environment variables from .env file"""
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

def load_previous_stats():
    """Load previous stats from JSON file"""
    if os.path.exists(STATS_PATH):
        with open(STATS_PATH) as f:
            return json.load(f)
    return None

def save_current_stats(stats):
    """Save current stats to JSON file"""
    os.makedirs(os.path.dirname(STATS_PATH), exist_ok=True)
    with open(STATS_PATH, 'w') as f:
        json.dump(stats, f, indent=2)

def get_follower_stats():
    """Fetch current follower stats from X API"""
    load_env()
    
    client = tweepy.Client(
        consumer_key=os.environ.get('X_API_KEY'),
        consumer_secret=os.environ.get('X_API_SECRET'),
        access_token=os.environ.get('X_ACCESS_TOKEN'),
        access_token_secret=os.environ.get('X_ACCESS_TOKEN_SECRET')
    )
    
    user_id = os.environ.get('X_USER_ID') or '2019211763414110208'
    
    # Fetch user data
    user = client.get_user(
        id=user_id,
        user_fields=['public_metrics', 'description', 'username', 'name']
    )
    
    if not user or not user.data:
        raise Exception("Failed to fetch user data")
    
    metrics = user.data.public_metrics
    
    return {
        'date': datetime.now().isoformat(),
        'username': user.data.username,
        'name': user.data.name,
        'followers': metrics.get('followers_count', 0),
        'following': metrics.get('following_count', 0),
        'tweets': metrics.get('tweet_count', 0),
        'listed': metrics.get('listed_count', 0)
    }

def format_summary(current, previous):
    """Format a human-readable summary"""
    lines = [
        "📊 @RemyLobster X Stats",
        ""
    ]
    
    # Current stats
    lines.append(f"📈 Followers: {current['followers']:,}")
    lines.append(f"👥 Following: {current['following']:,}")
    lines.append(f"📝 Tweets: {current['tweets']:,}")
    
    # Growth since last check
    if previous:
        prev_date = previous.get('date', 'unknown')
        if isinstance(prev_date, str) and 'T' in prev_date:
            prev_date = prev_date.split('T')[0]
        
        lines.append("")
        lines.append(f"📊 Growth since {prev_date}:")
        
        follower_growth = current['followers'] - previous.get('followers', 0)
        following_growth = current['following'] - previous.get('following', 0)
        tweets_growth = current['tweets'] - previous.get('tweets', 0)
        
        follower_sign = '+' if follower_growth >= 0 else ''
        following_sign = '+' if following_growth >= 0 else ''
        tweets_sign = '+' if tweets_growth >= 0 else ''
        
        lines.append(f"   Followers: {follower_sign}{follower_growth:,}")
        lines.append(f"   Following: {following_sign}{following_growth:,}")
        lines.append(f"   Tweets: {tweets_sign}{tweets_growth:,}")
    else:
        lines.append("")
        lines.append("📊 (First check - no previous data for comparison)")
    
    lines.append("")
    lines.append(f"🎯 Free tier: Tracking only (auto-follow disabled)")
    
    return '\n'.join(lines)

def main():
    """Main entry point"""
    command = sys.argv[1] if len(sys.argv) > 1 else 'check'
    
    if command == 'check':
        try:
            # Get current stats
            current = get_follower_stats()
            
            # Load previous for comparison
            previous = load_previous_stats()
            
            # Save current for next time
            save_current_stats(current)
            
            # Print summary
            summary = format_summary(current, previous)
            print(summary)
            
            # Also return stats as JSON on stderr for debugging
            print(json.dumps(current), file=sys.stderr)
            
        except Exception as e:
            print(f"❌ Failed to fetch stats: {e}", file=sys.stderr)
            sys.exit(1)
            
    elif command == 'raw':
        # Just output raw JSON
        current = get_follower_stats()
        print(json.dumps(current, indent=2))
        save_current_stats(current)
        
    else:
        print(f"Usage: {sys.argv[0]} [check|raw]")
        sys.exit(1)

if __name__ == '__main__':
    main()