/**
 * Subprocessor Notifications API Routes
 * 
 * GET /api/dpa/subprocessor-notifications - List notifications
 * POST /api/dpa/subprocessor-notifications - Create notification
 * PATCH /api/dpa/subprocessor-notifications/{id} - Update notification
 * GET /api/dpa/subprocessor-notifications/pending - Get pending counts
 * 
 * Ticket: REMY-257
 */

import { NextResponse } from 'next/server';
import {
  createSubprocessorNotification,
  recordControllerResponse,
  resolveObjection,
  isNotificationOverdue,
  shouldSendReminder,
  generateNotificationEmail,
  countPendingNotifications,
  validateNotificationData,
  SubprocessorChangeNotification,
  SubprocessorNotificationType,
  NotificationStatus,
} from '../../../../lib/dpa/subprocessor-notification';

// In-memory storage
const notificationStore: Map<string, SubprocessorChangeNotification> = new Map();

// Subprocessor registry (mock)
const subprocessorRegistry = [
  {
    id: 'sub-aws',
    name: 'Amazon Web Services',
    legal_name: 'Amazon Web Services, Inc.',
    website_url: 'https://aws.amazon.com',
    services_provided: ['cloud_infrastructure', 'storage'],
    processing_activities: ['data_storage', 'hosting'],
    headquarters_location: 'Seattle, WA, USA',
    data_storage_locations: ['us-east-1', 'eu-west-1', 'eu-central-1'],
    jurisdiction: 'US',
    security_certifications: ['SOC_2_Type_II', 'ISO_27001'],
    encryption_at_rest: true,
    encryption_in_transit: true,
    gdpr_compliant: true,
    data_processing_agreement_signed: true,
    standard_contractual_clauses: true,
    contract_status: 'signed' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sub-sendgrid',
    name: 'SendGrid',
    legal_name: 'Twilio SendGrid, Inc.',
    website_url: 'https://sendgrid.com',
    services_provided: ['email_delivery'],
    processing_activities: ['transactional_email'],
    headquarters_location: 'Denver, CO, USA',
    data_storage_locations: ['us-central'],
    jurisdiction: 'US',
    security_certifications: ['SOC_2_Type_II'],
    encryption_at_rest: true,
    encryption_in_transit: true,
    gdpr_compliant: true,
    data_processing_agreement_signed: true,
    standard_contractual_clauses: true,
    contract_status: 'signed' as const,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

// Helper to get customer
function getCustomerFromRequest(req: Request): { userId: string; tier: string } {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return { userId: authHeader.substring(7), tier: 'enterprise' };
  }
  return { userId: 'mock-user-id', tier: 'enterprise' };
}

// GET handler
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  if (url.pathname.endsWith('/pending')) {
    return handleGetPendingCounts(req);
  }
  
  if (url.pathname.includes('/reminders')) {
    return handleGetReminders(req);
  }
  
  return handleListNotifications(req);
}

// POST handler
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  
  if (id && action) {
    return handleNotificationAction(req, id, action);
  }
  
  return handleCreateNotification(req);
}

// PATCH handler
export async function PATCH(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Notification ID required' },
      { status: 400 }
    );
  }
  
  return handleUpdateNotification(req, id);
}

