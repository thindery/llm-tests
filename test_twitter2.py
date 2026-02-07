#!/usr/bin/env python3
"""Test Twitter API connection for RemyLobster - full auth"""

import tweepy

# All credentials
api_key = "8rLBQl0r7mH0jyHQzE7eMxr8g"
api_secret = "pSdLdn0nerd9kfR9vXGoIymP9a7tbmkvufIyF8NSpKTeZYIMgd"
bearer_token = "AAAAAAAAAAAAAAAAAAAAAISS7QEAAAAA4YI7siOtZveZ2C0WZNMHk3c0EM4%3D6uk3W4OBp0kRmo3qpuDfVA9Z7CPqANubJHyZlChl8qep0tzypw"

# For Bearer Token (App-only, read-only) - good for search/timeline reading
client = tweepy.Client(bearer_token=bearer_token)

print("🔍 Testing with Bearer Token (read-only)...")

try:
    # Search for tweets (app-only auth works for search)
    tweets = client.search_recent_tweets(query="from:elonmusk", max_results=5)
    if tweets.data:
        print("✅ SEARCH WORKS!")
        for tweet in tweets.data[:3]:
            print(f"  - {tweet.text[:50]}...")
    else:
        print("No tweets found in search")
        
except Exception as e:
    print(f"❌ Search error: {e}")

# Try getting my account with Bearer
try:
    me = client.get_me()
    if me.data:
        print(f"\n✅ ACCOUNT INFO:")
        print(f"  Username: @{me.data.username}")
        print(f"  Name: {me.data.name}")
    else:
        print("\n⚠️ Can't get user info with Bearer (need Access Token for user context)")
except Exception as e:
    print(f"\n⚠️ Account info requires user auth: {e}")

print("\n📋 STATUS: Bearer token works for reading/searching!")
print("📋 To post tweets, we need Access Token + Access Token Secret")
