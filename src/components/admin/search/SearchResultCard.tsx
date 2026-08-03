import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { LucideIcon } from 'lucide-react';

export interface SearchResultCardProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  meta?: string;
  badge?: string;
  badgeColor?: string;
  snippet?: string;
  route: string;
  query?: string;
}

function highlightMatch(text: string, query: string) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent text-accent-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchResultCard({
  icon: Icon,
  label,
  sublabel,
  meta,
  badge,
  snippet,
  route,
  query = '',
}: SearchResultCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(route)}
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
    >
      <div className="flex-shrink-0 p-2.5 rounded-full bg-primary text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">
          {highlightMatch(label, query)}
        </div>
        {sublabel && (
          <div className="text-sm text-muted-foreground truncate">
            {highlightMatch(sublabel, query)}
          </div>
        )}
        {snippet && (
          <div className="text-xs text-muted-foreground/70 italic mt-0.5 truncate">
            {highlightMatch(snippet, query)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {meta && <span className="text-xs text-muted-foreground hidden sm:block">{meta}</span>}
        {badge && (
          <Badge variant="outline" className="text-[10px]">
            {badge}
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
