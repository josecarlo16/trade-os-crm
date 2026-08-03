import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface CustomerEmailHistoryProps {
  customerId: string;
  customerEmail: string | null;
}

export function CustomerEmailHistory({ customerId, customerEmail }: CustomerEmailHistoryProps) {
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['crm-customer-emails', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_email_log')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      sent: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      bounced: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return (
      <Badge className={variants[status] || 'bg-muted text-muted-foreground'} variant="secondary">
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm text-center py-8">Loading emails...</p>
        </CardContent>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center py-8">
            <Mail className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No email correspondence</p>
            {customerEmail && (
              <p className="text-xs text-muted-foreground mt-1">
                Emails sent to {customerEmail} will appear here
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Email Correspondence</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {emails.map((email) => {
            const isInbound = email.direction === 'inbound';
            return (
              <div
                key={email.id}
                className="flex gap-4 p-3 rounded-lg border bg-card"
              >
                <div className="flex-shrink-0 mt-1">
                  <div className={`p-2 rounded-full ${isInbound ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-muted'}`}>
                    {isInbound ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium capitalize">{email.direction}</span>
                    {statusBadge(email.status)}
                  </div>
                  {email.subject && (
                    <p className="text-sm font-medium">{email.subject}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isInbound ? `From: ${email.from_email}` : `To: ${email.to_email}`}
                  </p>
                  {email.body_text && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {email.body_text}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(parseISO(email.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
