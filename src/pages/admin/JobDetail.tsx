import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, DollarSign, MapPin, User, Phone, Mail, ChevronRight, Users, Pencil, ExternalLink, Save, Copy, Trash2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkEdgePanel } from '@/components/admin/jobs/WorkEdgePanel';
import JobAppointmentsCard from '@/components/admin/jobs/JobAppointmentsCard';
import JobFormDialog from '@/components/admin/jobs/JobFormDialog';
import { AIAssistantWidget } from '@/components/admin/ai/AIAssistantWidget';
import { useUserRole } from '@/hooks/useUserRole';
import JobTasksCard from '@/components/admin/jobs/JobTasksCard';
import { LinkedRecordsCard } from '@/components/admin/shared/LinkedRecordsCard';
import MaterialJobListsCard from '@/components/admin/jobs/MaterialJobListsCard';


const InlineEditableAmount = ({ value, jobId, field, label }: { value: number | null; jobId: string; field: string; label: string }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (newValue: number) => {
      const { error } = await supabase.from('crm_jobs').update({ [field]: newValue } as any).eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', jobId] });
      toast.success(`${label} updated`);
      setEditing(false);
    },
    onError: () => toast.error('Failed to update'),
  });

  const startEdit = () => {
    setEditValue(String(value || 0));
    setEditing(true);
  };

  const handleSave = () => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount'); return; }
    saveMutation.mutate(num);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="pl-7 text-lg font-bold"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            />
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 group cursor-pointer" onClick={startEdit}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold flex items-center gap-1">
        <DollarSign className="h-5 w-5" />
        {value?.toLocaleString() || '0'}
        <Pencil className="h-3.5 w-3.5 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </p>
    </div>
  );
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneWithAppointments, setCloneWithAppointments] = useState(true);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const { isSuperAdmin, isAdmin } = useUserRole();

  const { data: job, isLoading } = useQuery({
    queryKey: ['crm_job', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select(`
          *,
          job_type:crm_job_types(*),
          current_stage:crm_job_stages(*),
          customer:crm_customers(*),
          location:crm_locations(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['crm_job_stages', job?.job_type?.id],
    queryFn: async () => {
      if (!job?.job_type?.id) return [];
      const { data, error } = await supabase
        .from('crm_job_stages')
        .select('*')
        .eq('job_type_id', job.job_type.id)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!job?.job_type?.id
  });

  const { data: stageHistory = [] } = useQuery({
    queryKey: ['crm_job_stage_history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_stage_history')
        .select(`
          *,
          from_stage:crm_job_stages!crm_job_stage_history_from_stage_id_fkey(name, color),
          to_stage:crm_job_stages!crm_job_stage_history_to_stage_id_fkey(name, color)
        `)
        .eq('job_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['crm_job_assignments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_assignments')
        .select(`
          *,
          team:crm_teams(id, name, color),
          member:crm_team_members(id, first_name, last_name, role)
        `)
        .eq('job_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['crm_teams_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_teams')
        .select('*, assignments:crm_team_assignments(*, member:crm_team_members(*))')
        .eq('is_active', true);
      if (error) throw error;
      return data;
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
      return data;
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
      return data;
    }
  });

  const moveToStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ current_stage_id: stageId })
        .eq('id', id);
      if (error) throw error;

      await supabase.from('crm_job_stage_history').insert({
        job_id: id,
        from_stage_id: job?.current_stage?.id,
        to_stage_id: stageId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', id] });
      queryClient.invalidateQueries({ queryKey: ['crm_job_stage_history', id] });
      queryClient.invalidateQueries({ queryKey: ['crm_jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-jobs-preview'] });
      toast.success('Job moved to new stage');
    }
  });

  const assignTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from('crm_job_assignments').insert({
        job_id: id,
        team_id: teamId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job_assignments', id] });
      toast.success('Team assigned');
    }
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('crm_jobs')
        .update({ payment_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', id] });
      toast.success('Payment status updated');
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: { internal_notes: string | null; customer_notes: string | null }) => {
      const { error } = await supabase.from('crm_jobs').update(notes).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', id] });
      toast.success('Notes saved');
    },
    onError: (error) => toast.error('Failed to save notes: ' + error.message)
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase.from('crm_jobs').update({ location_id: locationId }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', id] });
      toast.success('Job location updated');
    },
    onError: (error) => toast.error('Failed to update location: ' + error.message)
  });

  const cloneJobMutation = useMutation({
    mutationFn: async (includeAppointments: boolean) => {
      if (!job) throw new Error('No job data');

      // Get initial stage for job type
      const { data: firstStage } = await supabase
        .from('crm_job_stages')
        .select('id')
        .eq('job_type_id', job.job_type_id)
        .eq('is_active', true)
        .order('sort_order')
        .limit(1)
        .single();

      // Generate job number
      const { data: latestJob } = await supabase
        .from('crm_jobs')
        .select('job_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      const lastNum = latestJob?.job_number ? parseInt(latestJob.job_number.replace(/\D/g, '')) : 0;
      const newJobNumber = `JOB-${String(lastNum + 1).padStart(4, '0')}`;

      const { data: newJob, error: insertError } = await supabase
        .from('crm_jobs')
        .insert({
          title: `${job.title} (Copy)`,
          job_type_id: job.job_type_id,
          customer_id: job.customer_id,
          location_id: job.location_id,
          priority: job.priority,
          scheduled_date: job.scheduled_date,
          scheduled_end_date: job.scheduled_end_date,
          quoted_amount: job.quoted_amount,
          internal_notes: job.internal_notes,
          customer_notes: job.customer_notes,
          current_stage_id: firstStage?.id || null,
          payment_status: 'no_charge_yet',
          job_number: newJobNumber,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;

      if (includeAppointments) {
        const { data: appointments } = await supabase
          .from('crm_job_appointments')
          .select('id, title, start_datetime, end_datetime, assigned_team_id, attendee_member_ids, notes, google_calendar_id')
          .eq('job_id', job.id);

        if (appointments && appointments.length > 0) {
          for (const apt of appointments) {
            // Create cloned appointment
            const { data: newApt, error: aptError } = await supabase
              .from('crm_job_appointments')
              .insert({
                job_id: newJob.id,
                title: apt.title,
                start_datetime: apt.start_datetime,
                end_datetime: apt.end_datetime,
                assigned_team_id: apt.assigned_team_id,
                attendee_member_ids: apt.attendee_member_ids,
                notes: apt.notes,
                google_calendar_id: apt.google_calendar_id,
                google_calendar_event_id: null,
              })
              .select('id')
              .single();
            if (aptError) throw aptError;

            // Clone junction rows without event IDs
            const { data: calLinks } = await supabase
              .from('crm_job_appointment_calendars')
              .select('google_calendar_db_id')
              .eq('appointment_id', apt.id);

            if (calLinks && calLinks.length > 0 && newApt) {
              await supabase
                .from('crm_job_appointment_calendars')
                .insert(calLinks.map(link => ({
                  appointment_id: newApt.id,
                  google_calendar_db_id: link.google_calendar_db_id,
                  google_calendar_event_id: null,
                })));
            }
          }
        }
      }

      return newJob.id;
    },
    onSuccess: (newJobId) => {
      toast.success('Job cloned successfully');
      setCloneDialogOpen(false);
      navigate(`/admin/jobs/${newJobId}`);
    },
    onError: (error: any) => {
      toast.error(`Clone failed: ${error.message}`);
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: async () => {
      // Soft delete
      const { data, error, count } = await supabase
        .from('crm_jobs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      console.log('Delete job result:', { data, error, count, id });
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No rows were updated. You may not have permission to delete this job.');
      }
    },
    onSuccess: () => {
      toast.success('Job deleted successfully');
      setDeleteStep(0);
      queryClient.invalidateQueries({ queryKey: ['crm_jobs'] });
      navigate('/admin/jobs');
    },
    onError: (error: any) => {
      toast.error(`Delete failed: ${error.message}`);
    }
  });

  const { data: customerLocations = [] } = useQuery({
    queryKey: ['crm_locations_for_customer', job?.customer_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_locations')
        .select('id, address_line1, city, state, zip_code, is_primary')
        .eq('customer_id', job!.customer_id)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!job?.customer_id
  });

  useEffect(() => {
    if (job) {
      setInternalNotes(job.internal_notes || '');
      setCustomerNotes(job.customer_notes || '');
    }
  }, [job]);

  const notesChanged = job && (internalNotes !== (job.internal_notes || '') || customerNotes !== (job.customer_notes || ''));

  if (isLoading) {
    return (
      <AdminLayout title="Job Details">
        <p className="text-muted-foreground">Loading job...</p>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout title="Job Details">
        <p className="text-muted-foreground">Job not found</p>
      </AdminLayout>
    );
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-500/10 text-slate-600',
    normal: 'bg-blue-500/10 text-blue-600',
    high: 'bg-orange-500/10 text-orange-600',
    urgent: 'bg-red-500/10 text-red-600'
  };

  const paymentStatusColors: Record<string, string> = {
    no_charge_yet: 'bg-gray-500/10 text-gray-600',
    pending: 'bg-yellow-500/10 text-yellow-600',
    deposit_received: 'bg-blue-500/10 text-blue-600',
    partial: 'bg-purple-500/10 text-purple-600',
    paid: 'bg-green-500/10 text-green-600',
    refunded: 'bg-red-500/10 text-red-600',
    not_charging: 'bg-orange-500/10 text-orange-600',
  };

  const currentStageIndex = stages.findIndex(s => s.id === job.current_stage?.id);

  return (
    <AdminLayout title={`Job ${job.job_number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/jobs')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-mono">{job.job_number}</span>
                <Badge className={priorityColors[job.priority]}>{job.priority}</Badge>
                <Badge style={{ backgroundColor: job.job_type?.color + '20', color: job.job_type?.color }}>
                  {job.job_type?.name}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold mt-1">{job.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {job.workedge_project_id && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://workedge.pro/projects/${job.workedge_project_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  WorkEdge
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={() => setCloneDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Clone Job
            </Button>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Job
            </Button>
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteStep(1)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <AIAssistantWidget 
              jobId={job.id} 
              jobTitle={job.title}
            />
          </div>
        </div>

        {/* Stage Progress Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {stages.map((stage, index) => {
                const isCurrent = stage.id === job.current_stage?.id;
                const isPast = index < currentStageIndex;
                const isCancelled = stage.stage_type === 'cancelled';
                
                return (
                  <div key={stage.id} className="flex items-center">
                    <button
                      onClick={() => !isCurrent && moveToStageMutation.mutate(stage.id)}
                      disabled={isCurrent}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                        isCurrent && "ring-2 ring-offset-2",
                        isPast && "opacity-60",
                        isCancelled && "border-dashed"
                      )}
                      style={{
                        backgroundColor: isCurrent ? stage.color : stage.color + '20',
                        color: isCurrent ? 'white' : stage.color,
                        borderColor: stage.color
                      }}
                    >
                      {stage.name}
                    </button>
                    {index < stages.length - 1 && !isCancelled && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Material Job Lists */}
        <MaterialJobListsCard
          jobId={job.id}
          customerId={job.customer_id}
          sourceEstimateId={job.source_estimate_id}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Location */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer & Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {job.customer?.company_name || `${job.customer?.first_name} ${job.customer?.last_name}`}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      {job.customer?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {job.customer.phone}
                        </span>
                      )}
                      {job.customer?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {job.customer.email}
                        </span>
                      )}
                    </div>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm"
                      onClick={() => navigate(`/admin/customers/${job.customer?.id}`)}
                    >
                      View Customer Profile →
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {job.location ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.location.address_line1}, ${job.location.city}, ${job.location.state} ${job.location.zip_code}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <h4 className="font-medium flex items-center gap-1">
                          {job.location.address_line1}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {job.location.city}, {job.location.state} {job.location.zip_code}
                        </p>
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">No location assigned</p>
                    )}
                    {customerLocations.length > 0 && (
                      <Select
                        value={job.location_id || ''}
                        onValueChange={(v) => updateLocationMutation.mutate(v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Change location..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customerLocations.map((loc: any) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.address_line1}, {loc.city} {loc.zip_code}
                              {loc.is_primary ? ' (Primary)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Scheduled Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {(job as any).scheduled_date 
                      ? format(new Date((job as any).scheduled_date + 'T00:00:00'), 'PPP') 
                      : job.scheduled_start 
                        ? format(new Date(job.scheduled_start), 'PPP')
                        : 'Not scheduled'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {(job as any).scheduled_end_date 
                      ? format(new Date((job as any).scheduled_end_date + 'T00:00:00'), 'PPP') 
                      : job.scheduled_end
                        ? format(new Date(job.scheduled_end), 'PPP')
                        : 'Not set'}
                  </p>
                </div>
                {(job.actual_start || job.actual_end) && (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Actual Start</p>
                      <p className="font-medium">
                        {job.actual_start ? format(new Date(job.actual_start), 'PPP p') : '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Actual End</p>
                      <p className="font-medium">
                        {job.actual_end ? format(new Date(job.actual_end), 'PPP p') : '-'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Notes</CardTitle>
                {notesChanged && (
                  <Button
                    size="sm"
                    onClick={() => updateNotesMutation.mutate({
                      internal_notes: internalNotes || null,
                      customer_notes: customerNotes || null
                    })}
                    disabled={updateNotesMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Internal Notes</p>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add internal notes..."
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Customer Notes</p>
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Add customer-facing notes..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stage History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {stageHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No stage changes recorded yet</p>
                ) : (
                  <div className="space-y-4">
                    {stageHistory.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full mt-2 bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm">
                            Moved to <Badge variant="outline" style={{ borderColor: entry.to_stage?.color, color: entry.to_stage?.color }}>{entry.to_stage?.name}</Badge>
                            {entry.from_stage && (
                              <> from <Badge variant="outline">{entry.from_stage?.name}</Badge></>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(entry.created_at), 'PPP p')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InlineEditableAmount
                  value={job.quoted_amount}
                  jobId={job.id}
                  field="quoted_amount"
                  label="Quoted Amount"
                />
                {job.final_amount && job.final_amount !== job.quoted_amount && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Final Amount</p>
                    <p className="text-xl font-semibold">${job.final_amount.toLocaleString()}</p>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <Select
                    value={job.payment_status}
                    onValueChange={(v) => updatePaymentStatusMutation.mutate(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_charge_yet">No Charge Yet</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="deposit_received">Deposit Received</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="not_charging">Not Charging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Crew Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" /> Assigned Crew
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No crew assigned</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
                        {assignment.team && (
                          <Badge style={{ backgroundColor: assignment.team.color + '20', color: assignment.team.color }}>
                            {assignment.team.name}
                          </Badge>
                        )}
                        {assignment.member && (
                          <span className="text-sm">
                            {assignment.member.first_name} {assignment.member.last_name}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Select onValueChange={(v) => assignTeamMutation.mutate(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Linked Records */}
            <LinkedRecordsCard
              entityType="job"
              entityId={job.id}
              customerId={job.customer_id}
              sourceEstimateId={job.source_estimate_id}
              sourcePipelineId={job.source_pipeline_id}
            />

            {/* Job Tasks */}
            <JobTasksCard jobId={job.id} />

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(job.created_at), 'PPP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(new Date(job.updated_at), 'PPP')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="capitalize">{job.job_type?.category}</span>
                </div>
                {job.job_type?.requires_permit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Permit Required</span>
                    <Badge variant="outline">Yes</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar Appointments */}
            <JobAppointmentsCard
              jobId={job.id}
              jobNumber={job.job_number}
              jobTitle={job.title}
              customerName={job.customer?.company_name || `${job.customer?.first_name || ''} ${job.customer?.last_name || ''}`.trim() || 'Unknown'}
              customerPhone={job.customer?.phone}
              location={job.location ? `${job.location.address_line1}, ${job.location.city}, ${job.location.state} ${job.location.zip_code}` : null}
            />

            {/* WorkEdge Panel */}
            <WorkEdgePanel jobId={job.id} workedgeProjectId={job.workedge_project_id} jobNumber={job.job_number} jobTitle={job.title} />
          </div>
        </div>
      </div>

      {/* Edit Job Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <JobFormDialog
          editingJob={job}
          jobTypes={jobTypes}
          allStages={allStages}
          onClose={() => {
            setIsEditOpen(false);
            queryClient.invalidateQueries({ queryKey: ['crm_job', id] });
          }}
        />
      </Dialog>

      {/* Clone Job Dialog */}
      <AlertDialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone Job</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a duplicate of "{job.title}" with a fresh job number, reset workflow stage, and no WorkEdge link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox 
              id="clone-appointments" 
              checked={cloneWithAppointments}
              onCheckedChange={(checked) => setCloneWithAppointments(checked === true)}
            />
            <label htmlFor="clone-appointments" className="text-sm font-medium leading-none cursor-pointer">
              Include calendar appointments (un-synced copies)
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cloneJobMutation.mutate(cloneWithAppointments)}
              disabled={cloneJobMutation.isPending}
            >
              {cloneJobMutation.isPending ? 'Cloning...' : 'Clone Job'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Job - Step 1 */}
      <AlertDialog open={deleteStep === 1} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job {job.job_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the job "{job.title}" and all associated data from the active job board. This action can only be undone by a super admin via the trash bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setDeleteStep(2)}
            >
              Yes, I want to delete this job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Job - Step 2 (Final Confirmation) */}
      <AlertDialog open={deleteStep === 2} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Final Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to delete job <strong className="text-foreground">{job.job_number}</strong>? This is your last chance to cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep this job</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteJobMutation.mutate()}
              disabled={deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
