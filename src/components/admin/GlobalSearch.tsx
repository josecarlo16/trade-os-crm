import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RECENT_KEY = 'truficient_recent_searches';

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter(q => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
}

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [showRecents, setShowRecents] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recentSearches = getRecentSearches();

  const handleSearch = () => {
    if (query.trim().length < 2) return;
    addRecentSearch(query.trim());
    navigate(`/admin/search?q=${encodeURIComponent(query.trim())}`);
    setQuery('');
    setShowRecents(false);
  };

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowRecents(true);
      }
      if (e.key === 'Escape') {
        setShowRecents(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRecents(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      {/* Desktop */}
      <div ref={containerRef} className="relative hidden md:block">
        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 w-[320px]">
          <Search
            className="h-4 w-4 text-muted-foreground cursor-pointer flex-shrink-0"
            onClick={handleSearch}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowRecents(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Search customers, jobs, locations..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground cursor-pointer"
              onClick={() => setQuery('')}
            />
          )}
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            ⌘K
          </kbd>
        </div>

        {showRecents && !query && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-[320px] rounded-lg border bg-popover shadow-lg z-50 py-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Recent Searches
            </div>
            {recentSearches.map((q) => (
              <button
                key={q}
                onClick={() => {
                  addRecentSearch(q);
                  navigate(`/admin/search?q=${encodeURIComponent(q)}`);
                  setShowRecents(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile */}
      <button
        className="md:hidden flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background"
        onClick={() => {
          navigate('/admin/search');
        }}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>
    </>
  );
};
