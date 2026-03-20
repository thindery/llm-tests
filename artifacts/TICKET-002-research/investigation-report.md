# Local-Only AI Memory Tool: Comprehensive Investigation Report

**Project:** Privacy-First, Self-Hosted Screen Capture and Semantic Search Application for macOS  
**Target Experience:** Clean, polished macOS app similar to Ollama's interface — simple, elegant, local-first  
**Date:** March 15, 2026  
**Prepared By:** Business Analyst / Technical Researcher

---

## Executive Summary

This report investigates the feasibility, technical architecture, costs, and risks of building a local-only AI memory tool as an alternative to cloud-dependent solutions like Rewind.ai. The tool would continuously capture screen content, perform OCR and embedding generation locally, and enable semantic search across the user's digital history — all while keeping data strictly on-device.

**Key Finding:** The project is technically feasible with modern macOS APIs and open-source ML models, but requires careful attention to performance optimization, privacy compliance, and user trust building.

---

## 1. Product Design & User Flow

### 1.1 How the App Works from User Perspective

**Onboarding Flow:**
1. User downloads app (direct download or Mac App Store)
2. Grant permissions: Screen Recording, Accessibility (for window detection), and optionally Microphone (for meeting transcription)
3. Configure capture settings (frequency, exclusions, storage limits)
4. App runs in background with menu bar icon for quick access
5. Global hotkey (e.g., ⌘+Shift+Space) opens search interface

**Daily Usage:**
- App captures screen automatically based on configured triggers
- User presses hotkey → floating search bar appears (similar to Spotlight/Alfred)
- Type natural language query: "that email about the budget from Tuesday"
- Results appear as timeline with thumbnails, timestamps, and extracted text
- Click result to view full screenshot in context

**Key Interactions:**
- **Search:** Natural language or keyword-based
- **Timeline View:** Scroll through chronological history
- **Filter:** By app, date range, or content type
- **Export:** Save specific captures or time ranges
- **Pause/Resume:** Temporary disable capture for sensitive work

### 1.2 Screen Capture Mechanism

**Recommended Approach: Hybrid Triggered Capture**

| Approach | Pros | Cons |
|----------|------|------|
| **Continuous (Video)** | Complete history, smooth playback | Massive storage, high CPU, battery drain |
| **Time-based (Every X sec)** | Simple, predictable | Misses rapid context changes, wastes storage on idle screens |
| **Event-triggered** | Efficient, captures meaningful changes | May miss important static content |
| **Hybrid (Recommended)** | Best balance of coverage and efficiency | More complex implementation |

**Recommended Hybrid Strategy:**
1. **Activity Detection:** Capture when user interacts (mouse movement, key presses)
2. **App Switch Detection:** Capture when active app changes
3. **Content Change Detection:** Compare frames, capture when visual diff exceeds threshold
4. **Periodic Safety Net:** Capture every 30 seconds if no other triggers fired
5. **Manual Capture:** Global hotkey for instant bookmark

**Capture Specifications:**
- Resolution: Scaled to 1080p width (maintain aspect ratio) for storage efficiency
- Format: HEIC/HEIF (better compression than PNG) or WebP
- Frame rate: Variable based on activity (0.1-2 FPS effective)

### 1.3 What Gets Captured vs Excluded

**Captured by Default:**
- Main display content
- Active window focus
- Timestamps and active application name
- Window titles (when available)

**Excluded by Default (Privacy Protection):**
- Password fields (detect via secure input mode)
- Incognito/private browser windows
- Apps on blocklist (password managers, banking apps)
- Screens when screen saver/lock screen active
- Video content (optional, to save space)

**User-Configurable Exclusions:**
- Specific applications
- Specific websites/domains (requires browser extension)
- Time periods ("never capture after 10 PM")
- Screen areas (exclude specific monitors or regions)

### 1.4 Search Interface

**Primary Interface: Floating Search Bar**
- Design inspiration: Ollama's clean, minimal UI
- Global hotkey activation (customizable)
- Natural language input with auto-complete
- Results displayed as cards with:
  - Thumbnail preview
  - Timestamp and app icon
  - Matched text excerpt with highlighting
  - Confidence score

