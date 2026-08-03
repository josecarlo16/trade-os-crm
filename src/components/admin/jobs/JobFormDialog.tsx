import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface JobType {
  id: string;
  name: string;
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

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
}

interface Location {
  id: string;
  customer_id: string;
  address_line1: string;
  city: string;
}

interface JobFormDialogProps {
  editingJob: any | null;
  jobTypes: JobType[];
  allStages: JobStage[];
  onClose: () => void;
}

export default function JobFormDialog({ editingJob, jobTypes, allStages, onClose }: JobFormDialogProps) {
  const queryClient = useQueryClient();
  const [customerOpen, setCustomerOpen] = useState(false);
  const [formData, setFormData] = useState({
    job_type_id: editingJob?.job_type?.id || '',
    customer_id: editingJob?.customer?.id || '',
    location_id: editingJob?.location?.id || '',
    title: editingJob?.title || '',
    priority: editingJob?.priority || 'normal',
    scheduled_start: editingJob?.scheduled_date?.slice(0, 10) || editingJob?.scheduled_start?.slice(0, 10) || '',
    scheduled_end: editingJob?.scheduled_end_date?.slice(0, 10) || editingJob?.scheduled_end?.slice(0, 10) || '',
    quoted_amount: editingJob?.quoted_amount || '',
    internal_notes: editingJob?.internal_notes || '',
    customer_notes: editingJob?.customer_notes || '',
    source_estimate_id: editingJob?.source_estimate_id || '',
    source_pipeline_id: editingJob?.source_pipeline_id || '',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['crm_customers_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, company_name')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data as Customer[];
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['crm_locations', formData.customer_id],
    queryFn: async () => {
      if (!formData.customer_id) return [];
      const { data, error } = await supabase
        .from('crm_locations')
        .select('id, customer_id, address_line1, city')
        .eq('customer_id', formData.customer_id)
        .is('deleted_at', null);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!formData.customer_id
  });

  // Fetch customer notes + legacy notes for "Import notes" helper
  const { data: customerNotesData } = useQuery({
    queryKey: ['crm_customer_notes_for_job', formData.customer_id],
    queryFn: async () => {
      if (!formData.customer_id) return { notes: [] as { content: string; created_at: string }[], legacy: null as string | null };
      const [{ data: notes }, { data: customer }] = await Promise.all([
        supabase
          .from('crm_customer_notes')
          .select('content, created_at')
          .eq('customer_id', formData.customer_id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('crm_customers')
          .select('notes')
          .eq('id', formData.customer_id)
          .maybeSingle(),
      ]);
      return { notes: notes || [], legacy: customer?.notes || null };
    },
    enabled: !!formData.customer_id,
  });

  const hasImportableNotes =
    (customerNotesData?.notes?.length || 0) > 0 || !!customerNotesData?.legacy;

  const importCustomerNotes = (target: 'internal_notes' | 'customer_notes') => {
    if (!customerNotesData) return;
    const lines: string[] = [];
    customerNotesData.notes.forEach((n) => lines.push(`• ${n.content}`));
    if (customerNotesData.legacy) lines.push(`• ${customerNotesData.legacy}`);
    if (!lines.length) return;
    const imported = `Customer notes:\n${lines.join('\n')}`;
    setFormData((prev) => ({
      ...prev,
      [target]: prev[target] ? `${prev[target]}\n\n${imported}` : imported,
    }));
    toast.success('Customer notes imported');
  };

  // Fetch estimates for linking (filtered by customer if selected)
  const { data: estimates = [] } = useQuery({
    queryKey: ['estimates-for-job-link', formData.customer_id],
    queryFn: async () => {
      let query = supabase.from('estimates').select('id, estimate_number, grand_total');
      if (formData.customer_id) query = query.eq('customer_id', formData.customer_id);
      const { data } = await query.order('created_at', { ascending: false }).limit(30);
      return data || [];
    },
  });

  // Fetch pipeline entries for linking
  const { data: pipelineEntries = [] } = useQuery({
    queryKey: ['pipeline-for-job-link', formData.customer_id],
    queryFn: async () => {
      let query = supabase.from('crm_pipeline_entries').select('id, estimated_value, customer:crm_customers!inner(first_name, last_name, company_name)');
      if (formData.customer_id) query = query.eq('customer_id', formData.customer_id);
      const { data } = await query.limit(30);
      return data || [];
    },
  });

  // Get first stage for selected job type
  const getInitialStage = (jobTypeId: string) => {
    const stagesForType = allStages
      .filter(s => s.job_type_id === jobTypeId)
      .sort((a, b) => a.sort_order - b.sort_order);
    return stagesForType[0]?.id || null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jobData = {
        job_type_id: formData.job_type_id,
        customer_id: formData.customer_id,
        location_id: formData.location_id || null,
        title: formData.title,
        priority: formData.priority,
        scheduled_date: formData.scheduled_start || null,
        scheduled_end_date: formData.scheduled_end || null,
        quoted_amount: formData.quoted_amount ? parseFloat(formData.quoted_amount as string) : null,
        internal_notes: formData.internal_notes,
        customer_notes: formData.customer_notes,
        source_estimate_id: formData.source_estimate_id || null,
        source_pipeline_id: formData.source_pipeline_id || null,
      };

      if (editingJob?.id) {
        const { error } = await supabase
          .from('crm_jobs')
          .update(jobData)
          .eq('id', editingJob.id);
        if (error) throw error;
      } else {
        // Set initial stage for new job
        const initialStageId = getInitialStage(formData.job_type_id);
        const { error } = await supabase.from('crm_jobs').insert({
          ...jobData,
          current_stage_id: initialStageId
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate specific job if editing, plus the list
      if (editingJob?.id) {
        queryClient.invalidateQueries({ queryKey: ['crm_job', editingJob.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['crm_jobs'] });
      toast.success(editingJob ? 'Job updated' : 'Job created');
      onClose();
    },
    onError: (error) => toast.error('Failed to save job: ' + error.message)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.job_type_id || !formData.customer_id || !formData.title) {
      toast.error('Please fill in required fields');
      return;
    }
    saveMutation.mutate();
  };

  const getCustomerName = (customer: Customer) => {
    if (customer.company_name) return customer.company_name;
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  const sortedCustomers = useMemo(() => 
    [...customers].sort((a, b) => getCustomerName(a).localeCompare(getCustomerName(b))),
    [customers]
  );

  const selectedCustomerName = formData.customer_id
    ? getCustomerName(customers.find(c => c.id === formData.customer_id) || { id: '', first_name: null, last_name: null, company_name: null })
    : '';

  return (
    <DialogContent 
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
      onInteractOutside={(e) => {
        // Prevent closing when clicking on portal elements (Select, etc.)
        const target = e.target as HTMLElement;
        if (target?.closest('[data-radix-popper-content-wrapper]')) {
          e.preventDefault();
        }
      }}
      onPointerDownOutside={(e) => {
        // Prevent closing when clicking on portal elements
        const target = e.target as HTMLElement;
        if (target?.closest('[data-radix-popper-content-wrapper]')) {
          e.preventDefault();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{editingJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer & Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer *</Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedCustomerName || "Search customers..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customers..." />
                  <CommandList>
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      {sortedCustomers.map(customer => {
                        const name = getCustomerName(customer);
                        return (
                          <CommandItem
                            key={customer.id}
                            value={name}
                            onSelect={() => {
                              setFormData({ ...formData, customer_id: customer.id, location_id: '' });
                              setCustomerOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.customer_id === customer.id ? "opacity-100" : "opacity-0")} />
                            {name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={formData.location_id}
              onValueChange={(v) => setFormData({ ...formData, location_id: v })}
              disabled={!formData.customer_id || locations.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={locations.length === 0 ? 'No locations' : 'Select location'} />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.address_line1}, {location.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Job Type & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Job Type *</Label>
            <Select
              value={formData.job_type_id}
              onValueChange={(v) => setFormData({ ...formData, job_type_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Residential</div>
                {jobTypes.filter(t => t.category === 'residential').map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Commercial</div>
                {jobTypes.filter(t => t.category === 'commercial').map(type => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) => setFormData({ ...formData, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>Job Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Replace HVAC system - 3 ton unit"
            required
          />
        </div>

        {/* Schedule (Date Only) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Input
              type="date"
              value={formData.scheduled_start}
              onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={formData.scheduled_end}
              onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })}
            />
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label>Quoted Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.quoted_amount}
            onChange={(e) => setFormData({ ...formData, quoted_amount: e.target.value })}
            placeholder="$0.00"
          />
        </div>

        {/* Link Estimate & Pipeline */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Link Estimate</Label>
            <Select
              value={formData.source_estimate_id}
              onValueChange={(v) => setFormData({ ...formData, source_estimate_id: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {estimates.map((est: any) => (
                  <SelectItem key={est.id} value={est.id}>
                    {est.estimate_number} — ${est.grand_total?.toLocaleString() || '0'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Link Pipeline Entry</Label>
            <Select
              value={formData.source_pipeline_id}
              onValueChange={(v) => setFormData({ ...formData, source_pipeline_id: v === 'none' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {pipelineEntries.map((entry: any) => {
                  const name = entry.customer?.company_name || `${entry.customer?.first_name || ''} ${entry.customer?.last_name || ''}`.trim();
                  return (
                    <SelectItem key={entry.id} value={entry.id}>
                      {name} {entry.estimated_value ? `— $${entry.estimated_value.toLocaleString()}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasImportableNotes && (
          <div className="flex items-center justify-between rounded-md border border-dashed bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              This customer has saved notes from prior submissions or staff updates.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => importCustomerNotes('internal_notes')}>
                Import to Internal
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => importCustomerNotes('customer_notes')}>
                Import to Customer
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              placeholder="Notes for staff only"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Customer Notes</Label>
            <Textarea
              value={formData.customer_notes}
              onChange={(e) => setFormData({ ...formData, customer_notes: e.target.value })}
              placeholder="Customer-visible notes"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : (editingJob ? 'Update Job' : 'Create Job')}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
