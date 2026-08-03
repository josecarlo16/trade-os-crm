import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalendarSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CalendarSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select calendar",
  disabled = false
}: CalendarSelectorProps) {
  const { data: calendars, isLoading } = useQuery({
    queryKey: ["google-calendars-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendars")
        .select("*")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {calendars?.map(cal => (
          <SelectItem key={cal.id} value={cal.id}>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: cal.color }}
              />
              <span>{cal.name}</span>
              {cal.is_primary && (
                <span className="text-xs text-muted-foreground">(Primary)</span>
              )}
            </div>
          </SelectItem>
        ))}
        {!calendars?.length && !isLoading && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No calendars synced
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
