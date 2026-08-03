import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ImageIcon, Video, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";
import { extractExifData, matchGpsToLocation, type ExifData, type MatchedLocationTags } from "@/utils/exifExtractor";
import { generateVideoThumbnail, createThumbnailFile } from "@/utils/videoThumbnail";

export type MediaType = 'image' | 'video';

interface MediaUploadProps {
  bucketName: string;
  currentUrl: string | null;
  currentMediaType?: MediaType;
  currentThumbnailUrl?: string | null;
  onUpload: (url: string, mediaType: MediaType, thumbnailUrl?: string, exifData?: ExifData, locationMatch?: MatchedLocationTags) => void;
  onRemove: () => void;
  folder?: string;
  className?: string;
  acceptedTypes?: 'all' | 'image' | 'video';
  maxSizeMB?: number;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export const MediaUpload = ({
  bucketName,
  currentUrl,
  currentMediaType = 'image',
  currentThumbnailUrl,
  onUpload,
  onRemove,
  folder = "",
  className,
  acceptedTypes = 'all',
  maxSizeMB = 100,
}: MediaUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptString = () => {
    if (acceptedTypes === 'image') return IMAGE_TYPES.join(',');
    if (acceptedTypes === 'video') return VIDEO_TYPES.join(',');
    return [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');
  };

  const detectMediaType = (file: File): MediaType => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast.error("Please select an image or video file");
      return;
    }

    if (acceptedTypes === 'image' && !isImage) {
      toast.error("Please select an image file");
      return;
    }

    if (acceptedTypes === 'video' && !isVideo) {
      toast.error("Please select a video file");
      return;
    }

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File must be under ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadStatus('');

    try {
      let fileToUpload: File = file;
      const mediaType = detectMediaType(file);
      let thumbnailUrl: string | undefined;
      let exifData: ExifData | undefined;
      let locationMatch: MatchedLocationTags | undefined;

      // Extract EXIF before compression (compression strips it)
      if (isImage) {
        setUploadStatus('Reading photo metadata...');
        exifData = await extractExifData(file);
        if (exifData.latitude != null && exifData.longitude != null) {
          locationMatch = matchGpsToLocation(exifData.latitude, exifData.longitude);
        }
      }

      // Compress images only
      if (isImage) {
        setUploadStatus('Compressing image...');
        fileToUpload = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
      }

      // Generate thumbnail for videos
      if (isVideo) {
        setUploadStatus('Generating thumbnail...');
        try {
          const thumbnailResult = await generateVideoThumbnail(file, 0.1, 640, 0.8);
          const thumbnailFile = createThumbnailFile(thumbnailResult.blob, file.name);
          
          // Upload thumbnail
          const thumbTimestamp = Date.now();
          const thumbFileName = folder 
            ? `${folder}/thumbnails/${thumbTimestamp}_thumb.jpg`
            : `thumbnails/${thumbTimestamp}_thumb.jpg`;

          const { error: thumbUploadError } = await supabase.storage
            .from(bucketName)
            .upload(thumbFileName, thumbnailFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (!thumbUploadError) {
            const { data: thumbUrlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(thumbFileName);
            thumbnailUrl = thumbUrlData.publicUrl;
          } else {
            console.warn("Failed to upload thumbnail:", thumbUploadError);
          }
        } catch (thumbError) {
          console.warn("Failed to generate thumbnail:", thumbError);
          // Continue without thumbnail - it's not critical
        }
      }

      setUploadStatus('Uploading file...');

      // Generate unique filename
      const timestamp = Date.now();
      const ext = fileToUpload.name.split(".").pop() || (isVideo ? 'mp4' : 'jpg');
      const fileName = folder 
        ? `${folder}/${timestamp}.${ext}` 
        : `${timestamp}.${ext}`;

      // Delete old file if exists
      if (currentUrl) {
        const oldPath = extractPathFromUrl(currentUrl, bucketName);
        if (oldPath) {
          await supabase.storage.from(bucketName).remove([oldPath]);
        }
      }

      // Delete old thumbnail if exists
      if (currentThumbnailUrl) {
        const oldThumbPath = extractPathFromUrl(currentThumbnailUrl, bucketName);
        if (oldThumbPath) {
          await supabase.storage.from(bucketName).remove([oldThumbPath]);
        }
      }

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      onUpload(urlData.publicUrl, mediaType, thumbnailUrl, exifData, locationMatch);
      
      // Show success message
      if (isImage && fileToUpload.size < file.size) {
        const savedKB = Math.round((file.size - fileToUpload.size) / 1024);
        toast.success(`Image uploaded (saved ${savedKB}KB)`);
      } else if (isVideo && thumbnailUrl) {
        toast.success('Video uploaded with auto-generated thumbnail');
      } else {
        toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    try {
      const path = extractPathFromUrl(currentUrl, bucketName);
      if (path) {
        await supabase.storage.from(bucketName).remove([path]);
      }
      onRemove();
      toast.success("File removed");
    } catch (error: any) {
      console.error("Remove error:", error);
      toast.error(error?.message || "Failed to remove file");
    }
  };

  const extractPathFromUrl = (url: string, bucket: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
      return pathParts[1] || null;
    } catch {
      return null;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const isCurrentVideo = currentMediaType === 'video';

  return (
    <div className={cn("space-y-3", className)}>
      {currentUrl ? (
        <div className="relative group">
          {isCurrentVideo ? (
            <div className="relative w-full h-40 rounded-lg border bg-muted overflow-hidden">
              <video
                src={currentUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary ml-1" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={currentUrl}
              alt="Uploaded media"
              className="w-full h-40 object-cover rounded-lg border"
            />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            isUploading && "pointer-events-none opacity-50"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadStatus || 'Uploading...'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {acceptedTypes !== 'video' && <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                {acceptedTypes !== 'image' && <Video className="h-6 w-6 text-muted-foreground" />}
              </div>
              <p className="text-sm text-muted-foreground">
                Click or drag {acceptedTypes === 'all' ? 'media' : acceptedTypes} to upload
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedTypes === 'video' 
                  ? `MP4, WebM, or QuickTime (max ${maxSizeMB}MB)`
                  : acceptedTypes === 'image'
                    ? 'JPEG, PNG, WebP, or GIF (max 10MB, auto-optimized)'
                    : `Images & Videos (max ${maxSizeMB}MB)`
                }
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptString()}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};
