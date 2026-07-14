import { z } from "zod";

// Contact status enum values — must stay in sync with `ContactStatus` in
// prisma/schema.prisma (spec §5.2). A unit test asserts they match the
// Prisma-generated enum, so drift is caught automatically.
export const CONTACT_STATUSES = [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "MEETING_SCHEDULED",
  "IN_DISCUSSION",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;

export type ContactStatusValue = (typeof CONTACT_STATUSES)[number];

// Human-friendly labels for the UI (values remain the enum constants).
export const CONTACT_STATUS_LABELS: Record<ContactStatusValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  MEETING_SCHEDULED: "Meeting scheduled",
  IN_DISCUSSION: "In discussion",
  WON: "Won",
  LOST: "Lost",
  ON_HOLD: "On hold",
};

export const statusSchema = z.enum(CONTACT_STATUSES);

// Treat missing (undefined/null) and empty/whitespace-only form strings as
// "not provided", normalizing them all to null.
const emptyToNull = (value: unknown) =>
  value == null || (typeof value === "string" && value.trim() === "")
    ? null
    : value;

// Optional free-text field: "" -> null, otherwise a trimmed non-empty string.
const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().min(1).nullable(),
);

// Shared shape for creating and editing a contact (D-1..D-4).
const contactBaseShape = {
  // D-1: only the name is required.
  name: z.string().trim().min(1, "Name is required"),
  jobTitle: optionalText,
  // Email must be a valid address if provided, otherwise null.
  email: z.preprocess(emptyToNull, z.email("Invalid email address").nullable()),
  phone: optionalText,
  // LinkedIn URL must be a valid URL if provided, otherwise null.
  linkedinUrl: z.preprocess(
    emptyToNull,
    z.url("Invalid LinkedIn URL").nullable(),
  ),
  // Status must be one of the enum values (spec §5.2).
  status: statusSchema,
  // Optional link to an existing company (D-1: company is optional).
  companyId: z.preprocess(
    emptyToNull,
    z.coerce.number().int().positive("Invalid company").nullable(),
  ),
  // Optional next follow-up timestamp.
  nextFollowUpAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
  notes: optionalText,
};

// On create, status defaults to `NEW` when the form omits it (null/empty are
// normalized to undefined so the default applies).
export const contactCreateSchema = z.object({
  ...contactBaseShape,
  status: z.preprocess(
    (value) => (value == null || value === "" ? undefined : value),
    statusSchema.default("NEW"),
  ),
});

// On update, the full validated shape is required.
export const contactUpdateSchema = z.object(contactBaseShape);

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
