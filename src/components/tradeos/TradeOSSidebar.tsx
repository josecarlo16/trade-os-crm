import { NavLink } from 'react-router-dom';
import {
  Wrench,
  MessageSquare,
  Users,
  Calendar,
  DollarSign,
  Megaphone,
  FileText,
  BarChart3,
  Settings,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { TRADE_OS_NAV, canSeeBlock, RoleTemplate } from '@/lib/tradeOSRoles';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: Wrench,
  foreman: MessageSquare,
  crm: Users,
  workedge: Calendar,
  ottopay: DollarSign,
  social: Megaphone,
  reporting: FileText,
  messages: MessageSquare,
  analytics: BarChart3,
  settings: Settings,
};

const GROUPS: Array<'Command' | 'Modules' | 'System'> = ['Command', 'Modules', 'System'];

export function TradeOSSidebar({ roleTemplate }: { roleTemplate: RoleTemplate | null }) {
  const { total: unreadTotal } = useUnreadMessages();

  return (
    <aside className="flex h-full w-52 flex-none flex-col bg-tradeos-steel text-tradeos-steel-ink">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-tradeos-accent text-white">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="font-condensed text-[17px] font-bold tracking-wider">TRADE OS</div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-tradeos-steel-ink/50">
            Operating System
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2.5">
        <NavLink
          to="/admin"
          end
          className="mb-3 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-tradeos-steel-ink/60 transition-colors hover:bg-white/5 hover:text-tradeos-steel-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin
        </NavLink>

        {GROUPS.map((group) => (
          <div key={group}>
            <div className="px-2.5 py-1.5 font-condensed text-[10.5px] font-semibold uppercase tracking-widest text-tradeos-steel-ink/50">
              {group}
            </div>
            {TRADE_OS_NAV.filter((item) => item.group === group).map((item) => {
              const Icon = ICONS[item.id] ?? Wrench;
              const allowed = canSeeBlock(roleTemplate, item.block);
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === ''}
                  className={({ isActive }) =>
                    cn(
                      'mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-tradeos-accent/15 text-white shadow-[inset_3px_0_0_hsl(var(--to-accent))]'
                        : 'text-tradeos-steel-ink/85 hover:bg-white/5'
                    )
                  }
                >
                  <Icon className="h-4 w-4 flex-none opacity-80" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.id === 'messages' && allowed && unreadTotal > 0 && (
                    <span className="flex h-4 min-w-[16px] flex-none items-center justify-center rounded-full bg-tradeos-accent px-1 font-tradeMono text-[10px] font-semibold text-white">
                      {unreadTotal > 99 ? '99+' : unreadTotal}
                    </span>
                  )}
                  {!allowed && <Lock className="h-3 w-3 flex-none opacity-60" />}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
