import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon, Check, Star, Video, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";
import { generateVideoThumbnail, createThumbnailFile } from "@/utils/videoThumbnail";
import { extractExifData, matchGpsToLocation, type ExifData, type MatchedLocationTags } from "@/utils/exifExtractor";

interface GalleryTag {
  id: string;
  name: string;
  is_active: boolean;
  tag_type?: string;
}

type MediaType = 'image' | 'video';

interface UploadedMedia {
  id: string;
  file: File;
  url: string;
  thumbnailUrl?: string;
  title: string;
  selectedTags: string[];
  is_featured: boolean;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  error?: string;
  mediaType: MediaType;
  photoDate?: string;
  exifLocation?: MatchedLocationTags;
}

interface BulkImageUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: GalleryTag[];
  onComplete: () => void;
}

export const BulkImageUpload = ({
  open,
  onOpenChange,
  tags,
  onComplete,
}: BulkImageUploadProps) => {
  const [phase, setPhase] = useState<'upload' | 'review'>('upload');
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyToAllTags, setApplyToAllTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

  const generateTitle = (filename: string) => {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
      .replace(/\d+$/, '') // Remove trailing numbers
      .trim();
  };

  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(file => {
      const isImage = IMAGE_TYPES.includes(file.type);
      const isVideo = VIDEO_TYPES.includes(file.type);
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }
      
      if (isImage && file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name} is larger than 10MB`);
        return false;
      }
      
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        toast.error(`${file.name} is larger than 100MB`);
        return false;
      }
      
      return true;
    });

    if (fileArray.length === 0) return;

    setIsProcessing(true);
    
    const imageFiles = fileArray.filter(f => IMAGE_TYPES.includes(f.type));
    const videoFiles = fileArray.filter(f => VIDEO_TYPES.includes(f.type));
    
    if (imageFiles.length > 0) {
      toast.info(`Optimizing ${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''}...`);
    }
    if (videoFiles.length > 0) {
      toast.info(`Processing ${videoFiles.length} video${videoFiles.length > 1 ? 's' : ''}...`);
    }
    
    // Process images - compress them
    const processedImages: UploadedMedia[] = await Promise.all(
      imageFiles.map(async (file) => {
        // Extract EXIF before compression strips it
        const exifData = await extractExifData(file);
        const locationMatch = (exifData.latitude != null && exifData.longitude != null)
          ? matchGpsToLocation(exifData.latitude, exifData.longitude)
          : undefined;
        
        const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.85 });
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file: compressed,
          url: URL.createObjectURL(compressed),
          title: generateTitle(file.name),
          selectedTags: [],
          is_featured: false,
          status: 'pending' as const,
          mediaType: 'image' as MediaType,
          photoDate: exifData.dateTaken || undefined,
          exifLocation: locationMatch,
        };
      })
    );
    
    // Process videos - generate thumbnails
    const processedVideos: UploadedMedia[] = await Promise.all(
      videoFiles.map(async (file) => {
        let thumbnailUrl: string | undefined;
        try {
          const thumbnailResult = await generateVideoThumbnail(file, 0.1, 640, 0.8);
          thumbnailUrl = thumbnailResult.dataUrl;
        } catch (e) {
          console.warn('Failed to generate video thumbnail:', e);
        }
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          url: URL.createObjectURL(file),
          thumbnailUrl,
          title: generateTitle(file.name),
          selectedTags: [],
          is_featured: false,
          status: 'pending' as const,
          mediaType: 'video' as MediaType,
        };
      })
    );

    const newMedia = [...processedImages, ...processedVideos];
    setMedia(prev => [...prev, ...newMedia]);
    setIsProcessing(false);
    
    // Calculate total savings for images
    if (imageFiles.length > 0) {
      const originalSize = imageFiles.reduce((sum, f) => sum + f.size, 0);
      const compressedSize = processedImages.reduce((sum, m) => sum + m.file.size, 0);
      const savedMB = ((originalSize - compressedSize) / 1024 / 1024).toFixed(1);
      
      if (originalSize > compressedSize) {
        toast.success(`Images optimized! Saved ${savedMB}MB`);
      }
      const geoCount = processedImages.filter(m => m.exifLocation?.zipCode).length;
      if (geoCount > 0) {
        toast.info(`📍 GPS data found in ${geoCount} photo${geoCount > 1 ? 's' : ''} — location tags will be auto-applied`);
      }
    }
    
    if (videoFiles.length > 0) {
      toast.success(`${videoFiles.length} video${videoFiles.length > 1 ? 's' : ''} ready for upload`);
    }
  }, []);

  const uploadAllMedia = async () => {
    if (media.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: media.length });

    const updatedMedia = [...media];

    for (let i = 0; i < updatedMedia.length; i++) {
      const item = updatedMedia[i];
      if (item.status === 'uploaded') {
        setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
        continue;
      }

      updatedMedia[i] = { ...item, status: 'uploading' };
      setMedia([...updatedMedia]);

      try {
        const timestamp = Date.now();
        const ext = item.file.name.split('.').pop() || (item.mediaType === 'video' ? 'mp4' : 'jpg');
        const fileName = `${timestamp}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('gallery-images')
          .upload(fileName, item.file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gallery-images')
          .getPublicUrl(fileName);

        // Upload video thumbnail if present
        let uploadedThumbnailUrl: string | undefined;
        if (item.mediaType === 'video' && item.thumbnailUrl) {
          try {
            const thumbnailFile = createThumbnailFile(
              await (await fetch(item.thumbnailUrl)).blob(),
              item.file.name
            );
            const thumbFileName = `thumbnails/${timestamp}-${i}_thumb.jpg`;
            
            const { error: thumbError } = await supabase.storage
              .from('gallery-images')
              .upload(thumbFileName, thumbnailFile, {
                cacheControl: '3600',
                upsert: false,
              });

            if (!thumbError) {
              const { data: thumbUrlData } = supabase.storage
                .from('gallery-images')
                .getPublicUrl(thumbFileName);
              uploadedThumbnailUrl = thumbUrlData.publicUrl;
            }
          } catch (e) {
            console.warn('Failed to upload video thumbnail:', e);
          }
        }

        // Revoke the blob URL and update with real URL
        URL.revokeObjectURL(item.url);
        updatedMedia[i] = {
          ...updatedMedia[i],
          url: urlData.publicUrl,
          thumbnailUrl: uploadedThumbnailUrl || item.thumbnailUrl,
          status: 'uploaded',
        };
      } catch (error: any) {
        updatedMedia[i] = {
          ...updatedMedia[i],
          status: 'error',
          error: error.message,
        };
      }

      setMedia([...updatedMedia]);
      setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setIsUploading(false);
    
    const successCount = updatedMedia.filter(m => m.status === 'uploaded').length;
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
      setPhase('review');
    }
  };

  const saveAllMedia = async () => {
    const uploadedMedia = media.filter(m => m.status === 'uploaded');
    if (uploadedMedia.length === 0) {
      toast.error('No media to save');
      return;
    }

    setIsSaving(true);

    try {
      // Insert all gallery items
      const mediaRecords = uploadedMedia.map((item, index) => ({
        title: item.title || `${item.mediaType === 'video' ? 'Video' : 'Image'} ${index + 1}`,
        image_url: item.url,
        thumbnail_url: item.mediaType === 'video' ? item.thumbnailUrl : null,
        media_type: item.mediaType,
        is_featured: item.is_featured,
        is_active: true,
        sort_order: index,
        photo_date: item.photoDate || null,
      }));

      const { data: insertedMedia, error: insertError } = await supabase
        .from('gallery_images')
        .insert(mediaRecords)
        .select();

      if (insertError) throw insertError;

      // Insert tag relations
      const tagRelations: { image_id: string; tag_id: string }[] = [];
      
      insertedMedia?.forEach((dbItem, index) => {
        const originalItem = uploadedMedia[index];
        const tagsToApply = new Set([...originalItem.selectedTags, ...applyToAllTags]);
        
        // Auto-add EXIF location tags
        if (originalItem.exifLocation) {
          if (originalItem.exifLocation.zipCode) {
            const zipTag = tags.find(t => t.tag_type === 'zip' && t.name === originalItem.exifLocation!.zipCode);
            if (zipTag) tagsToApply.add(zipTag.id);
          }
          if (originalItem.exifLocation.city) {
            const cityTag = tags.find(t => t.tag_type === 'city' && t.name.toLowerCase() === originalItem.exifLocation!.city!.toLowerCase());
            if (cityTag) tagsToApply.add(cityTag.id);
          }
        }
        
        tagsToApply.forEach(tagId => {
          tagRelations.push({
            image_id: dbItem.id,
            tag_id: tagId,
          });
        });
      });

      if (tagRelations.length > 0) {
        const { error: tagError } = await supabase
          .from('gallery_image_tags')
          .insert(tagRelations);

        if (tagError) throw tagError;
      }

      toast.success(`${uploadedMedia.length} items saved to gallery`);
      handleClose();
      onComplete();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save media');
    } finally {
      setIsSaving(false);
    }
  };

  const removeMedia = (id: string) => {
    setMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item && item.status === 'pending') {
        URL.revokeObjectURL(item.url);
      }
      return prev.filter(m => m.id !== id);
    });
  };

  const updateMedia = (id: string, updates: Partial<UploadedMedia>) => {
    setMedia(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const toggleMediaTag = (mediaId: string, tagId: string) => {
    setMedia(prev => prev.map(m => {
      if (m.id !== mediaId) return m;
      const hasTag = m.selectedTags.includes(tagId);
      return {
        ...m,
        selectedTags: hasTag 
          ? m.selectedTags.filter(t => t !== tagId)
          : [...m.selectedTags, tagId],
      };
    }));
  };

  const toggleApplyToAllTag = (tagId: string) => {
    setApplyToAllTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const handleClose = () => {
    // Clean up blob URLs
    media.forEach(m => {
      if (m.status === 'pending') {
        URL.revokeObjectURL(m.url);
      }
    });
    setMedia([]);
    setPhase('upload');
    setUploadProgress({ current: 0, total: 0 });
    setApplyToAllTags([]);
    onOpenChange(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const activeTags = tags.filter(t => t.is_active);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {phase === 'upload' 
              ? 'Bulk Upload Media' 
              : `Review Media (${media.filter(m => m.status === 'uploaded').length} uploaded)`
            }
          </DialogTitle>
        </DialogHeader>

        {phase === 'upload' && (
          <div className="flex-1 space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                (isUploading || isProcessing) && "pointer-events-none opacity-50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                  <div>
                    <p className="text-lg font-medium">Processing files...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optimizing images and generating video thumbnails
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-2">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <Video className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">Drop images or videos here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Images: JPEG, PNG, WebP, GIF (max 10MB) • Videos: MP4, WebM (max 100MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Preview grid */}
            {media.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {media.length} file{media.length !== 1 ? 's' : ''} selected
                    {media.filter(m => m.mediaType === 'video').length > 0 && (
                      <span className="ml-1">
                        ({media.filter(m => m.mediaType === 'video').length} video{media.filter(m => m.mediaType === 'video').length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      media.forEach(m => {
                        if (m.status === 'pending') URL.revokeObjectURL(m.url);
                      });
                      setMedia([]);
                    }}
                  >
                    Clear all
                  </Button>
                </div>

                <ScrollArea className="h-[200px]">
                  <div className="grid grid-cols-6 gap-2">
                    {media.map((item) => (
                      <div key={item.id} className="relative group aspect-square">
                        {item.mediaType === 'video' ? (
                          <div className="w-full h-full relative">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                                <Video className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                                <Play className="h-4 w-4 text-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover rounded-md"
                          />
                        )}
                        {item.status === 'uploading' && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        )}
                        {item.status === 'uploaded' && (
                          <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center rounded-md">
                            <X className="h-5 w-5 text-destructive" />
                          </div>
                        )}
                        <button
                          className="absolute top-1 left-1 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeMedia(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Progress bar */}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress.current} of {uploadProgress.total}</span>
                    </div>
                    <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {phase === 'review' && (
          <div className="flex-1 space-y-4 overflow-hidden">
            {/* Apply to all tags */}
            {activeTags.length > 0 && (
              <div className="space-y-2 pb-3 border-b">
                <Label className="text-sm font-medium">Apply to all media:</Label>
                <div className="flex flex-wrap gap-2">
                  {activeTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={applyToAllTags.includes(tag.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleApplyToAllTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Media grid for review */}
            <ScrollArea className="flex-1 h-[400px]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pr-4">
                {media.filter(m => m.status === 'uploaded').map((item) => (
                  <div key={item.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="relative aspect-video">
                      {item.mediaType === 'video' ? (
                        <div className="relative w-full h-full">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                              <Play className="h-5 w-5 text-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      )}
                      <button
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
                        onClick={() => removeMedia(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {item.mediaType === 'video' && (
                        <Badge className="absolute bottom-1 left-1 text-xs" variant="secondary">
                          Video
                        </Badge>
                      )}
                    </div>
                    
                    <Input
                      value={item.title}
                      onChange={(e) => updateMedia(item.id, { title: e.target.value })}
                      placeholder={`${item.mediaType === 'video' ? 'Video' : 'Image'} title`}
                      className="h-8 text-sm"
                    />

                    <div className="flex flex-wrap gap-1">
                      {activeTags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant={
                            item.selectedTags.includes(tag.id) || applyToAllTags.includes(tag.id) 
                              ? 'default' 
                              : 'outline'
                          }
                          className={cn(
                            "cursor-pointer text-xs",
                            applyToAllTags.includes(tag.id) && "opacity-60"
                          )}
                          onClick={() => !applyToAllTags.includes(tag.id) && toggleMediaTag(item.id, tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        id={`featured-${item.id}`}
                        checked={item.is_featured}
                        onCheckedChange={(checked) => updateMedia(item.id, { is_featured: checked })}
                      />
                      <Label htmlFor={`featured-${item.id}`} className="text-xs flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Featured
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          {phase === 'upload' ? (
            <Button
              onClick={uploadAllMedia}
              disabled={media.length === 0 || isUploading || isProcessing || media.every(m => m.status === 'uploaded')}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : media.every(m => m.status === 'uploaded') ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  All Uploaded
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {media.filter(m => m.status === 'pending').length} Files
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={saveAllMedia}
              disabled={isSaving || media.filter(m => m.status === 'uploaded').length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save {media.filter(m => m.status === 'uploaded').length} Items to Gallery
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};