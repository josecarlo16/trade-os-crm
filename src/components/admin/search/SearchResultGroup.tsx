import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SearchResultCard, type SearchResultCardProps } from './SearchResultCard';
import type { LucideIcon } from 'lucide-react';

interface SearchResultGroupProps {
  title: string;
  count: number;
  icon: LucideIcon;
  results: SearchResultCardProps[];
  defaultExpanded?: boolean;
  query: string;
}

export function SearchResultGroup({
  title,
  count,
  icon: Icon,
  results,
  defaultExpanded = true,
  query,
}: SearchResultGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div id={`search-section-${title.toLowerCase()}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full py-3 text-left group"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          {count}
        </Badge>
        <div className="flex-1 border-t border-border ml-2" />
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="space-y-2 pb-4">
          {results.map((r, i) => (
            <SearchResultCard key={i} {...r} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}
