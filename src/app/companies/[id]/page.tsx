import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompany } from "@/lib/queries";
import type { ContactStatusValue } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { DeleteCompanyButton } from "@/components/companies/delete-company-button";
import { StatusBadge } from "@/components/contacts/status-badge";

type CompanyDetailPageProps = {
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

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId) || companyId <= 0) notFound();

  const company = await getCompany(companyId);
  if (!company) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <Link
          href="/companies"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to companies
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="font-heading text-xl font-semibold">{company.name}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href={`/companies/${company.id}/edit`} />}
            >
              Edit
            </Button>
            <DeleteCompanyButton id={company.id} />
          </div>
        </div>
      </div>

      <dl className="flex flex-col gap-3 rounded-xl p-5 ring-1 ring-foreground/10">
        <DetailRow label="Website">
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {company.website}
            </a>
          ) : (
            "—"
          )}
        </DetailRow>
        <DetailRow label="Industry">{company.industry ?? "—"}</DetailRow>
        <DetailRow label="Notes">{company.notes ?? "—"}</DetailRow>
      </dl>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-heading text-lg font-semibold">
            Contacts{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({company.contacts.length})
            </span>
          </h2>
          <Button
            size="sm"
            render={
              <Link href={`/contacts/new?companyId=${company.id}`} />
            }
          >
            Add contact to this company
          </Button>
        </div>

        {company.contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No contacts yet for this company.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Job title</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {company.contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-t border-foreground/10"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {contact.jobTitle ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={contact.status as ContactStatusValue}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
