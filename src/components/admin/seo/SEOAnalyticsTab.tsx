import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, ArrowUpDown, MessageSquare, BarChart3, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type DateRange = '7d' | '30d' | '90d';

interface Ga4Page {
  page_path: string;
  date_range: DateRange;
  sessions: number;
  users: number;
  avg_engagement_seconds: number | null;
  conversions: number;
  bounce_rate: number | null;
}

interface Ga4Source {
  source: string;
  date_range: DateRange;
  sessions: number;
}

interface PageSeoLite {
  page_path: string;
  page_name: string;
  avg_position: number | null;
  gsc_clicks: number | null;
}

// Hardcoded — GA4 measurement IDs are public; safe to commit. Matches
// src/lib/analytics.ts so the front-end pixel and the admin Analytics
// tab gate stay in sync.
const MEASUREMENT_ID = 'G-C8RCHPZDQC';

function formatSeconds(s: number | null | undefined): string {
  const n = Math.round(Number(s ?? 0));
  if (!n) return '0s';
  const m = Math.floor(n / 60);
  const r = n % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

function dispatchAskBach(prompt: string) {
  window.dispatchEvent(new CustomEvent('seo-bach-ask', { detail: { prompt, autoSubmit: true } }));
  document.querySelector('[data-seo-bach-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export const SEOAnalyticsTab = () => {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'sessions' | 'users' | 'conversions' | 'bounce_rate' | 'avg_position' | 'gsc_clicks'>('sessions');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [syncing, setSyncing] = useState(false);

  const { data: pages, isLoading: loadingPages, refetch: refetchPages } = useQuery({
    queryKey: ['ga4_page_metrics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_page_metrics')
        .select('page_path, date_range, sessions, users, avg_engagement_seconds, conversions, bounce_rate')
        .eq('date_range', dateRange);
      if (error) throw error;
      return (data ?? []) as Ga4Page[];
    },
    enabled: !!MEASUREMENT_ID,
  });

  const { data: sources, isLoading: loadingSources, refetch: refetchSources } = useQuery({
    queryKey: ['ga4_traffic_sources', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ga4_traffic_sources')
        .select('source, date_range, sessions')
        .eq('date_range', dateRange)
        .order('sessions', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as Ga4Source[];
    },
    enabled: !!MEASUREMENT_ID,
  });

  const { data: seoIndex } = useQuery({
    queryKey: ['page_seo_lite_for_ga4'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_seo')
        .select('page_path, page_name, avg_position, gsc_clicks');
      if (error) throw error;
      const map = new Map<string, PageSeoLite>();
      (data ?? []).forEach((p: any) => map.set(p.page_path, p));
      return map;
    },
    enabled: !!MEASUREMENT_ID,
  });

  const totals = useMemo(() => {
    const list = pages ?? [];
    const sessions = list.reduce((s, p) => s + p.sessions, 0);
    const users = list.reduce((s, p) => s + p.users, 0);
    const conversions = list.reduce((s, p) => s + p.conversions, 0);
    const engagementWeighted = list.reduce((s, p) => s + (p.avg_engagement_seconds ?? 0) * p.users, 0);
    const avgEngagement = users > 0 ? engagementWeighted / users : 0;
    return { sessions, users, conversions, avgEngagement };
  }, [pages]);

  const merged = useMemo(() => {
    const list = pages ?? [];
    return list.map((p) => {
      const seo = seoIndex?.get(p.page_path);
      return {
        ...p,
        page_name: seo?.page_name ?? p.page_path,
        avg_position: seo?.avg_position ?? null,
        gsc_clicks: seo?.gsc_clicks ?? null,
      };
    });
  }, [pages, seoIndex]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = merged;
    if (q) rows = rows.filter((r) => r.page_path.toLowerCase().includes(q) || r.page_name.toLowerCase().includes(q));
    rows = [...rows].sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      return sortDir === 'desc' ? Number(vb) - Number(va) : Number(va) - Number(vb);
    });
    return rows;
  }, [merged, search, sortKey, sortDir]);

  const underperforming = useMemo(() => {
    const list = pages ?? [];
    if (!list.length) return [];
    const med = median(list.map((p) => p.sessions));
    return list
      .filter((p) => p.sessions > med && p.conversions === 0)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);
  }, [pages]);

  const maxSourceSessions = useMemo(
    () => Math.max(1, ...((sources ?? []).map((s) => s.sessions))),
    [sources],
  );

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ga4-metrics');
      if (error) throw error;
      if ((data as any)?.success === false) throw new Error((data as any).error || 'Sync failed');
      toast.success('GA4 sync complete');
      await Promise.all([refetchPages(), refetchSources()]);
    } catch (e: any) {
      toast.error(`Sync failed: ${e?.message ?? e}`);
    } finally {
      setSyncing(false);
    }
  }

  if (!MEASUREMENT_ID) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Analytics setup required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>To enable the Analytics tab, complete these steps:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Set the Vite env var <code className="bg-muted px-1 rounded">VITE_GA4_MEASUREMENT_ID</code> to your GA4 measurement ID (e.g. <code className="bg-muted px-1 rounded">G-XXXXXXX</code>) and redeploy.</li>
            <li>Add the secret <code className="bg-muted px-1 rounded">GA4_PROPERTY_ID</code> with your numeric GA4 property ID.</li>
            <li>In Google Cloud, enable the <strong>Google Analytics Data API</strong> in the same project as the existing GSC service account.</li>
            <li>In GA4 → Admin → Property Access Management, add the GSC service account email as a Viewer.</li>
            <li>Click Run Sync (after redeploy) to populate the first batch of metrics.</li>
          </ol>
          <p className="text-muted-foreground">Admin routes (<code>/admin/*</code>) are excluded from GA4 at the code level — your internal usage will not be tracked.</p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = loadingPages || loadingSources;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={runSync} disabled={syncing} variant="outline" size="sm">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run Sync Now
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Sessions" value={totals.sessions.toLocaleString()} />
        <StatCard label="Users" value={totals.users.toLocaleString()} />
        <StatCard label="Avg Engagement" value={formatSeconds(totals.avgEngagement)} />
        <StatCard label="Conversions" value={totals.conversions.toLocaleString()} />
      </div>

      {/* Top performing pages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Top Performing Pages</CardTitle>
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No data yet. Click <strong>Run Sync Now</strong> to fetch the first batch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <SortHead label="Sessions" k="sessions" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHead label="Users" k="users" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHead label="Conversions" k="conversions" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHead label="Bounce Rate" k="bounce_rate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHead label="Avg Position" k="avg_position" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                    <SortHead label="GSC Clicks" k="gsc_clicks" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((r) => (
                    <TableRow key={r.page_path}>
                      <TableCell className="max-w-[280px]">
                        <div className="font-medium truncate">{r.page_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.page_path}</div>
                      </TableCell>
                      <TableCell>{r.sessions.toLocaleString()}</TableCell>
                      <TableCell>{r.users.toLocaleString()}</TableCell>
                      <TableCell>{r.conversions.toLocaleString()}</TableCell>
                      <TableCell>{r.bounce_rate != null ? `${(r.bounce_rate * 100).toFixed(1)}%` : '—'}</TableCell>
                      <TableCell>{r.avg_position != null ? r.avg_position : '—'}</TableCell>
                      <TableCell>{r.gsc_clicks ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: underperforming + traffic sources */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Underperforming High-Traffic
            </CardTitle>
          </CardHeader>
          <CardContent>
            {underperforming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No high-traffic pages with zero conversions in this range.</p>
            ) : (
              <div className="space-y-2">
                {underperforming.map((p) => (
                  <div key={p.page_path} className="flex items-center justify-between gap-3 p-2 rounded border">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{seoIndex?.get(p.page_path)?.page_name ?? p.page_path}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.page_path}</div>
                    </div>
                    <Badge variant="secondary">{p.sessions.toLocaleString()} sessions</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dispatchAskBach(
                        `This page has ${p.sessions} sessions in the last ${dateRange} but no conversions. What's the conversion gap? Page: ${p.page_path}`,
                      )}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" /> Ask Bach
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {(sources ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No source data yet.</p>
            ) : (
              <div className="space-y-3">
                {(sources ?? []).map((s) => (
                  <div key={s.source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium truncate">{s.source}</span>
                      <span className="text-muted-foreground">{s.sessions.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(s.sessions / maxSourceSessions) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white p-4 rounded-lg border">
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

const SortHead = ({
  label, k, sortKey, sortDir, onClick,
}: {
  label: string;
  k: 'sessions' | 'users' | 'conversions' | 'bounce_rate' | 'avg_position' | 'gsc_clicks';
  sortKey: string;
  sortDir: 'asc' | 'desc';
  onClick: (k: any) => void;
}) => (
  <TableHead>
    <button
      type="button"
      onClick={() => onClick(k)}
      className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? 'opacity-100' : 'opacity-40'}`} />
      {sortKey === k && <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
    </button>
  </TableHead>
);
