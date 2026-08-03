import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  Package, 
  Activity,
  Edit,
  MessageSquare,
  Upload,
  CheckCircle2,
  Loader2,
  Building2,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import { SendSmsDialog } from '@/components/admin/customers/SendSmsDialog';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { CustomerFormDialog } from '@/components/admin/customers/CustomerFormDialog';
import { InteractionLog } from '@/components/admin/customers/InteractionLog';
import { CustomerLocations } from '@/components/admin/customers/CustomerLocations';
import { ActivityTimeline } from '@/components/admin/customers/ActivityTimeline';
import { CustomerNotes } from '@/components/admin/customers/CustomerNotes';
import { LinkedSubmissions } from '@/components/admin/customers/LinkedSubmissions';
import { AIAssistantWidget } from '@/components/admin/ai/AIAssistantWidget';
import { CustomerEquipmentTab } from '@/components/admin/customers/CustomerEquipmentTab';
import { FileAttachments } from '@/components/admin/FileAttachments';
import { CustomerRelationships } from '@/components/admin/customers/CustomerRelationships';
import { CustomerEmailHistory } from '@/components/admin/customers/CustomerEmailHistory';
import JobFormDialog from '@/components/admin/jobs/JobFormDialog';
import { CustomerPipelineTab } from '@/components/admin/customers/CustomerPipelineTab';
import type { Database } from '@/integrations/supabase/types';

