import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminEnabled, isAdminConfigured, getStorageDriver } from "@/lib/env";
import { isAuthenticated } from "@/lib/auth/admin";
import { getSiteSettings } from "@/lib/media/store";
import { MediaUploader } from "@/components/admin/MediaUploader";

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
      <h1 className="mt-3 text-2xl font-bold">Hall of Fame — hero video</h1>
      <p className="mt-1 text-sm text-white/55">
        Upload a background video for the Hall of Fame. It is transcoded to
        web-optimized 720p in-container (ffmpeg) and stored on the durable volume.
      </p>

      {driver !== "local-json" && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-300">
          Storage driver is <code>{driver}</code>. Video upload needs
          <code> PROJECT_STORAGE_DRIVER=local-json</code> (Docker backend). On
          Vercel this stays off (ephemeral FS) — Cloudflare offload is the future path.
        </p>
      )}

      <div className="mt-6 max-w-2xl">
        <MediaUploader current={settings.heroVideo ?? null} />
      </div>
    </div>
  );
}
