# Sleep Stories Video Pipeline - Lessons Learned

**Last Updated:** 2026-02-22  
**Critical Fix:** Audio-Video Sync (Prevents Frozen Frames)

---

## 🎯 Golden Rule

**❌ NEVER MISMATCH AUDIO AND VIDEO DURATION**

| Issue | Cause | Result |
|-------|-------|--------|
| Frozen frames | Video longer than audio | Dead air, still images |
| Cutoff audio | Video shorter than audio | Audio cut mid-sentence |
| Failed upload | Duration mismatch | YouTube/Instagram errors |

**✅ ALWAYS:** Video duration = Audio duration (within 0.5s tolerance)

---

## ✅ The Fix (2026-02-22)

### The Problem
First video had:
- Audio: 115 seconds total
- Video: 156 seconds total  
- **Result:** 40 seconds of video with no audio = frozen frame

### The Solution
**Step 1:** Measure exact audio duration for each segment  
**Step 2:** Loop or trim video to match audio duration exactly  
**Step 3:** Concatenate all segments with synchronized durations

### Before (Broken)
```bash
# Fixed 60s per segment regardless of audio
DUR1=60  # Video
AUDIO1=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE")
# Audio was actually 35s - result: 25s of frozen video!
```

### After (Working)
```bash
# Get audio duration FIRST
AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE")

# Match video to audio
if (( VIDEO_SOURCE >= AUDIO_DUR )); then
    # Trim video to audio length
    ffmpeg -i "$VIDEO" -t "$AUDIO_DUR" output.mp4
else
    # Loop video to match audio duration
    ffmpeg -stream_loop -1 -i "$VIDEO" -t "$AUDIO_DUR" output.mp4
fi

# Result: Perfect sync, continuous motion
```

---

## 🔐 Prevention Checklist

For every new Sleep Story video:

- [ ] **Generate audio first** (measure exact duration)
- [ ] **Check source clip durations** (may need looping)
- [ ] **Match video to audio duration** (trim or loop)
- [ ] **Verify sync** (video duration ≈ audio duration)
- [ ] **Test first segment** (before full render)

---

## 📁 Working Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `12-test-3min-fixed.sh` | **CORRECT** sync pattern ✅ | Use this as template |
| `11-test-3min-full.sh` | **BROKEN** - has sync bug | Do not use for production |
| `10-test-3min.sh` | Basic test (no complex transitions) | OK for simple tests |
| `07-generate-chatterbox-audio.sh` | Audio generation | Works ✅ |
| `08-assembly-smooth.sh` | Full assembly (needs sync fix) | Needs update |
| `09-complete-pipeline.sh` | Full 9-segment pipeline | Needs sync fix |

**Recommended workflow:**
1. Use `07-generate-chatterbox-audio.sh` to generate audio
2. Measure exact audio durations
3. Use `12-test-3min-fixed.sh` pattern for assembly

---

## 🎬 Key Technical Details

### Source Clip Durations
```
seg01-opening    → 120 seconds (trim needed for short audio)
seg02-intro      → 23 seconds (loop needed for longer audio)
seg03-titor1     → 12 seconds (may need heavy looping)
seg04-titor2     → 20 seconds
seg05-transition → 12 seconds
seg06-carlssin   → 120 seconds
seg07-philosophy → 30 seconds
seg08-dream      → 18 seconds
seg09-sleep      → 15 seconds
```

**For audio > 30 seconds:** You MUST loop these short clips:
- seg03, seg05, seg08, seg09

**For audio < 30 seconds:** Trim these long clips:
- seg01, seg02, seg04, seg06, seg07

### Looping Formula
```bash
SOURCE_DUR=15     # e.g., seg09-sleep
TARGET_DUR=40     # audio duration

LOOPS=$(( (TARGET_DUR / SOURCE_DUR) + 1 ))
# For 15s source to fill 40s: (40/15)+1 = 3.66 → 3 loops → 45s actual
# Then trim to exactly 40s
```

---

## 🧠 Memory for Future Claude/AI

**When creating new Sleep Story videos:**

1. **First step is ALWAYS audio generation** - get exact durations
2. **Calculate video needs** - will each segment need loop or trim?
3. **Process each segment independently** - match video to audio
4. **Combine AFTER verification** - ensure sync before final assembly
5. **Always test first segment** - verify motion is continuous

**Common mistake to avoid:**
```bash
# WRONG - assumes all videos and audio match
ffmpeg -f concat -i videos.txt -i audio.mp3 output.mp4

# RIGHT - ensures perfect sync
ffmpeg -i video_synced.mp4 -i audio.mp4 -c copy output.mp4
```

**The key insight:** Audio drives the timeline. Video must conform to audio, never the other way around.

---

## 📝 Script Template for Future Videos

```bash
#!/bin/bash
# Template for Sleep Story with perfect audio-video sync

# STEP 1: Generate audio (know durations)
python generate-chatterbox-audio-config.py story.txt output.mp3 --preset calm_narrator
AUDIO_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 output.mp3)

# STEP 2: Process video (loop/trim to match audio)
SOURCE_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 source.mp4)

if (( $(echo "$SOURCE_DUR >= $AUDIO_DUR" | bc -l) )); then
    # Trim to audio length
    ffmpeg -i source.mp4 -t "$AUDIO_DUR" processed.mp4
else
    # Loop to audio length
    LOOPS=$(( (${AUDIO_DUR%.*} / ${SOURCE_DUR%.*}) + 1 ))
    ffmpeg -stream_loop $LOOPS -i source.mp4 -t "$AUDIO_DUR" processed.mp4
fi

# STEP 3: Verify sync
FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 processed.mp4)
echo "Audio: ${AUDIO_DUR}s | Video: ${FINAL_DUR}s | Diff: $(echo "$FINAL_DUR - $AUDIO_DUR" | bc)s"

# STEP 4: Combine
ffmpeg -i processed.mp4 -i output.mp3 -c copy -shortest final.mp4
```

---

## ✅ Verification Commands

```bash
# Check audio duration
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 audio.mp3

# Check video duration  
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.mp4

# Compare them
AUDIO=$(ffprobe audio.mp3 2>&1 | grep duration | awk '{print $2}')
VIDEO=$(ffprobe video.mp4 2>&1 | grep duration | awk '{print $2}')
echo "Audio: ${AUDIO%,}s | Video: ${VIDEO%,}s"

# The duration should match within 0.5 seconds
```

---

**This document ensures we never create another video with frozen frames or audio sync issues.**

Last verified: 2026-02-22 (Working perfectly ✅)
