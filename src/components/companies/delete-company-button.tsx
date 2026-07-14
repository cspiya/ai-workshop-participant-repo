"use client";

import { deleteCompany } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function DeleteCompanyButton({ id }: { id: number }) {
  return (
    <form
      action={deleteCompany}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this company? Its contacts are kept but unlinked from any company. This cannot be undone.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="destructive">
        Delete
      </Button>
    </form>
  );
}
