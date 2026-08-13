import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, freshChannel } from '@/integrations/supabase/client';
import { useOttoCustomers, useCreateOttoCustomer } from '@/hooks/useOttoPay';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CustomerSelectorProps {
  value: string | null;
  onChange: (customerId: string) => void;
}

// Fetches CRM customers from the main database
function useCrmCustomers() {
  return useQuery({
    queryKey: ['crm-customers-for-invoicing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, company_name, email, phone, billing_address, billing_city, billing_state, billing_zip')
        .is('deleted_at', null)
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });
}

export function CustomerSelector({ value, onChange }: CustomerSelectorProps) {
  const queryClient = useQueryClient();
  const { data: crmCustomers } = useCrmCustomers();
  const { data: ottoCustomers } = useOttoCustomers();
  const createOttoCustomer = useCreateOttoCustomer();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Subscribe to realtime CRM customer changes
  useEffect(() => {
    const channel = freshChannel('crm-customers-invoicing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_customers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crm-customers-for-invoicing'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Build display list from CRM customers
  const customerList = useMemo(() => {
    return (crmCustomers || []).map(c => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.company_name || 'Unnamed';
      return { crmId: c.id, name, email: c.email, phone: c.phone, raw: c };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [crmCustomers]);

  // Find selected customer display name — check both Otto customers and CRM list
  const selectedName = useMemo(() => {
    if (!value) return null;
    const otto = (ottoCustomers || []).find((c: any) => c.id === value);
    if (otto) return otto.name;
    const crm = customerList.find(c => c.crmId === value);
    if (crm) return crm.name;
    return null;
  }, [value, ottoCustomers, customerList]);

  // When a CRM customer is selected, find or create matching Otto Pay customer
  const handleSelect = async (crmId: string) => {
    setOpen(false);
    const crm = customerList.find(c => c.crmId === crmId);
    if (!crm) return;

    setSyncing(true);
    try {
      // Check if an Otto Pay customer already exists with matching name+email
      const existing = (ottoCustomers || []).find((oc: any) =>
        oc.name === crm.name && (oc.email === crm.email || (!oc.email && !crm.email))
      );

      if (existing) {
        onChange(existing.id);
      } else {
        // Create new Otto Pay customer from CRM data
        const raw = crm.raw;
        const address = [raw.billing_address, raw.billing_city, raw.billing_state, raw.billing_zip]
          .filter(Boolean).join(', ') || null;

        const newCustomer = await createOttoCustomer.mutateAsync({
          name: crm.name,
          email: crm.email || null,
          phone: crm.phone || null,
          address,
        } as any);

        if (newCustomer?.id) {
          onChange(newCustomer.id);
          toast.success(`Synced "${crm.name}" to invoicing`);
        } else {
          throw new Error('Failed to create customer — no ID returned');
        }
      }
    } catch (e: any) {
      console.error('Customer sync error:', e);
      toast.error(e.message || 'Failed to sync customer');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
          disabled={syncing}
        >
          {syncing ? 'Syncing…' : selectedName ? selectedName : 'Select customer…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search customers…" />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup heading="CRM Customers">
              {customerList.map(c => (
                <CommandItem
                  key={c.crmId}
                  value={c.name}
                  onSelect={() => handleSelect(c.crmId)}
                >
                  <Check className={cn('mr-2 h-4 w-4', 'opacity-0')} />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
