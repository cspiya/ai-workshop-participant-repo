import Link from "next/link";

import { createCompany } from "@/lib/actions";
import { CompanyForm } from "@/components/companies/company-form";

export default function NewCompanyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <div className="mb-6">
        <Link
          href="/companies"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to companies
        </Link>
        <h1 className="mt-2 font-heading text-xl font-semibold">
          New company
        </h1>
      </div>
      <CompanyForm
        action={createCompany}
        submitLabel="Create company"
        cancelHref="/companies"
      />
    </main>
  );
}
