# REMY-185: Local-Only AI Memory Tool Research

**Research Date:** March 17, 2026  
**Objective:** Design a comprehensive plan for building a local-only, privacy-preserving AI memory tool that records screen activity, indexes it with OCR, and makes it searchable with AI - similar to Rewind.ai but completely offline.

---

## 1. Screen Recording Technologies

### Cross-Platform Capture Options

| Platform | Native API | Key Features |
|----------|------------|--------------|
| **macOS** | ScreenCaptureKit (modern), CGDisplayStream (legacy) | High-performance capture at native resolution, privacy safeguards, SCStream/SCContentFilter for content control |
| **Windows** | DXGI Desktop Duplication API, Windows.Graphics.Capture | Direct GPU access, efficient frame capture, low latency |
| **Linux** | X11 (XShm/XGetImage), Wayland (wlr-screencopy) | X11 widely supported; Wayland requires compositor-specific protocols |
| **Cross-platform** | FFmpeg (dshow/avfoundation/x11grab) | Command-line flexibility, extensive codec support, process-based integration |

### Frame Capture Rates & Storage Implications

**Recommended Capture Strategy:**
- **Event-driven capture** (like Screenpipe): Capture on meaningful OS events (app switches, clicks, typing pauses, scrolling) rather than continuous recording
- **Frame rate**: 1-5 fps for static content, 15-30 fps for active recording
- **Storage estimates** (1080p @ 30fps with H.265):
  - Low motion (static screens): ~0.5-1 GB/hour
  - Medium motion (mixed content): ~1-1.5 GB/hour
  - High motion (video/games): ~2 GB/hour
  - Screenpipe reports ~300 MB per 8 hours with event-driven + JPEG frames vs ~2 GB continuous

**Daily Storage Projection:**
- 8 hours active use: ~300 MB - 2 GB depending on capture strategy
- 30 days: ~9-60 GB
- 1 year: ~108-720 GB (recommend aggressive retention policies)

### Efficient Video Encoding

| Codec | Compression Efficiency | Speed | Best For |
|-------|------------------------|-------|----------|
| **H.265/HEVC** | Best (~43% savings vs VP9, ~39% vs H.264) | Slower (use hardware encoders) | Long-term archival, minimal storage |
| **VP9** | Good (royalty-free) | Slower than H.264 | Web compatibility, open source preference |
| **H.264** | Baseline | Fastest | Compatibility, real-time encoding |
| **AV1** | Excellent (newer) | Very slow | Future-proofing, if compute available |

**Recommendation:** Use H.265 with hardware acceleration (NVENC, Quick Sync, VideoToolbox) for optimal storage efficiency. For screen content with mostly static regions, H.265's larger CTUs (up to 64x64) and better intra-prediction excel.

---

## 2. OCR & Text Extraction

### Local OCR Engine Options

| Engine | Accuracy | Speed | Languages | Best For |
|--------|----------|-------|-----------|----------|
| **Tesseract** | Good (with preprocessing) | Fast | 100+ | Clean, high-contrast screenshots; requires preprocessing |
| **EasyOCR** | Very Good | Fast (GPU), Medium (CPU) | 80+ | Messy/noisy screenshots, multi-line text, out-of-box performance |
| **PaddleOCR** | Excellent | Fast | 80+ | UI element detection, Chinese/Asian languages, production use |
| **TrOCR** | Excellent | Slower | Limited | Handwriting, specialized document types |

**Recommended Pipeline:**
1. **Primary**: EasyOCR for general use (robust, minimal preprocessing)
2. **Fallback**: Tesseract + OpenCV preprocessing for clean UI captures
3. **UI-specific**: PaddleOCR for element detection + text extraction (used in OmniParser)

### UI Element Detection

**Vision-Based Approach (No Accessibility API):**
- **OmniParser method**: Fine-tuned YOLOv8 Nano on 67K UI screenshots
  - Detects interactable elements (buttons, text fields, icons)
  - Applies Set-of-Marks (SoM) bounding boxes
  - Uses PaddleOCR for text extraction
  - Generates DOM-like structure for AI agents
- **Sikuli approach**: OpenCV template matching and feature detection
  - Cross-platform visual automation
  - `find`, `click`, `wait` commands with adjustable match strength

**Hybrid Approach:**
- Use platform accessibility APIs where available (macOS AX API, Windows UI Automation)
- Fall back to vision-based OCR when unavailable (remote desktops, games, web content)

### Multi-Language Support

