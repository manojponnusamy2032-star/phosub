"use client";

import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function LogoutButton() {
  const pathname = usePathname();
  const router = useRouter();
  const hidden = pathname === "/login" || pathname === "/student/login" || pathname === "/logout" || pathname.startsWith("/session/") || pathname.startsWith("/classroom/");
  if (hidden) return null;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return <button onClick={() => void logout()} className="fixed right-5 top-5 z-50 flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/95 px-3 py-2 sans text-xs font-bold text-[var(--ink)] shadow-sm" aria-label="Sign out"><LogOut size={15} /> Sign out</button>;
}
