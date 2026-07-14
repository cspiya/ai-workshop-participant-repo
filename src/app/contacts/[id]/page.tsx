import Link from "next/link";
import { notFound } from "next/navigation";

import { getContact } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import type { ContactStatusValue } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { DeleteContactButton } from "@/components/contacts/delete-contact-button";
import { StatusBadge } from "@/components/contacts/status-badge";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isInteger(contactId) || contactId <= 0) notFound();

  const contact = await getContact(contactId);
  if (!contact) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to contacts
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold">
              {contact.name}
            </h1>
            <div>
              <StatusBadge status={contact.status as ContactStatusValue} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href={`/contacts/${contact.id}/edit`} />}
            >
              Edit
            </Button>
            <DeleteContactButton id={contact.id} />
          </div>
        </div>
      </div>

      <dl className="flex flex-col gap-3 rounded-xl p-5 ring-1 ring-foreground/10">
        <DetailRow label="Company">
          {contact.company ? contact.company.name : "No company"}
        </DetailRow>
        <DetailRow label="Job title">{contact.jobTitle ?? "—"}</DetailRow>
        <DetailRow label="Email">
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="hover:underline">
              {contact.email}
            </a>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="Phone">{contact.phone ?? "—"}</DetailRow>
        <DetailRow label="LinkedIn">
          {contact.linkedinUrl ? (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {contact.linkedinUrl}
            </a>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="Next follow-up">
          {formatDate(contact.nextFollowUpAt)}
        </DetailRow>
        <DetailRow label="Notes">{contact.notes ?? "—"}</DetailRow>
      </dl>

      {/* Interaction timeline is a later slice (F4); placeholder only. */}
      <p className="mt-6 text-sm text-muted-foreground">
        Interaction timeline coming in a later slice.
      </p>
    </main>
  );
}
