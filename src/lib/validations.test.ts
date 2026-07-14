import { describe, expect, it } from "vitest";
import { ContactStatus } from "@prisma/client";

import {
  CONTACT_STATUSES,
  companySchema,
  contactCreateSchema,
  contactUpdateSchema,
} from "./validations";

describe("CONTACT_STATUSES", () => {
  it("matches the Prisma ContactStatus enum exactly (no drift)", () => {
    expect([...CONTACT_STATUSES].sort()).toEqual(
      Object.values(ContactStatus).sort(),
    );
  });
});

describe("contactCreateSchema", () => {
  it("accepts a contact with only a name and defaults status to NEW", () => {
    const result = contactCreateSchema.safeParse({ name: "Anna Kovács" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("NEW");
      expect(result.data.email).toBeNull();
      expect(result.data.companyId).toBeNull();
      expect(result.data.nextFollowUpAt).toBeNull();
    }
  });

  it("trims a single-character name as the minimum valid input (S-1 boundary)", () => {
    const result = contactCreateSchema.safeParse({ name: "  A  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("A");
  });

  it("rejects an empty name with a field-level message (S-2)", () => {
    const result = contactCreateSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["name"]);
    }
  });

  it("rejects a malformed email (S-2)", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "email")).toBe(true);
    }
  });

  it("rejects a malformed LinkedIn URL (S-2)", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      linkedinUrl: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "linkedinUrl")).toBe(
        true,
      );
    }
  });

  it("rejects a status outside the enum (S-2)", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      status: "ARCHIVED",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "status")).toBe(
        true,
      );
    }
  });

  it("accepts an optional company link and coerces the id to a number (S-7)", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      companyId: "3",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.companyId).toBe(3);
  });

  it("treats an empty company selection as no company (S-7)", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      companyId: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.companyId).toBeNull();
  });

  it("parses a follow-up date string into a Date (S-5)", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      nextFollowUpAt: "2026-08-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextFollowUpAt).toBeInstanceOf(Date);
    }
  });

  it("accepts a valid email and LinkedIn URL", () => {
    const result = contactCreateSchema.safeParse({
      name: "Anna",
      email: "anna@example.com",
      linkedinUrl: "https://www.linkedin.com/in/anna",
    });
    expect(result.success).toBe(true);
  });
});

describe("contactUpdateSchema", () => {
  it("requires an explicit valid status (S-5)", () => {
    const ok = contactUpdateSchema.safeParse({
      name: "Anna",
      status: "MEETING_SCHEDULED",
    });
    expect(ok.success).toBe(true);

    const missing = contactUpdateSchema.safeParse({ name: "Anna" });
    expect(missing.success).toBe(false);
  });
});

describe("companySchema", () => {
  it("accepts a company with only a name (website optional, spec §11)", () => {
    const result = companySchema.safeParse({ name: "Acme Logistics" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Acme Logistics");
      expect(result.data.website).toBeNull();
      expect(result.data.industry).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("trims the name and rejects an empty one", () => {
    const trimmed = companySchema.safeParse({ name: "  Acme  " });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.name).toBe("Acme");

    const empty = companySchema.safeParse({ name: "   " });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0].path).toEqual(["name"]);
  });

  it("accepts a valid website URL", () => {
    const result = companySchema.safeParse({
      name: "Acme",
      website: "https://acme.example.com",
    });
    expect(result.success).toBe(true);
    if (result.success)
      expect(result.data.website).toBe("https://acme.example.com");
  });

  it("rejects a malformed website URL (spec §11)", () => {
    const result = companySchema.safeParse({ name: "Acme", website: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "website")).toBe(
        true,
      );
    }
  });
});
