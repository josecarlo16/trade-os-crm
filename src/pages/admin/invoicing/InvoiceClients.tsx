import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOttoCustomers, useOttoInvoices, useCreateOttoCustomer, useUpdateOttoCustomer } from '@/hooks/useOttoPay';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Mail, Phone, FileText, ExternalLink, Plus, Edit2, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/invoicing/StatusBadge';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const InvoiceClients = () => {
  const { data: customers, isLoading: loadingCustomers } = useOttoCustomers();
  const { data: invoices, isLoading: loadingInvoices } = useOttoInvoices();
  const createCustomer = useCreateOttoCustomer();
  const updateCustomer = useUpdateOttoCustomer();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const navigate = useNavigate();

  const enriched = useMemo(() => {
    if (!customers) return [];
    const invMap = (invoices || []).reduce((m: Record<string, any[]>, inv: any) => {
      if (inv.customer_id) { m[inv.customer_id] = m[inv.customer_id] || []; m[inv.customer_id].push(inv); }
      return m;
    }, {});
    return customers.map((c: any) => {
      const ci = invMap[c.id] || [];
      const ltv = ci.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.total, 0);
      const lastDate = ci.length ? ci.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null;
      return { ...c, invoiceCount: ci.length, ltv, lastInvoiceDate: lastDate, invoices: ci };
    });
  }, [customers, invoices]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q));
    }
    if (sortBy === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortBy === 'ltv') list = [...list].sort((a, b) => b.ltv - a.ltv);
    else if (sortBy === 'recent') list = [...list].sort((a, b) => {
      if (!a.lastInvoiceDate) return 1;
      if (!b.lastInvoiceDate) return -1;
      return new Date(b.lastInvoiceDate).getTime() - new Date(a.lastInvoiceDate).getTime();
    });
    return list;
  }, [enriched, search, sortBy]);

  const isLoading = loadingCustomers || loadingInvoices;
  const initials = (name: string) => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      await createCustomer.mutateAsync({ name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null } as any);
      toast.success('Client created');
      setCreateOpen(false);
      setForm({ name: '', email: '', phone: '', address: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async () => {
    if (!detailCustomer) return;
    try {
      await updateCustomer.mutateAsync({ id: detailCustomer.id, name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null } as any);
      toast.success('Client updated');
      setEditMode(false);
      setDetailCustomer(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const openDetail = (c: any) => {
    setDetailCustomer(c);
    setForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' });
    setEditMode(false);
  };

  return (
    <AdminLayout title="Clients">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="ltv">Lifetime Value</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm({ name: '', email: '', phone: '', address: '' }); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Client
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-28 w-full" /></CardContent></Card>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No clients found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c: any) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c)}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{c.email}</p>}
                    </div>
                  </div>
                  {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-lg font-bold">{c.invoiceCount}</p>
                      <p className="text-[10px] text-muted-foreground">Invoices</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-lg font-bold text-green-700">{fmt(c.ltv)}</p>
                      <p className="text-[10px] text-muted-foreground">Lifetime</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-sm font-medium">{c.lastInvoiceDate ? format(new Date(c.lastInvoiceDate), 'MMM d') : '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Last Inv.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); navigate(`/admin/invoices?customer=${c.id}`); }}>
                      <FileText className="h-3.5 w-3.5 mr-1" />View Invoices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCustomer.isPending}>Create Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!detailCustomer} onOpenChange={open => { if (!open) setDetailCustomer(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailCustomer && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  {detailCustomer.name}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMode(!editMode)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </SheetTitle>
              </SheetHeader>

              {editMode ? (
                <div className="space-y-3 mb-6">
                  <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} disabled={updateCustomer.isPending}>Save</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm mb-6">
                  {detailCustomer.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{detailCustomer.email}</p>}
                  {detailCustomer.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{detailCustomer.phone}</p>}
                  {detailCustomer.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{detailCustomer.address}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-muted/50 rounded-md p-3 text-center">
                  <p className="text-2xl font-bold">{detailCustomer.invoiceCount}</p>
                  <p className="text-xs text-muted-foreground">Total Invoices</p>
                </div>
                <div className="bg-muted/50 rounded-md p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{fmt(detailCustomer.ltv)}</p>
                  <p className="text-xs text-muted-foreground">Lifetime Value</p>
                </div>
              </div>

              <h4 className="font-semibold text-sm mb-3">Recent Invoices</h4>
              {(detailCustomer.invoices || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="space-y-2">
                  {(detailCustomer.invoices || []).slice(0, 10).map((inv: any) => (
                    <div key={inv.id} className="flex justify-between items-center text-sm border-b pb-2">
                      <div>
                        <p className="font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fmt(inv.total)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default InvoiceClients;
