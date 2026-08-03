import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import MaterialListBuilderDialog from '@/components/admin/jobs/MaterialListBuilderDialog';

const NAVY = '#1e3a5f';
const GOLD = '#d4a84b';

type Status = 'draft' | 'submitted' | 'reviewed' | 'fulfilled' | 'cancelled';

const STATUS_COLORS: Record<Status, string> = {
  draft: 'bg-gray-200 text-gray-800',
  submitted: 'bg-amber-100 text-amber-900',
  reviewed: 'bg-blue-100 text-blue-900',
  fulfilled: 'bg-green-100 text-green-900',
  cancelled: 'bg-red-100 text-red-900',
};

interface Row {
  id: string;
  list_name: string | null;
  status: Status;
  job_id: string | null;
  customer_id: string | null;
  requested_by: string;
  created_at: string;
  items_count: { count: number }[] | null;
}

interface JobLite {
  id: string;
  job_number: string | null;
  title: string | null;
  customer_id: string | null;
}

export default function MaterialLists() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [openBuilderId, setOpenBuilderId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdminOrManager, setIsAdminOrManager] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setCurrentUserId(user.id);
      const { data: roles } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id);
      const am = (roles || []).some((r) =>
        r.role === 'admin' || r.role === 'manager' || r.role === 'super_admin');
      setIsAdminOrManager(am);
    })();
    return () => { mounted = false; };
  }, []);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['material_lists_hub', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('material_requests')
        .select('id, list_name, status, job_id, customer_id, requested_by, created_at, items_count:material_request_items(count)')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  const jobIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.job_id).filter(Boolean) as string[])),
    [rows],
  );
  const userIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.requested_by).filter(Boolean) as string[])),
    [rows],
  );

  const { data: jobs = [] } = useQuery({
    queryKey: ['mlh_jobs', jobIds],
    enabled: jobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select('id, job_number, title')
        .in('id', jobIds);
      if (error) throw error;
      return (data || []) as Array<{ id: string; job_number: string | null; title: string | null }>;
    },
  });
  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  const { data: members = [] } = useQuery({
    queryKey: ['mlh_members', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);
      if (error) throw error;
      return (data || []) as Array<{ user_id: string; first_name: string | null; last_name: string | null; email: string | null }>;
    },
  });
  const memberMap = new Map(
    members.map((m) => [
      m.user_id,
      [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.email || 'User',
    ]),
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const job = r.job_id ? jobMap.get(r.job_id) : null;
      const hay = [
        r.list_name || '',
        job?.job_number || '',
        job?.title || '',
      ].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search, jobMap]);

  return (
    <AdminLayout title="Material Lists">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle style={{ color: NAVY }}>All Material Lists</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search list or job"
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setNewOpen(true)}
                style={{ backgroundColor: GOLD, color: NAVY }}
                className="font-semibold"
              >
                <Plus className="h-4 w-4 mr-1" /> New List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No material lists found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>List Name</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const job = r.job_id ? jobMap.get(r.job_id) : null;
                    const requester = memberMap.get(r.requested_by) || '—';
                    const count = r.items_count?.[0]?.count ?? 0;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setOpenBuilderId(r.id)}
                      >
                        <TableCell>
                          {job
                            ? <span><span className="font-medium">{job.job_number}</span>{job.title ? <span className="text-muted-foreground"> · {job.title}</span> : null}</span>
                            : <span className="text-muted-foreground italic">No job</span>}
                        </TableCell>
                        <TableCell className="font-medium">{r.list_name || 'Material List'}</TableCell>
                        <TableCell>{requester}</TableCell>
                        <TableCell>
                          <Badge className={cn('capitalize text-[10px]', STATUS_COLORS[r.status])}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{count}</TableCell>
                        <TableCell>{format(new Date(r.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {openBuilderId && currentUserId && (
        <MaterialListBuilderDialog
          open={!!openBuilderId}
          onOpenChange={(o) => { if (!o) setOpenBuilderId(null); }}
          requestId={openBuilderId}
          currentUserId={currentUserId}
          isAdminOrManager={isAdminOrManager}
        />
      )}

      <NewListDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        currentUserId={currentUserId}
        onCreated={(id) => {
          setNewOpen(false);
          qc.invalidateQueries({ queryKey: ['material_lists_hub'] });
          setOpenBuilderId(id);
        }}
      />
    </AdminLayout>
  );
}

interface NewListDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentUserId: string | null;
  onCreated: (id: string) => void;
}

function NewListDialog({ open, onOpenChange, currentUserId, onCreated }: NewListDialogProps) {
  const { toast } = useToast();
  const [jobSearch, setJobSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobLite | null>(null);
  const [listName, setListName] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedJob(null);
      setListName('');
      setJobSearch('');
    }
  }, [open]);

  const { data: jobOptions = [], isFetching } = useQuery({
    queryKey: ['mlh_job_picker', jobSearch],
    enabled: open,
    queryFn: async () => {
      const term = jobSearch.trim();
      let q = supabase
        .from('crm_jobs')
        .select('id, job_number, title, customer_id, customer:crm_customers(first_name, last_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (term) {
        q = q.or(`job_number.ilike.%${term}%,title.ilike.%${term}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Array<JobLite & { customer: { first_name: string | null; last_name: string | null } | null }>;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error('Not signed in');
      if (!selectedJob) throw new Error('Pick a job');
      const name = listName.trim() || `List ${format(new Date(), 'MMM d, HH:mm')}`;
      const { data, error } = await supabase
        .from('material_requests')
        .insert({
          job_id: selectedJob.id,
          customer_id: selectedJob.customer_id,
          requested_by: currentUserId,
          source_estimate_id: null,
          status: 'draft',
          list_name: name,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => onCreated(id),
    onError: (e: any) => toast({ title: 'Could not create list', description: e.message, variant: 'destructive' }),
  });

  const jobLabel = (j: JobLite & { customer?: { first_name: string | null; last_name: string | null } | null }) => {
    const cust = j.customer
      ? `${j.customer.first_name ?? ''} ${j.customer.last_name ?? ''}`.trim()
      : '';
    return [j.job_number, j.title, cust].filter(Boolean).join(' · ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>New Material List</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Job <span className="text-red-600">*</span></label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className={cn(!selectedJob && 'text-muted-foreground')}>
                    {selectedJob ? jobLabel(selectedJob) : 'Search job by number, title or customer'}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search jobs..."
                    value={jobSearch}
                    onValueChange={setJobSearch}
                  />
                  <CommandList>
                    {isFetching ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">Loading…</div>
                    ) : jobOptions.length === 0 ? (
                      <CommandEmpty>No jobs found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {jobOptions.map((j) => (
                          <CommandItem
                            key={j.id}
                            value={j.id}
                            onSelect={() => {
                              setSelectedJob(j);
                              setPickerOpen(false);
                            }}
                          >
                            {jobLabel(j)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">List name (optional)</label>
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={`List ${format(new Date(), 'MMM d, HH:mm')}`}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!selectedJob || create.isPending}
            onClick={() => create.mutate()}
            style={{ backgroundColor: GOLD, color: NAVY }}
            className="font-semibold"
          >
            {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create & open
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
