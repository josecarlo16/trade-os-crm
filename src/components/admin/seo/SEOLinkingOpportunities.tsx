import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Link2, ExternalLink, Check, RotateCw, Loader2, AlertCircle, X, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';

type Status = 'todo' | 'in_progress' | 'applied' | 'skipped' | 'failed';
type Priority = 'high' | 'medium' | 'low';

interface Opportunity {
  id: string;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  cluster: string | null;
  reason: string | null;
  priority: Priority;
  status: Status;
  apply_method: string | null;
  apply_error: string | null;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<Status, string> = {
  todo: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  applied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  skipped: 'bg-slate-50 text-slate-500 border-slate-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-rose-100 text-rose-700 border-rose-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function SEOLinkingOpportunities() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<'open' | 'all' | Status>('open');
  const [clusterFilter, setClusterFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('seo_linking_opportunities' as any)
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast.error(`Failed to load opportunities: ${error.message}`);
    } else {
      setItems((data as unknown as Opportunity[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const clusters = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) if (i.cluster) set.add(i.cluster);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (filter === 'open' && (i.status === 'applied' || i.status === 'skipped')) return false;
      if (filter !== 'open' && filter !== 'all' && i.status !== filter) return false;
      if (clusterFilter !== 'all' && i.cluster !== clusterFilter) return false;
      return true;
    });
  }, [items, filter, clusterFilter]);

  const counts = useMemo(() => {
    const c = { todo: 0, in_progress: 0, applied: 0, skipped: 0, failed: 0, total: items.length };
    for (const i of items) c[i.status]++;
    return c;
  }, [items]);

  async function setStatus(id: string, status: Status, extra: Partial<Opportunity> = {}) {
    const { error } = await supabase
      .from('seo_linking_opportunities' as any)
      .update({ status, ...extra } as any)
      .eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems(prev => prev.map(p => p.id === id ? { ...p, status, ...extra } as Opportunity : p));
  }

  async function applyOne(id: string) {
    setBusyId(id);
    try {
      await setStatus(id, 'in_progress');
      const { data, error } = await supabase.functions.invoke('seo-apply-internal-link', {
        body: { opportunityId: id },
      });
      if (error) throw error;
      const res: any = data;
      if (res?.error) {
        if (res.requiresManual) {
          toast.warning('Static page — apply manually', { description: res.error });
        } else {
          toast.error(res.error);
        }
      } else if (res?.alreadyPresent) {
        toast.success('Link already present — marked applied');
      } else {
        toast.success(`Linked ${res?.sourceSlug} → ${res?.target}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Apply failed');
      await setStatus(id, 'failed', { apply_error: e?.message ?? 'Apply failed' });
    } finally {
      setBusyId(null);
    }
  }

  async function bulkApplyTodo() {
    const todos = filtered.filter(i => i.status === 'todo');
    if (!todos.length) { toast.info('Nothing in todo to apply'); return; }
    if (!confirm(`Apply ${todos.length} link${todos.length === 1 ? '' : 's'} now? This will edit page content.`)) return;
    for (const t of todos) {
      // sequential to avoid hammering edge function
      // eslint-disable-next-line no-await-in-loop
      await applyOne(t.id);
    }
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-between bg-white border rounded-lg p-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-[#1e3a5f]" />
          <span className="font-semibold text-[#1e3a5f]">Internal Linking Opportunities</span>
          <Badge variant="secondary" className="ml-2">{counts.todo} todo</Badge>
          {counts.applied > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0">{counts.applied} applied</Badge>}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-[#1e3a5f]/10 flex items-center justify-center">
            <Link2 className="h-4 w-4 text-[#1e3a5f]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1e3a5f] text-sm flex items-center gap-2">
              Internal Linking Opportunities
              <Sparkles className="h-3 w-3 text-[#FFB547]" />
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {counts.total} total · {counts.todo} todo · {counts.applied} applied · {counts.failed} failed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-8">
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCollapsed(true)} className="h-8 w-8 p-0">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters & bulk actions */}
      <div className="p-3 border-b flex flex-wrap items-center gap-2 bg-slate-50/50">
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open ({counts.todo + counts.in_progress + counts.failed})</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="All clusters" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clusters</SelectItem>
            {clusters.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={bulkApplyTodo} disabled={!!busyId} className="h-8 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
          <Check className="h-3.5 w-3.5 mr-1" />
          Apply all visible todo
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading opportunities…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No opportunities match. Run Bach's <strong>Internal Linking</strong> quick action above to generate some.
        </div>
      ) : (
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {filtered.map(opp => (
            <div key={opp.id} className="p-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge className={`text-[10px] border ${PRIORITY_STYLE[opp.priority]}`} variant="outline">
                      {opp.priority.toUpperCase()}
                    </Badge>
                    <Badge className={`text-[10px] border ${STATUS_STYLE[opp.status]}`} variant="outline">
                      {opp.status.replace('_', ' ')}
                    </Badge>
                    {opp.cluster && (
                      <Badge variant="secondary" className="text-[10px] font-normal">{opp.cluster}</Badge>
                    )}
                    {opp.apply_method === 'manual_static' && (
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200" variant="outline">
                        Static page — manual edit
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm font-medium text-[#1e3a5f] flex flex-wrap items-center gap-1 leading-snug">
                    <a href={opp.source_url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1 break-all">
                      {opp.source_url}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                    <span className="text-muted-foreground">→</span>
                    <a href={opp.target_url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1 break-all">
                      {opp.target_url}
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  </div>
                  {opp.anchor_text && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Anchor: <span className="text-foreground font-medium">"{opp.anchor_text}"</span>
                    </div>
                  )}
                  {opp.reason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{opp.reason}</p>
                  )}
                  {opp.apply_error && (
                    <div className="mt-1.5 text-[11px] text-rose-700 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span>{opp.apply_error}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {opp.status !== 'applied' && (
                    <Button
                      size="sm"
                      onClick={() => applyOne(opp.id)}
                      disabled={busyId === opp.id}
                      className="h-7 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-xs"
                    >
                      {busyId === opp.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Apply
                        </>
                      )}
                    </Button>
                  )}
                  {opp.status !== 'applied' && opp.status !== 'skipped' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus(opp.id, 'skipped')}
                      className="h-7 text-xs text-muted-foreground"
                      title="Skip"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {(opp.status === 'applied' || opp.status === 'skipped') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStatus(opp.id, 'todo', { apply_error: null })}
                      className="h-7 text-xs text-muted-foreground"
                      title="Reopen"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
