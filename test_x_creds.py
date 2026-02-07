#!/usr/bin/env python3
import os
import sys

# Load from .env file manually
env_path = '/Users/thindery/.openclaw/workspace/.env'
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Test
print(f"X_API_KEY: {'Set' if os.environ.get('X_API_KEY') else 'Missing'}")
print(f"X_API_SECRET: {'Set' if os.environ.get('X_API_SECRET') else 'Missing'}")
print(f"X_ACCESS_TOKEN: {'Set' if os.environ.get('X_ACCESS_TOKEN') else 'Missing'}")
print(f"X_ACCESS_TOKEN_SECRET: {'Set' if os.environ.get('X_ACCESS_TOKEN_SECRET') else 'Missing'}")

# Try importing tweepy
try:
    import tweepy
    print("\n✅ Tweepy is available!")
    
    # Try to authenticate
    client = tweepy.Client(
        consumer_key=os.environ.get('X_API_KEY'),
        consumer_secret=os.environ.get('X_API_SECRET'),
        access_token=os.environ.get('X_ACCESS_TOKEN'),
        access_token_secret=os.environ.get('X_ACCESS_TOKEN_SECRET')
    )
    
    # Verify credentials - get user info
    try:
        # Get authenticated user info
        me = client.get_me()
        if me and me.data:
            user = me.data
            print(f"\n🎉 AUTHENTICATED as @{user.username}")
            print(f"   Display: {user.name}")
            print(f"   User ID: {user.id}")
        else:
            print("\n❌ Could not verify credentials")
    except Exception as verify_error:
        print(f"\n⚠️  Verify test failed: {verify_error}")
        print("    But credentials are loaded - try posting a test tweet")
        
except ImportError:
    print("\n⚠️  Tweepy not installed. Install with: pip3 install tweepy")
except Exception as e:
    print(f"\n❌ Error: {e}")
