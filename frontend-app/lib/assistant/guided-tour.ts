// lib/assistant/guided-tour.ts
// -----------------------------------------------------------------------------
// Deterministic Guided Tour engine (T03, spec 11) — Layer A of the two-layer
// model. The STANDARD tour path makes ZERO LLM calls: every message, action and
// scroll target is a preset. Structure (the graph: ids, scroll targets, which
// action goes where) is defined once; only the strings are localized.
//
// Exiting the tour (route choices / "ask something") hands off to Layer B — the
// adaptive Orbe agent — via the `al-assistant-open` DOM event. That handoff MAY
// use the LLM, because it is no longer the standard tour path.
// -----------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n/dictionaries";

export type TourStateId = "welcome" | "builder" | "proof" | "portfolio" | "living" | "route";

/** What a button does: go to another state, or exit the tour (optionally seeding
 *  a first message into the adaptive agent). Structure only — labels are localized. */
export type TourEffect = { to: TourStateId } | { exit: true; seed?: string };

type GraphNode = {
  /** DOM id to smooth-scroll to when this state becomes active (optional). */
  scrollTo?: string;
  /** Effects in the SAME order as the localized labels for this state. */
  effects: TourEffect[];
};

// The graph: transitions + scroll targets. Section ids match app/page.tsx.
export const TOUR_GRAPH: Record<TourStateId, GraphNode> = {
  welcome: { effects: [{ to: "builder" }, { to: "proof" }] },
  builder: { scrollTo: "before-the-systems", effects: [{ to: "proof" }] },
  proof: { scrollTo: "hall-of-fame", effects: [{ to: "portfolio" }, { exit: true, seed: "¿Cuál de estos sistemas está más vivo hoy y por qué?" }] },
  portfolio: { scrollTo: "inside-the-proof", effects: [{ to: "living" }] },
  living: { scrollTo: "living-layer", effects: [{ to: "route" }] },
  route: {
    effects: [
      { exit: true, seed: "Estoy contratando para un rol de AI/ingeniería. ¿Qué pruebas relevantes tenés?" },
      { exit: true, seed: "Tengo una idea de proyecto y quiero empezar a darle forma." },
      { exit: true },
      { exit: true },
    ],
  },
};

export const TOUR_ORDER: TourStateId[] = ["welcome", "builder", "proof", "portfolio", "living", "route"];

type StateCopy = { message: string; actions: string[] };
type TourCopy = Record<TourStateId, StateCopy>;

