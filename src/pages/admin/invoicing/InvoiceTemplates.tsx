import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOttoTemplates, useOttoTemplateLineItems } from '@/hooks/useOttoPay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const OTTOPAY_APP_URL = 'https://app.myottopay.com';

const InvoiceTemplates = () => {
  const { data: templates, isLoading } = useOttoTemplates();
  const [selected, setSelected] = useState<any>(null);
  const { data: templateItems } = useOttoTemplateLineItems(selected?.id ?? null);

  return (
    <AdminLayout title="Invoice Templates">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{(templates || []).length} templates</p>
        <Button variant="outline" onClick={() => window.open(OTTOPAY_APP_URL, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-1" /> Manage in Otto Pay
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (templates || []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3" /><p>No templates yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates || []).map((t: any) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(t)}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
              <CardContent>
                {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
                <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'MMM d, yyyy')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4"><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              {selected.description && <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>}
              <h4 className="font-semibold text-sm mb-2">Line Items</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(templateItems || []).map((li: any) => (
                    <TableRow key={li.id}><TableCell>{li.description}</TableCell><TableCell className="text-right">{li.quantity}</TableCell><TableCell className="text-right">{fmt(li.unit_price)}</TableCell></TableRow>
                  ))}
                  {(templateItems || []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No items</TableCell></TableRow>}
                </TableBody>
              </Table>
              <div className="mt-6">
                <Button variant="outline" size="sm" onClick={() => window.open(OTTOPAY_APP_URL, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Edit in Otto Pay
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default InvoiceTemplates;
