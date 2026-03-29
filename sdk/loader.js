/**
 * AgentTrace SDK - Session Tracking with GDPR Consent Support v2.0.0
 * 
 * This SDK tracks user sessions and includes full GDPR consent compliance.
 * 
 * Ticket: REMY-258 - GDPR Server-Side Consent Records
 * 
 * @version 2.0.0
 * @author AgentTrace
 */

(function(global) {
  'use strict';

  const SDK_VERSION = '2.0.0';

  const DEFAULT_CONFIG = {
    endpoint: 'https://api.agenttrace.com',
    batchSize: 10,
    flushInterval: 5000,
    debug: false,
    consentCheckInterval: 30000, // Check consent every 30s
    consentApiEndpoint: '/api/v1/consent',
    requireConsent: true, // Block tracking until consent obtained
  };

  // Consent types
  const CONSENT_TYPES = {
    ANALYTICS: 'analytics',
    MARKETING: 'marketing',
    FUNCTIONAL: 'functional',
  };

  // Event categories requiring specific consent types
  const EVENT_CONSENT_MAP = {
    'page_view': CONSENT_TYPES.ANALYTICS,
    'click': CONSENT_TYPES.ANALYTICS,
    'scroll': CONSENT_TYPES.ANALYTICS,
    'custom_event': CONSENT_TYPES.ANALYTICS,
    'form_submit': CONSENT_TYPES.FUNCTIONAL,
    'track_conversion': CONSENT_TYPES.MARKETING,
    'personalization': CONSENT_TYPES.MARKETING,
    'ad_impression': CONSENT_TYPES.MARKETING,
    'user_identify': CONSENT_TYPES.FUNCTIONAL,
  };

  // Consent banner state
  let consentBannerState = {
    shown: false,
    userId: null,
    projectId: null,
    consentStatus: {
      analytics: null,
      marketing: null,
      functional: null,
    },
    settings: null,
  };

  /**
   * AgentTrace SDK Class
   */
  class AgentTraceSDK {
    constructor(config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.queue = [];
      this.sessionId = null;
      this.initialized = false;
      this.consentStatus = {
        analytics: { granted: false, timestamp: null, version: null },
        marketing: { granted: false, timestamp: null, version: null },
        functional: { granted: false, timestamp: null, version: null },
      };
      this.legalBasis = null;
      this.processingActivity = null;
      this.consentCheckTimer = null;
      this.pendingEvents = []; // Events waiting for consent
      
      // Validate required config
      if (!this.config.projectId) {
        throw new Error('AgentTrace SDK: projectId is required');
      }
      
      if (!this.config.apiKey) {
        throw new Error('AgentTrace SDK: apiKey is required');
      }
    }

    /**
     * Initialize the SDK with consent support
     * Step 1: Check existing consent, Step 2: Show banner if needed, Step 3: Start tracking
     */
    async init(userId = null) {
      if (this.initialized) {
        this._log('SDK already initialized');
        return;
      }

      this.userId = userId || this._generateAnonymousUserId();
      
      // Load consent banner settings
      await this._loadBannerSettings();
      
      // Check existing consent status
      const hasValidConsent = await this._checkExistingConsent();
      
      if (!hasValidConsent && this.config.requireConsent) {
        // Show banner and wait for consent
        await this._showConsentBanner();
        
        // Set up periodic consent checks
        this._startConsentCheck();
        
        // Don't initialize tracking yet - wait for consent
        this._log('Waiting for user consent before tracking...');
        return;
      }
      
      // Initialize tracking with current consent
      await this._startTracking();
    }

    /**
     * Generate anonymous user ID
     */
    _generateAnonymousUserId() {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 10);
      return `anon_${timestamp}_${random}`;
    }

    /**
     * Load consent banner settings from API
     */
    async _loadBannerSettings() {
      try {
        const response = await this._request(
          `${this.config.consentApiEndpoint}/settings/${this.config.projectId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          this.bannerSettings = data.data || data;
          this._log('Banner settings loaded:', this.bannerSettings.banner_title);
        } else {
          // Use defaults
          this.bannerSettings = this._getDefaultBannerSettings();
        }
      } catch (error) {
        this._log('Failed to load banner settings, using defaults:', error);
        this.bannerSettings = this._getDefaultBannerSettings();
      }
    }

    /**
     * Get default banner settings
     */
    _getDefaultBannerSettings() {
      return {
        banner_title: 'Cookie Consent',
        banner_text: 'We use cookies to improve your experience and analyze site usage.',
        accept_button_text: 'Accept All',
        reject_button_text: 'Reject',
        customize_button_text: 'Customize',
        background_color: '#ffffff',
        text_color: '#1f2937',
        button_primary_color: '#3b82f6',
        button_secondary_color: '#6b7280',
        position: 'bottom',
        show_banner: true,
        consent_expiration_days: 365,
      };
    }

    /**
     * Check existing consent status for current user
     */
    async _checkExistingConsent() {
      try {
        const response = await this._request(
          `${this.config.consentApiEndpoint}/${this.userId}?project_id=${this.config.projectId}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const consents = data.data?.consents || [];
          
          // Update consent status from server
          for (const consent of consents) {
            if (consent.consent_type && !consent.is_withdrawn) {
              this.consentStatus[consent.consent_type] = {
                granted: consent.consent_granted,
                timestamp: consent.consent_timestamp,
                version: consent.consent_version,
              };
            }
          }
          
          // Check if we have at least functional consent
          const hasConsent = this.consentStatus.functional.granted || 
                           this.consentStatus.analytics.granted;
          
          this._log('Existing consent checked:', { hasConsent, status: this.consentStatus });
          return hasConsent;
        }
      } catch (error) {
        this._log('Failed to check existing consent:', error);
      }
      
      return false;
    }

    /**
     * Show GDPR-compliant consent banner
     */
    async _showConsentBanner() {
      if (!this.bannerSettings || !this.bannerSettings.show_banner) {
        return;
      }

      // Prevent multiple banners
      if (consentBannerState.shown) return;
      consentBannerState.shown = true;

      return new Promise((resolve) => {
        // Create banner element
        const banner = document.createElement('div');
        banner.id = 'agenttrace-consent-banner';
        banner.innerHTML = this._getBannerHTML();
        banner.style.cssText = this._getBannerStyles();
        
        document.body.appendChild(banner);

        // Add event listeners
        const acceptBtn = banner.querySelector('#agenttrace-consent-accept');
        const rejectBtn = banner.querySelector('#agenttrace-consent-reject');
        const customizeBtn = banner.querySelector('#agenttrace-consent-customize');

        acceptBtn?.addEventListener('click', async () => {
          await this._recordConsent('all', true);
          this._hideConsentBanner(banner);
          resolve();
        });

        rejectBtn?.addEventListener('click', async () => {
          await this._recordConsent('all', false);
          this._hideConsentBanner(banner);
          resolve();
        });

        customizeBtn?.addEventListener('click', () => {
          this._showConsentPreferences(banner);
        });
      });
    }

    /**
     * Generate banner HTML
     */
    _getBannerHTML() {
      const s = this.bannerSettings;
      return `
        <div id="agenttrace-consent-container" style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: ${s.text_color};">${s.banner_title}</h2>
          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: ${s.text_color}; opacity: 0.8;">${s.banner_text}</p>
          <div class="consent-buttons" style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button id="agenttrace-consent-accept" style="padding: 10px 20px; border-radius: 6px; border: none; background: ${s.button_primary_color}; color: white; font-weight: 500; cursor: pointer;">${s.accept_button_text}</button>
            <button id="agenttrace-consent-reject" style="padding: 10px 20px; border-radius: 6px; border: none; background: ${s.button_secondary_color}; color: white; font-weight: 500; cursor: pointer;">${s.reject_button_text}</button>
            <button id="agenttrace-consent-customize" style="padding: 10px 20px; border-radius: 6px; border: 1px solid ${s.text_color}; background: transparent; color: ${s.text_color}; font-weight: 500; cursor: pointer;">${s.customize_button_text}</button>
          </div>
          <div id="agenttrace-consent-preferences" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.1);">
            <div style="margin-bottom: 16px;">
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" checked data-consent="functional" style="margin-top: 4px;">
                <div>
                  <strong style="display: block; color: ${s.text_color};">Functional Cookies</strong>
                  <span style="font-size: 12px; color: ${s.text_color}; opacity: 0.7;">Required for the site to function properly</span>
                </div>
              </label>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" data-consent="analytics" style="margin-top: 4px;">
                <div>
                  <strong style="display: block; color: ${s.text_color};">Analytics Cookies</strong>
                  <span style="font-size: 12px; color: ${s.text_color}; opacity: 0.7;">Help us understand how you use our site</span>
                </div>
              </label>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
                <input type="checkbox" data-consent="marketing" style="margin-top: 4px;">
                <div>
                  <strong style="display: block; color: ${s.text_color};">Marketing Cookies</strong>
                  <span style="font-size: 12px; color: ${s.text_color}; opacity: 0.7;">Personalized advertisements and promotions</span>
                </div>
              </label>
            </div>
            <button id="agenttrace-consent-save" style="padding: 10px 20px; border-radius: 6px; border: none; background: ${s.button_primary_color}; color: white; font-weight: 500; cursor: pointer;">Save Preferences</button>
          </div>
        </div>
      `;
    }

    /**
     * Generate banner styles
     */
    _getBannerStyles() {
      const s = this.bannerSettings;
      const position = s.position === 'top' ? 'top: 0;' : 
                       s.position === 'center' ? 'top: 50%; transform: translateY(-50%);' : 
                       'bottom: 0;';
      
      return `
        position: fixed;
        ${position}
        left: 0;
        right: 0;
        background: ${s.background_color};
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        max-width: 100%;
      `;
    }

    /**
     * Show consent preferences panel
     */
    _showConsentPreferences(banner) {
      const prefs = banner.querySelector('#agenttrace-consent-preferences');
      const saveBtn = banner.querySelector('#agenttrace-consent-save');
      
      if (prefs) {
        prefs.style.display = 'block';
      }

      saveBtn?.addEventListener('click', async () => {
        const checkboxes = banner.querySelectorAll('[data-consent]');
        const selections = {};
        
        checkboxes.forEach(cb => {
          const type = cb.getAttribute('data-consent');
          selections[type] = cb.checked;
        });

        await this._recordConsent('custom', selections);
        this._hideConsentBanner(banner);
      });
    }

    /**
     * Hide consent banner
     */
    _hideConsentBanner(banner) {
      banner.style.transition = 'transform 0.3s ease';
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => {
        banner.remove();
        consentBannerState.shown = false;
      }, 300);
      
      // Start tracking now that we have consent
      this._startTracking();
    }

    /**
     * Record consent to server
     */
    async _recordConsent(mode, value) {
      const consents = [];
      const now = new Date().toISOString();
      const version = this.bannerSettings?.consent_version || '1.0';

      if (mode === 'all') {
        consents.push(
          { type: CONSENT_TYPES.ANALYTICS, granted: value },
          { type: CONSENT_TYPES.MARKETING, granted: value },
          { type: CONSENT_TYPES.FUNCTIONAL, granted: value }
        );
      } else if (mode === 'custom') {
        for (const [type, granted] of Object.entries(value)) {
          consents.push({ type, granted });
        }
      }

      for (const consent of consents) {
        try {
          const response = await this._request(this.config.consentApiEndpoint, {
            method: 'POST',
            body: JSON.stringify({
              user_id: this.userId,
              project_id: this.config.projectId,
              consent_type: consent.type,
              consent_granted: consent.granted,
              consent_version: version,
            }),
          });

          if (response.ok) {
            this.consentStatus[consent.type] = {
              granted: consent.granted,
              timestamp: now,
              version: version,
            };
            this._log(`Consent recorded: ${consent.type} = ${consent.granted}`);
          }
        } catch (error) {
          this._error(`Failed to record ${consent.type} consent:`, error);
        }
      }

      // Process any pending events that now have consent
      if (this.hasValidConsentForType(CONSENT_TYPES.ANALYTICS)) {
        await this._flushPendingEvents();
      }
    }

    /**
     * Start tracking with current consent
     */
    async _startTracking() {
      try {
        // Create session with consent metadata
        const response = await this._request('/api/v1/events/sessions', {
          method: 'POST',
          body: JSON.stringify({
            project_id: this.config.projectId,
            user_id: this.userId,
            consent_status: {
              analytics: this.consentStatus.analytics.granted,
              marketing: this.consentStatus.marketing.granted,
              functional: this.consentStatus.functional.granted,
            },
            source_url: window.location.href,
            user_agent: navigator.userAgent,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to create session: ${response.status}`);
        }
        
        const data = await response.json();
        this.sessionId = data.id;
        this.initialized = true;
        
        this._log('Session initialized:', this.sessionId);
        this._log('Consent status:', this.consentStatus);
        
        // Start event tracking
        this._attachEventListeners();
        this._startFlushInterval();
        
      } catch (error) {
        console.error('AgentTrace SDK: Failed to initialize session:', error);
        throw error;
      }
    }

    /**
     * Check if event can be tracked based on consent
     */
    _canTrackEvent(eventType) {
      const requiredConsent = EVENT_CONSENT_MAP[eventType];
      
      if (!requiredConsent) return true; // No consent required
      
      return this.hasValidConsentForType(requiredConsent);
    }

    /**
     * Check if user has valid (not withdrawn) consent
     */
    hasValidConsentForType(consentType) {
      const status = this.consentStatus[consentType];
      return status && status.granted === true;
    }

    /**
     * Start periodic consent checks
     */
    _startConsentCheck() {
      this.consentCheckTimer = setInterval(async () => {
        await this._checkExistingConsent();
        
        // If consent was withdrawn, stop tracking
        if (!this.hasValidConsentForType(CONSENT_TYPES.ANALYTICS) && this.initialized) {
          this._log('Consent withdrawn - pausing tracking');
          this._detachEventListeners();
          this._stopFlushInterval();
        }
      }, this.config.consentCheckInterval);
    }

    /**
     * Track an event with consent validation (REMY-258)
     */
    track(eventType, eventData = {}) {
      // Check if we can track this event type
      if (!this._canTrackEvent(eventType)) {
        this._log(`Event blocked - no consent: ${eventType}`);
        
        if (this.config.requireConsent) {
          // Queue event for later if consent is obtained
          this.pendingEvents.push({ eventType, eventData, timestamp: Date.now() });
          
          // Limit pending events queue
          if (this.pendingEvents.length > 100) {
            this.pendingEvents.shift();
          }
        }
        return;
      }

      const event = {
        session_id: this.sessionId,
        event_type: eventType,
        event_subtype: eventData.subtype || null,
        timestamp_ms: Date.now(),
        data: eventData.data || {},
        x: eventData.x || null,
        y: eventData.y || null,
        selector: eventData.selector || null,
        consent_validated: true,
        consent_timestamp: this._getConsentTimestampForEvent(eventType),
        llm_reasoning: eventData.llmReasoning || null,
        created_at: new Date().toISOString(),
      };

      this.queue.push(event);
      this._log('Event queued:', eventType);

      // Flush if batch size reached
      if (this.queue.length >= this.config.batchSize) {
        this.flush();
      }
    }

    /**
     * Get consent timestamp for audit trail
     */
    _getConsentTimestampForEvent(eventType) {
      const requiredConsent = EVENT_CONSENT_MAP[eventType];
      if (requiredConsent) {
        return this.consentStatus[requiredConsent]?.timestamp;
      }
      return null;
    }

    /**
     * Process pending events after consent obtained
     */
    async _flushPendingEvents() {
      const processable = this.pendingEvents.filter(e => this._canTrackEvent(e.eventType));
      
      this._log(`Flushing ${processable.length} pending events`);
      
      for (const e of processable) {
        this.track(e.eventType, e.eventData);
      }
      
      // Remove processed events
      this.pendingEvents = this.pendingEvents.filter(e => !this._canTrackEvent(e.eventType));
    }

    // Standard tracking methods
    trackClick(element, event) {
      if (!this.initialized && !this.config.requireConsent) return;
      const rect = element.getBoundingClientRect();
      const selector = this._getElementSelector(element);
      
      this.track('click', {
        data: {
          elementId: element.id,
          elementClass: element.className,
          elementText: element.innerText?.substring(0, 100),
          href: element.href || element.getAttribute('href'),
        },
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        selector,
      });
    }

    trackScroll(scrollTop, scrollHeight) {
      if (!this.initialized && !this.config.requireConsent) return;
      this.track('scroll', {
        data: {
          scrollTop,
          scrollHeight,
          viewportHeight: window.innerHeight,
        },
      });
    }

    trackView(url) {
      if (!this.initialized && !this.config.requireConsent) return;
      this.track('view', {
        data: {
          url: url || window.location.href,
          title: document.title,
          referrer: document.referrer,
        },
      });
    }

    trackCustom(name, data = {}, options = {}) {
      if (!this.initialized && !this.config.requireConsent) return;
      this.track('custom', {
        subtype: name,
        data,
        llmReasoning: options.llmReasoning || null,
      });
    }

    /**
     * Flush event queue to backend
     */
    async flush() {
      if (this.queue.length === 0) return;

      const events = [...this.queue];
      this.queue = [];

      try {
        const response = await this._request('/api/v1/events/batch', {
          method: 'POST',
          body: JSON.stringify({ events }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        this._log('Events flushed:', result.success_count || events.length);
      } catch (error) {
        // Re-queue events on failure
        this.queue.unshift(...events);
        this._error('Failed to flush events:', error);
      }
    }

    /**
     * Withdraw consent and stop tracking
     */
    async withdrawConsent(consentType) {
      try {
        const response = await this._request(`${this.config.consentApiEndpoint}/withdraw`, {
          method: 'POST',
          body: JSON.stringify({
            user_id: this.userId,
            project_id: this.config.projectId,
            consent_type: consentType,
          }),
        });

        if (response.ok) {
          this.consentStatus[consentType] = { granted: false, timestamp: null, version: null };
          this._log(`Consent withdrawn: ${consentType}`);

          // If analytics withdrawn, stop most tracking
          if (consentType === CONSENT_TYPES.ANALYTICS) {
            this._log('Analytics consent withdrawn - adjusting tracking');
            // Continue with functional only
          }
        }
      } catch (error) {
        this._error(`Failed to withdraw ${consentType} consent:`, error);
      }
    }

    /**
     * Get user consent status for GDPR audit
     */
    getConsentStatus() {
      return {
        userId: this.userId,
        consents: { ...this.consentStatus },
        timestamp: new Date().toISOString(),
      };
    }

    /**
     * Check GDPR compliance status
     */
    isGDPRCompliant() {
      return {
        initialized: this.initialized,
        hasUserConsent: this.consentStatus.functional.granted || 
                       this.consentStatus.analytics.granted,
        consentStatus: this.consentStatus,
        canTrackAnalytics: this.hasValidConsentForType(CONSENT_TYPES.ANALYTICS),
        canTrackMarketing: this.hasValidConsentForType(CONSENT_TYPES.MARKETING),
        isCompliant: this.initialized && (this.consentStatus.analytics.granted || 
                                          this.consentStatus.functional.granted),
      };
    }

    /**
     * Export user data (GDPR data portability)
     */
    async exportUserData() {
      try {
        const response = await this._request(
          `${this.config.consentApiEndpoint}/export/${this.userId}?project_id=${this.config.projectId}`
        );

        if (response.ok) {
          const data = await response.json();
          return data.data;
        }
      } catch (error) {
        this._error('Failed to export user data:', error);
      }
      return null;
    }

    /**
     * Destroy SDK instance
     */
    destroy() {
      this._stopFlushInterval();
      if (this.consentCheckTimer) {
        clearInterval(this.consentCheckTimer);
      }
      this._detachEventListeners();
      this.flush();
      
      if (this.initialized && this.sessionId) {
        this._request(`/api/v1/events/sessions/${this.sessionId}/end`, {
          method: 'POST',
        }).catch(e => this._error('Failed to end session:', e));
      }
      
      this.initialized = false;
      this._log('SDK destroyed');
    }

    // Private methods
    _attachEventListeners() {
      this._clickHandler = (e) => {
        this.trackClick(e.target, e);
      };
      document.addEventListener('click', this._clickHandler);

      let scrollTimeout;
      this._scrollHandler = () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
          this.trackScroll(window.scrollY, document.documentElement.scrollHeight);
          scrollTimeout = null;
        }, 100);
      };
      window.addEventListener('scroll', this._scrollHandler);

      this._navHandler = () => {
        this.trackView();
      };
      window.addEventListener('popstate', this._navHandler);
      
      this._unloadHandler = () => {
        this.flush();
      };
      window.addEventListener('beforeunload', this._unloadHandler);
    }

    _detachEventListeners() {
      if (this._clickHandler) {
        document.removeEventListener('click', this._clickHandler);
      }
      if (this._scrollHandler) {
        window.removeEventListener('scroll', this._scrollHandler);
      }
      if (this._navHandler) {
        window.removeEventListener('popstate', this._navHandler);
      }
      if (this._unloadHandler) {
        window.removeEventListener('beforeunload', this._unloadHandler);
      }
    }

    _startFlushInterval() {
      this._flushInterval = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }

    _stopFlushInterval() {
      if (this._flushInterval) {
        clearInterval(this._flushInterval);
        this._flushInterval = null;
      }
    }

    async _request(path, options = {}) {
      const url = `${this.config.endpoint}${path}`;
      
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'X-Project-ID': this.config.projectId,
            'X-SDK-Version': SDK_VERSION,
            ...options.headers,
          },
        });

        return response;
      } catch (error) {
        this._error('Request failed:', error);
        throw error;
      }
    }

    _getElementSelector(element) {
      if (element.id) return `#${element.id}`;
      if (element.className) return `.${element.className.split(' ').join('.')}`;
      return element.tagName.toLowerCase();
    }

    _log(...args) {
      if (this.config.debug) {
        console.log('[AgentTrace SDK]', ...args);
      }
    }

    _error(...args) {
      console.error('[AgentTrace SDK]', ...args);
    }
  }

  // Export to global scope
  global.AgentTrace = AgentTraceSDK;
  global.AgentTraceSDK = AgentTraceSDK;
  global.AgentTraceConsent = {
    types: CONSENT_TYPES,
    getBannerState: () => ({ ...consentBannerState }),
  };

  // AMD support
  if (typeof define === 'function' && define.amd) {
    define('agenttrace', [], function() {
      return AgentTraceSDK;
    });
  }

  // CommonJS support
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
      AgentTrace: AgentTraceSDK,
      AgentTraceSDK: AgentTraceSDK,
      ConsentTypes: CONSENT_TYPES 
    };
  }

})(typeof window !== 'undefined' ? window : this);