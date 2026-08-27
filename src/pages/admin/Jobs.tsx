import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, LayoutGrid, List, MoreHorizontal, Eye, Pencil, Trash2, Calendar, DollarSign, User, Wrench, HardHat, Home, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import JobFormDialog from '@/components/admin/jobs/JobFormDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { DroppableStageColumn } from '@/components/admin/jobs/DroppableStageColumn';
import { JobsBoardStats } from '@/components/admin/jobs/JobsBoardStats';

interface Job {
  id: string;
  job_number: string;
  title: string;
  priority: string;
  payment_status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  quoted_amount: number | null;
  final_amount: number | null;
  created_at: string;
  job_type: {
    id: string;
    name: string;
    category: string;
    color: string;
    slug: string;
  };
  current_stage: {
    id: string;
    name: string;
    stage_type: string;
    color: string;
  } | null;
  customer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
  };
  location: {
    id: string;
    address_line1: string;
    city: string;
  } | null;
}

interface JobType {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
}

interface JobStage {
  id: string;
  job_type_id: string;
  name: string;
  stage_type: string;
  color: string;
  sort_order: number;
}

const BOARD_CATEGORIES = [
  { key: 'service', label: 'Service', icon: Wrench, slugPattern: 'service-call' },
  { key: 'install', label: 'Install', icon: HardHat, slugPattern: 'installation' },
] as const;

