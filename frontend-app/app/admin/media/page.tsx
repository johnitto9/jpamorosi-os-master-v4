import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured, getStorageDriver } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { getSiteSettings } from "@/lib/media/store";
import { InterludePanel } from "@/components/admin/InterludePanel";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  if (!isAdminEnabled() || !isAdminConfigured()) redirect("/admin");
  if (!(await isAuthenticated())) redirect("/admin/login");

  const settings = await getSiteSettings();
  const driver = getStorageDriver();

  return (
    <div>
      <Link href="/admin" className="text-sm text-cyan-300 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Home media</h1>

      <h2 className="mt-6 text-2xl font-bold">Interlude card images</h2>
      <p className="mt-1 text-sm text-white/55">
        The profile image and home scroll scene media — BEFORE THE SYSTEMS (×2),
        YOU&apos;RE INSIDE THE PROOF, THE LIVING LAYER. Uploads go to{" "}
        {driver === "local-json" ? "the durable volume" : "storage"} (Cloudflare
        R2 when configured) and each field auto-saves. Empty = the built-in
        fallback (emoji) shows.
      </p>
      <div className="mt-6 max-w-4xl">
        <InterludePanel initial={{ profileImage: settings.profileImage ?? "", ...(settings.interludes ?? {}) }} />
      </div>
    </div>
  );
}
