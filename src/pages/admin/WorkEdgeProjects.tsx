import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink, 
  Image, Video, FileText, Mic, Camera, Settings, Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface IntegrationConfig {
  id: string;
  integration_name: string;
  config: {
    api_url?: string;
    webhook_enabled?: boolean;
    team_id?: string;
  };
  is_active: boolean;
  last_sync_at: string | null;
}

interface SyncLog {
  id: string;
  entity_type: string;
  local_id: string;
  workedge_id: string | null;
  sync_direction: string;
  sync_status: string;
  error_message: string | null;
  synced_at: string;
}

interface ProjectMedia {
  id: string;
  job_id: string;
  workedge_project_id: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  captured_by: string | null;
  captured_at: string | null;
  synced_at: string;
  job?: {
    job_number: string;
    title: string;
  };
}

export default function WorkEdgeProjects() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('projects');

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['integration_config', 'workedge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('integration_name', 'workedge')
        .single();
      if (error) throw error;
      return data as IntegrationConfig;
    }
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['workedge_sync_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workedge_sync_log')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as SyncLog[];
    }
  });

  const { data: linkedJobs = [] } = useQuery({
    queryKey: ['workedge_linked_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select(`
          id, job_number, title, workedge_project_id, workedge_last_sync,
          customer:crm_customers(first_name, last_name, company_name),
          current_stage:crm_job_stages(name, color)
        `)
        .not('workedge_project_id', 'is', null)
        .order('workedge_last_sync', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: recentMedia = [] } = useQuery({
    queryKey: ['workedge_recent_media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workedge_project_media')
        .select(`
          *,
          job:crm_jobs(job_number, title)
        `)
        .order('synced_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ProjectMedia[];
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<IntegrationConfig>) => {
      const { error } = await supabase
        .from('integration_configs')
        .update(updates)
        .eq('integration_name', 'workedge');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration_config', 'workedge'] });
      toast.success('Configuration updated');
    },
    onError: (error) => toast.error('Failed to update: ' + error.message)
  });

  const syncProjectMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data: job } = await supabase
        .from('crm_jobs')
        .select('workedge_project_id')
        .eq('id', jobId)
        .single();

      const response = await supabase.functions.invoke('workedge-sync', {
        body: {
          action: 'get-project-media',
          jobId,
          workedgeProjectId: job?.workedge_project_id
        }
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workedge_recent_media'] });
      queryClient.invalidateQueries({ queryKey: ['workedge_linked_jobs'] });
      toast.success('Project synced');
    },
    onError: (error) => toast.error('Sync failed: ' + error.message)
  });

  const syncStats = {
    total: syncLogs.length,
    success: syncLogs.filter(l => l.sync_status === 'success').length,
    failed: syncLogs.filter(l => l.sync_status === 'failed').length,
    pending: syncLogs.filter(l => l.sync_status === 'pending').length
  };

  const mediaByType = {
    photo: recentMedia.filter(m => m.media_type === 'photo').length,
    video: recentMedia.filter(m => m.media_type === 'video').length,
    voice_note: recentMedia.filter(m => m.media_type === 'voice_note').length,
    document: recentMedia.filter(m => m.media_type === 'document').length
  };

  const mediaTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'voice_note': return <Mic className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Camera className="h-4 w-4" />;
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workedge-webhook`;

  return (
    <AdminLayout title="WorkEdge Projects">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WorkEdge Integration</h1>
            <p className="text-muted-foreground">Field documentation, photos, and equipment tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className={config?.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}>
              {config?.is_active ? 'Connected' : 'Disconnected'}
            </Badge>
            {config?.last_sync_at && (
              <span className="text-sm text-muted-foreground">
                Last sync: {format(new Date(config.last_sync_at), 'PPp')}
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{linkedJobs.length}</p>
                  <p className="text-sm text-muted-foreground">Linked Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{syncStats.success}</p>
                  <p className="text-sm text-muted-foreground">Successful Syncs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{syncStats.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed Syncs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentMedia.length}</p>
                  <p className="text-sm text-muted-foreground">Media Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="projects">Linked Projects</TabsTrigger>
            <TabsTrigger value="media">Field Media</TabsTrigger>
            <TabsTrigger value="logs">Sync Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Linked Projects */}
          <TabsContent value="projects" className="mt-6">
            {linkedJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Linked Projects</h3>
                  <p className="text-muted-foreground">
                    Sync jobs to WorkEdge from the Job Detail page to see them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>WorkEdge ID</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedJobs.map((job: any) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">{job.job_number}</span>
                            <p className="text-sm text-muted-foreground">{job.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.customer?.company_name || 
                           `${job.customer?.first_name} ${job.customer?.last_name}`}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            style={{ 
                              backgroundColor: job.current_stage?.color + '20', 
                              color: job.current_stage?.color 
                            }}
                          >
                            {job.current_stage?.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {job.workedge_project_id}
                        </TableCell>
                        <TableCell>
                          {job.workedge_last_sync && format(new Date(job.workedge_last_sync), 'PPp')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => syncProjectMutation.mutate(job.id)}
                            disabled={syncProjectMutation.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncProjectMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Field Media */}
          <TabsContent value="media" className="mt-6">
            {/* Media Type Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{mediaByType.photo} Photos</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-red-600" />
                  <span className="font-medium">{mediaByType.video} Videos</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">{mediaByType.voice_note} Voice Notes</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="font-medium">{mediaByType.document} Documents</span>
                </div>
              </Card>
            </div>

            {recentMedia.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Field Media Yet</h3>
                  <p className="text-muted-foreground">
                    Photos, videos, and notes from the field will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentMedia.map((media) => (
                  <Card key={media.id} className="overflow-hidden">
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      {media.thumbnail_url || media.media_url ? (
                        <img 
                          src={media.thumbnail_url || media.media_url!} 
                          alt={media.title || 'Field media'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.querySelector('.media-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="media-fallback flex-col items-center justify-center gap-1 text-muted-foreground"
                        style={{ display: media.thumbnail_url || media.media_url ? 'none' : 'flex' }}
                      >
                        {mediaTypeIcon(media.media_type)}
                        {(media.thumbnail_url || media.media_url) && (
                          <span className="text-[10px] text-orange-500">expired</span>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium truncate">{media.title || 'Untitled'}</p>
                      <p className="text-xs text-muted-foreground truncate">{media.job?.job_number}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sync Logs */}
          <TabsContent value="logs" className="mt-6">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>WorkEdge ID</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.synced_at), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.entity_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.sync_direction === 'push' ? 'default' : 'secondary'}>
                          {log.sync_direction}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.sync_status === 'success' && (
                          <Badge className="bg-green-500/10 text-green-600">Success</Badge>
                        )}
                        {log.sync_status === 'failed' && (
                          <Badge className="bg-red-500/10 text-red-600">Failed</Badge>
                        )}
                        {log.sync_status === 'pending' && (
                          <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.workedge_id || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-red-600 max-w-xs truncate">
                        {log.error_message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid gap-6 max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Status</CardTitle>
                  <CardDescription>Enable or disable the WorkEdge integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable WorkEdge Integration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow syncing jobs and receiving field data
                      </p>
                    </div>
                    <Switch
                      checked={config?.is_active}
                      onCheckedChange={(checked) => updateConfigMutation.mutate({ is_active: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>WorkEdge API settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input 
                      value={config?.config?.api_url || 'https://api.workedge.pro'} 
                      disabled
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key Status</Label>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-muted-foreground">
                        API key must be configured in Cloud secrets as WORKEDGE_API_KEY
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>Receive real-time updates from WorkEdge</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={webhookUrl} 
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl);
                          toast.success('Copied to clipboard');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add this URL to your WorkEdge webhook settings to receive photo uploads and project updates
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <Label>Enable Webhooks</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive real-time updates when photos are uploaded
                      </p>
                    </div>
                    <Switch
                      checked={config?.config?.webhook_enabled}
                      onCheckedChange={(checked) => 
                        updateConfigMutation.mutate({ 
                          config: { ...config?.config, webhook_enabled: checked } 
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href="https://workedge.pro" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open WorkEdge Dashboard
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
