import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logSystemInteraction, SYSTEM_EVENTS } from '@/lib/crm/logInteraction';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { UserPlus, MapPin, Kanban } from 'lucide-react';

const formSchema = z.object({
  customer_type: z.string().min(1, 'Required'),
  customer_status: z.string().min(1, 'Required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  lead_source: z.string().optional(),
  notes: z.string().optional(),
  // Location fields
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  // Pipeline
  add_to_pipeline: z.boolean().default(false),
  pipeline_stage_id: z.string().optional(),
  pipeline_title: z.string().optional(),
  estimated_value: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubmissionData {
  id: string;
  source: 'ducted' | 'ductless' | 'scanner' | 'contact' | 'landing_page';
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  metadata: Record<string, unknown>;
}

interface ConvertToCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionData | null;
  onSuccess?: () => void;
}

export const ConvertToCustomerDialog = ({
  open,
  onOpenChange,
  submission,
  onSuccess,
}: ConvertToCustomerDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addToPipeline, setAddToPipeline] = useState(false);

  // Parse name into first/last
  const parseCustomerName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  };

  // Extract address from metadata based on source type
  const extractAddress = (metadata: Record<string, unknown>, source: string) => {
    if (source === 'ducted') {
      const address = metadata.address as string | undefined;
      // Try to parse address if it's a full string
      return { address_line1: address || '', city: '', state: '', zip_code: '' };
    }
    if (source === 'ductless') {
      return {
        address_line1: (metadata.address as string) || '',
        city: (metadata.city as string) || '',
        state: (metadata.state as string) || '',
        zip_code: (metadata.zip as string) || '',
      };
    }
    if (source === 'scanner') {
      return {
        address_line1: (metadata.customerAddress as string) || '',
        city: (metadata.city as string) || '',
        state: (metadata.state as string) || '',
        zip_code: (metadata.zipCode as string) || '',
      };
    }
    return { address_line1: '', city: '', state: '', zip_code: '' };
  };

  // Map source to lead_source value
  const getLeadSource = (source: string) => {
    const sourceMap: Record<string, string> = {
      ducted: 'Ducted Estimator',
      ductless: 'Ductless Estimator',
      scanner: 'Equipment Scanner',
      contact: 'Contact Form',
      landing_page: 'Landing Page',
    };
    return sourceMap[source] || 'Website';
  };

  // Get estimated value from submission
  const getEstimatedValue = (metadata: Record<string, unknown>, source: string) => {
    if (source === 'ducted' || source === 'ductless') {
      const total = metadata.finalTotal as number | undefined;
      return total?.toString() || '';
    }
    return '';
  };

  // Extract message/notes from submission so it carries over to the customer record
  const extractSubmissionNotes = (metadata: Record<string, unknown>, source: string) => {
    const parts: string[] = [];
    const serviceType = metadata.serviceType as string | undefined;
    const message = metadata.message as string | undefined;
    const notes = metadata.notes as string | undefined;
    const bestTime = metadata.bestTimeToCall as string | undefined;

    if (serviceType) parts.push(`Service Type: ${serviceType}`);
    if (message?.trim()) parts.push(`Message: ${message.trim()}`);
    if (notes?.trim()) parts.push(`Notes: ${notes.trim()}`);
    if (bestTime) parts.push(`Best time to call: ${bestTime}`);

    const sourceLabel = source.replace('_', ' ');
    return parts.length ? `From ${sourceLabel} submission —\n${parts.join('\n')}` : '';
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_type: 'residential',
      customer_status: 'lead',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
      lead_source: '',
      notes: '',
      address_line1: '',
      city: '',
      state: '',
      zip_code: '',
      add_to_pipeline: false,
      pipeline_stage_id: '',
      pipeline_title: '',
      estimated_value: '',
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

  // Populate form when submission changes
  useEffect(() => {
    if (submission && open) {
      const { firstName, lastName } = parseCustomerName(submission.customerName);
      const address = extractAddress(submission.metadata, submission.source);
      const estimatedValue = getEstimatedValue(submission.metadata, submission.source);

      form.reset({
        customer_type: 'residential',
        customer_status: 'lead',
        first_name: firstName,
        last_name: lastName,
        company_name: '',
        email: submission.customerEmail || '',
        phone: submission.customerPhone || '',
        lead_source: getLeadSource(submission.source),
        notes: extractSubmissionNotes(submission.metadata, submission.source),
        address_line1: address.address_line1,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code,
        add_to_pipeline: false,
        pipeline_stage_id: stages[0]?.id || '',
        pipeline_title: '',
        estimated_value: estimatedValue,
      });
      setAddToPipeline(false);
    }
  }, [submission, open, stages, form]);

  const convertMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!submission) throw new Error('No submission data');

      // 0. Check for existing customer (dedupe by email, then by name+phone, then exact name)
      const normalizedPhone = (data.phone || '').replace(/\D/g, '').slice(-10);
      const fullName = `${data.first_name} ${data.last_name || ''}`.trim();

      let existing: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null = null;

      if (data.email) {
        const { data: byEmail } = await supabase
          .from('crm_customers')
          .select('id, first_name, last_name, email')
          .ilike('email', data.email)
          .is('deleted_at', null)
          .maybeSingle();
        if (byEmail) existing = byEmail;
      }

      if (!existing && normalizedPhone.length === 10 && fullName) {
        const { data: candidates } = await supabase
          .from('crm_customers')
          .select('id, first_name, last_name, email, phone')
          .ilike('first_name', data.first_name)
          .is('deleted_at', null);
        const match = (candidates || []).find((c: any) => {
          const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
          const cLast = (c.last_name || '').toLowerCase().trim();
          return cPhone === normalizedPhone && cLast === (data.last_name || '').toLowerCase().trim();
        });
        if (match) existing = match as any;
      }

      if (existing) {
        const err: any = new Error('DUPLICATE_CUSTOMER');
        err.existingId = existing.id;
        err.existingName = `${existing.first_name || ''} ${existing.last_name || ''}`.trim() || existing.email || 'this customer';
        throw err;
      }

      // 1. Create customer
      const { data: customer, error: customerError } = await supabase
        .from('crm_customers')
        .insert({
          customer_type: data.customer_type,
          customer_status: data.customer_status,
          first_name: data.first_name,
          last_name: data.last_name || null,
          company_name: data.company_name || null,
          email: data.email || null,
          phone: data.phone || null,
          lead_source: data.lead_source || null,
          notes: data.notes || null,
        })
        .select('id')
        .single();

      if (customerError) throw customerError;

      // 1b. Mirror the prefilled notes into the notes timeline so staff see it on the customer page
      if (data.notes && data.notes.trim()) {
        const { error: noteErr } = await supabase
          .from('crm_customer_notes')
          .insert({ customer_id: customer.id, content: data.notes.trim() });
        if (noteErr) console.error('Failed to insert customer note:', noteErr);
      }
      if (data.address_line1 && data.city && data.state && data.zip_code) {
        const { error: locationError } = await supabase
          .from('crm_locations')
          .insert({
            customer_id: customer.id,
            address_line1: data.address_line1,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            is_primary: true,
            location_type: data.customer_type === 'commercial' ? 'commercial' : 'residential',
          });

        if (locationError) {
          console.error('Failed to create location:', locationError);
        }
      }

      // 3. Link submission to customer (upsert to handle duplicates)
      const { error: linkError } = await supabase
        .from('crm_submission_links')
        .upsert({
          customer_id: customer.id,
          submission_id: submission.id,
          submission_type: submission.source,
        }, { onConflict: 'submission_id,submission_type' });

      if (linkError) {
        console.error('Failed to link submission:', linkError);
        toast.warning('Customer created, but the submission link could not be saved. You may need to link it manually.');
      }

      // 4. Add to pipeline if requested
      if (data.add_to_pipeline && data.pipeline_stage_id) {
        const { error: pipelineError } = await supabase
          .from('crm_pipeline_entries')
          .insert({
            customer_id: customer.id,
            stage_id: data.pipeline_stage_id,
            title: data.pipeline_title?.trim() || null,
            estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
          });

        if (pipelineError) {
          console.error('Failed to add to pipeline:', pipelineError);
        }
      }

      // 5. Log system conversion interaction
      await logSystemInteraction({
        customerId: customer.id,
        type: SYSTEM_EVENTS.CONVERSION,
        subject: `Converted from ${submission.source.replace('_', ' ')} submission`,
        content: data.estimated_value 
          ? `Estimated value: $${parseFloat(data.estimated_value).toLocaleString()}`
          : undefined,
        outcome: data.add_to_pipeline ? 'Added to sales pipeline' : undefined,
      });

      // 6. Log pipeline addition if requested
      if (data.add_to_pipeline && data.pipeline_stage_id) {
        const stage = stages.find(s => s.id === data.pipeline_stage_id);
        await logSystemInteraction({
          customerId: customer.id,
          type: SYSTEM_EVENTS.PIPELINE_ADD,
          subject: `Added to pipeline: ${stage?.display_name || 'Unknown stage'}`,
          content: data.estimated_value 
            ? `Estimated value: $${parseFloat(data.estimated_value).toLocaleString()}`
            : undefined,
        });
      }

      // 7. Mark submission as converted
      return customer.id;
    },
    onSuccess: (customerId) => {
      queryClient.invalidateQueries({ queryKey: ['crm-customers'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-entries'] });
      toast.success('Customer created successfully');
      onOpenChange(false);
      onSuccess?.();
      navigate(`/admin/customers/${customerId}`);
    },
    onError: (error: any) => {
      console.error('Conversion error:', error);
      if (error?.message === 'DUPLICATE_CUSTOMER' && error.existingId) {
        toast.error(`Customer already exists: ${error.existingName}`, {
          action: {
            label: 'Open',
            onClick: () => {
              onOpenChange(false);
              navigate(`/admin/customers/${error.existingId}`);
            },
          },
          duration: 8000,
        });
        return;
      }
      const msg = error?.message || 'Failed to convert submission';
      toast.error(msg.includes('customer_status_check')
        ? 'Invalid status value. Please choose Lead, Prospect, Active, Inactive, or Archived.'
        : `Failed to convert: ${msg}`);
    },
  });

  const onSubmit = (data: FormData) => {
    convertMutation.mutate(data);
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convert to Customer
          </DialogTitle>
          <DialogDescription>
            Create a CRM customer record from this {submission.source.replace('_', ' ')} submission.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
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

            <FormField
              control={form.control}
              name="lead_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Source</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Address Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Service Address (Optional)
              </div>

              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="city"
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
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
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
            </div>

            <Separator />

            {/* Pipeline Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add_to_pipeline"
                  checked={addToPipeline}
                  onCheckedChange={(checked) => {
                    setAddToPipeline(!!checked);
                    form.setValue('add_to_pipeline', !!checked);
                  }}
                />
                <Label htmlFor="add_to_pipeline" className="flex items-center gap-2 cursor-pointer">
                  <Kanban className="h-4 w-4" />
                  Add to Sales Pipeline
                </Label>
              </div>

              {addToPipeline && (
                <div className="space-y-3 pl-6">
                  <FormField
                    control={form.control}
                    name="pipeline_title"
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
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="pipeline_stage_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
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
                      name="estimated_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Est. Value ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Additional notes..." {...field} />
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
              <Button type="submit" disabled={convertMutation.isPending}>
                {convertMutation.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
