import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CustomerNotesProps {
  customerId: string;
  /** Legacy single-note value from crm_customers.notes */
  legacyNote?: string | null;
}

export function CustomerNotes({ customerId, legacyNote }: CustomerNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['crm_customer_notes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('crm_customer_notes')
        .insert({ customer_id: customerId, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_customer_notes', customerId] });
      toast.success('Note added');
      setNewNote('');
      setIsAdding(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add note');
    },
  });

  const handleSubmit = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Notes</p>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-2 mb-3">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an update note..."
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewNote(''); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={addMutation.isPending || !newNote.trim()}
            >
              {addMutation.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="rounded-md border bg-muted/30 p-2.5">
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
            </p>
          </div>
        ))}

        {/* Show legacy note from crm_customers.notes if it exists */}
        {legacyNote && (
          <div className="rounded-md border bg-muted/30 p-2.5">
            <p className="text-sm whitespace-pre-wrap">{legacyNote}</p>
            <p className="text-xs text-muted-foreground mt-1">Original note</p>
          </div>
        )}

        {notes.length === 0 && !legacyNote && !isAdding && (
          <div className="flex flex-col items-center py-4 text-muted-foreground">
            <StickyNote className="h-5 w-5 mb-1" />
            <p className="text-xs">No notes yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
