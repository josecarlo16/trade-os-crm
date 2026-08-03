import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineItemEditor } from '@/components/invoicing/LineItemEditor';
import { CustomerSelector } from '@/components/invoicing/CustomerSelector';
import { DocumentPreview, printDocument } from '@/components/invoicing/DocumentPreview';
import { useOttoCustomers } from '@/hooks/useOttoPay';
import { FileText, Printer, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { LineItemDraft } from '@/integrations/ottopay/types';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

interface InvoiceBuilderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any, status: string) => Promise<void>;
  isPending?: boolean;
  defaultValues?: any;
}

export function InvoiceBuilderSheet({ open, onOpenChange, onSubmit, isPending, defaultValues }: InvoiceBuilderSheetProps) {
  const { data: ottoCustomers } = useOttoCustomers();
  const [customerId, setCustomerId] = useState<string | null>(defaultValues?.customer_id || null);
  const [invoiceDate, setInvoiceDate] = useState(defaultValues?.invoice_date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(defaultValues?.due_date || '');
  const [taxRate, setTaxRate] = useState(defaultValues?.tax_rate || 0.0825);
  const [notes, setNotes] = useState(defaultValues?.notes || '');
  const [terms, setTerms] = useState(defaultValues?.terms || 'Payment is due upon receipt.\nA late fee of 1.5% per month will be applied to overdue balances.\nAll work is guaranteed for one year from installation date.');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>(defaultValues?.line_items || []);
  const [ccFeeEnabled, setCcFeeEnabled] = useState(false);
  const [ccFeePercent, setCcFeePercent] = useState(3.0);
  const [tab, setTab] = useState('details');

  const subtotal = lineItems.reduce((s, i) => s + i.line_total, 0);
  const ccFeeAmount = ccFeeEnabled ? subtotal * (ccFeePercent / 100) : 0;
  const taxableAmount = subtotal + ccFeeAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;

  const customer = useMemo(() => {
    if (!customerId || !ottoCustomers) return null;
    return (ottoCustomers as any[]).find((c: any) => c.id === customerId) || null;
  }, [customerId, ottoCustomers]);

  const handleSubmit = async (status: string) => {
    if (!customerId) { toast.error('Select a customer'); return; }
    if (lineItems.length === 0) { toast.error('Add at least one line item'); return; }
    await onSubmit({
      customer_id: customerId,
      invoice_date: invoiceDate,
      due_date: dueDate || null,
      subtotal: subtotal + ccFeeAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: notes || null,
      terms: terms || null,
      line_items: lineItems.map((li, i) => ({
        description: ccFeeEnabled && i === lineItems.length ? `Credit Card Processing Fee (${ccFeePercent}%)` : li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        line_total: li.line_total,
        sort_order: i,
      })),
      ...(ccFeeEnabled && ccFeeAmount > 0 ? {
        cc_fee_line: { description: `Credit Card Processing Fee (${ccFeePercent}%)`, quantity: 1, unit_price: ccFeeAmount, line_total: ccFeeAmount },
      } : {}),
    }, status);
  };

  const previewProps = {
    type: 'invoice' as const,
    documentNumber: defaultValues?.invoice_number || 'INV-DRAFT',
    date: invoiceDate,
    dueDate,
    customerName: customer?.name || 'Select a customer',
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    customerAddress: customer?.address,
    lineItems: [
      ...lineItems,
      ...(ccFeeEnabled && ccFeeAmount > 0 ? [{ description: `Credit Card Processing Fee (${ccFeePercent}%)`, quantity: 1, unit_price: ccFeeAmount, line_total: ccFeeAmount }] : []),
    ],
    subtotal: subtotal + ccFeeAmount,
    taxRate,
    taxAmount,
    total,
    totalPaid: defaultValues?.total_paid || 0,
    notes,
    terms,
    status: defaultValues?.status,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0" side="right">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader className="mb-0">
            <SheetTitle className="text-lg">
              {defaultValues ? `Edit Invoice ${defaultValues.invoice_number || ''}` : 'New Invoice'}
            </SheetTitle>
          </SheetHeader>
          <Tabs value={tab} onValueChange={setTab} className="mt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details"><FileText className="h-4 w-4 mr-1.5" />Details</TabsTrigger>
              <TabsTrigger value="preview"><Printer className="h-4 w-4 mr-1.5" />Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-6 py-5">
          {tab === 'details' ? (
            <div className="space-y-6">
              {/* Customer & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Customer *</Label>
                  <CustomerSelector value={customerId} onChange={setCustomerId} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Tax Rate (%)</Label>
                  <Input type="number" step="0.01" value={(taxRate * 100).toFixed(2)} onChange={e => setTaxRate(parseFloat(e.target.value) / 100 || 0)} />
                </div>
              </div>

              {/* CC Fee Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Credit Card Processing Fee</p>
                  <p className="text-xs text-muted-foreground">Add a CC processing fee to this invoice</p>
                </div>
                <div className="flex items-center gap-3">
                  {ccFeeEnabled && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        min={0}
                        max={10}
                        value={ccFeePercent}
                        onChange={e => setCcFeePercent(parseFloat(e.target.value) || 0)}
                        className="h-8 w-20 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                  <Switch checked={ccFeeEnabled} onCheckedChange={setCcFeeEnabled} />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Line Items</Label>
                <LineItemEditor items={lineItems} onChange={setLineItems} />
              </div>

              {/* Totals Summary */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
                {ccFeeEnabled && ccFeeAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">CC Fee ({ccFeePercent}%)</span><span>{fmt(ccFeeAmount)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(2)}%)</span><span>{fmt(taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1.5 border-t"><span>Total</span><span>{fmt(total)}</span></div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Notes to Customer</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Any additional notes..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Terms & Conditions</Label>
                  <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} placeholder="Payment terms, conditions..." />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => printDocument(previewProps)}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print / Download PDF
                </Button>
              </div>
              <DocumentPreview {...previewProps} />
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isPending}>
            <Save className="h-4 w-4 mr-1.5" /> Save Draft
          </Button>
          <Button onClick={() => handleSubmit('sent')} disabled={isPending}>
            <Send className="h-4 w-4 mr-1.5" /> Send Invoice
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
