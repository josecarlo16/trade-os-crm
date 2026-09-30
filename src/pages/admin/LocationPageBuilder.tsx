import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Upload, Download, AlertCircle, Check, X } from 'lucide-react';

const CLUSTERS = ['Oak Cliff', 'East Dallas', 'North Dallas', 'Downtown Dallas', 'South Dallas', 'Outer Ring'];
const PAGE_TYPES = ['Neighborhood Hub', 'Service+City', 'ZIP Code', 'Housing Type', 'Commercial', 'Energy Content'];
const TEMPLATES = ['Standard Neighborhood Hub', 'Service + City Landing Page', 'ZIP Code Page', 'Commercial Service Page', 'Energy Efficiency Article'];
const SERVICES = ['Mini-Split Installation', 'Heat Pump Replacement', 'AC Repair', 'Commercial RTU', 'Energy Audit', 'Maintenance Plan', 'Ductless HVAC'];

interface LocationPageForm {
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  cluster: string;
  page_type: string;
  url_slug: string;
  h1_title: string;
  meta_title: string;
  meta_description: string;
  target_keyword: string;
  housing_stock: string;
  local_landmark: string;
  utility_note: string;
  primary_service: string;
  recommended_system: string;
  case_study_url: string;
  template: string;
  schema_enabled: boolean;
  schema_description: string;
  add_to_service_areas_hub: boolean;
  geography_tag: string;
  zip_tag: string;
  city_tag: string;
  service_tags: string[];
  property_tags: string[];
  gallery_heading: string;
}

interface CsvRow extends Omit<LocationPageForm, 'schema_enabled' | 'add_to_service_areas_hub'> {
  errors?: string[];
}

const defaultForm: LocationPageForm = {
  neighborhood: '',
  city: 'Dallas',
  state: 'TX',
  zip_code: '',
  cluster: 'Oak Cliff',
  page_type: 'Neighborhood Hub',
  url_slug: '',
  h1_title: '',
  meta_title: '',
  meta_description: '',
  target_keyword: '',
  housing_stock: '',
  local_landmark: '',
  utility_note: '',
  primary_service: 'Mini-Split Installation',
  recommended_system: '',
  case_study_url: '',
  template: 'Standard Neighborhood Hub',
  schema_enabled: true,
  schema_description: '',
  add_to_service_areas_hub: true,
  geography_tag: '',
  zip_tag: '',
  city_tag: 'Dallas',
  service_tags: [],
  property_tags: [],
  gallery_heading: '',
};

const LocationPageBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LocationPageForm>({ ...defaultForm });
  const [activeTab, setActiveTab] = useState('single');
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchLocationPage();
    }
  }, [id, isNew]);

  const fetchLocationPage = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_location_pages' as any)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const d = data as any;
      setForm({
        neighborhood: d.neighborhood || '',
        city: d.city || 'Dallas',
        state: d.state || 'TX',
        zip_code: d.zip_code || '',
        cluster: d.cluster || 'Oak Cliff',
        page_type: d.page_type || 'Neighborhood Hub',
        url_slug: d.url_slug || '',
        h1_title: d.h1_title || '',
        meta_title: '',
        meta_description: '',
        target_keyword: '',
        housing_stock: d.housing_stock || '',
        local_landmark: d.local_landmark || '',
        utility_note: d.utility_note || '',
        primary_service: d.primary_service || 'Mini-Split Installation',
        recommended_system: d.recommended_system || '',
        case_study_url: d.case_study_url || '',
        template: d.template || 'Standard Neighborhood Hub',
        schema_enabled: d.schema_enabled ?? true,
        schema_description: d.schema_description || '',
        add_to_service_areas_hub: d.add_to_service_areas_hub ?? true,
        geography_tag: d.geography_tag || '',
        zip_tag: d.zip_tag || '',
        city_tag: d.city_tag || 'Dallas',
        service_tags: d.service_tags || [],
        property_tags: d.property_tags || [],
        gallery_heading: d.gallery_heading || '',
      });
      // Also fetch linked page_seo data
      if (d.page_seo_id) {
        const { data: seoData } = await supabase
          .from('page_seo' as any)
          .select('meta_title, meta_description, target_keyword')
          .eq('id', d.page_seo_id)
          .single();
        if (seoData) {
          setForm(prev => ({
            ...prev,
            meta_title: (seoData as any).meta_title || '',
            meta_description: (seoData as any).meta_description || '',
            target_keyword: (seoData as any).target_keyword || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Error', description: 'Failed to load location page.', variant: 'destructive' });
      navigate('/admin/seo');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate URL slug
  useEffect(() => {
    if (isNew && form.neighborhood && form.primary_service) {
      const service = form.primary_service.toLowerCase().replace(/\s+/g, '-');
      const neighborhood = form.neighborhood.toLowerCase().replace(/\s+/g, '-');
      const city = form.city.toLowerCase().replace(/\s+/g, '-');
      setForm(prev => ({
        ...prev,
        url_slug: `/${service}-${neighborhood}-${city}/`,
        h1_title: prev.h1_title || `${form.primary_service} in ${form.neighborhood}, ${form.city}`,
        meta_title: prev.meta_title || `${form.primary_service} in ${form.neighborhood}, ${form.city} | Truficient`,
        schema_description: prev.schema_description || `Professional ${form.primary_service.toLowerCase()} services in ${form.neighborhood}, ${form.city}, ${form.state}`,
      }));
    }
  }, [form.neighborhood, form.primary_service, form.city, isNew]);

  const update = (field: keyof LocationPageForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.neighborhood.trim() || !form.url_slug.trim()) {
      toast({ title: 'Error', description: 'Neighborhood and URL slug are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveLocationPage(form);
      toast({ title: 'Success!', description: `Page created at ${form.url_slug} and added to SEO tracker. Not linked in navigation.` });
      navigate('/admin/seo');
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveLocationPage = async (data: LocationPageForm) => {
    // 1. Create page_seo entry
    const pageName = data.h1_title || `${data.primary_service} in ${data.neighborhood}`;
    const { data: seoEntry, error: seoError } = await supabase
      .from('page_seo' as any)
      .insert({
        page_path: data.url_slug,
        page_name: pageName,
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        page_type: data.page_type,
        target_keyword: data.target_keyword || null,
        cluster: data.cluster,
        index_status: 'Pending',
        schema_applied: data.schema_enabled,
        robots: 'index, follow',
      })
      .select('id')
      .single();
    if (seoError) throw seoError;

    // 2. Create location page entry
    const { error: locError } = await supabase
      .from('seo_location_pages' as any)
      .insert({
        page_seo_id: (seoEntry as any).id,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code || null,
        cluster: data.cluster,
        page_type: data.page_type,
        url_slug: data.url_slug,
        h1_title: data.h1_title || null,
        housing_stock: data.housing_stock || null,
        local_landmark: data.local_landmark || null,
        utility_note: data.utility_note || null,
        primary_service: data.primary_service || null,
        recommended_system: data.recommended_system || null,
        case_study_url: data.case_study_url || null,
        template: data.template,
        schema_enabled: data.schema_enabled,
        schema_description: data.schema_description || null,
        add_to_service_areas_hub: data.add_to_service_areas_hub,
        geography_tag: data.geography_tag || null,
        zip_tag: data.zip_tag || null,
        city_tag: data.city_tag || 'Dallas',
        service_tags: data.service_tags.length > 0 ? data.service_tags : null,
        property_tags: data.property_tags.length > 0 ? data.property_tags : null,
        gallery_heading: data.gallery_heading || null,
      });
    if (locError) throw locError;
  };

  // CSV handling
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast({ title: 'Error', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' }); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        const errors: string[] = [];
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        if ((row.meta_title || '').length > 60) errors.push('Meta title > 60 chars');
        if ((row.meta_description || '').length > 160) errors.push('Meta description > 160 chars');
        row.errors = errors;
        rows.push(row);
      }
      // Check duplicate slugs
      const slugs = new Set<string>();
      rows.forEach(r => {
        if (slugs.has(r.url_slug)) r.errors = [...(r.errors || []), 'Duplicate URL slug'];
        slugs.add(r.url_slug);
      });
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of csvRows) {
      try {
        await saveLocationPage({
          neighborhood: row.neighborhood,
          city: row.city || 'Dallas',
          state: row.state || 'TX',
          zip_code: row.zip_code || '',
          cluster: row.cluster || 'Oak Cliff',
          page_type: row.page_type || 'Neighborhood Hub',
          url_slug: row.url_slug,
          h1_title: row.h1_title || '',
          meta_title: row.meta_title || '',
          meta_description: row.meta_description || '',
          target_keyword: row.target_keyword || '',
          housing_stock: row.housing_stock || '',
          local_landmark: row.local_landmark || '',
          utility_note: row.utility_note || '',
          primary_service: row.primary_service || 'Mini-Split Installation',
          recommended_system: row.recommended_system || '',
          case_study_url: row.case_study_url || '',
          template: row.template || 'Standard Neighborhood Hub',
          schema_enabled: true,
          schema_description: '',
          add_to_service_areas_hub: true,
          geography_tag: '',
          zip_tag: '',
          city_tag: 'Dallas',
          service_tags: [],
          property_tags: [],
          gallery_heading: '',
        });
        success++;
      } catch { failed++; }
    }
    toast({ title: 'Bulk Import Complete', description: `${success} pages created, ${failed} errors` });
    setCsvRows([]);
    setImporting(false);
    if (success > 0) navigate('/admin/seo');
  };

  const downloadTemplate = () => {
    const headers = 'neighborhood,city,state,zip,cluster,page_type,url_slug,h1_title,meta_title,meta_description,target_keyword,housing_stock,local_landmark,utility_note,primary_service,recommended_system,case_study_url,template';
    const example = 'Oak Cliff,Dallas,TX,75208,Oak Cliff,Neighborhood Hub,/mini-split-installation-oak-cliff-dallas/,Mini-Split Installation in Oak Cliff Dallas,Mini-Split Installation in Oak Cliff Dallas | Truficient,Professional mini-split installation services in Oak Cliff Dallas TX,mini split installation oak cliff,1940s-1960s bungalows and Craftsman homes,Bishop Arts District,Oncor service territory,Mini-Split Installation,Mitsubishi MXZ multi-zone,/blog/mini-split-guide,Standard Neighborhood Hub';
    const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'location-pages-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AdminLayout title="Location Page Builder">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Location Page Builder">
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/admin/seo" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to SEO
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="single">Single Page</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6 mt-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Neighborhood/Area Name *</Label>
                    <Input value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} placeholder="e.g., Oak Cliff" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={form.state} onChange={(e) => update('state', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ZIP Code</Label>
                    <Input value={form.zip_code} onChange={(e) => update('zip_code', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cluster</Label>
                    <Select value={form.cluster} onValueChange={(v) => update('cluster', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CLUSTERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Page Type</Label>
                    <Select value={form.page_type} onValueChange={(v) => update('page_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* URL Slug */}
            <Card>
              <CardHeader>
                <CardTitle>URL Slug</CardTitle>
                <CardDescription>Auto-generated from service + neighborhood + city (editable)</CardDescription>
              </CardHeader>
              <CardContent>
                <Input value={form.url_slug} onChange={(e) => update('url_slug', e.target.value)} placeholder="/service-neighborhood-city/" />
              </CardContent>
            </Card>

            {/* SEO Fields */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Page Title (H1)</Label>
                    <span className={`text-xs ${(form.h1_title?.length || 0) > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>{form.h1_title?.length || 0}/60</span>
                  </div>
                  <Input value={form.h1_title} onChange={(e) => update('h1_title', e.target.value)} placeholder="Page heading" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Meta Title</Label>
                    <span className={`text-xs ${(form.meta_title?.length || 0) > 60 ? 'text-red-500' : 'text-muted-foreground'}`}>{form.meta_title?.length || 0}/60</span>
                  </div>
                  <Input value={form.meta_title} onChange={(e) => update('meta_title', e.target.value)} placeholder="SEO title" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Meta Description</Label>
                    <span className={`text-xs ${(form.meta_description?.length || 0) > 160 ? 'text-red-500' : 'text-muted-foreground'}`}>{form.meta_description?.length || 0}/160</span>
                  </div>
                  <Textarea value={form.meta_description} onChange={(e) => update('meta_description', e.target.value)} placeholder="Brief description for search results" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Target Keyword</Label>
                  <Input value={form.target_keyword} onChange={(e) => update('target_keyword', e.target.value)} placeholder="Primary SEO keyword" />
                </div>
              </CardContent>
            </Card>

            {/* Local Content Variables */}
            <Card>
              <CardHeader>
                <CardTitle>Local Content Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Housing Stock Description</Label>
                    <Input value={form.housing_stock} onChange={(e) => update('housing_stock', e.target.value)} placeholder="e.g., 1940s–1960s bungalows and Craftsman homes" />
                  </div>
                  <div className="space-y-2">
                    <Label>Local Landmark/Reference</Label>
                    <Input value={form.local_landmark} onChange={(e) => update('local_landmark', e.target.value)} placeholder="e.g., Bishop Arts District" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Local Utility Note</Label>
                  <Input value={form.utility_note} onChange={(e) => update('utility_note', e.target.value)} placeholder="e.g., Oncor service territory — eligible for heat pump rebates" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Service Featured</Label>
                    <Select value={form.primary_service} onValueChange={(v) => update('primary_service', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recommended System</Label>
                    <Input value={form.recommended_system} onChange={(e) => update('recommended_system', e.target.value)} placeholder="e.g., Mitsubishi MXZ multi-zone" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Case Study Internal Link</Label>
                  <Input value={form.case_study_url} onChange={(e) => update('case_study_url', e.target.value)} placeholder="/blog/related-post" />
                </div>
              </CardContent>
            </Card>

            {/* Schema & Template */}
            <Card>
              <CardHeader>
                <CardTitle>Schema & Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.schema_enabled} onCheckedChange={(v) => update('schema_enabled', v)} />
                    <Label>Auto-generate LocalBusiness JSON-LD</Label>
                  </div>
                </div>
                {form.schema_enabled && (
                  <div className="space-y-2">
                    <Label>Schema Description (auto-generated, editable)</Label>
                    <Textarea value={form.schema_description} onChange={(e) => update('schema_description', e.target.value)} rows={2} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Page Template</Label>
                  <Select value={form.template} onValueChange={(v) => update('template', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.add_to_service_areas_hub} onCheckedChange={(v) => update('add_to_service_areas_hub', v)} />
                  <Label>Add to /service-areas/ master hub</Label>
                </div>
              </CardContent>
            </Card>

            {/* Gallery Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Gallery Matching</CardTitle>
                <CardDescription>Tags used to automatically match gallery photos to this page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Geography Tag</Label>
                    <Input value={form.geography_tag} onChange={(e) => update('geography_tag', e.target.value)} placeholder="e.g., oak-cliff" />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Tag</Label>
                    <Input value={form.zip_tag} onChange={(e) => update('zip_tag', e.target.value)} placeholder="e.g., 75208" />
                  </div>
                  <div className="space-y-2">
                    <Label>City Tag</Label>
                    <Input value={form.city_tag} onChange={(e) => update('city_tag', e.target.value)} placeholder="e.g., Dallas" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Service Tags (comma-separated)</Label>
                    <Input
                      value={form.service_tags.join(', ')}
                      onChange={(e) => update('service_tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                      placeholder="e.g., ductless, ac-replacement"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Tags (comma-separated)</Label>
                    <Input
                      value={form.property_tags.join(', ')}
                      onChange={(e) => update('property_tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                      placeholder="e.g., residential"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gallery Heading</Label>
                  <Input value={form.gallery_heading} onChange={(e) => update('gallery_heading', e.target.value)} placeholder={`Our Work in ${form.neighborhood || 'Neighborhood'}`} />
                </div>
              </CardContent>
            </Card>

            {/* Save */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isNew ? 'Create Location Page' : 'Save Changes'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Import via CSV</CardTitle>
                <CardDescription>Upload a CSV file with location page data. Download the template below for the correct format.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                  <div>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV
                      </div>
                    </label>
                    <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  </div>
                </div>

                {csvRows.length > 0 && (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Neighborhood</TableHead>
                            <TableHead>URL Slug</TableHead>
                            <TableHead>Meta Title</TableHead>
                            <TableHead>Cluster</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvRows.map((row, i) => (
                            <TableRow key={i} className={row.errors && row.errors.length > 0 ? 'bg-red-50' : ''}>
                              <TableCell className="text-xs">{i + 1}</TableCell>
                              <TableCell className="text-sm">{row.neighborhood}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{row.url_slug}</TableCell>
                              <TableCell>
                                <span className={`text-xs ${(row.meta_title?.length || 0) > 60 ? 'text-red-600 font-medium' : ''}`}>
                                  {row.meta_title} ({row.meta_title?.length || 0}/60)
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">{row.cluster}</TableCell>
                              <TableCell>
                                {row.errors && row.errors.length > 0 ? (
                                  <div className="space-y-1">
                                    {row.errors.map((err, j) => (
                                      <Badge key={j} variant="outline" className="border-0 bg-red-100 text-red-700 text-[10px]">{err}</Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {csvRows.length} rows · {csvRows.filter(r => r.errors && r.errors.length > 0).length} with warnings
                      </p>
                      <Button onClick={handleBulkImport} disabled={importing} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                        {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Import All ({csvRows.length} pages)
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default LocationPageBuilder;
