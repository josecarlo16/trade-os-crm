import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CampaignTagSelector } from './CampaignTagSelector';
import { CompanySelector } from '@/components/admin/companies/CompanySelector';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['crm_customers']['Row'];

interface LeadSource {
  id: string;
  name: string;
  display_name: string;
  color: string;
  is_active: boolean;
}

const customerSchema = z.object({
  customer_type: z.enum(['residential', 'commercial']),
  customer_status: z.enum(['lead', 'prospect', 'active', 'inactive', 'archived']),
  
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  alternate_phone: z.string().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text']).optional(),
  billing_address: z.string().optional(),
  billing_address_line2: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  lead_source: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!customer;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Fetch lead sources from database
  const { data: leadSources } = useQuery({
    queryKey: ['lead_sources_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as LeadSource[];
    },
  });

  // Fetch customer locations for address import
  const { data: customerLocations } = useQuery({
    queryKey: ['crm_locations', customer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_locations')
        .select('id, location_name, address_line1, address_line2, city, state, zip_code')
        .eq('customer_id', customer!.id)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: 'residential',
      customer_status: 'lead',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      alternate_phone: '',
      preferred_contact_method: 'phone',
      billing_address: '',
      billing_address_line2: '',
      billing_city: '',
      billing_state: '',
      billing_zip: '',
      lead_source: 'manual',
      notes: '',
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        customer_type: customer.customer_type as 'residential' | 'commercial',
        customer_status: customer.customer_status as CustomerFormValues['customer_status'],
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternate_phone: customer.alternate_phone || '',
        preferred_contact_method: (customer.preferred_contact_method as CustomerFormValues['preferred_contact_method']) || 'phone',
        billing_address: customer.billing_address || '',
        billing_address_line2: (customer as any).billing_address_line2 || '',
        billing_city: customer.billing_city || '',
        billing_state: customer.billing_state || '',
        billing_zip: customer.billing_zip || '',
        lead_source: customer.lead_source || 'manual',
        notes: customer.notes || '',
      });
      setSelectedTags(customer.tags || []);
      setSelectedCompanyId((customer as any).company_id || null);
    } else {
      form.reset({
        customer_type: 'residential',
        customer_status: 'lead',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        alternate_phone: '',
        preferred_contact_method: 'phone',
        billing_address: '',
        billing_address_line2: '',
        billing_city: '',
        billing_state: '',
        billing_zip: '',
        lead_source: 'manual',
        notes: '',
      });
      setSelectedTags([]);
      setSelectedCompanyId(null);
    }
  }, [customer, form]);

  const mutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = {
        ...values,
        email: values.email || null,
        tags: selectedTags,
        company_id: selectedCompanyId,
        company_name: null,
      };

      if (isEditing && customer) {
        const { error } = await supabase
          .from('crm_customers')
          .update(payload)
          .eq('id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_customers')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm_customer'] });
      queryClient.invalidateQueries({ queryKey: ['crm_companies_contact_counts'] });
      toast.success(isEditing ? 'Customer updated' : 'Customer created');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save customer');
    },
  });

  const onSubmit = (values: CustomerFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'New Customer'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customer_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Company Account */}
            <div className="space-y-2">
              <FormLabel>Company Account</FormLabel>
              <CompanySelector value={selectedCompanyId} onChange={setSelectedCompanyId} />
              <p className="text-xs text-muted-foreground">Link this contact to a company account (optional)</p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alternate_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferred_contact_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Billing Address */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Billing Address</span>
              {customer && customerLocations && customerLocations.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      Import from Location
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {customerLocations.map(loc => (
                      <DropdownMenuItem
                        key={loc.id}
                        onClick={() => {
                          form.setValue('billing_address', loc.address_line1);
                          form.setValue('billing_address_line2', loc.address_line2 || '');
                          form.setValue('billing_city', loc.city);
                          form.setValue('billing_state', loc.state);
                          form.setValue('billing_zip', loc.zip_code);
                          toast.success('Address imported from location');
                        }}
                      >
                        {loc.location_name || loc.address_line1} — {loc.city}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <FormField
              control={form.control}
              name="billing_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Street address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billing_address_line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Apt, Suite, Unit #" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="billing_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lead Source - Dynamic from database */}
            <FormField
              control={form.control}
              name="lead_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Source</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leadSources?.map((source) => (
                        <SelectItem key={source.id} value={source.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: source.color }}
                            />
                            {source.display_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campaign Tags */}
            <div className="space-y-2">
              <FormLabel>Campaign Tags</FormLabel>
              <CampaignTagSelector value={selectedTags} onChange={setSelectedTags} />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
