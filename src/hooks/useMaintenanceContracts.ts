import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  MaintenanceContract,
  ContractFilter,
  ContractVisit,
  MaintenanceSegment,
  MaintenanceStatus,
  MaintenanceBillingModel,
} from '@/types/maintenanceContracts';

export interface ContractListFilters {
  segment?: MaintenanceSegment | 'all';
  status?: MaintenanceStatus | 'all';
  billing?: MaintenanceBillingModel | 'all';
  search?: string;
  dueSoon?: boolean;
}

const CONTRACT_SELECT = `
  *,
  customer:crm_customers!crm_maintenance_contracts_customer_id_fkey(id, first_name, last_name),
  location:crm_locations!crm_maintenance_contracts_location_id_fkey(id, address_line1, city, state, zip_code, workedge_property_id)
`;

export function useMaintenanceContracts(filters: ContractListFilters = {}) {
  return useQuery({
    queryKey: ['maintenance_contracts', filters],
    queryFn: async () => {
      let query = supabase
        .from('crm_maintenance_contracts' as any)
        .select(CONTRACT_SELECT)
        .order('created_at', { ascending: false });

      if (filters.segment && filters.segment !== 'all') query = query.eq('segment', filters.segment);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.billing && filters.billing !== 'all') query = query.eq('billing_model', filters.billing);
      if (filters.dueSoon) {
        const in30 = new Date();
        in30.setDate(in30.getDate() + 30);
        query = query.lte('next_visit_due', in30.toISOString().slice(0, 10));
      }

      const { data, error } = await query;
      if (error) throw error;
      let rows = (data ?? []) as unknown as MaintenanceContract[];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        rows = rows.filter((c) => {
          const name = `${c.customer?.first_name ?? ''} ${c.customer?.last_name ?? ''}`.toLowerCase();
          const addr = `${c.location?.address_line1 ?? ''} ${c.location?.city ?? ''}`.toLowerCase();
          return (
            name.includes(q) ||
            addr.includes(q) ||
            c.contract_number.toLowerCase().includes(q)
          );
        });
      }
      return rows;
    },
  });
}

export function useMaintenanceContract(id: string | undefined) {
  return useQuery({
    queryKey: ['maintenance_contract', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_maintenance_contracts' as any)
        .select(CONTRACT_SELECT)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MaintenanceContract | null;
    },
  });
}

export function useContractFilters(contractId: string | undefined) {
  return useQuery({
    queryKey: ['contract_filters', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contract_filters' as any)
        .select('*')
        .eq('contract_id', contractId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ContractFilter[];
    },
  });
}

export function useContractVisits(contractId: string | undefined) {
  return useQuery({
    queryKey: ['contract_visits', contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contract_visits' as any)
        .select('*, technician:crm_team_members(id, first_name, last_name)')
        .eq('contract_id', contractId!)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContractVisit[];
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      contract: Partial<MaintenanceContract>;
      filters?: Partial<ContractFilter>[];
    }) => {
      const { data, error } = await supabase
        .from('crm_maintenance_contracts' as any)
        .insert(payload.contract as any)
        .select('id')
        .single();
      if (error) throw error;
      const id = (data as any).id as string;

      if (payload.filters && payload.filters.length > 0) {
        const rows = payload.filters.map((f) => ({ ...f, contract_id: id }));
        const { error: fErr } = await supabase.from('crm_contract_filters' as any).insert(rows as any);
        if (fErr) throw fErr;
      }
      return id;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['maintenance_contracts'] });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MaintenanceContract> }) => {
      const { error } = await supabase
        .from('crm_maintenance_contracts' as any)
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['maintenance_contracts'] }),
        qc.invalidateQueries({ queryKey: ['maintenance_contract', vars.id] }),
      ]);
    },
  });
}

export function useAddContractFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filter: Partial<ContractFilter> & { contract_id: string }) => {
      const { error } = await supabase.from('crm_contract_filters' as any).insert(filter as any);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['contract_filters', vars.contract_id] }),
        qc.invalidateQueries({ queryKey: ['maintenance_contract', vars.contract_id] }),
      ]);
    },
  });
}

export function useUpdateContractFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      contract_id,
      patch,
    }: {
      id: string;
      contract_id: string;
      patch: Partial<ContractFilter>;
    }) => {
      const { error } = await supabase
        .from('crm_contract_filters' as any)
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['contract_filters', vars.contract_id] }),
        qc.invalidateQueries({ queryKey: ['maintenance_contract', vars.contract_id] }),
      ]);
    },
  });
}

export function useDeleteContractFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contract_id }: { id: string; contract_id: string }) => {
      const { error } = await supabase.from('crm_contract_filters' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['contract_filters', vars.contract_id] }),
        qc.invalidateQueries({ queryKey: ['maintenance_contract', vars.contract_id] }),
      ]);
    },
  });
}

export function useLogVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visit: Partial<ContractVisit> & { contract_id: string }) => {
      const { error } = await supabase.from('crm_contract_visits' as any).insert(visit as any);
      if (error) throw error;
    },
    onSuccess: async (_d, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['contract_visits', vars.contract_id] }),
        qc.invalidateQueries({ queryKey: ['maintenance_contract', vars.contract_id] }),
        qc.invalidateQueries({ queryKey: ['maintenance_contracts'] }),
      ]);
    },
  });
}
