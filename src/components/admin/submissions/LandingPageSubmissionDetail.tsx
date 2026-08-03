import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface LandingPageSubmissionDetailProps {
  metadata: Record<string, unknown>;
}

export const LandingPageSubmissionDetail = ({ metadata }: LandingPageSubmissionDetailProps) => {
  const formName = metadata.formName as string | null;
  const serviceType = metadata.serviceType as string | null;
  const message = metadata.message as string | null;
  const customFields = metadata.customFields as Record<string, unknown> | null;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Submission Details
      </h3>

      {formName && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Form</p>
          <Badge variant="outline">{formName}</Badge>
        </div>
      )}

      {serviceType && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Service Type</p>
          <p className="text-sm font-medium">{serviceType}</p>
        </div>
      )}

      {message && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Message</p>
          <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{message}</p>
        </div>
      )}

      {/* Custom Fields */}
      {customFields && Object.keys(customFields).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Custom Fields</p>
          <div className="bg-muted/50 p-3 rounded-md space-y-2">
            {Object.entries(customFields).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
