# TODO: Get Morgan Freeman Voice Cloning for Sleep Stories

**Created:** 2026-02-21  
**Priority:** Medium  
**Depends on:** Chatterbox TTS setup (✅ Complete)  

---

## 📋 Task Summary

Obtain reference audio of Morgan Freeman to clone his voice for Sleep Stories narration using Chatterbox TTS.

---

## ✅ What's Already Done

1. ✅ Chatterbox TTS installed at `~/.openclaw/workspace/temp/chatterbox_venv/`
2. ✅ Python script created with voice cloning support
3. ✅ Config file created with `morgan_freeman` voice preset
4. ✅ Built-in calm voice working as fallback

---

## 🎯 What You Need To Do

### Step 1: Obtain Reference Audio

**Requirements:**
- 10-30 seconds of Morgan Freeman speaking
- Good audio quality (320kbps+ MP3 or FLAC preferred)
- Clear speech, no background music/noise
- Sample should capture his characteristic deep, calm tone

**Legal/Ethical Source Options:**

| Source | Where to Look | Notes |
|--------|---------------|-------|
| **Documentary Trailers** | YouTube - "Morgan Freeman Documentary Narration" | Fair use for transformative content |
| **YouTube Interviews** | Search "Morgan Freeman interview voice" | Look for audio-focused clips |
| **Public Domain** | Archive.org, NASA, Library of Congress | Documentaries he's narrated |
| **Personal Recording** | Record yourself imitating his style | Your own voice is safest legally |

**NOT Recommended:**
- ❌ Ripping from copyrighted films (The Shawshank Redemption, etc.)
- ❌ Using commercial voice samples without license

### Step 2: Save Audio Sample

Place the reference audio here:
```
~/projects/sleep-stories/voices/morgan_freeman_sample.mp3
```

### Step 3: Test Voice Cloning

Once you have the sample, test it:

```bash
cd ~/projects/sleep-stories

# Activate venv
source ~/.openclaw/workspace/temp/chatterbox_venv/bin/activate

# Test with simple text
echo "Close your eyes and drift through time." > test.txt

# Generate with Morgan Freeman voice
python generate-chatterbox-audio-config.py test.txt output.mp3 --voice-clone morgan_freeman --preset deep_soothing
```

### Step 4: Evaluate

Listen to the output:
- Does it sound like Morgan Freeman's tone?
- Is it calm enough for sleep stories?
- Should you adjust `exaggeration` lower/higher?

If needed, try different preset:
```bash
--preset meditation_guide  # Ultra-calm
--preset deep_soothing     # Balanced
--preset calm_narrator     # Default calm
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Reference audio not found"** | Make sure file exists at `voices/morgan_freeman_sample.mp3` |
| **Sounds robotic** | Your reference audio quality is poor, get a cleaner sample |
| **Not similar enough** | Try a longer sample (20-30 sec) or adjust exaggeration |
| **Legal concerns** | Use public domain sources or your own imitation |

---

## 🎙️ Alternative: Train Your Own Voice

Don't want to use Morgan Freeman? You can clone ANY voice:

1. Record yourself (10-30 sec of:
   - "Close your eyes and breathe slowly..."
   - "Let the day's worries drift away..."
)
2. Save as `~/projects/sleep-stories/voices/my_voice.mp3`
3. Update config.json `thindery_custom` section with your audio path
4. Use `--voice-clone thindery_custom`

---

## 📚 Resources

- **Chatterbox Setup:** `~/projects/sleep-stories/CHATTERBOX_SETUP.md`
- **Voice Config:** `~/projects/sleep-stories/voices/chatterbox-config.json`
- **Generation Script:** `~/projects/sleep-stories/generate-chatterbox-audio-config.py`
- **Test Audio:** Listen to `~/projects/sleep-stories/audio/test-chatterbox-generated.mp3` for baseline

---

## 💡 Tips

1. **Shorter is okay** - 10 seconds works, 30 is ideal
2. **Quiet background** - Music/noise interferes with cloning
3. **Consistent tone** - Sample should match how you want narration to sound
4. **Multiple samples** - Try 2-3 different samples and pick the best output

---

## 🎯 Completion Criteria

- [ ] Reference audio obtained (legal source)
- [ ] Audio saved to `voices/morgan_freeman_sample.mp3`
- [ ] Test generation successful
- [ ] Output sounds suitable for sleep stories
- [ ] Update this TODO with result

---

**Happy cloning! 🦅**
