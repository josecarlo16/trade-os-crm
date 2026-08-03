import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type MediaType = 'image' | 'video';

interface MediaLightboxProps {
  src: string;
  alt: string;
  mediaType?: MediaType;
  thumbnailUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MediaLightbox = ({ 
  src, 
  alt, 
  mediaType = 'image',
  open, 
  onOpenChange 
}: MediaLightboxProps) => {
  const isVideo = mediaType === 'video';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
        <div className="relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute -top-12 right-0 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background z-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          
          {isVideo ? (
            <video
              src={src}
              controls
              autoPlay
              className="w-full max-h-[80vh] rounded-lg bg-black"
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={src}
              alt={alt}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
          
          <p className="text-center text-sm text-white/80 mt-3 drop-shadow-lg">{alt}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Re-export for backward compatibility
export { MediaLightbox as ImageLightbox };
