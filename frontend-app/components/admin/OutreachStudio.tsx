"use client";

// components/admin/OutreachStudio.tsx
// The Outreach Studio editor. Left: category + form (fields from the registry).
// Right: an isolated iframe preview rendered by the SAME endpoint that feeds the
// send path. Below: recent send history from email_logs. One careful email at a
// time — confirm the recipient, then send through the central transport.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Type-only imports (erased at build — no server code reaches the client).
type FieldType = "text" | "email" | "textarea" | "url" | "select" | "checkbox";
type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  group: "common" | "body";
  placeholder?: string;
  help?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
};
type TemplateMeta = {
  key: string;
  label: string;
  description: string;
  outboundGated: boolean;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
};

export type StudioPreload = {
  template: string;
  prospectId?: number;
  data: Record<string, unknown>;
};

type Status = {
  resendConfigured: boolean;
  outboundEnabled: boolean;
  dbConfigured: boolean;
  adminTo: string;
};

type FormValue = string | boolean;
type FormState = Record<string, FormValue>;

type EmailLog = {
  id: number;
  template: string;
  toEmail: string;
  subject: string;
  ok: boolean;
  providerId: string | null;
  error: string | null;
  createdAt: string;
};

const LS_PREFIX = "outreach-studio:v1:";
const norm = (s: string) => s.trim().toLowerCase();
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function initForm(meta: TemplateMeta, preload?: Record<string, unknown>): FormState {
  const f: FormState = {};
  for (const field of meta.fields) {
    if (field.type === "checkbox") f[field.name] = Boolean(meta.defaults[field.name]);
    else f[field.name] = String(meta.defaults[field.name] ?? "");
  }
  if (preload) {
    for (const [k, v] of Object.entries(preload)) {
      if (typeof v === "boolean") f[k] = v;
      else if (v != null) f[k] = String(v);
    }
  }
  return f;
}