// Localized presets. Labels are in the SAME order as TOUR_GRAPH[state].effects.
const COPY: Record<Lang, TourCopy> = {
  en: {
    welcome: { message: "Before I show you projects, there's a fast way to understand Juan. Two minutes, no forms.", actions: ["Meet the builder", "Jump straight to the proof"] },
    builder: { message: "It didn't start with AI. It started with commerce, real-world friction, and software as the tool that tied it together.", actions: ["Now show me the proof"] },
    proof: { message: "These are systems that survived contact with reality — shipped, used, still running.", actions: ["Keep the tour", "What do they have in common?"] },
    portfolio: { message: "Here's the nice trap: the portfolio you're using is also one of the systems — same stack, live.", actions: ["Go on"] },
    living: { message: "I remember context between visits, turn a conversation into a real project with its own brand DNA, and pick up where you left off.", actions: ["What can I do here?"] },
    route: { message: "So — what would you like to do?", actions: ["I'm hiring", "I have an idea", "Just exploring", "Ask something freely"] },
  },
  es: {
    welcome: { message: "Antes de mostrarte proyectos, hay una forma rápida de entender a Juan. Dos minutos, sin formularios.", actions: ["Conocé al constructor", "Saltá directo a las pruebas"] },
    builder: { message: "No empezó con IA. Empezó con comercio, fricción del mundo real, y el software como la herramienta que lo unía.", actions: ["Ahora mostrame la prueba"] },
    proof: { message: "Estos son sistemas que sobrevivieron al contacto con la realidad — lanzados, usados, todavía corriendo.", actions: ["Seguir el tour", "¿Qué tienen en común?"] },
    portfolio: { message: "Acá va la trampa linda: el portfolio que estás usando también es uno de los sistemas — mismo stack, en vivo.", actions: ["Seguí"] },
    living: { message: "Recuerdo el contexto entre visitas, convierto una conversación en un proyecto real con su propio Brand DNA, y retomo donde lo dejaste.", actions: ["¿Qué puedo hacer acá?"] },
    route: { message: "Entonces — ¿qué te gustaría hacer?", actions: ["Estoy contratando", "Tengo una idea", "Solo explorando", "Preguntar algo libre"] },
  },
  pt: {
    welcome: { message: "Antes de te mostrar projetos, há um jeito rápido de entender o Juan. Dois minutos, sem formulários.", actions: ["Conheça o construtor", "Ir direto às provas"] },
    builder: { message: "Não começou com IA. Começou com comércio, atrito do mundo real, e o software como a ferramenta que unia tudo.", actions: ["Agora me mostre a prova"] },
    proof: { message: "Estes são sistemas que sobreviveram ao contato com a realidade — lançados, usados, ainda rodando.", actions: ["Seguir o tour", "O que têm em comum?"] },
    portfolio: { message: "Aqui vai a pegadinha boa: o portfólio que você está usando também é um dos sistemas — mesmo stack, ao vivo.", actions: ["Continuar"] },
    living: { message: "Eu lembro o contexto entre visitas, transformo uma conversa num projeto real com seu próprio Brand DNA, e retomo de onde você parou.", actions: ["O que posso fazer aqui?"] },
    route: { message: "Então — o que você gostaria de fazer?", actions: ["Estou contratando", "Tenho uma ideia", "Só explorando", "Perguntar algo livre"] },
  },
  fr: {
    welcome: { message: "Avant de te montrer des projets, il y a un moyen rapide de comprendre Juan. Deux minutes, sans formulaire.", actions: ["Rencontrer le bâtisseur", "Aller droit à la preuve"] },
    builder: { message: "Ça n'a pas commencé avec l'IA. Ça a commencé avec le commerce, les frictions du réel, et le logiciel comme l'outil qui reliait le tout.", actions: ["Montre-moi la preuve"] },
    proof: { message: "Voici des systèmes qui ont survécu au contact du réel — livrés, utilisés, toujours en marche.", actions: ["Continuer la visite", "Qu'ont-ils en commun ?"] },
    portfolio: { message: "Voici le joli piège : le portfolio que tu utilises est aussi l'un des systèmes — même stack, en direct.", actions: ["Continuer"] },
    living: { message: "Je garde le contexte entre les visites, je transforme une conversation en projet réel avec son propre Brand DNA, et je reprends où tu t'étais arrêté.", actions: ["Que puis-je faire ici ?"] },
    route: { message: "Alors — que veux-tu faire ?", actions: ["Je recrute", "J'ai une idée", "J'explore", "Poser une question libre"] },
  },
  ru: {
    welcome: { message: "Прежде чем показать проекты, есть быстрый способ понять Хуана. Две минуты, без форм.", actions: ["Познакомиться со строителем", "Сразу к доказательствам"] },
    builder: { message: "Это началось не с ИИ. Началось с торговли, трения реального мира и софта как инструмента, связавшего всё.", actions: ["Покажи доказательства"] },
    proof: { message: "Это системы, выжившие при столкновении с реальностью — выпущены, используются, всё ещё работают.", actions: ["Продолжить тур", "Что у них общего?"] },
    portfolio: { message: "Вот приятная ловушка: портфолио, которым вы пользуетесь, — тоже одна из систем, тот же стек, вживую.", actions: ["Дальше"] },
    living: { message: "Я помню контекст между визитами, превращаю разговор в реальный проект со своим Brand DNA и продолжаю с того места, где вы остановились.", actions: ["Что здесь можно?"] },
    route: { message: "Итак — что бы вы хотели сделать?", actions: ["Я нанимаю", "У меня есть идея", "Просто смотрю", "Задать свободный вопрос"] },
  },
  zh: {
    welcome: { message: "在给你看项目之前，有个快速了解 Juan 的方式。两分钟，无需表单。", actions: ["认识这位建造者", "直接看实证"] },
    builder: { message: "起点不是 AI，而是商业、现实世界的摩擦，以及作为把这一切串起来的工具的软件。", actions: ["现在给我看实证"] },
    proof: { message: "这些是经受住现实考验的系统——已上线、被使用、仍在运行。", actions: ["继续导览", "它们有什么共同点？"] },
    portfolio: { message: "这里有个有趣的陷阱：你正在用的这个作品集本身也是其中一个系统——同一套技术栈，实时运行。", actions: ["继续"] },
    living: { message: "我在多次访问间记住上下文，把一次对话变成拥有自己 Brand DNA 的真实项目，并从你离开的地方继续。", actions: ["我在这里能做什么？"] },
    route: { message: "那么——你想做什么？", actions: ["我在招聘", "我有一个想法", "只是逛逛", "自由提问"] },
  },
  ar: {
    welcome: { message: "قبل أن أريك المشاريع، هناك طريقة سريعة لفهم خوان. دقيقتان، بلا نماذج.", actions: ["تعرّف على البنّاء", "اذهب مباشرة إلى الدليل"] },
    builder: { message: "لم يبدأ بالذكاء الاصطناعي. بدأ بالتجارة واحتكاك العالم الحقيقي، والبرمجيات كأداة تربط ذلك.", actions: ["أرني الدليل الآن"] },
    proof: { message: "هذه أنظمة نجت من الاصطدام بالواقع — أُطلقت، وتُستخدَم، وما زالت تعمل.", actions: ["تابع الجولة", "ما القاسم المشترك بينها؟"] },
    portfolio: { message: "وهنا الفخّ اللطيف: المحفظة التي تستخدمها هي أيضاً أحد الأنظمة — نفس المنظومة، مباشرة.", actions: ["تابع"] },
    living: { message: "أتذكّر السياق بين الزيارات، وأحوّل محادثة إلى مشروع حقيقي بهوية Brand DNA خاصة به، وأكمل من حيث توقفت.", actions: ["ماذا يمكنني أن أفعل هنا؟"] },
    route: { message: "إذن — ماذا تودّ أن تفعل؟", actions: ["أنا أوظّف", "لديّ فكرة", "أستكشف فقط", "اسأل بحرية"] },
  },
};

