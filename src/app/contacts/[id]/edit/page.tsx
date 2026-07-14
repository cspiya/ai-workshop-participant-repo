import Link from "next/link";
import { notFound } from "next/navigation";

import { updateContact } from "@/lib/actions";
import { getContact, listCompanies } from "@/lib/queries";
import { toDateInputValue } from "@/lib/format";
import { ContactForm } from "@/components/contacts/contact-form";

type EditContactPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditContactPage({
  params,
}: EditContactPageProps) {
  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isInteger(contactId) || contactId <= 0) notFound();

  const [contact, companies] = await Promise.all([
    getContact(contactId),
    listCompanies(),
  ]);
  if (!contact) notFound();

  // Bind the contact id so the form action matches the useActionState shape.
  const updateAction = updateContact.bind(null, contact.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/contacts/${contact.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to contact
        </Link>
        <h1 className="mt-2 font-heading text-xl font-semibold">
          Edit contact
        </h1>
      </div>
      <ContactForm
        action={updateAction}
        companies={companies}
        submitLabel="Save changes"
        defaultValues={{
          name: contact.name,
          jobTitle: contact.jobTitle ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          linkedinUrl: contact.linkedinUrl ?? "",
          status: contact.status,
          companyId: contact.companyId ? String(contact.companyId) : "",
          nextFollowUpAt: toDateInputValue(contact.nextFollowUpAt),
          notes: contact.notes ?? "",
        }}
      />
    </main>
  );
}
