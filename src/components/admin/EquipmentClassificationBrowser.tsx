import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Loader2,
  Sparkles,
  Wrench,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
  Save,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { formatDistanceToNow } from 'date-fns';

type ContentType =
  | 'data_plate'
  | 'install_shot'
  | 'diagnostic'
  | 'component'
  | 'other';
type ReviewStatus =
  | 'auto_approved'
  | 'needs_review'
  | 'approved'
  | 'rejected'
  | 'classification_failed'
  | 'pending';

interface MediaRow {
  id: string;
  job_id: string;
  media_url: string | null;
  thumbnail_url: string | null;
  captured_at: string | null;
  content_type: ContentType | null;
  classification_confidence: number | null;
  classification_metadata: unknown;
  classified_at: string | null;
  review_status: ReviewStatus;
  extracted_brand: string | null;
  extracted_model: string | null;
  extracted_serial: string | null;
  extracted_tonnage: number | null;
  extracted_refrigerant: string | null;
  extracted_mfg_date: string | null;
  extraction_confidence: number | null;
  equipment_page_id: string | null;
  crm_jobs?: {
    job_number?: string;
    title?: string | null;
    crm_locations?: { city: string | null; zip_code: string | null } | null;
    crm_customers?: {
      first_name: string | null;
      last_name: string | null;
      company_name: string | null;
    } | null;
  } | null;
  equipment_pages?: { brand: string; model_number: string; slug: string } | null;
}

const CONTENT_TYPES: ContentType[] = [
  'data_plate',
  'install_shot',
  'diagnostic',
  'component',
  'other',
];
const REVIEW_STATUSES: ReviewStatus[] = [
  'auto_approved',
  'needs_review',
  'approved',
  'rejected',
  'classification_failed',
];

const CT_COLOR: Record<ContentType, string> = {
  data_plate: 'bg-amber-500/90 text-amber-950 border-amber-600',
  install_shot: 'bg-emerald-500/90 text-emerald-950 border-emerald-600',
  diagnostic: 'bg-sky-500/90 text-sky-950 border-sky-600',
  component: 'bg-violet-500/90 text-violet-950 border-violet-600',
  other: 'bg-muted text-muted-foreground border-border',
};
const RS_COLOR: Record<ReviewStatus, string> = {
  auto_approved: 'bg-emerald-500/90 text-emerald-950',
  approved: 'bg-emerald-700 text-white',
  needs_review: 'bg-amber-500/90 text-amber-950',
  rejected: 'bg-destructive text-destructive-foreground',
  classification_failed: 'bg-destructive/70 text-destructive-foreground',
  pending: 'bg-muted text-muted-foreground',
};

function confidenceColor(c: number | null) {
  if (c == null) return 'bg-muted';
  if (c >= 0.85) return 'bg-emerald-500';
  if (c >= 0.6) return 'bg-amber-500';
  return 'bg-destructive';
}