**Search Types:**
1. **Semantic Search (Default):** "Show me the Slack conversation about API keys"
2. **Keyword Search:** Exact text matching with boolean operators
3. **Visual Search:** "Find the blue dashboard with charts"
4. **Temporal Search:** "What was I working on last Tuesday at 3 PM?"

**Advanced Features:**
- Search within specific apps or time ranges
- Saved searches / smart folders
- Search suggestions based on recent activity

### 1.5 Privacy Controls and User Settings

**Core Privacy Principles:**
1. **Local-only by default:** No cloud upload, ever
2. **User owns data:** Full export and deletion controls
3. **Transparent:** Clear indicators when capturing
4. **Minimal data:** Only capture what's necessary

**Privacy Settings:**
- **Capture toggle:** Pause all recording
- **Exclusion list:** Apps, websites, keywords
- **Auto-delete:** Set retention period (7 days to unlimited)
- **Storage limit:** Maximum disk usage
- **Encryption:** Option to encrypt database at rest
- **Access log:** View when app accessed data

**Visual Indicators:**
- Menu bar icon changes when capturing
- Optional: Brief screen flash on capture
- Status window showing recent activity

### 1.6 Export/Import Functionality

**Export Options:**
- **Single capture:** PNG/JPG + metadata JSON
- **Time range:** ZIP archive with HTML index
- **Full database:** Encrypted archive for backup/migration
- **Text only:** CSV of extracted text with timestamps

**Import Functionality:**
- Restore from backup archive
- Import from other tools (limited support initially)
- Merge databases from multiple machines

---

## 2. Technical Architecture Deep Dive

### 2.1 Screen Capture: macOS ScreenCaptureKit vs Alternatives

**ScreenCaptureKit (Recommended)**

Introduced in macOS 12.3+, ScreenCaptureKit is the modern replacement for deprecated CGDisplayStream APIs.

**Pros:**
- Native Apple framework, optimized for performance
- Hardware-accelerated capture using VideoToolbox
- Supports content filtering (windows, displays, apps)
- Efficient memory management
- Built-in support for audio capture
- Future-proof (CGDisplayStream is deprecated)

**Cons:**
- macOS 12.3+ only (limits older Mac support)
- Requires user permission for screen recording
- Some private APIs may be needed for advanced features

**Implementation Approach:**
```swift
// Pseudo-code structure
import ScreenCaptureKit

class ScreenCaptureManager: NSObject, SCStreamDelegate {
    var stream: SCStream?
    
    func startCapture() {
        let filter = SCContentFilter(display: display, 
                                     excludingApplications: excludedApps,
                                     exceptingWindows: includedWindows)
        let config = SCStreamConfiguration()
        config.width = 1920
        config.height = 1080
        config.minimumFrameInterval = CMTime(value: 1, timescale: 2) // 2 FPS max
        
        stream = SCStream(filter: filter, configuration: config, delegate: self)
        stream?.addStreamOutput(self, type: .screen, sampleHandlerQueue: queue)
    }
}
```

**Alternatives Considered:**

| Technology | Status | Recommendation |
|------------|--------|------------------|
| CGDisplayStream | Deprecated | Avoid for new projects |
| AVFoundation ScreenCapture | Limited | Not suitable for continuous capture |
| Third-party (Syphon, etc.) | Extra dependency | Unnecessary with ScreenCaptureKit |

### 2.2 OCR: Apple Vision vs Tesseract vs Other Options

**Apple Vision (Recommended)**

**Pros:**
- Native framework, no external dependencies
- Optimized for Apple Silicon (Neural Engine)
- Fast performance with low power consumption
- Supports multiple languages
- Integrated with macOS security model
- No additional model downloads needed

**Cons:**
- macOS 10.13+ required
- Less customizable than Tesseract
- Limited to Apple's supported languages

**Performance:** ~50-100ms per 1080p frame on M1 Mac

**Tesseract (Alternative)**

**Pros:**
- Open source, highly customizable
- Supports 100+ languages
- Can be trained on custom fonts
- Cross-platform consistency

**Cons:**
- Slower than Apple Vision (CPU-bound)
- Requires additional binary distribution (~20MB)
- More complex integration

**Performance:** ~200-500ms per 1080p frame

**Recommendation:** Use Apple Vision as primary OCR, with optional Tesseract fallback for specific use cases or languages not supported by Vision.

