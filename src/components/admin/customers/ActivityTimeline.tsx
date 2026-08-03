import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  Activity,
  UserPlus,
  Kanban,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Interaction = Database['public']['Tables']['crm_interactions']['Row'];

interface ActivityTimelineProps {
  interactions: Interaction[];
}

const interactionConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  call: { icon: <Phone className="h-4 w-4" />, color: 'bg-muted', label: 'Call' },
  email: { icon: <Mail className="h-4 w-4" />, color: 'bg-muted', label: 'Email' },
  text: { icon: <MessageSquare className="h-4 w-4" />, color: 'bg-muted', label: 'Text' },
  note: { icon: <FileText className="h-4 w-4" />, color: 'bg-muted', label: 'Note' },
  meeting: { icon: <Activity className="h-4 w-4" />, color: 'bg-muted', label: 'Meeting' },
  // System events
  system_conversion: { 
    icon: <UserPlus className="h-4 w-4" />, 
    color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300', 
    label: 'Converted' 
  },
  system_pipeline_add: { 
    icon: <Kanban className="h-4 w-4" />, 
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300', 
    label: 'Pipeline' 
  },
  system_pipeline_move: { 
    icon: <ArrowRightLeft className="h-4 w-4" />, 
    color: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300', 
    label: 'Stage Change' 
  },
  system_status_change: { 
    icon: <RefreshCw className="h-4 w-4" />, 
    color: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300', 
    label: 'Status Change' 
  },
};

const formatDateGroup = (dateStr: string): string => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export function ActivityTimeline({ interactions }: ActivityTimelineProps) {
  // Group interactions by date
  const groupedInteractions = useMemo(() => {
    const groups: Record<string, Interaction[]> = {};
    
    interactions.forEach((interaction) => {
      const dateKey = format(parseISO(interaction.interaction_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(interaction);
    });
    
    // Sort dates descending
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [interactions]);

  const isSystemEvent = (type: string) => type.startsWith('system_');

  if (interactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No activity recorded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {groupedInteractions.map(([dateKey, dayInteractions]) => (
            <div key={dateKey}>
              <div className="sticky top-0 bg-background z-10 pb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {formatDateGroup(dayInteractions[0].interaction_at)}
                </span>
              </div>
              
              <div className="space-y-3 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {dayInteractions.map((interaction) => {
                  const config = interactionConfig[interaction.interaction_type] || {
                    icon: <Activity className="h-4 w-4" />,
                    color: 'bg-muted',
                    label: interaction.interaction_type,
                  };
                  const isSystem = isSystemEvent(interaction.interaction_type);

                  return (
                    <div 
                      key={interaction.id} 
                      className={`flex gap-4 p-3 rounded-lg border ml-2 ${
                        isSystem ? 'bg-muted/30' : 'bg-card'
                      }`}
                    >
                      <div className="flex-shrink-0 z-10">
                        <div className={`p-2 rounded-full ${config.color}`}>
                          {config.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium">{config.label}</span>
                          {!isSystem && interaction.direction && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {interaction.direction}
                            </Badge>
                          )}
                          {isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        {interaction.subject && (
                          <p className="text-sm font-medium">{interaction.subject}</p>
                        )}
                        {interaction.content && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {interaction.content}
                          </p>
                        )}
                        {interaction.outcome && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Outcome:</span>{' '}
                            {interaction.outcome}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(interaction.interaction_at), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
