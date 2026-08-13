import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Save, Eye, Upload, Trash2, ChevronDown, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import RichTextEditor from '@/components/admin/RichTextEditor';
import BlogPreview from '@/components/admin/BlogPreview';
import TagSelector from '@/components/admin/TagSelector';
import CategorySelector from '@/components/admin/CategorySelector';
import AuthorSelector from '@/components/admin/AuthorSelector';
import { compressImage } from '@/utils/imageCompression';

interface AuthorProfile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  featured_image_alt: string | null;
  status: string;
  author_id: string | null;
  author_profile_id: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  category: string[] | null;
  tags: string[] | null;
  focus_keyword: string | null;
  noindex: boolean;
  canonical_url: string | null;
  author_name: string | null;
  author_bio: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
}

// Categories are now managed in CategorySelector component

const BlogPostEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [advancedSeoOpen, setAdvancedSeoOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorProfile | null>(null);
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    featured_image_alt: '',
    status: 'draft',
    meta_title: '',
    meta_description: '',
    category: [],
    tags: [],
    focus_keyword: '',
    noindex: false,
    canonical_url: '',
    author_profile_id: null,
    author_name: '',
    author_bio: '',
    og_title: '',
    og_description: '',
    og_image: '',
  });

  useEffect(() => {
    if (!isNew && id) {
      fetchPost();
    }
  }, [id, isNew]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts' as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPost(data as unknown as BlogPost);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog post.',
        variant: 'destructive',
      });
      navigate('/admin/blog');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setPost(prev => ({
      ...prev,
      title,
      slug: isNew || !prev.slug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleTagsChange = (tags: string[]) => {
    setPost(prev => ({ ...prev, tags }));
  };

  const handleAuthorChange = (profile: AuthorProfile | null) => {
    setSelectedAuthor(profile);
    setPost(prev => ({
      ...prev,
      author_profile_id: profile?.id || null,
      author_name: profile?.display_name || '',
      author_bio: profile?.bio || '',
    }));
  };

  // SEO Analysis helpers
  const getMetaTitleStatus = () => {
    const length = (post.meta_title || post.title || '').length;
    if (length === 0) return { color: 'text-muted-foreground', label: '0/60' };
    if (length <= 60) return { color: 'text-green-600', label: `${length}/60 ✓` };
    return { color: 'text-destructive', label: `${length}/60 (too long)` };
  };

  const getMetaDescStatus = () => {
    const length = (post.meta_description || '').length;
    if (length === 0) return { color: 'text-muted-foreground', label: '0/160' };
    if (length >= 120 && length <= 160) return { color: 'text-green-600', label: `${length}/160 ✓` };
    if (length < 120) return { color: 'text-yellow-600', label: `${length}/160 (short)` };
    if (length <= 200) return { color: 'text-yellow-600', label: `${length}/160 (long)` };
    return { color: 'text-destructive', label: `${length}/160 (too long)` };
  };

  const getKeywordAnalysis = () => {
    const keyword = (post.focus_keyword || '').toLowerCase().trim();
    if (!keyword) return [];

    const title = (post.title || '').toLowerCase();
    const slug = (post.slug || '').toLowerCase();
    const metaDesc = (post.meta_description || '').toLowerCase();
    const content = (post.content || '').toLowerCase();
    const firstParagraph = content.slice(0, 500);

    return [
      { label: 'In title', pass: title.includes(keyword) },
      { label: 'In slug', pass: slug.includes(keyword) },
      { label: 'In meta description', pass: metaDesc.includes(keyword) },
      { label: 'In first 100 words', pass: firstParagraph.includes(keyword) },
    ];
  };

  const handleSave = async (publishNow = false) => {
    if (!post.title?.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!post.slug?.trim()) {
      toast({
        title: 'Error',
        description: 'Slug is required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const postData = {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || null,
        content: post.content || null,
        featured_image: post.featured_image || null,
        featured_image_alt: post.featured_image_alt || null,
        status: publishNow ? 'published' : post.status,
        meta_title: post.meta_title || null,
        meta_description: post.meta_description || null,
        published_at: publishNow ? new Date().toISOString() : post.published_at,
        author_id: user?.id || null,
        author_profile_id: post.author_profile_id || null,
        category: post.category && post.category.length > 0 ? post.category : [],
        tags: post.tags || [],
        focus_keyword: post.focus_keyword || null,
        noindex: post.noindex || false,
        canonical_url: post.canonical_url || null,
        author_name: post.author_name || null,
        author_bio: post.author_bio || null,
        og_title: post.og_title || null,
        og_description: post.og_description || null,
        og_image: post.og_image || null,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from('blog_posts' as any)
          .insert(postData)
          .select()
          .single();

        if (error) throw error;
        
        toast({
          title: publishNow ? 'Post published!' : 'Post created!',
          description: publishNow ? 'Your post is now live.' : 'Your draft has been saved.',
        });
        
        navigate(`/admin/blog/${(data as any).id}`);
      } else {
        const { error } = await supabase
          .from('blog_posts' as any)
          .update(postData)
          .eq('id', id);

        if (error) throw error;
        
        setPost(prev => ({ ...prev, ...postData }));
        
        toast({
          title: publishNow ? 'Post published!' : 'Post saved!',
          description: publishNow ? 'Your post is now live.' : 'Your changes have been saved.',
        });
      }
    } catch (error: any) {
      console.error('Error saving post:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'A post with this slug already exists. Please use a different slug.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save the post.',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const metaTitleStatus = getMetaTitleStatus();
  const metaDescStatus = getMetaDescStatus();
  const keywordAnalysis = getKeywordAnalysis();

  if (loading) {
    return (
      <AdminLayout title={isNew ? 'New Post' : 'Edit Post'}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? 'New Post' : 'Edit Post'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/admin/blog" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Posts
            </Link>
          </Button>
          
          <div className="flex items-center gap-2">
            {post.status === 'published' && !isNew && (
              <Button variant="outline" asChild>
                <Link to={`/blog/${post.slug}`} target="_blank">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            {post.status !== 'published' && (
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Publish
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="editor" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Live Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={post.title || ''}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Enter post title..."
                        className="text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug *</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">/blog/</span>
                        <Input
                          id="slug"
                          value={post.slug || ''}
                          onChange={(e) => setPost(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="post-url-slug"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excerpt">Excerpt</Label>
                      <Textarea
                        id="excerpt"
                        value={post.excerpt || ''}
                        onChange={(e) => setPost(prev => ({ ...prev, excerpt: e.target.value }))}
                        placeholder="Brief description for previews..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Content</Label>
                      <RichTextEditor
                        value={post.content || ''}
                        onChange={(html) => setPost(prev => ({ ...prev, content: html }))}
                        placeholder="Write your blog post content here..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={post.status || 'draft'}
                      onValueChange={(value) => setPost(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* SEO Analysis Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      SEO Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="focusKeyword">Focus Keyword</Label>
                      <Input
                        id="focusKeyword"
                        value={post.focus_keyword || ''}
                        onChange={(e) => setPost(prev => ({ ...prev, focus_keyword: e.target.value }))}
                        placeholder="e.g., hvac maintenance tips"
                      />
                    </div>
                    
                    {post.focus_keyword && keywordAnalysis.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground">Keyword Usage</p>
                        {keywordAnalysis.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {item.pass ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={item.pass ? 'text-green-600' : 'text-muted-foreground'}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Meta Tags Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Meta Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="metaTitle">Meta Title</Label>
                      <Input
                        id="metaTitle"
                        value={post.meta_title || ''}
                        onChange={(e) => setPost(prev => ({ ...prev, meta_title: e.target.value }))}
                        placeholder="SEO title (defaults to post title)"
                      />
                      <p className={`text-xs ${metaTitleStatus.color}`}>
                        {metaTitleStatus.label}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="metaDescription">Meta Description</Label>
                      <Textarea
                        id="metaDescription"
                        value={post.meta_description || ''}
                        onChange={(e) => setPost(prev => ({ ...prev, meta_description: e.target.value }))}
                        placeholder="SEO description (120-160 chars recommended)..."
                        rows={3}
                      />
                      <p className={`text-xs ${metaDescStatus.color}`}>
                        {metaDescStatus.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Category & Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Categories</Label>
                      <CategorySelector
                        selectedCategories={post.category || []}
                        onChange={(categories) => setPost(prev => ({ ...prev, category: categories }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <TagSelector
                        selectedTags={post.tags || []}
                        onChange={handleTagsChange}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Featured Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {post.featured_image ? (
                        <div className="space-y-3">
                          <div className="relative group">
                            <img
                              src={post.featured_image}
                              alt={post.featured_image_alt || 'Featured'}
                              className="w-full h-40 object-cover rounded-md"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setPost(prev => ({ ...prev, featured_image: '', featured_image_alt: '' }))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="featuredImageAlt">Alt Text</Label>
                            <Input
                              id="featuredImageAlt"
                              value={post.featured_image_alt || ''}
                              onChange={(e) => setPost(prev => ({ ...prev, featured_image_alt: e.target.value }))}
                              placeholder="Describe the image for accessibility..."
                            />
                            <p className="text-xs text-muted-foreground">
                              Describe the image for screen readers and SEO
                            </p>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {uploadingImage ? (
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Click to upload</p>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            disabled={uploadingImage}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              setUploadingImage(true);
                              try {
                                // Auto-compress/resize for blog (max 1600px, ~85% quality)
                                const compressed = await compressImage(file, {
                                  maxWidth: 1600,
                                  maxHeight: 1600,
                                  quality: 0.85,
                                  maxSizeMB: 1.5,
                                });
                                const fileExt = (compressed.type === 'image/png' ? 'png' : 'jpg');
                                const fileName = `featured/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

                                const { error: uploadError } = await supabase.storage
                                  .from('blog_images')
                                  .upload(fileName, compressed, { contentType: compressed.type, cacheControl: '3600' });

                                if (uploadError) throw uploadError;

                                const { data: { publicUrl } } = supabase.storage
                                  .from('blog_images')
                                  .getPublicUrl(fileName);

                                setPost(prev => ({ ...prev, featured_image: publicUrl }));
                                toast({
                                  title: 'Image uploaded',
                                  description: 'Featured image has been set.',
                                });
                              } catch (error) {
                                console.error('Error uploading image:', error);
                                toast({
                                  title: 'Upload failed',
                                  description: 'Failed to upload image. Please try again.',
                                  variant: 'destructive',
                                });
                              } finally {
                                setUploadingImage(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Or paste an image URL:
                      </p>
                      <Input
                        value={post.featured_image || ''}
                        onChange={(e) => setPost(prev => ({ ...prev, featured_image: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Author Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Author</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AuthorSelector
                      selectedProfileId={post.author_profile_id || null}
                      onChange={handleAuthorChange}
                    />
                  </CardContent>
                </Card>

                {/* Advanced SEO Card */}
                <Card>
                  <Collapsible open={advancedSeoOpen} onOpenChange={setAdvancedSeoOpen}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="flex items-center justify-between">
                          Advanced SEO
                          <ChevronDown className={`h-4 w-4 transition-transform ${advancedSeoOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="noindex">NoIndex</Label>
                            <p className="text-xs text-muted-foreground">
                              Hide this post from search engines
                            </p>
                          </div>
                          <Switch
                            id="noindex"
                            checked={post.noindex || false}
                            onCheckedChange={(checked) => setPost(prev => ({ ...prev, noindex: checked }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="canonicalUrl">Canonical URL</Label>
                          <Input
                            id="canonicalUrl"
                            value={post.canonical_url || ''}
                            onChange={(e) => setPost(prev => ({ ...prev, canonical_url: e.target.value }))}
                            placeholder="https://example.com/original-post"
                          />
                          <p className="text-xs text-muted-foreground">
                            Use if this content exists elsewhere
                          </p>
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium mb-3">Open Graph Overrides</p>
                          
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="ogTitle">OG Title</Label>
                              <Input
                                id="ogTitle"
                                value={post.og_title || ''}
                                onChange={(e) => setPost(prev => ({ ...prev, og_title: e.target.value }))}
                                placeholder="Custom social media title"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="ogDescription">OG Description</Label>
                              <Textarea
                                id="ogDescription"
                                value={post.og_description || ''}
                                onChange={(e) => setPost(prev => ({ ...prev, og_description: e.target.value }))}
                                placeholder="Custom social media description"
                                rows={2}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="ogImage">OG Image URL</Label>
                              <Input
                                id="ogImage"
                                value={post.og_image || ''}
                                onChange={(e) => setPost(prev => ({ ...prev, og_image: e.target.value }))}
                                placeholder="https://example.com/social-image.jpg"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <BlogPreview
              title={post.title || ''}
              excerpt={post.excerpt || ''}
              content={post.content || ''}
              featuredImage={post.featured_image || ''}
              featuredImageAlt={post.featured_image_alt || ''}
              category={Array.isArray(post.category) ? post.category.join(', ') : (post.category || '')}
              tags={post.tags || []}
              publishedAt={post.published_at || undefined}
              authorName={post.author_name || ''}
              authorBio={post.author_bio || ''}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default BlogPostEditor;
