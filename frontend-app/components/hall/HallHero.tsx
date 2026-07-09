// components/hall/HallHero.tsx
// Path: components/hall/HallHero.tsx
// Inputs: none (reads profile + capabilities + public projects for evidence).
// Outputs: the Amorosi Labs hero — identity, thesis, CTAs, capability matrix.
// State: none (server component; CSS-only, static-safe).
// Data source: content/profile.ts, content/capabilities.ts, public-projects.
// Failure mode: renders text-only hero if avatar image missing (SmartImage).

import Link from "next/link";
import { profile } from "@/content/profile";
import { localizeCapabilities } from "@/lib/i18n/translate";
import { SmartImage } from "@/components/design-system/SmartImage";
import { HolographicCard } from "@/components/ui/holographic-card";
import { OrbitalWave } from "@/components/ui/orbital-wave";
import { Reveal } from "@/components/ui/reveal";
import { getDict } from "@/lib/i18n/server";
import { resolveMediaUrl } from "@/lib/media/resolve";
import { HeroStartButton } from "./HeroStartButton";
import { SwipeCue } from "./SwipeCue";

const cta =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

// tick colors cycle subtly (cyan / emerald / violet) for the capability list
const TICKS = ["bg-cyan-400", "bg-emerald-400", "bg-violet-400"];

// Highlight the "AI-powered" phrase in the tagline with teal.
function renderTagline(tagline: string) {
  const parts = tagline.split(/(AI-powered)/i);
  return parts.map((p, i) =>
    /^AI-powered$/i.test(p) ? (
      <span key={i} className="text-cyan-300">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export async function HallHero({ profileImage }: { profileImage?: string } = {}) {
  const { lang, t } = await getDict(); // first section fully translated (SSR)
  // the small-print capability matrix follows the visitor too (LLM cache)
  const capabilities = await localizeCapabilities(lang);

  return (
    <section id="intro" className="relative overflow-hidden">
      {/* Background is the site-wide AuroraLayer mounted by the RootLayout — no
          local background here so the global palette reads through everywhere. */}

      <div className="relative mx-auto grid max-w-6xl gap-7 px-6 pb-10 pt-12 md:grid-cols-[1.4fr_1fr] md:gap-10 md:py-28">
        <div className="contents md:block">
          <div className="order-1">
          <Reveal delay={0.05}>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            {profile.lab} · Proof Rooms
          </p>

          <h1 data-text={profile.name} className="lab-shimmer-text text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            {profile.name}
          </h1>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.2em] text-white/60 sm:text-base">
            {t.heroRole}
          </p>
          </Reveal>

          <Reveal delay={0.18}>
          <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
            {renderTagline(t.heroTagline)}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            {t.heroThesis}
          </p>
          </Reveal>
          </div>

          <Reveal delay={0.28} className="order-2 mt-1 flex flex-wrap gap-3 md:mt-8">
            <HeroStartButton label={t.heroStart} />
            <Link
              href="/os"
              className={`${cta} border border-white/20 text-white hover:border-purple-400/60 hover:text-purple-300`}
            >
              {t.heroCta3}
            </Link>
          </Reveal>

          {/* Evidence-based capability matrix (no skill bars) */}
          <Reveal delay={0.38} className="order-4 mt-7 md:mt-10">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
              {t.heroCaps}
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {capabilities.map((c, i) => (
                <li
                  key={c.capability}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] px-3.5 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-colors hover:border-white/20"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-3 left-0 w-px rounded-full"
                    style={{
                      background:
                        i % 3 === 0
                          ? "linear-gradient(#22d3ee, transparent)"
                          : i % 3 === 1
                            ? "linear-gradient(#34d399, transparent)"
                            : "linear-gradient(#a78bfa, transparent)",
                    }}
                  />
                  <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${TICKS[i % TICKS.length]}`}
                  />
                  <span className="text-white/85">{c.capability}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="order-3 relative flex items-center justify-center py-1 md:order-none md:py-10">
          <div className="relative w-full max-w-[240px] sm:max-w-xs">
            {/* soft bloom behind the card */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-20 -z-0 rounded-[50%] opacity-70 blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(0,242,255,0.20), rgba(139,92,246,0.15) 55%, transparent 78%)",
              }}
            />
            {/* orbital ring — BACK half behind the card */}
            <div className="pointer-events-none absolute -inset-x-28 -inset-y-8 z-0">
              <OrbitalWave part="back" />
            </div>

          <HolographicCard className="relative z-10 w-full border border-white/10 bg-black/50 p-2.5 backdrop-blur-sm md:p-3">
            <div className="relative overflow-hidden rounded-xl border border-white/10">
              <SmartImage
                src={resolveMediaUrl(profileImage) ?? profile.avatar}
                alt={`${profile.name} — ${profile.role}`}
                priority
                accent="#00f2ff"
                sizes="(max-width: 768px) 240px, 320px"
                className="aspect-[4/5] w-full"
              />
              {/* subtle cyan/violet rim */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{ boxShadow: "inset 0 0 40px -12px rgba(0,242,255,0.35)" }}
              />
            </div>
            <div className="mt-2 border-t border-white/10 pt-2 text-center md:mt-3 md:pt-3">
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-white">
                <span className="lab-livedot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                {profile.location}
              </p>
              <p className="text-xs text-white/50">
                {t.heroLangs}
              </p>
            </div>
          </HolographicCard>

            {/* orbital ring — FRONT half over the card (wraps it in 3D) */}
            <div className="pointer-events-none absolute -inset-x-28 -inset-y-8 z-20">
              <OrbitalWave part="front" />
            </div>
          </div>
        </Reveal>
      </div>

      {/* scroll cue: invites the cinematic journey below */}
      <div className="relative -mt-1 flex flex-col items-center pb-6 md:-mt-6 md:pb-8">
        {/* mobile: animated swipe-down hand (only-down gesture) */}
        <SwipeCue className="md:hidden" label="swipe" tone="cyan" />
        {/* desktop: slim capsule with a dot sliding down */}
        <div className="pointer-events-none hidden flex-col items-center gap-2 md:flex">
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1.5">
            <span className="lab-scrollcue-dot h-1.5 w-1.5 rounded-full bg-cyan-300" />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-white/35">scroll</span>
        </div>
      </div>
    </section>
  );
}

export default HallHero;
