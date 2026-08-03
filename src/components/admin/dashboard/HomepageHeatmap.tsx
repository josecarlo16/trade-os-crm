import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HomepageHeatmapProps {
  locationData: Record<string, number>;
  totalClicks: number;
}

// Define the homepage sections in order from top to bottom
const HOMEPAGE_SECTIONS = [
  { id: "Hero Section", label: "Hero", description: "Main hero with CTAs" },
  { id: "Features Bar", label: "Features Bar", description: "Energy-saving, Expert installers, DFW" },
  { id: "Service Area Banner", label: "Service Area", description: "Mini split installation banner" },
  { id: "Mitsubishi Section", label: "Mitsubishi", description: "Diamond Contractor section" },
  { id: "Services Overview", label: "Services Overview", description: "Why choose us" },
  { id: "Testimonials", label: "Testimonials", description: "Customer reviews" },
  { id: "Services Grid", label: "Services Grid", description: "8 service cards" },
  { id: "Blog Section", label: "Blog", description: "Latest articles" },
  { id: "CTA Section", label: "CTA", description: "Bottom call-to-action" },
];

const getHeatColor = (intensity: number): string => {
  // intensity is 0-1
  if (intensity === 0) return "bg-gray-100 dark:bg-gray-800";
  if (intensity < 0.2) return "bg-blue-100 dark:bg-blue-900/30";
  if (intensity < 0.4) return "bg-green-200 dark:bg-green-800/40";
  if (intensity < 0.6) return "bg-yellow-200 dark:bg-yellow-700/50";
  if (intensity < 0.8) return "bg-orange-300 dark:bg-orange-600/60";
  return "bg-red-400 dark:bg-red-500/70";
};

const getTextColor = (intensity: number): string => {
  if (intensity >= 0.6) return "text-white dark:text-white";
  return "text-foreground";
};

export const HomepageHeatmap = ({ locationData, totalClicks }: HomepageHeatmapProps) => {
  const maxClicks = useMemo(() => {
    return Math.max(...Object.values(locationData), 1);
  }, [locationData]);

  const sectionsWithData = useMemo(() => {
    return HOMEPAGE_SECTIONS.map((section) => {
      const clicks = locationData[section.id] || 0;
      const intensity = clicks / maxClicks;
      const percentage = totalClicks > 0 ? (clicks / totalClicks) * 100 : 0;
      return {
        ...section,
        clicks,
        intensity,
        percentage,
      };
    });
  }, [locationData, maxClicks, totalClicks]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded-sm" />
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 rounded-sm" />
          <div className="w-4 h-4 bg-green-200 dark:bg-green-800/40 rounded-sm" />
          <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-700/50 rounded-sm" />
          <div className="w-4 h-4 bg-orange-300 dark:bg-orange-600/60 rounded-sm" />
          <div className="w-4 h-4 bg-red-400 dark:bg-red-500/70 rounded-sm" />
        </div>
        <span>More</span>
      </div>

      {/* Heatmap visualization */}
      <div className="border rounded-lg overflow-hidden">
        {/* Browser chrome mockup */}
        <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white dark:bg-gray-600 rounded px-3 py-1 text-xs text-muted-foreground truncate">
            truficient.lovable.app
          </div>
        </div>

        {/* Page sections */}
        <div className="bg-background">
          {sectionsWithData.map((section, index) => (
            <div
              key={section.id}
              className={cn(
                "relative transition-all duration-300 hover:scale-[1.01] cursor-default",
                getHeatColor(section.intensity),
                index !== sectionsWithData.length - 1 && "border-b border-gray-300/50"
              )}
              style={{
                minHeight: section.id === "Hero Section" ? "80px" : 
                           section.id === "Services Grid" ? "70px" :
                           section.id === "CTA Section" ? "60px" : "50px",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-between px-4 py-2">
                <div className={cn("flex-1", getTextColor(section.intensity))}>
                  <div className="font-medium text-sm">{section.label}</div>
                  <div className={cn(
                    "text-xs",
                    section.intensity >= 0.6 ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {section.description}
                  </div>
                </div>
                <div className={cn(
                  "text-right",
                  getTextColor(section.intensity)
                )}>
                  <div className="font-bold text-lg">{section.clicks}</div>
                  <div className={cn(
                    "text-xs",
                    section.intensity >= 0.6 ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {section.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* Heat bar indicator */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-primary/50 transition-all duration-500"
                style={{ width: `${section.intensity * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-center">
        Showing click distribution across {HOMEPAGE_SECTIONS.length} homepage sections
      </div>
    </div>
  );
};