export default function Jobs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategoryType, setFilterCategoryType] = useState<'all' | 'residential' | 'commercial'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [activeMobileStage, setActiveMobileStage] = useState<string>('');
  const { isAdmin } = useUserRole();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveJobId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveJobId(null);
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    const targetColumnId = over.id as string;

    // Check if dropped on a stage column
    const targetColumn = boardStages.find(s => s.id === targetColumnId);
    if (!targetColumn) return;

    const job = filteredJobs.find(j => j.id === jobId);
    if (!job) return;
    
    // Already in this column?
    if (targetColumn.stageIds.includes(job.current_stage?.id || '')) return;

    // Find the correct stage ID for this job's job type
    const jobTypeId = job.job_type?.id;
    const matchingStageId = allStages.find(
      s => s.name === targetColumn.name && s.job_type_id === jobTypeId
    )?.id;
    
    if (matchingStageId) {
      moveJobMutation.mutate({ jobId, stageId: matchingStageId });
    }
  };

  // Board type from URL or default. Accepts either a board key ('service' /
  // 'install') or a full job-type slug (e.g. 'residential-installation',
  // as linked from JobTypeBoardPreview's "View All") — matches by
  // slugPattern substring when there's no exact key match, instead of
  // silently falling through to an unrecognized key and rendering an empty
  // board.
  const resolveBoardKey = (urlType: string | null): string => {
    if (!urlType) return BOARD_CATEGORIES[0].key;
    const exact = BOARD_CATEGORIES.find(b => b.key === urlType);
    if (exact) return exact.key;
    const bySlug = BOARD_CATEGORIES.find(b => urlType.includes(b.slugPattern));
    return bySlug ? bySlug.key : BOARD_CATEGORIES[0].key;
  };

  const [activeBoardKey, setActiveBoardKey] = useState<string>(
    resolveBoardKey(searchParams.get('type'))
  );

  // Sync URL param
  useEffect(() => {
    const urlType = searchParams.get('type');
    if (urlType) {
      setActiveBoardKey(resolveBoardKey(urlType));
    }
  }, [searchParams]);

  const handleBoardChange = (key: string) => {
    setActiveBoardKey(key);
    setSearchParams({ type: key });
    setActiveMobileStage('');
  };

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['crm_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select(`
          *,
          job_type:crm_job_types(id, name, slug, category, color),
          current_stage:crm_job_stages(id, name, stage_type, color),
          customer:crm_customers(id, first_name, last_name, company_name),
          location:crm_locations(id, address_line1, city)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Job[];
    }
  });

  const { data: jobTypes = [] } = useQuery({
    queryKey: ['crm_job_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as JobType[];
    }
  });

  const { data: allStages = [] } = useQuery({
    queryKey: ['crm_job_stages_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as JobStage[];
    }
  });

  const moveJobMutation = useMutation({
    mutationFn: async ({ jobId, stageId }: { jobId: string; stageId: string }) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ current_stage_id: stageId })
        .eq('id', jobId);
      if (error) throw error;
      await supabase.from('crm_job_stage_history').insert({
        job_id: jobId,
        to_stage_id: stageId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_jobs'] });
      toast.success('Job moved');
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_jobs'] });
      toast.success('Job deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete job: ' + error.message);
    }
  });

  // Get the active board category
  const activeCategory = BOARD_CATEGORIES.find(c => c.key === activeBoardKey);

  // Get all job types matching this category
  const activeBoardJobTypes = useMemo(() => {
    if (!activeCategory) return [];
    let types = jobTypes.filter(jt => jt.slug.includes(activeCategory.slugPattern));
    if (filterCategoryType !== 'all') {
      types = types.filter(jt => jt.category === filterCategoryType);
    }
    return types;
  }, [jobTypes, activeCategory, filterCategoryType]);

  const activeBoardJobTypeIds = useMemo(() => new Set(activeBoardJobTypes.map(jt => jt.id)), [activeBoardJobTypes]);

  // Get stages for the active board, merging by name across job types
  const boardStages = useMemo(() => {
    if (activeBoardJobTypes.length === 0) return [];
    const typeIds = new Set(activeBoardJobTypes.map(jt => jt.id));
    const relevantStages = allStages
      .filter(s => typeIds.has(s.job_type_id) && s.stage_type !== 'cancelled' && s.stage_type !== 'closed_won');
    
    // Merge stages with the same name - keep the first occurrence for display, track all IDs
    const merged: (JobStage & { stageIds: string[] })[] = [];
    const seen = new Map<string, number>();
    for (const s of relevantStages) {
      const idx = seen.get(s.name);
      if (idx !== undefined) {
        merged[idx].stageIds.push(s.id);
      } else {
        seen.set(s.name, merged.length);
        merged.push({ ...s, stageIds: [s.id] });
      }
    }
    return merged.sort((a, b) => a.sort_order - b.sort_order);
  }, [allStages, activeBoardJobTypes]);

  // Set default mobile stage when board changes
  useEffect(() => {
    if (boardStages.length > 0 && !activeMobileStage) {
      setActiveMobileStage(boardStages[0].id);
    }
  }, [boardStages, activeMobileStage]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = searchQuery === '' || 
        job.job_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customer?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customer?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'all' || job.priority === filterPriority;

      // In list view, use the filter dropdown; in kanban, use the board toggle
      if (viewMode === 'list') {
        const matchesType = filterJobType === 'all' || job.job_type?.id === filterJobType;
        return matchesSearch && matchesType && matchesPriority;
      } else {
        // Kanban: filter to active board's job types
        const matchesBoard = activeBoardJobTypeIds.size > 0 ? activeBoardJobTypeIds.has(job.job_type?.id) : true;
        return matchesSearch && matchesBoard && matchesPriority;
      }
    });
  }, [jobs, searchQuery, filterJobType, filterPriority, viewMode, activeBoardJobTypeIds]);

  // Kanban columns based on actual stages
  const kanbanColumns = useMemo(() => {
    return boardStages.map(stage => ({
      stage,
      jobs: filteredJobs.filter(job => job.current_stage && stage.stageIds.includes(job.current_stage.id))
    }));
  }, [filteredJobs, boardStages]);

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-500/10 text-slate-600',
    normal: 'bg-blue-500/10 text-blue-600',
    high: 'bg-orange-500/10 text-orange-600',
    urgent: 'bg-red-500/10 text-red-600'
  };

  const getCustomerName = (job: Job) => {
    if (job.customer?.company_name) return job.customer.company_name;
    return `${job.customer?.first_name || ''} ${job.customer?.last_name || ''}`.trim() || 'Unknown';
  };

  const activeMobileJobs = kanbanColumns.find(c => c.stage.id === activeMobileStage)?.jobs || [];

  return (
    <AdminLayout title="Jobs Board">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Jobs Board</h1>
            <p className="text-sm text-muted-foreground hidden md:block">Track and manage all jobs through their workflow</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingJob(null)} className="hidden md:inline-flex">
                <Plus className="h-4 w-4 mr-2" /> New Job
              </Button>
            </DialogTrigger>
            <JobFormDialog
              editingJob={editingJob}
              jobTypes={jobTypes}
              allStages={allStages}
              onClose={() => { setIsFormOpen(false); setEditingJob(null); }}
            />
          </Dialog>
        </div>

        {/* Stats Dashboard - always visible, only open/active jobs */}
        <JobsBoardStats jobs={jobs.filter(j => j.current_stage?.stage_type !== 'cancelled' && j.current_stage?.stage_type !== 'closed_won')} />

        {/* Board Type Toggle + Category Filter (kanban mode only) */}
        {viewMode === 'kanban' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
              {BOARD_CATEGORIES.map(bt => {
                const Icon = bt.icon;
                const isActive = activeBoardKey === bt.key;
                return (
                  <Button
                    key={bt.key}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleBoardChange(bt.key)}
                    className="gap-1.5"
                  >
                    <Icon className="h-4 w-4" />
                    {bt.label}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
              {[
                { key: 'all' as const, label: 'All', icon: null },
                { key: 'residential' as const, label: 'Residential', icon: Home },
                { key: 'commercial' as const, label: 'Commercial', icon: Building2 },
              ].map(opt => {
                const isActive = filterCategoryType === opt.key;
                return (
                  <Button
                    key={opt.key}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterCategoryType(opt.key)}
                    className="gap-1.5"
                  >
                    {opt.icon && <opt.icon className="h-3.5 w-3.5" />}
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3 md:gap-4">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Job type filter only visible in list view */}
            {viewMode === 'list' && (
              <Select value={filterJobType} onValueChange={setFilterJobType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {jobTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden md:flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading jobs...</p>
        ) : isMobile ? (
          /* ===== MOBILE: Tabbed single-column layout ===== */
          <div className="space-y-3">
            {/* Board type toggle for mobile */}
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
              {BOARD_CATEGORIES.map(bt => {
                const Icon = bt.icon;
                const isActive = activeBoardKey === bt.key;
                return (
                  <Button
                    key={bt.key}
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleBoardChange(bt.key)}
                    className="gap-1.5 flex-1"
                  >
                    <Icon className="h-4 w-4" />
                    {bt.label}
                  </Button>
                );
              })}
            </div>

            {/* Category filter for mobile */}
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'residential' as const, label: 'Res' },
                { key: 'commercial' as const, label: 'Com' },
              ].map(opt => (
                <Button
                  key={opt.key}
                  variant={filterCategoryType === opt.key ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterCategoryType(opt.key)}
                  className="flex-1"
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* Stage pill tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sticky top-0 z-10 bg-background -mx-4 px-4 py-2">
              {kanbanColumns.map(column => (
                <button
                  key={column.stage.id}
                  onClick={() => setActiveMobileStage(column.stage.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0",
                    activeMobileStage === column.stage.id
                      ? "text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  style={activeMobileStage === column.stage.id ? { backgroundColor: column.stage.color || '#3B82F6' } : undefined}
                >
                  {column.stage.name}
                  <span className={cn(
                    "inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-xs font-semibold",
                    activeMobileStage === column.stage.id
                      ? "bg-white/25 text-white"
                      : "bg-background text-foreground"
                  )}>
                    {column.jobs.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Mobile job cards */}
            <div className="space-y-2">
              {activeMobileJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No jobs in this stage
                </div>
              ) : (
                activeMobileJobs.map(job => (
                  <Card
                    key={job.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: job.current_stage?.color || '#3B82F6' }}
                    onClick={() => navigate(`/admin/jobs/${job.id}`)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                          <span className="font-mono">{job.job_number}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="truncate">{job.job_type?.name}</span>
                        </div>
                        <Badge className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", priorityColors[job.priority])}>
                          {job.priority}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-sm mt-1">{job.title}</h4>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{getCustomerName(job)}</span>
                        </div>
                        {job.quoted_amount ? (
                          <span className="text-xs font-medium">${job.quoted_amount.toLocaleString()}</span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          /* ===== DESKTOP: Kanban View with drag-and-drop ===== */
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-h-[600px]" style={{ minWidth: `${kanbanColumns.length * 260}px` }}>
                {kanbanColumns.map(column => (
                  <DroppableStageColumn
                    key={column.stage.id}
                    stage={column.stage}
                    jobs={column.jobs}
                  />
                ))}
              </div>
            </div>
          </DndContext>
        ) : (
          /* ===== List View - shows ALL job types ===== */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map(job => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => navigate(`/admin/jobs/${job.id}`)}>
                      <TableCell className="font-mono text-sm">{job.job_number}</TableCell>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{getCustomerName(job)}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: job.job_type?.color + '20', color: job.job_type?.color }}>
                          {job.job_type?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.current_stage && (
                          <Badge variant="outline" style={{ borderColor: job.current_stage.color, color: job.current_stage.color }}>
                            {job.current_stage.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[job.priority]}>{job.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        {job.scheduled_start ? format(new Date(job.scheduled_start), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {job.quoted_amount ? `$${job.quoted_amount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/jobs/${job.id}`); }}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingJob(job); setIsFormOpen(true); }}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteJobMutation.mutate(job.id); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Mobile FAB for New Job */}
      {isMobile && (
        <button
          onClick={() => { setEditingJob(null); setIsFormOpen(true); }}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#1e3a5f]/90 flex items-center justify-center transition-colors"
          aria-label="New Job"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </AdminLayout>
  );
}
