import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TradeOSSidebar } from './TradeOSSidebar';
import { useTradeOSFonts } from '@/hooks/useTradeOSFonts';
import { useUserRole } from '@/hooks/useUserRole';
import { toRoleTemplate, ROLE_LABEL } from '@/lib/tradeOSRoles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { CustomizeModeProvider, useCustomizeMode } from './CustomizeModeContext';

function CustomizeButton() {
  const { isCustomizing, toggle } = useCustomizeMode();
  return (
    <Button
      type="button"
      variant={isCustomizing ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      className={isCustomizing ? 'bg-tradeos-accent text-white hover:bg-tradeos-accent' : 'border-tradeos-line-strong text-tradeos-ink-2'}
    >
      <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
      {isCustomizing ? 'Done' : 'Customize'}
    </Button>
  );
}

export function TradeOSLayout({ children }: { children: ReactNode }) {
  useTradeOSFonts();
  const { role, loading } = useUserRole();
  const roleTemplate = toRoleTemplate(role);
  const location = useLocation();
  // Customize mode (drag/hide/reset) only makes sense on the dashboard grid.
  const isDashboardRoute = location.pathname.replace(/\/+$/, '') === '/admin/trade-os';

  useEffect(() => {
    document.title = 'Trade OS | Admin - Truficient';
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-tradeos-page">
        <Loader2 className="h-8 w-8 animate-spin text-tradeos-accent" />
      </div>
    );
  }

  return (
    <CustomizeModeProvider>
      <div className="trade-os flex h-screen overflow-hidden bg-tradeos-page font-tradeBody">
        <TradeOSSidebar roleTemplate={roleTemplate} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-none items-center gap-4 border-b border-tradeos-line bg-tradeos-surface px-6 py-3.5">
            <div>
              <span className="font-condensed text-base font-semibold text-tradeos-ink">Truficient Heating &amp; Air</span>
              <span className="ml-2.5 text-xs text-tradeos-ink-3">Dallas–Fort Worth, TX</span>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              {isDashboardRoute && <CustomizeButton />}
              {roleTemplate && (
                <Badge className="bg-tradeos-accent font-tradeMono text-[11px] text-white hover:bg-tradeos-accent">
                  {ROLE_LABEL[roleTemplate]}
                </Badge>
              )}
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-auto p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </CustomizeModeProvider>
  );
}
