import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SceneSetter } from "@/components/visual/SceneController";

// Admin is intentionally not linked from the public site and not indexed.
export const metadata: Metadata = {
  title: "Admin — Amorosi Labs",
  robots: { index: false, follow: false },
};

// The global layout locks <body> to overflow:hidden for the OS. Admin opts back
// into normal scrolling with its own container. SceneSetter keeps the aurora
// on an emerald/cyan backoffice palette so the brand still reads here.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-y-auto bg-dark-bg text-primary-text">
      <SceneSetter palette={["#00e0a4", "#1E67C6", "#00f2ff", "#8b5cf6"]} />
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
