"use client";

import { deleteContact } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function DeleteContactButton({ id }: { id: number }) {
  return (
    <form
      action={deleteContact}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Delete this contact? This also removes its interactions and cannot be undone.",
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
