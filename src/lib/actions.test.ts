import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./db", () => ({
  db: {
    contact: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createContact, deleteContact, updateContact } from "./actions";
import { db } from "./db";

const create = db.contact.create as unknown as ReturnType<typeof vi.fn>;
const update = db.contact.update as unknown as ReturnType<typeof vi.fn>;
const del = db.contact.delete as unknown as ReturnType<typeof vi.fn>;

function formOf(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

function notFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createContact (AC-1)", () => {
  it("persists a valid contact and redirects to its detail", async () => {
    create.mockResolvedValue({ id: 42 });

    await createContact(
      {},
      formOf({ name: "Anna Kovács", status: "NEW", companyId: "" }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    const data = create.mock.calls[0][0].data;
    expect(data.name).toBe("Anna Kovács");
    expect(data.status).toBe("NEW");
    expect(data.companyId).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/contacts");
    expect(redirect).toHaveBeenCalledWith("/contacts/42");
  });

  it("defaults status to NEW when the form omits it (AC-1)", async () => {
    create.mockResolvedValue({ id: 1 });
    await createContact({}, formOf({ name: "Solo" }));
    expect(create.mock.calls[0][0].data.status).toBe("NEW");
  });

  it("links an existing company when provided (AC-7)", async () => {
    create.mockResolvedValue({ id: 2 });
    await createContact({}, formOf({ name: "Linked", companyId: "3" }));
    expect(create.mock.calls[0][0].data.companyId).toBe(3);
  });
});

describe("createContact rejects invalid input without writing (AC-2)", () => {
  it("rejects an empty name and writes nothing", async () => {
    const state = await createContact({}, formOf({ name: "   " }));
    expect(state.errors?.name).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rejects a malformed email and writes nothing", async () => {
    const state = await createContact(
      {},
      formOf({ name: "Anna", email: "not-an-email" }),
    );
    expect(state.errors?.email).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a status outside the enum and writes nothing", async () => {
    const state = await createContact(
      {},
      formOf({ name: "Anna", status: "ARCHIVED" }),
    );
    expect(state.errors?.status).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("updateContact (AC-5)", () => {
  it("persists a status change and follow-up date, then redirects", async () => {
    update.mockResolvedValue({ id: 7 });

    await updateContact(
      7,
      {},
      formOf({
        name: "Anna",
        status: "MEETING_SCHEDULED",
        nextFollowUpAt: "2026-08-01",
      }),
    );

    expect(update).toHaveBeenCalledTimes(1);
    const call = update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 7 });
    expect(call.data.status).toBe("MEETING_SCHEDULED");
    expect(call.data.nextFollowUpAt).toBeInstanceOf(Date);
    expect(redirect).toHaveBeenCalledWith("/contacts/7");
  });

  it("rejects invalid input without writing (AC-2)", async () => {
    const state = await updateContact(7, {}, formOf({ name: "" }));
    expect(state.errors?.name).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns a not-found message for a missing id, not a crash", async () => {
    update.mockRejectedValue(notFoundError());
    const state = await updateContact(
      999,
      {},
      formOf({ name: "Ghost", status: "NEW" }),
    );
    expect(state.message).toBe("Contact not found.");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("deleteContact (AC-6)", () => {
  it("deletes the contact and redirects to the list", async () => {
    del.mockResolvedValue({ id: 5 });
    await deleteContact(formOf({ id: "5" }));
    expect(del).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(revalidatePath).toHaveBeenCalledWith("/contacts");
    expect(redirect).toHaveBeenCalledWith("/contacts");
  });

  it("ignores a missing id without crashing (S-6 boundary)", async () => {
    del.mockRejectedValue(notFoundError());
    await expect(deleteContact(formOf({ id: "999" }))).resolves.toBeUndefined();
    expect(redirect).toHaveBeenCalledWith("/contacts");
  });
});
