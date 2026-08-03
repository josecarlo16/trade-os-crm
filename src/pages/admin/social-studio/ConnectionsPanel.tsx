import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, AlertCircle, Clock, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Connection {
  id: string;
  platform: string;
  display_name: string | null;
  account_id: string | null;
  is_connected: boolean;
  live_enabled: boolean;
  token_status: string;
  token_expires_at: string | null;
  last_checked_at: string | null;
  last_check_detail: string | null;
}

const PLATFORM_META: Record<string, {
  label: string;
  secrets: string[];
  todayCopy: string;
  afterGateCopy: string;
  gateBadge: (live: boolean) => { text: string; tone: 'green' | 'amber' | 'red' };
}> = {
  facebook: {
    label: 'Facebook Page',
    secrets: ['META_APP_ID', 'META_APP_SECRET', 'FACEBOOK_PAGE_TOKEN', 'FB_PAGE_ID'],
    todayCopy: 'Live publishing enabled. Text, link, and photo posts publish directly to the Page feed.',
    afterGateCopy: 'No further gate — Facebook is the day-one publisher.',
    gateBadge: (live) => live
      ? { text: 'Live publishing enabled', tone: 'green' }
      : { text: 'Live publishing OFF', tone: 'amber' },
  },
  instagram: {
    label: 'Instagram',
    secrets: ['META_APP_ID', 'META_APP_SECRET', 'FACEBOOK_PAGE_TOKEN', 'IG_USER_ID'],
    todayCopy: 'Connected only — until Meta App Review clears `instagram_business_content_publish`, real posts are blocked. Posts route to draft_only.',
    afterGateCopy: 'After review: two-step container publish (media → media_publish) using public image URLs.',
    gateBadge: (live) => live
      ? { text: 'Live publishing enabled', tone: 'green' }
      : { text: 'Connected — pending Meta App Review', tone: 'amber' },
  },
  tiktok: {
    label: 'TikTok',
    secrets: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_ACCESS_TOKEN'],
    todayCopy: 'Until TikTok audit clears, posts route to Creator\'s Draft (lands in the account inbox to finish manually).',
    afterGateCopy: 'After audit: Direct Post mode honors creator_info privacy options for public publishing.',
    gateBadge: (live) => live
      ? { text: 'Direct Post enabled', tone: 'green' }
      : { text: 'Connected — Creator\'s Draft only until audit', tone: 'amber' },
  },
  google_business: {
    label: 'Google Business Profile',
    secrets: ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN', 'GBP_ACCOUNT_ID', 'GBP_LOCATION_ID'],
    todayCopy: 'GBP API access is gated by Google quota. Until granted, posts route to draft_only.',
    afterGateCopy: 'After quota grant: localPosts.create writes directly to the verified business location.',
    gateBadge: (live) => live
      ? { text: 'Live publishing enabled', tone: 'green' }
      : { text: 'Connected — pending Google API access grant', tone: 'amber' },
  },
};

const PLATFORM_ORDER = ['facebook', 'instagram', 'tiktok', 'google_business'];

function tokenStatusBadge(status: string) {
  const map: Record<string, { tone: 'green' | 'amber' | 'red' | 'muted'; icon: any; text: string }> = {
    valid: { tone: 'green', icon: CheckCircle2, text: 'Token valid' },
    expired: { tone: 'amber', icon: Clock, text: 'Token expired' },
    error: { tone: 'red', icon: AlertCircle, text: 'Token error' },
    none: { tone: 'muted', icon: Link2, text: 'No token' },
  };
  return map[status] || map.none;
}

const toneClass: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  amber: 'bg-amber-100 text-amber-900 border-amber-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  muted: 'bg-muted text-muted-foreground border-border',
};

export function ConnectionsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [confirmFlip, setConfirmFlip] = useState<{ platform: string; nextValue: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_social_connections')
      .select('*')
      .order('platform');
    if (error) toast({ title: 'Failed to load connections', description: error.message, variant: 'destructive' });
    else setRows((data as Connection[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const testConnection = async (platform: string) => {
    setChecking(platform);
    try {
      const { data, error } = await supabase.functions.invoke('social-connection-check', {
        body: { platform },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `${PLATFORM_META[platform].label}: ${data.status}`, description: data.detail });
      await load();
    } catch (e) {
      toast({ title: 'Check failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setChecking(null);
    }
  };

  const flipLive = async () => {
    if (!confirmFlip) return;
    const { platform, nextValue } = confirmFlip;
    const { error } = await supabase
      .from('crm_social_connections')
      .update({ live_enabled: nextValue })
      .eq('platform', platform);
    setConfirmFlip(null);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${PLATFORM_META[platform].label}: live publishing ${nextValue ? 'ENABLED' : 'disabled'}` });
      await load();
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const ordered = PLATFORM_ORDER
    .map(p => rows.find(r => r.platform === p))
    .filter(Boolean) as Connection[];

  return (
    <div className="space-y-4">
      {ordered.map(row => {
        const meta = PLATFORM_META[row.platform];
        const gate = meta.gateBadge(row.live_enabled);
        const token = tokenStatusBadge(row.token_status);
        const TokenIcon = token.icon;
        return (
          <Card key={row.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg">{meta.label}</CardTitle>
                  <CardDescription>
                    {row.display_name ? <>Connected as <span className="font-medium">{row.display_name}</span></> : 'Not yet verified'}
                    {row.last_checked_at && <> · Last checked {format(new Date(row.last_checked_at), 'MMM d, h:mm a')}</>}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`border ${toneClass[token.tone]} gap-1`}>
                    <TokenIcon className="w-3 h-3" /> {token.text}
                  </Badge>
                  <Badge className={`border ${toneClass[gate.tone]}`}>{gate.text}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {row.last_check_detail && (
                <p className="text-sm text-muted-foreground">{row.last_check_detail}</p>
              )}

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Today</p>
                  <p className="text-muted-foreground">{meta.todayCopy}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">After gate clears</p>
                  <p className="text-muted-foreground">{meta.afterGateCopy}</p>
                </div>
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs">
                <p className="font-medium mb-1">Required secrets (set in Supabase function env):</p>
                <code className="text-xs">{meta.secrets.join(', ')}</code>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                <Button variant="outline" size="sm" disabled={checking === row.platform} onClick={() => testConnection(row.platform)}>
                  {checking === row.platform ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                  Test Connection
                </Button>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">Live publishing</span>
                  <Switch
                    checked={row.live_enabled}
                    onCheckedChange={(checked) => setConfirmFlip({ platform: row.platform, nextValue: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={!!confirmFlip} onOpenChange={(o) => !o && setConfirmFlip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmFlip?.nextValue ? 'Enable live publishing?' : 'Disable live publishing?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmFlip?.nextValue
                ? `Only flip this on once ${confirmFlip && PLATFORM_META[confirmFlip.platform].label}'s review / audit / quota has actually been granted. While on, the publish adapter will send real posts.`
                : `New posts to ${confirmFlip && PLATFORM_META[confirmFlip.platform].label} will route to draft_only until re-enabled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={flipLive}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
