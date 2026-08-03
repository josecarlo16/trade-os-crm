import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ottoGet, ottoPost, ottoDelete, ottoUpload } from '@/integrations/ottopay/client';

export interface OttoExpense {
  id: string;
  business_id: string;
  category: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useOttoExpenses = () =>
  useQuery({
    queryKey: ['otto-expenses'],
    queryFn: async () => {
      const { data, error } = await ottoGet<OttoExpense[]>('expenses', {
        order: 'expense_date:desc',
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as OttoExpense[];
    },
  });

export const useCreateOttoExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category: string;
      amount: number;
      expense_date: string;
      vendor?: string;
      notes?: string;
      receipt_url?: string;
    }) => {
      const { data, error } = await ottoPost('expenses', payload);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-expenses'] });
    },
  });
};

export const useDeleteOttoExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await ottoDelete('expenses', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-expenses'] });
    },
  });
};

export const uploadExpenseReceipt = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `receipts/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await ottoUpload('expense-receipts', path, file);
  if (error) throw new Error(error.message);
  return data!.publicUrl;
};
