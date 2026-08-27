import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Lock } from 'lucide-react';

export function ModuleCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="bg-tradeos-surface border-tradeos-line">
      <CardHeader className="flex flex-row items-center gap-2 border-b border-tradeos-line py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-tradeos-line bg-tradeos-surface-2 text-tradeos-ink-2">
          {icon}
        </div>
        <CardTitle className="font-condensed text-sm font-bold uppercase tracking-wider text-tradeos-ink">
          {title}
        </CardTitle>
        {action && <div className="ml-auto">{action}</div>}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export function PhasedModuleCard({ title, icon, phase }: { title: string; icon: ReactNode; phase: string }) {
  return (
    <Card className="bg-tradeos-surface border-tradeos-line border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-tradeos-line bg-tradeos-surface-2 text-tradeos-ink-2">
          {icon}
        </div>
        <p className="font-condensed text-sm font-bold uppercase tracking-wide text-tradeos-ink-2">{title}</p>
        <Badge variant="outline" className="border-tradeos-line-strong text-tradeos-ink-3 font-tradeMono text-[10px]">
          {phase}
        </Badge>
      </CardContent>
    </Card>
  );
}

export function LinkOutModuleCard({ title, icon, href, description }: { title: string; icon: ReactNode; href: string; description: string }) {
  return (
    <Card className="bg-tradeos-surface border-tradeos-line">
      <CardContent className="p-0">
        <Link to={href} className="flex items-center gap-3 p-4 transition-colors hover:bg-tradeos-surface-2">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-tradeos-line bg-tradeos-surface-2 text-tradeos-ink-2">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-condensed text-sm font-bold uppercase tracking-wide text-tradeos-ink">{title}</p>
            <p className="text-xs text-tradeos-ink-3">{description}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 flex-none text-tradeos-ink-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function LockedModuleCard({ title }: { title: string }) {
  return (
    <Card className="bg-tradeos-surface-2 border-tradeos-line">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-tradeos-line-strong bg-tradeos-surface text-tradeos-ink-3">
          <Lock className="h-4 w-4" />
        </div>
        <p className="font-condensed text-sm font-bold uppercase tracking-wide text-tradeos-ink-3">{title}</p>
        <p className="max-w-[26ch] text-xs text-tradeos-ink-3">Not in this role's default layout.</p>
      </CardContent>
    </Card>
  );
}

/** Full-page version of the locked state, for direct-URL access to a route the current role can't reach. */
export function RestrictedPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-tradeos-line bg-tradeos-surface px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-tradeos-line-strong bg-tradeos-surface-2 text-tradeos-ink-2">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="font-condensed text-lg font-bold text-tradeos-ink">{title} isn't part of this role's layout</h2>
      <p className="max-w-[46ch] text-sm text-tradeos-ink-3">
        This block isn't seeded for this role by default. If a user needs it, an admin grants it explicitly — the
        permission model decides, not this screen.
      </p>
      <Badge variant="outline" className="border-tradeos-line-strong text-tradeos-ink-3 font-tradeMono text-[10px]">
        blocked by permission_grants
      </Badge>
    </div>
  );
}
