import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, ExternalLink, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface WorkEdgeProjectSelectorProps {
  value: string;
  onChange: (value: string) => void;
  customerId?: string | null;
}

export function WorkEdgeProjectSelector({ value, onChange, customerId }: WorkEdgeProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: workedgeJobs = [] } = useQuery({
    queryKey: ['workedge_jobs_for_selector', customerId],
    queryFn: async () => {
      let query = supabase
        .from('crm_jobs')
        .select('id, job_number, title, workedge_project_id, customer:crm_customers(first_name, last_name, company_name)')
        .not('workedge_project_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return workedgeJobs;
    const lower = searchTerm.toLowerCase();
    return workedgeJobs.filter((j: any) => {
      const customerName = `${j.customer?.first_name || ''} ${j.customer?.last_name || ''}`.toLowerCase();
      const companyName = (j.customer?.company_name || '').toLowerCase();
      return (
        j.title.toLowerCase().includes(lower) ||
        j.job_number.toLowerCase().includes(lower) ||
        j.workedge_project_id.toLowerCase().includes(lower) ||
        customerName.includes(lower) ||
        companyName.includes(lower)
      );
    });
  }, [workedgeJobs, searchTerm]);

  const selectedJob = workedgeJobs.find((j: any) => j.workedge_project_id === value);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5" />
        WorkEdge Project
      </Label>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal h-10"
            >
              {selectedJob ? (
                <span className="truncate">
                  {selectedJob.job_number} - {selectedJob.title}
                </span>
              ) : value ? (
                <span className="truncate font-mono text-xs">{value}</span>
              ) : (
                <span className="text-muted-foreground">Search WorkEdge projects...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by job, customer, or project ID..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>No WorkEdge projects found</CommandEmpty>
                <CommandGroup>
                  {filteredJobs.map((job: any) => {
                    const customerLabel = [job.customer?.first_name, job.customer?.last_name].filter(Boolean).join(' ');
                    return (
                      <CommandItem
                        key={job.id}
                        value={job.id}
                        onSelect={() => {
                          onChange(job.workedge_project_id);
                          setOpen(false);
                          setSearchTerm('');
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === job.workedge_project_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium">{job.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {job.job_number} {customerLabel && `• ${customerLabel}`}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <a
                href={`https://workedge.pro/projects/${value}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
