"use client";

// components/admin/ProjectForm.tsx — Admin 2.1 project editor.
// BBN-editor inspired: no tabs, one calm scrolling column of glass section
// cards (Identity / Story / Media / Links / Theme), a sticky action bar with
// Save + Published, and plug-and-play media: every asset is a drag & drop
// dropzone with instant preview (manual path input kept for existing assets).
// LIVE PREVIEW: the real HallOfFameCard renders sticky on the right.
// API contract unchanged: POST/PUT /api/admin/projects[/:slug].

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/content/projects";
import { HallOfFameCard } from "@/components/hall/HallOfFameCard";
import { MediaDropzone, MultiImageDrop } from "@/components/admin/MediaDropzone";

const TIERS = ["hall_of_fame", "featured", "archive"] as const;
const STATUSES = ["Live", "Platformizing", "R&D", "Prototype", "Paused"] as const;
const MOODS = ["ai-engine", "commerce", "media", "ops", "archive"] as const;

// newline OR comma separated -> string[]
const toList = (s: string): string[] =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
const fromList = (a?: string[]): string => (a ?? []).join("\n");

type Mode = "create" | "edit";

const EMPTY: Partial<Project> = {
  slug: "",
  title: "",
  labTitle: "",
  category: "",
  tier: "featured",
  status: "R&D",
  published: false,
  sortOrder: 100,
  oneLiner: "",
  proof: "",
  role: [],
  stack: [],
  highlights: [],
  architecture: { nodes: [], flow: [] },
  assets: {},
  theme: { accent: "#00f2ff", secondary: "#8b5cf6", glow: "rgba(0,242,255,0.2)", mood: "ai-engine" },
  aiSummary: "",
};

