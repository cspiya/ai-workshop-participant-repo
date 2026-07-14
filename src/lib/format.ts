// Dates are interpreted/displayed in Europe/Budapest (constitution C1, D-4).
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Budapest",
  dateStyle: "medium",
});

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return dateFormatter.format(date);
}

// Format a Date as the `yyyy-MM-dd` value an <input type="date"> expects.
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
