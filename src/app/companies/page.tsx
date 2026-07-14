import Link from "next/link";

import { listCompaniesWithCounts } from "@/lib/queries";
import { Button } from "@/components/ui/button";

// Reads the live company list, so render on demand rather than at build time.
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompaniesWithCounts();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} compan{companies.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <Button render={<Link href="/companies/new" />}>New company</Button>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No companies yet.{" "}
          <Link href="/companies/new" className="underline">
            Create a company
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Industry</th>
                <th className="px-4 py-2 font-medium text-right">Contacts</th>
                <th className="px-4 py-2 font-medium">Website</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-t border-foreground/10">
                  <td className="px-4 py-2">
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-medium hover:underline"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {company.industry ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {company._count.contacts}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
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
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link href={`/companies/${company.id}/edit`} />}
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
