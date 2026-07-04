"use client";

// components/hall/ContactSection.tsx
// Home contact form — same Formspree form as the OS ContactApp
// (packages/desktop/apps/ContactApp.tsx, form id "xanbvlqw") restyled to the
// Hall's aero/glass look, so both surfaces deliver to the same inbox.
// Client component (Formspree hook); parent section stays server-rendered.

import { useForm, ValidationError } from "@formspree/react";

const FORMSPREE_ID = "xanbvlqw"; // shared with /os ContactApp

export type ContactFormCopy = {
  name: string;
  namePh: string;
  email: string;
  emailPh: string;
  message: string;
  messagePh: string;
  send: string;
  sending: string;
  sentTitle: string;
  sentBody: string;
};

export function ContactSection({ t }: { t: ContactFormCopy }) {
  const [state, handleSubmit] = useForm(FORMSPREE_ID);

  const field =
    "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none backdrop-blur transition-colors focus:border-cyan-400/60";
  const label = "block text-xs font-medium uppercase tracking-[0.2em] text-white/50";

  if (state.succeeded) {
    return (
      <div
        className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-8 text-center backdrop-blur"
        role="status"
      >
        <span className="text-3xl" aria-hidden>
          ✦
        </span>
        <h3 className="mt-3 text-lg font-semibold text-cyan-300">{t.sentTitle}</h3>
        <p className="mt-2 max-w-xs text-sm text-white/60">{t.sentBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={label}>
            {t.name}
          </label>
          <input
            id="contact-name"
            type="text"
            name="name"
            required
            placeholder={t.namePh}
            className={`${field} mt-1.5`}
          />
          <ValidationError
            prefix={t.name}
            field="name"
            errors={state.errors}
            className="mt-1 text-xs text-red-400"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={label}>
            {t.email}
          </label>
          <input
            id="contact-email"
            type="email"
            name="email"
            required
            placeholder={t.emailPh}
            className={`${field} mt-1.5`}
          />
          <ValidationError
            prefix={t.email}
            field="email"
            errors={state.errors}
            className="mt-1 text-xs text-red-400"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className={label}>
          {t.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          placeholder={t.messagePh}
          className={`${field} mt-1.5 resize-none`}
        />
        <ValidationError
          prefix={t.message}
          field="message"
          errors={state.errors}
          className="mt-1 text-xs text-red-400"
        />
      </div>
      <button
        type="submit"
        disabled={state.submitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {state.submitting ? t.sending : t.send}
      </button>
      <ValidationError errors={state.errors} className="text-xs text-red-400" />
    </form>
  );
}

export default ContactSection;
