import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logSystemInteraction, SYSTEM_EVENTS } from '@/lib/crm/logInteraction';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  stage_id: z.string().min(1, 'Please select a stage'),
  title: z.string().optional(),
  estimated_value: z.string().optional(),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PipelineEntry {
  id: string;
  customer_id: string;
  stage_id: string;
  title?: string | null;
  estimated_value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
}

interface AddToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEntry?: PipelineEntry | null;
  defaultCustomerId?: string;
}

export const AddToPipelineDialog = ({ 
  open, 
  onOpenChange, 
  editingEntry,
  defaultCustomerId,
}: AddToPipelineDialogProps) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingEntry;
  const [customerOpen, setCustomerOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_id: '',
      stage_id: '',
      title: '',
      estimated_value: '',
      probability: '',
      expected_close_date: '',
      notes: '',
    },
  });

  // Fetch all customers (allow same customer in multiple pipeline entries)
  const { data: customers = [] } = useQuery({
    queryKey: ['pipeline-available-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch pipeline stages
  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const getCustomerName = (customer: typeof customers[0] | undefined) => {
    if (!customer) return 'Unknown';
    return customer.company_name || 
      `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
      'Unknown';
  };

  const sortedCustomers = useMemo(() =>
    [...customers].sort((a, b) => getCustomerName(a).localeCompare(getCustomerName(b))),
    [customers]
  );

  // Reset form when dialog opens/closes or editing entry changes
  useEffect(() => {
    if (open && editingEntry) {
      form.reset({
        customer_id: editingEntry.customer_id,
        stage_id: editingEntry.stage_id,
        title: editingEntry.title || '',
        estimated_value: editingEntry.estimated_value?.toString() || '',
        probability: editingEntry.probability?.toString() || '',
        expected_close_date: editingEntry.expected_close_date || '',
        notes: editingEntry.notes || '',
      });
    } else if (open) {
      form.reset({
        customer_id: defaultCustomerId || '',
        stage_id: stages[0]?.id || '',
        title: '',
        estimated_value: '',
        probability: '',
        expected_close_date: '',
        notes: '',
      });
    }
  }, [open, editingEntry, stages, form, defaultCustomerId]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        customer_id: data.customer_id,
        stage_id: data.stage_id,
        title: data.title?.trim() || null,
        estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
        probability: data.probability ? parseInt(data.probability) : null,
        expected_close_date: data.expected_close_date || null,
        notes: data.notes || null,
      };

      if (isEditing && editingEntry) {
        const { data: updated, error } = await supabase
          .from('crm_pipeline_entries')
          .update(payload)
          .eq('id', editingEntry.id)
          .select();
        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error('Update blocked — you may not have permission to edit this entry.');
        }
      } else {
        const { error } = await supabase
          .from('crm_pipeline_entries')
          .insert(payload);
        if (error) throw error;

        const stage = stages.find(s => s.id === data.stage_id);
        await logSystemInteraction({
          customerId: data.customer_id,
          type: SYSTEM_EVENTS.PIPELINE_ADD,
          subject: `Added to pipeline: ${stage?.display_name || 'Unknown stage'}`,
          content: data.estimated_value 
            ? `Estimated value: $${parseFloat(data.estimated_value).toLocaleString()}`
            : undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-entries'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-available-customers'] });
      queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'customer-pipeline-entries',
      });
      toast.success(isEditing ? 'Pipeline entry updated' : 'Added to pipeline');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Pipeline mutation error:', error);
      toast.error(error?.message ? `Failed to save: ${error.message}` : 'Failed to save pipeline entry');
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Pipeline Entry' : 'Add to Pipeline'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Popover
                    open={customerOpen && !isEditing}
                    onOpenChange={(o) => !isEditing && setCustomerOpen(o)}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isEditing}
                          className="w-full justify-between font-normal"
                        >
                          {field.value
                            ? getCustomerName(sortedCustomers.find(c => c.id === field.value)!)
                            : 'Search customers...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandList>
                          <CommandEmpty>No customers found.</CommandEmpty>
                          <CommandGroup>
                            {sortedCustomers.map((customer) => {
                              const name = getCustomerName(customer);
                              return (
                                <CommandItem
                                  key={customer.id}
                                  value={`${name} ${customer.customer_type}`}
                                  onSelect={() => {
                                    field.onChange(customer.id);
                                    setCustomerOpen(false);
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', field.value === customer.id ? 'opacity-100' : 'opacity-0')} />
                                  {name}
                                  <span className="ml-auto text-xs text-muted-foreground">{customer.customer_type}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stage_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. New ductless mini-split for office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        placeholder="50" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expected_close_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Close Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending 
                  ? 'Saving...' 
                  : isEditing ? 'Update' : 'Add to Pipeline'
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
