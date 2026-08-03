import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Link2, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LinkWorkEdgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  onLinked: () => void;
}

interface WorkEdgeProject {
  id: string;
  name: string;
  client_name?: string;
  property_address?: string;
  project_type?: string;
  created_at?: string;
}

export function LinkWorkEdgeDialog({ open, onOpenChange, jobId, onLinked }: LinkWorkEdgeDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['workedge_projects'],
    queryFn: async () => {
      const response = await supabase.functions.invoke('workedge-sync', {
        body: { action: 'list-projects' }
      });
      if (response.error) throw new Error(response.error.message);
      
      // Handle nested response: { projects: { projects: [...] } }
      const data = response.data;
      if (Array.isArray(data)) return data as WorkEdgeProject[];
      if (Array.isArray(data?.projects?.projects)) return data.projects.projects as WorkEdgeProject[];
      if (Array.isArray(data?.projects)) return data.projects as WorkEdgeProject[];
      if (Array.isArray(data?.items)) return data.items as WorkEdgeProject[];
      return [];
    },
    enabled: open
  });

  const linkMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await supabase.functions.invoke('workedge-sync', {
        body: { action: 'link-project', jobId, workedgeProjectId: projectId }
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Project linked successfully');
      queryClient.invalidateQueries({ queryKey: ['crm_job', jobId] });
      onLinked();
    },
    onError: (error) => toast.error('Failed to link project: ' + error.message)
  });

  const filteredProjects = projects.filter(project => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.client_name?.toLowerCase().includes(query) ||
      project.property_address?.toLowerCase().includes(query) ||
      project.id?.toLowerCase().includes(query)
    );
  });

  const handleManualLink = () => {
    if (!manualId.trim()) {
      toast.error('Please enter a project ID');
      return;
    }
    linkMutation.mutate(manualId.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Existing WorkEdge Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Projects List */}
          <ScrollArea className="h-[250px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p className="text-sm">
                  {searchQuery ? 'No matching projects found' : 'No projects available'}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => linkMutation.mutate(project.id)}
                    disabled={linkMutation.isPending}
                    className="w-full text-left p-3 rounded-md border hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        {project.client_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {project.client_name}
                          </p>
                        )}
                        {project.property_address && (
                          <p className="text-xs text-muted-foreground truncate">
                            {project.property_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Manual ID Entry */}
          <div className="pt-2 border-t">
            <Label className="text-sm text-muted-foreground">Or enter Project ID manually:</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="e.g., abc123..."
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualLink()}
              />
              <Button
                onClick={handleManualLink}
                disabled={linkMutation.isPending || !manualId.trim()}
              >
                {linkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Link'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
