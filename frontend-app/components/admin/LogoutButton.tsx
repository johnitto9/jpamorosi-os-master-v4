"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:border-white/30 disabled:opacity-50"
    >
      {loading ? "…" : "Log out"}
    </button>
  );
}
