import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowRight, AlertTriangle, Wrench, HardHat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface JobTypeBoardPreviewProps {
  jobTypeSlug: string;
  title: string;
  icon?: 'wrench' | 'hardhat';
}

interface Stage {
  id: string;
  name: string;
  stage_type: string;
  color: string | null;
  sort_order: number;
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  priority: string | null;
  quoted_amount: number | null;
  current_stage_id: string | null;
  customer: {
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  } | null;
}

export function JobTypeBoardPreview({ jobTypeSlug, title, icon = 'wrench' }: JobTypeBoardPreviewProps) {
  const { data: jobType } = useQuery({
    queryKey: ['job-type-by-slug', jobTypeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_types')
        .select('id, name, slug, color')
        .eq('slug', jobTypeSlug)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['job-type-stages', jobType?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_stages')
        .select('id, name, stage_type, color, sort_order')
        .eq('job_type_id', jobType!.id)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!jobType?.id,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['dashboard-jobs-by-type', jobType?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select(`
          id, job_number, title, priority, quoted_amount, current_stage_id,
          customer:crm_customers(first_name, last_name, company_name)
        `)
        .eq('job_type_id', jobType!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!jobType?.id,
  });

  // Group jobs by stage, exclude cancelled
  const visibleStages = stages.filter(s => s.stage_type !== 'cancelled');
  const groupedByStage = visibleStages.map(stage => ({
    stage,
    jobs: jobs.filter(j => j.current_stage_id === stage.id),
  }));

  const activeJobsCount = jobs.filter(j => {
    const stage = stages.find(s => s.id === j.current_stage_id);
    return stage?.stage_type !== 'completed' && stage?.stage_type !== 'cancelled';
  }).length;

  const urgentCount = jobs.filter(j => j.priority === 'urgent' || j.priority === 'high').length;
  const totalQuoted = jobs.reduce((sum, j) => sum + (j.quoted_amount || 0), 0);

  const getCustomerName = (job: Job) => {
    if (job.customer?.company_name) return job.customer.company_name;
    if (job.customer?.first_name || job.customer?.last_name) {
      return `${job.customer.first_name || ''} ${job.customer.last_name || ''}`.trim();
    }
    return 'Unknown';
  };

  const IconComponent = icon === 'hardhat' ? HardHat : Wrench;

  if (isLoading || !jobType) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          {title}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/admin/jobs?type=${jobTypeSlug}`} className="flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stage breakdown */}
        <div className="space-y-2 mb-4">
          {groupedByStage.map(({ stage, jobs: stageJobs }) => (
            <div key={stage.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color || '#6B7280' }}
                />
                <span className="text-muted-foreground">{stage.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {stageJobs.length}
              </Badge>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {activeJobsCount} active
          </span>
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {urgentCount} urgent
            </span>
          )}
          <span className="ml-auto font-medium">
            ${totalQuoted.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
