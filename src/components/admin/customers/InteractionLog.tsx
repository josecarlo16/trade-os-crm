import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Mail, MessageSquare, FileText, Plus, Activity,
  UserPlus, Kanban, ArrowRightLeft, RefreshCw,
  MoreVertical, Pencil, Trash2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatInCST, buildCSTDateTime } from '@/lib/cstTimezone';
import type { Database } from '@/integrations/supabase/types';

type Interaction = Database['public']['Tables']['crm_interactions']['Row'];

interface InteractionLogProps {
  customerId: string;
  interactions: Interaction[];
}

const interactionIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  text: <MessageSquare className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  meeting: <Activity className="h-4 w-4" />,
  system_conversion: <UserPlus className="h-4 w-4" />,
  system_pipeline_add: <Kanban className="h-4 w-4" />,
  system_pipeline_move: <ArrowRightLeft className="h-4 w-4" />,
  system_status_change: <RefreshCw className="h-4 w-4" />,
};

const systemEventColors: Record<string, string> = {
  system_conversion: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  system_pipeline_add: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  system_pipeline_move: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  system_status_change: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
};

const isSystemEvent = (type: string) => type.startsWith('system_');

function getDefaultDateTime() {
  const cst = formatInCST(new Date());
  return { date: cst.date, time: cst.time };
}

export function InteractionLog({ customerId, interactions }: InteractionLogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [type, setType] = useState('note');
  const [direction, setDirection] = useState('outbound');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [outcome, setOutcome] = useState('');
  const [interactionDate, setInteractionDate] = useState('');
  const [interactionTime, setInteractionTime] = useState('');

  const queryClient = useQueryClient();

  const resetForm = () => {
    setType('note');
    setDirection('outbound');
    setSubject('');
    setContent('');
    setOutcome('');
    const defaults = getDefaultDateTime();
    setInteractionDate(defaults.date);
    setInteractionTime(defaults.time);
    setEditingInteraction(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (interaction: Interaction) => {
    setEditingInteraction(interaction);
    setType(interaction.interaction_type);
    setDirection(interaction.direction || 'outbound');
    setSubject(interaction.subject || '');
    setContent(interaction.content || '');
    setOutcome(interaction.outcome || '');
    const cst = formatInCST(interaction.interaction_at);
    setInteractionDate(cst.date);
    setInteractionTime(cst.time);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const interactionAt = buildCSTDateTime(interactionDate, interactionTime);
      const payload = {
        customer_id: customerId,
        interaction_type: type,
        direction,
        subject: subject || null,
        content: content || null,
        outcome: outcome || null,
        interaction_at: interactionAt,
      };

      if (editingInteraction) {
        const { error } = await supabase
          .from('crm_interactions')
          .update(payload)
          .eq('id', editingInteraction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_interactions')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_interactions', customerId] });
      toast.success(editingInteraction ? 'Interaction updated' : 'Interaction logged');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save interaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_interactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_interactions', customerId] });
      toast.success('Interaction deleted');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete interaction');
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Interaction History</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Log Interaction
          </Button>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No interactions recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction) => {
                const isSystem = isSystemEvent(interaction.interaction_type);
                const iconBgColor = isSystem
                  ? systemEventColors[interaction.interaction_type] || 'bg-muted'
                  : 'bg-muted';

                return (
                  <div
                    key={interaction.id}
                    className={`flex gap-4 p-3 rounded-lg border ${isSystem ? 'bg-muted/30' : 'bg-card'}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className={`p-2 rounded-full ${iconBgColor}`}>
                        {interactionIcons[interaction.interaction_type] || <Activity className="h-4 w-4" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium capitalize">
                          {interaction.interaction_type.replace('system_', '').replace('_', ' ')}
                        </span>
                        {!isSystem && interaction.direction && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {interaction.direction}
                          </Badge>
                        )}
                        {isSystem && (
                          <Badge variant="secondary" className="text-xs">System</Badge>
                        )}
                      </div>
                      {interaction.subject && (
                        <p className="text-sm font-medium">{interaction.subject}</p>
                      )}
                      {interaction.content && (
                        <p className="text-sm text-muted-foreground mt-1">{interaction.content}</p>
                      )}
                      {interaction.outcome && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Outcome:</span> {interaction.outcome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(interaction.interaction_at).toLocaleString()}
                      </p>
                    </div>
                    {!isSystem && (
                      <div className="flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(interaction)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(interaction.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInteraction ? 'Edit Interaction' : 'Log Interaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={interactionDate}
                  onChange={(e) => setInteractionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={interactionTime}
                  onChange={(e) => setInteractionTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary..."
              />
            </div>

            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Full details of the interaction..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Result or next steps..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingInteraction ? 'Update' : 'Log Interaction'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this interaction from the history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
