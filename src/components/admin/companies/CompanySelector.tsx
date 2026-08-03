import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, ChevronsUpDown, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CompanySelectorProps {
  value: string | null;
  onChange: (companyId: string | null) => void;
}

export function CompanySelector({ value, onChange }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('crm_companies')
        .insert({ name })
        .select('id, name')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm_companies_selector'] });
      onChange(data.id);
      setOpen(false);
      setSearch('');
      toast.success(`Company "${data.name}" created`);
    },
    onError: () => {
      toast.error('Failed to create company');
    },
  });

  const { data: companies } = useQuery({
    queryKey: ['crm_companies_selector', search],
    queryFn: async () => {
      let query = supabase
        .from('crm_companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name')
        .limit(20);
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: selectedCompany } = useQuery({
    queryKey: ['crm_company_selected', value],
    queryFn: async () => {
      if (!value) return null;
      const { data, error } = await supabase
        .from('crm_companies')
        .select('id, name')
        .eq('id', value)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!value,
  });

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn('w-full justify-between', !value && 'text-muted-foreground')}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              {selectedCompany ? selectedCompany.name : 'Select company...'}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-2" align="start">
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {companies?.length === 0 && !search.trim() && (
              <p className="text-sm text-muted-foreground text-center py-2">No companies found</p>
            )}
            {companies?.map((company) => (
              <button
                key={company.id}
                className={cn(
                  'w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent',
                  value === company.id && 'bg-accent'
                )}
                onClick={() => {
                  onChange(company.id);
                  setOpen(false);
                  setSearch('');
                }}
              >
                {company.name}
              </button>
            ))}
            {search.trim() && (
              <button
                className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent text-primary flex items-center gap-1.5"
                onClick={() => createCompanyMutation.mutate(search.trim())}
                disabled={createCompanyMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                Create "{search.trim()}"
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
