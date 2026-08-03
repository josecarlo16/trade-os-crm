import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Loader2 } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Supplier {
  id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
  address: string | null;
  phone: string | null;
  account_number: string | null;
  is_default: boolean;
  sort_order: number | null;
}


interface Contact {
  id: string;
  supplier_id: string;
  contact_name: string;
  title: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  sort_order: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAVY = '#1e3a5f';
const GOLD = '#d4a84b';

export default function Suppliers() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['crm_suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_suppliers')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: contactsBySupplier = {} } = useQuery({
    queryKey: ['crm_supplier_contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_supplier_contacts')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      const map: Record<string, Contact[]> = {};
      (data as Contact[]).forEach((c) => {
        (map[c.supplier_id] ||= []).push(c);
      });
      return map;
    },
  });

  const addSupplier = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('crm_suppliers').insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName('');
      qc.invalidateQueries({ queryKey: ['crm_suppliers'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Supplier> }) => {
      const { error } = await supabase.from('crm_suppliers').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm_suppliers'] }),
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm_suppliers'] });
      qc.invalidateQueries({ queryKey: ['crm_supplier_contacts'] });
    },
  });

  return (
    <AdminLayout title="Suppliers">
      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle style={{ color: NAVY }}>Add Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Supplier name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button
                onClick={() => newName.trim() && addSupplier.mutate(newName.trim())}
                disabled={!newName.trim() || addSupplier.isPending}
                style={{ backgroundColor: NAVY, color: 'white' }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-3">
            {suppliers.map((s) => (
              <SupplierRow
                key={s.id}
                supplier={s}
                contacts={contactsBySupplier[s.id] || []}
                isOpen={openId === s.id}
                onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                onUpdate={(patch) => updateSupplier.mutate({ id: s.id, patch })}
                onDelete={() => {
                  if (confirm(`Delete supplier "${s.name}" and all contacts?`)) {
                    deleteSupplier.mutate(s.id);
                  }
                }}
              />
            ))}
            {suppliers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No suppliers yet. Add one above.
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SupplierRow({
  supplier, contacts, isOpen, onToggle, onUpdate, onDelete,
}: {
  supplier: Supplier;
  contacts: Contact[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<Supplier>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(supplier.name);
  const [notes, setNotes] = useState(supplier.notes || '');
  const [address, setAddress] = useState(supplier.address || '');
  const [phone, setPhone] = useState(supplier.phone || '');
  const [account, setAccount] = useState(supplier.account_number || '');
  const [sortOrder, setSortOrder] = useState(
    supplier.sort_order != null ? String(supplier.sort_order) : '',
  );
  const activeCount = contacts.filter((c) => c.is_active).length;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium" style={{ color: NAVY }}>{supplier.name}</span>
              <Badge variant="secondary">{activeCount} / {contacts.length} contacts</Badge>
              {supplier.is_default && (
                <Badge style={{ backgroundColor: GOLD, color: NAVY }}>Default</Badge>
              )}
              {!supplier.is_active && <Badge variant="outline">Inactive</Badge>}
            </div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Default</span>
                <Switch
                  checked={supplier.is_default}
                  onCheckedChange={(v) => onUpdate({ is_default: v })}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Active</span>
                <Switch
                  checked={supplier.is_active}
                  onCheckedChange={(v) => onUpdate({ is_active: v })}
                />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => name !== supplier.name && onUpdate({ name })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => phone !== (supplier.phone || '') && onUpdate({ phone: phone || null })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Address</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => address !== (supplier.address || '') && onUpdate({ address: address || null })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Account Number</label>
                <Input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  onBlur={() => account !== (supplier.account_number || '') && onUpdate({ account_number: account || null })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Sort Order</label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  onBlur={() => {
                    const v = sortOrder === '' ? null : Number(sortOrder);
                    if (v !== supplier.sort_order) onUpdate({ sort_order: v as any });
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => notes !== (supplier.notes || '') && onUpdate({ notes: notes || null })}
                  rows={1}
                />
              </div>
            </div>


            <ContactsTable supplierId={supplier.id} contacts={contacts} />

            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete Supplier
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ContactsTable({ supplierId, contacts }: { supplierId: string; contacts: Contact[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm_supplier_contacts'] });

  const addContact = useMutation({
    mutationFn: async () => {
      const nextOrder = (contacts[contacts.length - 1]?.sort_order ?? -1) + 1;
      const { error } = await supabase.from('crm_supplier_contacts').insert({
        supplier_id: supplierId,
        contact_name: 'New Contact',
        email: '',
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Contact> }) => {
      const { error } = await supabase.from('crm_supplier_contacts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_supplier_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = contacts.findIndex((c) => c.id === active.id);
    const newIdx = contacts.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(contacts, oldIdx, newIdx);
    await Promise.all(
      reordered.map((c, i) =>
        supabase.from('crm_supplier_contacts').update({ sort_order: i }).eq('id', c.id),
      ),
    );
    invalidate();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm" style={{ color: NAVY }}>Contacts</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => addContact.mutate()}
          style={{ borderColor: GOLD, color: NAVY }}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Contact
        </Button>
      </div>
      <div className="rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Contact</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Email *</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-20">Active</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {contacts.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    onUpdate={(patch) => updateContact.mutate({ id: c.id, patch })}
                    onDelete={() => deleteContact.mutate(c.id)}
                  />
                ))}
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No contacts yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </SortableContext>
          </DndContext>
        </Table>
      </div>
    </div>
  );
}

function ContactRow({
  contact, onUpdate, onDelete,
}: {
  contact: Contact;
  onUpdate: (patch: Partial<Contact>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });
  const [local, setLocal] = useState(contact);
  const [emailError, setEmailError] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commit = (field: keyof Contact, value: any) => {
    if (field === 'email') {
      if (!value || !EMAIL_RE.test(value)) {
        setEmailError(true);
        return;
      }
      setEmailError(false);
    }
    if ((contact as any)[field] !== value) onUpdate({ [field]: value });
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <Input
          value={local.contact_name}
          onChange={(e) => setLocal({ ...local, contact_name: e.target.value })}
          onBlur={() => commit('contact_name', local.contact_name)}
        />
      </TableCell>
      <TableCell>
        <Input
          value={local.title || ''}
          onChange={(e) => setLocal({ ...local, title: e.target.value })}
          onBlur={() => commit('title', local.title || null)}
        />
      </TableCell>
      <TableCell>
        <Input
          type="email"
          value={local.email}
          onChange={(e) => { setLocal({ ...local, email: e.target.value }); setEmailError(false); }}
          onBlur={() => commit('email', local.email)}
          className={emailError ? 'border-destructive' : ''}
        />
      </TableCell>
      <TableCell>
        <Input
          value={local.phone || ''}
          onChange={(e) => setLocal({ ...local, phone: e.target.value })}
          onBlur={() => commit('phone', local.phone || null)}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={contact.is_active}
          onCheckedChange={(v) => onUpdate({ is_active: v })}
        />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
