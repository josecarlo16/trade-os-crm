import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Pencil, Trash2, Star, Video, Play } from 'lucide-react';
import { MediaType } from '@/components/admin/MediaUpload';

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

interface GalleryTag {
  id: string;
  name: string;
}

interface SortableGalleryItemProps {
  image: GalleryImage;
  tags: GalleryTag[];
  onEdit: (image: GalleryImage) => void;
  onDelete: (id: string) => void;
  isReorderMode: boolean;
}

export const SortableGalleryItem = ({
  image,
  tags,
  onEdit,
  onDelete,
  isReorderMode,
}: SortableGalleryItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const isVideo = image.media_type === 'video';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden group ${isDragging ? 'shadow-xl ring-2 ring-primary' : ''} ${isReorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="aspect-square relative">
        {/* Drag handle overlay when in reorder mode */}
        {isReorderMode && (
          <div
            {...attributes}
            {...listeners}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <div className="bg-background/90 rounded-lg p-3 shadow-lg">
              <GripVertical className="w-8 h-8 text-foreground" />
              <span className="text-xs font-medium text-foreground">Drag to reorder</span>
            </div>
          </div>
        )}

        {isVideo ? (
          <>
            {image.thumbnail_url ? (
              <img
                src={image.thumbnail_url}
                alt={image.alt_text || image.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={image.image_url}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          </>
        ) : (
          <img
            src={image.image_url}
            alt={image.alt_text || image.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        )}

        {image.is_featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-secondary text-secondary-foreground">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        {!image.is_active && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary">Hidden</Badge>
          </div>
        )}

        {isVideo && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="gap-1">
              <Video className="w-3 h-3" />
              Video
            </Badge>
          </div>
        )}

        {/* Edit/Delete buttons - only show when NOT in reorder mode */}
        {!isReorderMode && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onEdit(image)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this?')) {
                  onDelete(image.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h4 className="font-medium text-sm truncate">{image.title}</h4>
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-xs">
              {tag.name}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
