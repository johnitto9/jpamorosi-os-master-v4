"use client";

import Link from "next/link";
import type { AssistantAction } from "@/lib/assistant/types";

// Renders a structured assistant action as a safe internal link / mailto.
// Every click tells the widget to CLOSE (al-assistant-close) so the panel
// never covers the section it just sent you to; same-page hash targets skip
// the router entirely and scroll instantly (no perceptible lag).
function closePanel() {
  window.dispatchEvent(new Event("al-assistant-close"));
}

export function AssistantActionButton({ action }: { action: AssistantAction }) {
  const cls =
    "inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400";

  if (action.type === "external") {
    return (
      <a
        href={action.href}
        className={cls}
        target={action.href.startsWith("http") ? "_blank" : undefined}
        rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
        onClick={closePanel}
      >
        {action.label}
      </a>
    );
  }

  const href = action.type === "show_project" ? `/projects/${action.projectSlug}` : action.href;

  const onClick = (e: React.MouseEvent) => {
    closePanel();
    // "/#section" while already on "/" -> direct smooth scroll, zero router hop
    const hash = href.startsWith("/#") ? href.slice(1) : null;
    if (hash && window.location.pathname === "/") {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <Link href={href} className={cls} onClick={onClick} prefetch>
      {action.label}
    </Link>
  );
}

export default AssistantActionButton;