**Implementation:**
```swift
import Vision

func performOCR(on image: CGImage) {
    let request = VNRecognizeTextRequest { request, error in
        guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
        let text = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: " ")
        // Store text with metadata
    }
    request.recognitionLevel = .accurate // or .fast for speed
    request.usesLanguageCorrection = true
    
    let handler = VNImageRequestHandler(cgImage: image)
    try? handler.perform([request])
}
```

### 2.3 Embeddings: Local Model Options

**Recommended: all-MiniLM-L6-v2**

**Specifications:**
- Size: ~80MB (ONNX format)
- Dimensions: 384-dimensional vectors
- Performance: ~10-50ms per sentence on M1
- License: Apache 2.0
- Languages: Multilingual support

**Pros:**
- Excellent speed/quality tradeoff
- Proven track record in production
- Easy integration via ONNX Runtime
- Small enough for local deployment

**Alternatives:**

| Model | Size | Dimensions | Speed | Quality | Use Case |
|-------|------|------------|-------|---------|----------|
| all-MiniLM-L6-v2 | 80MB | 384 | Fast | Good | **Recommended default** |
| all-mpnet-base-v2 | 110MB | 768 | Medium | Better | Higher quality needs |
| bge-small-en | 130MB | 384 | Fast | Good | RAG-optimized |
| GTE-base | 220MB | 768 | Medium | Excellent | Best quality, larger |
| E5-small-v2 | 130MB | 384 | Fast | Good | Microsoft research model |

**ONNX Runtime Integration:**
```swift
// Using onnxruntime-swift (community package)
import OnnxRuntime

class EmbeddingModel {
    let session: ORTSession
    
    init() throws {
        let modelPath = Bundle.main.path(forResource: "all-MiniLM-L6-v2", ofType: "onnx")!
        let env = try ORTEnvironment(loggingLevel: .warning)
        session = try env.createSession(modelPath: modelPath)
    }
    
    func embed(text: String) throws -> [Float] {
        // Tokenize, run inference, return embedding
    }
}
```

**Quantization:**
- Use INT8 quantized models for 2x speedup with minimal quality loss
- Consider Core ML conversion for Apple Silicon optimization

### 2.4 Database: SQLite, Core Data, or Chroma/FAISS

**Recommended Architecture: Hybrid Approach**

**Metadata & Text: SQLite with FTS5**

**Pros:**
- Built into macOS, no dependencies
- Full-text search via FTS5 extension
- ACID compliance
- Small footprint
- Easy backup/restore

**Schema Design:**
```sql
CREATE TABLE captures (
    id INTEGER PRIMARY KEY,
    timestamp REAL NOT NULL,
    app_name TEXT,
    window_title TEXT,
    image_path TEXT NOT NULL,
    ocr_text TEXT,
    embedding_id TEXT
);

CREATE VIRTUAL TABLE captures_fts USING fts5(
    ocr_text, 
    app_name, 
    window_title,
    content='captures',
    content_rowid='id'
);
```

**Vector Search: FAISS (Recommended) or Chroma**

**FAISS (Facebook AI Similarity Search):**

**Pros:**
- Industry standard for vector search
- Extremely fast (millions of vectors searchable in <10ms)
- Multiple index types (Flat, IVF, HNSW)
- C++ core with Swift/Obj-C bindings
- No Python runtime required

**Cons:**
- Requires C++ integration
- More complex API than Chroma

**Chroma:**

**Pros:**
- Simple, intuitive API
- Built-in embedding management
- Pure Python (easier prototyping)

**Cons:**
- Requires Python runtime (heavy dependency for macOS app)
- Less performant than FAISS at scale
- Larger memory footprint

**Recommendation:** Use FAISS for production (via C++ bindings or ONNX Runtime), with HNSW index for approximate nearest neighbor search.

**Index Configuration:**
```cpp
// FAISS HNSW index - good balance of speed and accuracy
int dim = 384;  // all-MiniLM-L6-v2 dimensions
int M = 32;     // connections per node
faiss::IndexHNSWFlat index(dim, M);
index.hnsw.efConstruction = 200;  // build-time accuracy
index.hnsw.efSearch = 128;        // query-time accuracy
```

**Core Data (Not Recommended for this use case):**
- Too heavy for time-series data
- Complex migration model
- Poor fit for vector storage

