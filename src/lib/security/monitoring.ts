/**
 * Security Monitoring - Automated Breach Detection
 * Ticket: REMY-260
 * 
 * Detects potential security incidents through pattern analysis:
 * - Bulk data exports
 * - Unusual access patterns
 * - Privileged account anomalies
 * - After-hours activity
 */

import { createClient } from '@supabase/supabase-js';

// Monitoring configuration
export const MONITORING_CONFIG = {
  // Bulk export thresholds
  BULK_EXPORT: {
    WARNING: 1000,      // Alert threshold
    HIGH: 10000,        // Block without approval
    CRITICAL: 100000,   // Immediate alert + block
  },
  
  // Rate limiting for exports
  RATE_LIMITS: {
    HOURLY_MAX: 50000,
    DAILY_MAX: 500000,
  },
  
  // Access anomaly detection
  ACCESS_ANOMALY: {
    FAILED_LOGIN_THRESHOLD: 10,
    FAILED_LOGIN_WINDOW_MINUTES: 5,
    GEO_ANOMALY_DISTANCE_KM: 500, // Distance for geographic anomaly
    AFTER_HOURS_START: 22, // 10 PM
    AFTER_HOURS_END: 6,    // 6 AM
  },
  
  // Suspicious patterns
  SUSPICIOUS_PATTERNS: {
    PRIVILEGED_ACCOUNT_THRESHOLD: 0.8, // Risk score threshold
    DATA_ACCESS_VELOCITY: 1000, // Records per minute
    SESSION_DURATION_ANOMALY: 4, // Hours (sessions longer than this flagged)
  },
  
  // Automated actions
  AUTO_ACTIONS: {
    BLOCK_BULK_EXPORTS_ABOVE: 10000,
    REQUIRE_APPROVAL_ABOVE: 1000,
    ALERT_ON_FAILED_LOGINS: true,
    ALERT_ON_GEO_ANOMALY: true,
  },
} as const;

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical';

// Alert types
export type AlertType = 
  | 'bulk_export_detected'
  | 'rate_limit_exceeded'
  | 'failed_login_spike'
  | 'geo_anomaly'
  | 'after_hours_access'
  | 'privileged_account_anomaly'
  | 'unusual_data_access'
  | 'session_duration_anomaly'
  | 'permission_escalation';

// Security alert interface
export interface SecurityAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  userId: string;
  userEmail?: string;
  projectId?: string;
  description: string;
  details: Record<string, unknown>;
  detectedAt: string;
  status: 'open' | 'investigating' | 'false_positive' | 'confirmed_breach';
  assignedTo?: string;
  incidentId?: string; // Linked security_incident
  createdAt: string;
}

// Bulk export detection
export interface BulkExportEvent {
  operationId: string;
  userId: string;
  projectId: string;
  recordsExported: number;
  dataCategories: string[];
  exportType: 'api' | 'web' | 'bulk' | 'report';
  timestamp: string;
  destination?: string; // e.g., 'download', 's3', 'third_party'
}

// Access event for anomaly detection
export interface AccessEvent {
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  geoLocation?: {
    country: string;
    city: string;
    lat: number;
    lng: number;
  };
  isPrivileged: boolean;
  recordsAccessed?: number;
}

// Detection result
export interface DetectionResult {
  triggered: boolean;
  alertType?: AlertType;
  severity?: AlertSeverity;
  description?: string;
  details?: Record<string, unknown>;
  requiresIncident?: boolean;
}

// User access profile for baseline
export interface UserAccessProfile {
  userId: string;
  commonResources: string[];
  commonActions: string[];
  regularHours: { start: number; end: number }[];
  regularAfterHours: boolean;
  avgRecordsPerSession: number;
  commonLocations: string[];
}

/**
 * Initialize Supabase client for monitoring
 */
function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_KEY || 'mock-service-key',
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

/**
 * Check bulk export against thresholds
 */
export function detectBulkExport(event: BulkExportEvent): DetectionResult {
  const { recordsExported, dataCategories } = event;
  
  // Critical threshold
  if (recordsExported >= MONITORING_CONFIG.BULK_EXPORT.CRITICAL) {
    return {
      triggered: true,
      alertType: 'bulk_export_detected',
      severity: 'critical',
      description: `Critical bulk export detected: ${recordsExported.toLocaleString()} records`,
      details: {
        ...event,
        threshold: 'CRITICAL',
        thresholdValue: MONITORING_CONFIG.BULK_EXPORT.CRITICAL,
        includesSensitiveData: dataCategories.includes('financial') || 
                               dataCategories.includes('health') ||
                               dataCategories.includes('government_id'),
      },
      requiresIncident: true,
    };
  }
  
  // High threshold
  if (recordsExported >= MONITORING_CONFIG.BULK_EXPORT.HIGH) {
    return {
      triggered: true,
      alertType: 'bulk_export_detected',
      severity: 'high',
      description: `High volume export: ${recordsExported.toLocaleString()} records`,
      details: {
        ...event,
        threshold: 'HIGH',
        thresholdValue: MONITORING_CONFIG.BULK_EXPORT.HIGH,
      },
      requiresIncident: true,
    };
  }
  
  // Warning threshold
  if (recordsExported >= MONITORING_CONFIG.BULK_EXPORT.WARNING) {
    return {
      triggered: true,
      alertType: 'bulk_export_detected',
      severity: 'warning',
      description: `Bulk export detected: ${recordsExported.toLocaleString()} records`,
      details: {
        ...event,
        threshold: 'WARNING',
        thresholdValue: MONITORING_CONFIG.BULK_EXPORT.WARNING,
      },
      requiresIncident: false,
    };
  }
  
  return { triggered: false };
}

