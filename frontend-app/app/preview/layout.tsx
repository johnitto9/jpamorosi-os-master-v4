import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getPublicContentMode, getStorageDriver } from "@/lib/env";

// Preview is a deliberate LIVE surface (reads the repository / local-json).
// Never indexed; not the Vercel public path.
export const metadata: Metadata = {
  title: "Live Preview — Amorosi Labs",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  const mode = getPublicContentMode();
  const driver = getStorageDriver();

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-dark-bg text-primary-text">
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/30 bg-amber-500/10 px-4 py-2 backdrop-blur-sm">
        <p className="font-mono text-xs text-amber-200">
          ● LIVE PREVIEW — content mode:{" "}
          <span className="font-bold">{mode}</span> · driver:{" "}
          <span className="font-bold">{driver}</span>. This reflects admin
          (local-json) edits. The public Vercel site uses static content.
        </p>
        <div className="flex gap-3 text-xs">
          <Link href="/admin" className="text-amber-200 underline hover:text-white">
            ← Admin
          </Link>
          <Link href="/preview/projects" className="text-amber-200 underline hover:text-white">
            Preview projects
          </Link>
          <Link href="/" className="text-amber-200 underline hover:text-white">
            Public site
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
