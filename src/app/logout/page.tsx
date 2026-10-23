"use client";

import { useEffect, useState } from "react";

export default function LogoutPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch("/api/auth/logout", { method: "POST" }).then(async (response) => {
      if (!response.ok) throw new Error("Could not sign out.");
      window.location.replace("/login");
    }).catch(() => setError("Could not sign out. Please close this tab and try again."));
  }, []);
  return <main className="app-grid flex min-h-screen items-center justify-center px-5"><section className="rounded-xl border border-[var(--line)] bg-white p-8 text-center"><p className="text-lg font-bold">{error || "Signing you out…"}</p></section></main>;
}