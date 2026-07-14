"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "./db";
import { contactCreateSchema, contactUpdateSchema } from "./validations";

export type ContactFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// Pull the contact fields out of a submitted form.
function readContactForm(formData: FormData) {
  return {
    name: formData.get("name"),
    jobTitle: formData.get("jobTitle"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    linkedinUrl: formData.get("linkedinUrl"),
    status: formData.get("status"),
    companyId: formData.get("companyId"),
    nextFollowUpAt: formData.get("nextFollowUpAt"),
    notes: formData.get("notes"),
  };
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

// Create a contact (AC-1). Rejects invalid input with field errors and writes
// nothing (AC-2); on success revalidates the list and opens the detail page.
export async function createContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactCreateSchema.safeParse(readContactForm(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const created = await db.contact.create({ data: parsed.data });
  revalidatePath("/contacts");
  redirect(`/contacts/${created.id}`);
}

// Update a contact, including status and next follow-up (AC-5). `id` is bound
// by the caller. Invalid input is rejected with field errors and no write.
export async function updateContact(
  id: number,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactUpdateSchema.safeParse(readContactForm(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await db.contact.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { message: "Contact not found." };
    }
    throw error;
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

// Delete a contact and (via schema `onDelete: Cascade`) its interactions
// (AC-6). Deleting a missing id is a no-op, not a crash.
export async function deleteContact(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    try {
      await db.contact.delete({ where: { id } });
    } catch (error) {
      if (!isRecordNotFound(error)) {
        throw error;
      }
    }
    revalidatePath("/contacts");
  }
  redirect("/contacts");
}
