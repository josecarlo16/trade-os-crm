import { Badge } from "@/components/ui/badge";

interface ContactSubmissionDetailProps {
  metadata: Record<string, unknown>;
}

export const ContactSubmissionDetail = ({ metadata }: ContactSubmissionDetailProps) => {
  const serviceType = metadata.serviceType as string | null;
  const message = metadata.message as string | null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Submission Details
      </h3>

      {serviceType && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Service Type</p>
          <Badge variant="outline">{serviceType}</Badge>
        </div>
      )}

      {message && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Message</p>
          <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{message}</p>
        </div>
      )}

      {!serviceType && !message && (
        <p className="text-sm text-muted-foreground italic">No additional details</p>
      )}
    </div>
  );
};
