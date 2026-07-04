// lib/consent.ts
// Cookie-consent state, backed by js-cookie. One first-party cookie
// (`al_consent`) records the visitor's choice; the assistant and any future
// analytics read it before persisting anything beyond strictly-necessary.
//
// Categories:
//   necessary        always on (session cookie for the assistant to answer,
//                    the consent cookie itself).
//   personalization  assistant memory: chat transcript across pages, visitor
//                    preferences, lead context. This is what makes the guide
//                    "remember" the visitor.
// Client-only module (js-cookie touches document); guard usage with "use client".

import Cookies from "js-cookie";

export type Consent = {
  necessary: true;
  personalization: boolean;
  /** ISO date of the decision — lets us re-prompt if the policy changes. */
  decidedAt: string;
  version: 1;
};

const COOKIE = "al_consent";
const MAX_AGE_DAYS = 180;

export function getConsent(): Consent | null {
  const raw = Cookies.get(COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Consent;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(personalization: boolean): Consent {
  const consent: Consent = {
    necessary: true,
    personalization,
    decidedAt: new Date().toISOString(),
    version: 1,
  };
  Cookies.set(COOKIE, JSON.stringify(consent), {
    expires: MAX_AGE_DAYS,
    sameSite: "Lax",
    secure: typeof location !== "undefined" && location.protocol === "https:",
  });
  // Same-tab listeners (the assistant) react immediately.
  window.dispatchEvent(new CustomEvent("al-consent", { detail: consent }));
  return consent;
}

/** True when the visitor allowed assistant memory / personalization. */
export function personalizationAllowed(): boolean {
  return getConsent()?.personalization ?? false;
}
