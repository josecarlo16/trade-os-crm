import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { X, Plus, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
}

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const TagSelector = ({ selectedTags, onChange }: TagSelectorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_tags' as any)
        .select('*')
        .order('name');

      if (error) throw error;
      setAvailableTags((data as unknown as Tag[]) || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  const handleRemove = (tagName: string) => {
    onChange(selectedTags.filter((t) => t !== tagName));
  };

  const handleCreateTag = async () => {
    const newTagName = searchValue.trim();
    if (!newTagName) return;

    // Check if tag already exists
    if (availableTags.some((t) => t.name.toLowerCase() === newTagName.toLowerCase())) {
      handleSelect(newTagName);
      setSearchValue('');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('blog_tags' as any)
        .insert({ name: newTagName })
        .select()
        .single();

      if (error) throw error;

      const newTag = data as unknown as Tag;
      setAvailableTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      onChange([...selectedTags, newTag.name]);
      setSearchValue('');
      
      toast({
        title: 'Tag created',
        description: `"${newTagName}" has been added.`,
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: 'Failed to create tag.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const showCreateOption =
    searchValue.trim() &&
    !availableTags.some((t) => t.name.toLowerCase() === searchValue.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedTags.length === 0
              ? 'Select tags...'
              : `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {showCreateOption ? (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={handleCreateTag}
                        disabled={creating}
                      >
                        {creating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create "{searchValue.trim()}"
                      </Button>
                    ) : (
                      'No tags found.'
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleSelect(tag.name)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedTags.includes(tag.name) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {showCreateOption && filteredTags.length > 0 && (
                    <CommandGroup heading="Create new">
                      <CommandItem onSelect={handleCreateTag}>
                        {creating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create "{searchValue.trim()}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
