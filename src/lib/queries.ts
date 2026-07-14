import { Prisma } from "@prisma/client";

import { db } from "./db";
import { CONTACT_STATUSES, type ContactStatusValue } from "./validations";

export type ContactFilters = {
  search?: string;
  status?: string;
  company?: string;
};

function isContactStatus(value: string): value is ContactStatusValue {
  return (CONTACT_STATUSES as readonly string[]).includes(value);
}

// Pure function: map query-param filters to a Prisma `where` clause.
// Extracted so it can be unit-tested without a database (AC-3 / S-3).
export function buildContactWhere(
  filters: ContactFilters,
): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = {};

  const search = filters.search?.trim();
  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const status = filters.status?.trim();
  if (status) {
    // Known status filters by value; an unknown status matches no rows (S-3).
    where.status = isContactStatus(status) ? status : { in: [] };
  }

  const company = filters.company?.trim();
  if (company) {
    const companyId = Number(company);
    if (Number.isInteger(companyId) && companyId > 0) {
      where.companyId = companyId;
    } else {
      // An unparseable company filter matches no rows.
      where.companyId = -1;
    }
  }

  return where;
}

// List contacts with server-side search/filter (AC-3), newest changes first.
export async function listContacts(filters: ContactFilters = {}) {
  return db.contact.findMany({
    where: buildContactWhere(filters),
    include: { company: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });
}

export type ContactListItem = Awaited<ReturnType<typeof listContacts>>[number];

// Fetch one contact with its company and interaction timeline (AC-4).
export async function getContact(id: number) {
  return db.contact.findUnique({
    where: { id },
    include: {
      company: true,
      interactions: { orderBy: { happenedAt: "desc" } },
    },
  });
}

export type ContactDetail = NonNullable<Awaited<ReturnType<typeof getContact>>>;

// Companies are consumed read-only here to populate the company selector.
export async function listCompanies() {
  return db.company.findMany({ orderBy: { name: "asc" } });
}

export type CompanyOption = Awaited<ReturnType<typeof listCompanies>>[number];
