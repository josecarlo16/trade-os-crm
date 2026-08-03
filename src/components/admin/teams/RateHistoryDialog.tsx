import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RateHistoryRow {
  id: string;
  team_member_id: string;
  hourly_rate: number;
  overtime_rate: number | null;
  effective_date: string;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string | null;
  memberName?: string;
}

export function RateHistoryDialog({ open, onOpenChange, memberId, memberName }: Props) {
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [hourly, setHourly] = useState<string>('');
  const [overtime, setOvertime] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(today);
  const [notes, setNotes] = useState<string>('');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['rate-history', memberId],
    enabled: !!memberId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_team_member_rate_history' as any)
        .select('*')
        .eq('team_member_id', memberId)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RateHistoryRow[];
    },
  });

  const reset = () => {
    setHourly('');
    setOvertime('');
    setEffectiveDate(today);
    setNotes('');
  };

  const addRate = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error('No member selected');
      if (!hourly) throw new Error('Hourly rate required');
      if (!effectiveDate) throw new Error('Effective date required');
      const { error } = await supabase.from('crm_team_member_rate_history' as any).insert({
        team_member_id: memberId,
        hourly_rate: parseFloat(hourly),
        overtime_rate: overtime ? parseFloat(overtime) : null,
        effective_date: effectiveDate,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rate-history', memberId] });
      qc.invalidateQueries({ queryKey: ['crm_team_members'] });
      toast.success('Rate change saved');
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_team_member_rate_history' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rate-history', memberId] });
      qc.invalidateQueries({ queryKey: ['crm_team_members'] });
      toast.success('Rate entry removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const todayDate = today;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Pay Rate History
            {memberName && <span className="text-muted-foreground font-normal">— {memberName}</span>}
          </DialogTitle>
          <DialogDescription>
            Add a new rate with the date it takes effect. Past time entries keep the rate they were saved with.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 border rounded-lg bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">Hourly Rate</Label>
            <Input type="number" step="0.01" value={hourly} onChange={e => setHourly(e.target.value)} placeholder="35.00" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Overtime Rate</Label>
            <Input type="number" step="0.01" value={overtime} onChange={e => setOvertime(e.target.value)} placeholder="52.50" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Effective Date</Label>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </div>
          <div className="space-y-1 flex items-end">
            <Button onClick={() => addRate.mutate()} disabled={addRate.isPending} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="col-span-full space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Annual raise, promotion, etc." />
          </div>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && history.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">No rate history yet.</div>
          )}
          {history.map((row) => {
            const isCurrent = row.effective_date <= todayDate &&
              !history.some(h => h.effective_date <= todayDate && h.effective_date > row.effective_date);
            const isFuture = row.effective_date > todayDate;
            return (
              <div key={row.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">${Number(row.hourly_rate).toFixed(2)}/hr</span>
                    {row.overtime_rate != null && (
                      <span className="text-sm text-muted-foreground">OT ${Number(row.overtime_rate).toFixed(2)}</span>
                    )}
                    {isCurrent && <Badge variant="default">Current</Badge>}
                    {isFuture && <Badge variant="secondary">Scheduled</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Effective {format(new Date(row.effective_date + 'T00:00:00'), 'MMM d, yyyy')}
                    {row.notes && <> · {row.notes}</>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Remove this rate entry?')) deleteRate.mutate(row.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
