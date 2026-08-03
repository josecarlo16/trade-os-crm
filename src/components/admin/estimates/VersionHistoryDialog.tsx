import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History, GitCompare, RotateCcw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface VersionData {
  estimate_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  job_type: string;
  heating_type: string;
  job_notes: string | null;
  status: string;
  profit_margin: number;
  tax_rate: number;
  subtotal_cost: number;
  subtotal_charge: number;
  tax_amount: number;
  grand_total: number;
  valid_until: string | null;
  line_items: Array<{
    id: string;
    item_type: string;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unit_cost: number;
    line_total: number;
    sort_order: number;
  }>;
  created_at: string;
  updated_at: string;
}

interface EstimateVersion {
  id: string;
  estimate_id: string;
  version_number: number;
  snapshot_data: VersionData;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateId: string;
  currentEstimate: any;
  onRestoreVersion: (versionData: VersionData) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  residential_new: 'Residential - New',
  residential_replacement: 'Residential - Replacement',
  commercial_new: 'Commercial - New',
  commercial_replacement: 'Commercial - Replacement',
  maintenance: 'Maintenance',
  repair: 'Repair',
};

export const VersionHistoryDialog = ({
  open,
  onOpenChange,
  estimateId,
  currentEstimate,
  onRestoreVersion,
}: VersionHistoryDialogProps) => {
  const [selectedVersion, setSelectedVersion] = useState<EstimateVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['estimate-versions', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_versions')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      // Cast snapshot_data from Json to our VersionData type
      return (data || []).map(v => ({
        ...v,
        snapshot_data: v.snapshot_data as unknown as VersionData,
      })) as EstimateVersion[];
    },
    enabled: open,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleRestore = (version: EstimateVersion) => {
    if (confirm(`Are you sure you want to restore version ${version.version_number}? This will replace the current estimate data.`)) {
      onRestoreVersion(version.snapshot_data);
      toast.success(`Restored to version ${version.version_number}`);
      onOpenChange(false);
    }
  };

  const renderDiff = (label: string, oldValue: any, newValue: any) => {
    if (oldValue === newValue) return null;
    return (
      <div className="flex items-center gap-2 text-sm py-1">
        <span className="font-medium text-muted-foreground w-32">{label}:</span>
        <span className="line-through text-red-600">{String(oldValue || 'N/A')}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-green-600">{String(newValue || 'N/A')}</span>
      </div>
    );
  };

  const renderComparison = (version: EstimateVersion) => {
    const old = version.snapshot_data;
    const current = currentEstimate;
    
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Changes from Version {version.version_number} to Current</h4>
          <div className="space-y-1">
            {renderDiff('Customer', old.customer_name, current.customer_name)}
            {renderDiff('Status', old.status, current.status)}
            {renderDiff('Job Type', JOB_TYPE_LABELS[old.job_type], JOB_TYPE_LABELS[current.job_type])}
            {renderDiff('Heating Type', old.heating_type, current.heating_type)}
            {renderDiff('Profit Margin', `${Math.round((old.profit_margin - 1) * 100)}%`, `${Math.round((current.profit_margin - 1) * 100)}%`)}
            {renderDiff('Grand Total', formatCurrency(old.grand_total), formatCurrency(current.grand_total))}
            {renderDiff('Tax Rate', `${(old.tax_rate * 100).toFixed(2)}%`, `${(current.tax_rate * 100).toFixed(2)}%`)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-muted-foreground">Version {version.version_number} Line Items</h4>
            <div className="space-y-2 text-sm">
              {old.line_items?.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate">{item.name}</span>
                  <span className="font-mono">{formatCurrency(item.line_total)}</span>
                </div>
              ))}
              {(!old.line_items || old.line_items.length === 0) && (
                <p className="text-muted-foreground italic">No line items</p>
              )}
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Current Line Items</h4>
            <p className="text-sm text-muted-foreground italic">
              (View in estimate builder to see current items)
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No version history yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Versions are created automatically when you save changes
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <ScrollArea className="h-[60vh] border rounded-lg">
              <div className="p-2 space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'bg-primary/10 border-primary border'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedVersion(version);
                      setCompareMode(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">Version {version.version_number}</span>
                      <Badge variant="outline" className={STATUS_COLORS[version.snapshot_data.status]}>
                        {version.snapshot_data.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                    <div className="text-sm font-mono mt-1">
                      {formatCurrency(version.snapshot_data.grand_total)}
                    </div>
                    {version.change_summary && (
                      <div className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {version.change_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="col-span-2 border rounded-lg p-4">
              {selectedVersion ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      Version {selectedVersion.version_number}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompareMode(!compareMode)}
                      >
                        <GitCompare className="h-4 w-4 mr-2" />
                        {compareMode ? 'View Details' : 'Compare'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(selectedVersion)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[50vh]">
                    {compareMode ? (
                      renderComparison(selectedVersion)
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Customer</p>
                            <p className="font-medium">{selectedVersion.snapshot_data.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className={STATUS_COLORS[selectedVersion.snapshot_data.status]}>
                              {selectedVersion.snapshot_data.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Job Type</p>
                            <p className="font-medium">{JOB_TYPE_LABELS[selectedVersion.snapshot_data.job_type]}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Heating Type</p>
                            <p className="font-medium capitalize">{selectedVersion.snapshot_data.heating_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Profit Margin</p>
                            <p className="font-medium">{Math.round((selectedVersion.snapshot_data.profit_margin - 1) * 100)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tax Rate</p>
                            <p className="font-medium">{(selectedVersion.snapshot_data.tax_rate * 100).toFixed(2)}%</p>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-3">Totals</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Subtotal Cost</p>
                              <p className="font-mono">{formatCurrency(selectedVersion.snapshot_data.subtotal_cost)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Subtotal Charge</p>
                              <p className="font-mono">{formatCurrency(selectedVersion.snapshot_data.subtotal_charge)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Tax Amount</p>
                              <p className="font-mono">{formatCurrency(selectedVersion.snapshot_data.tax_amount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Grand Total</p>
                              <p className="font-mono font-bold text-lg">{formatCurrency(selectedVersion.snapshot_data.grand_total)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-3">Line Items ({selectedVersion.snapshot_data.line_items?.length || 0})</h4>
                          <div className="space-y-2">
                            {selectedVersion.snapshot_data.line_items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.quantity} {item.unit} × {formatCurrency(item.unit_cost)}
                                  </p>
                                </div>
                                <p className="font-mono">{formatCurrency(item.line_total)}</p>
                              </div>
                            ))}
                            {(!selectedVersion.snapshot_data.line_items || selectedVersion.snapshot_data.line_items.length === 0) && (
                              <p className="text-muted-foreground italic">No line items in this version</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a version to view details
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
