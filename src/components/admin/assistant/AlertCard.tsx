import { AlertTriangle, Clock, FileText, Shield, User } from "lucide-react";

interface AlertCardProps {
  type: string;
  severity: "info" | "warning" | "urgent";
  title: string;
  detail: string;
}

const severityStyles = {
  urgent: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const typeIcons: Record<string, any> = {
  cert_expiring: Shield,
  uncontacted_lead: User,
  stale_estimate: FileText,
  overdue_job: Clock,
};

export function AlertCard({ type, severity, title, detail }: AlertCardProps) {
  const Icon = typeIcons[type] || AlertTriangle;

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border text-sm ${severityStyles[severity]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-xs">{title}</p>
        <p className="text-[11px] opacity-75">{detail}</p>
      </div>
    </div>
  );
}
