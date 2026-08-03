import { formatDistanceToNow } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../notifications/useNotifications';

interface Props {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const NotificationItem = ({ notification: n, onRead, onDismiss }: Props) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!n.is_read) onRead(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  return (
    <div
      className={`flex items-start gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-muted/50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${!n.is_read ? 'font-medium' : ''}`}>{n.title}</p>
        {n.message && <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>}
        <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={e => { e.stopPropagation(); onDismiss(n.id); }}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
