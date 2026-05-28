"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface LegalBasis {
  id: string;
  name: string;
  basis_type: string;
}

interface CreateProcessingActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  legalBasisList: LegalBasis[];
  onSuccess: () => void;
}

export function CreateProcessingActivityDialog({
  open,
  onOpenChange,
  projectId,
  legalBasisList,
  onSuccess,
}: CreateProcessingActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    legal_basis_id: '',
    data_categories: '',
    data_retention_days: '',
    recipients: '',
    safeguards: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.legal_basis_id) {
      toast.error('Please select a legal basis');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/v1/processing/activities?project_id=' + projectId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          data_categories: formData.data_categories.split(',').map(c => c.trim()).filter(Boolean),
          data_retention_days: formData.data_retention_days ? parseInt(formData.data_retention_days) : null,
        }),
      });

      if (response.ok) {
        setFormData({
          name: '',
          purpose: '',
          legal_basis_id: '',
          data_categories: '',
          data_retention_days: '',
          recipients: '',
          safeguards: '',
        });
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create processing activity');
      }
    } catch (error) {
      toast.error('Failed to create processing activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Processing Activity</DialogTitle>
          <DialogDescription>
            Define a new processing activity for GDPR Article 30 compliance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Activity Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Session Replay Analytics"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose of Processing *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="Why is this data being processed?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Legal Basis *</Label>
            <div className="flex flex-wrap gap-2">
              {legalBasisList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No legal basis available. Create one first.
                </p>
              ) : (
                legalBasisList.map((lb) => (
                  <button
                    key={lb.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, legal_basis_id: lb.id })}
                    className={`
                      px-3 py-1.5 rounded-full text-sm border transition-colors
                      ${formData.legal_basis_id === lb.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                      }
                    `}
                  >
                    {lb.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_categories">Data Categories (comma-separated)</Label>
            <Input
              id="data_categories"
              value={formData.data_categories}
              onChange={(e) => setFormData({ ...formData, data_categories: e.target.value })}
              placeholder="e.g., email, usage_data, personal_identifiers"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_retention_days">Retention (days)</Label>
              <Input
                id="data_retention_days"
                type="number"
                min="0"
                value={formData.data_retention_days}
                onChange={(e) => setFormData({ ...formData, data_retention_days: e.target.value })}
                placeholder="90"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">Data Recipients</Label>
              <Input
                id="recipients"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="e.g., Internal team, Analytics provider"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="safeguards">Security Measures</Label>
            <Textarea
              id="safeguards"
              value={formData.safeguards}
              onChange={(e) => setFormData({ ...formData, safeguards: e.target.value })}
              placeholder="e.g., Data encrypted at rest and in transit; access restricted to authorized personnel"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.legal_basis_id}
            >
              {isSubmitting ? 'Creating...' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
