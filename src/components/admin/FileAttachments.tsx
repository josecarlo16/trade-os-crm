import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Upload, FileText, Trash2, Download, Loader2, Paperclip, Image, FileSpreadsheet, File } from 'lucide-react';
import { toast } from 'sonner';

interface FileAttachmentsProps {
  entityType: 'customer' | 'estimate' | 'job';
  entityId: string;
  title?: string;
  compact?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('excel')) return FileSpreadsheet;
  return File;
};

export const FileAttachments = ({ entityType, entityId, title = 'File Attachments', compact = false }: FileAttachmentsProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['file_attachments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('file_attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: { id: string; file_path: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.file_path]);
      if (storageError) console.warn('Storage delete error:', storageError);
      
      // Delete from DB
      const { error } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file_attachments', entityType, entityId] });
      toast.success('File deleted');
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const file of Array.from(selectedFiles)) {
        const filePath = `${entityType}/${entityId}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('file_attachments')
          .insert({
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            entity_type: entityType,
            entity_id: entityId,
            uploaded_by: user?.id || null,
          });
        if (dbError) throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ['file_attachments', entityType, entityId] });
      toast.success(`${selectedFiles.length} file(s) uploaded`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (attachment: { file_name: string; file_path: string }) => {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.file_path, 300);
    if (error || !data?.signedUrl) {
      toast.error('Could not generate download link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const fileToDelete = files.find(f => f.id === deleteId);

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle className={compact ? 'text-base' : 'text-lg'}>
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              {title}
              {files.length > 0 && (
                <Badge variant="secondary" className="text-xs">{files.length}</Badge>
              )}
            </div>
          </CardTitle>
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No files attached. Upload supplier quotes, documents, or images.
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const IconComponent = getFileIcon(file.file_type);
              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.file_size ? formatFileSize(file.file_size) : 'Unknown size'}
                        {' • '}
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setDeleteId(file.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.file_name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => fileToDelete && deleteMutation.mutate(fileToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
