import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, Plus, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const RELATIONSHIP_TYPES = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'manager', label: 'Manager' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'referral', label: 'Referral' },
  { value: 'neighbor', label: 'Neighbor' },
  { value: 'other', label: 'Other' },
] as const;

interface CustomerRelationshipsProps {
  customerId: string;
}

export function CustomerRelationships({ customerId }: CustomerRelationshipsProps) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('spouse');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Fetch relationships where this customer is either side
  const { data: relationships = [] } = useQuery({
    queryKey: ['customer-relationships', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customer_relationships')
        .select('id, customer_id, related_customer_id, relationship_type, notes')
        .or(`customer_id.eq.${customerId},related_customer_id.eq.${customerId}`);
      if (error) throw error;

      // For each relationship, fetch the "other" customer's info
      const otherIds = (data || []).map(r =>
        r.customer_id === customerId ? r.related_customer_id : r.customer_id
      );
      if (otherIds.length === 0) return [];

      const { data: customers } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, company_name, email, phone')
        .in('id', otherIds);

      const customerMap = new Map((customers || []).map(c => [c.id, c]));

      return (data || []).map(r => {
        const otherId = r.customer_id === customerId ? r.related_customer_id : r.customer_id;
        return {
          ...r,
          otherCustomer: customerMap.get(otherId),
          direction: r.customer_id === customerId ? 'outgoing' : 'incoming',
        };
      });
    },
  });

  // Search customers for linking
  const { data: searchResults = [] } = useQuery({
    queryKey: ['customer-search-for-relationship', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, company_name, email')
        .neq('id', customerId)
        .is('deleted_at', null)
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(10);
      return data || [];
    },
    enabled: search.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) throw new Error('Select a customer');
      const { error } = await supabase
        .from('crm_customer_relationships')
        .insert({
          customer_id: customerId,
          related_customer_id: selectedCustomerId,
          relationship_type: selectedType,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-relationships', customerId] });
      setAdding(false);
      setSearch('');
      setSelectedCustomerId(null);
      toast.success('Relationship added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      const { error } = await supabase
        .from('crm_customer_relationships')
        .delete()
        .eq('id', relationshipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-relationships', customerId] });
      toast.success('Relationship removed');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getTypeLabel = (type: string) =>
    RELATIONSHIP_TYPES.find(t => t.value === type)?.label || type;

  const getCustomerName = (c: any) =>
    c?.company_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || 'Unknown';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4" /> Related Customers
          </CardTitle>
          {!adding && (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search customers..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedCustomerId(null); }}
              className="h-8 text-xs"
            />

            {searchResults.length > 0 && !selectedCustomerId && (
              <div className="max-h-32 overflow-y-auto border rounded-md bg-background">
                {searchResults.map(c => (
                  <button
                    key={c.id}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent/50 truncate"
                    onClick={() => { setSelectedCustomerId(c.id); setSearch(getCustomerName(c)); }}
                  >
                    {getCustomerName(c)} {c.email ? `(${c.email})` : ''}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" disabled={!selectedCustomerId} onClick={() => addMutation.mutate()}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdding(false); setSearch(''); setSelectedCustomerId(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {relationships.length > 0 ? (
          relationships.map((rel: any) => (
            <div key={rel.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <Link
                    to={`/admin/customers/${rel.otherCustomer?.id}`}
                    className="text-sm font-medium hover:text-primary truncate block"
                  >
                    {getCustomerName(rel.otherCustomer)}
                  </Link>
                  <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                    {getTypeLabel(rel.relationship_type)}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeMutation.mutate(rel.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        ) : !adding ? (
          <p className="text-xs text-muted-foreground text-center">No related customers</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
