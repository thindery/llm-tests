#!/usr/bin/env python3
"""Generate morning briefing audio using Kokoro TTS"""

from kokoro_onnx import Kokoro
import soundfile as sf
import os

# Morning briefing script - natural phrasing for TTS
SCRIPT = """Good morning! Today is Saturday, February 28th, 2026.

Here's your morning briefing.

First, Remy-Tracker status. All systems nominal. The night shift completed successfully. All four assigned tasks finished by 10 PM. QA completed 182 plus unit tests with 146 passing. Frontend developer delivered the template gallery UI. API dev updated documentation. And the business analyst finished AI compliance research.

Active tasks. RemyCities MVP development continues with 17 of 21 tickets complete. The tenant signup feature is merged. The chat interface is live. Rate limiting protection is now fully deployed with 4-layer protection.

What's on deck. Two items need your attention. First, set up the Vercel Team under your Peak Collective account for RemyCities production deployment. Second, register typemysite.com or your preferred domain name.

Also, a quick reminder. Agent Paige vision is now the North Star. Shifted from tradespeople to creative dreamers. Domain recommendation is agent paige dot com. Still need your go or no-go on this pivot.

That's your briefing. Have a great Saturday!"""

def generate_briefing():
    # Initialize Kokoro with default voice model
    # Model will be downloaded automatically if not present
    kokoro = Kokoro()
    
    # Generate audio with voice "af" (American Female)
    # Available voices: af (American Female), am (American Male), etc.
    audio, sample_rate = kokoro.generate(SCRIPT, voice="af", speed=1.1)
    
    # Save to file
    output_path = "/Users/thindery/.openclaw/workspace/morning_briefing_2026-02-28.wav"
    sf.write(output_path, audio, sample_rate)
    
    print(f"Audio saved to: {output_path}")
    print(f"Duration: {len(audio) / sample_rate:.1f} seconds")
    return output_path

if __name__ == "__main__":
    generate_briefing()
