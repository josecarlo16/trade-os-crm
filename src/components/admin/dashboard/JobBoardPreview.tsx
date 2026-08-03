import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Job {
  id: string;
  job_number: string;
  title: string;
  priority: string | null;
  quoted_amount: number | null;
  current_stage: {
    stage_type: string;
    name: string;
    color: string | null;
  } | null;
  customer: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
}

interface GroupedJobs {
  initial: Job[];
  in_progress: Job[];
  review: Job[];
  completed: Job[];
}

const STAGE_CONFIG = {
  initial: { label: 'Initial', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  review: { label: 'Review', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

export function JobBoardPreview() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['dashboard-jobs-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select(`
          id, job_number, title, priority, quoted_amount,
          current_stage:crm_job_stages(stage_type, name, color),
          customer:crm_customers(first_name, last_name, company_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as Job[];
    },
  });

  const groupedJobs: GroupedJobs = {
    initial: [],
    in_progress: [],
    review: [],
    completed: [],
  };

  jobs?.forEach((job) => {
    const stageType = job.current_stage?.stage_type || 'initial';
    if (stageType in groupedJobs) {
      groupedJobs[stageType as keyof GroupedJobs].push(job);
    }
  });

  const activeJobsCount = (jobs || []).filter(
    (j) => j.current_stage?.stage_type !== 'completed' && j.current_stage?.stage_type !== 'cancelled'
  ).length;
  
  const urgentCount = (jobs || []).filter((j) => j.priority === 'urgent' || j.priority === 'high').length;
  
  const totalQuoted = (jobs || []).reduce((sum, j) => sum + (j.quoted_amount || 0), 0);

  const getCustomerName = (job: Job) => {
    if (job.customer?.company_name) return job.customer.company_name;
    if (job.customer?.first_name || job.customer?.last_name) {
      return `${job.customer.first_name || ''} ${job.customer.last_name || ''}`.trim();
    }
    return 'Unknown';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Jobs Board
          </CardTitle>
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Jobs Board
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/jobs" className="flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Mini Kanban Grid */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {(Object.keys(STAGE_CONFIG) as Array<keyof typeof STAGE_CONFIG>).map((stageKey) => {
            const config = STAGE_CONFIG[stageKey];
            const stageJobs = groupedJobs[stageKey];
            
            return (
              <div key={stageKey} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.label}
                  </span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {stageJobs.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {stageJobs.slice(0, 6).map((job) => (
                    <Link
                      key={job.id}
                      to={`/admin/jobs/${job.id}`}
                      className="block p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-mono text-muted-foreground truncate">
                          {job.job_number}
                        </span>
                        {(job.priority === 'urgent' || job.priority === 'high') && (
                          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs font-medium truncate mt-0.5">{job.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {getCustomerName(job)}
                      </p>
                    </Link>
                  ))}
                  {stageJobs.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center border border-dashed rounded-md">
                      No jobs
                    </div>
                  )}
                  {stageJobs.length > 6 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{stageJobs.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {activeJobsCount} active jobs
          </span>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {urgentCount} urgent
            </span>
          )}
          <span className="ml-auto font-medium">
            ${totalQuoted.toLocaleString()} total
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
