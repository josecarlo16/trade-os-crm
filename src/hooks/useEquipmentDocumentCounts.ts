import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentDocumentOwnerType, EquipmentDocument } from '@/types/equipmentDocument';

/**
 * Returns a Map<owner_id, count> of equipment documents for the given owner_type.
 * Lightweight bulk fetch to avoid one query per row.
 */
export const useEquipmentDocumentCounts = (ownerType: EquipmentDocumentOwnerType) => {
  return useQuery({
    queryKey: ['equipment_document_counts', ownerType],
    queryFn: async (): Promise<{
      counts: Map<string, number>;
      defaultsByOwner: Map<string, EquipmentDocument[]>;
    }> => {
      const { data, error } = await supabase
        .from('equipment_documents' as any)
        .select('*')
        .eq('owner_type', ownerType);
      if (error) throw error;
      const counts = new Map<string, number>();
      const defaultsByOwner = new Map<string, EquipmentDocument[]>();
      for (const row of (data ?? []) as unknown as EquipmentDocument[]) {
        counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1);
        if (row.is_default) {
          const arr = defaultsByOwner.get(row.owner_id) ?? [];
          arr.push(row);
          defaultsByOwner.set(row.owner_id, arr);
        }
      }
      return { counts, defaultsByOwner };
    },
  });
};
