import { Link } from "react-router-dom";
import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExistingCustomerMatch } from "@/hooks/useExistingCustomerMatch";

interface Props {
  email: string | null | undefined;
  phone: string | null | undefined;
  /** When true, render a compact icon-only badge (for table rows). */
  compact?: boolean;
}

export const ExistingCustomerBadge = ({ email, phone, compact }: Props) => {
  const { data: match } = useExistingCustomerMatch(email, phone);
  if (!match) return null;

  const name = `${match.first_name || ""} ${match.last_name || ""}`.trim() || match.email || "customer";
  const label = match.matched_on === "email" ? "matched by email" : "matched by phone";

  const badge = (
    <Badge
      variant="secondary"
      className="bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300/60 gap-1"
    >
      <UserCheck className="h-3 w-3" />
      {compact ? "Existing" : "Existing customer"}
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Link to={`/admin/customers/${match.id}`} className="inline-flex">
          {badge}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        Already in CRM as {name} ({label}). Click to open record.
      </TooltipContent>
    </Tooltip>
  );
};
