import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ottoGet, ottoPost, ottoPatch } from '@/integrations/ottopay/client';
import type { OttoCustomer } from '@/integrations/ottopay/types';

// ─── Invoices ────────────────────────────────────────────────
export const useOttoInvoices = () =>
  useQuery({
    queryKey: ['otto-invoices'],
    queryFn: async () => {
      const { data, error } = await ottoGet('invoices', {
        select: '*, customers(id, name, email, phone)',
        order: 'created_at:desc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const useCreateOttoInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      invoice_date: string;
      due_date: string | null;
      subtotal: number;
      tax_rate: number;
      tax_amount: number;
      total: number;
      notes: string | null;
      terms: string | null;
      status: string;
      line_items: { description: string; quantity: number; unit_price: number; line_total: number; sort_order: number }[];
    }) => {
      const { data, error } = await ottoPost('invoices', {
        customer_id: payload.customer_id,
        invoice_date: payload.invoice_date,
        due_date: payload.due_date,
        subtotal: payload.subtotal,
        tax_rate: payload.tax_rate,
        tax_amount: payload.tax_amount,
        total: payload.total,
        total_paid: 0,
        notes: payload.notes,
        terms: payload.terms,
        status: payload.status,
        line_items: payload.line_items,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-invoices'] });
      qc.invalidateQueries({ queryKey: ['otto-metrics'] });
    },
  });
};

// ─── Estimates ───────────────────────────────────────────────
export const useOttoEstimates = () =>
  useQuery({
    queryKey: ['otto-estimates'],
    queryFn: async () => {
      const { data, error } = await ottoGet('estimates', {
        select: '*, customers(id, name, email, phone)',
        order: 'created_at:desc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const useCreateOttoEstimate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      estimate_date: string;
      valid_until: string | null;
      subtotal: number;
      tax_rate: number;
      tax_amount: number;
      total: number;
      notes: string | null;
      terms: string | null;
      status: string;
      line_items: { description: string; quantity: number; unit_price: number; line_total: number; sort_order: number }[];
    }) => {
      const { data, error } = await ottoPost('estimates', {
        customer_id: payload.customer_id,
        estimate_date: payload.estimate_date,
        valid_until: payload.valid_until,
        subtotal: payload.subtotal,
        tax_rate: payload.tax_rate,
        tax_amount: payload.tax_amount,
        total: payload.total,
        notes: payload.notes,
        terms: payload.terms,
        status: payload.status,
        line_items: payload.line_items,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-estimates'] });
    },
  });
};

export const useConvertEstimateToInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (estimateId: string) => {
      // Use a dedicated convert action via POST
      const { data, error } = await ottoPost('invoices', {
        _action: 'convert_estimate',
        estimate_id: estimateId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-estimates'] });
      qc.invalidateQueries({ queryKey: ['otto-invoices'] });
      qc.invalidateQueries({ queryKey: ['otto-metrics'] });
    },
  });
};

export const useOttoEstimateLineItems = (estimateId: string | null) =>
  useQuery({
    queryKey: ['otto-estimate-line-items', estimateId],
    queryFn: async () => {
      if (!estimateId) return [];
      const { data, error } = await ottoGet('estimate_line_items', {
        filters: { estimate_id: estimateId },
        order: 'sort_order:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!estimateId,
  });

// ─── Payments ────────────────────────────────────────────────
export const useOttoPayments = () =>
  useQuery({
    queryKey: ['otto-payments'],
    queryFn: async () => {
      const { data, error } = await ottoGet('payments', {
        select: '*, invoices(invoice_number, total, customer_id, customers(name))',
        order: 'payment_date:desc',
        limit: 500,
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

// ─── Customers ───────────────────────────────────────────────
export const useOttoCustomers = () =>
  useQuery({
    queryKey: ['otto-customers'],
    queryFn: async () => {
      const { data, error } = await ottoGet('customers', {
        order: 'name:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const useCreateOttoCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<OttoCustomer>) => {
      const { data, error } = await ottoPost('customers', payload as Record<string, any>);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-customers'] });
    },
  });
};

export const useUpdateOttoCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<OttoCustomer> & { id: string }) => {
      const { data, error } = await ottoPatch('customers', id, payload as Record<string, any>);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-customers'] });
    },
  });
};

// ─── Metrics ─────────────────────────────────────────────────
export const useOttoMetrics = () =>
  useQuery({
    queryKey: ['otto-metrics'],
    queryFn: async () => {
      const { data: invoices, error } = await ottoGet<any[]>('invoices', {
        select: 'status, total, total_paid, created_at',
      });
      if (error) throw new Error(error.message);

      const all = invoices || [];
      const totalRevenue = all
        .filter((i: any) => i.status === 'paid')
        .reduce((sum: number, i: any) => sum + i.total, 0);

      const outstanding = all
        .filter((i: any) => ['sent', 'partial', 'overdue'].includes(i.status))
        .reduce((sum: number, i: any) => sum + (i.total - i.total_paid), 0);

      const overdueCount = all.filter((i: any) => i.status === 'overdue').length;

      const thisMonth = all.filter((i: any) => {
        const d = new Date(i.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      return { totalRevenue, outstanding, overdueCount, thisMonth, invoices: all };
    },
  });

// ─── Line Items ──────────────────────────────────────────────
export const useOttoLineItems = (invoiceId: string | null) =>
  useQuery({
    queryKey: ['otto-line-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await ottoGet('invoice_line_items', {
        filters: { invoice_id: invoiceId },
        order: 'sort_order:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!invoiceId,
  });

export const useOttoInvoicePayments = (invoiceId: string | null) =>
  useQuery({
    queryKey: ['otto-invoice-payments', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await ottoGet('payments', {
        filters: { invoice_id: invoiceId },
        order: 'payment_date:desc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!invoiceId,
  });

// ─── Templates ───────────────────────────────────────────────
export const useOttoTemplates = () =>
  useQuery({
    queryKey: ['otto-templates'],
    queryFn: async () => {
      const { data, error } = await ottoGet('catalog', {
        filters: { type: 'templates' },
        order: 'name:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const useOttoTemplateLineItems = (templateId: string | null) =>
  useQuery({
    queryKey: ['otto-template-line-items', templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await ottoGet('catalog', {
        filters: { type: 'template_line_items', template_id: templateId },
        order: 'sort_order:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!templateId,
  });

// ─── Catalog ─────────────────────────────────────────────────
export const useOttoMaterials = () =>
  useQuery({
    queryKey: ['otto-materials'],
    queryFn: async () => {
      const { data, error } = await ottoGet('catalog', {
        filters: { type: 'materials' },
        order: 'name:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const useOttoEquipmentCatalog = () =>
  useQuery({
    queryKey: ['otto-equipment-catalog'],
    queryFn: async () => {
      const { data, error } = await ottoGet('catalog', {
        filters: { type: 'equipment' },
        order: 'name:asc',
      });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

// ─── Business Settings ──────────────────────────────────────
export const useOttoBusiness = () =>
  useQuery({
    queryKey: ['otto-business'],
    queryFn: async () => {
      const { data, error } = await ottoGet('business');
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const useUpdateOttoBusiness = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      // The proxy resolves business_id server-side; pass 'current' as a placeholder
      const { data, error } = await ottoPatch('business', 'current', payload);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['otto-business'] });
    },
  });
};