- **Tesseract**: 100+ languages with `lang` parameter (`-l eng+fra+deu`)
- **EasyOCR**: 80+ languages, automatic language detection
- **PaddleOCR**: Strong Asian language support (Chinese, Japanese, Korean)

---

## 3. Vector Database Options

### Local Vector Database Comparison

| Database | Storage | Features | Resource Usage | Best For |
|----------|---------|----------|----------------|----------|
| **Chroma** | Embedded/SQLite | Simple API, LLM integration, fast prototyping | Low | Rapid development, small-scale local apps |
| **Weaviate** | Docker/self-hosted | Hybrid search (vector + keyword), GraphQL, multi-modal | Medium-High | Feature-rich applications, complex queries |
| **SQLite-vss** | SQLite extension | Ultra-lightweight, SQL-native, no server | Minimal | Simple embedding storage, existing SQLite apps |
| **LanceDB** | Embedded | Serverless, columnar storage, fast ANN search | Low | Default in AnythingLLM, modern alternative |

**Recommendation for This Project:**
- **Primary**: Chroma with persistent storage (`chromadb.PersistentClient(path="./db")`)
- **Alternative**: SQLite-vss for ultra-minimal footprint
- **Hybrid**: LanceDB for modern columnar storage with fast retrieval

### Local Embedding Models

**Recommended Model: `sentence-transformers/all-MiniLM-L6-v2`**
- **Dimensions**: 384
- **Size**: ~80MB, 22M parameters
- **Max sequence length**: 256 tokens (extendable to 512)
- **Speed**: Fast on CPU (~75k snippets in 25 min on MacBook Air)
- **Quality**: 5x faster than all-mpnet-base-v2 with good quality retention
- **Offline**: Downloads once, runs entirely locally

**Alternative Models:**
- `all-mpnet-base-v2`: Better quality, slower, 768 dimensions
- `BAAI/bge-small-en-v1.5`: Optimized for retrieval, 384 dimensions
- `intfloat/e5-small-v2`: Strong for semantic search

