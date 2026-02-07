# 🎬 Sleep Stories YouTube — Project Plan

**Status:** Strategic planning in progress  
**Target:** 1-minute sample by Friday noon  
**Full Pipeline:** Automated, API-driven, minimal human involvement  
**Last Updated:** 2026-02-05 22:47 CST  

---

## 🎯 Project Overview

**Concept:** AI-generated 8-12 hour sleep stories, ambient content, and guided journeys for YouTube monetization

**Differentiation:**
- Fully AI-generated (unique stories each time)
- High production value (not just looped footage)
- Consistent publishing (automated pipeline)
- Multiple content verticals (history, sci-fi, nature, meditation)

**Monetization Path:**
- YouTube Partner Program (1,000 subs, 4,000 watch hours)
- Timeline: 4-6 months to monetization
- Revenue: $100-1,000+/mo at scale

---

## 📊 5 Video Concepts (In Development)

| # | Concept | Category | Script Status | Market Potential | Est. Cost |
|---|---------|----------|---------------|------------------|-----------|
| 1 | **Ancient Rome: A Senator's Evening** | History/Storytelling | ⏳ In progress | High (history niche strong) | $3-5 |
| 2 | **First Contact: Alien Observation Post** | Sci-Fi | ⏳ In progress | High (sci-fi popular) | $3-5 |
| 3 | **Crackling Fireplace: Winter Cabin** | Pure Ambient | ⏳ In progress | Very High (evergreen) | $1-2 |
| 4 | **Rain on Tent: Solo Camping** | Nature/ASMR | ⏳ In progress | Very High (camping trend) | $1-2 |
| 5 | **Journey Through Dreams: Guided Sleep** | Meditation/Wellness | ⏳ In progress | Medium (competition high) | $3-5 |

**Market Analysis:** Researcher analyzing competitor performance, search volume, and revenue estimates

---

## 🤖 Automated Pipeline Architecture (Design Phase)

### Stage 1: Content Generation (AI-First)

**Script Generation:**
- Tool: Ollama + Kimi K2.5 (cloud) via OpenAI-compatible API
- Input: Prompt template + video concept
- Output: 8-12 hour segmented script with timestamps
- Cost: ~$0.50-1.00 per video (8k-16k tokens)

**Image Generation:**
- Primary: Leonardo.ai API (350+ free tokens/day, then $10/mo)
- Backup: Local Stable Diffusion (M4 Mac, unlimited, slower)
- Output: 20-50 keyframe images per video
- Cost: $0.03-0.10 per image

**Audio Narration:**
- Primary: ElevenLabs API ($5/mo = 100k chars, then $0.30/1k chars)
- Alternative: Kokoro TTS (free, local, good quality)
- Output: 8-12 hours of narration
- Cost: $0.50-2.00 per video (depending on char count)

**Music/Ambient:**
- Option A: Royalty-free loops (free, repetitive)
- Option B: AI-generated ambient (Suno/Udio API, ~$0.50/track)
- Option C: Public domain nature sounds (free)
- Cost: $0-1.00 per video

### Stage 2: Video Assembly (Programmatic)

**Tools:**
- FFmpeg (video encoding, image sequences to video)
- Python script orchestration
- MoviePy (Python video editing library)

**Workflow:**
1. Images → Video (slow pan/zoom = "Ken Burns" effect)
2. Narration audio + Ambient audio → Mixed audio
3. Video + Audio → Final render
4. Auto-generate thumbnail (best keyframe + title overlay)

**Specs:**
- Resolution: 1080p (1920x1080) minimum
- Format: MP4, H.264 encoding
- Length: 8-12 hours (480-720 minutes)
- File size: ~2-5GB per video (compression optimized)

### Stage 3: Publishing (Fully Automated)

**YouTube Data API:**
- Upload video programmatically
- Set title, description, tags
- Configure monetization (when eligible)
- Schedule publish time

**Metadata Generation:**
- Auto-generate SEO-optimized titles
- Auto-write descriptions with timestamps
- Auto-generate tags from content analysis
- Auto-create chapter markers (if applicable)

**Scheduling:**
- Cron job: Upload daily/weekly
- Queue system: Batch generate, publish gradually
- Peak time optimization: Upload when audience most active

---

## 💰 Cost-Benefit Analysis (Preliminary)

### Per Video Production Cost

| Component | Cost Range | Notes |
|-----------|-----------|-------|
| **Script (AI)** | $0.50-1.00 | Kimi K2.5 cloud tokens |
| **Images (AI)** | $0.60-5.00 | Leonardo.ai or Midjourney |
| **Narration (TTS)** | $0.50-2.00 | ElevenLabs or Kokoro |
| **Music/Ambient** | $0-1.00 | Depends on source |
| **Compute/Render** | $0-0.50 | M4 Mac local (negligible) |
| **YouTube API** | $0 | Free tier sufficient |
| **TOTAL** | **$1.60-8.50** | Per 8-12 hour video |

