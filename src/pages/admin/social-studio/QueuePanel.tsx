import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Send, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface QueueRow {
  id: string;
  post_id: string;
  platform: string;
  status: string;
  external_id: string | null;
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
  crm_social_posts: {
    title: string | null;
    body: string;
    scheduled_for: string | null;
  } | null;
}

interface ConnLite { platform: string; is_connected: boolean; token_status: string }

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
  posted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  draft_only: 'bg-amber-100 text-amber-900 border-amber-300',
};

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google_business: 'Google Business',
};

export function QueuePanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [conns, setConns] = useState<ConnLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<QueueRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, c] = await Promise.all([
      supabase.from('crm_social_post_targets')
        .select('id, post_id, platform, status, external_id, error_message, posted_at, created_at, crm_social_posts!inner(title, body, scheduled_for)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('crm_social_connections').select('platform, is_connected, token_status'),
    ]);
    if (t.error) toast({ title: 'Failed to load queue', description: t.error.message, variant: 'destructive' });
    else setRows((t.data as unknown as QueueRow[]) || []);
    if (!c.error) setConns((c.data as ConnLite[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (platformFilter === 'all' || r.platform === platformFilter)
  ), [rows, statusFilter, platformFilter]);

  const connOk = (platform: string) => {
    const c = conns.find(x => x.platform === platform);
    return c?.is_connected && c.token_status === 'valid';
  };

  const runPublish = async () => {
    if (!confirmRow) return;
    const row = confirmRow;
    setConfirmRow(null);
    setPublishing(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('social-publish', {
        body: { post_id: row.post_id, target_id: row.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `Publish: ${data.status}`, description: data.detail || '' });
      await load();
    } catch (e) {
      toast({ title: 'Publish failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setPublishing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>Publish Queue</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="draft_only">Draft only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {Object.entries(PLATFORM_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No targets match these filters.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>External</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const ok = connOk(r.platform);
                const canAct = r.status !== 'posted';
                return (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium truncate">{r.crm_social_posts?.title || '(untitled)'}</div>
                      {r.error_message && <div className="text-xs text-red-600 mt-1 line-clamp-2">{r.error_message}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{PLATFORM_LABEL[r.platform] || r.platform}</Badge></TableCell>
                    <TableCell><Badge className={`border ${STATUS_TONE[r.status] || ''}`}>{r.status}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {r.crm_social_posts?.scheduled_for ? format(new Date(r.crm_social_posts.scheduled_for), 'MMM d, h:mm a') : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.posted_at ? format(new Date(r.posted_at), 'MMM d, h:mm a') : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[10rem] truncate" title={r.external_id || ''}>
                      {r.external_id || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canAct || !ok || publishing === r.id}
                        title={!ok ? 'Connection not valid for this platform' : ''}
                        onClick={() => setConfirmRow(r)}
                      >
                        {publishing === r.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : r.status === 'failed'
                            ? <><RotateCcw className="w-3 h-3 mr-1" /> Retry</>
                            : <><Send className="w-3 h-3 mr-1" /> Publish now</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to {confirmRow && (PLATFORM_LABEL[confirmRow.platform] || confirmRow.platform)}?</AlertDialogTitle>
            <AlertDialogDescription>
              This invokes the live publish adapter. Depending on the platform's gate, the post will either go live, land in drafts, or fail with an error message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runPublish}>Confirm Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
