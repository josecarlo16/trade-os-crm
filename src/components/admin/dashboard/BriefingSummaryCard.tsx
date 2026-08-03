import { Bot, AlertTriangle, CalendarDays, UserPlus } from "lucide-react";
import type { BriefingData } from "../assistant/hooks/useBriefing";

interface BriefingSummaryCardProps {
  briefingData: BriefingData | null;
  onOpenAssistant: () => void;
}

export function BriefingSummaryCard({ briefingData, onOpenAssistant }: BriefingSummaryCardProps) {
  if (!briefingData) return null;

  return (
    <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2A3F6A] rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#C4A962]" />
          <h3 className="font-semibold">Bach's Daily Update</h3>
        </div>
        <button
          onClick={onOpenAssistant}
          className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          Full Briefing →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <CalendarDays className="w-4 h-4 mx-auto mb-1 opacity-75" />
          <p className="text-lg font-bold">{briefingData.today_appointments?.length || 0}</p>
          <p className="text-xs opacity-60">Today's Jobs</p>
        </div>
        <div className="text-center">
          <UserPlus className="w-4 h-4 mx-auto mb-1 opacity-75" />
          <p className="text-lg font-bold">{briefingData.new_submissions_count || 0}</p>
          <p className="text-xs opacity-60">New Leads (48h)</p>
        </div>
        <div className="text-center">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 opacity-75" />
          <p className="text-lg font-bold">{briefingData.alerts_by_severity?.urgent || 0}</p>
          <p className="text-xs opacity-60">Urgent Alerts</p>
        </div>
      </div>
    </div>
  );
}
