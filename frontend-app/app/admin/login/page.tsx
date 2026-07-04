import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured, adminMissingVars } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (!isAdminEnabled() || !isAdminConfigured()) {
    const missing = adminMissingVars();
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-400/30 bg-amber-400/5 p-6">
        <h1 className="text-lg font-bold text-amber-300">Admin not configured</h1>
        <p className="mt-2 text-sm text-white/70">Set these vars to enable login:</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-white/80">
          {missing.map((m) => (
            <li key={m}>
              <code>{m}</code>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (await isAuthenticated()) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Admin login</h1>
      <p className="mt-1 text-sm text-white/50">Amorosi Labs backoffice</p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