export function OutreachStudio({
  catalogue,
  status,
  preload,
  initialTemplate,
}: {
  catalogue: TemplateMeta[];
  status: Status;
  preload: StudioPreload | null;
  initialTemplate: string;
}) {
  const byKey = useMemo(() => Object.fromEntries(catalogue.map((t) => [t.key, t])), [catalogue]);
  const firstKey =
    (preload?.template && byKey[preload.template] && preload.template) ||
    (byKey[initialTemplate] && initialTemplate) ||
    catalogue[0]?.key;

  const [templateKey, setTemplateKey] = useState<string>(firstKey);
  const [forms, setForms] = useState<Record<string, FormState>>(() => {
    const out: Record<string, FormState> = {};
    for (const meta of catalogue) {
      const usePreload = preload && preload.template === meta.key ? preload.data : undefined;
      out[meta.key] = initForm(meta, usePreload);
    }
    return out;
  });
  const [subjects, setSubjects] = useState<Record<string, string>>(() =>
    Object.fromEntries(catalogue.map((t) => [t.key, ""])),
  );
  const [prospectId] = useState<number | undefined>(preload?.prospectId);

  // Hydrate autosaved drafts (skip the template that arrived preloaded).
  useEffect(() => {
    setForms((prev) => {
      const next = { ...prev };
      for (const meta of catalogue) {
        if (preload && preload.template === meta.key) continue;
        try {
          const raw = localStorage.getItem(LS_PREFIX + meta.key);
          if (!raw) continue;
          const saved = JSON.parse(raw) as { data?: Record<string, unknown>; subject?: string };
          if (saved?.data && typeof saved.data === "object") {
            next[meta.key] = initForm(meta, saved.data);
          }
          if (typeof saved?.subject === "string") {
            setSubjects((s) => ({ ...s, [meta.key]: saved.subject as string }));
          }
        } catch {
          /* tolerate corrupt / older drafts */
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = byKey[templateKey];
  const form = forms[templateKey] ?? {};
  const subjectOverride = subjects[templateKey] ?? "";

  // Autosave (debounced) per category.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          LS_PREFIX + templateKey,
          JSON.stringify({ data: form, subject: subjectOverride }),
        );
      } catch {
        /* private mode / quota — non-fatal */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [templateKey, form, subjectOverride]);

  const setField = useCallback(
    (name: string, value: FormValue) => {
      setForms((prev) => ({ ...prev, [templateKey]: { ...prev[templateKey], [name]: value } }));
    },
    [templateKey],
  );

  // ---- live preview ----------------------------------------------------------
  const [preview, setPreview] = useState<{
    html: string;
    text: string;
    subject: string;
    warnings: string[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewReq = useRef(0);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const reqId = ++previewReq.current;
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/admin/email/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            template: templateKey,
            data: form,
            subjectOverride: subjectOverride || undefined,
            prospectId,
          }),
        });
        if (reqId !== previewReq.current) return; // stale
        if (!res.ok) {
          setPreviewError("El borrador actual no valida; se muestra el último preview válido.");
          return;
        }
        const json = await res.json();
        setPreview({ html: json.html, text: json.text, subject: json.subject, warnings: json.warnings ?? [] });
        setPreviewError(null);
      } catch {
        if (reqId === previewReq.current) setPreviewError("No se pudo generar el preview.");
      } finally {
        if (reqId === previewReq.current) setPreviewLoading(false);
      }
    }, 320);
    return () => clearTimeout(handle);
  }, [templateKey, form, subjectOverride, prospectId]);

  // ---- history ---------------------------------------------------------------
  const composerKeys = useMemo(() => new Set(catalogue.map((t) => t.key)), [catalogue]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/email-logs");
      if (!res.ok) return;
      const json = await res.json();
      const all: EmailLog[] = json.logs ?? [];
      const mine = all.filter((l) => composerKeys.has(l.template));
      setLogs((mine.length ? mine : all).slice(0, 15));
    } catch {
      /* non-fatal */
    }
  }, [composerKeys]);
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // ---- send ------------------------------------------------------------------
  const email = String(form.email ?? "");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const recipientOk = isEmail(email);
  const confirmOk = recipientOk && norm(confirm) === norm(email);
  const outboundBlocked = meta?.outboundGated && !status.outboundEnabled;
  const canSend =
    !sending && recipientOk && confirmOk && !!status.resendConfigured && !outboundBlocked;

  const SEND_ERRORS: Record<string, string> = {
    recipient_mismatch: "El destinatario confirmado no coincide.",
    noreply_recipient: "Esa dirección parece un buzón noreply — no se puede contactar.",
    outbound_disabled: "La compuerta de outbound está deshabilitada (OUTBOUND_LEAD_EMAILS_ENABLED).",
    unknown_template: "Plantilla desconocida.",
    invalid_data: "Faltan campos o hay datos inválidos.",
    invalid_body: "Payload inválido.",
    skipped_no_api_key: "Resend no está configurado en este entorno.",
    email_not_sent: "Resend rechazó el envío. Revisá el historial.",
  };

  const send = useCallback(async () => {
    if (sending) return; // double-click / concurrent guard
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: email.trim(),
          template: templateKey,
          data: form,
          subjectOverride: subjectOverride || undefined,
          prospectId,
          confirmRecipient: confirm.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setSendMsg({
          kind: "ok",
          text: `Enviado a ${email.trim()}${json.providerId ? ` · ${json.providerId}` : ""}${
            json.prospectMarked ? " · prospect marcado como contactado" : ""
          }.`,
        });
        setConfirm("");
        void loadHistory();
      } else {
        const code = String(json.error ?? "email_not_sent");
        setSendMsg({ kind: "err", text: SEND_ERRORS[code] ?? `No se pudo enviar (${code}).` });
      }
    } catch {
      setSendMsg({ kind: "err", text: "Error de red al enviar." });
    } finally {
      setSending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sending, email, templateKey, form, subjectOverride, prospectId, confirm, loadHistory]);

  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [viewMode, setViewMode] = useState<"html" | "text">("html");

  const commonFields = (meta?.fields ?? []).filter((f) => f.group === "common");
  const bodyFields = (meta?.fields ?? []).filter((f) => f.group === "body");

  return (
    <div className="mt-6">
      <StatusBadges status={status} />

      {/* category selector */}
      <div className="mt-4 flex flex-wrap gap-2">
        {catalogue.map((t) => (
          <button
            key={t.key}
            onClick={() => setTemplateKey(t.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              t.key === templateKey
                ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {meta && <p className="mt-2 text-xs text-white/40">{meta.description}</p>}

      {/* mobile tab switch */}
      <div className="mt-4 flex gap-1 rounded-lg border border-white/10 p-1 lg:hidden">
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm ${
              mobileTab === tab ? "bg-white/10 text-white" : "text-white/50"
            }`}
          >
            {tab === "edit" ? "Editar" : "Previsualizar"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[45fr_55fr]">
        {/* EDITOR */}
        <div className={`${mobileTab === "edit" ? "block" : "hidden"} lg:block`}>
          <Section title="Destinatario y encabezado">
            {commonFields.map((f) => (
              <Field key={f.name} field={f} value={form[f.name]} onChange={setField} />
            ))}
            <div>
              <label className="mb-1 block text-xs font-medium text-white/60">Asunto</label>
              <input
                value={subjectOverride}
                onChange={(e) => setSubjects((s) => ({ ...s, [templateKey]: e.target.value }))}
                placeholder={preview?.subject || "Se genera automáticamente si lo dejás vacío"}
                className={inputCls}
              />
              <p className="mt-1 text-[11px] text-white/35">
                Vacío = se usa el asunto generado: <span className="text-white/55">{preview?.subject || "…"}</span>
              </p>
            </div>
          </Section>

          <Section title="Contenido">
            {bodyFields.map((f) => (
              <Field key={f.name} field={f} value={form[f.name]} onChange={setField} />
            ))}
          </Section>

          {/* send panel */}
          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <label className="mb-1 block text-xs font-medium text-white/60">
              Confirmá el destinatario para habilitar el envío
            </label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={recipientOk ? email : "Primero completá un email válido arriba"}
              className={inputCls}
              autoComplete="off"
              spellCheck={false}
            />
            {!recipientOk && email.length > 0 && (
              <p className="mt-1 text-[11px] text-amber-300/80">El email del destinatario no es válido.</p>
            )}
            {recipientOk && confirm.length > 0 && !confirmOk && (
              <p className="mt-1 text-[11px] text-amber-300/80">No coincide con el email de arriba.</p>
            )}
            {outboundBlocked && (
              <p className="mt-2 rounded-md border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] text-amber-200">
                El preview funciona, pero el envío externo está bloqueado por la compuerta de outbound.
              </p>
            )}
            {sendMsg && (
              <p
                className={`mt-2 rounded-md px-3 py-2 text-xs ${
                  sendMsg.kind === "ok"
                    ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border border-red-400/30 bg-red-400/10 text-red-200"
                }`}
              >
                {sendMsg.text}
              </p>
            )}
            <button
              onClick={send}
              disabled={!canSend}
              className="mt-3 w-full rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "Enviando…" : `Enviar${recipientOk ? ` a ${email.trim()}` : ""}`}
            </button>
            <p className="mt-2 text-center text-[10px] text-white/30">
              Se envía por Resend a través del servicio central · tracking y logs preservados
            </p>
          </div>
        </div>

        {/* PREVIEW */}
        <div className={`${mobileTab === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>Preview</span>
                {previewLoading && <span className="text-cyan-300/70">actualizando…</span>}
              </div>
              <div className="flex gap-1 rounded-lg border border-white/10 p-0.5 text-xs">
                {(["html", "text"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`rounded-md px-2.5 py-1 ${
                      viewMode === m ? "bg-white/10 text-white" : "text-white/50"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs">
              <span className="text-white/40">Asunto:</span>{" "}
              <span className="text-white/90">{preview?.subject ?? "…"}</span>
            </div>

            {previewError && (
              <p className="mt-2 rounded-md border border-amber-400/25 bg-amber-400/5 px-3 py-1.5 text-[11px] text-amber-200/90">
                {previewError}
              </p>
            )}
            {preview?.warnings?.map((w) => (
              <p key={w} className="mt-2 rounded-md border border-amber-400/25 bg-amber-400/5 px-3 py-1.5 text-[11px] text-amber-200/90">
                {w}
              </p>
            ))}

            <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#07070f]">
              {viewMode === "html" ? (
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={preview?.html ?? ""}
                  className="h-[620px] w-full bg-[#07070f]"
                />
              ) : (
                <pre className="h-[620px] w-full overflow-auto whitespace-pre-wrap p-4 text-xs text-white/70">
                  {preview?.text ?? ""}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* history */}
      <div className="mt-8">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white/70 hover:border-white/20"
        >
          <span>Envíos recientes {logs.length ? `(${logs.length})` : ""}</span>
          <span className="text-white/40">{historyOpen ? "▲" : "▼"}</span>
        </button>
        {historyOpen && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-white/10">
            {logs.length === 0 ? (
              <p className="p-4 text-sm text-white/40">Todavía no hay envíos registrados.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="text-white/40">
                  <tr className="border-b border-white/10">
                    <th className="p-2.5 font-medium">Fecha</th>
                    <th className="p-2.5 font-medium">Destinatario</th>
                    <th className="p-2.5 font-medium">Categoría</th>
                    <th className="p-2.5 font-medium">Asunto</th>
                    <th className="p-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-white/5 text-white/70">
                      <td className="whitespace-nowrap p-2.5 text-white/45">{l.createdAt.slice(0, 16).replace("T", " ")}</td>
                      <td className="p-2.5">{l.toEmail}</td>
                      <td className="p-2.5 text-white/50">{byKey[l.template]?.label ?? l.template}</td>
                      <td className="max-w-[220px] truncate p-2.5" title={l.subject}>{l.subject}</td>
                      <td className="p-2.5">
                        {l.ok ? (
                          <span className="text-emerald-300" title={l.providerId ?? undefined}>ok</span>
                        ) : (
                          <span className="text-red-300" title={l.error ?? undefined}>error</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FormValue;
  onChange: (name: string, value: FormValue) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(field.name, e.target.checked)}
          className="h-4 w-4 accent-cyan-400"
        />
        {field.label}
      </label>
    );
  }
  const str = typeof value === "string" ? value : "";
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-white/60">
        {field.label}
        {field.required && <span className="text-cyan-300"> *</span>}
      </label>
      {field.type === "select" ? (
        <select value={str} onChange={(e) => onChange(field.name, e.target.value)} className={inputCls}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value} className="bg-[#10101c]">
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={str}
          rows={field.rows ?? 3}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={`${inputCls} resize-y`}
        />
      ) : (
        <input
          type={field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
          value={str}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={inputCls}
          autoComplete="off"
        />
      )}
      {field.help && <p className="mt-1 text-[11px] text-white/35">{field.help}</p>}
    </div>
  );
}

function StatusBadges({ status }: { status: Status }) {
  const Badge = ({ ok, on, off }: { ok: boolean; on: string; off: string }) => (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs ${
        ok ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300" : "border-amber-400/30 bg-amber-400/5 text-amber-300"
      }`}
    >
      {ok ? on : off}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2">
      <Badge ok={status.resendConfigured} on="Resend configurado" off="Resend sin configurar" />
      <Badge ok={status.outboundEnabled} on="Outbound habilitado" off="Outbound bloqueado" />
      <Badge ok={status.dbConfigured} on="Base de datos disponible" off="Sin base de datos" />
    </div>
  );
}
