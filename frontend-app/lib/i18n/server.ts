// lib/i18n/server.ts — read the visitor's language on the SERVER (cookie
// al_lang, set by the LanguageSwitch). Home is force-dynamic, so translated
// SSR is free: switch sets cookie -> router.refresh() -> new language.

import { cookies, headers } from "next/headers";
import { DICTS, ROOM, DEFAULT_LANG, LANGS, type Lang } from "./dictionaries";

// Robust-but-simple auto-detection when the visitor hasn't chosen yet:
//   1. explicit cookie (their choice always wins),
//   2. IP country (x-vercel-ip-country on Vercel / cf-ipcountry behind CF),
//   3. browser Accept-Language,
//   4. English.
//
// Coverage notes: includes the core markets for each of the 7 supported
// languages plus their diaspora and adjacent countries where the local
// lingua franca matches (post-soviet → ru, North Africa → ar). EU/NA visitors
// without a match fall through to Accept-Language (browser preference) and
// finally EN — the "default to visitor's actual language" rule.
const COUNTRY_TO_LANG: Record<string, Lang> = {
  // Spanish: full Latin America + Spain
  AR: "es", BO: "es", CL: "es", CO: "es", CR: "es", CU: "es", DO: "es",
  EC: "es", ES: "es", GT: "es", HN: "es", MX: "es", NI: "es", PA: "es",
  PE: "es", PR: "es", PY: "es", SV: "es", UY: "es", VE: "es",
  // Portuguese
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
  // French (core + diaspora)
  FR: "fr", BE: "fr", CA: "fr", CH: "fr", LU: "fr", MC: "fr",
  // Russian (core + post-soviet states where Russian is widely spoken)
  RU: "ru", AM: "ru", AZ: "ru", BY: "ru", GE: "ru", KG: "ru", KZ: "ru",
  MD: "ru", TJ: "ru", TM: "ru", UA: "ru", UZ: "ru",
  // Chinese (mainland + traditional-script regions + Singapore)
  CN: "zh", HK: "zh", MO: "zh", SG: "zh", TW: "zh",
  // Arabic (Maghreb + Gulf + Levant + diaspora)
  AE: "ar", BH: "ar", DZ: "ar", EG: "ar", IQ: "ar", JO: "ar", KW: "ar",
  LB: "ar", LY: "ar", MA: "ar", MR: "ar", OM: "ar", PS: "ar", QA: "ar",
  SA: "ar", SD: "ar", SY: "ar", TN: "ar", YE: "ar",
  // Hebrew / Japanese / Korean / Hindi
  IL: "he",
  JP: "ja",
  KR: "ko",
  IN: "hi",
};

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const raw = store.get("al_lang")?.value;
  if (raw && raw in LANGS) return raw as Lang;

  const h = await headers();
  const country = (h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? "").toUpperCase();
  if (country && COUNTRY_TO_LANG[country]) return COUNTRY_TO_LANG[country];

  const accept = h.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (code in LANGS) return code as Lang;
  }
  return DEFAULT_LANG;
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: DICTS[lang], r: ROOM[lang] };
}
