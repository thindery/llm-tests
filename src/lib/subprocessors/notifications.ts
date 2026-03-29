/**
 * Subprocessor Notification Utilities
 * Ticket: REMY-259
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface SubprocessorNotification {
  id: string;
  subprocessorId: string | null;
  notificationType: 'new_subprocessor' | 'data_region_change' | 'service_change' | 'termination';
  title: string;
  content: string;
  severity: 'critical' | 'warning' | 'info';
  publishedAt: string;
  effectiveDate: string | null;
  requiresAcknowledgment: boolean;
}

const notificationTemplates = {
  new_subprocessor: (name: string, service: string) => ({
    title: `New Subprocessor: ${name}`,
    content: `We have engaged ${name} as a new subprocessor to provide ${service}. This change will take effect 30 days from now.`,
  }),
  termination: (name: string) => ({
    title: `Subprocessor Termination: ${name}`,
    content: `${name} will cease providing services. Data will be migrated or deleted per our retention policy.`,
  }),
  service_change: (name: string, reason: string) => ({
    title: `Service Change: ${name}`,
    content: `${name} has updated their service: ${reason}`,
  }),
};

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
}

export async function createSubprocessorNotification(
  subprocessorId: string,
  changeType: 'added' | 'removed' | 'updated' | 'status_changed',
  changeReason: string,
  severity: 'critical' | 'warning' | 'info' = 'info'
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: subprocessor } = await supabase
      .from('subprocessors')
      .select('*')
      .eq('id', subprocessorId)
      .single();

    if (!subprocessor) return { success: false, error: 'Subprocessor not found' };

    const templates: Record<string, { title: string; content: string }> = {
      added: notificationTemplates.new_subprocessor(subprocessor.name, subprocessor.service_provided),
      removed: notificationTemplates.termination(subprocessor.name),
      updated: notificationTemplates.service_change(subprocessor.name, changeReason),
      status_changed: notificationTemplates.service_change(subprocessor.name, changeReason),
    };

    const template = templates[changeType] || templates.updated;
    const effectiveDate = changeType === 'added' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    const { data: notification, error } = await supabase
      .from('subprocessor_notifications')
      .insert({
        subprocessor_id: subprocessorId,
        notification_type: changeType === 'added' ? 'new_subprocessor' : 'service_change',
        title: template.title,
        content: template.content,
        severity,
        effective_date: effectiveDate,
        requires_acknowledgment: changeType === 'added',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, notificationId: notification.id };
  } catch (error) {
    console.error('Notification creation failed:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

export async function acknowledgeNotification(
  customerId: string,
  notificationId: string,
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const crypto = await import('crypto');
    const ipHash = crypto.createHash('sha256').update(ipAddress).digest('hex');

    const { error } = await supabase
      .from('customer_subprocessor_acknowledgments')
      .insert({
        customer_id: customerId,
        notification_id: notificationId,
        ip_address_hash: ipHash,
        acknowledged_via: 'web_ui',
      });

    if (error?.code === '23505') return { success: false, error: 'Already acknowledged' };
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to acknowledge' };
  }
}

export async function checkAnnualReviews(): Promise<Array<{ id: string; name: string; annualReviewDate: string }>> {
  try {
    const supabase = await createClient();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('subprocessors')
      .select('id, name, annual_review_date')
      .eq('contract_status', 'active')
      .lte('annual_review_date', thirtyDays)
      .order('annual_review_date', { ascending: true });

    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      annualReviewDate: s.annual_review_date,
    }));
  } catch {
    return [];
  }
}