### 2.5 Storage Optimization and Compression

**Image Storage:**

| Format | Compression | Quality | Recommendation |
|--------|-------------|---------|----------------|
| PNG | Lossless | Perfect | Too large for this use case |
| JPEG | Lossy | Good | Acceptable, widely compatible |
| HEIC/HEIF | Lossy | Excellent | **Recommended** - 50% smaller than JPEG |
| WebP | Lossy/lossless | Excellent | Good alternative, less native support |

**Storage Strategy:**
1. Capture at native resolution
2. Downscale to 1080p width (maintain aspect)
3. Convert to HEIC with 0.8 quality
4. Store in dated folders: `~/Library/Application Support/AppName/Captures/2026/03/15/`

**Expected Storage:**
- Average capture: 100-300KB (HEIC)
- 8 hours of active use: ~500 captures = 50-150MB/day
- 30 days retention: 1.5-4.5GB
- With compression and deduplication: ~1-2GB/month

**Deduplication:**
- Perceptual hash (pHash) to detect similar frames
- Skip capture if similarity > 95% to last frame
- Store only changed regions (optional advanced feature)

**Data Retention:**
- Configurable: 7 days, 30 days, 90 days, 1 year, unlimited
- Automatic deletion of old captures
- Archive option: compress old data to cold storage

### 2.6 Search Implementation Details

**Hybrid Search Architecture:**

1. **Query Parsing:**
   - Detect temporal references ("yesterday", "last week")
   - Extract app names, keywords
   - Determine if semantic or keyword search needed

2. **Semantic Search Flow:**
   ```
   User Query → Embedding Model → Vector (384d) → FAISS Index → Top-K Results
   ```

3. **Keyword Search Flow:**
   ```
   User Query → FTS5 Query → SQLite → Ranked Results
   ```

4. **Result Merging:**
   - Combine semantic and keyword results
   - Weight by recency (newer = higher score)
   - Deduplicate and rerank

**Performance Targets:**
- Query latency: <100ms for 100K captures
- Index build time: <1ms per capture
- Memory usage: <500MB for 100K captures

### 2.7 Performance Considerations

**CPU Usage:**
- Screen capture: 5-15% (ScreenCaptureKit is efficient)
- OCR: 10-20% during capture, batched processing recommended
- Embedding generation: 5-10% per capture
- **Target:** <20% average CPU during active use

**Memory Usage:**
- App resident: 100-200MB
- FAISS index: ~400 bytes per vector × 100K captures = 40MB
- Image cache: 50-100MB
- **Target:** <500MB total

**Battery Impact:**
- Screen capture: Low (GPU-accelerated)
- OCR: Medium (Neural Engine helps)
- Embeddings: Low (can be batched during idle)
- **Target:** <5% battery impact per hour

**Disk I/O:**
- Sequential writes for images (efficient)
- SQLite WAL mode for database (reduces fsync)
- Background compression tasks

**Optimization Strategies:**
1. **Batch Processing:** Queue OCR and embedding generation, process during idle
2. **Quality Tiers:** Fast OCR during capture, accurate OCR in background
3. **Smart Capture:** Reduce frequency when battery < 20%
4. **Index Optimization:** Rebuild FAISS index periodically for optimal search

---

## 3. Development Cost & Timeline

### 3.1 MVP Scope (v1.0)

**Core Features:**
- [ ] Screen capture with ScreenCaptureKit (hybrid trigger mode)
- [ ] Apple Vision OCR with text extraction
- [ ] all-MiniLM-L6-v2 embedding generation
- [ ] SQLite + FAISS storage and search
- [ ] Basic search UI (floating bar + results view)
- [ ] Privacy controls (exclusions, pause/resume)
- [ ] Settings/preferences panel
- [ ] Menu bar icon and global hotkey
- [ ] Basic export (single capture, text CSV)

**Out of Scope for MVP:**
- Audio transcription
- Browser extension for web exclusions
- Advanced visual search
- Cloud sync
- Mobile companion app
- Plugin system

### 3.2 Team Roles Needed

**Minimum Viable Team (3 people):**

