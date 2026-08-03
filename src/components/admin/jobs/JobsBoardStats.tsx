import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Home, Building2, Wrench, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  job_type: {
    id: string;
    name: string;
    category: string;
    color: string;
    slug: string;
  };
  current_stage: {
    id: string;
    name: string;
    stage_type: string;
    color: string;
  } | null;
}

interface JobsBoardStatsProps {
  jobs: Job[];
}

export function JobsBoardStats({ jobs }: JobsBoardStatsProps) {
  const stats = useMemo(() => {
    const total = jobs.length;
    const residential = jobs.filter(j => j.job_type?.category === 'residential');
    const commercial = jobs.filter(j => j.job_type?.category === 'commercial');

    return {
      total,
      residential: {
        total: residential.length,
        service: residential.filter(j => j.job_type?.slug?.includes('service-call')).length,
        install: residential.filter(j => j.job_type?.slug?.includes('installation') || j.job_type?.slug?.includes('minisplit')).length,
      },
      commercial: {
        total: commercial.length,
        service: commercial.filter(j => j.job_type?.slug?.includes('service-call')).length,
        install: commercial.filter(j => j.job_type?.slug?.includes('installation')).length,
      },
    };
  }, [jobs]);

  return (
    <div className="space-y-3">
      {/* Row 1: All Open */}
      <Card className="border">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted text-foreground">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{stats.total}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">All Open Jobs</p>
          </div>
        </CardContent>
      </Card>

      {/* Row 2 & 3: Residential & Commercial side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Residential Card */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Residential</span>
              <span className="ml-auto text-xl font-bold">{stats.residential.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <Wrench className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs text-muted-foreground">Service</span>
                <span className="ml-auto text-lg font-bold">{stats.residential.service}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <HardHat className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Install</span>
                <span className="ml-auto text-lg font-bold">{stats.residential.install}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commercial Card */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-semibold text-sm">Commercial</span>
              <span className="ml-auto text-xl font-bold">{stats.commercial.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <Wrench className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs text-muted-foreground">Service</span>
                <span className="ml-auto text-lg font-bold">{stats.commercial.service}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <HardHat className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Install</span>
                <span className="ml-auto text-lg font-bold">{stats.commercial.install}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
