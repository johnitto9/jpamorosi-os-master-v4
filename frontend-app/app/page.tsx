import type { Metadata } from 'next';
import Link from 'next/link';
import { profile } from '@/content/profile';
import { HallHero } from '@/components/hall/HallHero';
import { HallOfFameGrid } from '@/components/hall/HallOfFameGrid';
import { FeaturedSystemsGrid } from '@/components/hall/FeaturedSystemsGrid';
import { LabArchiveGrid } from '@/components/hall/LabArchiveGrid';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { GuidedTour } from '@/components/assistant/GuidedTour';
import { ContactSection } from '@/components/hall/ContactSection';
import { BeforeTheSystems, PortfolioSystemInterlude, LivingLayerInterlude, InterludeImagesProvider } from '@/components/hall/Interludes';
import { getSiteSettings } from '@/lib/media/store';
import { ChapterNav } from '@/components/ui/chapter-nav';
import { ScrollStage } from '@/components/ui/scroll-stage';
import { SectionTransition } from '@/components/ui/section-transition';
import { GlassAurora } from '@/components/ui/glass-aurora';
import { getPublicGroupedAuto } from '@/lib/projects/public-projects';
import { getDict } from '@/lib/i18n/server';
import { localizeProjects } from '@/lib/i18n/translate';
import { LanguageSwitch } from '@/components/ui/language-switch';
import { Mail } from 'lucide-react';
import { GitHubMark } from '@/components/ui/store-badges';
import { TechStack } from '@/components/ui/tech-badge';

// This portfolio's OWN stack — rendered server-side (zero client JS) and
// slotted into the INSIDE THE PROOF scene as proof chips under the claim.
const CV_STACK = [
  'Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'GSAP',
  'PostgreSQL', 'Cloudflare R2', 'OpenRouter', 'Docker', 'Resend',
];

// SSR so PROJECT_PUBLIC_CONTENT_MODE=live (Docker) reflects admin/local-json edits
// on the real Hall. On Vercel (mode=static) this reads the in-memory seed — safe,
// no filesystem writes, just SSR instead of SSG.
export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Amorosi Labs — primary home (Hall of Fame).
// The previous OS experience is preserved at /os.
//
// NOTE: the global layout applies `overflow: hidden` + `h-screen` to <body> for
// the OS experience. This page opts back into normal document scrolling with an
// internal `h-full overflow-y-auto` container, so the OS is never affected.
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Juan Pablo Amorosi — AI Product Engineer & Systems Architect',
  description:
    "Amorosi Labs is the Hall of Fame of Juan Pablo Amorosi's shipped systems: AI orchestration engines (LumenScript), production agent workflows (BBN), and live founder-built products (BuenPick).",
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Juan Pablo Amorosi — AI Product Engineer & Systems Architect',
    description:
      'The Hall of Fame of shipped AI systems: multi-model orchestration, production agent workflows, and live founder-built products.',
    url: '/',
  },
};

// NOTE: per-section aurora palettes were removed — the site background now
// cycles ONE fixed palette everywhere (no abrupt color jumps between scenes).

