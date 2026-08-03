import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, RotateCcw, DollarSign, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NewContractDialog } from '@/components/admin/maintenance/NewContractDialog';
import type { MaintenanceSegment } from '@/types/maintenanceContracts';

type Segment = 'all' | 'residential' | 'commercial';

interface JobRow {
  id: string;
  customer_id: string;
  location_id: string | null;
  actual_end: string | null;
  scheduled_end: string | null;
  created_at: string;
  job_type: { slug: string | null; name: string | null } | null;
  stage: { stage_type: string | null } | null;
}

interface Candidate {
  customer_id: string;
  location_id: string | null;
  customer_name: string;
  customer_type: 'residential' | 'commercial';
  inferred_segment: 'residential' | 'commercial';
  address: string;
  jobs_count: number;
  last_service_date: string | null;
  fit_score: number;
  reason_chips: string[];
}

const RES_ARR = 189;
const COM_ARR = 450;

function monthsAgo(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MaintenanceContractCandidates() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [segment, setSegment] = useState<Segment>('all');
  const [minScore, setMinScore] = useState(20);
  const [tab, setTab] = useState<'active' | 'dismissed'>('active');
  const [prefill, setPrefill] = useState<{ customerId: string; locationId?: string; segment: MaintenanceSegment } | null>(null);
  const [dismissTarget, setDismissTarget] = useState<Candidate | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['contract-candidates-bundle'],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 36);
      const cutoffIso = cutoff.toISOString();

      const [jobsRes, customersRes, locationsRes, activeContractsRes, dismissalsRes, equipmentRes] = await Promise.all([
        supabase
          .from('crm_jobs')
          .select('id, customer_id, location_id, actual_end, scheduled_end, created_at, job_type:job_type_id(slug,name), stage:current_stage_id(stage_type)')
          .is('deleted_at', null)
          .gte('created_at', cutoffIso)
          .limit(2000),
        supabase
          .from('crm_customers')
          .select('id, first_name, last_name, customer_type, customer_status')
          .neq('customer_status', 'former')
          .limit(2000),
        supabase
          .from('crm_locations')
          .select('id, customer_id, address_line1, city, state')
          .limit(4000),
        supabase
          .from('crm_maintenance_contracts')
          .select('customer_id, location_id')
          .eq('status', 'active'),
        supabase
          .from('crm_contract_candidate_dismissals')
          .select('id, customer_id, location_id, reason, dismissed_at'),
        supabase
          .from('crm_location_equipment')
          .select('id, location_id'),
      ]);
      for (const r of [jobsRes, customersRes, locationsRes, activeContractsRes, dismissalsRes, equipmentRes]) {
        if (r.error) throw r.error;
      }
      return {
        jobs: (jobsRes.data ?? []) as unknown as JobRow[],
        customers: customersRes.data ?? [],
        locations: locationsRes.data ?? [],
        activeContracts: activeContractsRes.data ?? [],
        dismissals: dismissalsRes.data ?? [],
        equipment: equipmentRes.data ?? [],
      };
    },
  });

  const { active, dismissed } = useMemo(() => {
    if (!bundle) return { active: [] as Candidate[], dismissed: [] as (Candidate & { reason?: string | null; dismissed_at?: string })[] };

    const customerById = new Map(bundle.customers.map((c: any) => [c.id, c]));
    const locById = new Map(bundle.locations.map((l: any) => [l.id, l]));
    const activePairs = new Set(
      bundle.activeContracts.map((c: any) => `${c.customer_id}::${c.location_id ?? ''}`),
    );
    const dismissalMap = new Map(
      bundle.dismissals.map((d: any) => [`${d.customer_id}::${d.location_id ?? ''}`, d]),
    );
    const equipCountByLocation = new Map<string, number>();
    for (const e of bundle.equipment as any[]) {
      if (!e.location_id) continue;
      equipCountByLocation.set(e.location_id, (equipCountByLocation.get(e.location_id) ?? 0) + 1);
    }

    // group completed jobs by customer+location
    const groups = new Map<string, JobRow[]>();
    const COMPLETED_STAGES = new Set(['completed', 'closed_won', 'review']);
    for (const j of bundle.jobs) {
      if (!j.stage?.stage_type || !COMPLETED_STAGES.has(j.stage.stage_type)) continue;
      const key = `${j.customer_id}::${j.location_id ?? ''}`;
      const arr = groups.get(key) ?? [];
      arr.push(j);
      groups.set(key, arr);
    }

    const candidatesActive: Candidate[] = [];
    const candidatesDismissed: (Candidate & { reason?: string | null; dismissed_at?: string })[] = [];

    for (const [key, jobs] of groups) {
      const [customer_id, locStr] = key.split('::');
      const location_id = locStr || null;
      const cust: any = customerById.get(customer_id);
      if (!cust) continue;
      if (activePairs.has(key)) continue;

      // Compute signals
      const now = new Date();
      const ageMonths = (j: JobRow) => {
        const date = j.actual_end ?? j.scheduled_end ?? j.created_at;
        return monthsAgo(date);
      };

      const maintenance24 = jobs.filter((j) => {
        const slug = j.job_type?.slug ?? '';
        const m = ageMonths(j);
        return /maintenance/i.test(slug) && m !== null && m <= 24;
      });
      const repair12 = jobs.filter((j) => {
        const slug = j.job_type?.slug ?? '';
        const m = ageMonths(j);
        return /service-call/i.test(slug) && m !== null && m <= 12;
      });
      const installOld = jobs.filter((j) => {
        const slug = j.job_type?.slug ?? '';
        const m = ageMonths(j);
        return /installation|custom-home|remodel-project/i.test(slug) && m !== null && m > 12;
      });
      const totalIn36 = jobs.length;
      const equipCount = location_id ? equipCountByLocation.get(location_id) ?? 0 : 0;
      const lastJobMonths = jobs
        .map(ageMonths)
        .filter((m): m is number => m !== null)
        .sort((a, b) => a - b)[0] ?? null;
      const lastJobIso = jobs
        .map((j) => j.actual_end ?? j.scheduled_end ?? j.created_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;

      let score = 0;
      const reasons: string[] = [];
      if (maintenance24.length >= 1) { score += 40; reasons.push(`${maintenance24.length} maintenance visit${maintenance24.length > 1 ? 's' : ''} (24mo)`); }
      if (totalIn36 >= 2) { score += 25; reasons.push(`${totalIn36} completed jobs (36mo)`); }
      if (installOld.length >= 1) { const m = ageMonths(installOld[0]); score += 20; reasons.push(`Install ${m} months ago`); }
      if (repair12.length >= 1) { score += 15; reasons.push(`${repair12.length} repair${repair12.length > 1 ? 's' : ''} (12mo)`); }
      if (equipCount >= 2) { score += 10; reasons.push(`${equipCount} equipment on file`); }
      if (lastJobMonths !== null && lastJobMonths > 18) { score -= 15; reasons.push(`Last service ${lastJobMonths}mo ago`); }

      if (score < 20) continue;

      const loc: any = location_id ? locById.get(location_id) : null;
      const address = loc ? `${loc.address_line1}, ${loc.city}` : '—';
      const customer_type: 'residential' | 'commercial' = cust.customer_type === 'commercial' ? 'commercial' : 'residential';
      const candidate: Candidate = {
        customer_id,
        location_id,
        customer_name: `${cust.first_name ?? ''} ${cust.last_name ?? ''}`.trim() || 'Unknown',
        customer_type,
        inferred_segment: customer_type,
        address,
        jobs_count: totalIn36,
        last_service_date: lastJobIso,
        fit_score: score,
        reason_chips: reasons,
      };

      const dismissal = dismissalMap.get(key);
      if (dismissal) {
        candidatesDismissed.push({ ...candidate, reason: (dismissal as any).reason, dismissed_at: (dismissal as any).dismissed_at });
      } else {
        candidatesActive.push(candidate);
      }
    }

    candidatesActive.sort((a, b) => b.fit_score - a.fit_score);
    candidatesDismissed.sort((a, b) => b.fit_score - a.fit_score);
    return { active: candidatesActive, dismissed: candidatesDismissed };
  }, [bundle]);

  const filteredActive = useMemo(() => {
    return active.filter((c) => {
      if (segment !== 'all' && c.inferred_segment !== segment) return false;
      if (c.fit_score < minScore) return false;
      return true;
    });
  }, [active, segment, minScore]);

  const kpis = useMemo(() => {
    const total = filteredActive.length;
    const arr = filteredActive.reduce((sum, c) => sum + (c.inferred_segment === 'commercial' ? COM_ARR : RES_ARR), 0);
    return { total, arr };
  }, [filteredActive]);

  const dismissMutation = useMutation({
    mutationFn: async ({ candidate, reason }: { candidate: Candidate; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('crm_contract_candidate_dismissals')
        .insert({
          customer_id: candidate.customer_id,
          location_id: candidate.location_id,
          reason: reason || null,
          dismissed_by: user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Candidate dismissed');
      await qc.invalidateQueries({ queryKey: ['contract-candidates-bundle'] });
      setDismissTarget(null);
      setDismissReason('');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to dismiss'),
  });

  const undismissMutation = useMutation({
    mutationFn: async (c: Candidate) => {
      let q = supabase
        .from('crm_contract_candidate_dismissals')
        .delete()
        .eq('customer_id', c.customer_id);
      q = c.location_id ? q.eq('location_id', c.location_id) : q.is('location_id', null);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Undismissed');
      await qc.invalidateQueries({ queryKey: ['contract-candidates-bundle'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to undismiss'),
  });

  function renderRow(c: Candidate, dismissedView = false, extra?: { reason?: string | null }) {
    return (
      <TableRow key={`${c.customer_id}-${c.location_id ?? 'none'}`}>
        <TableCell className="font-medium">{c.customer_name}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{c.address}</TableCell>
        <TableCell><Badge variant="outline" className="capitalize">{c.inferred_segment}</Badge></TableCell>
        <TableCell>{fmtDate(c.last_service_date)}</TableCell>
        <TableCell className="w-[160px]">
          <div className="flex items-center gap-2">
            <Progress value={Math.min(100, c.fit_score)} className="h-2 flex-1" />
            <span className="text-sm font-semibold w-8 text-right">{c.fit_score}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1 max-w-[280px]">
            {c.reason_chips.map((r, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">{r}</Badge>
            ))}
            {dismissedView && extra?.reason && (
              <Badge variant="outline" className="text-xs">Reason: {extra.reason}</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right">
          {dismissedView ? (
            <Button size="sm" variant="outline" onClick={() => undismissMutation.mutate(c)}>
              <RotateCcw className="w-3.5 h-3.5" /> Undismiss
            </Button>
          ) : (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setPrefill({ customerId: c.customer_id, locationId: c.location_id ?? undefined, segment: c.inferred_segment })}>
                Start Contract
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDismissTarget(c)}>
                <X className="w-3.5 h-3.5" /> Dismiss
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <AdminLayout title="Maintenance Contract Candidates">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="w-6 h-6" /> Maintenance Contract Candidates
            </h1>
            <p className="text-sm text-muted-foreground">
              Suggested customers without an active maintenance contract, scored by fit signals.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin/contracts')}>Back to Contracts</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Candidates (filtered)
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{kpis.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Est. ARR if all converted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">${kpis.arr.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">${RES_ARR} res · ${COM_ARR} com</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Dismissed</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{dismissed.length}</div></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="residential">Residential</TabsTrigger>
                <TabsTrigger value="commercial">Commercial</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-4 max-w-md">
              <div className="text-sm text-muted-foreground whitespace-nowrap">Min fit score</div>
              <Slider value={[minScore]} onValueChange={(v) => setMinScore(v[0])} min={20} max={100} step={5} className="flex-1" />
              <div className="text-sm font-semibold w-10 text-right">{minScore}</div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Active / Dismissed */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'dismissed')}>
          <TabsList>
            <TabsTrigger value="active">Candidates ({filteredActive.length})</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed ({dismissed.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-card sticky top-0 shadow-sm z-10">
                  <TableHead>Customer</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Fit Score</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Scanning customer history…</TableCell></TableRow>
                )}
                {!isLoading && tab === 'active' && filteredActive.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No candidates match the current filters.</TableCell></TableRow>
                )}
                {!isLoading && tab === 'dismissed' && dismissed.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No dismissed candidates.</TableCell></TableRow>
                )}
                {!isLoading && tab === 'active' && filteredActive.map((c) => renderRow(c))}
                {!isLoading && tab === 'dismissed' && dismissed.map((c) => renderRow(c, true, { reason: (c as any).reason }))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Pre-filled new contract dialog */}
      <NewContractDialog
        open={!!prefill}
        onOpenChange={(o) => { if (!o) setPrefill(null); }}
        initialCustomerId={prefill?.customerId}
        initialLocationId={prefill?.locationId}
        initialSegment={prefill?.segment}
        onCreated={() => { setPrefill(null); qc.invalidateQueries({ queryKey: ['contract-candidates-bundle'] }); }}
      />

      {/* Dismiss dialog */}
      <Dialog open={!!dismissTarget} onOpenChange={(o) => { if (!o) { setDismissTarget(null); setDismissReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss candidate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium">{dismissTarget?.customer_name}</span> from the suggestions list. You can undismiss later.
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} rows={3} placeholder="e.g. Customer declined, out of service area…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissTarget(null)}>Cancel</Button>
            <Button
              onClick={() => dismissTarget && dismissMutation.mutate({ candidate: dismissTarget, reason: dismissReason })}
              disabled={dismissMutation.isPending}
            >
              {dismissMutation.isPending ? 'Dismissing…' : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