### Revenue Projections

**Conservative Scenario:**
- Month 3: 1,000 subs, 500 views/day = $30/mo
- Month 6: 5,000 subs, 2,000 views/day = $120/mo
- Month 12: 15,000 subs, 5,000 views/day = $300/mo

**Aggressive Scenario (viral potential):**
- Month 3: 5,000 subs, 3,000 views/day = $180/mo
- Month 6: 25,000 subs, 15,000 views/day = $900/mo
- Month 12: 100,000 subs, 50,000 views/day = $3,000+/mo

**Break-even:** After ~50-100 videos (4-6 months)

---

## 🛠️ Technical Stack

**Required API Keys (thindery to provide):**
1. **OpenAI/Ollama:** Kimi K2.5 cloud access (via OpenRouter or direct)
2. **ElevenLabs:** API key for TTS (free tier: 10k chars/mo, then $5/mo start)
3. **Leonardo.ai:** API key for images (350 free tokens/day, then $10/mo)
4. **YouTube Data API:** OAuth 2.0 credentials for uploading
5. **Suno/Udio (optional):** For AI-generated music ($10-20/mo)

**Local Tools (no API needed):**
- **Kokoro TTS:** Free local voice synthesis (good quality)
- **FFmpeg:** Video encoding (free, installed)
- **Stable Diffusion:** Local image gen (slower but unlimited)
- **Ollama:** Local model inference (qwen2.5:7b for fast iteration)

**Monthly Operating Costs:**
- Minimum: $0 (using all free tiers + local tools)
- Recommended: $15-25/mo (Leonardo unlimited + ElevenLabs paid tier)
- Professional: $50-100/mo (all APIs paid tiers for reliability)

---

## 📅 Implementation Roadmap

### Phase 1: Setup (Week 1)
- [ ] Collect all API keys from thindery
- [ ] Set up local environment (Python, FFmpeg, Ollama)
 [ ] Test each API independently
- [ ] Build basic pipeline skeleton

### Phase 2: Pipeline Build (Week 1-2)
- [ ] Script generation module (Ollama → script)
- [ ] Image generation module (Leonardo → images)
- [ ] Audio generation module (ElevenLabs → narration)
- [ ] Video assembly module (FFmpeg → video)
- [ ] YouTube upload module (API → published)

### Phase 3: Sample Production (Thursday-Friday)
- [ ] Produce 1-minute sample video
- [ ] Test full pipeline end-to-end
- [ ] Refine based on quality check
- [ ] Deliver to thindery by Friday noon

### Phase 4: Scale (Week 2-4)
- [ ] Generate first batch (5-10 videos)
- [ ] Schedule gradual publishing
- [ ] Monitor analytics, optimize
- [ ] Full automation (hands-off operation)

---

## 🎯 1-Minute Sample Video Spec

**Concept:** "Crackling Fire in a Winter Cabin" (pure ambient, no narration)

**Script:**
- 0-60 seconds: Slow zoom into fireplace, logs burning
- Audio: Crackling fire sounds + subtle wind outside
- Visual: Warm orange glow, subtle smoke wisps

**Technical:**
- One high-quality fireplace image from Leonardo.ai
- Ken Burns effect (slow zoom + pan)
- Public domain fire crackling audio
- FFmpeg render to 1080p MP4

**Delivery:** Friday 12:00 PM CST

---

## 🚀 Competitive Advantages

1. **Consistent Quality:** AI doesn't get tired, quality stays high
2. **Infinite Scale:** Can produce 1 video or 100 videos with same effort
3. **Unique Content:** Every script is AI-generated, not recycled
4. **Rapid Publishing:** Pipeline can generate daily if needed
5. **Multi-Niche:** Can test history, sci-fi, nature simultaneously

---

## ❓ Open Questions for thindery

1. **Budget:** Prefer free tiers ($0) or paid ($15-25/mo) for reliability?
2. **Voice:** Prefer AI narration (ElevenLabs) or pure ambient (no voice)?
3. **Launch:** How many videos ready before going live? (5? 10? 20?)
4. **Publishing:** Daily uploads or batch-schedule (3x/week)?
5. **Content Mix:** All 5 categories equal, or focus on one initially?
6. **Monetization:** OK to use royalty-free audio, or want AI-generated music?

---

**Source of Truth:** ~/memory/YOUTUBE-PIPELINE-ARCHITECTURE.md  
**Detailed Planning:** Subagent sleep-stories-full-strategy (in progress)  
**Sample Delivery:** Friday 12:00 PM CST  
**Status:** 🟢 ACTIVE — Team researching and building
