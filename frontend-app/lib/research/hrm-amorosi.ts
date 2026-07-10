export type HrmDocument = "foundations" | "blueprint";
export type HrmLanguage = "es" | "en" | "zh";

export const HRM_DOCUMENTS: Record<HrmDocument, Record<HrmLanguage, string>> = {
  foundations: {
    es: "/research/hrm-amorosi/foundations/foundations-es.pdf?v=20260710-2",
    en: "/research/hrm-amorosi/foundations/foundations-en.pdf?v=20260710-2",
    zh: "/research/hrm-amorosi/foundations/foundations-zh.pdf?v=20260710-2",
  },
  blueprint: {
    es: "/research/hrm-amorosi/blueprint/blueprint-es.pdf?v=20260710-2",
    en: "/research/hrm-amorosi/blueprint/blueprint-en.pdf?v=20260710-2",
    zh: "/research/hrm-amorosi/blueprint/blueprint-zh.pdf?v=20260710-2",
  },
};

export const HRM_COPY: Record<HrmLanguage, {
  label: string;
  title: string;
  subtitle: string;
  document: string;
  language: string;
  open: string;
  download: string;
  loading: string;
  error: string;
  reachedTitle: string;
  reachedBody: string;
  continue: string;
}> = {
  es: {
    label: "Español", title: "HRM—Amorosi", subtitle: "Research Dossier", document: "Documento", language: "Idioma",
    open: "Abrir PDF", download: "Descargar", loading: "Preparando el documento…", error: "No se pudo cargar el documento.",
    reachedTitle: "Llegaste al final de los Cimientos.", reachedBody: "La intuición ya está sobre la mesa. Ahora entrá en la arquitectura.", continue: "Continuar al Blueprint →",
  },
  en: {
    label: "English", title: "HRM—Amorosi", subtitle: "Research Dossier", document: "Document", language: "Language",
    open: "Open PDF", download: "Download", loading: "Preparing the document…", error: "The document could not be loaded.",
    reachedTitle: "You reached the end of the Foundations.", reachedBody: "The intuition is now on the table. Now enter the architecture.", continue: "Continue to Blueprint →",
  },
  zh: {
    label: "中文", title: "HRM—Amorosi", subtitle: "Research Dossier", document: "文档", language: "语言",
    open: "打开 PDF", download: "下载", loading: "正在准备文档…", error: "文档无法加载。",
    reachedTitle: "你已读完《基础说明》。", reachedBody: "直觉已经摆在桌面上。现在进入架构。", continue: "继续阅读《蓝图》→",
  },
};

export function detectHrmLanguage(): HrmLanguage {
  if (typeof navigator === "undefined") return "en";
  const language = navigator.language.toLowerCase();
  if (language.startsWith("zh")) return "zh";
  if (language.startsWith("es")) return "es";
  return "en";
}
