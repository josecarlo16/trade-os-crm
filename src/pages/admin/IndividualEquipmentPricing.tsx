import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Package, Plus, Search, Pencil, Trash2, Upload, Download, ArrowUpDown, ArrowUp, ArrowDown, Copy, ExternalLink, Paperclip } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { EquipmentDocumentsPanel } from '@/components/admin/equipment/EquipmentDocumentsPanel';
import { useEquipmentDocumentCounts } from '@/hooks/useEquipmentDocumentCounts';

const EQUIPMENT_TYPES = ['Air Handler', 'Condenser', 'Furnace', 'Heat Pump', 'Coil', 'Mini-Split', 'Wall Mount', 'Floor Mount', '1 Way Ceiling Cassette', '4 Way Cassette', 'Branch Box', 'Thermostat', 'Dehumidifier', 'ERV', 'Zoning', 'Other'] as const;

const TYPE_COLORS: Record<string, string> = {
  'Air Handler': 'bg-blue-100 text-blue-800 border-blue-200',
  'Condenser': 'bg-orange-100 text-orange-800 border-orange-200',
  'Furnace': 'bg-red-100 text-red-800 border-red-200',
  'Heat Pump': 'bg-green-100 text-green-800 border-green-200',
  'Coil': 'bg-purple-100 text-purple-800 border-purple-200',
  'Mini-Split': 'bg-teal-100 text-teal-800 border-teal-200',
  'Wall Mount': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Floor Mount': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  '1 Way Ceiling Cassette': 'bg-sky-100 text-sky-800 border-sky-200',
  '4 Way Cassette': 'bg-violet-100 text-violet-800 border-violet-200',
  'Branch Box': 'bg-amber-100 text-amber-800 border-amber-200',
  'Thermostat': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Dehumidifier': 'bg-rose-100 text-rose-800 border-rose-200',
  'Other': 'bg-gray-100 text-gray-800 border-gray-200',
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

type SortField = 'brand' | 'model_number' | 'type' | 'size' | 'price' | 'is_active';
type SortDir = 'asc' | 'desc';

interface EquipmentRow {
  id: string;
  brand: string;
  model_number: string;
  type: string;
  size: string;
  price: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  brand: string;
  model_number: string;
  type: string;
  size: string;
  price: string;
  notes: string;
  is_active: boolean;
}

const emptyForm: FormData = { brand: '', model_number: '', type: 'Air Handler', size: '', price: '', notes: '', is_active: true };

export default function AdminIndividualEquipmentPricing() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<SortField>('brand');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Partial<EquipmentRow>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [docsSheetFor, setDocsSheetFor] = useState<EquipmentRow | null>(null);

  const { data: docMeta } = useEquipmentDocumentCounts('individual_equipment');

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['individual-equipment-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('individual_equipment_pricing')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as EquipmentRow[];
    },
  });

  const brands = useMemo(() => [...new Set(equipment.map(e => e.brand))].sort(), [equipment]);

  const filtered = useMemo(() => {
    let rows = equipment;
    if (activeOnly) rows = rows.filter(r => r.is_active);
    if (typeFilter !== 'all') rows = rows.filter(r => r.type === typeFilter);
    if (brandFilter !== 'all') rows = rows.filter(r => r.brand === brandFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.brand.toLowerCase().includes(q) || r.model_number.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      if (typeof av === 'boolean' && typeof bv === 'boolean') return sortDir === 'asc' ? (av === bv ? 0 : av ? -1 : 1) : (av === bv ? 0 : av ? 1 : -1);
      return 0;
    });
    return rows;
  }, [equipment, activeOnly, typeFilter, brandFilter, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const upsertMutation = useMutation({
    mutationFn: async (data: { brand: string; model_number: string; type: string; size: string; price: number; notes: string | null; is_active: boolean }) => {
      if (editingId) {
        const { error } = await supabase.from('individual_equipment_pricing').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('individual_equipment_pricing').insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['individual-equipment-pricing'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? 'Equipment updated' : 'Equipment added' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('individual_equipment_pricing').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['individual-equipment-pricing'] });
      setSelected(new Set());
      toast({ title: 'Deleted successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) => {
      const { error } = await supabase.from('individual_equipment_pricing').update({ is_active: active }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['individual-equipment-pricing'] });
      setSelected(new Set());
      toast({ title: 'Status updated' });
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const openEdit = (row: EquipmentRow) => {
    setEditingId(row.id);
    setForm({ brand: row.brand, model_number: row.model_number, type: row.type, size: row.size, price: String(row.price), notes: row.notes || '', is_active: row.is_active });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.brand || !form.model_number || !form.price) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    upsertMutation.mutate({
      brand: form.brand.trim(),
      model_number: form.model_number.trim(),
      type: form.type,
      size: form.size.trim(),
      price: parseFloat(form.price),
      notes: form.notes || null,
      is_active: form.is_active,
    });
  };

  const copyModel = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const toggleSelectAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map(r => r.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  // CSV Export
  const exportCSV = () => {
    const rows = selected.size > 0 ? filtered.filter(r => selected.has(r.id)) : filtered;
    const header = 'Brand,Model #,Type,Size,Price,Active,Notes';
    const csv = [header, ...rows.map(r => `"${r.brand}","${r.model_number}","${r.type}","${r.size}",${r.price},${r.is_active},"${(r.notes || '').replace(/"/g, '""')}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'equipment-pricing.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setImportErrors(['File must have a header row and at least one data row']); return; }
      const errors: string[] = [];
      const rows: Partial<EquipmentRow>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/(".*?"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
        if (cols.length < 4) { errors.push(`Row ${i}: not enough columns`); continue; }
        const [brand, model_number, type, size, priceStr] = cols;
        if (!brand || !model_number || !type) { errors.push(`Row ${i}: missing required field`); continue; }
        const price = parseFloat(priceStr || size || '0');
        if (isNaN(price)) { errors.push(`Row ${i}: invalid price`); continue; }
        const hasSize = cols.length >= 5 && size && isNaN(parseFloat(size));
        rows.push({ brand, model_number, type, size: hasSize ? size : '', price: cols.length >= 5 ? parseFloat(priceStr) : parseFloat(size), is_active: true });
      }
      setImportRows(rows);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!importRows.length) return;
    const { error } = await supabase.from('individual_equipment_pricing').insert(importRows as any);
    if (error) { toast({ title: 'Import failed', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['individual-equipment-pricing'] });
    setImportOpen(false);
    setImportRows([]);
    setImportErrors([]);
    toast({ title: `${importRows.length} items imported` });
  };

  return (
    <AdminLayout title="Individual Equipment Pricing">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Individual Equipment Pricing</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add Equipment
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search brand, model, type..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={v => { setBrandFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Brands" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={activeOnly} onCheckedChange={v => { setActiveOnly(v); setPage(0); }} />
            <Label className="text-sm">Active Only</Label>
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => toggleActiveMutation.mutate({ ids: [...selected], active: false })}>Deactivate</Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>Delete Selected</Button>
          </div>
        )}

        {/* Table */}
        <div className="bg-background rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={pageRows.length > 0 && selected.size === pageRows.length} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('brand')}>
                  <span className="flex items-center">Brand <SortIcon field="brand" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('model_number')}>
                  <span className="flex items-center">Model # <SortIcon field="model_number" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('type')}>
                  <span className="flex items-center">Type <SortIcon field="type" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('size')}>
                  <span className="flex items-center">Size <SortIcon field="size" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('price')}>
                  <span className="flex items-center justify-end">Price <SortIcon field="price" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('is_active')}>
                  <span className="flex items-center">Status <SortIcon field="is_active" /></span>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No equipment found</TableCell></TableRow>
              ) : pageRows.map(row => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  <TableCell><Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSelect(row.id)} /></TableCell>
                  <TableCell className="font-semibold">{row.brand}</TableCell>
                  <TableCell>
                    <button onClick={() => copyModel(row.model_number)} className="font-mono text-sm hover:text-primary flex items-center gap-1" title="Click to copy">
                      {row.model_number} <Copy className="h-3 w-3 opacity-40" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={TYPE_COLORS[row.type] || TYPE_COLORS['Other']}>{row.type}</Badge>
                  </TableCell>
                  <TableCell>{row.size}</TableCell>
                  <TableCell className="text-right font-medium">${Number(row.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Documents"
                        onClick={() => setDocsSheetFor(row)}
                        className="relative"
                      >
                        <Paperclip className="h-4 w-4" />
                        {(docMeta?.counts.get(row.id) ?? 0) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                            {docMeta!.counts.get(row.id)}
                          </span>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicate" onClick={() => {
                        setEditingId(null);
                        setForm({ brand: row.brand, model_number: row.model_number, type: row.type, size: row.size, price: String(row.price), notes: row.notes || '', is_active: row.is_active });
                        setDialogOpen(true);
                      }}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground gap-4 flex-wrap">
            <span>Showing {filtered.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} items</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                  <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
            <DialogDescription>Fill in the equipment details below.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="documents" disabled={!editingId}>
                <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                Documents
                {editingId && (docMeta?.counts.get(editingId) ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {docMeta!.counts.get(editingId)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4">
              <div>
                <Label>Brand *</Label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} list="brand-list" placeholder="e.g. Carrier, Trane" />
                <datalist id="brand-list">{brands.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div>
                <Label>Model Number *</Label>
                <Input value={form.model_number} onChange={e => setForm(f => ({ ...f, model_number: e.target.value }))} placeholder="e.g. 24ACC636A003" />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Size</Label>
                <Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder='e.g. 2 Ton, 80,000 BTU (optional)' />
              </div>
              <div>
                <Label>Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="pl-7" />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: !!v }))} />
                <Label>Active</Label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={upsertMutation.isPending}>{upsertMutation.isPending ? 'Saving...' : 'Save Equipment'}</Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="documents">
              {editingId ? (
                <EquipmentDocumentsPanel
                  ownerType="individual_equipment"
                  ownerId={editingId}
                  ownerLabel={`${form.brand} ${form.model_number}`}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Save the equipment first to attach documents.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Documents Sheet (row-level) */}
      <Sheet open={!!docsSheetFor} onOpenChange={(o) => !o && setDocsSheetFor(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" /> Equipment Documents
            </SheetTitle>
            <SheetDescription>
              {docsSheetFor && `${docsSheetFor.brand} ${docsSheetFor.model_number}`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {docsSheetFor && (
              <EquipmentDocumentsPanel
                ownerType="individual_equipment"
                ownerId={docsSheetFor.id}
                ownerLabel={`${docsSheetFor.brand} ${docsSheetFor.model_number}`}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteConfirm) deleteMutation.mutate([deleteConfirm]); setDeleteConfirm(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirm */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} items?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteMutation.mutate([...selected]); setBulkDeleteConfirm(false); }}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
            <DialogDescription>Upload a CSV with columns: Brand, Model #, Type, Size, Price</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="file" accept=".csv" onChange={handleImportFile} />
            {importErrors.length > 0 && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md space-y-1">
                {importErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            {importRows.length > 0 && (
              <div className="text-sm text-muted-foreground">{importRows.length} valid rows ready to import</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportRows([]); setImportErrors([]); }}>Cancel</Button>
            <Button onClick={confirmImport} disabled={importRows.length === 0}>Import {importRows.length} Items</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
