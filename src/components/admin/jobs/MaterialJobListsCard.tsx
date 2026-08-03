import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, FileSpreadsheet, Package, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import MaterialListBuilderDialog from './MaterialListBuilderDialog';

type Status = 'draft' | 'submitted' | 'reviewed' | 'fulfilled' | 'cancelled';

interface RequestRow {
  id: string;
  list_name: string | null;
  status: Status;
  requested_by: string;
  source_estimate_id: string | null;
  created_at: string;
  items_count?: { count: number }[];
  requester?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

interface Props {
  jobId: string;
  customerId: string;
  sourceEstimateId: string | null;
}

const statusBadgeClass = (s: Status) => ({
  draft: 'bg-muted text-foreground',
  submitted: 'bg-[#d4a84b] text-[#1e3a5f]',
  reviewed: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}[s]);

export default function MaterialJobListsCard({ jobId, customerId, sourceEstimateId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openBuilderId, setOpenBuilderId] = useState<string | null>(null);
  const [newListPrompt, setNewListPrompt] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [confirmTakeoff, setConfirmTakeoff] = useState(false);
  const [takeoffWarn, setTakeoffWarn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdminOrManager, setIsAdminOrManager] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setCurrentUserId(user.id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const isAM = (roles || []).some((r) => r.role === 'admin' || r.role === 'manager' || r.role === 'super_admin');
      setIsAdminOrManager(isAM);
    })();
    return () => { mounted = false; };
  }, []);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['material_requests_for_job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_requests')
        .select('id, list_name, status, requested_by, source_estimate_id, created_at, items_count:material_request_items(count)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RequestRow[];
    },
  });

  const requesterIds = useMemo(
    () => Array.from(new Set(lists.map((l) => l.requested_by))).filter(Boolean),
    [lists],
  );

  const { data: requesters = {} } = useQuery({
    queryKey: ['material_request_requesters', requesterIds],
    enabled: requesterIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('user_id, first_name, last_name, email')
        .in('user_id', requesterIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((t) => {
        if (!t.user_id) return;
        const name = [t.first_name, t.last_name].filter(Boolean).join(' ').trim();
        map[t.user_id] = name || t.email || 'User';
      });
      return map;
    },
  });

  const hasTakeoff = useMemo(
    () => lists.some((l) => (l.list_name || '').toLowerCase() === 'takeoff'),
    [lists],
  );

  const createListMutation = useMutation({
    mutationFn: async (listName: string) => {
      if (!currentUserId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('material_requests')
        .insert({
          job_id: jobId,
          customer_id: customerId,
          requested_by: currentUserId,
          list_name: listName || `List ${format(new Date(), 'MMM d, HH:mm')}`,
          status: 'draft',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['material_requests_for_job', jobId] });
      setNewListPrompt(false);
      setNewListName('');
      setOpenBuilderId(id);
    },
    onError: (e: any) => toast({ title: 'Could not create list', description: e.message, variant: 'destructive' }),
  });

  const createTakeoffMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error('Not signed in');
      if (!sourceEstimateId) throw new Error('Job has no source estimate');

      // 1) Fetch material lines from estimate (no pricing read needed)
      const { data: lines, error: linesError } = await supabase
        .from('estimate_line_items')
        .select('material_id, name, quantity, unit, sort_order')
        .eq('estimate_id', sourceEstimateId)
        .eq('item_type', 'material')
        .order('sort_order', { ascending: true });
      if (linesError) throw linesError;

      // 2) Create list
      const { data: list, error: listError } = await supabase
        .from('material_requests')
        .insert({
          job_id: jobId,
          customer_id: customerId,
          requested_by: currentUserId,
          source_estimate_id: sourceEstimateId,
          list_name: 'Takeoff',
          status: 'draft',
        })
        .select('id')
        .single();
      if (listError) throw listError;

      // 3) Seed items
      if (lines && lines.length > 0) {
        const rows = lines.map((l, idx) => ({
          request_id: list.id,
          material_id: l.material_id,
          custom_item: l.material_id ? null : l.name,
          quantity: l.quantity,
          unit: l.unit,
          from_takeoff: true,
          sort_order: idx,
        }));
        const { error: itemsError } = await supabase.from('material_request_items').insert(rows);
        if (itemsError) throw itemsError;
      }
      return { id: list.id as string, count: lines?.length || 0 };
    },
    onSuccess: ({ id, count }) => {
      toast({ title: 'Takeoff list created', description: `${count} item${count === 1 ? '' : 's'} seeded from the estimate.` });
      qc.invalidateQueries({ queryKey: ['material_requests_for_job', jobId] });
      setConfirmTakeoff(false);
      setTakeoffWarn(false);
      setOpenBuilderId(id);
    },
    onError: (e: any) => toast({ title: 'Takeoff failed', description: e.message, variant: 'destructive' }),
  });

  // Need item counts: we'll trigger a fetch for line counts once
  // (handled via items_count above through the related select)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5" style={{ color: '#1e3a5f' }} />
          Material Job Lists
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!sourceEstimateId || createTakeoffMutation.isPending}
            onClick={() => {
              if (hasTakeoff) setTakeoffWarn(true);
              else setConfirmTakeoff(true);
            }}
            title={!sourceEstimateId ? 'Link an estimate to enable' : ''}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Create Takeoff from Estimate
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setNewListPrompt(true)}
            style={{ backgroundColor: '#d4a84b', color: '#1e3a5f' }}
            className="font-semibold hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-1" />
            New List
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg border-dashed">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No material lists yet for this job.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lists.map((l) => {
              const requester = requesters[l.requested_by] || 'User';
              const count = l.items_count?.[0]?.count ?? 0;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setOpenBuilderId(l.id)}
                  className="text-left border rounded-lg p-3 bg-card hover:border-foreground/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm leading-tight">
                      {l.list_name || 'Untitled list'}
                    </div>
                    <Badge className={cn('capitalize text-[10px]', statusBadgeClass(l.status))}>
                      {l.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                    <div>{count} item{count === 1 ? '' : 's'}</div>
                    <div>By {requester}</div>
                    <div>{format(new Date(l.created_at), 'PP')}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* New list name prompt */}
      <Dialog open={newListPrompt} onOpenChange={setNewListPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New material list</DialogTitle>
            <DialogDescription>Give it a name, or leave blank for a default.</DialogDescription>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="e.g. Day 1 install"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') createListMutation.mutate(newListName.trim());
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListPrompt(false)}>Cancel</Button>
            <Button
              onClick={() => createListMutation.mutate(newListName.trim())}
              disabled={createListMutation.isPending}
              style={{ backgroundColor: '#1e3a5f', color: 'white' }}
            >
              {createListMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Takeoff confirm */}
      <Dialog open={confirmTakeoff} onOpenChange={setConfirmTakeoff}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create takeoff list?</DialogTitle>
            <DialogDescription>
              This will create a new list seeded with the materials from the job's approved estimate. No pricing is copied.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTakeoff(false)}>Cancel</Button>
            <Button
              onClick={() => createTakeoffMutation.mutate()}
              disabled={createTakeoffMutation.isPending}
              style={{ backgroundColor: '#d4a84b', color: '#1e3a5f' }}
            >
              {createTakeoffMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create takeoff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Takeoff already exists warning */}
      <Dialog open={takeoffWarn} onOpenChange={setTakeoffWarn}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>A takeoff list already exists</DialogTitle>
            <DialogDescription>
              This job already has a list named "Takeoff". You can create another one if you really need to.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTakeoffWarn(false)}>Cancel</Button>
            <Button
              onClick={() => createTakeoffMutation.mutate()}
              disabled={createTakeoffMutation.isPending}
              style={{ backgroundColor: '#d4a84b', color: '#1e3a5f' }}
            >
              {createTakeoffMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create another anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Builder */}
      {openBuilderId && currentUserId && (
        <MaterialListBuilderDialog
          open={!!openBuilderId}
          onOpenChange={(o) => !o && setOpenBuilderId(null)}
          requestId={openBuilderId}
          currentUserId={currentUserId}
          isAdminOrManager={isAdminOrManager}
        />
      )}
    </Card>
  );
}
