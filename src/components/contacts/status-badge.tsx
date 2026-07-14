import { Badge } from "@/components/ui/badge";
import {
  CONTACT_STATUS_LABELS,
  type ContactStatusValue,
} from "@/lib/validations";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<ContactStatusValue, BadgeVariant> = {
  NEW: "secondary",
  CONTACTED: "outline",
  REPLIED: "outline",
  MEETING_SCHEDULED: "default",
  IN_DISCUSSION: "default",
  WON: "default",
  LOST: "destructive",
  ON_HOLD: "secondary",
};

export function StatusBadge({ status }: { status: ContactStatusValue }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {CONTACT_STATUS_LABELS[status]}
    </Badge>
  );
}