// Short captions ("notes") surfaced as floating annotations while the tour
// travels the CV: an anchored bubble next to the highlighted section + a stacked
// toast that logs the journey. Only states with a scroll target carry a note —
// welcome/route have no section to anchor to. Kept apart from COPY so the copy
// blocks above stay untouched; merged in by resolveTourState.
const NOTES: Record<Lang, Partial<Record<TourStateId, string>>> = {
  en: {
    builder: "The origin: commerce before code.",
    proof: "Systems that survived contact with reality.",
    portfolio: "This very portfolio is one of the systems.",
    living: "Orbe remembers — and turns a chat into a project.",
  },
  es: {
    builder: "El origen: comercio antes que código.",
    proof: "Sistemas que sobrevivieron a la realidad.",
    portfolio: "Este mismo portfolio es uno de los sistemas.",
    living: "Orbe recuerda — y convierte la charla en proyecto.",
  },
  pt: {
    builder: "A origem: comércio antes do código.",
    proof: "Sistemas que sobreviveram ao contato com a realidade.",
    portfolio: "Este próprio portfólio é um dos sistemas.",
    living: "Orbe lembra — e transforma a conversa em projeto.",
  },
  fr: {
    builder: "L'origine : le commerce avant le code.",
    proof: "Des systèmes qui ont survécu au réel.",
    portfolio: "Ce portfolio même est l'un des systèmes.",
    living: "Orbe se souvient — et transforme un échange en projet.",
  },
  ru: {
    builder: "Начало: торговля прежде кода.",
    proof: "Системы, выжившие при встрече с реальностью.",
    portfolio: "Само это портфолио — одна из систем.",
    living: "Orbe помнит — и превращает разговор в проект.",
  },
  zh: {
    builder: "起点：商业先于代码。",
    proof: "经受住现实考验的系统。",
    portfolio: "你正在用的这个作品集本身就是其中一个系统。",
    living: "Orbe 会记忆——并把对话变成项目。",
  },
  ar: {
    builder: "الأصل: التجارة قبل الكود.",
    proof: "أنظمة نجت من الاصطدام بالواقع.",
    portfolio: "هذه المحفظة نفسها هي أحد الأنظمة.",
    living: "Orbe يتذكّر — ويحوّل المحادثة إلى مشروع.",
  },
};

export type ResolvedTourState = {
  id: TourStateId;
  message: string;
  scrollTo?: string;
  /** Short caption for the floating annotation (only when a section is targeted). */
  note?: string;
  actions: Array<{ label: string; effect: TourEffect }>;
};

/** Merge graph + localized copy into a render-ready state. Pure, no side effects. */
export function resolveTourState(id: TourStateId, lang: Lang): ResolvedTourState {
  const node = TOUR_GRAPH[id];
  const copy = (COPY[lang] ?? COPY.en)[id];
  return {
    id,
    message: copy.message,
    scrollTo: node.scrollTo,
    note: (NOTES[lang] ?? NOTES.en)[id],
    actions: node.effects.map((effect, i) => ({ label: copy.actions[i] ?? "", effect })),
  };
}
