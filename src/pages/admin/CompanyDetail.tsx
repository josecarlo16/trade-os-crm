import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Phone, Mail, Globe, MapPin, Edit, Building2, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { CompanyFormDialog } from '@/components/admin/companies/CompanyFormDialog';

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['crm_company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: contacts } = useQuery({
    queryKey: ['crm_company_contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .eq('company_id', id)
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: jobs } = useQuery({
    queryKey: ['crm_company_jobs', id],
    queryFn: async () => {
      if (!contacts?.length) return [];
      const customerIds = contacts.map((c) => c.id);
      const { data, error } = await supabase
        .from('crm_jobs')
        .select('*, crm_customers!customer_id(first_name, last_name)')
        .in('customer_id', customerIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!contacts && contacts.length > 0,
  });

  if (isLoading) {
    return (
      <AdminLayout title="Company Details">
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

  if (!company) {
    return (
      <AdminLayout title="Company Details">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Company not found</p>
          <Button variant="link" onClick={() => navigate('/admin/companies')}>Back to Companies</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Company Details">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/companies')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                Created {new Date(company.created_at).toLocaleDateString()}
                {company.lead_source && ` • Source: ${company.lead_source}`}
              </p>
            </div>
          </div>
          <Button onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Company
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-lg">Company Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {company.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${company.email}`} className="text-primary hover:underline">{company.email}</a>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${company.phone}`} className="hover:underline">{company.phone}</a>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{company.website}</a>
                </div>
              )}
              {(company.billing_address || company.billing_city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    {company.billing_address && <div>{company.billing_address}</div>}
                    {company.billing_city && <div>{company.billing_city}, {company.billing_state} {company.billing_zip}</div>}
                  </div>
                </div>
              )}
              {!company.email && !company.phone && !company.website && !company.billing_address && (
                <p className="text-muted-foreground text-sm">No contact information</p>
              )}
              {company.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{company.notes}</p>
                </div>
              )}
              {company.tags && company.tags.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {company.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Tabs defaultValue="contacts">
              <TabsList>
                <TabsTrigger value="contacts">Contacts ({contacts?.length || 0})</TabsTrigger>
                <TabsTrigger value="jobs">Jobs ({jobs?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {contacts && contacts.length > 0 ? (
                      <div className="space-y-3">
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/admin/customers/${contact.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <UserCircle className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {contact.first_name} {contact.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{contact.email || contact.phone || ''}</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="capitalize">{contact.customer_status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8">
                        <UserCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No contacts linked</p>
                        <p className="text-xs text-muted-foreground mt-1">Link customers to this company from the customer form</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {jobs && jobs.length > 0 ? (
                      <div className="space-y-3">
                        {jobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/admin/jobs/${job.id}`)}
                          >
                            <div>
                              <p className="font-medium">{job.title}</p>
                              <p className="text-sm text-muted-foreground">#{job.job_number}</p>
                            </div>
                            <Badge variant="secondary">{job.payment_status || 'pending'}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8">
                        <p className="text-muted-foreground">No jobs found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <CompanyFormDialog open={editOpen} onOpenChange={setEditOpen} company={company} />
    </AdminLayout>
  );
};

export default CompanyDetail;
