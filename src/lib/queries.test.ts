import { describe, expect, it } from "vitest";

import { buildContactWhere } from "./queries";

describe("buildContactWhere", () => {
  it("returns an empty where for no filters (empty search returns all — S-3)", () => {
    expect(buildContactWhere({})).toEqual({});
    expect(buildContactWhere({ search: "  " })).toEqual({});
  });

  it("maps free-text search to a case-insensitive name contains (S-3)", () => {
    expect(buildContactWhere({ search: "anna" })).toEqual({
      name: { contains: "anna", mode: "insensitive" },
    });
  });

  it("maps a known status to an equality filter (S-3)", () => {
    expect(buildContactWhere({ status: "CONTACTED" })).toEqual({
      status: "CONTACTED",
    });
  });

  it("maps an unknown status to a no-rows filter (S-3 boundary)", () => {
    expect(buildContactWhere({ status: "ARCHIVED" })).toEqual({
      status: { in: [] },
    });
  });

  it("maps a numeric company filter to companyId equality", () => {
    expect(buildContactWhere({ company: "12" })).toEqual({ companyId: 12 });
  });

  it("maps an unparseable company filter to a no-rows filter", () => {
    expect(buildContactWhere({ company: "abc" })).toEqual({ companyId: -1 });
  });

  it("combines search, status and company (S-3 example query)", () => {
    expect(
      buildContactWhere({ search: "anna", status: "CONTACTED", company: "12" }),
    ).toEqual({
      name: { contains: "anna", mode: "insensitive" },
      status: "CONTACTED",
      companyId: 12,
    });
  });
});
