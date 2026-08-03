import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageRow {
  id: string;
  page_path: string;
  page_name: string;
  index_status: string | null;
  gsc_clicks: number | null;
  gsc_impressions: number | null;
  avg_position: number | null;
  updated_at: string | null;
}

interface SnapshotRow {
  page_id: string;
  week_starting: string;
  clicks: number;
  impressions: number;
  avg_position: number | null;
}

type FilterKey = 'all' | 'striking' | 'indexed' | 'not_indexed' | 'low_ctr';
type SortKey = 'clicks' | 'impressions' | 'ctr' | 'position';
type SortDir = 'asc' | 'desc';

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase();

function isIndexed(s: string | null | undefined) {
  return norm(s) === 'indexed';
}
function isNotIndexed(s: string | null | undefined) {
  return ['not_indexed', 'not indexed', 'excluded'].includes(norm(s));
}

function ctrOf(p: PageRow): number {
  const imp = p.gsc_impressions ?? 0;
  if (!imp) return 0;
  return (p.gsc_clicks ?? 0) / imp;
}

function dispatchAskBach(prompt: string) {
  window.dispatchEvent(new CustomEvent('seo-bach-ask', { detail: { prompt, autoSubmit: true } }));
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
  children,
}: {
  label: string;
  value: React.ReactNode;
  tone: 'green' | 'red' | 'amber' | 'navy';
  icon: any;
  children?: React.ReactNode;
}) {
  const toneMap = {
    green: 'text-green-600 bg-green-50 ring-green-200',
    red: 'text-red-600 bg-red-50 ring-red-200',
    amber: 'text-amber-600 bg-amber-50 ring-amber-200',
    navy: 'text-[#1e3a5f] bg-[#1e3a5f]/5 ring-[#1e3a5f]/20',
  } as const;
  return (
    <Card>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold leading-tight mt-1 truncate">{value}</div>
          {children && <div className="mt-2">{children}</div>}
        </div>
        <span className={cn('h-9 w-9 rounded-md inline-flex items-center justify-center ring-1 shrink-0', toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function IndexBadge({ status }: { status: string | null }) {
  if (isIndexed(status)) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Indexed</Badge>;
  if (isNotIndexed(status)) return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Not Indexed</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>;
}

function SortHeader({
  label,
  field,
  sort,
  dir,
  onSort,
  align = 'left',
}: {
  label: string;
  field: SortKey;
  sort: SortKey;
  dir: SortDir;
  onSort: (f: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sort === field;
  return (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium hover:text-foreground transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        {active ? (
          dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export function SEOSearchConsoleTab() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('clicks');
  const [dir, setDir] = useState<SortDir>('desc');

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ data: p, error: pe }, { data: s, error: se }] = await Promise.all([
        supabase
          .from('page_seo' as any)
          .select('id, page_path, page_name, index_status, gsc_clicks, gsc_impressions, avg_position, updated_at'),
        supabase
          .from('page_seo_gsc_snapshots' as any)
          .select('page_id, week_starting, clicks, impressions, avg_position')
          .order('week_starting', { ascending: false }),
      ]);
      if (pe) throw pe;
      if (se) throw se;
      setPages((p as unknown as PageRow[]) || []);
      setSnapshots((s as unknown as SnapshotRow[]) || []);
    } catch (e: any) {
      toast.error('Failed to load Search Console data', { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // Stats
  const indexedCount = pages.filter(p => isIndexed(p.index_status)).length;
  const notIndexedCount = pages.filter(p => isNotIndexed(p.index_status)).length;
  const pendingCount = pages.length - indexedCount - notIndexedCount;
  const lastSyncAt = useMemo(() => {
    const withStatus = pages.filter(p => p.index_status && p.updated_at);
    if (!withStatus.length) return null;
    return withStatus
      .map(p => new Date(p.updated_at as string).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
  }, [pages]);

  async function runSync() {
    setSyncing(true);
    const t = toast.loading('Syncing with Google Search Console…');
    try {
      const { data, error } = await supabase.functions.invoke('sync-gsc-index-status');
      if (error) throw error;
      const d: any = data || {};
      toast.success('GSC sync complete', {
        id: t,
        description: `Checked ${d.checked ?? 0} · Indexed ${d.indexed ?? 0} · Snapshots ${d.snapshots_written ?? 0}`,
      });
      await fetchAll();
    } catch (e: any) {
      toast.error('GSC sync failed', { id: t, description: e?.message });
    } finally {
      setSyncing(false);
    }
  }

  function handleSort(f: SortKey) {
    if (sort === f) {
      setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(f);
      setDir('desc');
    }
  }

  const filtered = useMemo(() => {
    let rows = pages.slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(p => p.page_name.toLowerCase().includes(q) || p.page_path.toLowerCase().includes(q));
    }
    switch (filter) {
      case 'striking':
        rows = rows.filter(p => p.avg_position != null && p.avg_position >= 5 && p.avg_position <= 20);
        break;
      case 'indexed':
        rows = rows.filter(p => isIndexed(p.index_status));
        break;
      case 'not_indexed':
        rows = rows.filter(p => isNotIndexed(p.index_status));
        break;
      case 'low_ctr':
        rows = rows.filter(p => (p.gsc_impressions ?? 0) > 100 && ctrOf(p) < 0.02);
        break;
    }
    rows.sort((a, b) => {
      let av = 0, bv = 0;
      switch (sort) {
        case 'clicks': av = a.gsc_clicks ?? 0; bv = b.gsc_clicks ?? 0; break;
        case 'impressions': av = a.gsc_impressions ?? 0; bv = b.gsc_impressions ?? 0; break;
        case 'ctr': av = ctrOf(a); bv = ctrOf(b); break;
        case 'position': av = a.avg_position ?? 999; bv = b.avg_position ?? 999; break;
      }
      return dir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [pages, search, filter, sort, dir]);

  // Double-down lists
  const strikingTop = useMemo(
    () =>
      pages
        .filter(p => p.avg_position != null && p.avg_position >= 5 && p.avg_position <= 20)
        .sort((a, b) => (b.gsc_impressions ?? 0) - (a.gsc_impressions ?? 0))
        .slice(0, 5),
    [pages],
  );
  const lowCtrTop = useMemo(
    () =>
      pages
        .filter(p => (p.gsc_impressions ?? 0) > 100 && ctrOf(p) < 0.02)
        .sort((a, b) => (b.gsc_impressions ?? 0) - (a.gsc_impressions ?? 0))
        .slice(0, 5),
    [pages],
  );
  const indexedSilent = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return pages
      .filter(
        p =>
          isIndexed(p.index_status) &&
          (p.gsc_clicks ?? 0) === 0 &&
          p.updated_at &&
          new Date(p.updated_at).getTime() < cutoff,
      )
      .sort((a, b) => (b.gsc_impressions ?? 0) - (a.gsc_impressions ?? 0))
      .slice(0, 5);
  }, [pages]);

  // Movers — biggest WoW click increase + position improvement
  const movers = useMemo(() => {
    const byPage = new Map<string, SnapshotRow[]>();
    for (const s of snapshots) {
      const arr = byPage.get(s.page_id) ?? [];
      arr.push(s);
      byPage.set(s.page_id, arr);
    }
    const pageMap = new Map(pages.map(p => [p.id, p]));
    const clickMovers: { page: PageRow; delta: number; latest: number; prev: number }[] = [];
    const posMovers: { page: PageRow; delta: number; latest: number; prev: number }[] = [];
    byPage.forEach((arr, pageId) => {
      const sorted = arr.slice().sort((a, b) => (a.week_starting < b.week_starting ? 1 : -1));
      if (sorted.length < 2) return;
      const [latest, prev] = sorted;
      const page = pageMap.get(pageId);
      if (!page) return;
      const clickDelta = latest.clicks - prev.clicks;
      if (clickDelta > 0) clickMovers.push({ page, delta: clickDelta, latest: latest.clicks, prev: prev.clicks });
      const lp = latest.avg_position;
      const pp = prev.avg_position;
      if (lp != null && pp != null) {
        const posDelta = pp - lp; // positive = improved (lower number)
        if (posDelta > 0) posMovers.push({ page, delta: posDelta, latest: lp, prev: pp });
      }
    });
    clickMovers.sort((a, b) => b.delta - a.delta);
    posMovers.sort((a, b) => b.delta - a.delta);
    return { clickMovers: clickMovers.slice(0, 5), posMovers: posMovers.slice(0, 5) };
  }, [snapshots, pages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Indexed" tone="green" icon={CheckCircle2} value={indexedCount} />
        <StatCard label="Not Indexed" tone="red" icon={XCircle} value={notIndexedCount} />
        <StatCard label="Pending" tone="amber" icon={Clock} value={pendingCount} />
        <StatCard
          label="Last Sync"
          tone="navy"
          icon={RefreshCw}
          value={lastSyncAt ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true }) : '—'}
        >
          <Button
            size="sm"
            onClick={runSync}
            disabled={syncing}
            className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 h-8 text-xs"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {syncing ? 'Syncing…' : 'Run Sync Now'}
          </Button>
        </StatCard>
      </div>

      {/* Performance table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Performance</CardTitle>
              <CardDescription>Search Console metrics for tracked pages.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by page name or path…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-3">
            {([
              { k: 'all', label: 'All' },
              { k: 'striking', label: 'Striking Distance' },
              { k: 'indexed', label: 'Indexed' },
              { k: 'not_indexed', label: 'Not Indexed' },
              { k: 'low_ctr', label: 'High Impressions · Low CTR' },
            ] as { k: FilterKey; label: string }[]).map(c => (
              <button
                key={c.k}
                onClick={() => setFilter(c.k)}
                className={cn(
                  'text-xs px-3 py-1 rounded-full border transition-colors',
                  filter === c.k
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-muted-foreground border-border hover:border-[#FFB547] hover:text-[#1e3a5f]',
                )}
              >
                {c.label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto self-center">
              {filtered.length} of {pages.length} pages
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <SortHeader label="Clicks" field="clicks" sort={sort} dir={dir} onSort={handleSort} align="right" />
                  <SortHeader label="Impressions" field="impressions" sort={sort} dir={dir} onSort={handleSort} align="right" />
                  <SortHeader label="CTR" field="ctr" sort={sort} dir={dir} onSort={handleSort} align="right" />
                  <SortHeader label="Avg Pos" field="position" sort={sort} dir={dir} onSort={handleSort} align="right" />
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No pages match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(p => {
                    const ctr = ctrOf(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/admin/seo/${p.id}`} className="block">
                            <div className="font-medium text-sm text-[#1e3a5f] hover:underline truncate max-w-[280px]">{p.page_name}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[280px]">{p.page_path}</div>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.gsc_clicks ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.gsc_impressions ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {(p.gsc_impressions ?? 0) > 0 ? `${(ctr * 100).toFixed(2)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.avg_position != null ? p.avg_position.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell><IndexBadge status={p.index_status} /></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Double Down panel */}
      <div>
        <h3 className="text-sm font-semibold text-[#1e3a5f] mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#FFB547]" /> Double Down
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DoubleDownCard
            title="Striking Distance"
            description="Pages ranking 5–20 with the most impressions."
            icon={Target}
            tone="violet"
            rows={strikingTop.map(p => ({
              page: p,
              meta: `pos ${p.avg_position?.toFixed(1) ?? '—'} · ${p.gsc_impressions ?? 0} imp · ${p.gsc_clicks ?? 0} clicks`,
              prompt: `This page is in striking distance (position ${p.avg_position?.toFixed(1) ?? '—'}) with ${p.gsc_impressions ?? 0} impressions but only ${p.gsc_clicks ?? 0} clicks. What can we do to push it to page 1? Page: ${p.page_path}`,
            }))}
          />
          <DoubleDownCard
            title="Meta Description Wins"
            description="High impressions, CTR below 2%."
            icon={TrendingUp}
            tone="emerald"
            rows={lowCtrTop.map(p => ({
              page: p,
              meta: `${p.gsc_impressions ?? 0} imp · ${(ctrOf(p) * 100).toFixed(2)}% CTR · pos ${p.avg_position?.toFixed(1) ?? '—'}`,
              prompt: `This page has ${p.gsc_impressions ?? 0} impressions but only a ${(ctrOf(p) * 100).toFixed(2)}% CTR (avg position ${p.avg_position?.toFixed(1) ?? '—'}). Suggest a stronger meta title and description that would lift CTR. Page: ${p.page_path}`,
            }))}
          />
          <DoubleDownCard
            title="Indexed but Silent"
            description="Indexed > 30 days ago with zero clicks."
            icon={Zap}
            tone="rose"
            rows={indexedSilent.map(p => ({
              page: p,
              meta: `${p.gsc_impressions ?? 0} imp · 0 clicks`,
              prompt: `This page has been indexed for over 30 days but has 0 clicks (with ${p.gsc_impressions ?? 0} impressions). Diagnose the likely intent mismatch and suggest content or targeting changes. Page: ${p.page_path}`,
            }))}
          />
        </div>
      </div>

      {/* Movers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#1e3a5f]" /> Movers (Week over Week)
          </CardTitle>
          <CardDescription>
            Snapshots from <code className="text-xs">page_seo_gsc_snapshots</code> — needs at least two weeks of data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MoverList
              title="Biggest Click Gains"
              empty="No click increases yet — run sync at least twice across two weeks."
              rows={movers.clickMovers.map(m => ({
                page: m.page,
                primary: `+${m.delta} clicks`,
                secondary: `${m.prev} → ${m.latest}`,
              }))}
            />
            <MoverList
              title="Biggest Position Improvements"
              empty="No position movement yet — needs two weeks of snapshots."
              rows={movers.posMovers.map(m => ({
                page: m.page,
                primary: `▲ ${m.delta.toFixed(1)} positions`,
                secondary: `${m.prev.toFixed(1)} → ${m.latest.toFixed(1)}`,
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DoubleDownCard({
  title,
  description,
  icon: Icon,
  tone,
  rows,
}: {
  title: string;
  description: string;
  icon: any;
  tone: 'violet' | 'emerald' | 'rose';
  rows: { page: PageRow; meta: string; prompt: string }[];
}) {
  const toneMap = {
    violet: 'text-violet-600 bg-violet-50 ring-violet-200',
    emerald: 'text-emerald-600 bg-emerald-50 ring-emerald-200',
    rose: 'text-rose-600 bg-rose-50 ring-rose-200',
  } as const;
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-8 w-8 rounded-md inline-flex items-center justify-center ring-1', toneMap[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No matching pages.</p>
        ) : (
          rows.map(r => (
            <div key={r.page.id} className="flex items-start justify-between gap-3 p-2 rounded-md border bg-white">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/admin/seo/${r.page.id}`}
                  className="block text-xs font-medium text-[#1e3a5f] hover:underline truncate"
                >
                  {r.page.page_name}
                </Link>
                <div className="text-[10px] text-muted-foreground truncate">{r.meta}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] px-2 shrink-0"
                onClick={() => dispatchAskBach(r.prompt)}
              >
                <Sparkles className="h-3 w-3 mr-1 text-[#FFB547]" />
                Ask Bach
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MoverList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { page: PageRow; primary: string; secondary: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground mb-2">{title}</div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">{empty}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.page.id} className="flex items-center justify-between gap-3 p-2 rounded-md border bg-white">
              <Link
                to={`/admin/seo/${r.page.id}`}
                className="text-xs font-medium text-[#1e3a5f] hover:underline truncate flex-1 min-w-0"
              >
                {r.page.page_name}
              </Link>
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold text-green-600">{r.primary}</div>
                <div className="text-[10px] text-muted-foreground">{r.secondary}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
