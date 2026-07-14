import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCompany } from "@/lib/actions";
import { getCompany } from "@/lib/queries";
import { CompanyForm } from "@/components/companies/company-form";

type EditCompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCompanyPage({
  params,
}: EditCompanyPageProps) {
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId) || companyId <= 0) notFound();

  const company = await getCompany(companyId);
  if (!company) notFound();

  // Bind the company id so the form action matches the useActionState shape.
  const updateAction = updateCompany.bind(null, company.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/companies/${company.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to company
        </Link>
        <h1 className="mt-2 font-heading text-xl font-semibold">
          Edit company
        </h1>
      </div>
      <CompanyForm
        action={updateAction}
        submitLabel="Save changes"
        cancelHref={`/companies/${company.id}`}
        defaultValues={{
          name: company.name,
          website: company.website ?? "",
          industry: company.industry ?? "",
          notes: company.notes ?? "",
        }}
      />
    </main>
  );
}
