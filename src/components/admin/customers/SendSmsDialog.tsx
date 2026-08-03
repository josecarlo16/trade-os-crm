import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare } from 'lucide-react';

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerPhone: string;
  customerId: string;
  onSuccess: () => void;
}

const MAX_CHARS = 320;

export function SendSmsDialog({
  open,
  onOpenChange,
  customerName,
  customerPhone,
  customerId,
  onSuccess,
}: SendSmsDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-sms', {
        body: {
          to: customerPhone,
          message: message.trim(),
          customer_id: customerId,
          logged_by: user?.id,
        },
      });

      if (fnError) throw fnError;
      if (data && !data.success) throw new Error(data.error || 'Failed to send');

      toast.success(`Text sent to ${customerName}`);
      setMessage('');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to send text message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setMessage(''); setError(''); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Text Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-sm font-medium">{customerName}</p>
            <p className="text-sm text-muted-foreground">{customerPhone}</p>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Type your message..."
              rows={4}
            />
            <p className={`text-xs text-right ${message.length >= MAX_CHARS ? 'text-destructive' : 'text-muted-foreground'}`}>
              {message.length}/{MAX_CHARS}
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
