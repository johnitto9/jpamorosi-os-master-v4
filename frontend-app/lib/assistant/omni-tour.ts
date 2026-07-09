// lib/assistant/omni-tour.ts
// The omni chat's preset "guided visit" (Fase 1). It used to be a suggestion
// chip that asked the LLM for a tour — duplicating the real GuidedTour outside
// and burning a completion for preset content. Now it's a plug-and-play
// client-side sequence: ZERO LLM calls, interactive cards (project cards +
// navigation links) played as staged assistant turns, ending in quick replies
// that DO go to the live agent. Structure here; the widget does the staging.

import type { Lang } from "@/lib/i18n/dictionaries";

export type OmniTourStep = {
  text: string;
  /** project cards to attach (must be real slugs from content/projects.ts) */
  slugs?: string[];
  /** navigation actions (internal routes only) */
  links?: Array<{ label: string; href: string }>;
};

export type OmniTour = {
  /** the chip label AND the trigger the widget intercepts before the LLM */
  trigger: string;
  steps: OmniTourStep[];
  /** quick replies offered after the last step — these DO hit the agent */
  replies: string[];
};

// Hall of Fame slugs (content/projects.ts) — the tour's evidence.
const HALL = ["lumenscript", "buenpick", "bbn"];

export const OMNI_TOUR: Record<Lang, OmniTour> = {
  en: {
    trigger: "✦ Guided lab visit",
    steps: [
      {
        text: "Quick visit, zero forms 👇 This lab is Juan's living portfolio: **systems that shipped and survived reality**. These three are the Hall of Fame:",
        slugs: HALL,
      },
      {
        text: "The nice trap: **this site is also one of the systems** — same stack, live. I remember context, turn conversations into real pre-projects with their own brand DNA, and Juan sees every step.",
        links: [
          { label: "Project rooms", href: "/projects" },
          { label: "Printable CV", href: "/cv" },
        ],
      },
      {
        text: "That's the visit ✨ Now it's your turn — what brings you here?",
      },
    ],
    replies: [
      "I'm hiring for AI engineering",
      "I have a project idea",
      "Show me the strongest AI project",
    ],
  },
  es: {
    trigger: "✦ Visita guiada del lab",
    steps: [
      {
        text: "Visita rápida, cero formularios 👇 Este lab es el portfolio vivo de Juan: **sistemas lanzados que sobrevivieron a la realidad**. Estos tres son el Salón de la Fama:",
        slugs: HALL,
      },
      {
        text: "La trampa linda: **este sitio también es uno de los sistemas** — mismo stack, en vivo. Recuerdo contexto, convierto conversaciones en pre-proyectos reales con su propio ADN de marca, y Juan ve cada paso.",
        links: [
          { label: "Salas de proyecto", href: "/projects" },
          { label: "CV imprimible", href: "/cv" },
        ],
      },
      {
        text: "Esa fue la visita ✨ Ahora te toca — ¿qué te trae por acá?",
      },
    ],
    replies: [
      "Estoy contratando para AI engineering",
      "Tengo una idea de proyecto",
      "Mostrame el proyecto de IA más fuerte",
    ],
  },
  pt: {
    trigger: "✦ Visita guiada do lab",
    steps: [
      {
        text: "Visita rápida, zero formulários 👇 Este lab é o portfólio vivo do Juan: **sistemas lançados que sobreviveram à realidade**. Estes três são o Hall da Fama:",
        slugs: HALL,
      },
      {
        text: "A pegadinha boa: **este site também é um dos sistemas** — mesmo stack, ao vivo. Eu lembro contexto, transformo conversas em pré-projetos reais com seu próprio DNA de marca, e o Juan vê cada passo.",
        links: [
          { label: "Salas de projeto", href: "/projects" },
          { label: "CV imprimível", href: "/cv" },
        ],
      },
      {
        text: "Essa foi a visita ✨ Agora é com você — o que te traz aqui?",
      },
    ],
    replies: [
      "Estou contratando para AI engineering",
      "Tenho uma ideia de projeto",
      "Mostre o projeto de IA mais forte",
    ],
  },
  fr: {
    trigger: "✦ Visite guidée du lab",
    steps: [
      {
        text: "Visite rapide, zéro formulaire 👇 Ce lab est le portfolio vivant de Juan : **des systèmes livrés qui ont survécu à la réalité**. Ces trois-là sont le Hall of Fame :",
        slugs: HALL,
      },
      {
        text: "Le joli piège : **ce site est aussi l'un des systèmes** — même stack, en direct. Je retiens le contexte, je transforme les conversations en pré-projets réels avec leur propre ADN de marque, et Juan voit chaque étape.",
        links: [
          { label: "Salles de projet", href: "/projects" },
          { label: "CV imprimable", href: "/cv" },
        ],
      },
      {
        text: "C'était la visite ✨ À vous — qu'est-ce qui vous amène ?",
      },
    ],
    replies: [
      "Je recrute en AI engineering",
      "J'ai une idée de projet",
      "Montre-moi le projet IA le plus fort",
    ],
  },
  ru: {
    trigger: "✦ Экскурсия по лаборатории",
    steps: [
      {
        text: "Быстрая экскурсия, никаких форм 👇 Эта лаборатория — живое портфолио Хуана: **запущенные системы, пережившие реальность**. Вот Зал славы:",
        slugs: HALL,
      },
      {
        text: "Приятная ловушка: **этот сайт — тоже одна из систем**, тот же стек, вживую. Я помню контекст, превращаю разговоры в реальные пре-проекты с их собственным ДНК бренда, и Хуан видит каждый шаг.",
        links: [
          { label: "Комнаты проектов", href: "/projects" },
          { label: "Печатное CV", href: "/cv" },
        ],
      },
      {
        text: "Вот и вся экскурсия ✨ Теперь ваш ход — что вас привело?",
      },
    ],
    replies: [
      "Нанимаю AI-инженера",
      "У меня есть идея проекта",
      "Покажи сильнейший AI-проект",
    ],
  },
  zh: {
    trigger: "✦ 实验室导览",
    steps: [
      {
        text: "快速导览，无需填表 👇 这个实验室是 Juan 的活体作品集：**已上线并经受住现实考验的系统**。这三个是名人堂：",
        slugs: HALL,
      },
      {
        text: "有趣的是：**这个网站本身也是系统之一**——同样的技术栈，实时运行。我能记住上下文，把对话变成有自己品牌 DNA 的真实预项目，Juan 能看到每一步。",
        links: [
          { label: "项目室", href: "/projects" },
          { label: "可打印简历", href: "/cv" },
        ],
      },
      {
        text: "导览结束 ✨ 轮到你了——什么风把你吹来的？",
      },
    ],
    replies: [
      "我在招聘 AI 工程师",
      "我有一个项目想法",
      "给我看最强的 AI 项目",
    ],
  },
  ar: {
    trigger: "✦ جولة في المختبر",
    steps: [
      {
        text: "جولة سريعة، بلا نماذج 👇 هذا المختبر هو المعرض الحي لأعمال خوان: **أنظمة أُطلقت ونجت من الواقع**. هذه الثلاثة هي قاعة المشاهير:",
        slugs: HALL,
      },
      {
        text: "المفارقة الجميلة: **هذا الموقع نفسه أحد الأنظمة** — نفس التقنيات، مباشرة. أتذكر السياق، وأحوّل المحادثات إلى مشاريع أولية حقيقية بهويتها الخاصة، وخوان يرى كل خطوة.",
        links: [
          { label: "غرف المشاريع", href: "/projects" },
          { label: "سيرة قابلة للطباعة", href: "/cv" },
        ],
      },
      {
        text: "انتهت الجولة ✨ دورك الآن — ما الذي أتى بك؟",
      },
    ],
    replies: [
      "أوظّف مهندس ذكاء اصطناعي",
      "لدي فكرة مشروع",
      "أرني أقوى مشروع ذكاء اصطناعي",
    ],
  },
  he: {
    trigger: "✦ סיור מודרך במעבדה",
    steps: [
      {
        text: "סיור מהיר, אפס טפסים 👇 המעבדה הזו היא הפורטפוליו החי של חואן: **מערכות ששוחררו ושרדו את המציאות**. שלוש אלה הן היכל התהילה:",
        slugs: HALL,
      },
      {
        text: "המלכודת היפה: **האתר הזה הוא גם אחת מהמערכות** — אותו stack, בלייב. אני זוכר הקשר, הופך שיחות לפרה-פרויקטים אמיתיים עם Brand DNA משלהם, וחואן רואה כל צעד.",
        links: [
          { label: "חדרי פרויקטים", href: "/projects" },
          { label: "קורות חיים להדפסה", href: "/cv" },
        ],
      },
      {
        text: "זה היה הסיור ✨ עכשיו תורכם — מה הביא אתכם לכאן?",
      },
    ],
    replies: [
      "אני מגייס להנדסת AI",
      "יש לי רעיון לפרויקט",
      "הראו לי את פרויקט ה-AI החזק ביותר",
    ],
  },
  ja: {
    trigger: "✦ ラボのガイドツアー",
    steps: [
      {
        text: "クイックツアー、フォームなし 👇 このラボは Juan の生きたポートフォリオ：**出荷され、現実を生き延びたシステム**。この3つが殿堂入り：",
        slugs: HALL,
      },
      {
        text: "面白い仕掛け：**このサイト自体もシステムの一つ**——同じスタックでライブ稼働中。私は文脈を覚え、会話を Brand DNA 付きの本物のプレプロジェクトに変え、Juan がすべてのステップを見ています。",
        links: [
          { label: "プロジェクトルーム", href: "/projects" },
          { label: "印刷用CV", href: "/cv" },
        ],
      },
      {
        text: "ツアーはここまで ✨ 次はあなたの番——何がきっかけで来ましたか？",
      },
    ],
    replies: [
      "AIエンジニアリングで採用中",
      "プロジェクトのアイデアがある",
      "最強のAIプロジェクトを見せて",
    ],
  },
  ko: {
    trigger: "✦ 랩 가이드 투어",
    steps: [
      {
        text: "빠른 투어, 양식 제로 👇 이 랩은 Juan의 살아있는 포트폴리오예요: **출시되어 현실에서 살아남은 시스템들**. 이 셋이 명예의 전당:",
        slugs: HALL,
      },
      {
        text: "재미있는 함정: **이 사이트 자체도 시스템 중 하나** — 같은 스택, 라이브. 저는 맥락을 기억하고, 대화를 자체 Brand DNA를 가진 진짜 프리-프로젝트로 바꾸며, Juan이 모든 단계를 봅니다.",
        links: [
          { label: "프로젝트 방", href: "/projects" },
          { label: "인쇄용 CV", href: "/cv" },
        ],
      },
      {
        text: "투어 끝 ✨ 이제 당신 차례 — 무엇이 당신을 여기로 데려왔나요?",
      },
    ],
    replies: [
      "AI 엔지니어링 채용 중이에요",
      "프로젝트 아이디어가 있어요",
      "가장 강력한 AI 프로젝트 보여줘",
    ],
  },
  hi: {
    trigger: "✦ लैब का गाइडेड टूर",
    steps: [
      {
        text: "झटपट टूर, कोई फ़ॉर्म नहीं 👇 यह लैब Juan का जीवित पोर्टफोलियो है: **शिप हुए सिस्टम जो हक़ीक़त से बचकर निकले**। ये तीन हैं हॉल ऑफ़ फ़ेम:",
        slugs: HALL,
      },
      {
        text: "प्यारा सा जाल: **यह साइट खुद भी उन सिस्टम में से एक है** — वही स्टैक, लाइव। मैं संदर्भ याद रखता हूँ, बातचीत को उनके अपने Brand DNA वाले असली प्री-प्रोजेक्ट में बदलता हूँ, और Juan हर क़दम देखता है।",
        links: [
          { label: "प्रोजेक्ट रूम्स", href: "/projects" },
          { label: "प्रिंट-योग्य CV", href: "/cv" },
        ],
      },
      {
        text: "यही था टूर ✨ अब आपकी बारी — क्या लाया आपको यहाँ?",
      },
    ],
    replies: [
      "मैं AI इंजीनियरिंग के लिए हायर कर रहा हूँ",
      "मेरे पास एक प्रोजेक्ट आइडिया है",
      "सबसे मज़बूत AI प्रोजेक्ट दिखाओ",
    ],
  },
};

/** Does this outgoing message trigger the preset tour? (any language — a
 *  visitor can click the chip and switch language mid-session) */
export function matchesTourTrigger(message: string): boolean {
  const m = message.trim();
  return Object.values(OMNI_TOUR).some((t) => t.trigger === m);
}
