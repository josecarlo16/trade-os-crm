import { formatDistanceToNow } from 'date-fns';
import { FileText, Kanban, Briefcase, Users, AlertCircle, Info, X, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import type { Notification } from './useNotifications';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  lead: FileText,
  pipeline: Kanban,
  job: Briefcase,
  team: Users,
  system: AlertCircle,
  general: Info,
};

const categoryColors: Record<string, string> = {
  lead: 'text-blue-500',
  pipeline: 'text-yellow-600',
  job: 'text-green-500',
  team: 'text-purple-500',
  system: 'text-red-500',
  general: 'text-gray-500',
};

interface Props {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

export const NotificationDropdown = ({ notifications, onMarkAsRead, onMarkAllRead, onDismiss }: Props) => {
  const navigate = useNavigate();

  const handleClick = (n: Notification) => {
    if (!n.is_read) onMarkAsRead(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h4 className="font-semibold text-sm">Notifications</h4>
        <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="text-xs h-7">
          <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
        </Button>
      </div>
      <ScrollArea className="h-[320px]">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
        ) : (
          notifications.slice(0, 20).map(n => {
            const Icon = categoryIcons[n.category] || Info;
            const colorClass = categoryColors[n.category] || 'text-gray-500';
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                onClick={() => handleClick(n)}
              >
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
};
