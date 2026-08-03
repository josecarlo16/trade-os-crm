import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface SoftDeleteOptions {
  tableName: string;
  queryKey: string | string[];
  itemLabel?: string;
}

export function useSoftDelete({ tableName, queryKey, itemLabel = "Item" }: SoftDeleteOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      // 1. Insert into trash_bin
      const { error: trashError } = await supabase
        .from("trash_bin")
        .insert({
          original_table: tableName,
          original_id: id,
          data: data as Json,
          deleted_by: userId,
        });
      
      if (trashError) throw trashError;

      // 2. Delete from original table using RPC or raw query approach
      // Since we need dynamic table names, we use the any type workaround
      const { error: deleteError } = await (supabase
        .from(tableName as "trash_bin")
        .delete()
        .eq("id", id) as unknown as Promise<{ error: Error | null }>);
      
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      const keys = Array.isArray(queryKey) ? queryKey : [queryKey];
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      queryClient.invalidateQueries({ queryKey: ["trash_bin"] });
      toast.success(`${itemLabel} moved to trash`);
    },
    onError: (e: Error) => {
      toast.error(e.message || `Failed to delete ${itemLabel.toLowerCase()}`);
    },
  });
}

export function useRestoreFromTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trashId, originalTable, data }: { 
      trashId: string; 
      originalTable: string; 
      data: Record<string, unknown>;
    }) => {
      // Keep original id for restoration, remove timestamps that will be auto-generated
      const restoreData = { ...data };
      delete restoreData.created_at;
      delete restoreData.updated_at;
      
      // 1. Insert back into original table with original ID
      // Using type assertion to handle dynamic table names
      const { error: insertError } = await supabase
        .from(originalTable as keyof typeof supabase extends never ? never : "trash_bin")
        .insert(restoreData as never);
      
      if (insertError) throw insertError;

      // 2. Delete from trash_bin
      const { error: deleteError } = await supabase
        .from("trash_bin")
        .delete()
        .eq("id", trashId);
      
      if (deleteError) throw deleteError;

      return originalTable;
    },
    onSuccess: (originalTable) => {
      queryClient.invalidateQueries({ queryKey: ["trash_bin"] });
      // Invalidate the original table query
      queryClient.invalidateQueries({ queryKey: [originalTable] });
      toast.success("Item restored successfully");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to restore item");
    },
  });
}

export function usePermanentDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trashId: string) => {
      const { error } = await supabase
        .from("trash_bin")
        .delete()
        .eq("id", trashId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash_bin"] });
      toast.success("Item permanently deleted");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to permanently delete");
    },
  });
}
