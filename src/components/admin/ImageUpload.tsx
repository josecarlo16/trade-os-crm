import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/utils/imageCompression";

interface ImageUploadProps {
  bucketName: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder?: string;
  className?: string;
}

export const ImageUpload = ({
  bucketName,
  currentUrl,
  onUpload,
  onRemove,
  folder = "",
  className,
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      // Generate unique filename
      const timestamp = Date.now();
      const ext = compressedFile.name.split(".").pop() || "jpg";
      const fileName = folder 
        ? `${folder}/${timestamp}.${ext}` 
        : `${timestamp}.${ext}`;

      // Delete old image if exists
      if (currentUrl) {
        const oldPath = extractPathFromUrl(currentUrl, bucketName);
        if (oldPath) {
          await supabase.storage.from(bucketName).remove([oldPath]);
        }
      }

      // Upload compressed image
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      onUpload(urlData.publicUrl);
      
      // Show compression savings if applicable
      if (compressedFile.size < file.size) {
        const savedKB = Math.round((file.size - compressedFile.size) / 1024);
        toast.success(`Image uploaded (saved ${savedKB}KB)`);
      } else {
        toast.success("Image uploaded successfully");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
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
      toast.success("Image removed");
    } catch (error: any) {
      console.error("Remove error:", error);
      toast.error(error?.message || "Failed to remove image");
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

  return (
    <div className={cn("space-y-3", className)}>
      {currentUrl ? (
        <div className="relative group">
          <img
            src={currentUrl}
            alt="Uploaded image"
            className="w-full h-40 object-cover rounded-lg border"
          />
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
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click or drag an image to upload
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF (max 10MB, auto-optimized)
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
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