| Role | FTE | Responsibilities |
|------|-----|------------------|
| **macOS Developer (Lead)** | 1.0 | App architecture, ScreenCaptureKit, UI/UX, SQLite |
| **ML Engineer** | 0.75 | ONNX integration, embedding pipeline, FAISS integration |
| **Product/QA Engineer** | 0.5 | Testing, privacy compliance, documentation, user feedback |

**Ideal Team (4-5 people):**
- Add: DevOps/Release Engineer (0.5 FTE) - CI/CD, notarization, updates
- Add: UI/UX Designer (0.25 FTE) - Visual design, iconography

### 3.3 Timeline Estimates

**Phase 1: Foundation (Weeks 1-4)**
- Project setup, architecture decisions
- Screen capture implementation
- Basic database schema
- **Deliverable:** Working capture pipeline

**Phase 2: Intelligence (Weeks 5-8)**
- OCR integration
- Embedding pipeline
- FAISS integration
- **Deliverable:** Searchable captures

**Phase 3: UI/UX (Weeks 9-12)**
- Search interface
- Settings panel
- Menu bar integration
- **Deliverable:** Complete user experience

**Phase 4: Polish (Weeks 13-16)**
- Performance optimization
- Privacy controls
- Bug fixes
- Beta testing
- **Deliverable:** Release candidate

### 3.4 Cost Breakdown

**Personnel Costs (16-week MVP):**

| Scenario | Team Size | Rate/Week | Total Cost |
|----------|-----------|-----------|------------|
| **Conservative** | 3 contractors | $3,000 | $144,000 |
| **Moderate** | 4 mixed (2 FT, 2 PT) | $4,000 | $256,000 |
| **Aggressive** | 5 full-time | $6,000 | $480,000 |

*Assumes blended rate of $1,000/person/week for conservative, higher rates for experienced contractors*

**Infrastructure & Tools:**
- GitHub/CI: $50/month
- Code signing certificate: $100/year
- Test devices (Macs): $3,000 (one-time)
- Design tools (Figma, etc.): $50/month
- **Total (Year 1):** ~$4,000

**Third-Party Licenses:**
- All core technologies are open source (MIT/Apache)
- No per-seat licensing costs
- **Total:** $0

### 3.5 Three Scenarios

**Conservative Scenario ($150K, 6 months):**
- 3 part-time contractors
- Reduced feature set (no FAISS, use SQLite FTS only)
- Simpler UI
- Limited testing
- **Risk:** Quality issues, delayed launch

**Moderate Scenario ($260K, 4 months):**
- 4-person team (2 FT devs, 1 ML, 1 PT QA)
- Full feature set as defined
- Professional polish
- Beta testing program
- **Risk:** Scope creep, competition

**Aggressive Scenario ($500K, 3 months):**
- 5-person full-time team
- Premium features (audio transcription, visual search)
- Professional design
- Launch marketing
- **Risk:** Higher burn rate, market timing

---

## 4. Support & Update Strategy

### 4.1 Update Mechanism: Sparkle vs Mac App Store

**Recommendation: Sparkle (Direct Distribution)**

**Sparkle Pros:**
- Faster release cycles (no App Store review)
- Direct user relationship
- Can use private APIs (ScreenCaptureKit restrictions)
- Delta updates (smaller downloads)
- No 30% Apple tax on sales

**Sparkle Cons:**
- Users must download from website
- No App Store discoverability
- Self-managed code signing

**Mac App Store Cons:**
- Screen recording apps face rejection risk
- Review process delays
- Sandboxing limitations
- Revenue share

**Implementation:**
- Use Sparkle 2.x (supports sandboxing if needed later)
- EdDSA signatures for security
- Appcast XML hosted on company website
- Automatic background updates with user consent

### 4.2 Model Updates

**Embedding Model Updates:**
- Ship new models as delta updates
- Versioned model storage (v1, v2, etc.)
- Migration: Re-embed existing captures in background
- Allow users to opt-out of model updates

**OCR Updates:**
- Apple Vision updates with macOS (no action needed)
- Tesseract language packs as optional downloads

**Update Strategy:**
- Quarterly model updates (if improvements significant)
- Emergency updates for critical bugs
- Beta channel for early adopters

### 4.3 Data Migration Between Versions

**Database Migrations:**
- SQLite migrations via lightweight framework (FMDB, GRDB)
- Versioned schema (v1, v2, etc.)
- Automatic migration on first launch
- Backup before migration

