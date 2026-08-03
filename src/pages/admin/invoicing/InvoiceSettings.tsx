import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOttoBusiness, useUpdateOttoBusiness } from '@/hooks/useOttoPay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const InvoiceSettings = () => {
  const { data: biz, isLoading } = useOttoBusiness();
  const update = useUpdateOttoBusiness();

  // Invoice Defaults
  const [taxRate, setTaxRate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [defaultNotes, setDefaultNotes] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [estimatePrefix, setEstimatePrefix] = useState('');
  const [estimateValidDays, setEstimateValidDays] = useState('');

  // Branding
  const [brandColor, setBrandColor] = useState('#1e40af');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [footerText, setFooterText] = useState('');
  const [templateStyle, setTemplateStyle] = useState('modern');

  // Late Fees
  const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
  const [lateFeeType, setLateFeeType] = useState('percentage');
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [lateFeeGraceDays, setLateFeeGraceDays] = useState('7');

  // Reminders
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState('3');
  const [reminderDaysAfter, setReminderDaysAfter] = useState('1,3,7');
  const [maxReminders, setMaxReminders] = useState('5');
  const [quietHoursStart, setQuietHoursStart] = useState('21:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  // Warranty
  const [warrantyEnabled, setWarrantyEnabled] = useState(false);
  const [warrantyLabel, setWarrantyLabel] = useState('Standard Warranty');
  const [warrantyDuration, setWarrantyDuration] = useState('12');
  const [warrantyTerms, setWarrantyTerms] = useState('');

  // Receipt Settings
  const [autoSendReceipt, setAutoSendReceipt] = useState(true);
  const [receiptIncludeLineItems, setReceiptIncludeLineItems] = useState(true);
  const [receiptIncludeNotes, setReceiptIncludeNotes] = useState(false);

  useEffect(() => {
    if (biz) {
      setTaxRate(((biz.default_tax_rate || 0) * 100).toFixed(2));
      setPaymentTerms(biz.default_payment_terms || '');
      setDefaultNotes(biz.default_notes || '');
      setInvoicePrefix(biz.invoice_prefix || 'INV');
      setEstimatePrefix(biz.estimate_prefix || 'EST');
      setEstimateValidDays(String(biz.estimate_valid_days || 30));
      // Pro fields
      setBrandColor(biz.brand_color || '#1e40af');
      setAccentColor(biz.accent_color || '#3b82f6');
      setFooterText(biz.invoice_footer_text || '');
      setTemplateStyle(biz.invoice_template_style || 'modern');
      setLateFeeEnabled(biz.late_fee_enabled || false);
      setLateFeeType(biz.late_fee_type || 'percentage');
      setLateFeeAmount(String(biz.late_fee_amount || ''));
      setLateFeeGraceDays(String(biz.late_fee_grace_days || 7));
      setReminderEnabled(biz.reminder_enabled !== false);
      setReminderDaysBefore(String(biz.reminder_days_before || 3));
      setReminderDaysAfter(biz.reminder_days_after || '1,3,7');
      setMaxReminders(String(biz.max_reminders || 5));
      setQuietHoursStart(biz.quiet_hours_start || '21:00');
      setQuietHoursEnd(biz.quiet_hours_end || '08:00');
      setWarrantyEnabled(biz.warranty_enabled || false);
      setWarrantyLabel(biz.warranty_label || 'Standard Warranty');
      setWarrantyDuration(String(biz.warranty_duration_months || 12));
      setWarrantyTerms(biz.warranty_terms || '');
      setAutoSendReceipt(biz.auto_send_receipt !== false);
      setReceiptIncludeLineItems(biz.receipt_include_line_items !== false);
      setReceiptIncludeNotes(biz.receipt_include_notes || false);
    }
  }, [biz]);

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        default_tax_rate: parseFloat(taxRate) / 100 || 0,
        default_payment_terms: paymentTerms || null,
        default_notes: defaultNotes || null,
        invoice_prefix: invoicePrefix || 'INV',
        estimate_prefix: estimatePrefix || 'EST',
        estimate_valid_days: parseInt(estimateValidDays) || 30,
        // Pro fields
        brand_color: brandColor,
        accent_color: accentColor,
        invoice_footer_text: footerText || null,
        invoice_template_style: templateStyle,
        late_fee_enabled: lateFeeEnabled,
        late_fee_type: lateFeeType,
        late_fee_amount: parseFloat(lateFeeAmount) || 0,
        late_fee_grace_days: parseInt(lateFeeGraceDays) || 7,
        reminder_enabled: reminderEnabled,
        reminder_days_before: parseInt(reminderDaysBefore) || 3,
        reminder_days_after: reminderDaysAfter,
        max_reminders: parseInt(maxReminders) || 5,
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd,
        warranty_enabled: warrantyEnabled,
        warranty_label: warrantyLabel,
        warranty_duration_months: parseInt(warrantyDuration) || 12,
        warranty_terms: warrantyTerms || null,
        auto_send_receipt: autoSendReceipt,
        receipt_include_line_items: receiptIncludeLineItems,
        receipt_include_notes: receiptIncludeNotes,
      });
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Invoice Settings">
        <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Invoice Settings">
      <div className="max-w-2xl space-y-6">
        {/* Invoice Defaults */}
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Default Tax Rate (%)</Label><Input type="number" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} /></div>
              <div><Label>Payment Terms</Label><Input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Net 30" /></div>
            </div>
            <div><Label>Default Notes</Label><Textarea value={defaultNotes} onChange={e => setDefaultNotes(e.target.value)} rows={3} placeholder="Appears on all new invoices" /></div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Brand Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="font-mono" />
                </div>
              </div>
              <div>
                <Label>Accent Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono" />
                </div>
              </div>
            </div>
            <div>
              <Label>Template Style</Label>
              <Select value={templateStyle} onValueChange={setTemplateStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Invoice Footer Text</Label><Textarea value={footerText} onChange={e => setFooterText(e.target.value)} rows={2} placeholder="Thank you for your business!" /></div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader><CardTitle className="text-base">Reminders</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Payment Reminders</Label>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>
            {reminderEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Days Before Due</Label><Input type="number" value={reminderDaysBefore} onChange={e => setReminderDaysBefore(e.target.value)} /></div>
                  <div><Label>Days After Overdue (comma-separated)</Label><Input value={reminderDaysAfter} onChange={e => setReminderDaysAfter(e.target.value)} placeholder="1,3,7" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Max Reminders</Label><Input type="number" value={maxReminders} onChange={e => setMaxReminders(e.target.value)} /></div>
                  <div><Label>Quiet Hours Start</Label><Input type="time" value={quietHoursStart} onChange={e => setQuietHoursStart(e.target.value)} /></div>
                  <div><Label>Quiet Hours End</Label><Input type="time" value={quietHoursEnd} onChange={e => setQuietHoursEnd(e.target.value)} /></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Late Fees */}
        <Card>
          <CardHeader><CardTitle className="text-base">Late Fees</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Late Fees</Label>
              <Switch checked={lateFeeEnabled} onCheckedChange={setLateFeeEnabled} />
            </div>
            {lateFeeEnabled && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Fee Type</Label>
                  <Select value={lateFeeType} onValueChange={setLateFeeType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat ($)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" step="0.01" value={lateFeeAmount} onChange={e => setLateFeeAmount(e.target.value)} /></div>
                <div><Label>Grace Period (days)</Label><Input type="number" value={lateFeeGraceDays} onChange={e => setLateFeeGraceDays(e.target.value)} /></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warranty */}
        <Card>
          <CardHeader><CardTitle className="text-base">Warranty</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Warranty Tracking</Label>
              <Switch checked={warrantyEnabled} onCheckedChange={setWarrantyEnabled} />
            </div>
            {warrantyEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Warranty Label</Label><Input value={warrantyLabel} onChange={e => setWarrantyLabel(e.target.value)} /></div>
                  <div><Label>Duration (months)</Label><Input type="number" value={warrantyDuration} onChange={e => setWarrantyDuration(e.target.value)} /></div>
                </div>
                <div><Label>Warranty Terms</Label><Textarea value={warrantyTerms} onChange={e => setWarrantyTerms(e.target.value)} rows={3} placeholder="Describe warranty coverage" /></div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Receipt Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">Receipt Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Auto-Send Receipt on Payment</Label>
              <Switch checked={autoSendReceipt} onCheckedChange={setAutoSendReceipt} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Include Line Items in Receipt</Label>
              <Switch checked={receiptIncludeLineItems} onCheckedChange={setReceiptIncludeLineItems} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Include Notes in Receipt</Label>
              <Switch checked={receiptIncludeNotes} onCheckedChange={setReceiptIncludeNotes} />
            </div>
          </CardContent>
        </Card>

        {/* Estimate Defaults */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estimate Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Estimate Prefix</Label><Input value={estimatePrefix} onChange={e => setEstimatePrefix(e.target.value)} /></div>
              <div><Label>Valid Days</Label><Input type="number" value={estimateValidDays} onChange={e => setEstimateValidDays(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Numbering */}
        <Card>
          <CardHeader><CardTitle className="text-base">Numbering</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Invoice Prefix</Label><Input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} /></div>
              <div>
                <Label>Format Preview</Label>
                <p className="text-sm text-muted-foreground mt-2">{invoicePrefix}-{new Date().getFullYear()}-0001</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Business Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Business:</span> {biz?.name}</p>
            <p><span className="text-muted-foreground">Owner:</span> {biz?.owner_name}</p>
            {biz?.email && <p><span className="text-muted-foreground">Email:</span> {biz.email}</p>}
            {biz?.phone && <p><span className="text-muted-foreground">Phone:</span> {biz.phone}</p>}
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={update.isPending} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-1" /> Save Settings
        </Button>
      </div>
    </AdminLayout>
  );
};

export default InvoiceSettings;
