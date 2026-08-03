import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, Plus, Trash2, GripVertical, Loader2, FileDown, Copy, Mail, Send } from 'lucide-react';
import { downloadJobListPDF } from '@/utils/generateJobListPDF';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface JobListPanelProps {
  estimateId: string;
}

interface JobList {
  id: string;
  estimate_id: string;
  status: string;
  supplier_name: string | null;
  notes: string | null;
  estimate_synced_at: string | null;
}

interface JobListItem {
  id: string;
  job_list_id: string;
  source_line_item_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  is_manually_edited: boolean;
  manually_added: boolean;
  sort_order: number;
}

const INCLUDED_SECTIONS = ['equipment_controls', 'miscellaneous_inside', 'miscellaneous_outside', 'ducting'];

export const JobListPanel = ({ estimateId }: JobListPanelProps) => {
  const qc = useQueryClient();
  const [emailOpen, setEmailOpen] = useState(false);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);




  const { data: jobList, isLoading } = useQuery({
    queryKey: ['job-list', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_lists')
        .select('*')
        .eq('estimate_id', estimateId)
        .maybeSingle();
      if (error) throw error;
      return data as JobList | null;
    },
  });

  const { data: estimateMeta } = useQuery({
    queryKey: ['estimate-meta-for-joblist', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('estimate_number')
        .eq('id', estimateId)
        .maybeSingle();
      if (error) throw error;
      return data as { estimate_number: string } | null;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['job-list-items', jobList?.id],
    enabled: !!jobList?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_job_list_items')
        .select('*')
        .eq('job_list_id', jobList!.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as JobListItem[];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Get estimate updated_at & line items
      const { data: est, error: estErr } = await supabase
        .from('estimates')
        .select('id, updated_at')
        .eq('id', estimateId)
        .single();
      if (estErr) throw estErr;

      const { data: lineItems, error: liErr } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('sort_order', { ascending: true });
      if (liErr) throw liErr;

      const userRes = await supabase.auth.getUser();

      const { data: newList, error: listErr } = await supabase
        .from('crm_job_lists')
        .insert({
          estimate_id: estimateId,
          status: 'draft',
          estimate_synced_at: est.updated_at,
          created_by: userRes.data.user?.id ?? null,
        })
        .select()
        .single();
      if (listErr) throw listErr;

      const eligible = (lineItems || []).filter((li: any) =>
        INCLUDED_SECTIONS.includes(li.section)
      );

      if (eligible.length > 0) {
        const rows = eligible.map((li: any, idx: number) => ({
          job_list_id: newList.id,
          source_line_item_id: li.id,
          name: li.name,
          description: li.description,
          quantity: li.quantity,
          unit: li.unit || 'each',
          sort_order: idx,
        }));
        const { error: itemsErr } = await supabase.from('crm_job_list_items').insert(rows);
        if (itemsErr) throw itemsErr;
      }
      return newList;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-list', estimateId] });
      toast.success('Job list generated');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to generate job list'),
  });

  const updateListMutation = useMutation({
    mutationFn: async (patch: Partial<JobList>) => {
      const { error } = await supabase
        .from('crm_job_lists')
        .update(patch)
        .eq('id', jobList!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-list', estimateId] }),
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, patch, markEdited }: { id: string; patch: Partial<JobListItem>; markEdited: boolean }) => {
      const item = items.find((i) => i.id === id);
      const finalPatch: any = { ...patch };
      if (markEdited && item && !item.manually_added && !item.is_manually_edited) {
        finalPatch.is_manually_edited = true;
      }
      const { error } = await supabase
        .from('crm_job_list_items')
        .update(finalPatch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-list-items', jobList?.id] }),
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  const addRowMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('crm_job_list_items').insert({
        job_list_id: jobList!.id,
        name: 'New item',
        quantity: 1,
        unit: 'each',
        manually_added: true,
        sort_order: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-list-items', jobList?.id] }),
    onError: (e: any) => toast.error(e.message || 'Add failed'),
  });

  const deleteRowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_job_list_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-list-items', jobList?.id] }),
    onError: (e: any) => toast.error(e.message || 'Delete failed'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (ordered: JobListItem[]) => {
      const updates = ordered.map((it, idx) =>
        supabase.from('crm_job_list_items').update({ sort_order: idx }).eq('id', it.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-list-items', jobList?.id] }),
    onError: (e: any) => toast.error(e.message || 'Reorder failed'),
  });

  const pushToTakeoffMutation = useMutation({
    mutationFn: async () => {
      if (!jobList || items.length === 0) throw new Error('No job list items to push');

      // Resolve job via source_estimate_id
      const { data: jobRow, error: jobErr } = await supabase
        .from('crm_jobs')
        .select('id, customer_id')
        .eq('source_estimate_id', estimateId)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();
      if (jobErr) throw jobErr;

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (!userId) throw new Error('Not signed in');

      const listName = `From Estimate ${estimateMeta?.estimate_number ?? ''}`.trim() || 'From Estimate';

      const { data: newReq, error: reqErr } = await supabase
        .from('material_requests')
        .insert({
          job_id: jobRow?.id ?? null,
          customer_id: jobRow?.customer_id ?? null,
          source_estimate_id: estimateId,
          list_name: listName,
          requested_by: userId,
          status: 'draft',
        })
        .select('id, job_id')
        .single();
      if (reqErr) throw reqErr;

      const rows = items.map((i, idx) => ({
        request_id: newReq.id,
        material_id: null,
        custom_item: i.name,
        notes: i.description ?? null,
        quantity: i.quantity,
        unit: i.unit || 'each',
        from_takeoff: true,
        sort_order: i.sort_order ?? idx,
      }));
      const { error: itemsErr } = await supabase.from('material_request_items').insert(rows);
      if (itemsErr) throw itemsErr;

      return { requestId: newReq.id, jobId: newReq.job_id as string | null };
    },
    onSuccess: ({ jobId }) => {
      if (jobId) {
        toast.success('Pushed to Material Takeoff', {
          description: 'Created a new field Material List attached to the job.',
          action: {
            label: 'Open Job',
            onClick: () => {
              window.location.href = `/admin/jobs/${jobId}?tab=materials`;
            },
          },
        });
      } else {
        toast.success('Pushed to Material Takeoff', {
          description: 'Created as an unattached list — attach it to a job later.',
        });
      }
      setPushConfirmOpen(false);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to push to takeoff'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    qc.setQueryData(['job-list-items', jobList?.id], next);
    reorderMutation.mutate(next);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!jobList) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Job List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a parts &amp; materials list from this estimate to send to a supply house.
            Equipment/controls, miscellaneous inside, and ducting line items will be included.
          </p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate Job List
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleExportPDF = () => {
    downloadJobListPDF(
      {
        estimate_number: estimateMeta?.estimate_number ?? '—',
        supplier_name: jobList.supplier_name,
        notes: jobList.notes,
      },
      items.map((i) => ({
        name: i.name,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
      }))
    );
  };

  const handleCopyText = async () => {
    const header = `Job List — Estimate ${estimateMeta?.estimate_number ?? '—'}${
      jobList.supplier_name ? ` — Supplier: ${jobList.supplier_name}` : ''
    }`;
    const lines = items.map(
      (i) =>
        `${i.quantity} ${i.unit || 'each'} — ${i.name}${
          i.description ? ` (${i.description})` : ''
        }`
    );
    const text = [header, '', ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Job List
            <Badge variant={jobList.status === 'sent' ? 'default' : 'secondary'} className="capitalize">
              {jobList.status}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyText} disabled={items.length === 0}>
              <Copy className="h-4 w-4" /> Copy as text
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={items.length === 0}>
              <FileDown className="h-4 w-4" /> Export PDF
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPushConfirmOpen(true)}
                      disabled={items.length === 0 || pushToTakeoffMutation.isPending}
                    >
                      {pushToTakeoffMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Push to Material Takeoff
                    </Button>
                  </span>
                </TooltipTrigger>
                {items.length === 0 && (
                  <TooltipContent>Generate the Job List first.</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              onClick={() => setEmailOpen(true)}
              disabled={items.length === 0}
              style={{ backgroundColor: '#1e3a5f', color: 'white' }}
            >
              <Mail className="h-4 w-4" /> Email to Supplier
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="supplier_name">Supplier</Label>
            <Input
              id="supplier_name"
              defaultValue={jobList.supplier_name ?? ''}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (jobList.supplier_name ?? '')) {
                  updateListMutation.mutate({ supplier_name: v || null });
                }
              }}
              placeholder="e.g. Carrier Enterprise"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jl_notes">Notes</Label>
            <Textarea
              id="jl_notes"
              defaultValue={jobList.notes ?? ''}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (jobList.notes ?? '')) {
                  updateListMutation.mutate({ notes: v || null });
                }
              }}
              rows={2}
              placeholder="Pickup time, PO #, etc."
            />
          </div>
        </div>

        <div className="border rounded-md">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-28">Unit</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      onUpdate={(patch) =>
                        updateItemMutation.mutate({ id: item.id, patch, markEdited: true })
                      }
                      onDelete={() => deleteRowMutation.mutate(item.id)}
                    />
                  ))}
                </SortableContext>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      No items yet. Click "Add Row" to begin.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <div>
          <Button variant="outline" size="sm" onClick={() => addRowMutation.mutate()} disabled={addRowMutation.isPending}>
            <Plus className="h-4 w-4" /> Add Row
          </Button>
        </div>
      </CardContent>
      <EmailSupplierDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        estimateNumber={estimateMeta?.estimate_number ?? '—'}
        items={items}
        jobListId={jobList.id}
        onSent={() => {
          updateListMutation.mutate({ status: 'sent' });
          setEmailOpen(false);
        }}
      />
      <AlertDialog open={pushConfirmOpen} onOpenChange={setPushConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Push to Material Takeoff?</AlertDialogTitle>
            <AlertDialogDescription>
              Push these {items.length} item{items.length === 1 ? '' : 's'} to a new field Material Takeoff list?
              The field crew will see it under Material Lists. This creates a separate list and does not change
              your Job List.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pushToTakeoffMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                pushToTakeoffMutation.mutate();
              }}
              disabled={pushToTakeoffMutation.isPending}
            >
              {pushToTakeoffMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Push to Takeoff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};


interface RowProps {
  item: JobListItem;
  onUpdate: (patch: Partial<JobListItem>) => void;
  onDelete: () => void;
}

const SortableItemRow = ({ item, onUpdate, onDelete }: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            defaultValue={item.name}
            onBlur={(e) => {
              if (e.target.value !== item.name) onUpdate({ name: e.target.value });
            }}
            className="h-8"
          />
          {item.manually_added ? (
            <Badge variant="outline" className="text-[10px]">Added</Badge>
          ) : item.is_manually_edited ? (
            <Badge variant="outline" className="text-[10px]">Edited</Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <Input
          defaultValue={item.description ?? ''}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== (item.description ?? '')) onUpdate({ description: v || null });
          }}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          defaultValue={item.quantity}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v !== item.quantity) onUpdate({ quantity: v });
          }}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          defaultValue={item.unit}
          onBlur={(e) => {
            if (e.target.value !== item.unit) onUpdate({ unit: e.target.value || 'each' });
          }}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