**Vector Index Migration:**
- FAISS index rebuild required on dimension changes
- Background task with progress indicator
- Option to archive old data instead of migrate

### 4.4 Support Channels and Documentation

**Support Channels:**
1. **In-app Help:** Contextual tooltips, searchable docs
2. **Email Support:** support@company.com
3. **GitHub Issues:** Public bug tracking (if open source)
4. **Discord/Slack:** Community support

**Documentation:**
- Getting Started guide
- Privacy & Security whitepaper
- API documentation (for extensibility)
- Troubleshooting FAQ

**Response Time SLAs:**
- Critical bugs: 24 hours
- Feature requests: 1 week acknowledgment
- General questions: 48 hours

### 4.5 Open Source Strategy

**Recommendation: Open Core Model**

**Open Source (GitHub):**
- Core capture engine
- OCR pipeline
- Search algorithms
- Basic UI components

**Proprietary (Paid):**
- Advanced AI features
- Cloud sync (if added)
- Priority support
- Enterprise features

**Benefits:**
- Community contributions
- Transparency builds trust
- Marketing through GitHub
- Recruiting tool

**License:** AGPL or GPL (copyleft) vs MIT (permissive) - recommend MIT for broader adoption

---

## 5. Competitive Analysis

### 5.1 Detailed Comparison

#### Rewind.ai (The Pioneer)

**Status:** Acquired by OpenAI (2024), consumer product discontinued

**Strengths:**
- Polished UX
- Strong brand recognition
- Good search accuracy
- iPhone companion app

**Weaknesses:**
- Cloud-dependent (privacy concerns)
- Expensive ($19-29/month)
- Heavy resource usage
- Now discontinued

**Lessons Learned:**
- Market demand exists
- Privacy is a major concern
- Local-first is a differentiator

#### Microsoft Recall (Windows Only)

**Status:** Launched 2024, significant privacy backlash

**Strengths:**
- Deep OS integration
- AI-powered search
- Free (included in Windows)

**Weaknesses:**
- Windows only
- Privacy controversy (opt-out vs opt-in)
- Security concerns (unencrypted storage initially)
- Limited customization

**Lessons Learned:**
- Privacy defaults matter hugely
- Transparency is essential
- Security must be bulletproof
- Opt-in, not opt-out

#### Pensieve (Open Source)

**Status:** Community project, limited development

**Strengths:**
- Open source
- Local-only
- Privacy-focused

**Weaknesses:**
- Unpolished UI
- Limited features
- No active development
- Complex setup

**Lessons Learned:**
- Open source alone isn't enough
- UX matters for adoption
- Need professional polish

### 5.2 Feature Matrix

| Feature | Rewind | Recall | Pensieve | **Our Product** |
|---------|--------|--------|----------|-----------------|
| **Platform** | macOS, iOS | Windows | Linux | **macOS** |
| **Local-only** | ❌ | ✅ | ✅ | **✅** |
| **Cloud sync** | ✅ | ❌ | ❌ | **Optional** |
| **OCR** | ✅ | ✅ | ✅ | **✅** |
| **Semantic search** | ✅ | ✅ | ❌ | **✅** |
| **Audio transcription** | ✅ | ❌ | ❌ | **v2** |
| **iOS companion** | ✅ | ❌ | ❌ | **v2** |
| **Open source** | ❌ | ❌ | ✅ | **Core** |
| **Price** | $19-29/mo | Free | Free | **Freemium** |
| **Privacy controls** | Basic | Poor | Good | **Excellent** |

### 5.3 Pricing Strategy Recommendations

**Recommended Model: Freemium**

**Free Tier:**
- 7 days retention
- Basic search
- Single device
- Community support

**Pro Tier ($9/month or $79/year):**
- Unlimited retention
- Advanced search (semantic + visual)
- Export functionality
- Priority support
- Early access to features

**Enterprise (Custom):**
- Team management
- Centralized billing
- Audit logs
- Custom integrations
- SLA

**Rationale:**
- Lower barrier than Rewind ($19-29)
- Sustainable revenue model
- Free tier drives adoption
- Annual pricing reduces churn

### 5.4 Differentiation Opportunities

**Key Differentiators:**

1. **True Local-First:**
   - No cloud ever (not even optional)
   - Verifiable by code audit
   - Network traffic monitoring

