import { useState, useMemo, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MediaUpload, MediaType } from '@/components/admin/MediaUpload';
import { BulkImageUpload } from '@/components/admin/BulkImageUpload';
import { SortableGalleryItem } from '@/components/admin/SortableGalleryItem';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Plus, Pencil, Trash2, Star, Image as ImageIcon, Video, Tag, Loader2, Upload, Grid2X2, Grid3X3, LayoutGrid, Play, ArrowUpDown, Check, X, Camera, Sparkles } from 'lucide-react';
import { WorkEdgeMediaBrowser } from '@/components/admin/WorkEdgeMediaBrowser';
import { EquipmentClassificationBrowser } from '@/components/admin/EquipmentClassificationBrowser';
import { Wrench } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

const PAGE_SIZE = 48;

type MediaFilter = 'all' | 'image' | 'video';

interface GalleryTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  tag_type: string | null;
}

interface GalleryImage {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  media_type: MediaType;
  alt_text: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface ImageTagRelation {
  tag_id: string;
}

type ThumbnailSize = 'small' | 'medium' | 'large';

const AdminGallery = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('images');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>('medium');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedImages, setReorderedImages] = useState<GalleryImage[]>([]);
  const [aiDescribing, setAiDescribing] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Image dialog state
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [imageForm, setImageForm] = useState({
    title: '',
    description: '',
    image_url: '',
    thumbnail_url: '' as string | null,
    media_type: 'image' as MediaType,
    alt_text: '',
    is_featured: false,
    is_active: true,
    approved_for_website: false,
    photo_date: '' as string,
    selectedTags: [] as string[],
  });

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<GalleryTag | null>(null);
  const [tagForm, setTagForm] = useState({
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
    is_active: true,
    tag_type: '' as string,
  });

  // Fetch tags
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['gallery-tags-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_tags')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as GalleryTag[];
    },
  });

  // Fetch counts for display
  const { data: mediaCounts = { total: 0, images: 0, videos: 0 } } = useQuery({
    queryKey: ['gallery-media-counts-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('media_type');
      if (error) throw error;
      const images = data.filter(d => d.media_type !== 'video').length;
      const videos = data.filter(d => d.media_type === 'video').length;
      return { total: data.length, images, videos };
    },
  });

  // Infinite query for images
  const {
    data: imagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: imagesLoading,
  } = useInfiniteQuery({
    queryKey: ['gallery-images-admin-infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      
      return {
        images: data as GalleryImage[],
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  // Flatten all pages and filter by media type
  const images = useMemo(() => {
    const allImages = imagesData?.pages.flatMap(page => page.images) || [];
    if (mediaFilter === 'all') return allImages;
    return allImages.filter(img => 
      mediaFilter === 'video' ? img.media_type === 'video' : img.media_type !== 'video'
    );
  }, [imagesData, mediaFilter]);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: () => fetchNextPage(),
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  // Fetch image-tag relations
  const { data: imageTagRelations = [] } = useQuery({
    queryKey: ['gallery-image-tags-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery_image_tags')
        .select('image_id, tag_id');
      if (error) throw error;
      return data;
    },
  });

  // Image mutations
  const createImageMutation = useMutation({
    mutationFn: async (data: typeof imageForm) => {
      const { selectedTags, ...imageData } = data;
      const { data: newImage, error } = await supabase
        .from('gallery_images')
        .insert({
          title: imageData.title,
          description: imageData.description || null,
          image_url: imageData.image_url,
          thumbnail_url: imageData.thumbnail_url || null,
          media_type: imageData.media_type,
          alt_text: imageData.alt_text || null,
          is_featured: imageData.is_featured,
          is_active: imageData.is_active,
          approved_for_website: imageData.approved_for_website,
          photo_date: imageData.photo_date || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Add tag relations
      if (selectedTags.length > 0) {
        const { error: tagError } = await supabase
          .from('gallery_image_tags')
          .insert(selectedTags.map(tagId => ({ image_id: newImage.id, tag_id: tagId })));
        if (tagError) throw tagError;
      }

      return newImage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images-admin-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-media-counts-admin'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-image-tags-admin'] });
      setImageDialogOpen(false);
      resetImageForm();
      toast.success('Media added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add media: ' + error.message);
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof imageForm }) => {
      const { selectedTags, ...imageData } = data;
      const { error } = await supabase
        .from('gallery_images')
        .update({
          title: imageData.title,
          description: imageData.description || null,
          image_url: imageData.image_url,
          thumbnail_url: imageData.thumbnail_url || null,
          media_type: imageData.media_type,
          alt_text: imageData.alt_text || null,
          is_featured: imageData.is_featured,
          is_active: imageData.is_active,
          approved_for_website: imageData.approved_for_website,
          photo_date: imageData.photo_date || null,
        })
        .eq('id', id);
      if (error) throw error;

      // Update tag relations - remove old ones and add new ones
      await supabase.from('gallery_image_tags').delete().eq('image_id', id);
      if (selectedTags.length > 0) {
        const { error: tagError } = await supabase
          .from('gallery_image_tags')
          .insert(selectedTags.map(tagId => ({ image_id: id, tag_id: tagId })));
        if (tagError) throw tagError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images-admin-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-media-counts-admin'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-image-tags-admin'] });
      setImageDialogOpen(false);
      resetImageForm();
      toast.success('Media updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update media: ' + error.message);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gallery_images').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images-admin-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['gallery-media-counts-admin'] });
      toast.success('Media deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete media: ' + error.message);
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderedImages: { id: string; sort_order: number }[]) => {
      // Update all images with their new sort orders
      const updates = orderedImages.map(({ id, sort_order }) =>
        supabase.from('gallery_images').update({ sort_order }).eq('id', id)
      );
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error('Failed to update some items');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-images-admin-infinite'] });
      setIsReorderMode(false);
      setReorderedImages([]);
      toast.success('Gallery order saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save order: ' + error.message);
    },
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const currentImages = reorderedImages.length > 0 ? reorderedImages : images;
    const oldIndex = currentImages.findIndex(img => img.id === active.id);
    const newIndex = currentImages.findIndex(img => img.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(currentImages, oldIndex, newIndex);
      setReorderedImages(newOrder);
    }
  };

  // Enter reorder mode
  const enterReorderMode = () => {
    setReorderedImages([...images]);
    setIsReorderMode(true);
  };

  // Cancel reorder mode
  const cancelReorderMode = () => {
    setReorderedImages([]);
    setIsReorderMode(false);
  };

  // Save reordered images
  const saveReorder = () => {
    const orderedImages = reorderedImages.map((img, index) => ({
      id: img.id,
      sort_order: index + 1,
    }));
    reorderMutation.mutate(orderedImages);
  };

  // Get display images (reordered if in reorder mode)
  const displayImages = isReorderMode && reorderedImages.length > 0 ? reorderedImages : images;

  // Tag mutations
  const createTagMutation = useMutation({
    mutationFn: async (data: typeof tagForm) => {
      const { error } = await supabase.from('gallery_tags').insert({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
        tag_type: data.tag_type || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-tags-admin'] });
      setTagDialogOpen(false);
      resetTagForm();
      toast.success('Tag created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create tag: ' + error.message);
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof tagForm }) => {
      const { error } = await supabase
        .from('gallery_tags')
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          sort_order: data.sort_order,
          is_active: data.is_active,
          tag_type: data.tag_type || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-tags-admin'] });
      setTagDialogOpen(false);
      resetTagForm();
      toast.success('Tag updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update tag: ' + error.message);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gallery_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery-tags-admin'] });
      toast.success('Tag deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete tag: ' + error.message);
    },
  });

  const resetImageForm = () => {
    setEditingImage(null);
    setImageForm({
      title: '',
      description: '',
      image_url: '',
      thumbnail_url: null,
      media_type: 'image',
      alt_text: '',
      is_featured: false,
      is_active: true,
      approved_for_website: false,
      photo_date: '',
      selectedTags: [],
    });
  };

  const resetTagForm = () => {
    setEditingTag(null);
    setTagForm({
      name: '',
      slug: '',
      description: '',
      sort_order: 0,
      is_active: true,
      tag_type: '',
    });
  };

  const openEditImage = (image: GalleryImage) => {
    const imageTags = imageTagRelations
      .filter(r => r.image_id === image.id)
      .map(r => r.tag_id);
    
    setEditingImage(image);
    setImageForm({
      title: image.title,
      description: image.description || '',
      image_url: image.image_url,
      thumbnail_url: image.thumbnail_url || null,
      media_type: image.media_type || 'image',
      alt_text: image.alt_text || '',
      is_featured: image.is_featured,
      is_active: image.is_active,
      approved_for_website: (image as any).approved_for_website ?? false,
      photo_date: (image as any).photo_date || '',
      selectedTags: imageTags,
    });
    setImageDialogOpen(true);
  };

  const openEditTag = (tag: GalleryTag) => {
    setEditingTag(tag);
    setTagForm({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
      sort_order: tag.sort_order,
      is_active: tag.is_active,
      tag_type: tag.tag_type || '',
    });
    setTagDialogOpen(true);
  };

  const handleImageSubmit = () => {
    if (!imageForm.title || !imageForm.image_url) {
      toast.error('Title and image are required');
      return;
    }
    if (editingImage) {
      updateImageMutation.mutate({ id: editingImage.id, data: imageForm });
    } else {
      createImageMutation.mutate(imageForm);
    }
  };

  const handleTagSubmit = () => {
    if (!tagForm.name || !tagForm.slug) {
      toast.error('Name and slug are required');
      return;
    }
    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, data: tagForm });
    } else {
      createTagMutation.mutate(tagForm);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const getImageTags = (imageId: string) => {
    const tagIds = imageTagRelations.filter(r => r.image_id === imageId).map(r => r.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  };

  const getImageCountForTag = (tagId: string) => {
    return imageTagRelations.filter(r => r.tag_id === tagId).length;
  };

  const toggleTagSelection = (tagId: string) => {
    setImageForm(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  };

  return (
    <AdminLayout title="Gallery Management">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="images" className="gap-2">
                <ImageIcon className="w-4 h-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </TabsTrigger>
              <TabsTrigger value="workedge" className="gap-2">
                <Camera className="w-4 h-4" />
                WorkEdge
              </TabsTrigger>
              <TabsTrigger value="equipment" className="gap-2">
                <Wrench className="w-4 h-4" />
                Equipment
              </TabsTrigger>
            </TabsList>

            {activeTab === 'images' && (
              <div className="flex gap-2">
              {isReorderMode ? (
                <>
                  <Button variant="outline" onClick={cancelReorderMode} disabled={reorderMutation.isPending}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={saveReorder} disabled={reorderMutation.isPending}>
                    {reorderMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save Order
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={enterReorderMode} disabled={images.length < 2}>
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Reorder
                  </Button>
                  <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Upload
                  </Button>
              <Dialog open={imageDialogOpen} onOpenChange={(open) => {
                setImageDialogOpen(open);
                if (!open) resetImageForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Media
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingImage ? 'Edit Media' : 'Add New Media'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Media</Label>
                    <MediaUpload
                      bucketName="gallery-images"
                      currentUrl={imageForm.image_url}
                      currentMediaType={imageForm.media_type}
                      currentThumbnailUrl={imageForm.thumbnail_url}
                      onUpload={(url, mediaType, thumbnailUrl, exifData, locationMatch) => {
                        setImageForm(prev => {
                          const updates: any = { 
                            image_url: url, 
                            media_type: mediaType,
                            thumbnail_url: thumbnailUrl || null,
                          };
                          // Auto-fill photo date from EXIF
                          if (exifData?.dateTaken && !prev.photo_date) {
                            updates.photo_date = exifData.dateTaken;
                          }
                          // Auto-select matching zip and city tags
                          if (locationMatch) {
                            const newTags = [...prev.selectedTags];
                            if (locationMatch.zipCode) {
                              const zipTag = tags.find(t => t.tag_type === 'zip' && t.name === locationMatch.zipCode);
                              if (zipTag && !newTags.includes(zipTag.id)) newTags.push(zipTag.id);
                            }
                            if (locationMatch.city) {
                              const cityTag = tags.find(t => t.tag_type === 'city' && t.name.toLowerCase() === locationMatch.city!.toLowerCase());
                              if (cityTag && !newTags.includes(cityTag.id)) newTags.push(cityTag.id);
                            }
                            if (newTags.length > prev.selectedTags.length) {
                              updates.selectedTags = newTags;
                              toast.info(`Auto-tagged: ${[locationMatch.city, locationMatch.zipCode].filter(Boolean).join(', ')}`);
                            }
                          }
                          return { ...prev, ...updates };
                        });
                      }}
                      onRemove={() => setImageForm(prev => ({ ...prev, image_url: '', thumbnail_url: null, media_type: 'image' }))}
                      acceptedTypes="all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={imageForm.title}
                      onChange={(e) => setImageForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Ductless Installation - McKinney Home"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description</Label>
                      {imageForm.image_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={aiDescribing}
                          onClick={async () => {
                            setAiDescribing(true);
                            try {
                              const { data, error } = await supabase.functions.invoke('gallery-ai-describe', {
                                body: { imageUrl: imageForm.image_url },
                              });
                              if (error) throw error;
                              if (data?.description) {
                                setImageForm(prev => ({
                                  ...prev,
                                  description: data.description,
                                  alt_text: data.alt_text || prev.alt_text,
                                }));
                                toast.success('AI suggestion applied');
                              }
                            } catch (e: any) {
                              toast.error('AI describe failed: ' + (e?.message || 'Unknown error'));
                            } finally {
                              setAiDescribing(false);
                            }
                          }}
                        >
                          {aiDescribing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          AI Suggest
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="description"
                      value={imageForm.description}
                      onChange={(e) => setImageForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the project..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alt_text">Alt Text (for accessibility)</Label>
                    <Input
                      id="alt_text"
                      value={imageForm.alt_text}
                      onChange={(e) => setImageForm(prev => ({ ...prev, alt_text: e.target.value }))}
                      placeholder="Describe the image for screen readers"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    {['system', 'service', 'property', 'geography', 'zip', 'city'].map(type => {
                      const typeTags = tags.filter(t => t.is_active && t.tag_type === type);
                      if (typeTags.length === 0) return null;
                      return (
                        <div key={type} className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground capitalize">{type}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {typeTags.map(tag => (
                              <Badge
                                key={tag.id}
                                variant={imageForm.selectedTags.includes(tag.id) ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => toggleTagSelection(tag.id)}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {/* Uncategorized tags */}
                    {(() => {
                      const uncategorized = tags.filter(t => t.is_active && !t.tag_type);
                      if (uncategorized.length === 0) return null;
                      return (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Other</p>
                          <div className="flex flex-wrap gap-1.5">
                            {uncategorized.map(tag => (
                              <Badge
                                key={tag.id}
                                variant={imageForm.selectedTags.includes(tag.id) ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => toggleTagSelection(tag.id)}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {tags.filter(t => t.is_active).length === 0 && (
                      <p className="text-sm text-muted-foreground">No tags available. Create tags first.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo_date">Photo Date</Label>
                    <Input
                      id="photo_date"
                      type="date"
                      value={imageForm.photo_date}
                      onChange={(e) => setImageForm(prev => ({ ...prev, photo_date: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="approved_for_website"
                        checked={imageForm.approved_for_website}
                        onCheckedChange={(checked) => setImageForm(prev => ({ ...prev, approved_for_website: checked }))}
                      />
                      <Label htmlFor="approved_for_website">Approved for Location Pages</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_featured"
                        checked={imageForm.is_featured}
                        onCheckedChange={(checked) => setImageForm(prev => ({ ...prev, is_featured: checked }))}
                      />
                      <Label htmlFor="is_featured" className="flex flex-col gap-0.5">
                        <span>Featured (show on home page)</span>
                        <span className="text-xs font-normal text-muted-foreground">Featured photos rotate daily — 8 shown per day.</span>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_active"
                        checked={imageForm.is_active}
                        onCheckedChange={(checked) => setImageForm(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImageDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImageSubmit}
                    disabled={createImageMutation.isPending || updateImageMutation.isPending}
                  >
                    {(createImageMutation.isPending || updateImageMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingImage ? 'Save Changes' : 'Add Media'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <BulkImageUpload
              open={bulkUploadOpen}
              onOpenChange={setBulkUploadOpen}
              tags={tags}
              onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ['gallery-images-admin'] });
                queryClient.invalidateQueries({ queryKey: ['gallery-image-tags-admin'] });
              }}
            />
                </>
              )}
              </div>
            )}

            {activeTab === 'tags' && (
            <Dialog open={tagDialogOpen} onOpenChange={(open) => {
              setTagDialogOpen(open);
              if (!open) resetTagForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTag ? 'Edit Tag' : 'Add New Tag'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="tag_name">Name *</Label>
                    <Input
                      id="tag_name"
                      value={tagForm.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setTagForm(prev => ({ 
                          ...prev, 
                          name,
                          slug: editingTag ? prev.slug : generateSlug(name),
                        }));
                      }}
                      placeholder="e.g., Ductless"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag_slug">Slug *</Label>
                    <Input
                      id="tag_slug"
                      value={tagForm.slug}
                      onChange={(e) => setTagForm(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="e.g., ductless"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag_description">Description</Label>
                    <Textarea
                      id="tag_description"
                      value={tagForm.description}
                      onChange={(e) => setTagForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this tag..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag_sort_order">Sort Order</Label>
                    <Input
                      id="tag_sort_order"
                      type="number"
                      value={tagForm.sort_order}
                      onChange={(e) => setTagForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tag_type">Tag Type</Label>
                    <select
                      id="tag_type"
                      value={tagForm.tag_type}
                      onChange={(e) => setTagForm(prev => ({ ...prev, tag_type: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">— None —</option>
                      <option value="geography">Geography</option>
                      <option value="zip">ZIP Code</option>
                      <option value="city">City</option>
                      <option value="service">Service</option>
                      <option value="system">System/Brand</option>
                      <option value="property">Property Type</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tag_is_active"
                      checked={tagForm.is_active}
                      onCheckedChange={(checked) => setTagForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="tag_is_active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleTagSubmit}
                    disabled={createTagMutation.isPending || updateTagMutation.isPending}
                  >
                    {(createTagMutation.isPending || updateTagMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingTag ? 'Save Changes' : 'Add Tag'}
                  </Button>
                </DialogFooter>
              </DialogContent>
              </Dialog>
            )}
          </div>
          
          {/* Media Filter, Count and Thumbnail Size Toggle */}
          {activeTab === 'images' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-4">
                {/* Media type filter */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant={mediaFilter === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setMediaFilter('all')}
                  >
                    All
                  </Badge>
                  <Badge
                    variant={mediaFilter === 'image' ? 'default' : 'outline'}
                    className="cursor-pointer gap-1"
                    onClick={() => setMediaFilter('image')}
                  >
                    <ImageIcon className="w-3 h-3" />
                    Photos
                  </Badge>
                  <Badge
                    variant={mediaFilter === 'video' ? 'default' : 'outline'}
                    className="cursor-pointer gap-1"
                    onClick={() => setMediaFilter('video')}
                  >
                    <Video className="w-3 h-3" />
                    Videos
                  </Badge>
                </div>
                
                {/* Counts */}
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{mediaCounts.images}</span> Photos, 
                  <span className="font-medium text-foreground ml-1">{mediaCounts.videos}</span> Videos
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <ToggleGroup 
                  type="single" 
                  value={thumbnailSize} 
                  onValueChange={(value) => value && setThumbnailSize(value as ThumbnailSize)}
                  className="border rounded-md"
                >
                  <ToggleGroupItem value="small" aria-label="Small thumbnails" className="px-3">
                    <Grid3X3 className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="medium" aria-label="Medium thumbnails" className="px-3">
                    <Grid2X2 className="w-4 h-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="large" aria-label="Large thumbnails" className="px-3">
                    <LayoutGrid className="w-4 h-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="images">
          {imagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Media Yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first gallery image or video to showcase your work.</p>
                <Button onClick={() => setImageDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Media
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {isReorderMode && (
                <div className="mb-4 p-3 bg-muted rounded-lg border flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Drag and drop items to reorder. Click "Save Order" when done.
                  </span>
                </div>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayImages.map(img => img.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className={`grid gap-4 ${
                    thumbnailSize === 'small' 
                      ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' 
                      : thumbnailSize === 'large' 
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                        : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  }`}>
                    {displayImages.map((image) => (
                      <SortableGalleryItem
                        key={image.id}
                        image={image}
                        tags={getImageTags(image.id)}
                        onEdit={openEditImage}
                        onDelete={(id) => deleteImageMutation.mutate(id)}
                        isReorderMode={isReorderMode}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {/* Infinite scroll trigger - only when not in reorder mode */}
              {!isReorderMode && (
                <div ref={loadMoreRef} className="h-16 flex items-center justify-center mt-6">
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading more...</span>
                    </div>
                  )}
                  {!hasNextPage && images.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Showing all {images.length.toLocaleString()} items
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="tags">
          {tagsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tags Yet</h3>
                <p className="text-muted-foreground mb-4">Create tags to organize your gallery media.</p>
                <Button onClick={() => setTagDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tag
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-center">Images</TableHead>
                    <TableHead className="text-center">Order</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        {tag.tag_type ? (
                          <Badge variant="outline" className="text-xs capitalize">{tag.tag_type}</Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                      <TableCell className="text-center">{getImageCountForTag(tag.id)}</TableCell>
                      <TableCell className="text-center">{tag.sort_order}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={tag.is_active ? 'default' : 'secondary'}>
                          {tag.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEditTag(tag)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this tag?')) {
                                deleteTagMutation.mutate(tag.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workedge">
          <WorkEdgeMediaBrowser />
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentClassificationBrowser />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminGallery;