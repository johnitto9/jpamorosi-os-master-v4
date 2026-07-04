"use client";

// Two ways in, one identity:
//   1. Magic link (default): email -> single-use signed link via Resend.
//   2. Password (fallback): the original ADMIN_USERNAME/HASH credentials.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        if (data?.devLink) setDevLink(data.devLink as string);
      } else {
        setError(
          data?.error === "admin_not_configured"
            ? "Admin is not configured."
            : "Could not send the link. Try again.",
        );
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(
        data?.error === "invalid_credentials"
          ? "Invalid username or password."
          : data?.error === "admin_not_configured"
            ? "Admin is not configured."
            : "Login failed.",
      );
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "magic") {
    return (
      <div className="space-y-4">
        {sent ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
            <p className="text-sm font-semibold text-emerald-300">Link sent ✓</p>
            <p className="mt-1 text-xs text-white/60">
              If that address is the admin, a single-use sign-in link (valid 15
              minutes) is on its way. Check the inbox.
            </p>
            {devLink && (
              <a
                href={devLink}
                className="mt-3 block truncate text-xs text-cyan-300 underline"
              >
                dev: open magic link →
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={onMagicSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50">
                Admin email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/80 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setMode("password")}
          className="w-full text-center text-xs text-white/40 hover:text-white/70"
        >
          Use password instead
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs uppercase tracking-wider text-white/50">
          Username
        </label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
          required
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-white/50">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
          required
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/80 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => setMode("magic")}
        className="w-full text-center text-xs text-white/40 hover:text-white/70"
      >
        ← Back to magic link
      </button>
    </form>
  );
}
