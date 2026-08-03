import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, User, MapPin, Wrench, FileText, Calendar, MessageSquare, Kanban, ScanLine, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SearchResultGroup } from '@/components/admin/search/SearchResultGroup';
import type { SearchResultCardProps } from '@/components/admin/search/SearchResultCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  route: string;
  entity_type: string;
  badge?: string;
  badge_color?: string;
  snippet?: string;
}

interface GlobalSearchResponse {
  results: Record<string, SearchResult[]>;
  total_count: number;
  query: string;
}

const SECTION_CONFIG = [
  { key: 'customers', label: 'Customers', icon: User },
  { key: 'locations', label: 'Locations', icon: MapPin },
  { key: 'jobs', label: 'Jobs', icon: Wrench },
  { key: 'pipeline', label: 'Pipeline', icon: Kanban },
  { key: 'interactions', label: 'Interactions', icon: MessageSquare },
  { key: 'estimates', label: 'Estimates', icon: FileText },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'contacts', label: 'Contact Submissions', icon: Mail },
  { key: 'scans', label: 'Equipment Scans', icon: ScanLine },
] as const;

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(query);
    if (query.length < 2) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    supabase.functions.invoke('global-search', { body: { query } })
      .then(({ data, error }) => {
        if (!error && data) setResults(data);
        setIsLoading(false);
      });
  }, [query]);

  const handleRefineSearch = () => {
    if (inputValue.trim().length < 2) return;
    setSearchParams({ q: inputValue.trim() });
  };

  const scrollToSection = (key: string) => {
    document.getElementById(`search-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionToCards = (key: string, icon: any): SearchResultCardProps[] => {
    const items = results?.results?.[key] || [];
    return items.map((r) => ({
      icon,
      label: r.label,
      sublabel: r.sublabel,
      badge: r.badge,
      badgeColor: r.badge_color,
      snippet: r.snippet,
      route: r.route,
    }));
  };

  const totalCount = results?.total_count || 0;
  const categoriesWithResults = SECTION_CONFIG.filter(
    s => (results?.results?.[s.key]?.length || 0) > 0
  );

  return (
    <AdminLayout title="Search Results">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search input */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2.5">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRefineSearch(); }}
              placeholder="Search customers, jobs, locations, estimates..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <Button onClick={handleRefineSearch} size="default">
            Search
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2].map(s => (
              <div key={s} className="space-y-3">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Query too short */}
        {!isLoading && query.length > 0 && query.length < 2 && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Type at least 2 characters to search</p>
          </div>
        )}

        {/* No query */}
        {!isLoading && !query && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Enter a search term to find customers, jobs, locations, and more</p>
          </div>
        )}

        {/* No results */}
        {!isLoading && results && totalCount === 0 && (
          <div className="text-center py-16">
            <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              No results for "<span className="font-medium text-foreground">{query}</span>"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a shorter term, a different spelling, or search by phone or email.
            </p>
          </div>
        )}

        {/* Results */}
        {!isLoading && results && totalCount > 0 && (
          <>
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{totalCount}</span> results
                {categoriesWithResults.length > 0 && ` across ${categoriesWithResults.length} categories`}
                {' '}for "<span className="font-medium text-foreground">{query}</span>"
              </span>
              <div className="flex-1" />
              <div className="flex flex-wrap gap-1.5">
                {categoriesWithResults.map(s => (
                  <button
                    key={s.key}
                    onClick={() => scrollToSection(s.label.toLowerCase().replace(/\s+/g, '-'))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-background hover:bg-accent transition-colors"
                  >
                    <s.icon className="h-3 w-3" />
                    {s.label} ({results.results[s.key]?.length || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Result groups */}
            <div className="space-y-1">
              {SECTION_CONFIG.map(s => (
                <SearchResultGroup
                  key={s.key}
                  title={s.label}
                  count={results.results[s.key]?.length || 0}
                  icon={s.icon}
                  results={sectionToCards(s.key, s.icon)}
                  query={query}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
