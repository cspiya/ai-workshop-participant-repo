"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { ContactFormState } from "@/lib/actions";
import type { CompanyOption } from "@/lib/queries";
import { CONTACT_STATUSES, CONTACT_STATUS_LABELS } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ContactFormValues = {
  name?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  status?: string;
  companyId?: string;
  nextFollowUpAt?: string;
  notes?: string;
};

type ContactFormProps = {
  action: (
    state: ContactFormState,
    formData: FormData,
  ) => Promise<ContactFormState>;
  companies: CompanyOption[];
  submitLabel: string;
  defaultValues?: ContactFormValues;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function ContactForm({
  action,
  companies,
  submitLabel,
  defaultValues,
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name ?? ""}
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError messages={errors.name} />
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="jobTitle">Job title</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            defaultValue={defaultValues?.jobTitle ?? ""}
          />
          <FieldError messages={errors.jobTitle} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="companyId">Company</Label>
          <select
            id="companyId"
            name="companyId"
            className={selectClassName}
            defaultValue={defaultValues?.companyId ?? ""}
          >
            <option value="">— No company —</option>
            {companies.map((company) => (
              <option key={company.id} value={String(company.id)}>
                {company.name}
              </option>
            ))}
          </select>
          <FieldError messages={errors.companyId} />
        </div>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            aria-invalid={Boolean(errors.email)}
          />
          <FieldError messages={errors.email} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
          />
          <FieldError messages={errors.phone} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          defaultValue={defaultValues?.linkedinUrl ?? ""}
          aria-invalid={Boolean(errors.linkedinUrl)}
        />
        <FieldError messages={errors.linkedinUrl} />
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className={selectClassName}
            defaultValue={defaultValues?.status ?? "NEW"}
          >
            {CONTACT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CONTACT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.status} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nextFollowUpAt">Next follow-up</Label>
          <Input
            id="nextFollowUpAt"
            name="nextFollowUpAt"
            type="date"
            defaultValue={defaultValues?.nextFollowUpAt ?? ""}
            aria-invalid={Boolean(errors.nextFollowUpAt)}
          />
          <FieldError messages={errors.nextFollowUpAt} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
        />
        <FieldError messages={errors.notes} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button variant="ghost" render={<Link href="/contacts" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