/**
 * Detect rate limit violations
 */
export function detectRateLimitViolation(
  userId: string,
  windowExports: BulkExportEvent[],
  windowHours: number = 1
): DetectionResult {
  const totalRecords = windowExports.reduce((sum, e) => sum + e.recordsExported, 0);
  const maxAllowed = windowHours === 1 
    ? MONITORING_CONFIG.RATE_LIMITS.HOURLY_MAX 
    : MONITORING_CONFIG.RATE_LIMITS.DAILY_MAX;
  
  if (totalRecords > maxAllowed) {
    return {
      triggered: true,
      alertType: 'rate_limit_exceeded',
      severity: 'high',
      description: `Rate limit exceeded: ${totalRecords.toLocaleString()} records in ${windowHours}h`,
      details: {
        userId,
        totalRecords,
        windowHours,
        limit: maxAllowed,
        exportCount: windowExports.length,
      },
      requiresIncident: true,
    };
  }
  
  return { triggered: false };
}

/**
 * Detect failed login spikes
 */
export function detectFailedLoginSpike(
  userId: string,
  failedAttempts: number,
  timeWindowMinutes: number
): DetectionResult {
  const threshold = MONITORING_CONFIG.ACCESS_ANOMALY.FAILED_LOGIN_THRESHOLD;
  const window = MONITORING_CONFIG.ACCESS_ANOMALY.FAILED_LOGIN_WINDOW_MINUTES;
  
  if (failedAttempts >= threshold && timeWindowMinutes <= window) {
    return {
      triggered: true,
      alertType: 'failed_login_spike',
      severity: failedAttempts >= 50 ? 'critical' : failedAttempts >= 20 ? 'high' : 'warning',
      description: `${failedAttempts} failed login attempts within ${timeWindowMinutes} minutes`,
      details: {
        userId,
        failedAttempts,
        timeWindowMinutes,
        threshold,
        recommendation: 'Consider temporary account lockout',
      },
      requiresIncident: failedAttempts >= 20,
    };
  }
  
  return { triggered: false };
}

/**
 * Detect geographic anomalies
 */
export function detectGeoAnomaly(
  userId: string,
  currentAccess: AccessEvent,
  lastAccess: AccessEvent | null
): DetectionResult {
  if (!lastAccess?.geoLocation || !currentAccess.geoLocation) {
    return { triggered: false };
  }
  
  const distance = calculateDistance(
    lastAccess.geoLocation.lat,
    lastAccess.geoLocation.lng,
    currentAccess.geoLocation.lat,
    currentAccess.geoLocation.lng
  );
  
  const threshold = MONITORING_CONFIG.ACCESS_ANOMALY.GEO_ANOMALY_DISTANCE_KM;
  const timeDiffHours = (new Date(currentAccess.timestamp).getTime() - 
                         new Date(lastAccess.timestamp).getTime()) / (1000 * 60 * 60);
  
  // Impossible travel detection
  if (distance > threshold && timeDiffHours < 2) {
    return {
      triggered: true,
      alertType: 'geo_anomaly',
      severity: 'high',
      description: `Impossible travel detected: ${Math.round(distance)}km in ${Math.round(timeDiffHours * 60)} minutes`,
      details: {
        userId,
        distanceKm: Math.round(distance),
        timeDiffMinutes: Math.round(timeDiffHours * 60),
        fromLocation: `${lastAccess.geoLocation.city}, ${lastAccess.geoLocation.country}`,
        toLocation: `${currentAccess.geoLocation.city}, ${currentAccess.geoLocation.country}`,
        lastAccessTime: lastAccess.timestamp,
        currentAccessTime: currentAccess.timestamp,
      },
      requiresIncident: true,
    };
  }
  
  // New country detection
  if (lastAccess.geoLocation.country !== currentAccess.geoLocation.country) {
    return {
      triggered: true,
      alertType: 'geo_anomaly',
      severity: 'warning',
      description: `Access from new country: ${currentAccess.geoLocation.country}`,
      details: {
        userId,
        previousCountry: lastAccess.geoLocation.country,
        newCountry: currentAccess.geoLocation.country,
        previousCity: lastAccess.geoLocation.city,
        newCity: currentAccess.geoLocation.city,
      },
      requiresIncident: false,
    };
  }
  
  return { triggered: false };
}

/**
 * Detect after-hours access
 */
