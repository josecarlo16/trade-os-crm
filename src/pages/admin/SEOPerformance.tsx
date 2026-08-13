import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, RefreshCw, MousePointerClick, Eye, Percent, TrendingUp, ArrowLeft, ExternalLink, Download } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { toast } from 'sonner';

interface SiteMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageMetric {
  page_path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface QueryMetric {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

type Range = '7d' | '28d' | '90d';

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const SEOPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [range, setRange] = useState<Range>('28d');
  const [siteMetrics, setSiteMetrics] = useState<SiteMetric[]>([]);
  const [pageMetrics, setPageMetrics] = useState<PageMetric[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<QueryMetric[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [siteRes, pageRes, queryRes] = await Promise.all([
        supabase.from('gsc_site_metrics' as any).select('*').order('date', { ascending: true }),
        supabase.from('gsc_page_metrics' as any).select('*').eq('date_range', '28d').order('clicks', { ascending: false }).limit(50),
        supabase.from('gsc_query_metrics' as any).select('*').eq('date_range', '28d').order('clicks', { ascending: false }).limit(50),
      ]);

      if (siteRes.error) throw siteRes.error;
      if (pageRes.error) throw pageRes.error;
      if (queryRes.error) throw queryRes.error;

      setSiteMetrics((siteRes.data as any) || []);
      setPageMetrics((pageRes.data as any) || []);
      setQueryMetrics((queryRes.data as any) || []);

      const latestSync = (pageRes.data as any)?.[0]?.last_synced_at || (queryRes.data as any)?.[0]?.last_synced_at;
      if (latestSync) setLastSync(latestSync);
    } catch (err: any) {
      toast.error('Failed to load GSC data', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-gsc-performance');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');
      toast.success('GSC sync complete', {
        description: `${data.site_days} days · ${data.pages} pages · ${data.queries} queries`,
      });
      await fetchData();
    } catch (err: any) {
      toast.error('Sync failed', { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Filter site metrics by range
  const filteredSite = useMemo(() => {
    if (siteMetrics.length === 0) return [];
    const days = range === '7d' ? 7 : range === '28d' ? 28 : 90;
    const cutoff = subDays(new Date(), days + 3);
    return siteMetrics.filter(m => parseISO(m.date) >= cutoff);
  }, [siteMetrics, range]);

  // Aggregated KPIs over selected range
  const kpis = useMemo(() => {
    if (filteredSite.length === 0) {
      return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    }
    const totalClicks = filteredSite.reduce((s, m) => s + m.clicks, 0);
    const totalImpressions = filteredSite.reduce((s, m) => s + m.impressions, 0);
    const avgPosition = filteredSite.reduce((s, m) => s + m.position, 0) / filteredSite.length;
    const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    return { clicks: totalClicks, impressions: totalImpressions, ctr, position: avgPosition };
  }, [filteredSite]);

  const chartData = useMemo(() =>
    filteredSite.map(m => ({
      date: format(parseISO(m.date), 'MMM d'),
      Clicks: m.clicks,
      Impressions: m.impressions,
    })), [filteredSite]);

  if (loading) {
    return (
      <AdminLayout title="SEO Performance">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  const hasData = siteMetrics.length > 0 || pageMetrics.length > 0;

  return (
    <AdminLayout title="SEO Performance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/seo"><ArrowLeft className="h-4 w-4 mr-1" />Back to SEO</Link>
            </Button>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                Last synced: {format(new Date(lastSync), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="28d">Last 28 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        </div>

        {!hasData && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-900 font-medium">No GSC data yet</p>
            <p className="text-sm text-amber-800 mt-1">Click "Sync Now" to fetch your latest Search Console performance data.</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={MousePointerClick} label="Total Clicks" value={kpis.clicks.toLocaleString()} color="text-blue-600" />
          <KpiCard icon={Eye} label="Total Impressions" value={kpis.impressions.toLocaleString()} color="text-purple-600" />
          <KpiCard icon={Percent} label="Average CTR" value={`${(kpis.ctr * 100).toFixed(2)}%`} color="text-green-600" />
          <KpiCard icon={TrendingUp} label="Average Position" value={kpis.position.toFixed(1)} color="text-orange-600" />
        </div>

        {/* Time-series chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4">Performance over time</h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Clicks" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Impressions" stroke="hsl(280 65% 60%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Queries + Top Pages side-by-side */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Top Queries (28d)</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCSV(
                  'top-queries-28d.csv',
                  ['Query', 'Clicks', 'Impressions', 'CTR', 'Position'],
                  queryMetrics.map(q => [q.query, q.clicks, q.impressions, (q.ctr * 100).toFixed(2) + '%', q.position.toFixed(1)]),
                )}
                disabled={queryMetrics.length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Pos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryMetrics.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No queries</TableCell></TableRow>
                  ) : queryMetrics.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm max-w-[200px] truncate" title={q.query}>{q.query}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{q.clicks}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{q.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{(q.ctr * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-sm">{q.position.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Top Pages (28d)</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportCSV(
                  'top-pages-28d.csv',
                  ['Page', 'Clicks', 'Impressions', 'CTR', 'Position'],
                  pageMetrics.map(p => [p.page_path, p.clicks, p.impressions, (p.ctr * 100).toFixed(2) + '%', p.position.toFixed(1)]),
                )}
                disabled={pageMetrics.length === 0}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impr.</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Pos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageMetrics.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pages</TableCell></TableRow>
                  ) : pageMetrics.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm max-w-[220px]">
                        <a href={p.page_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#1e3a5f] truncate" title={p.page_path}>
                          <span className="truncate">{p.page_path}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{p.clicks}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{p.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{(p.ctr * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-sm">{p.position.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const KpiCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <div className="bg-white p-4 rounded-lg border">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className={`h-4 w-4 ${color}`} />
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default SEOPerformance;
