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
  is_active: boolean;
}

interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  legal_basis?: LegalBasis;
  data_categories: string[];
  data_retention_days?: number;
  recipients?: string;
  safeguards?: string;
  is_active: boolean;
  created_at: string;
}

interface ProcessingActivitiesListProps {
  activities: ProcessingActivity[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const basisTypeColors: Record<string, string> = {
  consent: 'bg-blue-100 text-blue-800',
  contract: 'bg-green-100 text-green-800',
  legal_obligation: 'bg-red-100 text-red-800',
  vital_interests: 'bg-orange-100 text-orange-800',
  public_task: 'bg-purple-100 text-purple-800',
  legitimate_interest: 'bg-yellow-100 text-yellow-800',
};

export function ProcessingActivitiesList({ 
  activities, 
  isLoading, 
  onDelete, 
  onRefresh 
}: ProcessingActivitiesListProps) {
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
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No processing activities defined yet. Create one to start tracking GDPR compliance.
          </p>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeActivities = activities.filter(a => a.is_active);
  const inactiveActivities = activities.filter(a => !a.is_active);

  return (
    <div className="space-y-4">
      {activeActivities.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Activities</h3>
          {activeActivities.map((activity) => (
            <ActivityCard 
              key={activity.id} 
              activity={activity} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      )}
      
      {inactiveActivities.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">Inactive Activities</h3>
          {inactiveActivities.map((activity) => (
            <ActivityCard 
              key={activity.id} 
              activity={activity} 
              onDelete={onDelete}
              isInactive
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ActivityCardProps {
  activity: ProcessingActivity;
  onDelete: (id: string) => void;
  isInactive?: boolean;
}

function ActivityCard({ activity, onDelete, isInactive }: ActivityCardProps) {
  return (
    <Card className={isInactive ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{activity.name}</CardTitle>
            <CardDescription className="mt-1">
              {activity.purpose}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {activity.legal_basis && (
              <Badge 
                variant="secondary"
                className={basisTypeColors[activity.legal_basis.basis_type] || ''}
              >
                {activity.legal_basis.basis_type}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(activity.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Legal Basis:</span>
            <p className="font-medium">{activity.legal_basis?.name || 'Not assigned'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data Categories:</span>
            <p className="font-medium">
              {activity.data_categories.length > 0 
                ? activity.data_categories.join(', ') 
                : 'None specified'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Retention:</span>
            <p className="font-medium">
              {activity.data_retention_days 
                ? `${activity.data_retention_days} days` 
                : 'Not specified'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Recipients:</span>
            <p className="font-medium">{activity.recipients || 'None specified'}</p>
          </div>
        </div>
        {activity.safeguards && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-muted-foreground text-sm">Safeguards:</span>
            <p className="text-sm mt-1">{activity.safeguards}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
