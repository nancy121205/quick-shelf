"use client";

import { useRouter } from "next/navigation";

export function AdminSignOut() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return <button onClick={signOut} className="mt-10 text-sm text-slate-300 hover:text-white">Sign out</button>;
}