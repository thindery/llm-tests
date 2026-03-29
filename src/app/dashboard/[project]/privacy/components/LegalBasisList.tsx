"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, RefreshCw } from 'lucide-react';

interface LegalBasis {
  id: string;
  name: string;
  basis_type: string;
  description?: string;
  legitimate_interest_reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LegalBasisListProps {
  legalBasisList: LegalBasis[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const basisTypeLabels: Record<string, string> = {
  consent: 'Consent (Art. 6.1a)',
  contract: 'Contract (Art. 6.1b)',
  legal_obligation: 'Legal Obligation (Art. 6.1c)',
  vital_interests: 'Vital Interests (Art. 6.1d)',
  public_task: 'Public Task (Art. 6.1e)',
  legitimate_interest: 'Legitimate Interest (Art. 6.1f)',
};

const basisTypeColors: Record<string, string> = {
  consent: 'bg-blue-100 text-blue-800',
  contract: 'bg-green-100 text-green-800',
  legal_obligation: 'bg-red-100 text-red-800',
  vital_interests: 'bg-orange-100 text-orange-800',
  public_task: 'bg-purple-100 text-purple-800',
  legitimate_interest: 'bg-yellow-100 text-yellow-800',
};

export function LegalBasisList({ 
  legalBasisList, 
  isLoading, 
  onDelete, 
  onRefresh 
}: LegalBasisListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (legalBasisList.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No legal basis defined yet. Create one before adding processing activities.
          </p>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeItems = legalBasisList.filter(l => l.is_active);
  const inactiveItems = legalBasisList.filter(l => !l.is_active);

  return (
    <div className="space-y-4">
      {activeItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Legal Basis</h3>
          {activeItems.map((item) => (
            <LegalBasisCard 
              key={item.id} 
              item={item} 
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
      
      {inactiveItems.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">Inactive Legal Basis</h3>
          {inactiveItems.map((item) => (
            <LegalBasisCard 
              key={item.id} 
              item={item} 
              onDelete={onDelete}
              isInactive
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface LegalBasisCardProps {
  item: LegalBasis;
  onDelete: (id: string) => void;
  isInactive?: boolean;
}

function LegalBasisCard({ item, onDelete, isInactive }: LegalBasisCardProps) {
  return (
    <Card className={isInactive ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <Badge 
                variant="secondary"
                className={basisTypeColors[item.basis_type] || ''}
              >
                {basisTypeLabels[item.basis_type] || item.basis_type}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {item.description && (
            <p className="text-sm">{item.description}</p>
          )}
          
          {item.basis_type === 'legitimate_interest' && item.legitimate_interest_reason && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Legitimate Interest Assessment (LIA)
              </p>
              <p className="text-sm">{item.legitimate_interest_reason}</p>
            </div>
          )}
          
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
            <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
