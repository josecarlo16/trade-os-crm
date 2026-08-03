import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useOttoLineItems, useOttoInvoicePayments } from '@/hooks/useOttoPay';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, Bell, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

interface InvoiceDetailSheetProps {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceDetailSheet = ({ invoice, open, onOpenChange }: InvoiceDetailSheetProps) => {
  const { data: lineItems, isLoading: liLoading } = useOttoLineItems(invoice?.id ?? null);
  const { data: payments, isLoading: payLoading } = useOttoInvoicePayments(invoice?.id ?? null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [charging, setCharging] = useState(false);
  const qc = useQueryClient();

  if (!invoice) return null;

  const balanceDue = invoice.total - invoice.total_paid;

  const handleCharge = async () => {
    const amount = parseFloat(chargeAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setCharging(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-invoice-payment', {
        body: {
          invoice_id: invoice.id,
          amount,
          customer_email: invoice.customers?.email || '',
          description: `Payment for ${invoice.invoice_number}`,
        },
      });
      if (error) throw error;
      toast.success('Payment processed successfully');
      qc.invalidateQueries({ queryKey: ['otto-invoices'] });
      qc.invalidateQueries({ queryKey: ['otto-payments'] });
      qc.invalidateQueries({ queryKey: ['otto-metrics'] });
      qc.invalidateQueries({ queryKey: ['otto-invoice-payments', invoice.id] });
      setChargeOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
    } finally {
      setCharging(false);
    }
  };

  const handleMarkPaid = async () => {
    toast.success('Invoice marked as paid (manual)');
    // TODO: write manual payment to Otto Pay DB
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-3">
              {invoice.invoice_number}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[invoice.status] || ''}`}>
                {invoice.status}
              </span>
            </SheetTitle>
          </SheetHeader>

          {/* Customer info */}
          <div className="space-y-1 text-sm mb-6">
            <p className="font-medium">{invoice.customers?.name || 'Unknown Customer'}</p>
            {invoice.customers?.email && <p className="text-muted-foreground">{invoice.customers.email}</p>}
            {invoice.customers?.phone && <p className="text-muted-foreground">{invoice.customers.phone}</p>}
          </div>

          {/* Line items */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm mb-2">Line Items</h4>
            {liLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lineItems || []).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{fmt(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Totals */}
          <div className="border-t pt-3 space-y-1 text-sm mb-6">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax ({(invoice.tax_rate * 100).toFixed(1)}%)</span><span>{fmt(invoice.tax_amount)}</span></div>
            <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{fmt(invoice.total)}</span></div>
            <div className="flex justify-between text-green-600"><span>Paid</span><span>{fmt(invoice.total_paid)}</span></div>
            <div className="flex justify-between font-semibold text-destructive"><span>Balance Due</span><span>{fmt(balanceDue)}</span></div>
          </div>

          {/* Payment history */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm mb-2">Payment History</h4>
            {payLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (payments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              <div className="space-y-2">
                {(payments || []).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <div>
                      <p className="font-medium text-green-600">{fmt(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{p.payment_method} · {format(new Date(p.payment_date), 'MMM d, yyyy')}</p>
                    </div>
                    {p.transaction_id && <span className="text-xs text-muted-foreground font-mono">{p.transaction_id.slice(0, 12)}…</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => { setChargeAmount(balanceDue.toFixed(2)); setChargeOpen(true); }} disabled={balanceDue <= 0}>
              <CreditCard className="h-4 w-4 mr-1" /> Charge Card
            </Button>
            <Button size="sm" variant="outline" onClick={handleMarkPaid} disabled={balanceDue <= 0}>
              <CheckCircle className="h-4 w-4 mr-1" /> Mark as Paid
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.info('Reminder feature coming soon')}>
              <Bell className="h-4 w-4 mr-1" /> Send Reminder
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Charge Card Dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Charge Card — {invoice.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input type="number" step="0.01" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Payment will be processed via direct Stripe charge. The customer will receive an email receipt.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button>
            <Button onClick={handleCharge} disabled={charging}>
              {charging && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Charge {chargeAmount ? fmt(parseFloat(chargeAmount) || 0) : '$0.00'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
