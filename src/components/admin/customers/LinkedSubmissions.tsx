import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ExternalLink, Thermometer, Wind, Scan, Calculator } from 'lucide-react';
import { format } from 'date-fns';

interface LinkedSubmissionsProps {
  customerId: string;
}

interface SubmissionDetail {
  id: string;
  type: string;
  source: string;
  customerName: string;
  status: string;
  estimatedValue: number | null;
  createdAt: string;
  label?: string;
}

const sourceConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  ducted_estimate: { 
    icon: <Wind className="h-4 w-4" />, 
    label: 'Ducted Estimator',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  ductless_estimate: { 
    icon: <Thermometer className="h-4 w-4" />, 
    label: 'Ductless Estimator',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  equipment_scan: { 
    icon: <Scan className="h-4 w-4" />, 
    label: 'Equipment Scanner',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  },
  contact: { 
    icon: <FileText className="h-4 w-4" />, 
    label: 'Contact Form',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
  landing_page: { 
    icon: <FileText className="h-4 w-4" />, 
    label: 'Landing Page',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  estimate: { 
    icon: <Calculator className="h-4 w-4" />, 
    label: 'Job Estimate',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  },
};

// Map DB submission_type values to the table they come from
const submissionTableMap: Record<string, string> = {
  ducted_estimate: 'ducted_estimate_submissions',
  ductless_estimate: 'ductless_estimate_submissions',
  equipment_scan: 'equipment_scans',
};

export function LinkedSubmissions({ customerId }: LinkedSubmissionsProps) {
  const navigate = useNavigate();

  // Fetch submission links for this customer
  const { data: links, isLoading: linksLoading } = useQuery({
    queryKey: ['crm_submission_links', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_submission_links')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch estimates linked via customer_id
  const { data: estimates, isLoading: estimatesLoading } = useQuery({
    queryKey: ['linked_estimates', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('id, estimate_number, title, customer_name, status, grand_total, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch details for each linked submission
  const { data: submissionDetails } = useQuery({
    queryKey: ['linked_submission_details', links],
    queryFn: async () => {
      if (!links || links.length === 0) return [];

      const details: SubmissionDetail[] = [];

      for (const link of links) {
        try {
          if (link.submission_type === 'ducted_estimate') {
            const { data } = await supabase
              .from('ducted_estimate_submissions')
              .select('id, customer_name, status, final_total, created_at')
              .eq('id', link.submission_id)
              .single();
            
            if (data) {
              details.push({
                id: data.id,
                type: 'ducted_estimate',
                source: 'ducted_estimate',
                customerName: data.customer_name,
                status: data.status,
                estimatedValue: data.final_total,
                createdAt: data.created_at,
              });
            }
          } else if (link.submission_type === 'ductless_estimate') {
            const { data } = await supabase
              .from('ductless_estimate_submissions')
              .select('id, customer_name, status, final_total, created_at')
              .eq('id', link.submission_id)
              .single();
            
            if (data) {
              details.push({
                id: data.id,
                type: 'ductless_estimate',
                source: 'ductless_estimate',
                customerName: data.customer_name || 'Unknown',
                status: data.status,
                estimatedValue: data.final_total,
                createdAt: data.created_at,
              });
            }
          } else if (link.submission_type === 'equipment_scan') {
            const { data } = await supabase
              .from('equipment_scans')
              .select('id, customer_name, status, created_at')
              .eq('id', link.submission_id)
              .single();
            
            if (data) {
              details.push({
                id: data.id,
                type: 'equipment_scan',
                source: 'equipment_scan',
                customerName: data.customer_name || 'Unknown',
                status: data.status,
                estimatedValue: null,
                createdAt: data.created_at || '',
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch ${link.submission_type} submission:`, err);
        }
      }

      return details;
    },
    enabled: !!links && links.length > 0,
  });

  // Merge submission details with estimates
  const allItems: SubmissionDetail[] = [
    ...(submissionDetails || []),
    ...(estimates || []).map((est) => ({
      id: est.id,
      type: 'estimate',
      source: 'estimate',
      customerName: est.customer_name || 'Unknown',
      status: est.status,
      estimatedValue: est.grand_total,
      createdAt: est.created_at,
      label: est.title || est.estimate_number || undefined,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleViewSubmission = (submission: SubmissionDetail) => {
    if (submission.type === 'estimate') {
      navigate(`/admin/estimates/${submission.id}`);
    } else {
      // Map DB types back to route segments
      const routeType = submission.type === 'ducted_estimate' ? 'ducted'
        : submission.type === 'ductless_estimate' ? 'ductless'
        : submission.type === 'equipment_scan' ? 'scanner'
        : submission.type;
      navigate(`/admin/submissions/${routeType}/${submission.id}`);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const isLoading = linksLoading || estimatesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Linked Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allItems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center py-8">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No linked submissions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimator, scanner submissions, and estimates will appear here when linked
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Linked Submissions ({allItems.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allItems.map((submission) => {
            const config = sourceConfig[submission.source] || sourceConfig.contact;
            
            return (
              <div 
                key={`${submission.type}-${submission.id}`} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {submission.label || config.label}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {submission.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      {submission.estimatedValue && (
                        <span className="font-medium text-foreground">
                          {formatCurrency(submission.estimatedValue)}
                        </span>
                      )}
                      <span>•</span>
                      <span>{format(new Date(submission.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleViewSubmission(submission)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
