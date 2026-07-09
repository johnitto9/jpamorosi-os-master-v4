"use client";

// components/admin/TierReorder.tsx
// Drag-to-reorder project list per tier (Hall / Featured / Archive). Rows are
// framer-motion Reorder items; dropping PERSISTS immediately: every project in
// the group gets sortOrder = (index+1) * 10 via the existing PUT patch API,
// then router.refresh() re-reads the server truth. The home reads sortOrder,
// so the drop IS the new public order.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

export type TierRow = {
  slug: string;
  title: string;
  status: string;
  sortOrder: number;
  stackCount: number;
  published: boolean;
};

function Row({ p, onCommit }: { p: TierRow; onCommit: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={p.slug}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onCommit}
      className="flex items-center gap-2 border-b border-white/5 bg-transparent px-2 py-3 last:border-b-0 hover:bg-white/[0.02]"
    >
      <button
        type="button"
        aria-label={`Reorder ${p.title}`}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/70 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-white">{p.title}</div>
        <div className="truncate text-xs text-white/40">{p.slug}</div>
      </div>
      <div className="hidden w-28 text-sm text-white/70 sm:block">{p.status}</div>
      <div className="w-10 text-center text-sm text-white/50">{p.stackCount}</div>
      <div className="w-10 text-center text-sm">
        {p.published ? <span className="text-emerald-400">yes</span> : <span className="text-white/40">no</span>}
      </div>
      <div className="flex shrink-0 justify-end gap-3 text-sm">
        <Link href={`/admin/projects/${p.slug}`} className="text-cyan-300 hover:underline">Edit</Link>
        <Link href={`/preview/projects/${p.slug}`} className="hidden text-amber-300 hover:underline sm:inline" target="_blank">Preview</Link>
      </div>
    </Reorder.Item>
  );
}

export function TierReorder({
  title,
  accent,
  items,
}: {
  title: string;
  accent: string;
  items: TierRow[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items.map((p) => p.slug));
  const orderRef = useRef(order);
  orderRef.current = order;
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  // a server refresh (or an edit elsewhere) re-sends items — resync local order
  useEffect(() => setOrder(items.map((p) => p.slug)), [items]);

  if (items.length === 0) return null;
  const bySlug = new Map(items.map((p) => [p.slug, p]));

  function commit() {
    const next = orderRef.current;
    const original = items.map((x) => x.slug).join("|");
    if (next.join("|") === original || saving) return;
    setSaving(true);
    // (index+1)*10 within the tier — the home sorts each tier independently
    void Promise.all(
      next.map((slug, i) =>
        fetch(`/api/admin/projects/${encodeURIComponent(slug)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: (i + 1) * 10 }),
        }),
      ),
    )
      .then(() => {
        setSavedTick(true);
        window.setTimeout(() => setSavedTick(false), 1600);
        router.refresh();
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="mt-8">
      <h2
        className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
        style={{ color: accent }}
      >
        {title}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">{items.length}</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-white/35">
          — drag ⠿ to set the home order
        </span>
        {saving && <span className="text-[10px] normal-case text-cyan-300">saving…</span>}
        {savedTick && !saving && <span className="text-[10px] normal-case text-emerald-400">✓ saved</span>}
      </h2>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="overflow-hidden rounded-xl border border-white/10 px-2"
      >
        {order.map((slug) => {
          const p = bySlug.get(slug);
          return p ? <Row key={slug} p={p} onCommit={commit} /> : null;
        })}
      </Reorder.Group>
    </div>
  );
}

export default TierReorder;