/** hex (#rrggbb) -> rgba glow string at 20% */
function glowFromAccent(hex: string): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return "rgba(0,242,255,0.2)";
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.2)`;
}

const input =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60";
const label = "block text-xs uppercase tracking-wider text-white/50";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">
          {title}
        </h2>
        {hint && <span className="text-right text-[11px] text-white/30">{hint}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function ProjectForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: Project | null;
}) {
  const router = useRouter();
  const p = { ...EMPTY, ...(initial ?? {}) } as Project;

  const [form, setForm] = useState({
    slug: p.slug ?? "",
    title: p.title ?? "",
    labTitle: p.labTitle ?? "",
    category: p.category ?? "",
    tier: p.tier ?? "featured",
    status: p.status ?? "R&D",
    published: !!p.published,
    sortOrder: p.sortOrder ?? 100,
    oneLiner: p.oneLiner ?? "",
    proof: p.proof ?? "",
    role: fromList(p.role),
    stack: fromList(p.stack),
    highlights: fromList(p.highlights),
    archNodes: fromList(p.architecture?.nodes),
    archFlow: fromList(p.architecture?.flow),
    accent: p.theme?.accent ?? "#00f2ff",
    secondary: p.theme?.secondary ?? "#8b5cf6",
    glow: p.theme?.glow ?? "rgba(0,242,255,0.2)",
    mood: p.theme?.mood ?? "ai-engine",
    logo: p.assets?.logo ?? "",
    heroImage: p.assets?.heroImage ?? "",
    backgroundImage: p.assets?.backgroundImage ?? "",
    heroVideo: p.assets?.heroVideo ?? "",
    heroVideoPoster: p.assets?.heroVideoPoster ?? "",
    screenshots: (p.assets?.screenshots ?? []) as string[],
    linkDemo: p.links?.demo ?? "",
    linkGithub: p.links?.github ?? "",
    linkPlaystore: p.links?.playstore ?? "",
    linkAppstore: p.links?.appstore ?? "",
    linkWebsite: p.links?.website ?? "",
    aiSummary: p.aiSummary ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v as never }));

  // Live preview project (same shape the home card consumes).
  const preview: Project = useMemo(
    () => ({
      id: form.slug || "preview",
      slug: form.slug || "preview",
      tier: form.tier as Project["tier"],
      status: form.status as Project["status"],
      published: form.published,
      sortOrder: Number(form.sortOrder) || 0,
      title: form.title || "Untitled project",
      labTitle: form.labTitle,
      category: form.category || "category",
      oneLiner: form.oneLiner || "One-liner appears here — short and sharp.",
      proof: form.proof,
      role: toList(form.role),
      stack: toList(form.stack),
      highlights: toList(form.highlights),
      architecture: { nodes: toList(form.archNodes), flow: toList(form.archFlow) },
      assets: {
        ...(form.logo.trim() ? { logo: form.logo.trim() } : {}),
        ...(form.heroImage.trim() ? { heroImage: form.heroImage.trim() } : {}),
      },
      theme: {
        accent: form.accent.trim() || "#00f2ff",
        secondary: form.secondary.trim() || "#8b5cf6",
        glow: form.glow.trim() || "rgba(0,242,255,0.2)",
        mood: form.mood as Project["theme"]["mood"],
      },
      aiSummary: form.aiSummary,
    }),
    [form],
  );

  function buildPayload() {
    const screenshots = form.screenshots.map((s) => s.trim()).filter(Boolean);
    return {
      slug: form.slug.trim(),
      title: form.title.trim(),
      labTitle: form.labTitle.trim(),
      category: form.category.trim(),
      tier: form.tier,
      status: form.status,
      published: form.published,
      sortOrder: Number(form.sortOrder) || 0,
      oneLiner: form.oneLiner.trim(),
      proof: form.proof.trim(),
      role: toList(form.role),
      stack: toList(form.stack),
      highlights: toList(form.highlights),
      architecture: { nodes: toList(form.archNodes), flow: toList(form.archFlow) },
      assets: {
        ...(form.logo.trim() ? { logo: form.logo.trim() } : {}),
        ...(form.heroImage.trim() ? { heroImage: form.heroImage.trim() } : {}),
        ...(form.backgroundImage.trim() ? { backgroundImage: form.backgroundImage.trim() } : {}),
        ...(form.heroVideo.trim() ? { heroVideo: form.heroVideo.trim() } : {}),
        ...(form.heroVideoPoster.trim() ? { heroVideoPoster: form.heroVideoPoster.trim() } : {}),
        ...(screenshots.length > 0 ? { screenshots } : {}),
      },
      links: {
        ...(form.linkDemo.trim() ? { demo: form.linkDemo.trim() } : {}),
        ...(form.linkGithub.trim() ? { github: form.linkGithub.trim() } : {}),
        ...(form.linkPlaystore.trim() ? { playstore: form.linkPlaystore.trim() } : {}),
        ...(form.linkAppstore.trim() ? { appstore: form.linkAppstore.trim() } : {}),
        ...(form.linkWebsite.trim() ? { website: form.linkWebsite.trim() } : {}),
      },
      theme: {
        accent: form.accent.trim(),
        secondary: form.secondary.trim(),
        glow: form.glow.trim(),
        mood: form.mood,
      },
      aiSummary: form.aiSummary.trim(),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload();
      const url =
        mode === "create"
          ? "/api/admin/projects"
          : `/api/admin/projects/${encodeURIComponent(p.slug)}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.message || data?.error || "Save failed.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit") return;
    if (!confirm(`Delete project "${p.slug}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${encodeURIComponent(p.slug)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.message || data?.error || "Delete failed.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function ColorField({
    name,
    value,
    onChange,
  }: {
    name: string;
    value: string;
    onChange: (v: string) => void;
  }) {
    const isHex = /^#[0-9a-f]{6}$/i.test(value.trim());
    return (
      <div>
        <label className={label}>{name}</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            aria-label={`${name} color picker`}
            value={isHex ? value.trim() : "#00f2ff"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-black/40 p-1"
          />
          <input
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {/* ------------------------------------------------ sticky action bar */}
      <div className="sticky top-2 z-30 mb-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#05060b]/85 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {form.title || (mode === "create" ? "New project" : p.slug)}
          </p>
          <p className="text-[11px] text-white/40">
            {form.tier} · {form.status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={form.published}
            onClick={() => set("published", !form.published)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              form.published
                ? "border-emerald-400/50 text-emerald-300"
                : "border-white/15 text-white/50 hover:text-white/80"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${form.published ? "bg-emerald-400" : "bg-white/30"}`}
            />
            {form.published ? "Published" : "Draft"}
          </button>
          {mode === "edit" && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/80 disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,360px)]">
        {/* ------------------------------------------------ editor column */}
        <div className="space-y-6">
          <Section title="Identity" hint="what the card says">
            {/* BBN-style hero input: the title IS the headline */}
            <input
              className="w-full border-none bg-transparent text-3xl font-bold text-white outline-none placeholder:text-white/20 sm:text-4xl"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Project title"
              aria-label="Title"
              required
            />
            <div>
              <input
                className="w-full border-none bg-transparent text-base text-white/70 outline-none placeholder:text-white/20"
                value={form.oneLiner}
                onChange={(e) => set("oneLiner", e.target.value)}
                placeholder="One-liner — short and sharp (card subtitle)"
                aria-label="One-liner"
                maxLength={160}
              />
              <p className="mt-1 text-right text-[11px] text-white/25">
                {form.oneLiner.length}/160
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Slug</label>
                <input
                  className={input}
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  disabled={mode === "edit"}
                  placeholder="lumenscript"
                  required
                />
                {mode === "edit" && (
                  <p className="mt-1 text-[11px] text-white/30">Slug is immutable.</p>
                )}
              </div>
              <div>
                <label className={label}>Category</label>
                <input
                  className={input}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="AI Engine"
                />
              </div>
              <div>
                <label className={label}>Lab title</label>
                <input
                  className={input}
                  value={form.labTitle}
                  onChange={(e) => set("labTitle", e.target.value)}
                />
              </div>
              <div>
                <label className={label}>Tier</label>
                <select className={input} value={form.tier} onChange={(e) => set("tier", e.target.value)}>
                  {TIERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Status</label>
                <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Order</label>
                <input
                  type="number"
                  className={input}
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="Story" hint="the room narrative">
            <div>
              <label className={label}>Proof (why it matters)</label>
              <textarea className={input} rows={3} value={form.proof} onChange={(e) => set("proof", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Role (one per line)</label>
                <textarea className={input} rows={4} value={form.role} onChange={(e) => set("role", e.target.value)} />
              </div>
              <div>
                <label className={label}>Stack (one per line)</label>
                <textarea className={input} rows={4} value={form.stack} onChange={(e) => set("stack", e.target.value)} />
              </div>
              <div>
                <label className={label}>Highlights (one per line)</label>
                <textarea className={input} rows={4} value={form.highlights} onChange={(e) => set("highlights", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Architecture nodes</label>
                <textarea className={input} rows={3} value={form.archNodes} onChange={(e) => set("archNodes", e.target.value)} />
              </div>
              <div>
                <label className={label}>Architecture flow</label>
                <textarea className={input} rows={3} value={form.archFlow} onChange={(e) => set("archFlow", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>Founder note / AI summary</label>
              <textarea className={input} rows={3} value={form.aiSummary} onChange={(e) => set("aiSummary", e.target.value)} />
            </div>
          </Section>

          <Section
            title="Media"
            hint="drag & drop — stored locally, Cloudflare-ready (docs/CLOUDFLARE_MEDIA.md)"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaDropzone
                label="Hero image (the card visual)"
                kind="image"
                value={form.heroImage}
                onChange={(v) => set("heroImage", v)}
              />
              <MediaDropzone
                label="Logo"
                kind="image"
                value={form.logo}
                onChange={(v) => set("logo", v)}
              />
              <MediaDropzone
                label="Background image"
                kind="image"
                value={form.backgroundImage}
                onChange={(v) => set("backgroundImage", v)}
              />
              <MediaDropzone
                label="Video poster"
                kind="image"
                value={form.heroVideoPoster}
                onChange={(v) => set("heroVideoPoster", v)}
              />
            </div>
            <MediaDropzone
              label="Room video (loops behind the Hall when selected)"
              kind="video"
              value={form.heroVideo}
              onChange={(v) => set("heroVideo", v)}
            />
            <MultiImageDrop
              label="Screenshots (room gallery)"
              values={form.screenshots}
              onChange={(v) => set("screenshots", v)}
            />
          </Section>

          <Section title="Links" hint="stores & live surfaces">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Live demo</label>
                <input className={input} value={form.linkDemo} onChange={(e) => set("linkDemo", e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className={label}>Website</label>
                <input className={input} value={form.linkWebsite} onChange={(e) => set("linkWebsite", e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className={label}>Google Play</label>
                <input className={input} value={form.linkPlaystore} onChange={(e) => set("linkPlaystore", e.target.value)} placeholder="https://play.google.com/…" />
              </div>
              <div>
                <label className={label}>App Store</label>
                <input className={input} value={form.linkAppstore} onChange={(e) => set("linkAppstore", e.target.value)} placeholder="https://apps.apple.com/…" />
              </div>
              <div>
                <label className={label}>GitHub</label>
                <input className={input} value={form.linkGithub} onChange={(e) => set("linkGithub", e.target.value)} placeholder="https://github.com/…" />
              </div>
            </div>
          </Section>

          <Section title="Theme" hint="brand colors feed the glow & beams">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField name="Accent" value={form.accent} onChange={(v) => set("accent", v)} />
              <ColorField name="Secondary" value={form.secondary} onChange={(v) => set("secondary", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Glow (rgba)</label>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-9 w-10 shrink-0 rounded-lg border border-white/10"
                    style={{ background: form.glow }}
                  />
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                    value={form.glow}
                    onChange={(e) => set("glow", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set("glow", glowFromAccent(form.accent))}
                  className="mt-2 text-xs text-cyan-300 hover:underline"
                >
                  ↳ derive from accent
                </button>
              </div>
              <div>
                <label className={label}>Mood</label>
                <select className={input} value={form.mood} onChange={(e) => set("mood", e.target.value)}>
                  {MOODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>
        </div>

        {/* ------------------------------------------------ live preview */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
            Live preview — home card
          </p>
          <HallOfFameCard project={preview} />
        </aside>
      </div>
    </form>
  );
}
