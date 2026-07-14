import { redirect } from "next/navigation";

// The app opens on the Contacts slice (the first delivered vertical slice).
export default function Home() {
  redirect("/contacts");
}