type Customer = Database['public']['Tables']['crm_customers']['Row'];

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  prospect: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  archived: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const syncCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase.functions.invoke('workedge-sync', {
        body: { action: 'sync-customer', customerId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_customer', id] });
      toast.success('Customer synced to WorkEdge');
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ['crm_customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*, crm_companies!company_id(id, name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: locations } = useQuery({
    queryKey: ['crm_locations', id],
    queryFn: async () => {
      // Fetch directly owned locations
      const { data: ownedLocations, error: ownedError } = await supabase
        .from('crm_locations')
        .select('*')
        .eq('customer_id', id)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false });
      if (ownedError) throw ownedError;

      // Fetch locations linked via junction table
      const { data: linkedEntries, error: linkedError } = await supabase
        .from('crm_location_customers')
        .select('location_id')
        .eq('customer_id', id!);
      if (linkedError) throw linkedError;

      const linkedLocationIds = (linkedEntries || [])
        .map(e => e.location_id)
        .filter(lid => !(ownedLocations || []).some(ol => ol.id === lid));

      if (linkedLocationIds.length === 0) return ownedLocations || [];

      const { data: linkedLocations, error: linkedLocError } = await supabase
        .from('crm_locations')
        .select('*')
        .in('id', linkedLocationIds)
        .is('deleted_at', null);
      if (linkedLocError) throw linkedLocError;

      return [...(ownedLocations || []), ...(linkedLocations || [])];
    },
    enabled: !!id,
  });

  const { data: interactions } = useQuery({
    queryKey: ['crm_interactions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('customer_id', id)
        .order('interaction_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: jobs } = useQuery({
    queryKey: ['crm_jobs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_jobs')
        .select('*, crm_job_stages!current_stage_id(name, color)')
        .eq('customer_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: jobTypes = [] } = useQuery({
    queryKey: ['crm_job_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_job_types').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: allStages = [] } = useQuery({
    queryKey: ['crm_job_stages_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_job_stages').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: equipmentCount = 0 } = useQuery({
    queryKey: ['crm_location_equipment_count', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_location_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id!)
        .is('deleted_at', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: estimatesCount } = useQuery({
    queryKey: ['estimates_count', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('estimates')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: submissionLinksCount } = useQuery({
    queryKey: ['submission_links_count', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_submission_links')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const { data: pipelineCount = 0 } = useQuery({
    queryKey: ['customer-pipeline-count', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_pipeline_entries')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', id!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  const getDisplayName = (cust: any) => {
    if (cust.crm_companies?.name) return cust.crm_companies.name;
    return `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'Unnamed';
  };

  if (isLoading) {
    return (
      <AdminLayout title="Customer Details">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout title="Customer Details">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Customer not found</p>
          <Button variant="link" onClick={() => navigate('/admin/customers')}>
            Back to Customers
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Customer Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/customers')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{getDisplayName(customer)}</h1>
                <Badge className={statusColors[customer.customer_status]} variant="secondary">
                  {customer.customer_status}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {customer.customer_type}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Created {new Date(customer.created_at).toLocaleDateString()}
                {customer.lead_source && ` • Source: ${customer.lead_source}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customer.workedge_customer_id ? (
              <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                WorkEdge Synced
              </Badge>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => syncCustomerMutation.mutate(customer.id)}
                disabled={syncCustomerMutation.isPending}
              >
                {syncCustomerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Sync to WorkEdge
              </Button>
            )}
            {customer.phone && (
              <Button variant="outline" onClick={() => setSmsDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Text
              </Button>
            )}
            <AIAssistantWidget 
              customerId={customer.id} 
              customerName={getDisplayName(customer)}
            />
            <Button onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.alternate_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.alternate_phone} (Alt)</span>
                </div>
              )}
              {customer.preferred_contact_method && (
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm capitalize">Prefers: {customer.preferred_contact_method}</span>
                </div>
              )}
              {(customer.billing_address || customer.billing_city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {customer.billing_address && <div>{customer.billing_address}</div>}
                    {customer.billing_city && (
                      <div>
                        {customer.billing_city}, {customer.billing_state} {customer.billing_zip}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!customer.email && !customer.phone && !customer.billing_address && (
                <p className="text-muted-foreground text-sm">No contact information</p>
              )}

              {(customer as any).crm_companies && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Link 
                    to={`/admin/companies/${(customer as any).crm_companies.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {(customer as any).crm_companies.name}
                  </Link>
                </div>
              )}

              <CustomerNotes customerId={customer.id} legacyNote={customer.notes} />

              {customer.tags && customer.tags.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <CustomerRelationships customerId={customer.id} />

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="locations">Locations ({locations?.length || 0})</TabsTrigger>
                <TabsTrigger value="activity">Activity ({interactions?.length || 0})</TabsTrigger>
                <TabsTrigger value="jobs">Jobs ({jobs?.length || 0})</TabsTrigger>
                <TabsTrigger value="pipeline">Pipeline ({pipelineCount})</TabsTrigger>
                <TabsTrigger value="estimates">Estimates ({(estimatesCount || 0) + (submissionLinksCount || 0)})</TabsTrigger>
                <TabsTrigger value="equipment">Equipment ({equipmentCount})</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Service Locations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{locations?.length || 0}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Interactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{interactions?.length || 0}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity - Enhanced with ActivityTimeline preview */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {interactions && interactions.length > 0 ? (
                      <div className="space-y-3">
                        {interactions.slice(0, 5).map((interaction) => {
                          const isSystem = interaction.interaction_type.startsWith('system_');
                          return (
                            <div key={interaction.id} className="flex items-start gap-3 text-sm">
                              <Activity className={`h-4 w-4 mt-0.5 ${isSystem ? 'text-primary' : 'text-muted-foreground'}`} />
                              <div>
                                <span className="font-medium capitalize">
                                  {interaction.interaction_type.replace('system_', '').replace('_', ' ')}
                                </span>
                                {interaction.subject && <span> - {interaction.subject}</span>}
                                {isSystem && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    System
                                  </Badge>
                                )}
                                <p className="text-muted-foreground text-xs">
                                  {new Date(interaction.interaction_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                <CustomerLocations customerId={id!} locations={locations || []} customer={customer} />
              </TabsContent>

              <TabsContent value="activity" className="mt-4 space-y-4">
                <InteractionLog customerId={id!} interactions={interactions || []} />
                <ActivityTimeline interactions={interactions || []} />
              </TabsContent>

              <TabsContent value="jobs" className="mt-4">
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setJobDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Create Job
                    </Button>
                  </div>
                  {jobs && jobs.length > 0 ? (
                    jobs.map((job) => {
                      const stage = (job as any).crm_job_stages;
                      return (
                        <Link key={job.id} to={`/admin/jobs/${job.id}`}>
                          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardContent className="flex items-center justify-between py-4">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-medium">{job.title}</p>
                                  <p className="text-sm text-muted-foreground">{job.job_number}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {job.scheduled_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(job.scheduled_date).toLocaleDateString()}
                                  </span>
                                )}
                                {job.priority && (
                                  <Badge variant="outline" className="capitalize text-xs">{job.priority}</Badge>
                                )}
                                {stage && (
                                  <Badge variant="secondary" className="text-xs">{stage.name}</Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })
                  ) : (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center py-8">
                          <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No jobs found</p>
                          <p className="text-xs text-muted-foreground mt-1">Create a job to get started</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="pipeline" className="mt-4">
                <CustomerPipelineTab customerId={id!} />
              </TabsContent>

              <TabsContent value="estimates" className="mt-4">
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => navigate(`/admin/estimates/builder?customer_id=${id}`)}>
                      <Plus className="h-4 w-4 mr-2" /> Create Estimate
                    </Button>
                  </div>
                  <LinkedSubmissions customerId={id!} />
                </div>
              </TabsContent>

              <TabsContent value="equipment" className="mt-4">
                <CustomerEquipmentTab 
                  customerId={id!} 
                  locations={(locations || []).map(l => ({ id: l.id, address_line1: l.address_line1, city: l.city }))}
                />
              </TabsContent>

              <TabsContent value="emails" className="mt-4">
                <CustomerEmailHistory customerId={id!} customerEmail={customer.email} />
              </TabsContent>

              <TabsContent value="files" className="mt-4">
                <FileAttachments entityType="customer" entityId={id!} title="Customer Files" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />

      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        {jobDialogOpen && (
          <JobFormDialog
            editingJob={{ customer: { id: customer.id } }}
            jobTypes={jobTypes as any}
            allStages={allStages as any}
            onClose={() => {
              setJobDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['crm_jobs', id] });
            }}
          />
        )}
      </Dialog>

      {customer.phone && (
        <SendSmsDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          customerName={getDisplayName(customer)}
          customerPhone={customer.phone}
          customerId={customer.id}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['crm_interactions', id] })}
        />
      )}
    </AdminLayout>
  );
};

export default CustomerDetail;
