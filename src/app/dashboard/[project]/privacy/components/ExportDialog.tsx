"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  projectId,
}: ExportDialogProps) {
  const handleDownloadCSV = async () => {
    try {
      const response = await fetch(`/api/v1/processing/export/csv?project_id=${projectId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processing_activities_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        onOpenChange(false);
        toast.success('CSV export downloaded');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to export CSV');
      }
    } catch (error) {
      toast.error('Failed to download CSV');
    }
  };

  const handleDownloadMarkdown = async () => {
    try {
      const response = await fetch(`/api/v1/processing/export/markdown?project_id=${projectId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processing_activities_${projectId}_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        onOpenChange(false);
        toast.success('Markdown export downloaded');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to export Markdown');
      }
    } catch (error) {
      toast.error('Failed to download Markdown');
    }
  };

  const handleCopyLIA = async () => {
    try {
      const response = await fetch(`/api/v1/processing/export/markdown?project_id=${projectId}`);
      
      if (response.ok) {
        const text = await response.text();
        await navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
      } else {
        toast.error('Failed to generate export');
      }
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Processing Activities</DialogTitle>
          <DialogDescription>
            Download your GDPR Article 30 processing activity records in various formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={handleDownloadCSV}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded">
                <FileSpreadsheet className="w-5 h-5 text-green-700" />
              </div>
              <div className="text-left">
                <div className="font-medium">Export as CSV</div>
                <div className="text-sm text-muted-foreground">
                  Spreadsheet format for data analysis
                </div>
              </div>
            </div>
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={handleDownloadMarkdown}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <FileText className="w-5 h-5 text-blue-700" />
              </div>
              <div className="text-left">
                <div className="font-medium">Export as Markdown</div>
                <div className="text-sm text-muted-foreground">
                  Formatted document for documentation
                </div>
              </div>
            </div>
            <Download className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={handleCopyLIA}
          >
            Copy to clipboard
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted rounded text-sm text-muted-foreground">
          <p>These exports include:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>All active processing activities</li>
            <li>Associated legal basis information</li>
            <li>Data categories and retention periods</li>
            <li>Recipients and security measures</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
