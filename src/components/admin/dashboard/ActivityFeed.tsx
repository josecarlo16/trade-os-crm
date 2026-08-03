import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  ScanLine, 
  PenSquare, 
  ImageIcon,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'submission' | 'scan' | 'blog' | 'gallery';
  description: string;
  timestamp: string;
}

export const ActivityFeed = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const activities: ActivityItem[] = [];

      // Fetch recent contact submissions
      const { data: contactSubs } = await supabase
        .from('contact_submissions')
        .select('id, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      contactSubs?.forEach(s => {
        activities.push({
          id: `contact-${s.id}`,
          type: 'submission',
          description: `${s.first_name} ${s.last_name} submitted a contact form`,
          timestamp: s.created_at,
        });
      });

      // Fetch recent ductless submissions
      const { data: ductlessSubs } = await supabase
        .from('ductless_estimate_submissions')
        .select('id, customer_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      ductlessSubs?.forEach(s => {
        activities.push({
          id: `ductless-${s.id}`,
          type: 'submission',
          description: `${s.customer_name} requested a ductless estimate`,
          timestamp: s.created_at,
        });
      });

      // Fetch recent equipment scans
      const { data: scans } = await supabase
        .from('equipment_scans')
        .select('id, customer_name, brand, model_number, created_at')
        .not('email', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      scans?.forEach(s => {
        activities.push({
          id: `scan-${s.id}`,
          type: 'scan',
          description: `${s.customer_name || 'Someone'} scanned ${s.brand || 'equipment'} ${s.model_number || ''}`.trim(),
          timestamp: s.created_at!,
        });
      });

      // Fetch recent blog posts
      const { data: blogs } = await supabase
        .from('blog_posts')
        .select('id, title, published_at')
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(3);

      blogs?.forEach(b => {
        activities.push({
          id: `blog-${b.id}`,
          type: 'blog',
          description: `Blog post "${b.title}" was published`,
          timestamp: b.published_at!,
        });
      });

      // Fetch recent gallery uploads
      const { data: gallery } = await supabase
        .from('gallery_images')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      gallery?.forEach(g => {
        activities.push({
          id: `gallery-${g.id}`,
          type: 'gallery',
          description: `Media "${g.title}" was added to gallery`,
          timestamp: g.created_at!,
        });
      });

      // Sort by timestamp and return top 10
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    staleTime: 60000,
  });

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'submission':
        return FileText;
      case 'scan':
        return ScanLine;
      case 'blog':
        return PenSquare;
      case 'gallery':
        return ImageIcon;
      default:
        return Clock;
    }
  };

  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'submission':
        return 'text-blue-500';
      case 'scan':
        return 'text-green-500';
      case 'blog':
        return 'text-purple-500';
      case 'gallery':
        return 'text-amber-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6">
          {activities?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No recent activity</p>
          ) : (
            <div className="space-y-4 py-2">
              {activities?.map((activity) => {
                const Icon = getIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full bg-muted ${getIconColor(activity.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