export default async function HomePage() {
  const grouped = await getPublicGroupedAuto();
  const { lang, t, r } = await getDict(); // al_lang cookie -> translated shell (SSR)
  const siteSettings = await getSiteSettings();
  const ilImages = siteSettings.interludes; // admin-managed interlude images
  // CONTENT follows the visitor too: project copy through the LLM translation
  // cache (EN passthrough; first render per language warms the cache once)
  const [hall, featured, archive] = await Promise.all([
    localizeProjects(grouped.hall, lang),
    localizeProjects(grouped.featured, lang),
    localizeProjects(grouped.archive, lang),
  ]);
  return (
    // no `scroll-smooth` class here — Lenis (ScrollStage) owns scroll physics
    <ScrollStage className="no-scrollbar relative h-full w-full overflow-y-auto overflow-x-hidden text-primary-text antialiased">
      <LanguageSwitch />
      <ChapterNav
        labels={{
          intro: t.navIntro,
          "hall-of-fame": t.navHall,
          featured: t.navFeatured,
          "lab-archive": t.navArchive,
          contact: t.navContact,
          // interlude segment names on the rail — follow the visitor's language
          "before-the-systems": t.il1.eyebrow,
          "inside-the-proof": t.il2.eyebrow,
          "living-layer": t.il3.eyebrow,
        }}
      />
      <div className="relative z-10">
      <HallHero profileImage={siteSettings.profileImage} />
      {/* Interludes drive their OWN scroll choreography (GSAP ScrollTrigger).
          They must NOT sit inside SectionTransition's transform, which creates a
          containing block that breaks the interlude's position:sticky stage. */}
      <InterludeImagesProvider images={ilImages}><BeforeTheSystems t={t.il1} /></InterludeImagesProvider>
      {/* The extra height (>100vh) + sticky pin is a desktop-only breather
          between GSAP scenes. On mobile it read as a dead "floor" (a short
          scroll where nothing moves), so the section flows normally there. */}
      <div className="relative lg:min-h-[110vh]">
        <div className="flex min-h-screen flex-col justify-center lg:sticky lg:top-0">
          <HallOfFameGrid
            projects={hall}
            header={{ eyebrow: t.hallEyebrow, title: t.hallTitle, description: t.hallDesc }}
            enterLabel={r.enter}
          />
          <div className="absolute inset-x-0 bottom-4 z-30 mx-auto w-full max-w-6xl px-6 text-center md:bottom-10">
            <Link
              href="/projects"
              className="inline-flex max-w-[92vw] items-center gap-1 rounded-full border border-cyan-300/20 bg-black/35 px-3 py-1.5 text-xs font-medium text-cyan-200 sm:px-4 sm:py-2 sm:text-sm backdrop-blur-md transition-colors hover:border-cyan-300/45 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {/* SE-class phones: the full label wrapped to two lines and sat
                  on top of the carousel controls — short variant under sm */}
              <span className="sm:hidden">{t.browseAllShort}</span>
              <span className="hidden sm:inline">{t.browseAll}</span>
            </Link>
          </div>
        </div>
      </div>
      <InterludeImagesProvider images={ilImages}><PortfolioSystemInterlude t={t.il2} stack={<TechStack items={CV_STACK} />} /></InterludeImagesProvider>
      <div className="relative lg:min-h-[106vh]">
        <div className="flex min-h-screen w-full items-center justify-center lg:sticky lg:top-0">
          <FeaturedSystemsGrid
            projects={featured}
            header={{ eyebrow: t.featuredEyebrow, title: t.featuredTitle, description: t.featuredDesc }}
            enterLabel={r.enter}
          />
        </div>
      </div>
      <InterludeImagesProvider images={ilImages}><LivingLayerInterlude t={t.il3} /></InterludeImagesProvider>
      <div className="relative lg:min-h-[106vh]">
        <div className="flex min-h-screen w-full items-center justify-center lg:sticky lg:top-0">
          <LabArchiveGrid
            projects={archive}
            header={{ eyebrow: t.archiveEyebrow, title: t.archiveTitle, description: t.archiveDesc }}
            enterLabel={r.enter}
          />
        </div>
      </div>

      {/* Hiring conversion band */}
      <SectionTransition>
      {/* scroll-mt-2 (not 20): anchor lands ON the section — the 80px offset
          was for a fixed header this page doesn't have, so /#contact and the
          rail/Orbe links were stopping visibly short of the section. */}
      <section id="contact" className="mx-auto max-w-6xl scroll-mt-2 px-6 pb-8 pt-8">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-8 sm:p-12">
          {/* cyan/violet ambient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(50% 90% at 15% 0%, rgba(0,242,255,0.12) 0%, transparent 60%), radial-gradient(50% 90% at 100% 100%, rgba(139,92,246,0.12) 0%, transparent 60%)',
            }}
          />
          {/* drifting glass-aurora light (replaces the dotted field) */}
          <GlassAurora tone="mixed" />
          {/* subtle amber horizon glow near the bottom */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            style={{
              background:
                'radial-gradient(60% 100% at 60% 100%, rgba(240,165,0,0.16) 0%, transparent 70%)',
            }}
          />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
                {t.contactEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                {t.contactTitle}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
                {t.contactBody}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={`mailto:${profile.links.email}`}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-cyan-400/60 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <Mail size={16} className="mr-2" aria-hidden />
                  {t.contactEmail}
                </a>
                {profile.links.github ? (
                  <a
                    href={profile.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <GitHubMark size={16} />
                    <span className="ml-2">GitHub</span>
                  </a>
                ) : null}
              </div>
            </div>
            {/* Real contact form — same Formspree inbox as the OS ContactApp */}
            <ContactSection t={t.contactForm} />
          </div>
        </div>
      </section>
      </SectionTransition>

      {/* CTA to explore the OS */}
      <SectionTransition>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          {/* drifting glass-aurora light — violet tone for the OS card */}
          <GlassAurora tone="violet" />
          <div className="relative">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              {t.osTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
              {t.osBody}
            </p>
            <Link
              href="/os"
              className="mt-6 inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-purple-400/60 hover:text-purple-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              {t.osCta}
            </Link>
          </div>
        </div>

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-8 text-xs text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} Amorosi Labs · Juan Pablo Amorosi</span>
          <span className="font-mono">First architecture. Then marble. Then neon.</span>
        </footer>
      </section>
      </SectionTransition>
      </div>
      <AssistantWidget />
      <GuidedTour />
    </ScrollStage>
  );
}
