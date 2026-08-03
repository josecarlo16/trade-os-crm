import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Printer, Loader2 } from 'lucide-react';

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

interface RequestRow {
  id: string;
  list_name: string | null;
  status: Status;
  job_id: string | null;
  requested_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>{status}</span>;
}

export default function MaterialRequests() {
  const { id } = useParams();
  if (id) return <MaterialRequestDetail id={id} />;
  return <MaterialRequestsQueue />;
}

function MaterialRequestsQueue() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('submitted');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['material_requests_queue', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('material_requests')
        .select('id, list_name, status, job_id, requested_by, submitted_at, reviewed_at, fulfilled_at, created_at')
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RequestRow[];
    },
  });

  const jobIds = useMemo(() => Array.from(new Set(requests.map((r) => r.job_id).filter(Boolean) as string[])), [requests]);
  const userIds = useMemo(() => Array.from(new Set(requests.map((r) => r.requested_by).filter(Boolean) as string[])), [requests]);

  const { data: jobs = [] } = useQuery({
    queryKey: ['mr_jobs', jobIds],
    enabled: jobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select('id, job_number, title')
        .in('id', jobIds);
      if (error) throw error;
      return data as Array<{ id: string; job_number: string | null; title: string | null }>;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['mr_members', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_members')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);
      if (error) throw error;
      return data as Array<{ user_id: string; first_name: string | null; last_name: string | null }>;
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ['mr_item_counts', requests.map((r) => r.id)],
    enabled: requests.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_request_items')
        .select('request_id')
        .in('request_id', requests.map((r) => r.id));
      if (error) throw error;
      const c: Record<string, number> = {};
      (data || []).forEach((it: any) => { c[it.request_id] = (c[it.request_id] || 0) + 1; });
      return c;
    },
  });

  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const memberMap = new Map(members.map((m) => [m.user_id, m]));

  return (
    <AdminLayout title="Material Requests">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle style={{ color: NAVY }}>Review Queue</CardTitle>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">No material requests match this filter.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const job = r.job_id ? jobMap.get(r.job_id) : null;
                    const m = r.requested_by ? memberMap.get(r.requested_by) : null;
                    const requester = m ? `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() : '—';
                    return (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/material-requests/${r.id}`)}>
                        <TableCell className="font-medium">{r.list_name || 'Material List'}</TableCell>
                        <TableCell>{job ? `${job.job_number ?? ''} ${job.title ? '· ' + job.title : ''}`.trim() : '—'}</TableCell>
                        <TableCell>{requester || '—'}</TableCell>
                        <TableCell>{counts[r.id] ?? 0}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</TableCell>
                        <TableCell><Button size="sm" variant="outline">Open</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

interface RequestItem {
  id: string;
  request_id: string;
  material_id: string | null;
  custom_item: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  sort_order: number;
}

interface Material {
  id: string;
  name: string;
  name_es: string | null;
  request_category: string | null;
  unit: string | null;
}

interface MaterialSupplier {
  material_id: string;
  supplier_id: string;
  preference_rank: number | null;
}

interface Supplier {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
}

function MaterialRequestDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: request, isLoading } = useQuery({
    queryKey: ['material_request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as RequestRow & { notes: string | null; job_id: string | null };
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['material_request_items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_request_items')
        .select('id, request_id, material_id, custom_item, quantity, unit, notes, sort_order')
        .eq('request_id', id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as RequestItem[];
    },
  });

  const materialIds = useMemo(
    () => Array.from(new Set(items.map((i) => i.material_id).filter(Boolean) as string[])),
    [items],
  );

  const { data: materials = [] } = useQuery({
    queryKey: ['mr_detail_materials', materialIds],
    enabled: materialIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials_catalog')
        .select('id, name, name_es, request_category, unit')
        .in('id', materialIds);
      if (error) throw error;
      return (data || []) as Material[];
    },
  });

  const { data: matSuppliers = [] } = useQuery({
    queryKey: ['mr_detail_matsup', materialIds],
    enabled: materialIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_suppliers')
        .select('material_id, supplier_id, preference_rank')
        .in('material_id', materialIds);
      if (error) throw error;
      return (data || []) as MaterialSupplier[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['mr_detail_suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_suppliers')
        .select('id, name, is_active, is_default')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Supplier[];
    },
  });

  const { data: job } = useQuery({
    queryKey: ['mr_detail_job', request?.job_id],
    enabled: !!request?.job_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select('id, job_number, title')
        .eq('id', request!.job_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (next: Status) => {
      const payload: Record<string, unknown> = { status: next };
      if (next === 'reviewed') payload.reviewed_by = user?.id ?? null;
      const { error } = await supabase.from('material_requests').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ['material_request', id] });
      qc.invalidateQueries({ queryKey: ['material_requests_queue'] });
      toast({ title: `Marked ${next}` });
    },
    onError: (e: any) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  if (isLoading || !request) {
    return (
      <AdminLayout title="Material Request">
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </AdminLayout>
    );
  }

  const matMap = new Map(materials.map((m) => [m.id, m]));
  const supMap = new Map(suppliers.map((s) => [s.id, s]));
  const defaultSupplier = suppliers.find((s) => s.is_default) || null;

  const matSupplierMap = new Map<string, MaterialSupplier[]>();
  matSuppliers.forEach((ms) => {
    const list = matSupplierMap.get(ms.material_id) || [];
    list.push(ms);
    matSupplierMap.set(ms.material_id, list);
  });

  // Group items by supplier for shopping view
  const groups = new Map<string, { name: string; items: Array<{ item: RequestItem; displayName: string }> }>();
  const UNASSIGNED = '__unassigned__';
  items.forEach((it) => {
    const displayName = it.material_id
      ? matMap.get(it.material_id)?.name ?? it.custom_item ?? 'Item'
      : it.custom_item ?? 'Custom item';

    let supplierId: string | null = null;
    let supplierName = 'Unassigned / any';

    if (it.material_id) {
      const links = (matSupplierMap.get(it.material_id) || [])
        .filter((l) => supMap.has(l.supplier_id));
      if (links.length > 0) {
        const ranked = links.filter((l) => l.preference_rank === 1);
        const chosen = ranked[0] || links.sort((a, b) => (a.preference_rank ?? 99) - (b.preference_rank ?? 99))[0];
        supplierId = chosen.supplier_id;
        supplierName = supMap.get(chosen.supplier_id)!.name;
      } else if (defaultSupplier) {
        supplierId = defaultSupplier.id;
        supplierName = `${defaultSupplier.name} (default)`;
      }
    } else if (defaultSupplier) {
      supplierId = defaultSupplier.id;
      supplierName = `${defaultSupplier.name} (default)`;
    }

    const key = supplierId ?? UNASSIGNED;
    const bucket = groups.get(key) || { name: supplierName, items: [] };
    bucket.items.push({ item: it, displayName });
    groups.set(key, bucket);
  });

  const copyGroup = async (groupName: string, list: Array<{ item: RequestItem; displayName: string }>) => {
    const lines = [
      `${groupName} — ${request.list_name || 'Material List'}${job ? ` (${job.job_number ?? ''})` : ''}`,
      '',
      ...list.map((l) => `  • ${l.item.quantity} ${l.item.unit ?? ''} ${l.displayName}${l.item.notes ? ` — ${l.item.notes}` : ''}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const printGroup = (groupName: string, list: Array<{ item: RequestItem; displayName: string }>) => {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    w.document.write(`<html><head><title>${groupName}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{color:${NAVY};margin:0 0 4px}h2{color:${GOLD};margin:16px 0 8px}table{width:100%;border-collapse:collapse}td{padding:6px 4px;border-bottom:1px solid #eee;vertical-align:top}</style>
      </head><body>
      <h1>${groupName}</h1>
      <div>${request.list_name || 'Material List'}${job ? ` · ${job.job_number ?? ''}` : ''}</div>
      <table><tbody>${list.map((l) => `<tr><td style="width:80px">${l.item.quantity} ${l.item.unit ?? ''}</td><td>${l.displayName}${l.item.notes ? `<div style="color:#666;font-size:12px">${l.item.notes}</div>` : ''}</td></tr>`).join('')}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  const canReview = request.status === 'submitted';
  const canFulfill = request.status === 'reviewed';
  const canCancel = request.status !== 'cancelled' && request.status !== 'fulfilled';

  return (
    <AdminLayout title={`Material Request · ${request.list_name || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/material-requests')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to queue
          </Button>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            {job && (
              <Link to={`/admin/jobs/${job.id}`} className="text-sm underline" style={{ color: NAVY }}>
                {job.job_number} {job.title ? `· ${job.title}` : ''}
              </Link>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle style={{ color: NAVY }}>{request.list_name || 'Material List'}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {canReview && (
                <ConfirmButton
                  label="Mark Reviewed"
                  description="This will lock the field owner out of further edits and signal that the list is approved."
                  onConfirm={() => updateStatus.mutate('reviewed')}
                  style={{ backgroundColor: NAVY, color: 'white' }}
                />
              )}
              {canFulfill && (
                <ConfirmButton
                  label="Mark Fulfilled"
                  description="Mark this list as fully purchased / delivered."
                  onConfirm={() => updateStatus.mutate('fulfilled')}
                  style={{ backgroundColor: '#15803d', color: 'white' }}
                />
              )}
              {canCancel && (
                <ConfirmButton
                  label="Cancel"
                  description="Cancel this material request. This cannot be undone from the UI."
                  onConfirm={() => updateStatus.mutate('cancelled')}
                  variant="outline"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="items">
              <TabsList>
                <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
                <TabsTrigger value="shopping">Shopping View</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="mt-4">
                {items.length === 0 ? (
                  <div className="text-muted-foreground py-6 text-center">No items on this list.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it) => {
                        const m = it.material_id ? matMap.get(it.material_id) : null;
                        return (
                          <TableRow key={it.id}>
                            <TableCell className="font-medium">
                              {m?.name ?? it.custom_item ?? 'Item'}
                              {!it.material_id && <Badge variant="outline" className="ml-2">custom</Badge>}
                            </TableCell>
                            <TableCell>{it.quantity}</TableCell>
                            <TableCell>{it.unit ?? m?.unit ?? '—'}</TableCell>
                            <TableCell>{m?.request_category ?? '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{it.notes ?? ''}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="shopping" className="mt-4 space-y-4">
                {groups.size === 0 ? (
                  <div className="text-muted-foreground py-6 text-center">No items to group.</div>
                ) : (
                  Array.from(groups.entries()).map(([key, group]) => (
                    <Card key={key}>
                      <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <CardTitle className="text-base" style={{ color: NAVY }}>
                          {group.name}{' '}
                          <span className="text-sm font-normal text-muted-foreground">({group.items.length})</span>
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyGroup(group.name, group.items)}>
                            <Copy className="h-4 w-4 mr-1" /> Copy
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => printGroup(group.name, group.items)}>
                            <Printer className="h-4 w-4 mr-1" /> Print
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {group.items.map(({ item, displayName }) => (
                            <li key={item.id} className="flex gap-3 text-sm py-1 border-b last:border-0">
                              <span className="font-semibold w-20 shrink-0">{item.quantity} {item.unit ?? ''}</span>
                              <span className="flex-1">
                                {displayName}
                                {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function ConfirmButton({
  label, description, onConfirm, variant, style,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
  variant?: 'outline' | 'default';
  style?: React.CSSProperties;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} style={style}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
