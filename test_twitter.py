#!/usr/bin/env python3
"""Test Twitter API connection for RemyLobster"""

import tweepy

# Bearer Token for read access
bearer_token = "AAAAAAAAAAAAAAAAAAAAAISS7QEAAAAA4YI7siOtZveZ2C0WZNMHk3c0EM4%3D6uk3W4OBp0kRmo3qpuDfVA9Z7CPqANubJHyZlChl8qep0tzypw"

# Create client
client = tweepy.Client(bearer_token=bearer_token)

# Test: Get my account info
try:
    me = client.get_me()
    print("✅ Connection successful!")
    print(f"Username: @{me.data.username}")
    print(f"Name: {me.data.name}")
    print(f"ID: {me.data.id}")
    
    # Try to get my timeline
    tweets = client.get_users_tweets(me.data.id, max_results=5)
    if tweets.data:
        print(f"\n📝 Recent tweets ({len(tweets.data)} found):")
        for tweet in tweets.data:
            print(f"  - {tweet.text[:60]}...")
    else:
        print("\n📝 No tweets yet (new account)")
        
except Exception as e:
    print(f"❌ Error: {e}")
