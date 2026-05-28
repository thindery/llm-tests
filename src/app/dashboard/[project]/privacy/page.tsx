"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProcessingActivitiesList } from './components/ProcessingActivitiesList';
import { LegalBasisList } from './components/LegalBasisList';
import { CreateProcessingActivityDialog } from './components/CreateProcessingActivityDialog';
import { CreateLegalBasisDialog } from './components/CreateLegalBasisDialog';
import { ExportDialog } from './components/ExportDialog';
import { toast } from 'sonner';

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

interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  legal_basis_id: string;
  legal_basis?: LegalBasis;
  data_categories: string[];
  data_retention_days?: number;
  recipients?: string;
  safeguards?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PrivacyDashboard() {
  const params = useParams();
  const projectId = params?.project as string;
  
  const [activeTab, setActiveTab] = useState('activities');
  const [activities, setActivities] = useState<ProcessingActivity[]>([]);
  const [legalBasisList, setLegalBasisList] = useState<LegalBasis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateActivity, setShowCreateActivity] = useState(false);
  const [showCreateLegalBasis, setShowCreateLegalBasis] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      // Fetch processing activities
      const activitiesRes = await fetch(`/api/v1/processing/activities?project_id=${projectId}`);
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }
      
      // Fetch legal basis
      const legalBasisRes = await fetch(`/api/v1/processing/legal-basis?project_id=${projectId}`);
      if (legalBasisRes.ok) {
        const legalBasisData = await legalBasisRes.json();
        setLegalBasisList(legalBasisData);
      }
    } catch (error) {
      console.error('Error fetching privacy data:', error);
      toast.error('Failed to load privacy data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActivityCreated = () => {
    setShowCreateActivity(false);
    fetchData();
    toast.success('Processing activity created successfully');
  };

  const handleLegalBasisCreated = () => {
    setShowCreateLegalBasis(false);
    fetchData();
    toast.success('Legal basis created successfully');
  };

  const handleActivityDeleted = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/processing/activities/${id}?project_id=${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
        toast.success('Processing activity deleted');
      }
    } catch (error) {
      toast.error('Failed to delete processing activity');
    }
  };

  const handleLegalBasisDeleted = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/processing/legal-basis/${id}?project_id=${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
        toast.success('Legal basis deleted');
      }
    } catch (error) {
      toast.error('Failed to delete legal basis');
    }
  };

  const activeActivities = activities.filter(a => a.is_active);
  const inactiveActivities = activities.filter(a => !a.is_active);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Privacy & GDPR Compliance</h1>
          <p className="text-muted-foreground">
            Manage processing activities and legal basis for project: {projectId}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowExport(true)}>
            Export Article 30 Records
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeActivities.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeActivities.filter(a => a.legal_basis?.basis_type === 'legitimate_interest').length} with Legitimate Interest
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Legal Basis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legalBasisList.filter(l => l.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {legalBasisList.filter(l => l.is_active && l.basis_type === 'consent').length} Consent-based
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeActivities.length > 0 
                ? Math.round(activeActivities.reduce((sum, a) => sum + (a.data_retention_days || 0), 0) / activeActivities.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeActivities.length > 0 && legalBasisList.length > 0 ? '✓' : '⚠'}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeActivities.length > 0 && legalBasisList.length > 0 
                ? 'Article 30 ready' 
                : 'Setup incomplete'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="activities">Processing Activities</TabsTrigger>
          <TabsTrigger value="legal-basis">Legal Basis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Processing Activities</h2>
            <Button onClick={() => setShowCreateActivity(true)}>
              + Add Activity
            </Button>
          </div>
          
          <ProcessingActivitiesList 
            activities={activities}
            isLoading={isLoading}
            onDelete={handleActivityDeleted}
            onRefresh={fetchData}
          />
        </TabsContent>
        
        <TabsContent value="legal-basis" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Legal Basis</h2>
            <Button onClick={() => setShowCreateLegalBasis(true)}>
              + Add Legal Basis
            </Button>
          </div>
          
          <LegalBasisList 
            legalBasisList={legalBasisList}
            isLoading={isLoading}
            onDelete={handleLegalBasisDeleted}
            onRefresh={fetchData}
          />
        </TabsContent>
      </Tabs>

      <CreateProcessingActivityDialog
        open={showCreateActivity}
        onOpenChange={setShowCreateActivity}
        projectId={projectId}
        legalBasisList={legalBasisList.filter(l => l.is_active)}
        onSuccess={handleActivityCreated}
      />

      <CreateLegalBasisDialog
        open={showCreateLegalBasis}
        onOpenChange={setShowCreateLegalBasis}
        projectId={projectId}
        onSuccess={handleLegalBasisCreated}
      />

      <ExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        projectId={projectId}
      />
    </div>
  );
}
