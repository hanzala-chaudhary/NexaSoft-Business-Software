import { redirect } from "next/navigation";

export default function HomePage() {
  // Root (/) par aane wale ko seedha dashboard bhej dein
  redirect("/dashboard");
}