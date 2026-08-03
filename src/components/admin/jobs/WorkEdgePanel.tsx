import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  RefreshCw, ExternalLink, Image, Video, FileText, Mic, Camera, 
  Upload, AlertCircle, Plus, Link2, Link2Off
} from 'lucide-react';
import { format } from 'date-fns';
import { LinkWorkEdgeDialog } from './LinkWorkEdgeDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface WorkEdgePanelProps {
  jobId: string;
  workedgeProjectId: string | null;
  jobNumber?: string;
  jobTitle?: string;
}

interface ProjectMedia {
  id: string;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  captured_by: string | null;
  captured_at: string | null;
}

export function WorkEdgePanel({ jobId, workedgeProjectId, jobNumber, jobTitle }: WorkEdgePanelProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['integration_config', 'workedge'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('integration_name', 'workedge')
        .single();
      if (error) return null;
      return data;
    }
  });

  const { data: media = [], isLoading: mediaLoading, refetch: refetchMedia } = useQuery({
    queryKey: ['workedge_project_media', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workedge_project_media')
        .select('*')
        .eq('job_id', jobId)
        .order('captured_at', { ascending: false });
      if (error) throw error;
      return data as ProjectMedia[];
    },
    enabled: !!workedgeProjectId
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('workedge-sync', {
        body: { action: 'create-project', jobId }
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', jobId] });
      toast.success('Project created in WorkEdge');
    },
    onError: (error) => toast.error('Failed to create project: ' + error.message)
  });

  const syncMediaMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('workedge-sync', {
        body: { 
          action: 'get-project-media', 
          jobId, 
          workedgeProjectId 
        }
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      refetchMedia();
      toast.success(`Synced ${data.media_count || 0} media items`);
    },
    onError: (error) => toast.error('Failed to sync media: ' + error.message)
  });

  const unlinkProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('workedge-sync', {
        body: { action: 'unlink-project', jobId }
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_job', jobId] });
      toast.success('WorkEdge project unlinked');
    },
    onError: (error) => toast.error('Failed to unlink: ' + error.message)
  });

  const mediaTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'voice_note': return <Mic className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <Camera className="h-4 w-4" />;
    }
  };

  // Integration not configured
  if (!config?.is_active) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">WorkEdge integration not configured</p>
          <Button variant="link" size="sm" onClick={() => window.location.href = '/admin/workedge'}>
            Configure Integration →
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Not linked to WorkEdge yet
  if (!workedgeProjectId) {
    return (
      <>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              WorkEdge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                Not linked to WorkEdge yet
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => createProjectMutation.mutate()}
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLinkDialog(true)}
                  disabled={createProjectMutation.isPending}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Existing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <LinkWorkEdgeDialog
          open={showLinkDialog}
          onOpenChange={setShowLinkDialog}
          jobId={jobId}
          onLinked={() => {
            queryClient.invalidateQueries({ queryKey: ['crm_job', jobId] });
            setShowLinkDialog(false);
          }}
        />
      </>
    );
  }

  // Linked - show media
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            WorkEdge
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {workedgeProjectId}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => syncMediaMutation.mutate()}
              disabled={syncMediaMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${syncMediaMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={unlinkProjectMutation.isPending}
                >
                  <Link2Off className="h-4 w-4 text-muted-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlink WorkEdge Project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the connection between this job and the WorkEdge project. 
                    The project will not be deleted from WorkEdge, but synced media will be removed locally.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => unlinkProjectMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Unlink
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {(jobNumber || jobTitle) && (
          <p className="text-xs text-muted-foreground mt-1">
            Project: {[jobNumber, jobTitle].filter(Boolean).join(' - ')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {mediaLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading media...</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {[
                { label: 'Photos', count: media.filter(m => m.media_type === 'photo').length },
                { label: 'Videos', count: media.filter(m => m.media_type === 'video').length },
                { label: 'Files', count: media.filter(m => m.media_type === 'document').length },
                { label: 'Notes', count: media.filter(m => m.media_type === 'note' || m.media_type === 'voice_note').length },
              ].map(c => `${c.count} ${c.label}`).join('  ·  ')}
            </p>
            {media.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMediaMutation.mutate()}
                disabled={syncMediaMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync from WorkEdge
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              asChild
            >
              <a 
                href={`https://workedge.pro/projects/${workedgeProjectId}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open in WorkEdge
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
