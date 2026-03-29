/**
 * AgentTrace SDK - Session Tracking with GDPR Legal Basis Support
 * 
 * This SDK tracks user sessions and includes legal_basis for GDPR compliance.
 * 
 * @version 1.0.0
 * @author AgentTrace
 */

(function(global) {
  'use strict';

  const DEFAULT_CONFIG = {
    endpoint: 'https://api.agenttrace.com',
    batchSize: 10,
    flushInterval: 5000,
    debug: false
  };

  /**
   * AgentTrace SDK Class
   */
  class AgentTraceSDK {
    constructor(config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.queue = [];
      this.sessionId = null;
      this.legalBasis = null;
      this.initialized = false;
      
      // Validate required config
      if (!this.config.projectId) {
        throw new Error('AgentTrace SDK: projectId is required');
      }
      
      if (!this.config.apiKey) {
        throw new Error('AgentTrace SDK: apiKey is required');
      }
    }

    /**
     * Initialize the SDK and start session tracking
     */
    async init() {
      if (this.initialized) {
        this._log('SDK already initialized');
        return;
      }

      // Validate legal basis if provided
      if (this.config.legalBasis) {
        await this._validateLegalBasis();
      } else {
        console.warn('AgentTrace SDK: No legal basis configured. Events will be tracked without legal basis compliance.');
      }

      // Create session
      try {
        const response = await this._request('/api/v1/sessions', {
          method: 'POST',
          body: JSON.stringify({
            project_id: this.config.projectId,
            legal_basis_id: this.legalBasis?.id,
            source_url: window.location.href,
            user_agent: navigator.userAgent
          })
        });
        
        const data = await response.json();
        this.sessionId = data.id;
        this.legalBasis = this.config.legalBasis;
        this.initialized = true;
        
        this._log('Session initialized:', this.sessionId);
        
        // Start event tracking
        this._attachEventListeners();
        
        // Start flush interval
        this._startFlushInterval();
        
      } catch (error) {
        console.error('AgentTrace SDK: Failed to initialize session:', error);
        throw error;
      }
    }

    /**
     * Validate legal basis with backend
     */
    async _validateLegalBasis() {
      const { id, projectId } = this.config.legalBasis;
      
      if (!id) {
        console.warn('AgentTrace SDK: legalBasis.id is required for GDPR compliance');
        return;
      }

      try {
        const response = await this._request(`/api/v1/processing/legal-basis/${id}?project_id=${projectId || this.config.projectId}`);
        
        if (response.ok) {
          const data = await response.json();
          this.legalBasis = { ...this.config.legalBasis, ...data };
          this._log('Legal basis validated:', data.name);
        } else {
          console.warn('AgentTrace SDK: Invalid legal basis ID:', id);
        }
      } catch (error) {
        console.error('AgentTrace SDK: Failed to validate legal basis:', error);
      }
    }

    /**
     * Track an event
     */
    track(eventType, eventData = {}) {
      if (!this.initialized) {
        console.warn('AgentTrace SDK: Not initialized, event not tracked');
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
        legal_basis_id: this.legalBasis?.id || null,
        created_at: new Date().toISOString()
      };

      this.queue.push(event);
      this._log('Event queued:', eventType);

      // Flush if batch size reached
      if (this.queue.length >= this.config.batchSize) {
        this.flush();
      }
    }

    /**
     * Track a click event
     */
    trackClick(element, event) {
      const rect = element.getBoundingClientRect();
      const selector = this._getElementSelector(element);
      
      this.track('click', {
        data: {
          elementId: element.id,
          elementClass: element.className,
          elementText: element.innerText?.substring(0, 100),
          href: element.href
        },
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        selector
      });
    }

    /**
     * Track a scroll event
     */
    trackScroll(scrollTop, scrollHeight) {
      this.track('scroll', {
        data: {
          scrollTop,
          scrollHeight,
          viewportHeight: window.innerHeight
        }
      });
    }

    /**
     * Track a navigation/view event
     */
    trackView(url) {
      this.track('view', {
        data: {
          url: url || window.location.href,
          title: document.title,
          referrer: document.referrer
        }
      });
    }

    /**
     * Track custom event
     */
    trackCustom(name, data = {}) {
      this.track('custom', {
        subtype: name,
        data
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
        const response = await this._request('/api/v1/events', {
          method: 'POST',
          body: JSON.stringify({ events })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        this._log('Events flushed:', events.length);
      } catch (error) {
        // Re-queue events on failure
        this.queue.unshift(...events);
        console.error('AgentTrace SDK: Failed to flush events:', error);
      }
    }

    /**
     * Destroy the SDK instance
     */
    destroy() {
      this._stopFlushInterval();
      this._detachEventListeners();
      this.flush();
      this.initialized = false;
      this._log('SDK destroyed');
    }

    /**
     * Get current legal basis information
     */
    getLegalBasis() {
      return this.legalBasis;
    }

    /**
     * Update legal basis
     */
    setLegalBasis(legalBasis) {
      this.legalBasis = legalBasis;
      this._validateLegalBasis();
    }

    /**
     * Check if SDK is initialized with valid legal basis
     */
    isGDPRCompliant() {
      return this.initialized && this.legalBasis?.id;
    }

    // Private methods

    _attachEventListeners() {
      // Click events
      document.addEventListener('click', (e) => {
        this.trackClick(e.target, e);
      });

      // Scroll events (throttled)
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
          this.trackScroll(window.scrollY, document.documentElement.scrollHeight);
          scrollTimeout = null;
        }, 100);
      });

      // Navigation events
      window.addEventListener('popstate', () => {
        this.trackView();
      });
    }

    _detachEventListeners() {
      // In real implementation, store references to remove listeners
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
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Project-ID': this.config.projectId,
          ...options.headers
        }
      });

      return response;
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
  }

  // Export to global scope
  global.AgentTrace = AgentTraceSDK;

  // AMD support
  if (typeof define === 'function' && define.amd) {
    define('agenttrace', [], function() {
      return AgentTraceSDK;
    });
  }

  // CommonJS support
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AgentTrace: AgentTraceSDK };
  }

})(typeof window !== 'undefined' ? window : this);
