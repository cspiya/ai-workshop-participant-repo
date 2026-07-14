import Link from "next/link";

import { listCompanies, listContacts } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import type { ContactStatusValue } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { ContactFilters } from "@/components/contacts/contact-filters";
import { StatusBadge } from "@/components/contacts/status-badge";

type ContactsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    company?: string;
  }>;
};

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const filters = await searchParams;
  const [contacts, companies] = await Promise.all([
    listContacts(filters),
    listCompanies(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/contacts/new" />}>New contact</Button>
      </div>

      <div className="mb-6">
        <ContactFilters
          companies={companies}
          search={filters.search}
          status={filters.status}
          company={filters.company}
        />
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No contacts found. Try clearing the filters or{" "}
          <Link href="/contacts/new" className="underline">
            create a contact
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Job title</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Next follow-up</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-t border-foreground/10">
                  <td className="px-4 py-2">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {contact.company?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {contact.jobTitle ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      status={contact.status as ContactStatusValue}
                    />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(contact.nextFollowUpAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/contacts/${contact.id}/edit`} />}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
