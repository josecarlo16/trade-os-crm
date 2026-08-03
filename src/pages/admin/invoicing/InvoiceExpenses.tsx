import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOttoExpenses } from '@/hooks/useOttoExpenses';
import { Receipt, ExternalLink, Image } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const OTTOPAY_APP_URL = 'https://app.myottopay.com';

const InvoiceExpenses = () => {
  const { data: expenses, isLoading } = useOttoExpenses();

  const totalExpenses = (expenses || []).reduce((s, e) => s + e.amount, 0);
  const thisMonthExpenses = (expenses || []).filter(e => {
    const d = new Date(e.expense_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  return (
    <AdminLayout title="Expenses">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">{fmt(thisMonthExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{expenses?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <Button variant="outline" onClick={() => window.open(OTTOPAY_APP_URL, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-1" /> Manage in Otto Pay
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expenses || []).map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm">{format(new Date(exp.expense_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                        {exp.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{exp.vendor || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(exp.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{exp.notes || '—'}</TableCell>
                    <TableCell>
                      {exp.receipt_url ? (
                        <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                          <Image className="h-3 w-3" /> View
                        </a>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!expenses || expenses.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No expenses logged yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default InvoiceExpenses;