2. **Privacy by Design:**
   - Opt-in by default
   - Granular exclusions
   - Encrypted storage option
   - No telemetry

3. **Open Source Core:**
   - Build trust through transparency
   - Community contributions
   - Self-host option for enterprises

4. **Performance:**
   - Optimized for Apple Silicon
   - Minimal battery impact
   - Small storage footprint

5. **macOS Native:**
   - Follows Apple design guidelines
   - Native Swift/SwiftUI
   - System integration (Spotlight, Shortcuts)

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Performance issues** | Medium | High | Early profiling, ScreenCaptureKit optimization, batch processing |
| **Battery drain** | Medium | High | Adaptive capture rates, idle detection, power mode awareness |
| **Storage bloat** | Medium | Medium | Compression, deduplication, configurable retention |
| **OCR accuracy** | Low | Medium | Apple Vision + Tesseract fallback, user feedback loop |
| **Search latency** | Low | High | FAISS optimization, indexing strategies, result caching |
| **macOS API changes** | Medium | Medium | Abstraction layer, active maintenance, beta testing |

**Risk Register:**
- **#1 Performance:** Screen capture + OCR + embeddings running simultaneously could overwhelm older Macs
  - *Mitigation:* Tiered quality settings, hardware detection, background processing queues

- **#2 Storage:** Users with 4K displays could generate 4x the storage
  - *Mitigation:* Aggressive downscaling, smart compression, storage warnings

### 6.2 Privacy/Legal Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **GDPR compliance** | High | High | Data portability, right to deletion, consent management |
| **Workplace monitoring laws** | Medium | High | Clear user-only scope, no enterprise monitoring features |
| **Screenshot of sensitive content** | High | Medium | Exclusion lists, secure input detection, user education |
| **Data breach (local)** | Low | High | Encryption at rest, access controls, security audit |
| **Third-party app liability** | Low | Medium | Terms of service, liability limitations |