// List notifications
async function handleListNotifications(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  
  const url = new URL(req.url);
  const status = url.searchParams.get('status') as NotificationStatus | null;
  const type = url.searchParams.get('type') as SubprocessorNotificationType | null;
  const overdue = url.searchParams.get('overdue');

  let notifications = Array.from(notificationStore.values()).filter(
    n => n.customer_id === customer.userId
  );

  if (status) {
    notifications = notifications.filter(n => n.status === status);
  }

  if (type) {
    notifications = notifications.filter(n => n.notification_type === type);
  }

  if (overdue === 'true') {
    notifications = notifications.filter(isNotificationOverdue);
  }

  notifications.sort((a, b) =>
    new Date(b.notification_sent_at).getTime() - new Date(a.notification_sent_at).getTime()
  );

  return NextResponse.json({
    success: true,
    data: notifications,
    meta: {
      total: notifications.length,
      pending: notifications.filter(n => n.status === 'pending').length,
      overdue: notifications.filter(isNotificationOverdue).length,
      byImpact: notifications.reduce((acc, n) => {
        acc[n.impact_level] = (acc[n.impact_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
}

// Create notification
async function handleCreateNotification(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  
  try {
    const body = await req.json();
    
    // Validate
    const validation = validateNotificationData(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Find subprocessor
    const subprocessor = subprocessorRegistry.find(s => s.id === body.subprocessor_id);
    if (!subprocessor) {
      return NextResponse.json(
        { success: false, error: 'Subprocessor not found' },
        { status: 404 }
      );
    }

    // Create notification
    const notification = createSubprocessorNotification(
      customer.userId,
      body.notification_type,
      subprocessor,
      body.change_summary,
      {
        impactLevel: body.impact_level,
        noticePeriodDays: body.notice_period_days,
        previousValue: body.previous_value,
        newValue: body.new_value,
        changeDetails: body.change_details,
        dataCategoriesAffected: body.data_categories_affected,
        sentBy: customer.userId,
      }
    );

    notificationStore.set(notification.id, notification);

    // Generate email content
    const emailContent = generateNotificationEmail(notification, 'Customer Organization');

    return NextResponse.json({
      success: true,
      data: {
        notification,
        email: emailContent,
      },
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Update notification
async function handleUpdateNotification(req: Request, id: string): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  
  const notification = notificationStore.get(id);
  if (!notification) {
    return NextResponse.json(
      { success: false, error: 'Notification not found' },
      { status: 404 }
    );
  }

  if (notification.customer_id !== customer.userId) {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    
    const updatedNotification: SubprocessorChangeNotification = {
      ...notification,
      status: body.status || notification.status,
      reminders_sent: body.reminders_sent ?? notification.reminders_sent,
      last_reminder_at: body.last_reminder_at || notification.last_reminder_at,
      updated_at: new Date().toISOString(),
    };

    notificationStore.set(id, updatedNotification);

    return NextResponse.json({
      success: true,
      data: updatedNotification,
    });

  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Handle notification actions
async function handleNotificationAction(
  req: Request, 
  id: string, 
  action: string
): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  
  const notification = notificationStore.get(id);
  if (!notification) {
    return NextResponse.json(
      { success: false, error: 'Notification not found' },
      { status: 404 }
    );
  }

  if (notification.customer_id !== customer.userId) {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  switch (action) {
    case 'respond': {
      try {
        const body = await req.json();
        const response = body.response as 'accept' | 'reject' | 'request_info';
        
        if (!['accept', 'reject', 'request_info'].includes(response)) {
          return NextResponse.json(
            { success: false, error: 'Invalid response type' },
            { status: 400 }
          );
        }

        const updated = recordControllerResponse(
          notification,
          response,
          { notes: body.notes }
        );

        notificationStore.set(id, updated);
        return NextResponse.json({ success: true, data: updated });

      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid request body' },
          { status: 400 }
        );
      }
    }

    case 'resolve': {
      try {
        const body = await req.json();
        const resolution = body.resolution as 'approved' | 'blocked' | 'alternative_proposed' | 'service_terminated';
        
        const updated = resolveObjection(
          notification,
          resolution,
          {
            notes: body.notes,
            alternativeSubprocessorId: body.alternative_subprocessor_id,
          }
        );

        notificationStore.set(id, updated);
        return NextResponse.json({ success: true, data: updated });

      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid request body' },
          { status: 400 }
        );
      }
    }

    default:
      return NextResponse.json(
        { success: false, error: 'Unknown action' },
        { status: 400 }
      );
  }
}

// Get pending counts
async function handleGetPendingCounts(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  
  const notifications = Array.from(notificationStore.values()).filter(
    n => n.customer_id === customer.userId
  );

  const counts = countPendingNotifications(notifications, customer.userId);

  return NextResponse.json({
    success: true,
    data: counts,
  });
}

// Get reminders needed
async function handleGetReminders(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  
  const pendingNotifications = Array.from(notificationStore.values())
    .filter(n => n.customer_id === customer.userId && n.status === 'pending')
    .filter(shouldSendReminder);

  return NextResponse.json({
    success: true,
    data: {
      notifications: pendingNotifications,
      emailDrafts: pendingNotifications.map(n => 
        generateNotificationEmail(n, 'Customer Organization')
      ),
    },
  });
}

// Export for testing
export { notificationStore };
