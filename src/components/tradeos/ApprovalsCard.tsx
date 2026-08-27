import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ApprovalRequest {
  id: string;
  title: string;
  description: string | null;
  level: string;
  status: 'pending' | 'approved' | 'held';
  created_at: string;
}

export function ApprovalsCard() {
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading, isError } = useQuery({
    queryKey: ['approval_requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('id, title, description, level, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as ApprovalRequest[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'held' }) => {
      const { error } = await supabase
        .from('approval_requests')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval_requests'] });
      toast.success('Updated');
    },
    onError: (error: Error) => toast.error('Failed to update: ' + error.message),
  });

  if (isLoading) {
    return <p className="text-sm text-tradeos-ink-3">Loading…</p>;
  }

  if (isError) {
    return (
      <p className="text-xs text-tradeos-ink-3">
        Approvals aren't wired to real data yet — the <code className="rounded bg-tradeos-surface-2 px-1 py-0.5 font-tradeMono text-[11px]">approval_requests</code> migration hasn't been applied to the database yet.
      </p>
    );
  }

  if (approvals.length === 0) {
    return <p className="text-sm text-tradeos-ink-3">No approvals waiting.</p>;
  }

  return (
    <div className="divide-y divide-tradeos-line">
      {approvals.map((a) => (
        <div key={a.id} className="py-2.5 first:pt-0 last:pb-0">
          <div className="mb-1 flex items-center gap-2">
            <p className="flex-1 truncate text-sm font-semibold text-tradeos-ink">{a.title}</p>
            <Badge
              variant="outline"
              className={a.level === 'L4' ? 'border-tradeos-crit text-tradeos-crit' : 'border-tradeos-line-strong text-tradeos-ink-3'}
            >
              {a.level}
            </Badge>
          </div>
          {a.description && <p className="mb-2 text-xs text-tradeos-ink-3">{a.description}</p>}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-tradeos-good text-tradeos-good hover:bg-tradeos-good/10"
              onClick={() => resolveMutation.mutate({ id: a.id, status: 'approved' })}
              disabled={resolveMutation.isPending}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-tradeos-ink-2"
              onClick={() => resolveMutation.mutate({ id: a.id, status: 'held' })}
              disabled={resolveMutation.isPending}
            >
              Hold
            </Button>
            <span className="ml-auto text-[11px] text-tradeos-ink-3">{format(new Date(a.created_at), 'MMM d, h:mma')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
