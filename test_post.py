#!/usr/bin/env python3
"""Test posting tweet from @RemyLobster - Free tier"""
import tweepy

# Credentials from thindery
api_key = "8rLBQl0r7mH0jyHQzE7eMxr8g"
api_secret = "pSdLdn0nerd9kfR9vXGoIymP9a7tbmkvufIyF8NSpKTeZYIMgd"
bearer_token = "AAAAAAAAAAAAAAAAAAAAAISS7QEAAAAA4YI7siOtZveZ2C0WZNMHk3c0EM4%3D6uk3W4OBp0kRmo3qpuDfVA9Z7CPqANubJHyZlChl8qep0tzypw"

# Try OAuth 2.0 App-Only (Bearer) - for Free tier posting
# Note: For posting, we need OAuth 2.0 or OAuth 1.0a USER context, not just Bearer

try:
    # OAuth 2.0 Bearer Token only allows App-level operations
    # For posting tweets, need User Access Token via OAuth flow
    print("⚠️ To POST tweets, we need OAuth 2.0 authorization flow")
    print("   This requires you to authorize the app via browser link")
    print()
    print("Next steps:")
    print("1. Go to Twitter Developer Portal → Projects → Auth Settings")
    print("2. Set OAuth 2.0 callback URL to something like https://localhost")
    print("3. Generate user Access Token, or we can do 3-leg OAuth flow")
    print()
    print("CURRENT STATUS: Connected but can only read (not post)")
    print("Bearer token = App-only auth = Read-only")
    print("Need: Access Token = User context = Can post tweets")
except Exception as e:
    print(f"Error: {e}")
