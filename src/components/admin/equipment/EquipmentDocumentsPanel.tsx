import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { ImageLightbox } from '@/components/ui/image-lightbox';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Pencil,
  Trash2,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DOCUMENT_TYPE_BADGE,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  EquipmentDocument,
  EquipmentDocumentOwnerType,
  EquipmentDocumentType,
  formatFileSize,
} from '@/types/equipmentDocument';
import { useEquipmentDocuments } from '@/hooks/useEquipmentDocuments';

interface Props {
  ownerType: EquipmentDocumentOwnerType;
  ownerId: string;
  ownerLabel?: string;
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';

const isImage = (mime: string | null) => !!mime && mime.startsWith('image/');
const isPdf = (mime: string | null) => mime === 'application/pdf';

export const EquipmentDocumentsPanel = ({ ownerType, ownerId, ownerLabel }: Props) => {
  const { data: docs = [], isLoading, upload, update, remove, getSignedUrl } =
    useEquipmentDocuments(ownerType, ownerId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingType, setPendingType] = useState<EquipmentDocumentType>('spec_sheet');
  const [pendingDisplay, setPendingDisplay] = useState('');
  const [pendingDefault, setPendingDefault] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState<EquipmentDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentDocument | null>(null);
  const [lightbox, setLightbox] = useState<{ open: boolean; src: string; alt: string }>({
    open: false,
    src: '',
    alt: '',
  });

  const grouped = useMemo(() => {
    const map = new Map<EquipmentDocumentType, EquipmentDocument[]>();
    for (const d of docs) {
      const arr = map.get(d.document_type) ?? [];
      arr.push(d);
      map.set(d.document_type, arr);
    }
    return map;
  }, [docs]);

  const handleSelectFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    if (files.length === 1) {
      setPendingFile(files[0]);
      setPendingDisplay('');
      setPendingDefault(false);
      return;
    }
    // Multi-file: upload all immediately as 'other' or default category
    void uploadMany(Array.from(files));
  };

  const uploadMany = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        await upload.mutateAsync({
          file,
          document_type: 'spec_sheet',
        });
      }
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await upload.mutateAsync({
        file: pendingFile,
        document_type: pendingType,
        display_name: pendingDisplay || null,
        is_default: pendingDefault,
      });
      toast.success('Document uploaded');
      setPendingFile(null);
      setPendingDisplay('');
      setPendingDefault(false);
      setPendingType('spec_sheet');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleView = async (doc: EquipmentDocument) => {
    try {
      const url = await getSignedUrl(doc.file_path, 300);
      if (isImage(doc.mime_type)) {
        setLightbox({ open: true, src: url, alt: doc.display_name || doc.file_name });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not open document');
    }
  };

  const handleDownload = async (doc: EquipmentDocument) => {
    try {
      const url = await getSignedUrl(doc.file_path, 300);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
  };

  const toggleDefault = async (doc: EquipmentDocument, value: boolean) => {
    try {
      await update.mutateAsync({ id: doc.id, is_default: value });
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await update.mutateAsync({
        id: editing.id,
        display_name: editing.display_name,
        document_type: editing.document_type,
        notes: editing.notes,
      });
      toast.success('Document updated');
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget);
      toast.success('Document deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      {ownerLabel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          <span>Documents for <span className="font-medium text-foreground">{ownerLabel}</span></span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleSelectFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleSelectFiles(e.target.files)}
        />
        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, WEBP</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
          No documents yet. Drop a submittal or spec sheet here.
        </div>
      ) : (
        <div className="space-y-4">
          {DOCUMENT_TYPES.filter((t) => grouped.has(t)).map((type) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={DOCUMENT_TYPE_BADGE[type]}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {grouped.get(type)!.length} file{grouped.get(type)!.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-1.5">
                {grouped.get(type)!.map((doc) => {
                  const Icon = isImage(doc.mime_type) ? ImageIcon : FileText;
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/50 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {doc.display_name || doc.file_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                          {' • '}
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                          {doc.display_name && (
                            <> • <span className="font-mono">{doc.file_name}</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 mr-2">
                          <Switch
                            checked={doc.is_default}
                            onCheckedChange={(v) => toggleDefault(doc, v)}
                          />
                          <span className="text-xs text-muted-foreground hidden sm:inline">Default</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="View"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Download"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() => setEditing(doc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Delete"
                          onClick={() => setDeleteTarget(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload-detail dialog (single file) */}
      <Dialog open={!!pendingFile} onOpenChange={(o) => !o && setPendingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              {pendingFile?.name} ({formatFileSize(pendingFile?.size ?? 0)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Document Type</Label>
              <Select value={pendingType} onValueChange={(v) => setPendingType(v as EquipmentDocumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Display Name (optional)</Label>
              <Input
                value={pendingDisplay}
                onChange={(e) => setPendingDisplay(e.target.value)}
                placeholder="Friendly name to show in lists"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={pendingDefault} onCheckedChange={setPendingDefault} />
              <Label className="text-sm">Auto-attach to estimates by default</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingFile(null)} disabled={uploading}>Cancel</Button>
            <Button onClick={confirmUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>{editing?.file_name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Document Type</Label>
                <Select
                  value={editing.document_type}
                  onValueChange={(v) =>
                    setEditing({ ...editing, document_type: v as EquipmentDocumentType })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={editing.display_name ?? ''}
                  onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.display_name || deleteTarget?.file_name}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImageLightbox
        open={lightbox.open}
        onOpenChange={(o) => setLightbox((s) => ({ ...s, open: o }))}
        src={lightbox.src}
        alt={lightbox.alt}
      />
    </div>
  );
};

export default EquipmentDocumentsPanel;
