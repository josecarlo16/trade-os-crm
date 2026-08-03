import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageLightbox = ({ src, alt, open, onOpenChange }: ImageLightboxProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-transparent border-none shadow-none">
        <div className="relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute -top-12 right-0 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={src}
            alt={alt}
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
          />
          <p className="text-center text-sm text-white/80 mt-3 drop-shadow-lg">{alt}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
