import Link from "next/link";

import { createContact } from "@/lib/actions";
import { listCompanies } from "@/lib/queries";
import { ContactForm } from "@/components/contacts/contact-form";

// Reads the live company list, so render on demand rather than at build time.
export const dynamic = "force-dynamic";

type NewContactPageProps = {
  searchParams: Promise<{ companyId?: string }>;
};

export default async function NewContactPage({
  searchParams,
}: NewContactPageProps) {
  const [companies, { companyId }] = await Promise.all([
    listCompanies(),
    searchParams,
  ]);

  // Prefill the company selector when arriving from a company detail page,
  // but only if it refers to a company that actually exists.
  const preselectedCompanyId =
    companyId && companies.some((company) => String(company.id) === companyId)
      ? companyId
      : "";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to contacts
        </Link>
        <h1 className="mt-2 font-heading text-xl font-semibold">
          New contact
        </h1>
      </div>
      <ContactForm
        action={createContact}
        companies={companies}
        submitLabel="Create contact"
        defaultValues={{ companyId: preselectedCompanyId }}
      />
    </main>
  );
}