export function detectAfterHoursAccess(event: AccessEvent): DetectionResult {
  const hour = new Date(event.timestamp).getHours();
  const start = MONITORING_CONFIG.ACCESS_ANOMALY.AFTER_HOURS_START;
  const end = MONITORING_CONFIG.ACCESS_ANOMALY.AFTER_HOURS_END;
  
  const isAfterHours = hour >= start || hour < end;
  
  if (isAfterHours && event.isPrivileged) {
    return {
      triggered: true,
      alertType: 'after_hours_access',
      severity: 'warning',
      description: `Privileged account activity at ${hour}:00 during after-hours`,
      details: {
        userId: event.userId,
        timestamp: event.timestamp,
        hour,
        action: event.action,
        resource: event.resource,
        isPrivileged: event.isPrivileged,
      },
      requiresIncident: false,
    };
  }
  
  return { triggered: false };
}

/**
 * Detect unusual data access velocity
 */
export function detectDataAccessVelocity(
  userId: string,
  events: AccessEvent[],
  windowMinutes: number = 5
): DetectionResult {
  const totalRecords = events.reduce((sum, e) => sum + (e.recordsAccessed || 0), 0);
  const rate = totalRecords / (windowMinutes / 60); // records per hour
  
  const threshold = MONITORING_CONFIG.SUSPICIOUS_PATTERNS.DATA_ACCESS_VELOCITY * 60; // per hour
  
  if (rate > threshold) {
    return {
      triggered: true,
      alertType: 'unusual_data_access',
      severity: 'high',
      description: `Unusual data access rate: ${Math.round(rate).toLocaleString()} records/hour`,
      details: {
        userId,
        recordsPerHour: Math.round(rate),
        recordsAccessed: totalRecords,
        windowMinutes,
        threshold: threshold,
        actions: events.map(e => e.action),
      },
      requiresIncident: rate > threshold * 2, // Critical if 2x threshold
    };
  }
  
  return { triggered: false };
}

/**
 * Detect privileged account anomalies
 */
export function detectPrivilegedAccountAnomaly(
  userId: string,
  recentEvents: AccessEvent[],
  baselineProfile: UserAccessProfile
): DetectionResult {
  // Calculate anomaly score
  let anomalyScore = 0;
  
  // Check for unusual resources
  const unusualResources = recentEvents.filter(e => 
    !baselineProfile.commonResources.includes(e.resource)
  );
  if (unusualResources.length > recentEvents.length * 0.5) {
    anomalyScore += 0.3;
  }
  
  // Check for unusual actions
  const unusualActions = recentEvents.filter(e =>
    !baselineProfile.commonActions.includes(e.action)
  );
  if (unusualActions.length > recentEvents.length * 0.5) {
    anomalyScore += 0.3;
  }
  
  // Check time pattern
  const afterHoursCount = recentEvents.filter(e => {
    const hour = new Date(e.timestamp).getHours();
    return hour >= MONITORING_CONFIG.ACCESS_ANOMALY.AFTER_HOURS_START || 
           hour < MONITORING_CONFIG.ACCESS_ANOMALY.AFTER_HOURS_END;
  }).length;
  if (afterHoursCount > recentEvents.length * 0.5 && !baselineProfile.regularAfterHours) {
    anomalyScore += 0.2;
  }
  
  // Check access volume
  const totalRecords = recentEvents.reduce((sum, e) => sum + (e.recordsAccessed || 0), 0);
  if (totalRecords > baselineProfile.avgRecordsPerSession * 5) {
    anomalyScore += 0.2;
  }
  
  if (anomalyScore >= MONITORING_CONFIG.SUSPICIOUS_PATTERNS.PRIVILEGED_ACCOUNT_THRESHOLD) {
    return {
      triggered: true,
      alertType: 'privileged_account_anomaly',
      severity: anomalyScore > 0.9 ? 'critical' : 'high',
      description: `Privileged account anomaly detected (score: ${Math.round(anomalyScore * 100)}%)`,
      details: {
        userId,
        anomalyScore: Math.round(anomalyScore * 100) / 100,
        unusualResources: unusualResources.length,
        unusualActions: unusualActions.length,
        afterHoursRatio: afterHoursCount / recentEvents.length,
        recordVolumeRatio: totalRecords / baselineProfile.avgRecordsPerSession,
      },
      requiresIncident: anomalyScore > 0.9,
    };
  }
  
  return { triggered: false };
}

/**
 * Helper: Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper: Determine breach type from alert type
 */
function determineBreachType(alertType: AlertType): string {
  const typeMap: Record<AlertType, string> = {
    bulk_export_detected: 'unauthorized_disclosure',
    rate_limit_exceeded: 'unauthorized_access',
    failed_login_spike: 'unauthorized_access',
    geo_anomaly: 'unauthorized_access',
    after_hours_access: 'unauthorized_access',
    privileged_account_anomaly: 'unauthorized_access',
    unusual_data_access: 'unauthorized_access',
    session_duration_anomaly: 'unauthorized_access',
    permission_escalation: 'unauthorized_access',
  };
  return typeMap[alertType] || 'other';
}
