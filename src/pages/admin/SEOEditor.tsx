import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Eye, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PageSEO {
  id: string;
  page_path: string;
  page_name: string;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
  structured_data: any;
  page_type: string | null;
  target_keyword: string | null;
  cluster: string | null;
  index_status: string | null;
  gsc_impressions: number | null;
  gsc_clicks: number | null;
  avg_position: number | null;
  internal_links: number | null;
  schema_applied: boolean | null;
  last_content_update: string | null;
}

const PAGE_TYPES = ['Core Page', 'Neighborhood Hub', 'Service+City', 'ZIP Code', 'Housing Type', 'Commercial', 'Energy Content'];
const CLUSTERS = ['Core Site', 'Oak Cliff', 'East Dallas', 'North Dallas', 'Downtown Dallas', 'South Dallas', 'Outer Ring'];
const INDEX_STATUSES = ['Indexed', 'Pending', 'Not Indexed', 'Excluded'];

const SEOEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [seo, setSeo] = useState<Partial<PageSEO>>({
    page_path: '',
    page_name: '',
    meta_title: '',
    meta_description: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    robots: 'index, follow',
    structured_data: null,
    page_type: 'Core Page',
    target_keyword: '',
    cluster: 'Core Site',
    index_status: 'Pending',
    gsc_impressions: 0,
    gsc_clicks: 0,
    avg_position: null,
    internal_links: 0,
    schema_applied: false,
    last_content_update: null,
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchSEO();
    }
  }, [id, isNew]);

  const fetchSEO = async () => {
    try {
      const { data, error } = await supabase
        .from('page_seo' as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setSeo(data as unknown as PageSEO);
    } catch (error) {
      console.error('Error fetching SEO:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SEO settings.',
        variant: 'destructive',
      });
      navigate('/admin/seo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!seo.page_path?.trim()) {
      toast({
        title: 'Error',
        description: 'Page path is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!seo.page_name?.trim()) {
      toast({
        title: 'Error',
        description: 'Page name is required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const seoData = {
        page_path: seo.page_path,
        page_name: seo.page_name,
        meta_title: seo.meta_title || null,
        meta_description: seo.meta_description || null,
        og_title: seo.og_title || null,
        og_description: seo.og_description || null,
        og_image: seo.og_image || null,
        canonical_url: seo.canonical_url || null,
        robots: seo.robots || 'index, follow',
        structured_data: seo.structured_data || null,
        page_type: seo.page_type || 'Core Page',
        target_keyword: seo.target_keyword || null,
        cluster: seo.cluster || null,
        index_status: seo.index_status || 'Pending',
        gsc_impressions: seo.gsc_impressions || 0,
        gsc_clicks: seo.gsc_clicks || 0,
        avg_position: seo.avg_position || null,
        internal_links: seo.internal_links || 0,
        schema_applied: seo.schema_applied || false,
        last_content_update: seo.last_content_update || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('page_seo' as any)
          .insert(seoData)
          .select()
          .single();

        if (error) throw error;
        
        toast({
          title: 'SEO settings created!',
          description: 'The page SEO settings have been saved.',
        });
        
        navigate(`/admin/seo/${(data as any).id}`);
      } else {
        const { error } = await supabase
          .from('page_seo' as any)
          .update(seoData)
          .eq('id', id);

        if (error) throw error;
        
        toast({
          title: 'SEO settings saved!',
          description: 'Your changes have been saved.',
        });
      }
    } catch (error: any) {
      console.error('Error saving SEO:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'A page with this path already exists.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save SEO settings.',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const getTitleStatus = () => {
    const length = seo.meta_title?.length || 0;
    if (length === 0) return { color: 'text-gray-500', message: 'Not set' };
    if (length <= 60) return { color: 'text-green-600', message: `${length}/60 - Good` };
    return { color: 'text-red-600', message: `${length}/60 - Too long` };
  };

  const getDescriptionStatus = () => {
    const length = seo.meta_description?.length || 0;
    if (length === 0) return { color: 'text-gray-500', message: 'Not set' };
    if (length <= 160) return { color: 'text-green-600', message: `${length}/160 - Good` };
    return { color: 'text-red-600', message: `${length}/160 - Too long` };
  };

  if (loading) {
    return (
      <AdminLayout title={isNew ? 'Add Page SEO' : 'Edit Page SEO'}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  const titleStatus = getTitleStatus();
  const descStatus = getDescriptionStatus();

  return (
    <AdminLayout title={isNew ? 'Add Page SEO' : 'Edit Page SEO'}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/admin/seo" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to SEO
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            {!isNew && seo.page_path && (
              <Button variant="outline" asChild>
                <Link to={seo.page_path} target="_blank">
                  <Eye className="h-4 w-4 mr-2" />
                  View Page
                </Link>
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Page Info */}
        <Card>
          <CardHeader>
            <CardTitle>Page Information</CardTitle>
            <CardDescription>Basic page identification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pageName">Page Name *</Label>
                <Input
                  id="pageName"
                  value={seo.page_name || ''}
                  onChange={(e) => setSeo(prev => ({ ...prev, page_name: e.target.value }))}
                  placeholder="e.g., Home, About Us, Contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pagePath">Page Path *</Label>
                <Input
                  id="pagePath"
                  value={seo.page_path || ''}
                  onChange={(e) => setSeo(prev => ({ ...prev, page_path: e.target.value }))}
                  placeholder="e.g., /, /about, /contact"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Page Type</Label>
                <Select value={seo.page_type || 'Core Page'} onValueChange={(v) => setSeo(prev => ({ ...prev, page_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cluster</Label>
                <Select value={seo.cluster || 'Core Site'} onValueChange={(v) => setSeo(prev => ({ ...prev, cluster: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLUSTERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Index Status</Label>
                <Select value={seo.index_status || 'Pending'} onValueChange={(v) => setSeo(prev => ({ ...prev, index_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDEX_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="targetKeyword">Target Keyword</Label>
                <Input id="targetKeyword" value={seo.target_keyword || ''} onChange={(e) => setSeo(prev => ({ ...prev, target_keyword: e.target.value }))} placeholder="Primary SEO keyword" />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={seo.schema_applied || false} onChange={(e) => setSeo(prev => ({ ...prev, schema_applied: e.target.checked }))} className="rounded" />
                  Schema Applied
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GSC Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Search Console Metrics</CardTitle>
            <CardDescription>Weekly Google Search Console data (manual entry)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>GSC Impressions</Label>
                <Input type="number" value={seo.gsc_impressions ?? 0} onChange={(e) => setSeo(prev => ({ ...prev, gsc_impressions: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>GSC Clicks</Label>
                <Input type="number" value={seo.gsc_clicks ?? 0} onChange={(e) => setSeo(prev => ({ ...prev, gsc_clicks: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Avg Position</Label>
                <Input type="number" step="0.1" value={seo.avg_position ?? ''} onChange={(e) => setSeo(prev => ({ ...prev, avg_position: parseFloat(e.target.value) || null }))} placeholder="e.g., 12.3" />
              </div>
              <div className="space-y-2">
                <Label>Internal Links</Label>
                <Input type="number" value={seo.internal_links ?? 0} onChange={(e) => setSeo(prev => ({ ...prev, internal_links: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Meta Tags</CardTitle>
            <CardDescription>Search engine optimization settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <span className={`text-xs ${titleStatus.color}`}>{titleStatus.message}</span>
              </div>
              <Input
                id="metaTitle"
                value={seo.meta_title || ''}
                onChange={(e) => setSeo(prev => ({ ...prev, meta_title: e.target.value }))}
                placeholder="Page title for search engines"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <span className={`text-xs ${descStatus.color}`}>{descStatus.message}</span>
              </div>
              <Textarea
                id="metaDescription"
                value={seo.meta_description || ''}
                onChange={(e) => setSeo(prev => ({ ...prev, meta_description: e.target.value }))}
                placeholder="Brief description for search results"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                value={seo.canonical_url || ''}
                onChange={(e) => setSeo(prev => ({ ...prev, canonical_url: e.target.value }))}
                placeholder="https://truficient.com/page (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default page URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="robots">Robots Directive</Label>
              <Select
                value={seo.robots || 'index, follow'}
                onValueChange={(value) => setSeo(prev => ({ ...prev, robots: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="index, follow">Index, Follow (default)</SelectItem>
                  <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                  <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                  <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Open Graph */}
        <Card>
          <CardHeader>
            <CardTitle>Open Graph (Social Sharing)</CardTitle>
            <CardDescription>How the page appears when shared on social media</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If left empty, Open Graph tags will default to meta title and description.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="ogTitle">OG Title</Label>
              <Input
                id="ogTitle"
                value={seo.og_title || ''}
                onChange={(e) => setSeo(prev => ({ ...prev, og_title: e.target.value }))}
                placeholder="Title for social sharing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogDescription">OG Description</Label>
              <Textarea
                id="ogDescription"
                value={seo.og_description || ''}
                onChange={(e) => setSeo(prev => ({ ...prev, og_description: e.target.value }))}
                placeholder="Description for social sharing"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogImage">OG Image URL</Label>
              <Input
                id="ogImage"
                value={seo.og_image || ''}
                onChange={(e) => setSeo(prev => ({ ...prev, og_image: e.target.value }))}
                placeholder="https://example.com/image.jpg (1200x630 recommended)"
              />
              {seo.og_image && (
                <img
                  src={seo.og_image}
                  alt="OG Preview"
                  className="w-full max-w-md h-auto rounded-md border mt-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Search Preview</CardTitle>
            <CardDescription>How the page may appear in Google search results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-white">
              <div className="text-blue-800 text-xl hover:underline cursor-pointer truncate">
                {seo.meta_title || seo.page_name || 'Page Title'}
              </div>
              <div className="text-green-700 text-sm truncate">
                truficient.com{seo.page_path || '/'}
              </div>
              <div className="text-gray-600 text-sm line-clamp-2 mt-1">
                {seo.meta_description || 'No description set. Add a meta description to improve click-through rates from search results.'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SEOEditor;
