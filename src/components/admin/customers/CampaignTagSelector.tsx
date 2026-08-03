import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignTag {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

interface CampaignTagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function CampaignTagSelector({ value, onChange }: CampaignTagSelectorProps) {
  const { data: availableTags, isLoading } = useQuery({
    queryKey: ['crm_campaign_tags_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_campaign_tags')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as CampaignTag[];
    },
  });

  const selectedTags = availableTags?.filter((tag) => value.includes(tag.name)) || [];

  const handleSelect = (tagName: string) => {
    if (value.includes(tagName)) {
      onChange(value.filter((t) => t !== tagName));
    } else {
      onChange([...value, tagName]);
    }
  };

  const handleRemove = (tagName: string) => {
    onChange(value.filter((t) => t !== tagName));
  };

  return (
    <div className="space-y-2">
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              style={{
                backgroundColor: tag.color + '20',
                color: tag.color,
                borderColor: tag.color,
              }}
              variant="outline"
              className="pr-1"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemove(tag.name)}
                className="ml-1 rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Tag Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Loading...' : 'No tags found'}
              </CommandEmpty>
              <CommandGroup>
                {availableTags?.map((tag) => {
                  const isSelected = value.includes(tag.name);
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleSelect(tag.name)}
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted opacity-50'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <Badge
                        style={{
                          backgroundColor: tag.color + '20',
                          color: tag.color,
                          borderColor: tag.color,
                        }}
                        variant="outline"
                        className="text-xs"
                      >
                        {tag.name}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
