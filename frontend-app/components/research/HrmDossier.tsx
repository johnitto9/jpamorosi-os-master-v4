"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Download, ExternalLink, FileText } from "lucide-react";
import {
  HRM_COPY,
  HRM_DOCUMENTS,
  detectHrmLanguage,
  type HrmDocument,
  type HrmLanguage,
} from "@/lib/research/hrm-amorosi";

function readParam<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && allowed.includes(value as T) ? value as T : fallback;
}

export function HrmDossier() {
  const readerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<HrmDocument>("foundations");
  const [language, setLanguage] = useState<HrmLanguage>("en");
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const copy = HRM_COPY[language];
  const pdf = HRM_DOCUMENTS[document][language];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const detected = detectHrmLanguage();
    setDocument(readParam(params.get("doc"), ["foundations", "blueprint"] as const, "foundations"));
    setLanguage(readParam(params.get("lang"), ["es", "en", "zh"] as const, detected));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("doc", document);
    params.set("lang", language);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [document, language]);

  useEffect(() => {
    setLoaded(false);
    setRevealed(false);
    readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pdf]);

  useEffect(() => {
    const node = endRef.current;
    if (!node || document !== "foundations") return;
    const observer = new IntersectionObserver(([entry]) => setRevealed(entry.isIntersecting), { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [document, loaded]);

  const update = (nextDocument: HrmDocument, nextLanguage = language) => {
    setDocument(nextDocument);
    setLanguage(nextLanguage);
  };

  const documentLabel = document === "foundations"
    ? language === "es" ? "Cimientos" : language === "zh" ? "基础说明" : "Foundations"
    : "Blueprint";

  return (
    <main className="hrm-shell">
      <div className="hrm-grain" aria-hidden="true" />
      <header className="hrm-header">
        <div>
          <p className="hrm-kicker">AMOROSI LABS · PRIVATE RESEARCH</p>
          <h1>{copy.title}</h1>
          <p className="hrm-subtitle">{copy.subtitle}</p>
        </div>
        <div className="hrm-mark" aria-hidden="true">01—02</div>
      </header>

      <section className="hrm-controls" aria-label="Dossier controls">
        <div className="hrm-control-group">
          <span className="hrm-control-label">{copy.document}</span>
          <div className="hrm-segmented" role="tablist" aria-label={copy.document}>
            {(["foundations", "blueprint"] as const).map((item) => (
              <button key={item} role="tab" aria-selected={document === item} className={document === item ? "active" : ""} onClick={() => update(item)}>
                {item === "foundations" ? (language === "es" ? "Cimientos" : language === "zh" ? "基础" : "Foundations") : "Blueprint"}
              </button>
            ))}
          </div>
        </div>
        <div className="hrm-control-group">
          <span className="hrm-control-label">{copy.language}</span>
          <div className="hrm-segmented" role="tablist" aria-label={copy.language}>
            {(["es", "en", "zh"] as const).map((item) => (
              <button key={item} role="tab" aria-selected={language === item} className={language === item ? "active" : ""} onClick={() => update(document, item)}>
                {item.toUpperCase() === "ZH" ? "中文" : item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="hrm-reader-wrap" ref={readerRef} aria-label={`${documentLabel} PDF`}>
        <div className="hrm-reader-meta">
          <div className="hrm-meta-title"><FileText size={15} aria-hidden="true" /> {documentLabel}</div>
          <span>PDF · {language.toUpperCase()}</span>
          <div className="hrm-actions">
            <a href={pdf} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" /> {copy.open}</a>
            <a href={pdf} download><Download size={14} aria-hidden="true" /> {copy.download}</a>
          </div>
        </div>
        <div className={`hrm-pdf-frame ${loaded ? "is-loaded" : ""}`}>
          {!loaded && <div className="hrm-loading"><span className="hrm-spinner" aria-hidden="true" />{copy.loading}</div>}
          <iframe key={pdf} src={`${pdf}#view=FitH`} title={`${documentLabel} — ${copy.label}`} onLoad={() => setLoaded(true)} />
        </div>
      </section>

      <div ref={endRef} className="hrm-end-sentinel" aria-hidden="true" />
      <section className={`hrm-continuation ${revealed ? "is-visible" : ""}`} aria-live="polite">
        <p className="hrm-kicker">{document === "foundations" ? "NEXT DOCUMENT" : "DOSSIER COMPLETE"}</p>
        <h2>{copy.reachedTitle}</h2>
        <p>{copy.reachedBody}</p>
        {document === "foundations" && <button onClick={() => update("blueprint")}><span>{copy.continue}</span><ArrowUpRight size={16} aria-hidden="true" /></button>}
      </section>

      <footer className="hrm-footer"><span>HRM—AMOROSI / v1.0</span><span>Research Dossier</span></footer>
    </main>
  );
}
