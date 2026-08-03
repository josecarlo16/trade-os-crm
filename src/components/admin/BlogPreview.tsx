import { format } from 'date-fns';
import { Calendar, Tag, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BlogPreviewProps {
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  featuredImageAlt?: string;
  category: string;
  tags: string[];
  publishedAt?: string;
  authorName?: string;
  authorBio?: string;
}

const BlogPreview = ({
  title,
  excerpt,
  content,
  featuredImage,
  featuredImageAlt,
  category,
  tags,
  publishedAt,
  authorName,
  authorBio,
}: BlogPreviewProps) => {
  return (
    <div className="bg-background rounded-lg shadow-sm overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto border">
      {/* Simulated Blog Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
        <h1 className="text-2xl font-bold mb-3 leading-tight">
          {title || 'Untitled Post'}
        </h1>
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/80">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {publishedAt
                ? format(new Date(publishedAt), 'MMMM d, yyyy')
                : format(new Date(), 'MMMM d, yyyy')}
            </span>
          </div>
          
          {authorName && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{authorName}</span>
            </div>
          )}
          
          {category && (
            <Badge variant="secondary" className="bg-white/20 text-primary-foreground hover:bg-white/30">
              {category}
            </Badge>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-primary-foreground/80 border-primary-foreground/30 text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Featured Image */}
      {featuredImage && (
        <div className="mx-4 -mt-4 relative z-10">
          <img
            src={featuredImage}
            alt={featuredImageAlt || title || 'Featured image'}
            className="w-full aspect-video object-cover rounded-lg shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content Preview */}
      <div className="p-6">
        {excerpt && (
          <p className="text-lg text-muted-foreground mb-6 italic">
            {excerpt}
          </p>
        )}

        {content ? (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <p className="text-muted-foreground italic">
            Start writing content to see the preview...
          </p>
        )}
      </div>

      {/* Author Bio Section */}
      {authorName && authorBio && (
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border-t">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{authorName}</p>
              <p className="text-muted-foreground text-sm mt-0.5">{authorBio}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPreview;
