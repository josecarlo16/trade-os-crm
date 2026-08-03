import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Link as LinkIcon, ExternalLink, FileText, Kanban, Briefcase, X, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LinkedRecordsCardProps {
  entityType: 'job' | 'estimate' | 'pipeline';
  entityId: string;
  customerId?: string | null;
  // For jobs: pass the current linked IDs
  sourceEstimateId?: string | null;
  sourcePipelineId?: string | null;
  // For estimates: pass the WorkEdge project id so we can auto-match a job
  workedgeProjectId?: string | null;
}

export function LinkedRecordsCard({ entityType, entityId, customerId, sourceEstimateId, sourcePipelineId, workedgeProjectId }: LinkedRecordsCardProps) {
  const queryClient = useQueryClient();
  const [linkingType, setLinkingType] = useState<'estimate' | 'pipeline' | 'job' | null>(null);

  // For job detail: fetch linked estimate details
  const { data: linkedEstimate } = useQuery({
    queryKey: ['linked-estimate', sourceEstimateId],
    queryFn: async () => {
      if (!sourceEstimateId) return null;
      const { data } = await supabase
        .from('estimates')
        .select('id, estimate_number, title, grand_total, status')
        .eq('id', sourceEstimateId)
        .single();
      return data;
    },
    enabled: entityType === 'job' && !!sourceEstimateId,
  });

  // For job detail: fetch linked pipeline entry
  const { data: linkedPipeline } = useQuery({
    queryKey: ['linked-pipeline', sourcePipelineId],
    queryFn: async () => {
      if (!sourcePipelineId) return null;
      const { data } = await supabase
        .from('crm_pipeline_entries')
        .select('id, estimated_value, stage_id, customer:crm_customers!inner(first_name, last_name, company_name)')
        .eq('id', sourcePipelineId)
        .single();
      if (!data) return null;
      // Get stage name
      const { data: stage } = await supabase
        .from('crm_pipeline_stages')
        .select('display_name, color')
        .eq('id', data.stage_id)
        .single();
      return { ...data, stage };
    },
    enabled: entityType === 'job' && !!sourcePipelineId,
  });

  // For estimate/pipeline: find jobs that reference this entity
  const { data: linkedJobs = [] } = useQuery({
    queryKey: ['linked-jobs', entityType, entityId],
    queryFn: async () => {
      const column = entityType === 'estimate' ? 'source_estimate_id' : 'source_pipeline_id';
      const { data } = await supabase
        .from('crm_jobs')
        .select('id, job_number, title, current_stage:crm_job_stages(name, color)')
        .eq(column, entityId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: entityType === 'estimate' || entityType === 'pipeline',
  });

  // For pipeline: find linked estimates via jobs
  const { data: linkedEstimatesViaJobs = [] } = useQuery({
    queryKey: ['linked-estimates-via-jobs', entityType, entityId],
    queryFn: async () => {
      const { data: jobs } = await supabase
        .from('crm_jobs')
        .select('source_estimate_id')
        .eq('source_pipeline_id', entityId)
        .not('source_estimate_id', 'is', null)
        .is('deleted_at', null);
      if (!jobs || jobs.length === 0) return [];
      const estimateIds = jobs.map(j => j.source_estimate_id).filter(Boolean) as string[];
      const { data } = await supabase
        .from('estimates')
        .select('id, estimate_number, title, grand_total, status')
        .in('id', estimateIds);
      return data || [];
    },
    enabled: entityType === 'pipeline',
  });

  // Available estimates for linking (filtered by customer)
  const { data: availableEstimates = [] } = useQuery({
    queryKey: ['available-estimates-for-link', customerId],
    queryFn: async () => {
      let query = supabase.from('estimates').select('id, estimate_number, title, grand_total, status');
      if (customerId) query = query.eq('customer_id', customerId);
      const { data } = await query.order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    enabled: linkingType === 'estimate',
  });

  // Available pipeline entries for linking
  const { data: availablePipelineEntries = [] } = useQuery({
    queryKey: ['available-pipeline-for-link', customerId],
    queryFn: async () => {
      let query = supabase
        .from('crm_pipeline_entries')
        .select('id, estimated_value, customer:crm_customers!inner(first_name, last_name, company_name)');
      if (customerId) query = query.eq('customer_id', customerId);
      const { data } = await query.limit(50);
      return data || [];
    },
    enabled: linkingType === 'pipeline',
  });

  // Link/unlink mutation for jobs
  const linkMutation = useMutation({
    mutationFn: async ({ field, value }: { field: 'source_estimate_id' | 'source_pipeline_id'; value: string | null }) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ [field]: value })
        .eq('id', entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', entityId] });
      queryClient.invalidateQueries({ queryKey: ['linked-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['linked-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['linked-jobs'] });
      setLinkingType(null);
      toast.success('Link updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ===== Estimate-side: link a crm_job to this estimate =====
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [pendingLinkJob, setPendingLinkJob] = useState<any | null>(null);

  // Auto-match a job by the estimate's WorkEdge project id
  const { data: autoMatchJobs = [] } = useQuery({
    queryKey: ['estimate-autolink-jobs', workedgeProjectId],
    queryFn: async () => {
      if (!workedgeProjectId) return [];
      const { data } = await supabase
        .from('crm_jobs')
        .select('id, job_number, title, source_estimate_id, customer_id')
        .eq('workedge_project_id', workedgeProjectId)
        .is('deleted_at', null);
      return data || [];
    },
    enabled: entityType === 'estimate' && !!workedgeProjectId,
  });

  // Manual picker — search existing jobs
  const { data: pickerJobs = [] } = useQuery({
    queryKey: ['estimate-link-job-picker', customerId, showAllJobs, jobSearch],
    queryFn: async () => {
      let q = supabase
        .from('crm_jobs')
        .select('id, job_number, title, source_estimate_id, customer_id, customer:crm_customers(first_name, last_name, company_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (customerId && !showAllJobs) q = q.eq('customer_id', customerId);
      if (jobSearch.trim()) {
        const s = `%${jobSearch.trim()}%`;
        q = q.or(`job_number.ilike.${s},title.ilike.${s}`);
      }
      const { data } = await q;
      return data || [];
    },
    enabled: entityType === 'estimate' && jobPickerOpen,
  });

  const linkJobToEstimateMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ source_estimate_id: entityId })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['linked-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['crm_job'] });
      queryClient.invalidateQueries({ queryKey: ['estimate-autolink-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['estimate-link-job-picker'] });
      setPendingLinkJob(null);
      setJobPickerOpen(false);
      setJobSearch('');
      toast.success('Job linked to estimate');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unlinkJobFromEstimateMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ source_estimate_id: null })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['linked-estimate'] });
      queryClient.invalidateQueries({ queryKey: ['crm_job'] });
      toast.success('Job unlinked');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const requestLinkJob = (job: any) => {
    setPendingLinkJob(job);
  };


  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  // JOB DETAIL VIEW
  if (entityType === 'job') {
    const hasLinks = linkedEstimate || linkedPipeline;
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Linked Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Linked Estimate */}
          {linkedEstimate ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <Link to={`/admin/estimates/${linkedEstimate.id}`} className="text-sm font-medium hover:text-primary truncate block">
                    {linkedEstimate.estimate_number}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{linkedEstimate.title || 'Untitled'} · {formatCurrency(linkedEstimate.grand_total)}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => linkMutation.mutate({ field: 'source_estimate_id', value: null })}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {linkingType === 'estimate' ? (
                <Select onValueChange={(v) => { linkMutation.mutate({ field: 'source_estimate_id', value: v }); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select estimate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEstimates.map(est => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.estimate_number} — {formatCurrency(est.grand_total)}
                      </SelectItem>
                    ))}
                    {availableEstimates.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No estimates found</div>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setLinkingType('estimate')}>
                  <FileText className="h-3 w-3 mr-1" /> Link Estimate
                </Button>
              )}
            </div>
          )}

          {/* Linked Pipeline */}
          {linkedPipeline ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 min-w-0">
                <Kanban className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <Link to="/admin/pipeline" className="text-sm font-medium hover:text-primary block">
                    Pipeline Entry
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {linkedPipeline.stage && (
                      <Badge variant="outline" className="text-[10px] px-1.5 h-4" style={{ borderColor: linkedPipeline.stage.color, color: linkedPipeline.stage.color }}>
                        {linkedPipeline.stage.display_name}
                      </Badge>
                    )}
                    {linkedPipeline.estimated_value && (
                      <span className="text-xs text-muted-foreground">{formatCurrency(linkedPipeline.estimated_value)}</span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => linkMutation.mutate({ field: 'source_pipeline_id', value: null })}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {linkingType === 'pipeline' ? (
                <Select onValueChange={(v) => { linkMutation.mutate({ field: 'source_pipeline_id', value: v }); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select pipeline entry..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePipelineEntries.map((entry: any) => {
                      const name = entry.customer?.company_name || `${entry.customer?.first_name || ''} ${entry.customer?.last_name || ''}`.trim();
                      return (
                        <SelectItem key={entry.id} value={entry.id}>
                          {name} {entry.estimated_value ? `— ${formatCurrency(entry.estimated_value)}` : ''}
                        </SelectItem>
                      );
                    })}
                    {availablePipelineEntries.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No entries found</div>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setLinkingType('pipeline')}>
                  <Kanban className="h-3 w-3 mr-1" /> Link Pipeline Entry
                </Button>
              )}
            </div>
          )}

          {!hasLinks && !linkingType && (
            <p className="text-xs text-muted-foreground text-center">No linked records</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ESTIMATE / PIPELINE VIEW — show linked jobs
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <LinkIcon className="h-4 w-4" /> Linked Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {linkedJobs.length > 0 ? (
          linkedJobs.map((job: any) => (
            <div key={job.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <Link to={`/admin/jobs/${job.id}`} className="text-sm font-medium hover:text-primary truncate block">
                    {job.job_number}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{job.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {job.current_stage && (
                  <Badge variant="outline" className="text-[10px] px-1.5 h-4" style={{ borderColor: job.current_stage.color, color: job.current_stage.color }}>
                    {job.current_stage.name}
                  </Badge>
                )}
                {entityType === 'estimate' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Unlink job"
                    onClick={() => {
                      if (confirm(`Unlink ${job.job_number} from this estimate?`)) {
                        unlinkJobFromEstimateMutation.mutate(job.id);
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center">No linked jobs</p>
        )}

        {/* Estimate-side: Link Job affordance when none linked */}
        {entityType === 'estimate' && linkedJobs.length === 0 && (
          <div className="space-y-2">
            {autoMatchJobs.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {autoMatchJobs.length === 1 ? 'Suggested match (WorkEdge)' : 'WorkEdge matches'}
                </p>
                {autoMatchJobs.map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-dashed">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{job.job_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.title}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="h-7 text-xs shrink-0" onClick={() => requestLinkJob(job)}>
                      <LinkIcon className="h-3 w-3 mr-1" /> Link
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!jobPickerOpen ? (
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setJobPickerOpen(true)}>
                <Briefcase className="h-3 w-3 mr-1" /> Link a {autoMatchJobs.length > 0 ? 'different ' : ''}job
              </Button>
            ) : (
              <div className="space-y-2 p-2 border rounded-lg">
                <div className="flex items-center gap-1">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <Input
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Search job # or title..."
                    className="h-7 text-xs"
                  />
                </div>
                {customerId && (
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={showAllJobs}
                      onChange={(e) => setShowAllJobs(e.target.checked)}
                    />
                    Search all customers
                  </label>
                )}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {pickerJobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No CRM job found for this estimate. Jobs are created from WorkEdge sync or the Jobs Board — create the job there first, then link it.
                    </p>
                  ) : (
                    pickerJobs.map((job: any) => {
                      const cust = job.customer;
                      const custName = cust ? (cust.company_name || `${cust.first_name || ''} ${cust.last_name || ''}`.trim()) : '';
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => requestLinkJob(job)}
                          className="w-full text-left p-1.5 rounded hover:bg-accent text-xs"
                        >
                          <div className="font-medium">{job.job_number}</div>
                          <div className="text-muted-foreground truncate">
                            {job.title}{custName ? ` · ${custName}` : ''}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => { setJobPickerOpen(false); setJobSearch(''); }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* For pipeline view: also show linked estimates */}
        {entityType === 'pipeline' && linkedEstimatesViaJobs.length > 0 && (
          <>
            <div className="border-t my-2" />
            {linkedEstimatesViaJobs.map((est: any) => (
              <div key={est.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <Link to={`/admin/estimates/${est.id}`} className="text-sm font-medium hover:text-primary truncate block">
                      {est.estimate_number}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">{formatCurrency(est.grand_total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>

      {/* Confirm link (with overwrite warning if already linked elsewhere) */}
      <AlertDialog open={!!pendingLinkJob} onOpenChange={(o) => !o && setPendingLinkJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingLinkJob?.source_estimate_id && pendingLinkJob.source_estimate_id !== entityId
                ? 'Re-link this job?'
                : 'Link this job to the estimate?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLinkJob && (
                <>
                  Job <strong>{pendingLinkJob.job_number}</strong>
                  {pendingLinkJob.title ? ` — ${pendingLinkJob.title}` : ''}.
                  {pendingLinkJob.source_estimate_id && pendingLinkJob.source_estimate_id !== entityId && (
                    <> This job is already linked to another estimate. Continuing will overwrite that link.</>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingLinkJob && linkJobToEstimateMutation.mutate(pendingLinkJob.id)}>
              {pendingLinkJob?.source_estimate_id && pendingLinkJob.source_estimate_id !== entityId ? 'Re-link' : 'Link'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
