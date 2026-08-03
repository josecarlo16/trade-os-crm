import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  EquipmentDocument,
  EquipmentDocumentOwnerType,
  EquipmentDocumentType,
} from '@/types/equipmentDocument';

const BUCKET = 'equipment-documents';

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120);

export interface UploadDocInput {
  file: File;
  document_type: EquipmentDocumentType;
  display_name?: string | null;
  notes?: string | null;
  is_default?: boolean;
}

export interface UpdateDocInput {
  id: string;
  display_name?: string | null;
  document_type?: EquipmentDocumentType;
  notes?: string | null;
  is_default?: boolean;
  sort_order?: number;
}

export const useEquipmentDocuments = (
  ownerType: EquipmentDocumentOwnerType,
  ownerId: string | null | undefined,
) => {
  const qc = useQueryClient();
  const queryKey = ['equipment_documents', ownerType, ownerId];

  const list = useQuery({
    queryKey,
    enabled: !!ownerId,
    queryFn: async (): Promise<EquipmentDocument[]> => {
      const { data, error } = await supabase
        .from('equipment_documents' as any)
        .select('*')
        .eq('owner_type', ownerType)
        .eq('owner_id', ownerId!)
        .order('document_type', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EquipmentDocument[];
    },
  });

  const upload = useMutation({
    mutationFn: async (input: UploadDocInput) => {
      if (!ownerId) throw new Error('Missing owner');
      const { data: { user } } = await supabase.auth.getUser();
      const id = crypto.randomUUID();
      const path = `${ownerType}/${ownerId}/${id}-${sanitize(input.file.name)}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: input.file.type || undefined,
        });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from('equipment_documents' as any)
        .insert({
          owner_type: ownerType,
          owner_id: ownerId,
          document_type: input.document_type,
          file_name: input.file.name,
          display_name: input.display_name ?? null,
          file_path: path,
          file_size: input.file.size,
          mime_type: input.file.type || null,
          notes: input.notes ?? null,
          is_default: input.is_default ?? false,
          uploaded_by: user?.id ?? null,
        } as any);
      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: UpdateDocInput) => {
      const { error } = await supabase
        .from('equipment_documents' as any)
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (doc: EquipmentDocument) => {
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
      const { error } = await supabase
        .from('equipment_documents' as any)
        .delete()
        .eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const getSignedUrl = async (path: string, expiresIn = 300) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  };

  return { ...list, upload, update, remove, getSignedUrl };
};