interface Supplier {
  id: string;
  name: string;
}

interface SupplierContact {
  id: string;
  supplier_id: string;
  contact_name: string;
  email: string;
  title: string | null;
  is_active: boolean;
  sort_order: number;
}

interface EmailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  estimateNumber: string;
  items: JobListItem[];
  jobListId: string;
  onSent: () => void;
}

const EmailSupplierDialog = ({
  open,
  onOpenChange,
  estimateNumber,
  items,
  onSent,
}: EmailDialogProps) => {
  const [supplierId, setSupplierId] = useState<string>('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(`Parts Request — Job List for Estimate ${estimateNumber}`);
      setMessage(
        `Hi,\n\nPlease see the parts request below for estimate ${estimateNumber}. Let me know availability and pickup options.\n\nThanks,`
      );
      setSupplierId('');
      setChecked({});
    }
  }, [open, estimateNumber]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['crm_suppliers_active_for_email'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['crm_supplier_contacts_for_email', supplierId],
    enabled: open && !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as SupplierContact[];
    },
  });

  useEffect(() => {
    if (contacts.length > 0) {
      const next: Record<string, boolean> = {};
      contacts.forEach((c) => { next[c.id] = true; });
      setChecked(next);
    } else {
      setChecked({});
    }
  }, [contacts]);

  const selectedEmails = useMemo(
    () => contacts.filter((c) => checked[c.id]).map((c) => c.email),
    [contacts, checked]
  );

  const buildBody = () => {
    const rowsHtml = items
      .map(
        (i) =>
          `<tr><td style="padding:6px 10px;border:1px solid #ccc;">${i.quantity}</td><td style="padding:6px 10px;border:1px solid #ccc;">${i.unit || 'each'}</td><td style="padding:6px 10px;border:1px solid #ccc;">${escapeHtml(i.name)}</td><td style="padding:6px 10px;border:1px solid #ccc;">${escapeHtml(i.description || '')}</td></tr>`
      )
      .join('');
    const html = `
      <div style="font-family:Arial,sans-serif;color:#1e3a5f;">
        <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
        <h3 style="color:#1e3a5f;border-bottom:2px solid #d4a84b;padding-bottom:4px;">Parts Request — Estimate ${escapeHtml(estimateNumber)}</h3>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <thead>
            <tr style="background:#1e3a5f;color:#fff;">
              <th style="padding:6px 10px;text-align:left;">Qty</th>
              <th style="padding:6px 10px;text-align:left;">Unit</th>
              <th style="padding:6px 10px;text-align:left;">Item</th>
              <th style="padding:6px 10px;text-align:left;">Description</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
    const textLines = items.map(
      (i) => `${i.quantity} ${i.unit || 'each'} — ${i.name}${i.description ? ` (${i.description})` : ''}`
    );
    const text = `${message}\n\nParts Request — Estimate ${estimateNumber}\n\n${textLines.join('\n')}`;
    return { html, text };
  };

  const handleSend = async () => {
    if (selectedEmails.length === 0) return;
    setSending(true);
    try {
      const { html, text } = buildBody();
      const [to, ...cc] = selectedEmails;
      const { error } = await supabase.functions.invoke('send-crm-email', {
        body: { to, cc, subject, bodyHtml: html, bodyText: text },
      });
      if (error) throw error;
      toast.success('Parts request sent');
      onSent();
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ color: '#1e3a5f' }}>Email Parts Request to Supplier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supplierId && (
            <div className="space-y-2">
              <Label>Recipients</Label>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active contacts for this supplier.</p>
              ) : (
                <div className="rounded border divide-y max-h-48 overflow-y-auto">
                  {contacts.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={!!checked[c.id]}
                        onCheckedChange={(v) =>
                          setChecked((prev) => ({ ...prev, [c.id]: !!v }))
                        }
                      />
                      <div className="text-sm">
                        <span className="font-medium">{c.contact_name}</span>
                        <span className="text-muted-foreground"> — {c.email}</span>
                        {c.title && <span className="text-muted-foreground"> — {c.title}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={selectedEmails.length === 0 || !subject.trim() || sending}
            style={{ backgroundColor: '#1e3a5f', color: 'white' }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send to {selectedEmails.length || 0} recipient{selectedEmails.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
