import { useNotifications } from '../notifications/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NotificationPanel = () => {
  const { notifications, markAsRead, dismiss, markAllRead } = useNotifications();

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#1e3a5f]" />
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>Mark all read</Button>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No new notifications</p>
        ) : (
          notifications.slice(0, 5).map(n => (
            <NotificationItem key={n.id} notification={n} onRead={markAsRead} onDismiss={dismiss} />
          ))
        )}
      </div>
    </div>
  );
};