export function EquipmentClassificationBrowser() {
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const canDestructive = isAdmin || isSuperAdmin;

  const [contentTypeFilter, setContentTypeFilter] = useState<
    Set<ContentType | 'unclassified'>
  >(new Set());
  const [reviewStatusFilter, setReviewStatusFilter] = useState<
    Set<ReviewStatus>
  >(new Set());
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openItem, setOpenItem] = useState<MediaRow | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    brand: '',
    model_number: '',
    serial_number: '',
    tonnage: '',
    refrigerant: '',
    mfg_date: '',
  });
  const [classifyRunning, setClassifyRunning] = useState(false);
  const [confirmForceOpen, setConfirmForceOpen] = useState(false);
  const [confirmBackfillOpen, setConfirmBackfillOpen] = useState(false);

  // ----- Data -----
  const { data: items = [], isLoading } = useQuery({
    queryKey: [
      'equipment-classification-browser',
      Array.from(contentTypeFilter).sort(),
      Array.from(reviewStatusFilter).sort(),
    ],
    queryFn: async () => {
      let query = supabase
        .from('workedge_project_media')
        .select(
          `
          id, job_id, media_url, thumbnail_url, captured_at,
          content_type, classification_confidence, classification_metadata,
          classified_at, review_status,
          extracted_brand, extracted_model, extracted_serial,
          extracted_tonnage, extracted_refrigerant, extracted_mfg_date,
          extraction_confidence, equipment_page_id,
          crm_jobs:job_id (
            job_number,
            title,
            crm_locations:location_id ( city, zip_code ),
            crm_customers:customer_id ( first_name, last_name, company_name )
          ),
          equipment_pages:equipment_page_id ( brand, model_number, slug )
        `,
        )
        .eq('media_type', 'photo')
        .not('media_url', 'is', null)
        .order('classified_at', { ascending: false, nullsFirst: true })
        .limit(300);

      const cts = Array.from(contentTypeFilter);
      const wantsUnclassified = cts.includes('unclassified');
      const realCts = cts.filter((c) => c !== 'unclassified') as ContentType[];

      if (wantsUnclassified && realCts.length === 0) {
        query = query.is('content_type', null);
      } else if (!wantsUnclassified && realCts.length > 0) {
        query = query.in('content_type', realCts);
      }
      // If both unclassified + real types selected, fetch all and filter client-side below.

      if (reviewStatusFilter.size > 0) {
        query = query.in('review_status', Array.from(reviewStatusFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      let rows = (data ?? []) as unknown as MediaRow[];

      if (wantsUnclassified && realCts.length > 0) {
        rows = rows.filter(
          (r) => r.content_type === null || realCts.includes(r.content_type),
        );
      }
      return rows;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['equipment-classification-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workedge_project_media')
        .select('content_type, review_status, equipment_page_id')
        .eq('media_type', 'photo')
        .not('media_url', 'is', null);
      if (error) throw error;
      const total = data.length;
      const classified = data.filter((d) => d.content_type != null).length;
      const dataPlates = data.filter((d) => d.content_type === 'data_plate')
        .length;
      const linkedEquipment = new Set(
        data.filter((d) => d.equipment_page_id).map((d) => d.equipment_page_id),
      ).size;
      const needsReview = data.filter((d) => d.review_status === 'needs_review')
        .length;
      return { total, classified, dataPlates, linkedEquipment, needsReview };
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((it) => {
      const job = it.crm_jobs?.job_number?.toLowerCase() ?? '';
      const city = it.crm_jobs?.crm_locations?.city?.toLowerCase() ?? '';
      const zip = it.crm_jobs?.crm_locations?.zip_code?.toLowerCase() ?? '';
      const brand = it.extracted_brand?.toLowerCase() ?? '';
      const model = it.extracted_model?.toLowerCase() ?? '';
      return (
        job.includes(s) ||
        city.includes(s) ||
        zip.includes(s) ||
        brand.includes(s) ||
        model.includes(s)
      );
    });
  }, [items, search]);

  // ----- Mutations -----
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['equipment-classification-browser'],
    });
    queryClient.invalidateQueries({
      queryKey: ['equipment-classification-stats'],
    });
  };

  const callClassifier = async (body: Record<string, unknown>, label: string) => {
    setClassifyRunning(true);
    const id = toast.loading(`${label}...`);
    try {
      const { data, error } = await supabase.functions.invoke(
        'classify-workedge-media',
        { body },
      );
      if (error) throw error;
      toast.success(
        `${label} done: ${data.processed} processed, ${data.equipment_extracted} data plates, ${data.new_models_created} new models`,
        { id },
      );
      refresh();
    } catch (e) {
      toast.error(
        `${label} failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        { id },
      );
    } finally {
      setClassifyRunning(false);
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (args: { ids: string[]; status: ReviewStatus }) => {
      const { error } = await supabase
        .from('workedge_project_media')
        .update({ review_status: args.status })
        .in('id', args.ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        `Marked ${vars.ids.length} item${vars.ids.length === 1 ? '' : 's'} as ${vars.status}`,
      );
      setSelectedIds(new Set());
      refresh();
    },
    onError: (e) =>
      toast.error(
        `Update failed: ${e instanceof Error ? e.message : 'unknown'}`,
      ),
  });

  const overrideTypeMutation = useMutation({
    mutationFn: async (args: { id: string; content_type: ContentType }) => {
      const { error } = await supabase
        .from('workedge_project_media')
        .update({
          content_type: args.content_type,
          classification_confidence: 1.0,
          classified_at: new Date().toISOString(),
          review_status: 'approved',
          classification_metadata: { reasoning: 'Manually set by admin', manual_override: true },
        })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Type set to ${vars.content_type.replace('_', ' ')}`);
      setOpenItem((prev) => (prev ? { ...prev, content_type: vars.content_type, review_status: 'approved' } : prev));
      refresh();
    },
    onError: (e) =>
      toast.error(`Type update failed: ${e instanceof Error ? e.message : 'unknown'}`),
  });

  const saveEditMutation = useMutation({
    mutationFn: async (item: MediaRow) => {
      // Update extraction fields locally
      const tonnageNum = editForm.tonnage
        ? parseFloat(editForm.tonnage)
        : null;
      await supabase
        .from('workedge_project_media')
        .update({
          extracted_brand: editForm.brand || null,
          extracted_model: editForm.model_number || null,
          extracted_serial: editForm.serial_number || null,
          extracted_tonnage: tonnageNum,
          extracted_refrigerant: editForm.refrigerant || null,
          extracted_mfg_date: editForm.mfg_date || null,
          extraction_confidence: 1.0,
          review_status: 'approved',
        })
        .eq('id', item.id);

      // Route through upsert-equipment-page as manual edit
      if (editForm.brand && editForm.model_number) {
        const upsertBody: Record<string, unknown> = {
          brand: editForm.brand,
          model_number: editForm.model_number,
          source: 'manual',
          source_confidence: 1.0,
        };
        if (tonnageNum) upsertBody.tonnage = tonnageNum;
        if (editForm.refrigerant) upsertBody.refrigerant = editForm.refrigerant;
        if (editForm.mfg_date) {
          upsertBody.manufactured_year = parseInt(
            editForm.mfg_date.slice(0, 4),
            10,
          );
        }
        if (item.crm_jobs?.crm_locations?.city) {
          upsertBody.install_city = item.crm_jobs.crm_locations.city;
        }
        if (item.crm_jobs?.crm_locations?.zip_code) {
          upsertBody.install_zip = item.crm_jobs.crm_locations.zip_code;
        }
        if (item.job_id) upsertBody.job_id = item.job_id;
        if (editForm.serial_number) {
          upsertBody.serial_numbers = [editForm.serial_number];
        }

        const { data: upsertData, error: upErr } =
          await supabase.functions.invoke('upsert-equipment-page', {
            body: upsertBody,
          });
        if (upErr) throw upErr;
        if (upsertData?.equipment_page_id) {
          await supabase
            .from('workedge_project_media')
            .update({ equipment_page_id: upsertData.equipment_page_id })
            .eq('id', item.id);
        }
      }
    },
    onSuccess: () => {
      toast.success('Extraction saved & equipment page updated');
      setEditMode(false);
      setOpenItem(null);
      refresh();
    },
    onError: (e) =>
      toast.error(`Save failed: ${e instanceof Error ? e.message : 'unknown'}`),
  });

  // Scan a data plate image with AI to auto-extract specs
  const scanMutation = useMutation({
    mutationFn: async (item: MediaRow) => {
      if (!item.media_url) throw new Error('No image URL on this media item');

      // Fetch image and convert to base64 data URL
      const res = await fetch(item.media_url);
      if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
      const blob = await res.blob();
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      const zip = item.crm_jobs?.crm_locations?.zip_code ?? undefined;

      const { data, error } = await supabase.functions.invoke('decode-equipment', {
        body: {
          imageBase64: base64,
          zipCode: zip,
          isDfw: true,
        },
      });
      if (error) throw error;
      const specs = (data?.specs ?? {}) as Record<string, unknown>;

      const tonnageStr = specs.tonnage ? String(specs.tonnage) : null;
      const tonnageNum = tonnageStr ? parseFloat(tonnageStr) : null;
      const mfgYear = specs.manufactured_year ? Number(specs.manufactured_year) : null;
      const mfgDate = mfgYear ? `${mfgYear}-01-01` : null;

      const updates = {
        extracted_brand: (specs.brand as string) ?? null,
        extracted_model: (specs.model_number as string) ?? null,
        extracted_serial: (specs.serial_number as string) ?? null,
        extracted_tonnage: Number.isFinite(tonnageNum as number) ? tonnageNum : null,
        extracted_refrigerant: (specs.refrigerant as string) ?? null,
        extracted_mfg_date: mfgDate,
        extraction_confidence: 0.9,
        review_status: 'auto_approved' as const,
      };

      const { error: upErr } = await supabase
        .from('workedge_project_media')
        .update(updates)
        .eq('id', item.id);
      if (upErr) throw upErr;

      return { ...item, ...updates };
    },
    onSuccess: (updated) => {
      toast.success('Data plate scanned');
      // Sync open sheet + edit form with new values
      setOpenItem((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditForm({
        brand: updated.extracted_brand ?? '',
        model_number: updated.extracted_model ?? '',
        serial_number: updated.extracted_serial ?? '',
        tonnage: updated.extracted_tonnage?.toString() ?? '',
        refrigerant: updated.extracted_refrigerant ?? '',
        mfg_date: updated.extracted_mfg_date ?? '',
      });
      refresh();
    },
    onError: (e) =>
      toast.error(`Scan failed: ${e instanceof Error ? e.message : 'unknown'}`),
  });

  // ----- UI helpers -----
  const toggleCT = (c: ContentType | 'unclassified') => {
    setContentTypeFilter((prev) => {
      const n = new Set(prev);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });
  };
  const toggleRS = (s: ReviewStatus) => {
    setReviewStatusFilter((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const openDetail = (it: MediaRow) => {
    setOpenItem(it);
    setEditMode(false);
    setEditForm({
      brand: it.extracted_brand ?? '',
      model_number: it.extracted_model ?? '',
      serial_number: it.extracted_serial ?? '',
      tonnage: it.extracted_tonnage?.toString() ?? '',
      refrigerant: it.extracted_refrigerant ?? '',
      mfg_date: it.extracted_mfg_date ?? '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => callClassifier({ batch_size: 25 }, 'Classifying')}
            disabled={classifyRunning}
            size="sm"
          >
            {classifyRunning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Classify Unclassified (25)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmBackfillOpen(true)}
            disabled={classifyRunning}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Backfill Classifier (200)
          </Button>
          {canDestructive && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmForceOpen(true)}
              disabled={classifyRunning}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Force Reclassify All (50)
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Job, city, ZIP, brand, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-72"
          />
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total photos" value={stats.total} />
          <StatCard
            label="Classified"
            value={`${stats.classified} / ${stats.total}`}
          />
          <StatCard label="Data plates" value={stats.dataPlates} />
          <StatCard label="Linked equipment" value={stats.linkedEquipment} />
          <StatCard
            label="Needs review"
            value={stats.needsReview}
            highlight={stats.needsReview > 0}
          />
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase">
            Type:
          </span>
          <Badge
            variant={contentTypeFilter.has('unclassified') ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => toggleCT('unclassified')}
          >
            Unclassified
          </Badge>
          {CONTENT_TYPES.map((c) => (
            <Badge
              key={c}
              variant={contentTypeFilter.has(c) ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => toggleCT(c)}
            >
              {c.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase">
            Status:
          </span>
          {REVIEW_STATUSES.map((s) => (
            <Badge
              key={s}
              variant={reviewStatusFilter.has(s) ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => toggleRS(s)}
            >
              {s.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="default"
            onClick={() =>
              updateStatusMutation.mutate({
                ids: Array.from(selectedIds),
                status: 'approved',
              })
            }
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Approve
          </Button>
          {canDestructive && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                updateStatusMutation.mutate({
                  ids: Array.from(selectedIds),
                  status: 'rejected',
                })
              }
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          )}
          {canDestructive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                callClassifier(
                  {
                    media_ids: Array.from(selectedIds),
                    force_reclassify: true,
                  },
                  'Reclassifying',
                )
              }
              disabled={classifyRunning}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reclassify
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No media matches the current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((it) => {
            const ct = it.content_type;
            const isSelected = selectedIds.has(it.id);
            return (
              <div
                key={it.id}
                className={`relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer group transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => openDetail(it)}
              >
                <img
                  src={it.thumbnail_url || it.media_url || ''}
                  alt={it.extracted_model ?? 'WorkEdge media'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Selection */}
                <div
                  className="absolute top-1.5 left-1.5 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(it.id);
                  }}
                >
                  <Checkbox checked={isSelected} className="bg-background" />
                </div>
                {/* Content type badge */}
                {ct && (
                  <Badge
                    className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0 capitalize ${CT_COLOR[ct]}`}
                  >
                    {ct.replace('_', ' ')}
                  </Badge>
                )}
                {/* Review status badge */}
                <Badge
                  className={`absolute top-7 right-1.5 text-[10px] px-1.5 py-0 capitalize ${RS_COLOR[it.review_status] ?? RS_COLOR.pending}`}
                >
                  {it.review_status.replace('_', ' ')}
                </Badge>
                {/* Bottom info */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-white text-[11px] space-y-0.5">
                  <div className="flex items-center gap-1 opacity-90">
                    <span className="truncate">
                      {it.crm_jobs?.job_number ?? '—'}
                    </span>
                    {it.crm_jobs?.crm_locations?.city && (
                      <>
                        <span>·</span>
                        <span className="truncate">
                          {it.crm_jobs.crm_locations.city}
                        </span>
                      </>
                    )}
                  </div>
                  {ct === 'data_plate' &&
                    (it.extracted_brand || it.extracted_model) && (
                      <div className="font-semibold truncate">
                        {it.extracted_brand} {it.extracted_model}
                      </div>
                    )}
                </div>
                {/* Confidence bar */}
                {it.classification_confidence != null && (
                  <div className="absolute inset-x-0 bottom-0 h-1">
                    <div
                      className={`h-full ${confidenceColor(it.classification_confidence)}`}
                      style={{
                        width: `${Math.round(it.classification_confidence * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet
        open={!!openItem}
        onOpenChange={(o) => {
          if (!o) {
            setOpenItem(null);
            setEditMode(false);
          }
        }}
      >
        <SheetContent className="w-full sm:!max-w-[50vw] sm:w-[50vw] overflow-y-auto">
          {openItem && (
            <DetailContent
              item={openItem}
              editMode={editMode}
              setEditMode={setEditMode}
              editForm={editForm}
              setEditForm={setEditForm}
              canDestructive={canDestructive}
              onApprove={() =>
                updateStatusMutation.mutate({
                  ids: [openItem.id],
                  status: 'approved',
                })
              }
              onReject={() =>
                updateStatusMutation.mutate({
                  ids: [openItem.id],
                  status: 'rejected',
                })
              }
              onReclassify={() =>
                callClassifier(
                  { media_ids: [openItem.id], force_reclassify: true },
                  'Reclassifying',
                )
              }
              onSaveEdit={() => saveEditMutation.mutate(openItem)}
              saving={saveEditMutation.isPending}
              classifyRunning={classifyRunning}
              onOverrideType={(ct) =>
                overrideTypeMutation.mutate({ id: openItem.id, content_type: ct })
              }
              overridingType={overrideTypeMutation.isPending}
              onScan={() => scanMutation.mutate(openItem)}
              scanning={scanMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm dialogs */}
      <AlertDialog open={confirmForceOpen} onOpenChange={setConfirmForceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force reclassify all?</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-run classification on up to 50 photos including
              already-classified items (excluding ones marked Approved). Costs
              AI gateway credits. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                callClassifier(
                  { batch_size: 50, force_reclassify: true },
                  'Reclassifying',
                )
              }
            >
              Yes, reclassify
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmBackfillOpen}
        onOpenChange={setConfirmBackfillOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run backfill batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Process up to 200 unclassified photos in one run. May take 5-10
              minutes. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => callClassifier({ batch_size: 100 }, 'Backfilling')}
            >
              Run backfill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-amber-500' : ''}>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground uppercase font-medium">
          {label}
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

interface DetailContentProps {
  item: MediaRow;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  editForm: {
    brand: string;
    model_number: string;
    serial_number: string;
    tonnage: string;
    refrigerant: string;
    mfg_date: string;
  };
  setEditForm: (
    v: DetailContentProps['editForm'] | ((prev: DetailContentProps['editForm']) => DetailContentProps['editForm']),
  ) => void;
  canDestructive: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReclassify: () => void;
  onSaveEdit: () => void;
  saving: boolean;
  classifyRunning: boolean;
  onOverrideType: (ct: ContentType) => void;
  overridingType: boolean;
  onScan: () => void;
  scanning: boolean;
}

function DetailContent({
  item,
  editMode,
  setEditMode,
  editForm,
  setEditForm,
  canDestructive,
  onApprove,
  onReject,
  onReclassify,
  onSaveEdit,
  saving,
  classifyRunning,
  onOverrideType,
  overridingType,
  onScan,
  scanning,
}: DetailContentProps) {
  const meta = item.classification_metadata as
    | { reasoning?: string }
    | null;

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          {item.content_type
            ? item.content_type.replace('_', ' ').toUpperCase()
            : 'Unclassified'}
        </SheetTitle>
        <SheetDescription>
          {item.crm_jobs?.job_number ?? 'No job linked'}{' '}
          {item.classified_at &&
            `· classified ${formatDistanceToNow(new Date(item.classified_at), { addSuffix: true })}`}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-4 space-y-4">
        {item.media_url && (
          <img
            src={item.media_url}
            alt="Full size"
            className="w-full rounded-md border"
          />
        )}

        {/* Classification result */}
        <div className="rounded-md border p-3 bg-muted/30 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Classification</span>
            <Badge
              className={
                item.content_type
                  ? CT_COLOR[item.content_type]
                  : 'bg-muted text-muted-foreground'
              }
            >
              {item.content_type ?? 'unclassified'}
            </Badge>
          </div>
          {item.classification_confidence != null && (
            <div className="text-xs text-muted-foreground">
              Confidence: {(item.classification_confidence * 100).toFixed(0)}%
            </div>
          )}
          {meta?.reasoning && (
            <div className="text-xs italic text-muted-foreground">
              "{meta.reasoning}"
            </div>
          )}
          <div className="pt-2 mt-1 border-t flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              Override type:
            </Label>
            <Select
              value={item.content_type ?? ''}
              onValueChange={(v) => onOverrideType(v as ContentType)}
              disabled={overridingType}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Set type manually" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_plate">Data Plate</SelectItem>
                <SelectItem value="install_shot">Install Shot</SelectItem>
                <SelectItem value="diagnostic">Diagnostic</SelectItem>
                <SelectItem value="component">Component</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data plate fields */}
        {item.content_type === 'data_plate' && (
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Extracted data</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={onScan}
                  disabled={scanning || !item.media_url}
                  title="Use AI to read this data plate and fill the fields"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Scan with AI
                    </>
                  )}
                </Button>
                {!editMode ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {!editMode ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label="Brand" value={item.extracted_brand} />
                <Field label="Model" value={item.extracted_model} />
                <Field label="Serial" value={item.extracted_serial} />
                <Field
                  label="Tonnage"
                  value={item.extracted_tonnage?.toString() ?? null}
                />
                <Field label="Refrigerant" value={item.extracted_refrigerant} />
                <Field label="Mfg date" value={item.extracted_mfg_date} />
                <Field
                  label="Extraction conf."
                  value={
                    item.extraction_confidence != null
                      ? `${(item.extraction_confidence * 100).toFixed(0)}%`
                      : null
                  }
                />
                {item.equipment_pages && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground uppercase">
                      Linked page
                    </span>
                    <Link
                      to={`/equipment/${item.equipment_pages.slug}`}
                      target="_blank"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {item.equipment_pages.brand}{' '}
                      {item.equipment_pages.model_number}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <EditField
                  label="Brand"
                  value={editForm.brand}
                  onChange={(v) =>
                    setEditForm((p) => ({ ...p, brand: v }))
                  }
                />
                <EditField
                  label="Model"
                  value={editForm.model_number}
                  onChange={(v) =>
                    setEditForm((p) => ({ ...p, model_number: v }))
                  }
                />
                <EditField
                  label="Serial"
                  value={editForm.serial_number}
                  onChange={(v) =>
                    setEditForm((p) => ({ ...p, serial_number: v }))
                  }
                />
                <EditField
                  label="Tonnage"
                  value={editForm.tonnage}
                  onChange={(v) =>
                    setEditForm((p) => ({ ...p, tonnage: v }))
                  }
                  placeholder="3"
                />
                <EditField
                  label="Refrigerant"
                  value={editForm.refrigerant}
                  onChange={(v) =>
                    setEditForm((p) => ({ ...p, refrigerant: v }))
                  }
                  placeholder="R-410A"
                />
                <EditField
                  label="Mfg date"
                  value={editForm.mfg_date}
                  onChange={(v) =>
                    setEditForm((p) => ({ ...p, mfg_date: v }))
                  }
                  placeholder="YYYY-MM-DD"
                />
                <Button
                  className="col-span-2"
                  onClick={onSaveEdit}
                  disabled={
                    saving || !editForm.brand || !editForm.model_number
                  }
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save & re-upsert
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Raw response */}
        {item.classification_metadata && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
              <ChevronDown className="w-4 h-4" />
              Raw Gemini response
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="text-xs bg-muted rounded-md p-3 mt-2 overflow-auto max-h-64">
                {JSON.stringify(item.classification_metadata, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Project / customer context */}
        {(() => {
          const job = item.crm_jobs;
          const cust = job?.crm_customers;
          const customerName = cust
            ? [cust.first_name, cust.last_name].filter(Boolean).join(' ') ||
              cust.company_name ||
              null
            : null;
          const company = cust?.company_name || null;
          const loc = job?.crm_locations;
          const locStr = loc
            ? [loc.city, loc.zip_code].filter(Boolean).join(' ')
            : null;
          if (!job && !customerName) return null;
          return (
            <div className="rounded-md border p-3 bg-muted/30 space-y-1.5 text-sm">
              <div className="text-xs text-muted-foreground uppercase font-medium">
                Project
              </div>
              {customerName && (
                <div className="font-medium">
                  {customerName}
                  {company && company !== customerName && (
                    <span className="text-muted-foreground font-normal"> · {company}</span>
                  )}
                </div>
              )}
              {job?.title && (
                <div className="text-sm">{job.title}</div>
              )}
              {locStr && (
                <div className="text-xs text-muted-foreground">{locStr}</div>
              )}
              {job?.job_number && (
                <Link
                  to={`/admin/jobs/${item.job_id}`}
                  target="_blank"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-mono"
                >
                  {job.job_number}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button onClick={onApprove} size="sm">
            <Check className="w-4 h-4 mr-1" />
            Approve
          </Button>
          {canDestructive && (
            <Button onClick={onReject} variant="destructive" size="sm">
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          )}
          {canDestructive && (
            <Button
              onClick={onReclassify}
              variant="outline"
              size="sm"
              disabled={classifyRunning}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reclassify
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="font-medium">{value ?? '—'}</div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
