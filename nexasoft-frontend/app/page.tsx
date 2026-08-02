import { redirect } from "next/navigation";

export default function RootPage() {
  // Root (/) par aane wale ko automatically dashboard par bhej dega
  redirect("/dashboard");
}