**GDPR Considerations:**
- Lawful basis: Legitimate interest (user's own data)
- Data minimization: Only capture what user configures
- Right to erasure: Complete deletion functionality
- Data portability: Export in standard formats
- Breach notification: Not applicable (local-only)

**Mitigation Strategies:**
1. Privacy policy drafted by legal counsel
2. Data Protection Impact Assessment (DPIA)
3. Regular security audits
4. Bug bounty program
5. Clear terms of service

### 6.3 Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Apple builds competitor** | Medium | High | Differentiate on openness, move fast, build community |
| **Low user adoption** | Medium | High | Free tier, marketing, viral features |
| **Privacy concerns kill category** | Low | High | Transparent practices, open source, user education |
| **Competitor with better AI** | Medium | Medium | Focus on local advantage, partner with AI providers |
| **Platform shift (AR/VR)** | Low | Medium | Architecture flexibility, cross-platform planning |

**Competitive Response:**
- If Apple enters: Pivot to cross-platform, enterprise, or advanced features
- If Google enters: Emphasize privacy differentiation
- If open source alternative emerges: Welcome contributions, maintain quality lead

### 6.4 Mitigation Strategies Summary

**Technical:**
- Prototype early with real-world usage
- Performance budgets and automated testing
- Gradual rollout (beta → public)

**Legal:**
- Legal review before launch
- Privacy-first design reviews
- Insurance (E&O, cyber liability)

**Market:**
- Build community early
- Freemium reduces adoption friction
- Focus on underserved niches (developers, researchers)

---

## 7. Recommendations

### 7.1 Go/No-Go Recommendation

**RECOMMENDATION: GO — with conditions**

**Rationale:**
- Market gap exists (Rewind discontinued, Recall Windows-only)
- Technical feasibility proven (ScreenCaptureKit, Apple Vision, ONNX)
- Privacy concerns create opportunity for local-first solution
- Open source approach builds trust and community

**Conditions for Proceeding:**
1. ✅ Team can be assembled with macOS + ML expertise
2. ✅ $150K-250K budget available for MVP
3. ✅ 4-6 month timeline acceptable
4. ⚠️ Legal review of privacy implications completed
5. ⚠️ Prototype validates performance on target hardware

### 7.2 Suggested MVP Features

**Must-Have (v1.0):**
1. Screen capture with ScreenCaptureKit (hybrid triggers)
2. Apple Vision OCR
3. all-MiniLM-L6-v2 embeddings via ONNX
4. SQLite + FAISS storage
5. Floating search bar UI
6. Basic privacy controls (exclusions, pause)
7. 7-day retention (free) / unlimited (pro)

**Should-Have (v1.1):**
1. Browser extension for web exclusions
2. Export functionality (images, text, full backup)
3. Keyboard shortcuts customization
4. Dark mode

**Nice-to-Have (v2.0):**
1. Audio transcription (Whisper local)
2. Visual search (CLIP embeddings)
3. iOS companion app (view only)
4. Spotlight integration

### 7.3 Key Technical Decisions to Make

**Immediate Decisions Required:**

1. **Database: SQLite + FAISS vs Chroma?**
   - *Recommendation:* SQLite + FAISS for performance

2. **OCR: Apple Vision only or Tesseract fallback?**
   - *Recommendation:* Apple Vision MVP, Tesseract v1.1

3. **Embeddings: all-MiniLM-L6-v2 or larger model?**
   - *Recommendation:* all-MiniLM-L6-v2 for speed/quality balance

4. **Distribution: Sparkle or Mac App Store?**
   - *Recommendation:* Sparkle (direct download)

5. **License: MIT or GPL?**
   - *Recommendation:* MIT for broader adoption

**Architecture Decisions:**

6. **Language: Swift vs Swift + Python?**
   - *Recommendation:* Pure Swift (avoid Python runtime)

7. **UI Framework: AppKit vs SwiftUI?**
   - *Recommendation:* SwiftUI for new code, AppKit for complex components

8. **Vector Index: Flat vs HNSW vs IVF?**
   - *Recommendation:* HNSW for production (good balance)

### 7.4 Next Steps if Proceeding

**Week 1-2: Validation**
- [ ] Build proof-of-concept screen capture
- [ ] Validate OCR performance on target hardware
- [ ] Test FAISS integration with Swift
- [ ] Confirm embedding model performance

**Week 3-4: Setup**
- [ ] Assemble development team
- [ ] Set up CI/CD pipeline
- [ ] Create project repository and documentation
- [ ] Draft privacy policy and terms of service

**Week 5-8: Development Sprint 1**
- [ ] Core capture pipeline
- [ ] Database schema and storage
- [ ] Basic OCR integration

**Week 9-12: Development Sprint 2**
- [ ] Embedding pipeline
- [ ] FAISS search integration
- [ ] Basic UI implementation

**Week 13-16: Polish & Beta**
- [ ] Performance optimization
- [ ] Privacy controls
- [ ] Private beta launch

**Month 5: Launch**
- [ ] Public beta
- [ ] Feedback iteration
- [ ] v1.0 release

---

## Appendices

### A. Technology Stack Summary

| Component | Technology | Alternative |
|-----------|------------|-------------|
| Language | Swift | Objective-C |
| UI | SwiftUI + AppKit | Pure AppKit |
| Capture | ScreenCaptureKit | CGDisplayStream (deprecated) |
| OCR | Apple Vision | Tesseract |
| Embeddings | all-MiniLM-L6-v2 (ONNX) | Core ML converted |
| Database | SQLite | Core Data |
| Vector DB | FAISS | Chroma, Annoy |
| Updates | Sparkle | Mac App Store |

### B. Resource Requirements

**Development:**
- Mac with Apple Silicon (M1 Pro or better recommended)
- Xcode 15+
- 16GB+ RAM
- 100GB free space for test data

**Testing:**
- Intel Mac (compatibility testing)
- Multiple macOS versions (13, 14, 15)
- External monitor (multi-display testing)

### C. Reference Links

- **ScreenCaptureKit:** https://developer.apple.com/documentation/screencapturekit
- **Apple Vision:** https://developer.apple.com/documentation/vision
- **FAISS:** https://github.com/facebookresearch/faiss
- **Chroma:** https://github.com/chroma-core/chroma
- **all-MiniLM-L6-v2:** https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- **Sparkle:** https://sparkle-project.org
- **ONNX Runtime:** https://onnxruntime.ai

---

*Report prepared for internal planning purposes. Data based on research conducted March 2026.*

---
Status: COMPLETE
Ready for Review
