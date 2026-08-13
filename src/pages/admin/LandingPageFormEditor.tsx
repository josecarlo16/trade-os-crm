import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface FieldsConfig {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  phone: boolean;
  serviceType: boolean;
  message: boolean;
}


const defaultFieldsConfig: FieldsConfig = {
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  serviceType: true,
  message: true,
};

export default function LandingPageFormEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    form_type: 'contact',
    fields_config: defaultFieldsConfig,
    success_message: 'Thank you for your submission! We will be in touch soon.',
    redirect_url: '',
    is_active: true,
  });


  // Fetch existing form data
  const { data: existingForm, isLoading: formLoading } = useQuery({
    queryKey: ['landing-page-form', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('landing_page_forms')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingForm) {
      setFormData({
        name: existingForm.name,
        slug: existingForm.slug,
        description: existingForm.description || '',
        form_type: existingForm.form_type,
        fields_config: (existingForm.fields_config as unknown as FieldsConfig) || defaultFieldsConfig,
        success_message: existingForm.success_message || '',
        redirect_url: existingForm.redirect_url || '',
        is_active: existingForm.is_active,
      });
    }
  }, [existingForm]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        // Create new form
        const { data: newForm, error } = await supabase
          .from('landing_page_forms')
          .insert([{
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            form_type: formData.form_type,
            fields_config: JSON.parse(JSON.stringify(formData.fields_config)),
            success_message: formData.success_message,
            redirect_url: formData.redirect_url || null,
            is_active: formData.is_active,
          }])
          .select()
          .single();
        if (error) throw error;

        return newForm;
      } else {
        // Update existing form
        const { error } = await supabase
          .from('landing_page_forms')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            form_type: formData.form_type,
            fields_config: JSON.parse(JSON.stringify(formData.fields_config)),
            success_message: formData.success_message,
            redirect_url: formData.redirect_url || null,
            is_active: formData.is_active,
          })
          .eq('id', id);
        if (error) throw error;

      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page-forms'] });
      toast({ title: isNew ? 'Form created successfully' : 'Form updated successfully' });
      navigate('/admin/landing-pages');
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving form', description: error.message, variant: 'destructive' });
    },
  });

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const handleFieldToggle = (field: keyof FieldsConfig) => {
    setFormData({
      ...formData,
      fields_config: {
        ...formData.fields_config,
        [field]: !formData.fields_config[field],
      },
    });
  };

  if (!isNew && formLoading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? 'Create Form' : 'Edit Form'}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/landing-pages')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {isNew ? 'Create New Form' : 'Edit Form'}
            </h1>
            <p className="text-muted-foreground">
              Configure your landing page form settings
            </p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Form
          </Button>
        </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Set the form name, slug, and type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Form Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({
                          ...formData,
                          name,
                          slug: isNew ? generateSlug(name) : formData.slug,
                        });
                      }}
                      placeholder="e.g., Summer AC Special Form"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">URL Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="e.g., summer-ac-special"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to embed the form: {"<LandingPageForm slug=\"" + formData.slug + "\" />"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Internal description for reference"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form_type">Form Type</Label>
                  <Select
                    value={formData.form_type}
                    onValueChange={(value) => setFormData({ ...formData, form_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contact</SelectItem>
                      <SelectItem value="estimate">Estimate Request</SelectItem>
                      <SelectItem value="callback">Callback Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields">
            <Card>
              <CardHeader>
                <CardTitle>Form Fields</CardTitle>
                <CardDescription>Choose which fields to include in the form</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(formData.fields_config).map(([field, enabled]) => (
                    <div key={field} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={field}
                        checked={enabled}
                        onCheckedChange={() => handleFieldToggle(field as keyof FieldsConfig)}
                      />
                      <Label htmlFor={field} className="capitalize cursor-pointer">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
                <CardDescription>Configure success message and redirect behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="success_message">Success Message</Label>
                  <Textarea
                    id="success_message"
                    value={formData.success_message}
                    onChange={(e) => setFormData({ ...formData, success_message: e.target.value })}
                    placeholder="Message shown after successful submission"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="redirect_url">Redirect URL (optional)</Label>
                  <Input
                    id="redirect_url"
                    value={formData.redirect_url}
                    onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                    placeholder="e.g., /thank-you"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to show the success message instead of redirecting
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Form is active</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
