"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BASIS_TYPES = [
  { value: 'consent', label: 'Consent (Art. 6.1a)', description: 'Data subject has given consent' },
  { value: 'contract', label: 'Contract (Art. 6.1b)', description: 'Processing necessary for a contract' },
  { value: 'legal_obligation', label: 'Legal Obligation (Art. 6.1c)', description: 'Compliance with legal obligation' },
  { value: 'vital_interests', label: 'Vital Interests (Art. 6.1d)', description: 'Protect vital interests' },
  { value: 'public_task', label: 'Public Task (Art. 6.1e)', description: 'Public interest or official authority' },
  { value: 'legitimate_interest', label: 'Legitimate Interest (Art. 6.1f)', description: 'Legitimate interests pursued' },
];

interface CreateLegalBasisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

export function CreateLegalBasisDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: CreateLegalBasisDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    basis_type: '',
    description: '',
    legitimate_interest_reason: '',
  });

  const selectedBasisType = BASIS_TYPES.find(b => b.value === formData.basis_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.basis_type) {
      toast.error('Please select a basis type');
      return;
    }

    if (formData.basis_type === 'legitimate_interest' && !formData.legitimate_interest_reason.trim()) {
      toast.error('Legitimate interest reason is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/v1/processing/legal-basis?project_id=' + projectId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          legitimate_interest_reason: formData.basis_type === 'legitimate_interest' 
            ? formData.legitimate_interest_reason 
            : null,
        }),
      });

      if (response.ok) {
        setFormData({
          name: '',
          basis_type: '',
          description: '',
          legitimate_interest_reason: '',
        });
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create legal basis');
      }
    } catch (error) {
      toast.error('Failed to create legal basis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Legal Basis</DialogTitle>
          <DialogDescription>
            Define a GDPR Article 6 legal basis for processing activities.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Analytics Legitimate Interest"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>GDPR Basis Type *</Label>
            <Select 
              value={formData.basis_type} 
              onValueChange={(value) => setFormData({ ...formData, basis_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a basis type" />
              </SelectTrigger>
              <SelectContent>
                {BASIS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col items-start">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBasisType && (
              <p className="text-sm text-muted-foreground">
                {selectedBasisType.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional context about this legal basis"
            />
          </div>

          {formData.basis_type === 'legitimate_interest' && (
            <div className="space-y-2">
              <Label htmlFor="legitimate_interest_reason">
                Legitimate Interest Assessment (LIA) *
              </Label>
              <Textarea
                id="legitimate_interest_reason"
                value={formData.legitimate_interest_reason}
                onChange={(e) => setFormData({ ...formData, legitimate_interest_reason: e.target.value })}
                placeholder="Document your Legitimate Interest Assessment: What is the legitimate interest? Why is processing necessary? Consider data subject rights..."
                rows={5}
                required={formData.basis_type === 'legitimate_interest'}
              />
              <p className="text-xs text-muted-foreground">
                Required for legitimate interest basis. This documents your LIA for accountability.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.basis_type}
            >
              {isSubmitting ? 'Creating...' : 'Create Legal Basis'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
