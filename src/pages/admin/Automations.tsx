import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Plus, 
  Zap, 
  Play, 
  Pause,
  Trash2,
  Edit,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: any;
  conditions: any;
  actions: any;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AutomationLog {
  id: string;
  automation_id: string;
  trigger_event: any;
  actions_executed: any;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

const TRIGGER_TYPES = [
  { value: 'new_submission', label: 'New Submission', description: 'When a new form is submitted' },
  { value: 'pipeline_move', label: 'Pipeline Stage Change', description: 'When a lead moves stages' },
  { value: 'pipeline_won', label: 'Deal Won', description: 'When a deal is marked as won' },
  { value: 'job_created', label: 'Job Created', description: 'When a new job is created' },
  { value: 'job_stage_change', label: 'Job Stage Change', description: 'When a job moves to a new stage' },
  { value: 'job_scheduled', label: 'Job Scheduled', description: 'When a job is scheduled' },
  { value: 'job_completed', label: 'Job Completed', description: 'When a job is marked complete' },
];

const ACTION_TYPES = [
  { value: 'update_customer_status', label: 'Update Customer Status' },
  { value: 'create_job', label: 'Create Job' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'log_interaction', label: 'Log Interaction' },
  { value: 'webhook', label: 'Call Webhook' },
];

const AutomationsPage = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();

  // Form state for new automation
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newActions, setNewActions] = useState<string[]>([]);

  const fetchAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomations(data || []);
    } catch (error) {
      console.error('Error fetching automations:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAutomations(), fetchLogs()]);
      setLoading(false);
    };

    if (!roleLoading) {
      loadData();
    }
  }, [roleLoading]);

  const toggleAutomation = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('automations')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev =>
        prev.map(a => a.id === id ? { ...a, is_active: !currentState } : a)
      );

      toast({
        title: currentState ? 'Automation Paused' : 'Automation Activated',
        description: `The automation has been ${currentState ? 'paused' : 'activated'}.`,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation status',
        variant: 'destructive',
      });
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAutomations(prev => prev.filter(a => a.id !== id));

      toast({
        title: 'Automation Deleted',
        description: 'The automation has been removed.',
      });
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete automation',
        variant: 'destructive',
      });
    }
  };

  const createAutomation = async () => {
    if (!newName || !newTrigger) {
      toast({
        title: 'Missing Fields',
        description: 'Please provide a name and trigger type.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('automations')
        .insert({
          name: newName,
          description: newDescription || null,
          trigger_type: newTrigger,
          trigger_config: {},
          conditions: [],
          actions: newActions.map(a => ({ type: a, config: {} })),
          is_active: false,
        });

      if (error) throw error;

      toast({
        title: 'Automation Created',
        description: 'Your new automation has been saved.',
      });

      setNewName('');
      setNewDescription('');
      setNewTrigger('');
      setNewActions([]);
      setIsCreateOpen(false);
      fetchAutomations();
    } catch (error) {
      console.error('Error creating automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create automation',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
  };

  if (roleLoading || loading) {
    return (
      <AdminLayout title="Automations">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminLayout title="Automations">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center">
              Only super administrators can manage automations.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const activeCount = automations.filter(a => a.is_active).length;
  const totalRuns = automations.reduce((sum, a) => sum + a.run_count, 0);
  const successRate = logs.length > 0
    ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)
    : 100;

  return (
    <AdminLayout title="Automations">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Automations</p>
                  <p className="text-2xl font-semibold">{automations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Play className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Runs</p>
                  <p className="text-2xl font-semibold">{totalRuns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-semibold">{successRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="automations" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="automations" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Automations
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Execution Logs
              </TabsTrigger>
            </TabsList>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                  <DialogDescription>
                    Set up a new automation rule with triggers and actions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., High-Value Lead Alert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="What does this automation do?"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger</Label>
                    <Select value={newTrigger} onValueChange={setNewTrigger}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trigger..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            <div>
                              <p className="font-medium">{t.label}</p>
                              <p className="text-xs text-muted-foreground">{t.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Actions</Label>
                    <Select 
                      value="" 
                      onValueChange={(v) => {
                        if (!newActions.includes(v)) {
                          setNewActions([...newActions, v]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add an action..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {newActions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newActions.map((action) => (
                          <Badge 
                            key={action} 
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => setNewActions(newActions.filter(a => a !== action))}
                          >
                            {ACTION_TYPES.find(a => a.value === action)?.label}
                            <XCircle className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAutomation} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Automation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="automations">
            <Card>
              <CardContent className="p-0">
                {automations.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-1">No Automations Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first automation to start automating workflows
                    </p>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Automation
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead>Runs</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {automations.map((automation) => (
                        <TableRow key={automation.id}>
                          <TableCell>
                            <Switch
                              checked={automation.is_active}
                              onCheckedChange={() => toggleAutomation(automation.id, automation.is_active)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{automation.name}</p>
                              {automation.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {automation.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTriggerLabel(automation.trigger_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {automation.actions.slice(0, 2).map((action: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {ACTION_TYPES.find(a => a.value === action.type)?.label || action.type}
                                </Badge>
                              ))}
                              {automation.actions.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{automation.actions.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{automation.run_count}</TableCell>
                          <TableCell>
                            {automation.last_run_at
                              ? format(new Date(automation.last_run_at), 'MMM d, h:mm a')
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteAutomation(automation.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Execution Logs</CardTitle>
                <CardDescription>
                  Recent automation runs and their results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No automation runs yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Automation</TableHead>
                        <TableHead>Trigger Event</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const automation = automations.find(a => a.id === log.automation_id);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {format(new Date(log.created_at), 'MMM d, h:mm a')}
                            </TableCell>
                            <TableCell>{automation?.name || 'Unknown'}</TableCell>
                            <TableCell className="font-mono text-xs max-w-[200px] truncate">
                              {JSON.stringify(log.trigger_event).slice(0, 50)}...
                            </TableCell>
                            <TableCell>
                              {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.status === 'success' ? 'default' :
                                  log.status === 'partial' ? 'secondary' :
                                  'destructive'
                                }
                              >
                                {log.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AutomationsPage;
