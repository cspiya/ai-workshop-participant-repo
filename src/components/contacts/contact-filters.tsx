import Link from "next/link";

import type { CompanyOption } from "@/lib/queries";
import { CONTACT_STATUSES, CONTACT_STATUS_LABELS } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type ContactFiltersProps = {
  companies: CompanyOption[];
  search?: string;
  status?: string;
  company?: string;
};

// Server-rendered filter bar: a native GET form that drives the list via
// query params (/contacts?search=&status=&company=), spec §10.
export function ContactFilters({
  companies,
  search,
  status,
  company,
}: ContactFiltersProps) {
  return (
    <form
      method="get"
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <div className="grid flex-1 gap-1.5">
        <label htmlFor="search" className="text-sm font-medium">
          Search
        </label>
        <Input
          id="search"
          name="search"
          placeholder="Search by name"
          defaultValue={search ?? ""}
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          className={selectClassName}
          defaultValue={status ?? ""}
        >
          <option value="">All statuses</option>
          {CONTACT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {CONTACT_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="company" className="text-sm font-medium">
          Company
        </label>
        <select
          id="company"
          name="company"
          className={selectClassName}
          defaultValue={company ?? ""}
        >
          <option value="">All companies</option>
          {companies.map((option) => (
            <option key={option.id} value={String(option.id)}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit">Filter</Button>
        <Button variant="ghost" render={<Link href="/contacts" />}>
          Clear
        </Button>
      </div>
    </form>
  );
}
