/**
 * Data Subject Rights API Routes
 * 
 * GET /api/dpa/data-subject-rights - List DSRs
 * POST /api/dpa/data-subject-rights - Create new DSR
 * GET /api/dpa/data-subject-rights/{id} - Get specific DSR
 * PATCH /api/dpa/data-subject-rights/{id} - Update DSR
 * GET /api/dpa/data-subject-rights/metrics - Get SLA metrics
 * 
 * Ticket: REMY-257
 */

import { NextResponse } from 'next/server';
import {
  createDataSubjectRequest,
  validateDSRRequest,
  calculateSlaMetrics,
  exportRequestsToCSV,
  generateAcknowledgmentEmail,
  isOverdue,
  getDaysUntilDeadline,
  DataSubjectRequest,
  DsrRequestType,
} from '../../../../lib/dpa/data-subject-rights';

// In-memory storage (replace with Supabase in production)
const dsrStore: Map<string, DataSubjectRequest> = new Map();
const metricsStore: { customerId: string; generatedAt: string; data: unknown }[] = [];

// Helper to get customer from request
function getCustomerFromRequest(req: Request): { userId: string } | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const userId = authHeader.substring(7);
    return { userId };
  }
  return { userId: 'mock-user-id' };
}

// GET handler
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Handle metrics endpoint
  if (path.endsWith('/metrics')) {
    return handleGetMetrics(req);
  }
  
  // Handle export endpoint
  if (url.searchParams.get('format') === 'csv') {
    return handleExportCSV(req);
  }
  
  return handleListDSRs(req);
}

// POST handler
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Check if this is a specific DSR action
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  
  if (id && action) {
    return handleDSRAction(req, id, action);
  }
  
  return handleCreateDSR(req);
}

// PATCH handler
export async function PATCH(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'DSR ID required' },
      { status: 400 }
    );
  }
  
  return handleUpdateDSR(req, id);
}

// List DSRs
async function handleListDSRs(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type') as DsrRequestType | null;
  const overdue = url.searchParams.get('overdue');

  // Filter DSRs
  let dsrs = Array.from(dsrStore.values()).filter(
    dsr => dsr.customer_id === customer.userId
  );

  if (status) {
    dsrs = dsrs.filter(dsr => dsr.status === status);
  }

  if (type) {
    dsrs = dsrs.filter(dsr => dsr.request_type === type);
  }

  if (overdue === 'true') {
    dsrs = dsrs.filter(isOverdue);
  }

  // Sort by received date (newest first)
  dsrs.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

  return NextResponse.json({
    success: true,
    data: dsrs,
    meta: {
      total: dsrs.length,
      overdue: dsrs.filter(isOverdue).length,
      byStatus: dsrs.reduce((acc, dsr) => {
        acc[dsr.status] = (acc[dsr.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
}

// Create new DSR
async function handleCreateDSR(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    
    // Validate request data
    const validation = validateDSRRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     '127.0.0.1';
    
    // Create DSR
    const dsr = createDataSubjectRequest(
      customer.userId,
      body.request_type as DsrRequestType,
      body.data_subject_email,
      body.request_description,
      {
        priority: body.priority,
        complexity: body.complexity,
        channel: body.request_channel || 'web_form',
        dataSubjectName: body.data_subject_name,
        dataSubjectId: body.data_subject_id,
        dataCategories: body.data_categories,
        dateRangeStart: body.date_range_start,
        dateRangeEnd: body.date_range_end,
        createdBy: customer.userId,
      }
    );

    // Store DSR
    dsrStore.set(dsr.id, dsr);

    // Generate acknowledgment email
    const acknowledgment = generateAcknowledgmentEmail(dsr);

    return NextResponse.json({
      success: true,
      data: {
        dsr,
        acknowledgment,
        daysUntilDeadline: getDaysUntilDeadline(dsr),
      },
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Update DSR
async function handleUpdateDSR(req: Request, id: string): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const dsr = dsrStore.get(id);
  if (!dsr) {
    return NextResponse.json(
      { success: false, error: 'DSR not found' },
      { status: 404 }
    );
  }

  if (dsr.customer_id !== customer.userId) {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    
    // Update allowed fields
    const updatedDsr: DataSubjectRequest = {
      ...dsr,
      status: body.status || dsr.status,
      acknowledged_at: body.acknowledged_at || dsr.acknowledged_at,
      started_at: body.started_at || dsr.started_at,
      completed_at: body.completed_at || dsr.completed_at,
      response_summary: body.response_summary || dsr.response_summary,
      assigned_to: body.assigned_to || dsr.assigned_to,
      hours_spent: body.hours_spent || dsr.hours_spent,
      notes: body.notes || dsr.notes,
      updated_at: new Date().toISOString(),
    };

    dsrStore.set(id, updatedDsr);

    return NextResponse.json({
      success: true,
      data: updatedDsr,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Handle DSR actions (acknowledge, complete, extend SLA, etc.)
async function handleDSRAction(req: Request, id: string, action: string): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const dsr = dsrStore.get(id);
  if (!dsr) {
    return NextResponse.json(
      { success: false, error: 'DSR not found' },
      { status: 404 }
    );
  }

  const { requestSLAExtension } = await import('../../../../lib/dpa/data-subject-rights');

  switch (action) {
    case 'acknowledge':
      dsr.status = 'acknowledged';
      dsr.acknowledged_at = new Date().toISOString();
      dsrStore.set(id, dsr);
      return NextResponse.json({ success: true, data: dsr });

    case 'extend':
      try {
        const body = await req.json();
        const result = requestSLAExtension(dsr, body.reason, body.additionalDays);
        if (result.success) {
          dsrStore.set(id, result.request);
        }
        return NextResponse.json(result);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid extension request' },
          { status: 400 }
        );
      }

    case 'complete':
      dsr.status = 'completed';
      dsr.completed_at = new Date().toISOString();
      dsrStore.set(id, dsr);
      return NextResponse.json({ success: true, data: dsr });

    default:
      return NextResponse.json(
        { success: false, error: 'Unknown action' },
        { status: 400 }
      );
  }
}

// Get SLA metrics
async function handleGetMetrics(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const periodStart = url.searchParams.get('start') || 
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const periodEnd = url.searchParams.get('end') || new Date().toISOString();

  const customerDSRs = Array.from(dsrStore.values()).filter(
    dsr => dsr.customer_id === customer.userId
  );

  const metrics = calculateSlaMetrics(customerDSRs, periodStart, periodEnd);

  // Store metrics for history
  metricsStore.push({
    customerId: customer.userId,
    generatedAt: new Date().toISOString(),
    data: metrics,
  });

  return NextResponse.json({
    success: true,
    data: metrics,
  });
}

// Export to CSV
async function handleExportCSV(req: Request): Promise<Response> {
  const customer = getCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const customerDSRs = Array.from(dsrStore.values()).filter(
    dsr => dsr.customer_id === customer.userId
  );

  const csv = exportRequestsToCSV(customerDSRs);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="dsr-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

// Export the store for testing
export { dsrStore };
