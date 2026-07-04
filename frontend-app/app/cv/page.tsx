import type { Metadata } from "next";
import Link from "next/link";
import { buildCvData } from "@/lib/cv/build-cv-data";
import { PrintButton } from "@/components/cv/PrintButton";

export const metadata: Metadata = {
  title: "CV — Juan Pablo Amorosi",
  description:
    "Print-friendly CV for Juan Pablo Amorosi — AI Product Engineer & Systems Architect. Built from real project and capability data.",
  alternates: { canonical: "/cv" },
};

export default function CvPage() {
  const cv = buildCvData();

  return (
    <main className="h-full w-full overflow-y-auto bg-white text-neutral-900 print:h-auto print:overflow-visible">
      <div className="mx-auto max-w-3xl px-8 py-10">
        {/* toolbar (hidden on print) */}
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
            ← Amorosi Labs
          </Link>
          <PrintButton />
        </div>

        {/* header */}
        <header className="border-b border-neutral-200 pb-5">
          <h1 className="text-3xl font-bold">{cv.name}</h1>
          <p className="mt-1 text-lg text-neutral-700">{cv.role}</p>
          <p className="mt-1 text-sm text-neutral-500">{cv.location} · {cv.languages.join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
            {cv.links.map((l) => (
              <a key={l.href} href={l.href} className="underline">{l.label}</a>
            ))}
          </div>
        </header>

        {/* summary */}
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-800">{cv.summary}</p>
        </section>

        {/* capabilities */}
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Capabilities (evidence-based)</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-800">
            {cv.capabilities.map((c) => (
              <li key={c.capability}>
                <span className="font-medium">{c.capability}</span>
                <span className="text-neutral-500"> — {c.provenIn.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* flagship projects */}
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Flagship systems</h2>
          <div className="mt-2 space-y-4">
            {cv.flagship.map((p) => (
              <div key={p.slug} className="break-inside-avoid">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold">{p.title}</h3>
                  <span className="text-xs text-neutral-500">{p.category} · {p.status}</span>
                </div>
                <p className="text-sm text-neutral-800">{p.oneLiner}</p>
                <p className="mt-0.5 text-sm italic text-neutral-600">{p.proof}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{p.stack.join(" · ")}</p>
              </div>
            ))}
          </div>
        </section>

        {/* featured projects */}
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Featured systems</h2>
          <div className="mt-2 space-y-3">
            {cv.featured.map((p) => (
              <div key={p.slug} className="break-inside-avoid">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{p.title}</h3>
                  <span className="text-xs text-neutral-500">{p.category} · {p.status}</span>
                </div>
                <p className="text-sm text-neutral-700">{p.oneLiner}</p>
              </div>
            ))}
          </div>
        </section>

        {/* stack */}
        <section className="mt-6 pb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Stack &amp; tooling</h2>
          <p className="mt-2 text-sm text-neutral-700">{cv.stack.join(" · ")}</p>
        </section>
      </div>
    </main>
  );
}