### Storage & Retrieval Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Screen Capture │────▶│  Frame Buffer   │────▶│  OCR Extraction │
│  (1-5 fps)      │     │  (Ring buffer)  │     │  (EasyOCR)      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌─────────────────┐              │
│  Vector Search  │◀────│  Chroma/LanceDB │◀─────────────┘
│  (Semantic)     │     │  (Embeddings)   │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Local LLM      │
│  (Ollama)       │
└─────────────────┘
```

---

## 4. AI Models for Querying

### Local LLM Options via Ollama

| Model | Parameters | Quantized Size | Context | Speed | Best For |
|-------|------------|----------------|---------|-------|----------|
| **Llama 3.1/3.3** | 8B | ~5GB (4-bit) | 8K-128K | 20-50 t/s | General reasoning, ecosystem support |
| **Phi-3** | 3.8B | ~4GB (4-bit) | 4K-128K | 10-76 t/s | Speed, code, math, low resource |
| **Gemma 3** | 4B-12B | ~4-7GB (4-bit) | 8K-128K | 30-70 t/s | Math, multimodal (4B+) |
| **DeepSeek-Coder-V2** | 16B | ~10GB | 8K | Medium | Code analysis, technical queries |
| **Qwen2.5** | 7B-14B | ~5-9GB | 32K-128K | Medium | Multilingual, long context |

**Recommendation:**
- **MVP**: Phi-3 (3.8B) for speed and low resource usage
- **Balanced**: Llama 3.1 (8B) for best ecosystem and reasoning
- **Advanced**: Gemma 3 (12B) for multimodal capabilities (if needed)

### Context Window Considerations

**Challenge:** Screen memory requires processing potentially thousands of past events.

**Strategies:**
1. **Retrieval-Augmented Generation (RAG)**: Use vector search to find relevant context, inject into prompt
2. **Summarization**: Periodically summarize older history, store summaries
3. **Hierarchical Memory**: Short-term (last hour), medium-term (today), long-term (archived summaries)
4. **Sliding Window**: Keep last N relevant events in context

**Context Budget Allocation (8K window):**
- System prompt: ~500 tokens
- User query: ~200 tokens
- Retrieved context: ~6,000 tokens (12-15 events with metadata)
- Response buffer: ~1,300 tokens

---

## 5. Privacy & Security Architecture

### Data Never Leaves Local Machine

**Core Principles:**
- All processing on-device (screen capture, OCR, embeddings, LLM inference)
- No cloud API calls for any core functionality
- Optional: Local network sync only (Tailscale, local mesh)

### Encryption at Rest

**SQLite Encryption Options:**

| Solution | Encryption | Authentication | Notes |
|----------|------------|----------------|-------|
| **SQLCipher** | AES-256 | Page-level | Most widely used, open source |
| **SQLite SEE** | AES-128/256 (OFB/CCM) | CCM mode | Official, commercial license |
| **wxSQLite3** | AES-256 | Page-level | Alternative to SQLCipher |
| **libSQL** | SQLCipher default | Page-level | Modern fork with built-in encryption |

**Key Management:**
- User-provided password (derived via PBKDF2/Argon2)
- Hardware-backed storage where available (Secure Enclave, TPM)
- Optional: Keychain/Keyring integration

**File-Level Encryption:**
- macOS: FileVault + encrypted APFS volumes
- Windows: BitLocker + encrypted VHD
- Linux: LUKS + encrypted partition

### User Control Over Retention

**Recommended Retention Policies:**
1. **Time-based**: Auto-delete after N days (default: 30 days)
2. **Storage-based**: Keep last N GB (ring buffer)
3. **App-specific**: Exclude sensitive apps (password managers, banking)
4. **Manual**: One-click deletion of specific time ranges
5. **Incognito mode**: Pause recording (like browser incognito)

**Privacy Features:**
- Exclude list for apps/websites (regex or bundle ID matching)
- Pause on screen lock
- No telemetry or analytics
- Auditable open-source codebase

---

## 6. Reference Projects

### 1. Screenpipe (Primary Reference)
- **GitHub**: https://github.com/screenpipe/screenpipe
- **License**: MIT
- **Stack**: Rust (core), TypeScript (SDK), SQLite, Tesseract/OCR, Whisper
- **Features**:
  - Event-driven screen capture (not continuous)
  - Accessibility tree + OCR fallback
  - Local audio transcription (Whisper)
  - Natural language search with embeddings
  - Plugin system ("Pipes") for AI agents
  - MCP server support for Claude/Cursor
  - REST API on localhost:3030
  - Cross-platform (macOS, Windows, Linux)
- **Storage**: ~300 MB per 8 hours (vs ~2 GB continuous)
- **Status**: Actively maintained, 17k+ GitHub stars

### 2. ActivityWatch
- **GitHub**: https://github.com/ActivityWatch/activitywatch
- **License**: MPL-2.0
- **Stack**: Python, Rust, Vue.js
- **Features**:
  - Application and window title tracking
  - Browser extensions (Chrome, Firefox)
  - Editor plugins for code tracking
  - Categories and analytics
  - Cross-platform (Windows, macOS, Linux, Android)
  - 100% local data storage
- **Note**: No screen capture, but excellent for activity metadata

### 3. Tockler
- **GitHub**: https://github.com/MayGo/tockler
- **License**: GPL-2.0
- **Stack**: Electron, React, TypeScript
- **Features**:
  - Interactive timeline visualization
  - Daily, weekly, monthly statistics
  - Calendar views and charts
  - Application tracking
  - Cross-platform (Windows, macOS, Linux)

### 4. Memary (Memory Stream)
- **GitHub**: https://github.com/kingjulio8238/Memary
- **Features**:
  - Knowledge graph-based memory stream
  - Entity tracking with timestamps
  - Timeline analysis of knowledge evolution
  - Entity Knowledge Store with frequency/recency ranking
- **Note**: No screen capture, but interesting KG approach

### 5. Scriberr (Audio Transcription)
- **GitHub**: https://github.com/rishikanthc/Scriberr
- **License**: Open source
- **Stack**: Self-hosted web app
- **Features**:
  - Local Whisper transcription
  - NVIDIA Parakeet and Canary model support
  - Speaker diarization
  - Word-level timestamps
  - Ollama integration for summaries
  - Playback with seeking

---

## 7. Implementation Roadmap

### MVP Scope (Weeks 1-4)

**Goal**: Smallest useful version - capture screen, extract text, basic search

**Core Features:**
1. **Screen Capture**
   - Event-driven capture (1 fps when activity detected)
   - Single monitor support
   - JPEG frame storage (~100KB per frame)
   - 24-hour rolling buffer

2. **OCR Pipeline**
   - EasyOCR integration (CPU)
   - Extract text from each frame
   - Store text + timestamp + app name

3. **Vector Database**
   - Chroma with persistent storage
   - all-MiniLM-L6-v2 embeddings
   - Basic semantic search

4. **Query Interface**
   - CLI or simple web UI
   - Natural language search
   - Return matching screenshots with context

5. **Privacy Basics**
   - Exclude list for sensitive apps
   - Local-only processing
   - 7-day default retention

**Tech Stack (MVP):**
- Python (rapid prototyping)
- MSS or PyAutoGUI for screen capture
- EasyOCR for text extraction
- Chroma for vector storage
- Ollama + Phi-3 for queries
- SQLite for metadata

**Estimated Effort**: 2-3 weeks (1 developer)

### Phase 2 (Weeks 5-8)

**Goal**: Enhanced capture, audio, better search

**Features:**
1. **Improved Capture**
   - Native platform APIs (ScreenCaptureKit, DXGI)
   - Multi-monitor support
   - H.265 video encoding option
   - Configurable frame rates per app

2. **Audio Transcription**
   - Local Whisper integration
   - Speaker identification
   - Sync with screen events

3. **Advanced Search**
   - Hybrid search (semantic + keyword)
   - Date/time range filters
   - App/window filters
   - OCR confidence scoring

4. **UI Improvements**
   - Timeline visualization
   - Thumbnail grid
   - Quick preview on hover

5. **Privacy Enhancements**
   - SQLCipher encryption
   - Password protection
   - Pause on lock screen

**Tech Stack Additions:**
- Rust or C++ for capture module (performance)
- Whisper.cpp for audio
- Weaviate or LanceDB (if scaling needed)

**Estimated Effort**: 3-4 weeks (1-2 developers)

### Phase 3 (Weeks 9-16)

**Goal**: AI-powered features, plugins, cross-platform polish

**Features:**
1. **AI Memory Agent**
   - Automatic categorization of activities
   - Daily/weekly summaries
   - Proactive suggestions ("You were working on X yesterday")

2. **Plugin System**
   - Obsidian sync
   - Notion integration (local API)
   - Custom webhook triggers

3. **Advanced AI**
   - Multi-modal queries ("Show me the chart from yesterday's meeting")
   - Contextual awareness ("What was I doing before lunch?")
   - Integration with local LLM agents

4. **Enterprise Features**
   - Team sharing (local network)
   - Backup/restore
   - Export to various formats

5. **Performance Optimization**
   - GPU acceleration for OCR
   - Incremental embeddings
   - Compressed video archival

**Estimated Effort**: 6-8 weeks (2 developers)

### Resource Requirements

| Phase | Storage (Daily) | RAM | CPU | GPU |
|-------|-----------------|-----|-----|-----|
| MVP | ~500 MB | 4-8 GB | Moderate | Optional |
| Phase 2 | ~1-2 GB | 8-16 GB | Moderate | Recommended |
| Phase 3 | ~2-4 GB | 16-32 GB | High | Recommended |

### Total Estimated Effort

- **MVP**: 2-3 weeks
- **Full Feature Set**: 3-4 months (2 developers)
- **Production Polish**: +2 months

---

## Key Technical Decisions Summary

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| **Capture Strategy** | Event-driven (not continuous) | 85% storage reduction, captures meaningful changes |
| **OCR Engine** | EasyOCR primary, Tesseract fallback | Robust out-of-box, minimal preprocessing |
| **Vector DB** | Chroma or LanceDB | Simple, embedded, LLM-native |
| **Embedding Model** | all-MiniLM-L6-v2 | Fast, small, good quality, 384 dims |
| **Local LLM** | Phi-3 (3.8B) or Llama 3.1 (8B) | Speed vs. capability balance |
| **Encryption** | SQLCipher | Proven, open source, page-level |
| **Audio** | Whisper.cpp | Local, fast, accurate |
| **Primary Reference** | Screenpipe | Best-in-class open source implementation |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| High storage usage | Event-driven capture, aggressive compression, retention policies |
| Performance impact | Native APIs, hardware acceleration, background processing |
| OCR accuracy | Multi-engine fallback, confidence thresholds, user feedback loop |
| Privacy concerns | 100% local, encryption, exclude lists, auditable code |
| Battery drain (laptops) | Pause on battery, adaptive capture rates, efficient encoding |

---

## Conclusion

Building a local-only AI memory tool is technically feasible with current open-source technologies. The key is **Screenpipe's event-driven approach** - capturing only when meaningful changes occur reduces storage by ~85% while preserving utility.

**Recommended Path:**
1. Fork/learn from Screenpipe (Rust + TypeScript)
2. Or build MVP in Python for rapid iteration
3. Focus on privacy-first architecture from day one
4. Plan for retention policies and user control

The ecosystem is mature: Ollama for LLMs, Chroma for vectors, EasyOCR for text, Whisper for audio, and SQLCipher for encryption. The main challenge is integration and UX, not fundamental technology gaps.

---

*Research compiled for REMY-185. Complete by 7am CT deadline.*
