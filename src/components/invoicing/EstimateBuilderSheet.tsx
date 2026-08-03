import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineItemEditor } from '@/components/invoicing/LineItemEditor';
import { CustomerSelector } from '@/components/invoicing/CustomerSelector';
import { DocumentPreview, printDocument } from '@/components/invoicing/DocumentPreview';
import { useOttoCustomers } from '@/hooks/useOttoPay';
import { FileText, Printer, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { LineItemDraft } from '@/integrations/ottopay/types';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

interface EstimateBuilderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any, status: string) => Promise<void>;
  isPending?: boolean;
  defaultValues?: any;
}

export function EstimateBuilderSheet({ open, onOpenChange, onSubmit, isPending, defaultValues }: EstimateBuilderSheetProps) {
  const { data: ottoCustomers } = useOttoCustomers();
  const [customerId, setCustomerId] = useState<string | null>(defaultValues?.customer_id || null);
  const [estimateDate, setEstimateDate] = useState(defaultValues?.estimate_date || new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(defaultValues?.valid_until || '');
  const [taxRate, setTaxRate] = useState(defaultValues?.tax_rate || 0.0825);
  const [notes, setNotes] = useState(defaultValues?.notes || '');
  const [terms, setTerms] = useState(defaultValues?.terms || 'This estimate is valid for 30 days from the date issued.\nA 50% deposit is required to schedule the work.\nFinal payment is due upon completion of the project.\nAll work is guaranteed for one year from installation date.\nPrices may vary if job conditions differ from initial assessment.');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>(defaultValues?.line_items || []);
  const [tab, setTab] = useState('details');

  const subtotal = lineItems.reduce((s, i) => s + i.line_total, 0);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const customer = useMemo(() => {
    if (!customerId || !ottoCustomers) return null;
    return (ottoCustomers as any[]).find((c: any) => c.id === customerId) || null;
  }, [customerId, ottoCustomers]);

  const handleSubmit = async (status: string) => {
    if (!customerId) { toast.error('Select a customer'); return; }
    if (lineItems.length === 0) { toast.error('Add at least one line item'); return; }
    await onSubmit({
      customer_id: customerId,
      estimate_date: estimateDate,
      valid_until: validUntil || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: notes || null,
      terms: terms || null,
      line_items: lineItems.map((li, i) => ({ description: li.description, quantity: li.quantity, unit_price: li.unit_price, line_total: li.line_total, sort_order: i })),
    }, status);
  };

  const previewProps = {
    type: 'estimate' as const,
    documentNumber: defaultValues?.estimate_number || 'EST-DRAFT',
    date: estimateDate,
    validUntil,
    customerName: customer?.name || 'Select a customer',
    customerEmail: customer?.email,
    customerPhone: customer?.phone,
    customerAddress: customer?.address,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
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
              {defaultValues ? `Edit Estimate ${defaultValues.estimate_number || ''}` : 'New Estimate'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Customer *</Label>
                  <CustomerSelector value={customerId} onChange={setCustomerId} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Estimate Date</Label>
                  <Input type="date" value={estimateDate} onChange={e => setEstimateDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Valid Until</Label>
                  <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Tax Rate (%)</Label>
                  <Input type="number" step="0.01" value={(taxRate * 100).toFixed(2)} onChange={e => setTaxRate(parseFloat(e.target.value) / 100 || 0)} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Line Items</Label>
                <LineItemEditor items={lineItems} onChange={setLineItems} />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(2)}%)</span><span>{fmt(taxAmount)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1.5 border-t"><span>Total</span><span>{fmt(total)}</span></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Notes to Customer</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Any additional notes..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Terms & Conditions</Label>
                  <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} />
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

        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isPending}>
            <Save className="h-4 w-4 mr-1.5" /> Save Draft
          </Button>
          <Button onClick={() => handleSubmit('sent')} disabled={isPending}>
            <Send className="h-4 w-4 mr-1.5" /> Send Estimate
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
