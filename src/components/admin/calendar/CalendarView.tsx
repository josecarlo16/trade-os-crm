import { useMemo, useEffect, useRef } from "react";
import { format, startOfWeek, addDays, isSameDay, isToday, parseISO, differenceInMinutes, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatTimeCSTDisplay, getCSTHoursMinutes } from "@/lib/cstTimezone";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "job" | "google";
  color: string;
  data: any;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  viewMode: "day" | "week" | "month";
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 6; // Default scroll position (6 AM)

export default function CalendarView({ events, currentDate, viewMode, onDateChange, onEventClick }: CalendarViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to 6 AM on mount and when view mode changes
  useEffect(() => {
    if (viewMode === "month") return; // Month view doesn't need scrolling
    
    // Small delay to ensure the ScrollArea is rendered
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = START_HOUR * HOUR_HEIGHT;
        }
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [viewMode, currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.start, date));
  };

  const getEventMinutes = (event: CalendarEvent) => {
    const startCST = getCSTHoursMinutes(event.start);
    const endCST = getCSTHoursMinutes(event.end);
    const startMinutes = startCST.hours * 60 + startCST.minutes;
    const endMinutes = endCST.hours * 60 + endCST.minutes;
    const duration = Math.max(endMinutes - startMinutes, 30);
    return { startMinutes, endMinutes: startMinutes + duration };
  };

  // Assign columns to overlapping events so they render side-by-side
  const layoutEvents = (dayEvents: CalendarEvent[]) => {
    if (!dayEvents.length) return [];

    const items = dayEvents
      .map(ev => ({ event: ev, ...getEventMinutes(ev) }))
      .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

    const columns: { endMinutes: number; startMinutes: number; event: CalendarEvent }[][] = [];

    for (const item of items) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        if (item.startMinutes >= lastInCol.endMinutes) {
          columns[col].push(item);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([item]);
    }

    const totalCols = columns.length;
    const result: { event: CalendarEvent; style: React.CSSProperties }[] = [];

    columns.forEach((col, colIndex) => {
      for (const item of col) {
        const widthPct = 100 / totalCols;
        const leftPct = colIndex * widthPct;
        result.push({
          event: item.event,
          style: {
            top: `${(item.startMinutes / 60) * HOUR_HEIGHT}px`,
            height: `${((item.endMinutes - item.startMinutes) / 60) * HOUR_HEIGHT}px`,
            left: `${leftPct}%`,
            width: `${widthPct}%`,
          },
        });
      }
    });

    return result;
  };

  if (viewMode === "month") {
    return <MonthView events={events} currentDate={currentDate} onDateChange={onDateChange} onEventClick={onEventClick} />;
  }

  const daysToShow = viewMode === "day" ? [currentDate] : weekDays;

  return (
    <Card className="overflow-hidden">
      {/* Header with day names */}
      <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${daysToShow.length}, 1fr)` }}>
        <div className="border-r p-2 text-xs text-muted-foreground text-center">Time</div>
        {daysToShow.map(day => (
          <div 
            key={day.toISOString()} 
            className={cn(
              "p-2 text-center border-r last:border-r-0",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, "EEE")}
            </div>
            <div className={cn(
              "text-lg font-semibold",
              isToday(day) && "text-primary"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="h-[800px]" ref={scrollAreaRef}>
        <div className="grid relative" style={{ gridTemplateColumns: `60px repeat(${daysToShow.length}, 1fr)` }}>
          {/* Time labels */}
          <div className="border-r">
            {HOURS.map(hour => (
              <div 
                key={hour} 
                className="border-b text-xs text-muted-foreground text-right pr-2 flex items-start justify-end"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour === 0 ? "" : format(new Date().setHours(hour, 0), "h a")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {daysToShow.map(day => (
            <div key={day.toISOString()} className="relative border-r last:border-r-0">
              {/* Hour lines */}
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="border-b"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {/* Events */}
              <div className="absolute inset-0">
                {layoutEvents(getEventsForDay(day)).map(({ event, style }) => (
                  <EventBlock key={event.id} event={event} style={style} onEventClick={onEventClick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

function EventBlock({ event, style, onEventClick }: { event: CalendarEvent; style: React.CSSProperties; onEventClick?: (event: CalendarEvent) => void }) {
  return (
    <div
      className="absolute rounded-md px-2 py-1 text-xs overflow-hidden cursor-pointer hover:brightness-95 transition-all shadow-sm border-l-[3px]"
      style={{
        ...style,
        // Add small padding inside the column
        paddingLeft: '6px',
        marginLeft: '1px',
        marginRight: '1px',
        backgroundColor: `${event.color}18`,
        borderLeftColor: event.color,
        color: event.color,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEventClick?.(event);
      }}
    >
      <div className="font-semibold truncate" style={{ color: event.color }}>{event.title}</div>
      <div className="truncate opacity-75" style={{ color: event.color }}>
        {formatTimeCSTDisplay(event.start)} - {formatTimeCSTDisplay(event.end)}
      </div>
    </div>
  );
}

function MonthView({ events, currentDate, onDateChange, onEventClick }: { 
  events: CalendarEvent[]; 
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const weeks = useMemo(() => {
    const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), { weekStartsOn: 0 });
    const result: Date[][] = [];
    let current = start;
    
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(current);
        current = addDays(current, 1);
      }
      result.push(week);
    }
    return result;
  }, [currentDate]);

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.start, date));
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "min-h-[100px] p-1 border-r last:border-r-0",
                  !isCurrentMonth && "bg-muted/30",
                  isToday(day) && "bg-primary/5"
                )}
              >
                <div 
                  className={cn(
                    "text-sm font-medium mb-1 cursor-pointer hover:text-primary",
                    !isCurrentMonth && "text-muted-foreground",
                    isToday(day) && "text-primary"
                  )}
                  onClick={() => onDateChange(day)}
                >
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:brightness-95 border-l-2 font-medium"
                      style={{ backgroundColor: `${event.color}18`, borderLeftColor: event.color, color: event.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}
