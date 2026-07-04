// lib/i18n/dictionaries.ts
// Lightweight site-chrome i18n (own implementation — a full i18n framework
// would be over-engineering at this scale). Two dictionaries:
//   DICTS — the home shell (nav, section headers, CTAs, contact band, hero).
//   ROOM  — cards + project-room chrome (headings, flip backs, link pills,
//           the /projects index) so EVERY fixed string follows the visitor.
// Project CONTENT (oneLiner, proof, highlights…) is translated separately by
// lib/i18n/translate.ts (LLM + Postgres cache, EN canonical fallback).

export const LANGS = {
  en: { label: "English", flag: "🇬🇧" },
  es: { label: "Español", flag: "🇦🇷" },
  pt: { label: "Português", flag: "🇧🇷" },
  fr: { label: "Français", flag: "🇫🇷" },
  ru: { label: "Русский", flag: "🇷🇺" },
  zh: { label: "中文", flag: "🇨🇳" },
  ar: { label: "العربية", flag: "🇸🇦" },
} as const;

export type Lang = keyof typeof LANGS;
export const DEFAULT_LANG: Lang = "en";

type Dict = {
  navIntro: string; navHall: string; navFeatured: string; navArchive: string; navContact: string;
  hallEyebrow: string; hallTitle: string; hallDesc: string;
  featuredEyebrow: string; featuredTitle: string; featuredDesc: string;
  archiveEyebrow: string; archiveTitle: string; archiveDesc: string;
  browseAll: string;
  contactEyebrow: string; contactTitle: string; contactBody: string;
  contactEmail: string; contactExplore: string;
  contactForm: { name: string; namePh: string; email: string; emailPh: string; message: string; messagePh: string; send: string; sending: string; sentTitle: string; sentBody: string };
  il1: { eyebrow: string; heading: string; body: string; items: string[] };
  il2: { eyebrow: string; heading: string; body: string; items: string[] };
  il3: { eyebrow: string; heading: string; body: string; items: string[] };
  osTitle: string; osBody: string; osCta: string;
  langNudge: string;
  heroRole: string; heroTagline: string; heroThesis: string;
  heroCta1: string; heroCta2: string; heroCta3: string; heroCaps: string;
};

export const DICTS: Record<Lang, Dict> = {
  en: {
    navIntro: "Intro", navHall: "Proof Rooms", navFeatured: "Systems in Orbit", navArchive: "Lab Fragments", navContact: "Contact",
    hallEyebrow: "Proof Rooms", hallTitle: "Systems that survived contact with reality.",
    hallDesc: "A dark room of trophies. Each flagship proves a major hiring thesis — advanced AI orchestration, production agents, and live startup execution.",
    featuredEyebrow: "Systems in Orbit", featuredTitle: "Other builds around the same thesis.",
    featuredDesc: "Substantial work reinforcing the story without competing with the flagship rooms.",
    archiveEyebrow: "Lab Fragments", archiveTitle: "Experiments, prototypes and useful obsessions.",
    archiveDesc: "Prototypes, tools and research fragments. Evidence, not headline acts.",
    browseAll: "Browse all project rooms (Hall + Featured + Archive) →",
    contactEyebrow: "Open to work",
    contactTitle: "Available for AI Product Engineering, AI Systems Architecture, and Full-Stack AI roles.",
    contactBody: "I design AI architecture, ship full-stack products, and turn messy founder problems into systems that survive contact with reality. If that's what you're hiring for, let's talk.",
    contactEmail: "Email directly", contactExplore: "Explore Projects",
    contactForm: { name: "Name", namePh: "Your name", email: "Email", emailPh: "you@company.com", message: "Message", messagePh: "Tell me about your project, role, or idea…", send: "Send message →", sending: "Sending…", sentTitle: "Message sent", sentBody: "Thanks for reaching out — I'll get back to you soon." },
    il1: { eyebrow: "BEFORE THE SYSTEMS", heading: "The builder came first.", body: "Before the AI and the architecture there was a kid in Bahía Blanca taking things apart — commerce, real-world friction, and software as the instrument that tied it all together.", items: ["Commerce", "Real-world friction", "Software as instrument", "Bahía Blanca", "Alún"] },
    il2: { eyebrow: "YOU'RE INSIDE THE PROOF", heading: "This portfolio is a running system.", body: "The page you're reading runs on the same stack it shows off: a Next.js front, Orbe answering with memory, Postgres and R2 holding state, and an autonomous scout working in the background.", items: ["Public UI", "Orbe · intelligence", "Postgres · memory", "Scout · autonomy"] },
    il3: { eyebrow: "THE LIVING LAYER", heading: "It remembers, connects and builds.", body: "No login required. Orbe keeps context between visits, turns a conversation into a real project with its own brand DNA and assets, and picks up right where you left off.", items: ["arrival", "conversation", "intent", "memory", "project DNA", "assets", "next action"] },
    osTitle: "Want the full experience?",
    osBody: "The original interactive CV lives on as a personal operating system — windows, dock, and a 3D avatar. Boot it up.",
    osCta: "Launch jpamorosi.os →",
    langNudge: "Choose your language",
    heroRole: "AI Product Engineer & Systems Architect",
    heroTagline: "I build AI-powered systems that survive contact with reality.",
    heroThesis: "Not demos — shipped products: multi-model orchestration engines, production WhatsApp agents, and a live local-commerce startup. Architecture first. Then marble. Then neon.",
    heroCta1: "Enter Proof Rooms", heroCta2: "Explore Project Rooms", heroCta3: "Open jpamorosi.os →",
    heroCaps: "Capabilities → proven in",
  },
  es: {
    navIntro: "Inicio", navHall: "Salas de Prueba", navFeatured: "Sistemas en Órbita", navArchive: "Fragmentos del Lab", navContact: "Contacto",
    hallEyebrow: "Salas de Prueba", hallTitle: "Sistemas que sobrevivieron al contacto con la realidad.",
    hallDesc: "Una sala oscura de trofeos. Cada insignia prueba una tesis de contratación: orquestación avanzada de IA, agentes en producción y ejecución startup en vivo.",
    featuredEyebrow: "Sistemas en Órbita", featuredTitle: "Otras construcciones alrededor de la misma tesis.",
    featuredDesc: "Trabajo sustancial que refuerza la historia sin competir con las salas insignia.",
    archiveEyebrow: "Fragmentos del Lab", archiveTitle: "Experimentos, prototipos y obsesiones útiles.",
    archiveDesc: "Prototipos, herramientas y fragmentos de investigación. Evidencia, no actos principales.",
    browseAll: "Ver todas las salas de proyectos (Hall + Destacados + Archivo) →",
    contactEyebrow: "Disponible para trabajar",
    contactTitle: "Disponible para roles de AI Product Engineering, Arquitectura de Sistemas IA y Full-Stack AI.",
    contactBody: "Diseño arquitectura de IA, entrego productos full-stack y convierto problemas difusos de founders en sistemas que sobreviven al contacto con la realidad. Si buscás eso, hablemos.",
    contactEmail: "Enviar email", contactExplore: "Explorar proyectos",
    contactForm: { name: "Nombre", namePh: "Tu nombre", email: "Email", emailPh: "vos@empresa.com", message: "Mensaje", messagePh: "Contame sobre tu proyecto, rol o idea…", send: "Enviar mensaje →", sending: "Enviando…", sentTitle: "Mensaje enviado", sentBody: "Gracias por escribir — te respondo pronto." },
    il1: { eyebrow: "ANTES DE LOS SISTEMAS", heading: "Primero estuvo el constructor.", body: "Antes de la IA y la arquitectura hubo un pibe en Bahía Blanca desarmando cosas — comercio, fricción del mundo real y el software como el instrumento que lo unía todo.", items: ["Comercio", "Fricción real", "Software como instrumento", "Bahía Blanca", "Alún"] },
    il2: { eyebrow: "ESTÁS DENTRO DE LA PRUEBA", heading: "Este portfolio también está corriendo.", body: "La página que estás leyendo corre sobre el mismo stack que muestra: un front en Next.js, Orbe respondiendo con memoria, Postgres y R2 guardando estado, y un scout autónomo trabajando en segundo plano.", items: ["UI pública", "Orbe · inteligencia", "Postgres · memoria", "Scout · autonomía"] },
    il3: { eyebrow: "LA CAPA VIVA", heading: "Recuerda, conecta y construye.", body: "Sin login. Orbe mantiene el contexto entre visitas, convierte una conversación en un proyecto real con su propio Brand DNA y assets, y retoma justo donde lo dejaste.", items: ["llegada", "conversación", "intención", "memoria", "Brand DNA", "assets", "próxima acción"] },
    osTitle: "¿Querés la experiencia completa?",
    osBody: "El CV interactivo original vive como un sistema operativo personal — ventanas, dock y un avatar 3D. Encendelo.",
    osCta: "Iniciar jpamorosi.os →",
    langNudge: "Elegí tu idioma",
    heroRole: "Ingeniero de Producto IA y Arquitecto de Sistemas",
    heroTagline: "Construyo sistemas potenciados por IA que sobreviven al contacto con la realidad.",
    heroThesis: "No demos — productos entregados: motores de orquestación multi-modelo, agentes WhatsApp en producción y una startup de comercio local en vivo. Primero arquitectura. Después mármol. Después neón.",
    heroCta1: "Entrar a las Salas de Prueba", heroCta2: "Explorar las salas", heroCta3: "Abrir jpamorosi.os →",
    heroCaps: "Capacidades → probadas en",
  },
  pt: {
    navIntro: "Início", navHall: "Salas de Prova", navFeatured: "Sistemas em Órbita", navArchive: "Fragmentos do Lab", navContact: "Contato",
    hallEyebrow: "Salas de Prova", hallTitle: "Sistemas que sobreviveram ao contato com a realidade.",
    hallDesc: "Uma sala escura de troféus. Cada destaque prova uma tese de contratação: orquestração avançada de IA, agentes em produção e execução startup ao vivo.",
    featuredEyebrow: "Sistemas em Órbita", featuredTitle: "Outras construções em torno da mesma tese.",
    featuredDesc: "Trabalho substancial que reforça a história sem competir com as salas principais.",
    archiveEyebrow: "Fragmentos do Lab", archiveTitle: "Experimentos, protótipos e obsessões úteis.",
    archiveDesc: "Protótipos, ferramentas e fragmentos de pesquisa. Evidência, não atos principais.",
    browseAll: "Ver todas as salas de projetos (Hall + Destaques + Arquivo) →",
    contactEyebrow: "Aberto a trabalho",
    contactTitle: "Disponível para funções de AI Product Engineering, Arquitetura de Sistemas de IA e Full-Stack AI.",
    contactBody: "Projeto arquitetura de IA, entrego produtos full-stack e transformo problemas difusos de founders em sistemas que sobrevivem ao contato com a realidade. Se é isso que você procura, vamos conversar.",
    contactEmail: "Enviar email", contactExplore: "Explorar projetos",
    contactForm: { name: "Nome", namePh: "Seu nome", email: "Email", emailPh: "voce@empresa.com", message: "Mensagem", messagePh: "Conte sobre seu projeto, cargo ou ideia…", send: "Enviar mensagem →", sending: "Enviando…", sentTitle: "Mensagem enviada", sentBody: "Obrigado por escrever — respondo em breve." },
    il1: { eyebrow: "ANTES DOS SISTEMAS", heading: "Primeiro veio o construtor.", body: "Antes da IA e da arquitetura houve um garoto em Bahía Blanca desmontando coisas — comércio, atrito do mundo real e o software como o instrumento que unia tudo.", items: ["Comércio", "Atrito real", "Software como instrumento", "Bahía Blanca", "Alún"] },
    il2: { eyebrow: "VOCÊ ESTÁ DENTRO DA PROVA", heading: "Este portfólio também está rodando.", body: "A página que você está lendo roda no mesmo stack que exibe: um front em Next.js, o Orbe respondendo com memória, Postgres e R2 guardando estado, e um scout autônomo trabalhando em segundo plano.", items: ["UI pública", "Orbe · inteligência", "Postgres · memória", "Scout · autonomia"] },
    il3: { eyebrow: "A CAMADA VIVA", heading: "Lembra, conecta e constrói.", body: "Sem login. O Orbe mantém o contexto entre visitas, transforma uma conversa num projeto real com seu próprio Brand DNA e assets, e retoma exatamente de onde você parou.", items: ["chegada", "conversa", "intenção", "memória", "Brand DNA", "assets", "próxima ação"] },
    osTitle: "Quer a experiência completa?",
    osBody: "O CV interativo original vive como um sistema operacional pessoal — janelas, dock e um avatar 3D. Inicie.",
    osCta: "Abrir jpamorosi.os →",
    langNudge: "Escolha seu idioma",
    heroRole: "Engenheiro de Produto IA e Arquiteto de Sistemas",
    heroTagline: "Construo sistemas com IA que sobrevivem ao contato com a realidade.",
    heroThesis: "Não demos — produtos entregues: motores de orquestração multi-modelo, agentes WhatsApp em produção e uma startup de comércio local ao vivo. Primeiro arquitetura. Depois mármore. Depois néon.",
    heroCta1: "Entrar nas Salas de Prova", heroCta2: "Explorar as salas", heroCta3: "Abrir jpamorosi.os →",
    heroCaps: "Capacidades → provadas em",
  },
  fr: {
    navIntro: "Intro", navHall: "Salles de Preuve", navFeatured: "Systèmes en Orbite", navArchive: "Fragments du Lab", navContact: "Contact",
    hallEyebrow: "Salles de Preuve", hallTitle: "Des systèmes qui ont survécu au contact du réel.",
    hallDesc: "Une salle sombre de trophées. Chaque système phare prouve une thèse d'embauche : orchestration IA avancée, agents en production et exécution startup en direct.",
    featuredEyebrow: "Systèmes en Orbite", featuredTitle: "D'autres constructions autour de la même thèse.",
    featuredDesc: "Un travail substantiel qui renforce l'histoire sans concurrencer les salles phares.",
    archiveEyebrow: "Fragments du Lab", archiveTitle: "Expériences, prototypes et obsessions utiles.",
    archiveDesc: "Prototypes, outils et fragments de recherche. Des preuves, pas des têtes d'affiche.",
    browseAll: "Voir toutes les salles de projets (Hall + Vedettes + Archives) →",
    contactEyebrow: "Ouvert aux opportunités",
    contactTitle: "Disponible pour des rôles d'AI Product Engineering, d'architecture de systèmes IA et de Full-Stack AI.",
    contactBody: "Je conçois des architectures IA, je livre des produits full-stack et je transforme des problèmes flous en systèmes qui survivent au contact de la réalité. Si c'est ce que vous cherchez, parlons-en.",
    contactEmail: "Envoyer un email", contactExplore: "Explorer les projets",
    contactForm: { name: "Nom", namePh: "Votre nom", email: "Email", emailPh: "vous@entreprise.com", message: "Message", messagePh: "Parlez-moi de votre projet, poste ou idée…", send: "Envoyer le message →", sending: "Envoi…", sentTitle: "Message envoyé", sentBody: "Merci de votre message — je vous réponds bientôt." },
    il1: { eyebrow: "AVANT LES SYSTÈMES", heading: "Le bâtisseur d'abord.", body: "Avant l'IA et l'architecture, il y a eu un gamin à Bahía Blanca qui démontait tout — le commerce, les frictions du monde réel, et le logiciel comme l'instrument qui reliait le tout.", items: ["Commerce", "Friction réelle", "Le logiciel comme instrument", "Bahía Blanca", "Alún"] },
    il2: { eyebrow: "VOUS ÊTES DANS LA PREUVE", heading: "Ce portfolio est un système en marche.", body: "La page que vous lisez tourne sur la même stack qu'elle présente : un front Next.js, Orbe qui répond avec mémoire, Postgres et R2 qui gardent l'état, et un scout autonome qui travaille en arrière-plan.", items: ["UI publique", "Orbe · intelligence", "Postgres · mémoire", "Scout · autonomie"] },
    il3: { eyebrow: "LA COUCHE VIVANTE", heading: "Elle se souvient, relie et construit.", body: "Sans connexion. Orbe garde le contexte entre les visites, transforme une conversation en projet réel avec son propre Brand DNA et ses assets, et reprend là où vous vous étiez arrêté.", items: ["arrivée", "conversation", "intention", "mémoire", "Brand DNA", "assets", "action suivante"] },
    osTitle: "Envie de l'expérience complète ?",
    osBody: "Le CV interactif original vit comme un système d'exploitation personnel — fenêtres, dock et avatar 3D. Démarrez-le.",
    osCta: "Lancer jpamorosi.os →",
    langNudge: "Choisissez votre langue",
    heroRole: "Ingénieur Produit IA & Architecte de Systèmes",
    heroTagline: "Je construis des systèmes propulsés par l'IA qui survivent au contact de la réalité.",
    heroThesis: "Pas des démos — des produits livrés : moteurs d'orchestration multi-modèles, agents WhatsApp en production et une startup de commerce local en direct. L'architecture d'abord. Puis le marbre. Puis le néon.",
    heroCta1: "Entrer dans les Salles de Preuve", heroCta2: "Explorer les salles", heroCta3: "Ouvrir jpamorosi.os →",
    heroCaps: "Capacités → prouvées dans",
  },
  ru: {
    navIntro: "Интро", navHall: "Комнаты доказательств", navFeatured: "Системы на орбите", navArchive: "Фрагменты лаборатории", navContact: "Контакт",
    hallEyebrow: "Комнаты доказательств", hallTitle: "Системы, выжившие при столкновении с реальностью.",
    hallDesc: "Тёмный зал трофеев. Каждый флагман доказывает ключевой тезис: продвинутая оркестрация ИИ, агенты в продакшене и живое стартап-исполнение.",
    featuredEyebrow: "Системы на орбите", featuredTitle: "Другие проекты вокруг той же идеи.",
    featuredDesc: "Значимые работы, усиливающие историю, не конкурируя с флагманскими залами.",
    archiveEyebrow: "Фрагменты лаборатории", archiveTitle: "Эксперименты, прототипы и полезные одержимости.",
    archiveDesc: "Прототипы, инструменты и фрагменты исследований. Доказательства, а не заголовки.",
    browseAll: "Все залы проектов (Зал славы + Избранное + Архив) →",
    contactEyebrow: "Открыт к работе",
    contactTitle: "Доступен для ролей AI Product Engineering, архитектуры ИИ-систем и Full-Stack AI.",
    contactBody: "Проектирую ИИ-архитектуру, выпускаю full-stack продукты и превращаю размытые задачи в системы, выживающие при контакте с реальностью. Если вы ищете это — давайте поговорим.",
    contactEmail: "Написать на email", contactExplore: "Смотреть проекты",
    contactForm: { name: "Имя", namePh: "Ваше имя", email: "Email", emailPh: "you@company.com", message: "Сообщение", messagePh: "Расскажите о вашем проекте, роли или идее…", send: "Отправить →", sending: "Отправка…", sentTitle: "Сообщение отправлено", sentBody: "Спасибо за сообщение — скоро отвечу." },
    il1: { eyebrow: "ДО СИСТЕМ", heading: "Сначала был строитель.", body: "До ИИ и архитектуры был мальчишка в Баия-Бланке, разбиравший всё на части — торговля, трение реального мира и софт как инструмент, связавший это вместе.", items: ["Торговля", "Реальное трение", "Софт как инструмент", "Баия-Бланка", "Alún"] },
    il2: { eyebrow: "ВЫ ВНУТРИ ДОКАЗАТЕЛЬСТВА", heading: "Это портфолио — работающая система.", body: "Страница, которую вы читаете, работает на том же стеке, что и показывает: фронт на Next.js, Orbe отвечает с памятью, Postgres и R2 хранят состояние, а автономный scout работает в фоне.", items: ["Публичный UI", "Orbe · интеллект", "Postgres · память", "Scout · автономия"] },
    il3: { eyebrow: "ЖИВОЙ СЛОЙ", heading: "Она помнит, связывает и строит.", body: "Без входа. Orbe хранит контекст между визитами, превращает разговор в реальный проект со своим Brand DNA и ассетами и продолжает ровно с того места, где вы остановились.", items: ["приход", "разговор", "намерение", "память", "Brand DNA", "ассеты", "следующий шаг"] },
    osTitle: "Хотите полный опыт?",
    osBody: "Оригинальное интерактивное CV живёт как персональная ОС — окна, док и 3D-аватар. Запустите её.",
    osCta: "Запустить jpamorosi.os →",
    langNudge: "Выберите язык",
    heroRole: "Инженер AI-продуктов и архитектор систем",
    heroTagline: "Я создаю системы на базе ИИ, которые выживают при контакте с реальностью.",
    heroThesis: "Не демо — выпущенные продукты: движки мульти-модельной оркестрации, WhatsApp-агенты в продакшене и живой стартап локальной коммерции. Сначала архитектура. Потом мрамор. Потом неон.",
    heroCta1: "В Комнаты доказательств", heroCta2: "Смотреть залы проектов", heroCta3: "Открыть jpamorosi.os →",
    heroCaps: "Компетенции → доказаны в",
  },
  zh: {
    navIntro: "首页", navHall: "实证展厅", navFeatured: "在轨系统", navArchive: "实验室碎片", navContact: "联系",
    hallEyebrow: "实证展厅", hallTitle: "经受住现实考验的系统。",
    hallDesc: "一间陈列奖杯的暗室。每个旗舰项目都证明一个核心命题：高级 AI 编排、生产级智能体与真实的创业执行。",
    featuredEyebrow: "在轨系统", featuredTitle: "围绕同一命题的其他构建。",
    featuredDesc: "扎实的作品，强化整体叙事，而不与旗舰展厅竞争。",
    archiveEyebrow: "实验室碎片", archiveTitle: "实验、原型与有用的执念。",
    archiveDesc: "原型、工具与研究片段。是证据，而非头条。",
    browseAll: "浏览所有项目展厅（名人堂 + 精选 + 档案）→",
    contactEyebrow: "开放合作",
    contactTitle: "可担任 AI 产品工程、AI 系统架构与全栈 AI 相关职位。",
    contactBody: "我设计 AI 架构，交付全栈产品，把模糊的创业问题变成经得起现实考验的系统。如果这正是你要找的，聊聊吧。",
    contactEmail: "直接发邮件", contactExplore: "浏览项目",
    contactForm: { name: "姓名", namePh: "你的名字", email: "邮箱", emailPh: "you@company.com", message: "留言", messagePh: "介绍一下你的项目、职位或想法…", send: "发送 →", sending: "发送中…", sentTitle: "已发送", sentBody: "感谢联系——我会尽快回复。" },
    il1: { eyebrow: "在系统之前", heading: "先有的是建造者。", body: "在 AI 与架构之前，是巴伊亚布兰卡的一个孩子在拆解万物——商业、现实世界的摩擦，以及作为把这一切串联起来的工具的软件。", items: ["商业", "现实摩擦", "软件作为工具", "巴伊亚布兰卡", "Alún"] },
    il2: { eyebrow: "你正身处实证之中", heading: "这个作品集本身就是一个运行中的系统。", body: "你正在阅读的页面，运行在它所展示的同一套技术栈上：Next.js 前端、带记忆回答的 Orbe、保存状态的 Postgres 与 R2，以及在后台运行的自主 scout。", items: ["公开 UI", "Orbe · 智能", "Postgres · 记忆", "Scout · 自主"] },
    il3: { eyebrow: "活的一层", heading: "它记忆、连接并构建。", body: "无需登录。Orbe 在多次访问间保持上下文，把一次对话变成拥有自己 Brand DNA 与素材的真实项目，并从你离开的地方继续。", items: ["到达", "对话", "意图", "记忆", "Brand DNA", "素材", "下一步"] },
    osTitle: "想要完整体验？",
    osBody: "最初的交互式简历作为个人操作系统存在——窗口、程序坞与 3D 头像。启动它。",
    osCta: "启动 jpamorosi.os →",
    langNudge: "选择你的语言",
    heroRole: "AI 产品工程师 & 系统架构师",
    heroTagline: "我构建经得起现实考验的 AI 驱动系统。",
    heroThesis: "不是演示——是交付的产品：多模型编排引擎、生产级 WhatsApp 智能体，以及一家运营中的本地商务创业公司。先架构，后大理石，再霓虹。",
    heroCta1: "进入实证展厅", heroCta2: "探索项目展厅", heroCta3: "打开 jpamorosi.os →",
    heroCaps: "能力 → 已验证于",
  },
  ar: {
    navIntro: "مقدمة", navHall: "غرف الإثبات", navFeatured: "أنظمة في المدار", navArchive: "شذرات المختبر", navContact: "تواصل",
    hallEyebrow: "غرف الإثبات", hallTitle: "أنظمة نجت من الاصطدام بالواقع.",
    hallDesc: "غرفة مظلمة من الجوائز. كل نظام رائد يثبت أطروحة توظيف رئيسية: تنسيق متقدم للذكاء الاصطناعي، ووكلاء في الإنتاج، وتنفيذ حقيقي لشركة ناشئة.",
    featuredEyebrow: "أنظمة في المدار", featuredTitle: "بناءات أخرى حول الأطروحة نفسها.",
    featuredDesc: "أعمال جوهرية تعزز القصة دون منافسة الغرف الرائدة.",
    archiveEyebrow: "شذرات المختبر", archiveTitle: "تجارب ونماذج وهواجس مفيدة.",
    archiveDesc: "نماذج أولية وأدوات وشذرات بحثية. أدلة، لا عناوين.",
    browseAll: "تصفح كل غرف المشاريع (القاعة + المميز + الأرشيف) ←",
    contactEyebrow: "متاح للعمل",
    contactTitle: "متاح لأدوار هندسة منتجات الذكاء الاصطناعي وهندسة أنظمة الذكاء الاصطناعي و Full-Stack AI.",
    contactBody: "أصمم بنى الذكاء الاصطناعي وأطلق منتجات متكاملة وأحوّل مشاكل المؤسسين الغامضة إلى أنظمة تصمد أمام الواقع. إن كان هذا ما تبحث عنه، فلنتحدث.",
    contactEmail: "أرسل بريداً", contactExplore: "استكشف المشاريع",
    contactForm: { name: "الاسم", namePh: "اسمك", email: "البريد", emailPh: "you@company.com", message: "الرسالة", messagePh: "أخبرني عن مشروعك أو دورك أو فكرتك…", send: "إرسال ←", sending: "جارٍ الإرسال…", sentTitle: "تم الإرسال", sentBody: "شكراً لتواصلك — سأرد قريباً." },
    il1: { eyebrow: "قبل الأنظمة", heading: "البنّاء أولاً.", body: "قبل الذكاء الاصطناعي والهندسة، كان هناك صبيٌّ في باهيا بلانكا يفكّك الأشياء — التجارة، واحتكاك العالم الحقيقي، والبرمجيات كأداة تربط ذلك كله.", items: ["التجارة", "احتكاك حقيقي", "البرمجيات كأداة", "باهيا بلانكا", "Alún"] },
    il2: { eyebrow: "أنت داخل الدليل", heading: "هذه المحفظة نظام قيد التشغيل.", body: "الصفحة التي تقرأها تعمل على نفس المنظومة التي تعرضها: واجهة Next.js، وOrbe يجيب بذاكرة، وPostgres وR2 يحفظان الحالة، وscout مستقل يعمل في الخلفية.", items: ["واجهة عامة", "Orbe · ذكاء", "Postgres · ذاكرة", "Scout · استقلالية"] },
    il3: { eyebrow: "الطبقة الحية", heading: "تتذكر، تربط، وتبني.", body: "بلا تسجيل دخول. يحتفظ Orbe بالسياق بين الزيارات، ويحوّل محادثة إلى مشروع حقيقي بهوية Brand DNA وأصول خاصة به، ويكمل من حيث توقفت.", items: ["الوصول", "محادثة", "نية", "ذاكرة", "Brand DNA", "أصول", "الخطوة التالية"] },
    osTitle: "أتريد التجربة الكاملة؟",
    osBody: "السيرة التفاعلية الأصلية تعيش كنظام تشغيل شخصي — نوافذ وشريط تطبيقات وصورة رمزية ثلاثية الأبعاد. شغّلها.",
    osCta: "تشغيل jpamorosi.os ←",
    langNudge: "اختر لغتك",
    heroRole: "مهندس منتجات ذكاء اصطناعي ومهندس أنظمة",
    heroTagline: "أبني أنظمة مدعومة بالذكاء الاصطناعي تصمد أمام الواقع.",
    heroThesis: "ليست عروضاً تجريبية — منتجات مُسلَّمة: محركات تنسيق متعددة النماذج، ووكلاء واتساب في الإنتاج، وشركة ناشئة حية للتجارة المحلية. العمارة أولاً. ثم الرخام. ثم النيون.",
    heroCta1: "ادخل غرف الإثبات", heroCta2: "استكشف غرف المشاريع", heroCta3: "افتح jpamorosi.os ←",
    heroCaps: "القدرات ← مثبتة في",
  },
};

// ---- cards + project-room chrome ---------------------------------------------

export type RoomDict = {
  enter: string;
  proofEyebrow: string; proofTitle: string; stack: string;
  provesEyebrow: string; provesTitle: string;
  archEyebrow: string; archTitle: string;
  motionEyebrow: string; motionTitle: string;
  evidenceEyebrow: string; evidenceTitle: string; evidenceEmpty: string;
  founderEyebrow: string; founderTitle: string;
  getEyebrow: string; getTitle: string;
  relatedEyebrow: string; relatedTitle: string;
  exploreMore: string; backHall: string; allRooms: string; openOs: string;
  linkWebsite: string; linkDemo: string; linkSource: string;
  flipTryLive: string; flipOpenSite: string; flipStore: string; flipGetPlay: string;
  flipSee: string; flipOpenDemo: string; flipCode: string; flipGithub: string;
  flipFriction: string; flipTalk: string; flipStory: string; flipSeeLive: string;
  indexTitle: string; indexDesc: string; indexBack: string;
};

export const ROOM: Record<Lang, RoomDict> = {
  en: {
    enter: "Enter →",
    proofEyebrow: "Proof", proofTitle: "Why this matters", stack: "Stack",
    provesEyebrow: "What this proves", provesTitle: "Capabilities backed by this system",
    archEyebrow: "Architecture", archTitle: "How it's wired",
    motionEyebrow: "In motion", motionTitle: "See the system running",
    evidenceEyebrow: "Evidence", evidenceTitle: "Evidence wall",
    evidenceEmpty: "Media coming soon — screenshots and captures will land here.",
    founderEyebrow: "Founder note", founderTitle: "From the builder",
    getEyebrow: "Get it", getTitle: "Try it where it lives",
    relatedEyebrow: "Related systems", relatedTitle: "Explore next",
    exploreMore: "Explore more of Amorosi Labs", backHall: "← Back to Proof Rooms",
    allRooms: "All project rooms", openOs: "Open jpamorosi.os →",
    linkWebsite: "Visit website", linkDemo: "Live demo", linkSource: "Source on GitHub",
    flipTryLive: "Try it live", flipOpenSite: "Open the website ↗",
    flipStore: "Real users, real store", flipGetPlay: "Get it on Google Play ↗",
    flipSee: "See it running", flipOpenDemo: "Open the demo ↗",
    flipCode: "Read the code", flipGithub: "Source on GitHub ↗",
    flipFriction: "Built under real friction", flipTalk: "Talk to Juan →",
    flipStory: "Want the full story?", flipSeeLive: "See it live ↗",
    indexTitle: "Project Rooms",
    indexDesc: "A lab-gallery of shipped systems, AI engines and founder experiments — each with its own room.",
    indexBack: "← Amorosi Labs",
  },
  es: {
    enter: "Entrar →",
    proofEyebrow: "Prueba", proofTitle: "Por qué importa", stack: "Stack",
    provesEyebrow: "Qué demuestra", provesTitle: "Capacidades respaldadas por este sistema",
    archEyebrow: "Arquitectura", archTitle: "Cómo está cableado",
    motionEyebrow: "En movimiento", motionTitle: "Mirá el sistema funcionando",
    evidenceEyebrow: "Evidencia", evidenceTitle: "Muro de evidencia",
    evidenceEmpty: "Material en camino — capturas y screenshots van a aterrizar acá.",
    founderEyebrow: "Nota del founder", founderTitle: "Desde el constructor",
    getEyebrow: "Conseguilo", getTitle: "Probalo donde vive",
    relatedEyebrow: "Sistemas relacionados", relatedTitle: "Explorá lo siguiente",
    exploreMore: "Explorá más de Amorosi Labs", backHall: "← Volver a las Salas de Prueba",
    allRooms: "Todas las salas", openOs: "Abrir jpamorosi.os →",
    linkWebsite: "Visitar el sitio", linkDemo: "Demo en vivo", linkSource: "Código en GitHub",
    flipTryLive: "Probalo en vivo", flipOpenSite: "Abrir el sitio ↗",
    flipStore: "Usuarios reales, tienda real", flipGetPlay: "Descargar en Google Play ↗",
    flipSee: "Miralo funcionando", flipOpenDemo: "Abrir la demo ↗",
    flipCode: "Leé el código", flipGithub: "Código en GitHub ↗",
    flipFriction: "Construido bajo fricción real", flipTalk: "Hablá con Juan →",
    flipStory: "¿Querés la historia completa?", flipSeeLive: "Verlo en vivo ↗",
    indexTitle: "Salas de Proyectos",
    indexDesc: "Una galería-laboratorio de sistemas entregados, motores de IA y experimentos de founder — cada uno con su propia sala.",
    indexBack: "← Amorosi Labs",
  },
  pt: {
    enter: "Entrar →",
    proofEyebrow: "Prova", proofTitle: "Por que importa", stack: "Stack",
    provesEyebrow: "O que isso prova", provesTitle: "Capacidades sustentadas por este sistema",
    archEyebrow: "Arquitetura", archTitle: "Como está conectado",
    motionEyebrow: "Em movimento", motionTitle: "Veja o sistema rodando",
    evidenceEyebrow: "Evidência", evidenceTitle: "Mural de evidências",
    evidenceEmpty: "Material a caminho — capturas e screenshots vão aterrissar aqui.",
    founderEyebrow: "Nota do founder", founderTitle: "Direto do construtor",
    getEyebrow: "Adquira", getTitle: "Experimente onde ele vive",
    relatedEyebrow: "Sistemas relacionados", relatedTitle: "Explore a seguir",
    exploreMore: "Explore mais do Amorosi Labs", backHall: "← Voltar às Salas de Prova",
    allRooms: "Todas as salas", openOs: "Abrir jpamorosi.os →",
    linkWebsite: "Visitar o site", linkDemo: "Demo ao vivo", linkSource: "Código no GitHub",
    flipTryLive: "Experimente ao vivo", flipOpenSite: "Abrir o site ↗",
    flipStore: "Usuários reais, loja real", flipGetPlay: "Baixar no Google Play ↗",
    flipSee: "Veja funcionando", flipOpenDemo: "Abrir a demo ↗",
    flipCode: "Leia o código", flipGithub: "Código no GitHub ↗",
    flipFriction: "Construído sob fricção real", flipTalk: "Fale com Juan →",
    flipStory: "Quer a história completa?", flipSeeLive: "Ver ao vivo ↗",
    indexTitle: "Salas de Projetos",
    indexDesc: "Uma galeria-laboratório de sistemas entregues, motores de IA e experimentos de founder — cada um com sua própria sala.",
    indexBack: "← Amorosi Labs",
  },
  fr: {
    enter: "Entrer →",
    proofEyebrow: "Preuve", proofTitle: "Pourquoi c'est important", stack: "Stack",
    provesEyebrow: "Ce que cela prouve", provesTitle: "Capacités adossées à ce système",
    archEyebrow: "Architecture", archTitle: "Comment c'est câblé",
    motionEyebrow: "En mouvement", motionTitle: "Voir le système en marche",
    evidenceEyebrow: "Preuves", evidenceTitle: "Mur de preuves",
    evidenceEmpty: "Contenus à venir — captures et screenshots atterriront ici.",
    founderEyebrow: "Note du fondateur", founderTitle: "Par le constructeur",
    getEyebrow: "L'obtenir", getTitle: "Essayez-le là où il vit",
    relatedEyebrow: "Systèmes liés", relatedTitle: "À explorer ensuite",
    exploreMore: "Explorer plus d'Amorosi Labs", backHall: "← Retour aux Salles de Preuve",
    allRooms: "Toutes les salles", openOs: "Ouvrir jpamorosi.os →",
    linkWebsite: "Visiter le site", linkDemo: "Démo en direct", linkSource: "Code sur GitHub",
    flipTryLive: "Essayez en direct", flipOpenSite: "Ouvrir le site ↗",
    flipStore: "Vrais utilisateurs, vraie boutique", flipGetPlay: "Télécharger sur Google Play ↗",
    flipSee: "Voyez-le tourner", flipOpenDemo: "Ouvrir la démo ↗",
    flipCode: "Lire le code", flipGithub: "Code sur GitHub ↗",
    flipFriction: "Construit sous friction réelle", flipTalk: "Parler à Juan →",
    flipStory: "Envie de toute l'histoire ?", flipSeeLive: "Voir en direct ↗",
    indexTitle: "Salles de Projets",
    indexDesc: "Une galerie-laboratoire de systèmes livrés, de moteurs IA et d'expériences de fondateur — chacun avec sa propre salle.",
    indexBack: "← Amorosi Labs",
  },
  ru: {
    enter: "Войти →",
    proofEyebrow: "Доказательство", proofTitle: "Почему это важно", stack: "Стек",
    provesEyebrow: "Что это доказывает", provesTitle: "Компетенции, подтверждённые этой системой",
    archEyebrow: "Архитектура", archTitle: "Как это устроено",
    motionEyebrow: "В движении", motionTitle: "Смотрите систему в работе",
    evidenceEyebrow: "Свидетельства", evidenceTitle: "Стена доказательств",
    evidenceEmpty: "Материалы скоро — скриншоты и записи появятся здесь.",
    founderEyebrow: "Заметка основателя", founderTitle: "От создателя",
    getEyebrow: "Получить", getTitle: "Попробуйте там, где оно живёт",
    relatedEyebrow: "Связанные системы", relatedTitle: "Смотреть дальше",
    exploreMore: "Больше Amorosi Labs", backHall: "← Назад в Комнаты доказательств",
    allRooms: "Все залы проектов", openOs: "Открыть jpamorosi.os →",
    linkWebsite: "Открыть сайт", linkDemo: "Живое демо", linkSource: "Код на GitHub",
    flipTryLive: "Попробуйте вживую", flipOpenSite: "Открыть сайт ↗",
    flipStore: "Реальные пользователи, реальный стор", flipGetPlay: "Скачать в Google Play ↗",
    flipSee: "Смотрите в работе", flipOpenDemo: "Открыть демо ↗",
    flipCode: "Читайте код", flipGithub: "Код на GitHub ↗",
    flipFriction: "Создано в условиях реального трения", flipTalk: "Поговорить с Хуаном →",
    flipStory: "Хотите всю историю?", flipSeeLive: "Увидеть вживую ↗",
    indexTitle: "Залы проектов",
    indexDesc: "Галерея-лаборатория выпущенных систем, ИИ-движков и экспериментов основателя — у каждого свой зал.",
    indexBack: "← Amorosi Labs",
  },
  zh: {
    enter: "进入 →",
    proofEyebrow: "实证", proofTitle: "为什么重要", stack: "技术栈",
    provesEyebrow: "这证明了什么", provesTitle: "由该系统支撑的能力",
    archEyebrow: "架构", archTitle: "系统是如何连接的",
    motionEyebrow: "运行中", motionTitle: "看看系统的实际运行",
    evidenceEyebrow: "证据", evidenceTitle: "证据墙",
    evidenceEmpty: "素材即将上线——截图与录屏会陈列在这里。",
    founderEyebrow: "创始人笔记", founderTitle: "来自构建者",
    getEyebrow: "获取", getTitle: "在它的家里试试它",
    relatedEyebrow: "相关系统", relatedTitle: "接着探索",
    exploreMore: "探索更多 Amorosi Labs", backHall: "← 返回实证展厅",
    allRooms: "所有项目展厅", openOs: "打开 jpamorosi.os →",
    linkWebsite: "访问网站", linkDemo: "在线演示", linkSource: "GitHub 源码",
    flipTryLive: "在线体验", flipOpenSite: "打开网站 ↗",
    flipStore: "真实用户，真实商店", flipGetPlay: "在 Google Play 获取 ↗",
    flipSee: "看它运行", flipOpenDemo: "打开演示 ↗",
    flipCode: "阅读代码", flipGithub: "GitHub 源码 ↗",
    flipFriction: "在真实摩擦中构建", flipTalk: "与 Juan 聊聊 →",
    flipStory: "想了解完整故事？", flipSeeLive: "看它上线 ↗",
    indexTitle: "项目展厅",
    indexDesc: "一座实验室画廊：交付的系统、AI 引擎与创始人实验——每个都有自己的展厅。",
    indexBack: "← Amorosi Labs",
  },
  ar: {
    enter: "ادخل ←",
    proofEyebrow: "الدليل", proofTitle: "لماذا هذا مهم", stack: "التقنيات",
    provesEyebrow: "ماذا يثبت هذا", provesTitle: "قدرات يدعمها هذا النظام",
    archEyebrow: "البنية", archTitle: "كيف تم توصيله",
    motionEyebrow: "قيد التشغيل", motionTitle: "شاهد النظام يعمل",
    evidenceEyebrow: "شواهد", evidenceTitle: "جدار الأدلة",
    evidenceEmpty: "الوسائط قادمة — لقطات الشاشة والتسجيلات ستظهر هنا.",
    founderEyebrow: "ملاحظة المؤسس", founderTitle: "من البنّاء",
    getEyebrow: "احصل عليه", getTitle: "جرّبه حيث يعيش",
    relatedEyebrow: "أنظمة ذات صلة", relatedTitle: "استكشف التالي",
    exploreMore: "استكشف المزيد من Amorosi Labs", backHall: "← العودة إلى غرف الإثبات",
    allRooms: "كل غرف المشاريع", openOs: "افتح jpamorosi.os ←",
    linkWebsite: "زيارة الموقع", linkDemo: "عرض مباشر", linkSource: "الكود على GitHub",
    flipTryLive: "جرّبه مباشرة", flipOpenSite: "افتح الموقع ↗",
    flipStore: "مستخدمون حقيقيون، متجر حقيقي", flipGetPlay: "حمّله من Google Play ↗",
    flipSee: "شاهده يعمل", flipOpenDemo: "افتح العرض ↗",
    flipCode: "اقرأ الكود", flipGithub: "الكود على GitHub ↗",
    flipFriction: "بُني تحت احتكاك حقيقي", flipTalk: "تحدث مع خوان ←",
    flipStory: "أتريد القصة كاملة؟", flipSeeLive: "شاهده مباشرة ↗",
    indexTitle: "غرف المشاريع",
    indexDesc: "معرض-مختبر لأنظمة مُسلَّمة ومحركات ذكاء اصطناعي وتجارب مؤسس — لكل منها غرفتها الخاصة.",
    indexBack: "← Amorosi Labs",
  },
};

// ---- assistant (greetings, nudges, thinking steps) ----------------------------
// Every preset string Orbe speaks is here, per language. Changing the
// site language via LanguageSwitch re-reads this dict client-side, so the
// greeting, nudges and "thinking…" steps flip with the visitor — and the
// `lang` we ship in the request body tells the orchestrator to reply in the
// same language end-to-end.

export type AssistantDict = {
  threads: {
    omni: { title: string; tagline: string; greeting: string; suggestions: string[] };
    project: { title: string; tagline: string; greeting: string; suggestions: string[] };
    branding: { title: string; tagline: string; greeting: string; suggestions: string[] };
  };
  nudges: Array<{ id: string; text: string; cta: string; prompt: string }>;
  thinking: string[];
  popup: {
    hello: string;            // the BIG word "¡Hola!" / "Hi!" / etc.
    body: string;             // the explanation under the hello
    ctaPrimary: string;       // "Show me around →"
    ctaSecondary: string;     // "I'll ask my own"
    dismissPreset: string;    // "Not now"
    dismissAria: string;      // "Dismiss greeting"
    dialogAria: string;       // "Assistant greeting"
  };
  panel: {
    title: string;            // "Orbe"
    tagline: string;          // "online · answers from Juan's real work"
    closeAria: string;        // close chat button
    openAria: string;         // open chat button (launcher)
    launcherOpen: string;     // aria-label "Open Orbe"
    launcherClose: string;    // aria-label "Close Orbe"
    dockAria: string;         // aria-label for the dock area
    messageAria: string;      // composer input
    newConversation: string;  // "+ New conversation" tab button
    typing: string;           // "Guide is typing" status
    removeAttachment: string; // X button on a pending image
    attachImage: string;      // paperclip / image attach button
    lockedBody: string;       // "Pin a project above to unlock this space — or create a new one with +"
    lockedAction: string;     // "Open project setup"
  };
  composer: {
    placeholder: string;      // "Ask anything about Juan's work…"
    locked: string;           // "Foundations first — create your project above 🏗"
    send: string;             // "Send"
  };
};

// ---- wizard (project room + branding setup) ----------------------------------
// The 6-step foundations wizard in AssistantProjectOrbit and the tiny
// chrome of ProjectStrip / BrandingBoard. Every preset string the visitor
// reads while pinning a pre-project lives here.

export type WizardDict = {
  stripActive: string;        // "activo" / "active" / …
  stripNew: string;           // aria-label "Nuevo proyecto" / "New project"
  stripMulti: string;         // "multi-selección" / "multi-select"
  headerTitle: string;        // "🚀 Cimientos de tu proyecto"
  headerSub: string;          // subtitle "Sin cimientos…"
  failed: string;             // error toast when create fails
  phName: string;             // "Nombre del proyecto…"
  phPitch: string;            // "ej: Reservas de canchas…"
  pitchHint: string;          // "Una línea. Qué es y para quién…"
  kindHint?: string;          // (none currently)
  adnHint: string;            // "Tono, colores que te gustan…"
  adnPlaceholder: string;     // "ej: Serio pero cálido…"
  devTitle: string;           // "¿Sos dev / tenés stack definido?"
  devHint: string;            // "Si querés que use algo puntual…"
  devPlaceholder: string;     // "ej: Next.js, Tailwind, Postgres"
  needsHint: string;          // "Tildá lo que aplica…"
  visionHint: string;         // "Última parada. Qué problema…"
  visionPh: string;           // "Contá la idea con tus palabras…"
  paletteHint: string;        // "Elegí 2–4 colores…"
  logoHint: string;           // "¿Tenés un logo o imagen de referencia?…"
  logoBtn: string;            // "Subir logo / imagen"
  logoUploading: string;      // "Subiendo…"
  foundationSteps: string[];  // 4 lines shown during POST
  stepTitles: string[];       // step titles (name→…→colors→logo)
  buildTitle: (name: string) => string;  // "🏗 Creando \"X\""
  next: string;               // "Siguiente →"
  back: string;               // "← Atrás"
  skip: string;               // "Saltar →"
  cancel: string;             // "Cancelar"
  create: string;             // "⚡ Crear los cimientos"
  generate: string;           // "Generar concepto"
};

export const WIZARD: Record<Lang, WizardDict> = {
  en: {
    stripActive: "active", stripNew: "New project", stripMulti: "multi-select",
    headerTitle: "🚀 Your project's foundations",
    headerSub: "No foundations, no conversation: answer what you can, skip the rest.",
    failed: "Couldn't create it — try again.",
    phName: "Project name…",
    phPitch: "e.g. Paddle court bookings, for amateur players",
    pitchHint: "One line. What it is and for whom. Orbe uses this to start the conversation.",
    adnHint: "Tone, colors you like, visual references. Feeds the palette and the branding later.",
    adnPlaceholder: "e.g. Serious but warm, earthy palette, Notion+Stripe vibe",
    devTitle: "Are you a dev / do you have a stack?",
    devHint: "If you want specific tech, list it here. Commas or newlines separate.",
    devPlaceholder: "e.g. Next.js, Tailwind, Postgres",
    needsHint: "Check what applies — Orbe translates this into a real stack. No tech knowledge needed.",
    visionHint: "Almost there. What problem it solves and what makes it different. We chat from here.",
    visionPh: "Describe the idea in your own words…",
    paletteHint: "Pick 2–4 colors — or keep the suggested ones. You can refine them with Orbe later.",
    logoHint: "Have a logo or a reference image? Drop it in. Optional — Orbe can generate one later.",
    logoBtn: "Upload logo / image",
    logoUploading: "Uploading…",
    foundationSteps: [
      "Laying the foundations…",
      "Locking the base stack…",
      "Sketching the identity…",
      "Preparing the orbit…",
    ],
    stepTitles: [
      "What's it called?",
      "One-line pitch (optional)",
      "What kind is it?",
      "Brand DNA (optional)",
      "What must it handle? (optional)",
      "What's the vision? (optional)",
      "Colors (optional)",
    ],
    buildTitle: (n) => `🏗 Building "${n}"`,
    next: "Next →", back: "← Back", skip: "Skip →", cancel: "Cancel",
    create: "⚡ Lay the foundations", generate: "Generate concept",
  },
  es: {
    stripActive: "activo", stripNew: "Nuevo proyecto", stripMulti: "multi-selección",
    headerTitle: "🚀 Cimientos de tu proyecto",
    headerSub: "Sin cimientos no hay conversación: respondé lo que puedas, saltá lo demás.",
    failed: "No pude crearlo — probá de nuevo.",
    phName: "Nombre del proyecto…",
    phPitch: "ej: Reservas de canchas de paddle, para jugadores amateurs",
    pitchHint: "Una línea. Qué es y para quién. Lo usa Orbe para arrancar la conversación.",
    adnHint: "Tono, colores que te gustan, referencias visuales. Esto alimenta la paleta y el branding después.",
    adnPlaceholder: "ej: Serio pero cálido, paleta tierra, algo tipo Notion+Stripe",
    devTitle: "¿Sos dev / tenés stack definido?",
    devHint: "Si querés que use algo puntual, listalo acá. Comas o saltos de línea separan.",
    devPlaceholder: "ej: Next.js, Tailwind, Postgres",
    needsHint: "Tildá lo que aplica — Orbe traduce esto a stack concreto. No necesitás saber tecnología.",
    visionHint: "Casi listo. Qué problema resuelve y qué la hace distinta. Charlamos en base a esto.",
    visionPh: "Contá la idea con tus palabras…",
    paletteHint: "Elegí 2–4 colores — o dejá los sugeridos. Después los podés refinar con Orbe.",
    logoHint: "¿Tenés un logo o una imagen de referencia? Subila. Opcional — Orbe puede generar uno después.",
    logoBtn: "Subir logo / imagen",
    logoUploading: "Subiendo…",
    foundationSteps: [
      "Colocando los cimientos…",
      "Definiendo el stack base…",
      "Dibujando la identidad…",
      "Preparando el orbe…",
    ],
    stepTitles: [
      "¿Cómo se llama?",
      "Pitch corto (opcional)",
      "¿Qué tipo es?",
      "ADN de marca (opcional)",
      "¿Qué tiene que bancar? (opcional)",
      "¿Cuál es la visión? (opcional)",
      "Colores (opcional)",
    ],
    buildTitle: (n) => `🏗 Creando "${n}"`,
    next: "Siguiente →", back: "← Atrás", skip: "Saltar →", cancel: "Cancelar",
    create: "⚡ Crear los cimientos", generate: "Generar concepto",
  },
  pt: {
    stripActive: "ativo", stripNew: "Novo projeto", stripMulti: "multi-seleção",
    headerTitle: "🚀 Fundações do seu projeto",
    headerSub: "Sem fundações, sem conversa: responda o que puder, pule o resto.",
    failed: "Não consegui criar — tente de novo.",
    phName: "Nome do projeto…",
    phPitch: "ex: Reservas de quadras de padel, para jogadores amadores",
    pitchHint: "Uma linha. O que é e para quem. Orbe usa isso pra abrir a conversa.",
    adnHint: "Tom, cores que você gosta, referências visuais. Alimenta a paleta e o branding depois.",
    adnPlaceholder: "ex: Sério mas caloroso, paleta terrosa, vibe Notion+Stripe",
    devTitle: "É dev / tem um stack definido?",
    devHint: "Se quiser tecnologia específica, liste aqui. Vírgulas ou linhas separam.",
    devPlaceholder: "ex: Next.js, Tailwind, Postgres",
    needsHint: "Marque o que se aplica — Orbe traduz isso num stack real. Não precisa saber tecnologia.",
    visionHint: "Quase lá. Que problema resolve e o que faz ser diferente. Conversamos daqui.",
    visionPh: "Conte a ideia com suas palavras…",
    paletteHint: "Escolha 2–4 cores — ou mantenha as sugeridas. Você pode refiná-las com o Orbe depois.",
    logoHint: "Tem um logo ou imagem de referência? Envie. Opcional — o Orbe pode gerar um depois.",
    logoBtn: "Enviar logo / imagem",
    logoUploading: "Enviando…",
    foundationSteps: [
      "Colocando as fundações…",
      "Travando o stack base…",
      "Esboçando a identidade…",
      "Preparando a órbita…",
    ],
    stepTitles: [
      "Como se chama?",
      "Pitch curto (opcional)",
      "Que tipo é?",
      "DNA de marca (opcional)",
      "O que tem que aguentar? (opcional)",
      "Qual é a visão? (opcional)",
      "Cores (opcional)",
    ],
    buildTitle: (n) => `🏗 Criando "${n}"`,
    next: "Próximo →", back: "← Voltar", skip: "Pular →", cancel: "Cancelar",
    create: "⚡ Criar as fundações", generate: "Gerar conceito",
  },
  fr: {
    stripActive: "actif", stripNew: "Nouveau projet", stripMulti: "multi-sélection",
    headerTitle: "🚀 Les fondations de votre projet",
    headerSub: "Pas de fondations, pas de conversation : répondez ce que vous pouvez, passez le reste.",
    failed: "Impossible de créer — réessayez.",
    phName: "Nom du projet…",
    phPitch: "ex : réservations de terrains de padel, pour joueurs amateurs",
    pitchHint: "Une ligne. Ce que c'est et pour qui. Orbe s'en sert pour ouvrir la conversation.",
    adnHint: "Ton, couleurs que vous aimez, références visuelles. Alimente la palette et le branding ensuite.",
    adnPlaceholder: "ex : sérieux mais chaleureux, palette terre, vibe Notion+Stripe",
    devTitle: "Vous êtes dev / vous avez un stack ?",
    devHint: "Si vous voulez une techno précise, listez-la ici. Virgules ou retours à la ligne.",
    devPlaceholder: "ex : Next.js, Tailwind, Postgres",
    needsHint: "Cochez ce qui s'applique — Orbe traduit ça en stack concret. Pas besoin de connaître la techno.",
    visionHint: "Presque fini. Quel problème ça résout et qu'est-ce qui le rend différent. On échange à partir de là.",
    visionPh: "Décrivez l'idée avec vos mots…",
    paletteHint: "Choisissez 2 à 4 couleurs — ou gardez celles suggérées. Vous pourrez les affiner avec Orbe plus tard.",
    logoHint: "Vous avez un logo ou une image de référence ? Déposez-le. Optionnel — Orbe peut en générer un plus tard.",
    logoBtn: "Envoyer logo / image",
    logoUploading: "Envoi…",
    foundationSteps: [
      "Pose des fondations…",
      "Verrouillage du stack de base…",
      "Croquis de l'identité…",
      "Préparation de l'orbite…",
    ],
    stepTitles: [
      "Comment ça s'appelle ?",
      "Pitch court (optionnel)",
      "Quel type ?",
      "ADN de marque (optionnel)",
      "Que doit-il encaisser ? (optionnel)",
      "Quelle est la vision ? (optionnel)",
      "Couleurs (optionnel)",
    ],
    buildTitle: (n) => `🏗 Création de "${n}"`,
    next: "Suivant →", back: "← Retour", skip: "Passer →", cancel: "Annuler",
    create: "⚡ Poser les fondations", generate: "Générer le concept",
  },
  ru: {
    stripActive: "активный", stripNew: "Новый проект", stripMulti: "мульти-выбор",
    headerTitle: "🚀 Фундамент вашего проекта",
    headerSub: "Без фундамента нет разговора: отвечайте что можете, пропускайте остальное.",
    failed: "Не удалось создать — попробуйте ещё раз.",
    phName: "Название проекта…",
    phPitch: "напр: бронирование падел-кортов для любителей",
    pitchHint: "Одна строка. Что это и для кого. Orbe использует это, чтобы начать разговор.",
    adnHint: "Тон, любимые цвета, визуальные референсы. Питает палитру и брендинг потом.",
    adnPlaceholder: "напр: серьёзный, но тёплый, земляная палитра, вайб Notion+Stripe",
    devTitle: "Вы разработчик / есть стек?",
    devHint: "Если хотите конкретные технологии — перечислите здесь. Через запятую или с новой строки.",
    devPlaceholder: "напр: Next.js, Tailwind, Postgres",
    needsHint: "Отметьте подходящее — Orbe переведёт это в реальный стек. Знать технологии не нужно.",
    visionHint: "Почти готово. Какую проблему решает и чем отличается. Дальше обсудим в чате.",
    visionPh: "Опишите идею своими словами…",
    paletteHint: "Выберите 2–4 цвета — или оставьте предложенные. Позже сможете доработать их с Orbe.",
    logoHint: "Есть логотип или референс? Загрузите. Необязательно — Orbe может сгенерировать позже.",
    logoBtn: "Загрузить логотип / изображение",
    logoUploading: "Загрузка…",
    foundationSteps: [
      "Закладываем фундамент…",
      "Фиксируем базовый стек…",
      "Набрасываем айдентику…",
      "Готовим орбиту…",
    ],
    stepTitles: [
      "Как называется?",
      "Короткий питч (необязательно)",
      "Какой тип?",
      "ДНК бренда (необязательно)",
      "Что должно выдерживать? (необязательно)",
      "Какое видение? (необязательно)",
      "Цвета (необязательно)",
    ],
    buildTitle: (n) => `🏗 Создаю «${n}»`,
    next: "Дальше →", back: "← Назад", skip: "Пропустить →", cancel: "Отмена",
    create: "⚡ Заложить фундамент", generate: "Сгенерировать концепт",
  },
  zh: {
    stripActive: "已激活", stripNew: "新建项目", stripMulti: "多选",
    headerTitle: "🚀 你项目的根基",
    headerSub: "没有根基就没有对话：能答的就答，剩下的跳过。",
    failed: "创建失败——再试一次。",
    phName: "项目名称…",
    phPitch: "例：业余玩家的板式网球场预订",
    pitchHint: "一句话。它是什么、为谁服务。Orbe 会用它开启对话。",
    adnHint: "调性、喜欢的颜色、视觉参考。这些稍后会驱动调色板和品牌。",
    adnPlaceholder: "例：沉稳但温暖，大地色调，Notion+Stripe 的感觉",
    devTitle: "你是开发者 / 已确定技术栈？",
    devHint: "如果想用特定技术，列在这里。逗号或换行分隔。",
    devPlaceholder: "例：Next.js, Tailwind, Postgres",
    needsHint: "勾选适用的——Orbe 会把它翻译成真正的技术栈。不需要懂技术。",
    visionHint: "就快好了。解决什么问题、有什么不同。从这里开始对话。",
    visionPh: "用自己的话描述这个想法…",
    paletteHint: "选 2–4 个颜色——或保留建议的配色。之后可以和 Orbe 一起微调。",
    logoHint: "有 logo 或参考图片吗？拖进来。可选——Orbe 之后也能生成一个。",
    logoBtn: "上传 logo / 图片",
    logoUploading: "上传中…",
    foundationSteps: [
      "正在搭建根基…",
      "锁定基础技术栈…",
      "勾勒身份…",
      "准备轨道…",
    ],
    stepTitles: [
      "它叫什么？",
      "一句话介绍（可选）",
      "它是什么类型？",
      "品牌 DNA（可选）",
      "它要扛住什么？（可选）",
      "愿景是什么？（可选）",
      "颜色（可选）",
    ],
    buildTitle: (n) => `🏗 正在创建 "${n}"`,
    next: "下一步 →", back: "← 返回", skip: "跳过 →", cancel: "取消",
    create: "⚡ 打下根基", generate: "生成概念",
  },
  ar: {
    stripActive: "نشط", stripNew: "مشروع جديد", stripMulti: "اختيار متعدد",
    headerTitle: "🚀 أسس مشروعك",
    headerSub: "لا أساس، لا حوار: أجب عما تستطيع، تجاوز الباقي.",
    failed: "تعذّر الإنشاء — حاول مرة أخرى.",
    phName: "اسم المشروع…",
    phPitch: "مثال: حجز ملاعب بادل للهواة",
    pitchHint: "سطر واحد. ما هو ولمن. يستخدمه Orbe لبدء الحوار.",
    adnHint: "النبرة والألوان المفضلة والمراجع البصرية. يغذي لوحة الألوان والعلامة لاحقاً.",
    adnPlaceholder: "مثال: جاد لكن دافئ، لوحة ترابية، vibe مثل Notion+Stripe",
    devTitle: "هل أنت مطوّر / لديك تقنيات محددة؟",
    devHint: "إن أردت تقنيات محددة، اذكرها هنا. تفصلها بفواصل أو أسطر جديدة.",
    devPlaceholder: "مثال: Next.js, Tailwind, Postgres",
    needsHint: "حدد ما ينطبق — يحوّله Orbe إلى تقنيات فعلية. لا حاجة لمعرفة التقنية.",
    visionHint: "أوشكنا. أي مشكلة يحلها وما الذي يميّزه. نتحدث انطلاقاً من هنا.",
    visionPh: "صِف الفكرة بكلماتك…",
    paletteHint: "اختر لونين إلى أربعة — أو أبقِ المقترحة. يمكنك تحسينها مع Orbe لاحقاً.",
    logoHint: "هل لديك شعار أو صورة مرجعية؟ أضِفها. اختياري — يمكن لـ Orbe توليد واحد لاحقاً.",
    logoBtn: "رفع شعار / صورة",
    logoUploading: "جارٍ الرفع…",
    foundationSteps: [
      "نضع الأسس…",
      "نثبّت الـ stack الأساسي…",
      "نرسم الهوية…",
      "نحضّر المدار…",
    ],
    stepTitles: [
      "ما اسمه؟",
      "بايتش قصير (اختياري)",
      "ما نوعه؟",
      "حمض نووي للعلامة (اختياري)",
      "ماذا يجب أن يتحمّل؟ (اختياري)",
      "ما الرؤية؟ (اختياري)",
      "الألوان (اختياري)",
    ],
    buildTitle: (n) => `🏗 جاري إنشاء «${n}»`,
    next: "التالي →", back: "← رجوع", skip: "تخطٍ →", cancel: "إلغاء",
    create: "⚡ ضع الأسس", generate: "ولّد المفهوم",
  },
};

// ---- cookie consent ----------------------------------------------------------
// Transversal popup shown on first visit (no consent saved). Mirrors the
// LanguageSwitch and re-reads the cookie when it changes, so the popup stays
// in the visitor's language across switches without needing a refresh.

export type CookieDict = {
  title: string;
  bodyLead: string;
  bodyMid: string;
  bodyTail: string;
  reject: string;     // "Necessary only"
  accept: string;     // "Accept all"
  highlight: string;  // highlighted substring of bodyMid ("assistant memory")
};

export const COOKIE: Record<Lang, CookieDict> = {
  en: {
    title: "Cookies, the useful kind",
    bodyLead: "Strictly necessary cookies keep the site working. With ",
    bodyMid: "assistant memory",
    bodyTail: " on, Orbe remembers your conversation and what you're looking for between pages. No ads, no third-party trackers.",
    reject: "Necessary only", accept: "Accept all",
    highlight: "assistant memory",
  },
  es: {
    title: "Cookies, las útiles",
    bodyLead: "Las cookies estrictamente necesarias hacen que el sitio funcione. Con ",
    bodyMid: "memoria del asistente",
    bodyTail: " activada, Orbe recuerda tu conversación y lo que buscás entre páginas. Sin avisos, sin trackers de terceros.",
    reject: "Solo necesarias", accept: "Aceptar todas",
    highlight: "memoria del asistente",
  },
  pt: {
    title: "Cookies, as úteis",
    bodyLead: "Cookies estritamente necessários mantêm o site funcionando. Com ",
    bodyMid: "memória do assistente",
    bodyTail: " ligada, Orbe lembra sua conversa e o que você procura entre páginas. Sem anúncios, sem rastreadores de terceiros.",
    reject: "Apenas necessários", accept: "Aceitar todos",
    highlight: "memória do assistente",
  },
  fr: {
    title: "Cookies, ceux qui servent",
    bodyLead: "Les cookies strictement nécessaires font fonctionner le site. Avec ",
    bodyMid: "la mémoire du guide",
    bodyTail: " activée, Orbe se souvient de votre conversation et de ce que vous cherchez d'une page à l'autre. Pas de pubs, pas de traqueurs tiers.",
    reject: "Nécessaires uniquement", accept: "Tout accepter",
    highlight: "la mémoire du guide",
  },
  ru: {
    title: "Cookies — полезные",
    bodyLead: "Строго необходимые cookies поддерживают работу сайта. С ",
    bodyMid: "памятью ассистента",
    bodyTail: " Orbe запоминает ваш разговор и то, что вы ищете, между страницами. Никакой рекламы, никаких сторонних трекеров.",
    reject: "Только необходимые", accept: "Принять все",
    highlight: "памятью ассистента",
  },
  zh: {
    title: "Cookie——有用的那种",
    bodyLead: "严格必要的 cookie 让网站正常工作。开启 ",
    bodyMid: "助手记忆",
    bodyTail: " 后，Orbe 会记住你们的对话与你在页面间寻找的内容。无广告、无第三方追踪。",
    reject: "仅必要项", accept: "全部接受",
    highlight: "助手记忆",
  },
  ar: {
    title: "ملفات تعريف الارتباط — المفيدة منها",
    bodyLead: "ملفات تعريف الارتباط الضرورية strictly تحافظ على عمل الموقع. مع تفعيل ",
    bodyMid: "ذاكرة المساعد",
    bodyTail: " يتذكر Orbe محادثتك وما تبحث عنه بين الصفحات. لا إعلانات، لا متعقبات لطرف ثالث.",
    reject: "الضرورية فقط", accept: "اقبل الكل",
    highlight: "ذاكرة المساعد",
  },
};

// ---- guided flow (Fases 2b-3: project-room phases + branding multistep) -------
// Every preset string of the phase state machine: the `created` derivation card,
// the Branding tab's 3-step wizard (upload OR generate), the decisions phase and
// the consolidated generation board. Chrome only — the agent's replies are live.

export type FlowDict = {
  createdMsg: (name: string) => string; // preset turn in the project room (phase=created)
  createdCta: string;                   // "✨ Generar branding →"
  brandingInProgress: string;           // project room while phase=branding
  brandingGo: string;                   // "Ir a Branding →"
  brandingNoProject: string;            // branding tab without a project
  brandingStart: string;                // "🚀 Iniciar proyecto"
  brandingDoneMsg: string;              // branding tab once phase > branding
  backToRoom: string;                   // "Seguir en sala de proyecto →"
  bTitle: string;                       // "🎨 Universo visual"
  bStepTitles: [string, string, string];
  bStepHints: [string, string, string];
  bBriefPh: string;                     // brief textbox placeholder
  bUpload: string;
  bGenerate: string;
  bGenerating: string;
  bRedo: string;
  bUseIt: string;                       // accept the asset, next step
  bLimit: string;                       // generation cap hit for this step
  bFail: string;
  dIntro: string;                       // decisions phase preset message
  dConsolidate: string;                 // "🔒 Consolidar proyecto →"
  gIntro: string;                       // consolidated preset message
  gMap: string;
  gHome: string;
  gScreens: string;
  gScreenPh: string;                    // screen brief placeholder
  gWorking: string;
  gLimit: string;
  gReadyMsg: string;                    // phase=ready preset message
  tourLabel: string;                    // omni chip that starts the preset tour
};

export const FLOW: Record<Lang, FlowDict> = {
  en: {
    createdMsg: (n) => `**${n}** has its foundations and colors. First step: give it a visual universe — logo, representative image and storyboard. Then we define the system.`,
    createdCta: "✨ Generate branding →",
    brandingInProgress: "The visual universe is being built in the Branding tab.",
    brandingGo: "Go to Branding →",
    brandingNoProject: "Branding works on a project. Lay the foundations in the project room first.",
    brandingStart: "🚀 Start a project",
    brandingDoneMsg: "The visual universe is ready. What's next lives in the project room.",
    backToRoom: "Continue in the project room →",
    bTitle: "🎨 Visual universe",
    bStepTitles: ["Logo", "Representative image", "Storyboard"],
    bStepHints: [
      "The project's mark (1:1). Upload yours or generate one.",
      "One image that captures its world (16:9).",
      "A collage summarizing the whole journey (16:9).",
    ],
    bBriefPh: "Short direction (optional): style, elements, references…",
    bUpload: "Upload",
    bGenerate: "✨ Generate",
    bGenerating: "Generating… can take ~1 min",
    bRedo: "Redo",
    bUseIt: "Use it & continue →",
    bLimit: "Generation cap reached for this step — upload an image instead.",
    bFail: "Didn't work — try again or upload an image.",
    dIntro: "Branding done 🎨 Now let's lock the decisions: pick on the cards (or tell me your doubts and I'll propose options).",
    dConsolidate: "🔒 Consolidate project →",
    gIntro: "Decisions locked 🔒 Now the fun part: let's generate the universe — map, home and screens.",
    gMap: "🗺 Generate map",
    gHome: "🏠 Generate home",
    gScreens: "📱 Generate screen",
    gScreenPh: "Which screen? e.g. user profile, checkout…",
    gWorking: "Generating…",
    gLimit: "Ceiling reached for this type.",
    gReadyMsg: "All generated ✨ The project is consolidated — ask me anything about what you see, or request tweaks.",
    tourLabel: "✦ Guided lab visit",
  },
  es: {
    createdMsg: (n) => `**${n}** ya tiene cimientos y colores. El primer paso es darle su universo visual — logo, imagen representativa y storyboard. Después definimos el sistema.`,
    createdCta: "✨ Generar branding →",
    brandingInProgress: "El universo visual se está construyendo en la pestaña Branding.",
    brandingGo: "Ir a Branding →",
    brandingNoProject: "Branding trabaja sobre un proyecto. Primero creá los cimientos en la sala de proyecto.",
    brandingStart: "🚀 Iniciar proyecto",
    brandingDoneMsg: "El universo visual está listo. Lo que sigue vive en la sala de proyecto.",
    backToRoom: "Seguir en sala de proyecto →",
    bTitle: "🎨 Universo visual",
    bStepTitles: ["Logo", "Imagen representativa", "Storyboard"],
    bStepHints: [
      "El símbolo del proyecto (1:1). Subí el tuyo o generalo.",
      "Una imagen que capture su mundo (16:9).",
      "Un collage que resuma todo el recorrido (16:9).",
    ],
    bBriefPh: "Indicación breve (opcional): estilo, elementos, referencias…",
    bUpload: "Subir",
    bGenerate: "✨ Generar",
    bGenerating: "Generando… puede tardar ~1 min",
    bRedo: "Rehacer",
    bUseIt: "Usar y seguir →",
    bLimit: "Límite de generación alcanzado en este paso — subí una imagen.",
    bFail: "No salió — probá de nuevo o subí una imagen.",
    dIntro: "Branding listo 🎨 Ahora cerremos las decisiones: elegí en las cards (o contame tus dudas y te propongo opciones).",
    dConsolidate: "🔒 Consolidar proyecto →",
    gIntro: "Decisiones fijadas 🔒 Ahora sí: generemos el universo — mapa, home y pantallas.",
    gMap: "🗺 Generar mapa",
    gHome: "🏠 Generar home",
    gScreens: "📱 Generar pantalla",
    gScreenPh: "¿Qué pantalla? ej: perfil de usuario, checkout…",
    gWorking: "Generando…",
    gLimit: "Techo alcanzado para este tipo.",
    gReadyMsg: "Todo generado ✨ El proyecto está consolidado — preguntame lo que quieras sobre lo que ves, o pedime ajustes.",
    tourLabel: "✦ Visita guiada del lab",
  },
  pt: {
    createdMsg: (n) => `**${n}** já tem fundações e cores. O primeiro passo é dar a ele seu universo visual — logo, imagem representativa e storyboard. Depois definimos o sistema.`,
    createdCta: "✨ Gerar branding →",
    brandingInProgress: "O universo visual está sendo construído na aba Branding.",
    brandingGo: "Ir para Branding →",
    brandingNoProject: "Branding trabalha sobre um projeto. Primeiro crie as fundações na sala de projeto.",
    brandingStart: "🚀 Iniciar projeto",
    brandingDoneMsg: "O universo visual está pronto. O que vem agora vive na sala de projeto.",
    backToRoom: "Continuar na sala de projeto →",
    bTitle: "🎨 Universo visual",
    bStepTitles: ["Logo", "Imagem representativa", "Storyboard"],
    bStepHints: [
      "O símbolo do projeto (1:1). Envie o seu ou gere um.",
      "Uma imagem que capture seu mundo (16:9).",
      "Um colagem que resuma toda a jornada (16:9).",
    ],
    bBriefPh: "Direção breve (opcional): estilo, elementos, referências…",
    bUpload: "Enviar",
    bGenerate: "✨ Gerar",
    bGenerating: "Gerando… pode levar ~1 min",
    bRedo: "Refazer",
    bUseIt: "Usar e seguir →",
    bLimit: "Limite de geração atingido neste passo — envie uma imagem.",
    bFail: "Não deu — tente de novo ou envie uma imagem.",
    dIntro: "Branding pronto 🎨 Agora vamos travar as decisões: escolha nos cards (ou me conte suas dúvidas e proponho opções).",
    dConsolidate: "🔒 Consolidar projeto →",
    gIntro: "Decisões travadas 🔒 Agora sim: vamos gerar o universo — mapa, home e telas.",
    gMap: "🗺 Gerar mapa",
    gHome: "🏠 Gerar home",
    gScreens: "📱 Gerar tela",
    gScreenPh: "Qual tela? ex: perfil do usuário, checkout…",
    gWorking: "Gerando…",
    gLimit: "Teto atingido para este tipo.",
    gReadyMsg: "Tudo gerado ✨ O projeto está consolidado — pergunte o que quiser sobre o que vê, ou peça ajustes.",
    tourLabel: "✦ Visita guiada do lab",
  },
  fr: {
    createdMsg: (n) => `**${n}** a ses fondations et ses couleurs. Première étape : lui donner son univers visuel — logo, image représentative et storyboard. Ensuite on définit le système.`,
    createdCta: "✨ Générer le branding →",
    brandingInProgress: "L'univers visuel se construit dans l'onglet Branding.",
    brandingGo: "Aller au Branding →",
    brandingNoProject: "Le branding travaille sur un projet. Posez d'abord les fondations dans la salle de projet.",
    brandingStart: "🚀 Démarrer un projet",
    brandingDoneMsg: "L'univers visuel est prêt. La suite vit dans la salle de projet.",
    backToRoom: "Continuer dans la salle de projet →",
    bTitle: "🎨 Univers visuel",
    bStepTitles: ["Logo", "Image représentative", "Storyboard"],
    bStepHints: [
      "Le symbole du projet (1:1). Téléversez le vôtre ou générez-en un.",
      "Une image qui capture son monde (16:9).",
      "Un collage qui résume tout le parcours (16:9).",
    ],
    bBriefPh: "Direction courte (optionnel) : style, éléments, références…",
    bUpload: "Téléverser",
    bGenerate: "✨ Générer",
    bGenerating: "Génération… ~1 min",
    bRedo: "Refaire",
    bUseIt: "L'utiliser et continuer →",
    bLimit: "Plafond de génération atteint pour cette étape — téléversez une image.",
    bFail: "Raté — réessayez ou téléversez une image.",
    dIntro: "Branding prêt 🎨 Verrouillons les décisions : choisissez sur les cartes (ou dites-moi vos doutes et je propose des options).",
    dConsolidate: "🔒 Consolider le projet →",
    gIntro: "Décisions verrouillées 🔒 Maintenant : générons l'univers — carte, home et écrans.",
    gMap: "🗺 Générer la carte",
    gHome: "🏠 Générer la home",
    gScreens: "📱 Générer un écran",
    gScreenPh: "Quel écran ? ex : profil utilisateur, checkout…",
    gWorking: "Génération…",
    gLimit: "Plafond atteint pour ce type.",
    gReadyMsg: "Tout est généré ✨ Le projet est consolidé — demandez-moi ce que vous voulez sur ce que vous voyez, ou des ajustements.",
    tourLabel: "✦ Visite guidée du lab",
  },
  ru: {
    createdMsg: (n) => `У **${n}** уже есть фундамент и цвета. Первый шаг — дать проекту визуальную вселенную: логотип, ключевое изображение и сториборд. Потом определим систему.`,
    createdCta: "✨ Сгенерировать брендинг →",
    brandingInProgress: "Визуальная вселенная строится во вкладке Branding.",
    brandingGo: "Перейти в Branding →",
    brandingNoProject: "Брендинг работает с проектом. Сначала заложите фундамент в комнате проекта.",
    brandingStart: "🚀 Начать проект",
    brandingDoneMsg: "Визуальная вселенная готова. Дальнейшее — в комнате проекта.",
    backToRoom: "Продолжить в комнате проекта →",
    bTitle: "🎨 Визуальная вселенная",
    bStepTitles: ["Логотип", "Ключевое изображение", "Сториборд"],
    bStepHints: [
      "Символ проекта (1:1). Загрузите свой или сгенерируйте.",
      "Одно изображение, передающее его мир (16:9).",
      "Коллаж, резюмирующий весь путь (16:9).",
    ],
    bBriefPh: "Краткое указание (опционально): стиль, элементы, референсы…",
    bUpload: "Загрузить",
    bGenerate: "✨ Сгенерировать",
    bGenerating: "Генерация… может занять ~1 мин",
    bRedo: "Переделать",
    bUseIt: "Использовать и дальше →",
    bLimit: "Лимит генерации для этого шага — загрузите изображение.",
    bFail: "Не вышло — попробуйте ещё раз или загрузите изображение.",
    dIntro: "Брендинг готов 🎨 Теперь зафиксируем решения: выбирайте на карточках (или расскажите о сомнениях — предложу варианты).",
    dConsolidate: "🔒 Консолидировать проект →",
    gIntro: "Решения зафиксированы 🔒 Теперь главное: сгенерируем вселенную — карту, главную и экраны.",
    gMap: "🗺 Сгенерировать карту",
    gHome: "🏠 Сгенерировать главную",
    gScreens: "📱 Сгенерировать экран",
    gScreenPh: "Какой экран? напр.: профиль, оформление заказа…",
    gWorking: "Генерация…",
    gLimit: "Потолок для этого типа достигнут.",
    gReadyMsg: "Всё сгенерировано ✨ Проект консолидирован — спрашивайте о чём угодно или просите правки.",
    tourLabel: "✦ Экскурсия по лаборатории",
  },
  zh: {
    createdMsg: (n) => `**${n}** 已经有了地基和配色。第一步是给它一个视觉宇宙——logo、代表图和分镜图。之后我们再定义系统。`,
    createdCta: "✨ 生成品牌 →",
    brandingInProgress: "视觉宇宙正在 Branding 标签页中构建。",
    brandingGo: "前往 Branding →",
    brandingNoProject: "品牌需要一个项目。请先在项目室打好地基。",
    brandingStart: "🚀 开始项目",
    brandingDoneMsg: "视觉宇宙已就绪。接下来的一切在项目室进行。",
    backToRoom: "回到项目室继续 →",
    bTitle: "🎨 视觉宇宙",
    bStepTitles: ["Logo", "代表图", "分镜图"],
    bStepHints: [
      "项目的标志 (1:1)。上传或生成一个。",
      "一张捕捉它世界的图 (16:9)。",
      "一张总结全程的拼贴图 (16:9)。",
    ],
    bBriefPh: "简短指示（可选）：风格、元素、参考…",
    bUpload: "上传",
    bGenerate: "✨ 生成",
    bGenerating: "生成中… 约需 1 分钟",
    bRedo: "重做",
    bUseIt: "采用并继续 →",
    bLimit: "此步骤生成次数已达上限——请改为上传图片。",
    bFail: "没成功——再试一次或上传图片。",
    dIntro: "品牌完成 🎨 现在锁定决策：在卡片上选择（或告诉我你的疑虑，我来提议选项）。",
    dConsolidate: "🔒 固化项目 →",
    gIntro: "决策已锁定 🔒 现在开始：生成宇宙——地图、首页和界面。",
    gMap: "🗺 生成地图",
    gHome: "🏠 生成首页",
    gScreens: "📱 生成界面",
    gScreenPh: "哪个界面？如：用户资料、结算…",
    gWorking: "生成中…",
    gLimit: "该类型已达上限。",
    gReadyMsg: "全部生成完毕 ✨ 项目已固化——尽管问我你看到的一切，或提出调整。",
    tourLabel: "✦ 实验室导览",
  },
  ar: {
    createdMsg: (n) => `**${n}** لديه الأساسات والألوان. الخطوة الأولى: منحه عالمه البصري — شعار وصورة تمثيلية وستوري بورد. ثم نحدد النظام.`,
    createdCta: "✨ توليد الهوية →",
    brandingInProgress: "العالم البصري قيد البناء في تبويب Branding.",
    brandingGo: "اذهب إلى Branding →",
    brandingNoProject: "الهوية تعمل على مشروع. ضع الأساسات أولاً في غرفة المشروع.",
    brandingStart: "🚀 ابدأ مشروعاً",
    brandingDoneMsg: "العالم البصري جاهز. ما يلي يعيش في غرفة المشروع.",
    backToRoom: "تابع في غرفة المشروع →",
    bTitle: "🎨 العالم البصري",
    bStepTitles: ["الشعار", "الصورة التمثيلية", "ستوري بورد"],
    bStepHints: [
      "رمز المشروع (1:1). ارفع شعارك أو ولّد واحداً.",
      "صورة واحدة تلتقط عالمه (16:9).",
      "كولاج يلخّص الرحلة كاملة (16:9).",
    ],
    bBriefPh: "توجيه قصير (اختياري): الأسلوب، العناصر، المراجع…",
    bUpload: "رفع",
    bGenerate: "✨ توليد",
    bGenerating: "جارٍ التوليد… قد يستغرق ~دقيقة",
    bRedo: "إعادة",
    bUseIt: "اعتمدها وتابع →",
    bLimit: "بلغت حد التوليد لهذه الخطوة — ارفع صورة بدلاً من ذلك.",
    bFail: "لم ينجح — حاول مجدداً أو ارفع صورة.",
    dIntro: "الهوية جاهزة 🎨 الآن لنثبّت القرارات: اختر من البطاقات (أو أخبرني بشكوكك وسأقترح خيارات).",
    dConsolidate: "🔒 توحيد المشروع →",
    gIntro: "القرارات مثبّتة 🔒 الآن: لنولّد العالم — الخريطة والصفحة الرئيسية والشاشات.",
    gMap: "🗺 توليد الخريطة",
    gHome: "🏠 توليد الرئيسية",
    gScreens: "📱 توليد شاشة",
    gScreenPh: "أي شاشة؟ مثال: الملف الشخصي، الدفع…",
    gWorking: "جارٍ التوليد…",
    gLimit: "بلغت السقف لهذا النوع.",
    gReadyMsg: "اكتمل التوليد ✨ المشروع موحّد — اسألني عما تراه أو اطلب تعديلات.",
    tourLabel: "✦ جولة في المختبر",
  },
};

export const ASSISTANT: Record<Lang, AssistantDict> = {
  en: {
    threads: {
      omni: {
        title: "Omni chat",
        tagline: "Everything: explore, ask, share files, generate images.",
        greeting:
          "Hey! I'm Orbe, Juan's living lab intelligence 👋 Tell me what brings you here — hiring, exploring, or building something — and I'll take you straight to the proof.",
        suggestions: [
          "Give me the guided tour",
          "I'm hiring for AI engineering",
          "Show me the strongest AI project",
          "Open printable CV",
        ],
      },
      project: {
        title: "Project room",
        tagline: "Co-create a pre-project: stack, scope, visual pitch.",
        greeting:
          "Project mode on 🚀 Describe what you want to build — I'll help estimate a minimal stack, keep notes as we go, and render a visual pitch when it's ripe.",
        suggestions: [
          "I have a startup / project idea",
          "Estimate a minimal stack for my idea",
          "Generate a visual mockup of my concept",
          "What would Juan build first?",
        ],
      },
      branding: {
        title: "Branding",
        tagline: "Identity, tone and visual direction for your product.",
        greeting:
          "Branding mode 🎨 Tell me about your product's personality — I can explore naming angles, tone, and generate visual mood concepts.",
        suggestions: [
          "Help me define my product's tone",
          "Generate a visual mood concept",
          "How did Juan brand BuenPick?",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "I can tell you which of these systems is closest to your idea.", cta: "Find my match →", prompt: "Which of Juan's systems is closest to my idea? Let me describe it" },
      { id: "hall",     text: "These aren't trophies — they're clues to the system. Want the tour?",  cta: "Decode them →",  prompt: "Give me the guided tour of the Hall of Fame" },
      { id: "cvpage",   text: "I can summarize this profile for exactly what you're looking for.",     cta: "Summarize for me →", prompt: "Summarize Juan's profile for what I'm looking for" },
      { id: "match",    text: "Tell me what you're building — I'll match it to a system Juan already shipped.", cta: "Match my idea →", prompt: "I have a project idea — match it to Juan's work" },
      { id: "hiring",   text: "Hiring for AI? I can walk you through the proof, project by project.",  cta: "Show me the proof →", prompt: "I'm hiring for AI engineering — show me relevant proof" },
      { id: "cv",       text: "Short on time? I can open Juan's printable CV right here.",          cta: "Open the CV →",     prompt: "Open the printable CV" },
    ],
    thinking: [
      "Reading your message…",
      "Checking Juan's systems…",
      "Crossing real evidence…",
      "Drafting the reply…",
    ],
      popup: {
      hello: "Hi!",
      body: "I'm Orbe, Juan's lab intelligence. Want me to walk you through his strongest systems — or match them to what you're building?",
      ctaPrimary: "Show me around →",
      ctaSecondary: "I'll ask my own",
      dismissPreset: "Not now",
      dismissAria: "Dismiss greeting",
      dialogAria: "Orbe greeting",
    },
      panel: {
      title: "Orbe",
      tagline: "online · answers from Juan's real work",
      closeAria: "Close chat",
      openAria: "Open Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "Message Orbe",
      lockedBody: "Pin a project above to unlock this space — or create a new one with +",
      lockedAction: "Open project setup",
    
        launcherOpen: "Open Orbe",
        launcherClose: "Close Orbe",
        newConversation: "+ New conversation",
        typing: "Guide is typing",
        removeAttachment: "Remove attachment",
        attachImage: "Attach an image",},
      composer: {
      placeholder: "Ask anything about Juan's work…",
      locked: "Foundations first — create your project above 🏗",
      send: "Send",
    },
  },
  es: {
    threads: {
      omni: {
        title: "Chat Omni",
        tagline: "Todo: explorar, preguntar, compartir archivos, generar imágenes.",
        greeting:
          "¡Hola! Soy Orbe, la inteligencia viva del lab de Juan 👋 Contame qué te trae — contratar, explorar o construir algo — y te llevo directo a la prueba.",
        suggestions: [
          "Haceme el tour guiado",
          "Estoy contratando para AI engineering",
          "Mostrame el proyecto de IA más fuerte",
          "Abrir el CV imprimible",
        ],
      },
      project: {
        title: "Sala de proyecto",
        tagline: "Co-creá un pre-proyecto: stack, alcance, pitch visual.",
        greeting:
          "Modo proyecto 🚀 Contame qué querés construir — te ayudo a estimar un stack mínimo, guardo notas mientras charlamos y renderizo un pitch visual cuando esté listo.",
        suggestions: [
          "Tengo una idea de startup / proyecto",
          "Estimame un stack mínimo para mi idea",
          "Generame un mockup visual de mi concepto",
          "¿Qué construiría Juan primero?",
        ],
      },
      branding: {
        title: "Branding",
        tagline: "Identidad, tono y dirección visual para tu producto.",
        greeting:
          "Modo branding 🎨 Contame la personalidad de tu producto — puedo explorar ángulos de naming, tono y generar conceptos visuales de mood.",
        suggestions: [
          "Ayudame a definir el tono de mi producto",
          "Generame un concepto visual de mood",
          "¿Cómo brandeó Juan a BuenPick?",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "Te puedo decir cuál de estos sistemas se acerca más a tu idea.", cta: "Encontrá el match →", prompt: "¿Cuál de los sistemas de Juan se acerca más a mi idea? La describo" },
      { id: "hall",     text: "No son trofeos — son pistas al sistema. ¿Querés el tour?",       cta: "Decodificalos →",   prompt: "Haceme el tour guiado del Salón de la Fama" },
      { id: "cvpage",   text: "Puedo resumirte este perfil justo para lo que buscás.",         cta: "Resumime →",        prompt: "Resumí el perfil de Juan para lo que busco" },
      { id: "match",    text: "Contame qué estás construyendo — lo matcheo con un sistema que Juan ya entregó.", cta: "Matchear mi idea →", prompt: "Tengo una idea de proyecto — matcheala con el trabajo de Juan" },
      { id: "hiring",   text: "¿Contratás para AI? Te llevo por la prueba, proyecto por proyecto.", cta: "Ver la prueba →", prompt: "Estoy contratando para AI engineering — mostrame la prueba relevante" },
      { id: "cv",       text: "¿Poco tiempo? Te abro el CV imprimible de Juan acá mismo.",   cta: "Abrir el CV →",     prompt: "Abrí el CV imprimible" },
    ],
    thinking: [
      "Leyendo tu mensaje…",
      "Revisando los sistemas de Juan…",
      "Cruzando evidencia real…",
      "Armando la respuesta…",
    ],
      popup: {
      hello: "¡Hola!",
      body: "Soy Orbe, la inteligencia del lab de Juan. ¿Querés que te muestre sus sistemas más fuertes — o que los cruce con lo que estás construyendo?",
      ctaPrimary: "Mostrame todo →",
      ctaSecondary: "Pregunto yo",
      dismissPreset: "Ahora no",
      dismissAria: "Cerrar saludo",
      dialogAria: "Saludo de Orbe",
    },
      panel: {
      title: "Orbe",
      tagline: "en línea · respuestas del trabajo real de Juan",
      closeAria: "Cerrar chat",
      openAria: "Abrir Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "Escribile a Orbe",
      lockedBody: "Pinneá un proyecto arriba para activar este espacio — o creá uno nuevo con +",
      lockedAction: "Abrir setup de proyecto",
    
        launcherOpen: "Abrir Orbe",
        launcherClose: "Cerrar Orbe",
        newConversation: "+ Nueva conversación",
        typing: "El guía está escribiendo",
        removeAttachment: "Quitar adjunto",
        attachImage: "Adjuntar imagen",},
      composer: {
      placeholder: "Preguntá lo que quieras sobre el trabajo de Juan…",
      locked: "Primero los cimientos — creá tu proyecto arriba 🏗",
send: "Enviar",
    },
  },
  pt: {
    threads: {
      omni: {
        title: "Chat Omni",
        tagline: "Tudo: explorar, perguntar, compartilhar arquivos, gerar imagens.",
        greeting:
          "Olá! Sou o Orbe, a inteligência viva do lab do Juan 👋 Me conta o que te traz — contratar, explorar ou construir algo — e te levo direto à prova.",
        suggestions: [
          "Me dá o tour guiado",
          "Estou contratando para AI engineering",
          "Mostra o projeto de IA mais forte",
          "Abrir o CV imprimível",
        ],
      },
      project: {
        title: "Sala de projeto",
        tagline: "Co-crie um pré-projeto: stack, escopo, pitch visual.",
        greeting:
          "Modo projeto 🚀 Me conta o que quer construir — te ajudo a estimar um stack mínimo, guardo notas enquanto conversamos e renderizo um pitch visual quando estiver pronto.",
        suggestions: [
          "Tenho uma ideia de startup / projeto",
          "Me estima um stack mínimo para minha ideia",
          "Gera um mockup visual do meu conceito",
          "O que o Juan construiria primeiro?",
        ],
      },
      branding: {
        title: "Branding",
        tagline: "Identidade, tom e direção visual para o seu produto.",
        greeting:
          "Modo branding 🎨 Me conta a personalidade do seu produto — posso explorar ângulos de naming, tom e gerar conceitos visuais de mood.",
        suggestions: [
          "Me ajuda a definir o tom do meu produto",
          "Gera um conceito visual de mood",
          "Como o Juan brendeu o BuenPick?",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "Posso te dizer qual desses sistemas está mais perto da sua ideia.", cta: "Achar o match →", prompt: "Qual dos sistemas do Juan está mais perto da minha ideia? Deixa eu descrever" },
      { id: "hall",     text: "Não são troféus — são pistas do sistema. Quer o tour?",          cta: "Decodificar →",    prompt: "Me dá o tour guiado do Hall da Fama" },
      { id: "cvpage",   text: "Posso resumir este perfil exatamente para o que você procura.", cta: "Resumir →",        prompt: "Resume o perfil do Juan para o que procuro" },
      { id: "match",    text: "Me conta o que você está construindo — eu cas com um sistema que o Juan já entregou.", cta: "Cas minha ideia →", prompt: "Tenho uma ideia de projeto — casa com o trabalho do Juan" },
      { id: "hiring",   text: "Contratando para AI? Te levo pela prova, projeto por projeto.", cta: "Ver a prova →",   prompt: "Estou contratando para AI engineering — mostra a prova relevante" },
      { id: "cv",       text: "Pouco tempo? Abro o CV imprimível do Juan aqui mesmo.",         cta: "Abrir o CV →",     prompt: "Abre o CV imprimível" },
    ],
    thinking: [
      "Lendo sua mensagem…",
      "Revisando os sistemas do Juan…",
      "Cruzando evidência real…",
      "Montando a resposta…",
    ],
      popup: {
      hello: "Olá!",
      body: "Sou o Orbe, a inteligência do lab do Juan. Quer que eu te guie pelos sistemas mais fortes dele — ou que eu combine com o que você está construindo?",
      ctaPrimary: "Me mostra tudo →",
      ctaSecondary: "Eu pergunto",
      dismissPreset: "Agora não",
      dismissAria: "Dispensar saudação",
      dialogAria: "Saudação de Orbe",
    },
      panel: {
      title: "Orbe",
      tagline: "online · respostas do trabalho real do Juan",
      closeAria: "Fechar chat",
      openAria: "Abrir Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "Mande mensagem a Orbe",
      lockedBody: "Fixe um projeto acima para destravar este espaço — ou crie um novo com +",
      lockedAction: "Abrir setup de projeto",
    
        launcherOpen: "Abrir Orbe",
        launcherClose: "Fechar Orbe",
        newConversation: "+ Nova conversa",
        typing: "O guia está digitando",
        removeAttachment: "Remover anexo",
        attachImage: "Anexar imagem",},
      composer: {
      placeholder: "Pergunte o que quiser sobre o trabalho do Juan…",
      locked: "Fundações primeiro — crie seu projeto acima 🏗",
      send: "Enviar",
    },
  },
  fr: {
    threads: {
      omni: {
        title: "Chat Omni",
        tagline: "Tout : explorer, demander, partager des fichiers, générer des images.",
        greeting:
          "Salut ! Je suis Orbe, l'intelligence vivante du lab de Juan 👋 Dis-moi ce qui t'amène — recrutement, exploration ou construction — et je t'emmène directement à la preuve.",
        suggestions: [
          "Fais-moi la visite guidée",
          "Je recrute en AI engineering",
          "Montre-moi le projet IA le plus fort",
          "Ouvrir le CV imprimable",
        ],
      },
      project: {
        title: "Salle de projet",
        tagline: "Co-créez un pré-projet : stack, portée, pitch visuel.",
        greeting:
          "Mode projet 🚀 Décris ce que tu veux construire — je t'aide à estimer un stack minimal, je garde des notes au fil de l'eau, et je rends un pitch visuel quand c'est prêt.",
        suggestions: [
          "J'ai une idée de startup / projet",
          "Estime un stack minimal pour mon idée",
          "Génère un mockup visuel de mon concept",
          "Que construirait Juan en premier ?",
        ],
      },
      branding: {
        title: "Branding",
        tagline: "Identité, ton et direction visuelle pour ton produit.",
        greeting:
          "Mode branding 🎨 Parle-moi de la personnalité de ton produit — je peux explorer des angles de naming, le ton, et générer des concepts visuels de mood.",
        suggestions: [
          "Aide-moi à définir le ton de mon produit",
          "Génère un concept visuel de mood",
          "Comment Juan a-t-il brandé BuenPick ?",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "Je peux te dire lequel de ces systèmes se rapproche le plus de ton idée.", cta: "Trouver le match →", prompt: "Quel système de Juan se rapproche le plus de mon idée ? Laisse-moi décrire" },
      { id: "hall",     text: "Ce ne sont pas des trophées — ce sont des indices du système. Tu veux la visite ?", cta: "Décoder →", prompt: "Fais-moi la visite guidée du Hall of Fame" },
      { id: "cvpage",   text: "Je peux résumer ce profil pile pour ce que tu cherches.",            cta: "Résumer →",        prompt: "Résume le profil de Juan pour ce que je cherche" },
      { id: "match",    text: "Dis-moi ce que tu construis — je le marie à un système déjà livré par Juan.", cta: "Matcher mon idée →", prompt: "J'ai une idée de projet — marie-la au travail de Juan" },
      { id: "hiring",   text: "Tu recrutes en AI ? Je te guide à travers la preuve, projet par projet.", cta: "Voir la preuve →", prompt: "Je recrute en AI engineering — montre-moi la preuve pertinente" },
      { id: "cv",       text: "Tu manques de temps ? J'ouvre le CV imprimable de Juan ici même.", cta: "Ouvrir le CV →", prompt: "Ouvre le CV imprimable" },
    ],
    thinking: [
      "Lecture de ton message…",
      "Vérification des systèmes de Juan…",
      "Croisement des preuves réelles…",
      "Préparation de la réponse…",
    ],
      popup: {
      hello: "Salut !",
      body: "Je suis Orbe, l'intelligence du lab de Juan. Vous voulez que je vous fasse visiter ses systèmes les plus forts — ou que je les marie à ce que vous construisez ?",
      ctaPrimary: "Faites-moi visiter →",
      ctaSecondary: "Je pose mes questions",
      dismissPreset: "Pas maintenant",
      dismissAria: "Fermer la salutation",
      dialogAria: "Salutation d'Orbe",
    },
      panel: {
      title: "Orbe",
      tagline: "en ligne · réponses tirées du vrai travail de Juan",
      closeAria: "Fermer le chat",
      openAria: "Ouvrir Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "Écrire à Orbe",
      lockedBody: "Épinglez un projet ci-dessus pour activer cet espace — ou créez-en un nouveau avec +",
      lockedAction: "Ouvrir la config de projet",
    
        launcherOpen: "Ouvrir Orbe",
        launcherClose: "Fermer Orbe",
        newConversation: "+ Nouvelle conversation",
        typing: "Le guide écrit",
        removeAttachment: "Retirer la pièce jointe",
        attachImage: "Joindre une image",
      },
      composer: {
      placeholder: "Demandez ce que vous voulez sur le travail de Juan…",
      locked: "D'abord les fondations — créez votre projet ci-dessus 🏗",
      send: "Envoyer",
    },
  },
  ru: {
    threads: {
      omni: {
        title: "Omni-чат",
        tagline: "Всё: исследовать, спрашивать, делиться файлами, генерировать изображения.",
        greeting:
          "Привет! Я Orbe, живой интеллект лаборатории Хуана 👋 Расскажи, что привело — найм, разведка или своя разработка — и я сразу веду тебя к доказательствам.",
        suggestions: [
          "Проведи мне экскурсию",
          "Я нанимаю в AI engineering",
          "Покажи самый сильный AI-проект",
          "Открыть печатное CV",
        ],
      },
      project: {
        title: "Проектная комната",
        tagline: "Совместное создание пре-проекта: стек, объём, визуальный питч.",
        greeting:
          "Режим проекта 🚀 Опиши, что хочешь построить — помогу оценить минимальный стек, буду вести заметки по ходу и сделаю визуальный питч, когда созреет.",
        suggestions: [
          "У меня идея стартапа / проекта",
          "Оцени минимальный стек для моей идеи",
          "Сгенерируй визуальный мокап моей концепции",
          "Что бы Хуан построил первым?",
        ],
      },
      branding: {
        title: "Брендинг",
        tagline: "Айдентика, тон и визуальное направление для твоего продукта.",
        greeting:
          "Режим брендинга 🎨 Расскажи о характере твоего продукта — могу разобрать нейминг, тон и сгенерировать визуальные муд-концепции.",
        suggestions: [
          "Помоги определить тон моего продукта",
          "Сгенерируй визуальную муд-концепцию",
          "Как Хуан брендировал BuenPick?",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "Скажу, какая из этих систем ближе всего к твоей идее.",         cta: "Найти совпадение →", prompt: "Какая из систем Хуана ближе всего к моей идее? Дай описать" },
      { id: "hall",     text: "Это не трофеи — это подсказки к системе. Хочешь тур?",          cta: "Разобрать →",        prompt: "Проведи экскурсию по Залу славы" },
      { id: "cvpage",   text: "Резюмирую профиль ровно под то, что ты ищешь.",                 cta: "Резюмировать →",     prompt: "Резюмируй профиль Хуана под то, что я ищу" },
      { id: "match",    text: "Расскажи, что строишь — подберу систему, которую Хуан уже выпустил.", cta: "Сопоставить идею →", prompt: "У меня идея проекта — сопоставь её с работой Хуана" },
      { id: "hiring",   text: "Нанимаешь в AI? Проведу по доказательствам, проект за проектом.", cta: "Показать доказательства →", prompt: "Я нанимаю в AI engineering — покажи релевантные доказательства" },
      { id: "cv",       text: "Мало времени? Открою печатное CV Хуана прямо здесь.",            cta: "Открыть CV →",       prompt: "Открой печатное CV" },
    ],
    thinking: [
      "Читаю сообщение…",
      "Проверяю системы Хуана…",
      "Сопоставляю реальные свидетельства…",
      "Собираю ответ…",
    ],
      popup: {
      hello: "Привет!",
      body: "Я Orbe, интеллект лаборатории Хуана. Хотите, проведу по его самым сильным системам — или подберу под вашу задачу?",
      ctaPrimary: "Покажи всё →",
      ctaSecondary: "Спрошу сам",
      dismissPreset: "Не сейчас",
      dismissAria: "Закрыть приветствие",
      dialogAria: "Приветствие Orbe",
    },
      panel: {
      title: "Orbe",
      tagline: "онлайн · ответы из реальной работы Хуана",
      closeAria: "Закрыть чат",
      openAria: "Открыть Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "Написать Orbe",
      lockedBody: "Закрепите проект выше, чтобы открыть это пространство — или создайте новый через +",
      lockedAction: "Открыть настройку проекта",
    
        launcherOpen: "Открыть Orbe",
        launcherClose: "Закрыть Orbe",
        newConversation: "+ 新对话",
        typing: "向导正在输入",
        removeAttachment: "移除附件",
        attachImage: "附加图片",},
      composer: {
      placeholder: "Спросите что угодно о работе Хуана…",
      locked: "Сначала фундамент — создайте проект выше 🏗",
      send: "Отправить",
    },
  },
  zh: {
    threads: {
      omni: {
        title: "Omni 聊天",
        tagline: "全在这里：探索、提问、共享文件、生成图片。",
        greeting:
          "你好！我是 Orbe，Juan 实验室的活体智能 👋 告诉我你来这里的目的——招聘、了解，还是正在构建什么——我直接带你去看实证。",
        suggestions: [
          "带我走一遍导览",
          "我在招 AI 工程",
          "给我看最强的 AI 项目",
          "打开可打印的简历",
        ],
      },
      project: {
        title: "项目室",
        tagline: "共创预项目：技术栈、范围、可视化方案。",
        greeting:
          "项目模式已开启 🚀 描述你想构建的东西——我会帮你估算最小技术栈，全程记笔记，成熟时给出可视化方案。",
        suggestions: [
          "我有一个创业 / 项目想法",
          "给我的想法估个最小技术栈",
          "为我的概念生成可视化模型",
          "Juan 会先做什么？",
        ],
      },
      branding: {
        title: "品牌",
        tagline: "为你的产品打造身份、语调与视觉方向。",
        greeting:
          "品牌模式 🎨 告诉我你产品的个性——我可以探索命名角度、语调，并生成视觉情绪概念。",
        suggestions: [
          "帮我定义产品的语调",
          "生成一个视觉情绪概念",
          "Juan 是怎么打造 BuenPick 品牌的？",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "我可以告诉你这些系统里哪个最接近你的想法。",                   cta: "找匹配 →",          prompt: "Juan 的哪个系统最接近我的想法？让我描述一下" },
      { id: "hall",     text: "这些不是奖杯——是通往系统的线索。想要导览吗？",                  cta: "解读 →",            prompt: "带我在名人堂走一遍导览" },
      { id: "cvpage",   text: "我可以按你正在找的内容精确总结这份资料。",                        cta: "为我总结 →",        prompt: "按我想要的内容总结 Juan 的资料" },
      { id: "match",    text: "告诉我你正在构建什么——我把它匹配到 Juan 已经交付过的系统。",     cta: "匹配我的想法 →",    prompt: "我有一个项目想法——把它和 Juan 的工作匹配起来" },
      { id: "hiring",   text: "在招 AI 吗？我会带你逐个项目看实证。",                            cta: "看实证 →",          prompt: "我在招 AI 工程——给我看相关的实证" },
      { id: "cv",       text: "时间紧？我可以在这里直接打开 Juan 的可打印简历。",                cta: "打开简历 →",        prompt: "打开可打印的简历" },
    ],
    thinking: [
      "正在读你的消息…",
      "正在核对 Juan 的系统…",
      "正在交叉真实证据…",
      "正在组织回复…",
    ],
      popup: {
      hello: "你好!",
      body: "我是 Orbe，Juan 实验室的智能。要我带你走一遍他最强的系统——还是按你正在做的东西匹配？",
      ctaPrimary: "带我看看 →",
      ctaSecondary: "我自己问",
      dismissPreset: "稍后",
      dismissAria: "关闭问候",
      dialogAria: "Orbe 问候",
    },
      panel: {
      title: "Orbe",
      tagline: "在线 · 来自 Juan 真实工作的回答",
      closeAria: "关闭聊天",
      openAria: "打开 Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "给 Orbe 留言",
      lockedBody: "在上面固定一个项目以激活此空间——或用 + 创建一个新项目",
      lockedAction: "打开项目设置",
    
        launcherOpen: "打开 Orbe",
        launcherClose: "关闭 Orbe",
        newConversation: "+ محادثة جديدة",
        typing: "الدليل يكتب",
        removeAttachment: "إزالة المرفق",
        attachImage: "إرفاق صورة",},
      composer: {
      placeholder: "问任何关于 Juan 工作的问题…",
      locked: "先打基础——在上面创建你的项目 🏗",
      send: "发送",
    },
  },
  ar: {
    threads: {
      omni: {
        title: "درشة Omni",
        tagline: "كل شيء: استكشاف، سؤال، مشاركة ملفات، توليد صور.",
        greeting:
          "مرحباً! أنا Orbe، الذكاء الحي لمختبر خوان 👋 أخبرني ماذا أتى بك — توظيف، استكشاف، أم بناء شيء — وسأوصلك مباشرة إلى الدليل.",
        suggestions: [
          "اعرض علي جولة موجّهة",
          "أنا أوظّف في هندسة الذكاء الاصطناعي",
          "أرني أقوى مشروع ذكاء اصطناعي",
          "افتح السيرة القابلة للطباعة",
        ],
      },
      project: {
        title: "غرفة المشروع",
        tagline: "ابتكر مشروعاً مسبقاً بشكل مشترك: التقنيات، النطاق، العرض المرئي.",
        greeting:
          "وضع المشروع مفعّل 🚀 صِف ما تريد بناءه — سأساعدك في تقدير الحد الأدنى من التقنيات، وأدوّن الملاحظات خلال حوارنا، وأعرض عرضاً مرئياً حين ينضج.",
        suggestions: [
          "لدي فكرة startup / مشروع",
          "قدّر لي الحد الأدنى من التقنيات لفكرتي",
          "ولّد لي نموذجاً مرئياً لمفهومي",
          "ماذا كان خوان سيبنيه أولاً؟",
        ],
      },
      branding: {
        title: "العلامة التجارية",
        tagline: "الهوية، النبرة، الاتجاه المرئي لمنتجك.",
        greeting:
          "وضع العلامة التجارية 🎨 أخبرني بشخصية منتجك — أستطيع استكشاف زوايا التسمية، والنبرة، وتوليد مفاهيم مرئية للمزاج.",
        suggestions: [
          "ساعدني في تحديد نبرة منتجي",
          "ولّد مفهوماً مرئياً للمزاج",
          "كيف برند خوان مشروع BuenPick؟",
        ],
      },
    },
    nudges: [
      { id: "projects", text: "أستطيع أن أخبرك أيٌّ من هذه الأنظمة أقرب إلى فكرتك.",         cta: "ابحث عن المطابقة ←", prompt: "أيٌّ من أنظمة خوان أقرب إلى فكرتي؟ دعني أصفها" },
      { id: "hall",     text: "هذه ليست جوائز — بل مفاتيح لفهم النظام. هل تريد الجولة؟", cta: "فُك الشفرة ←",       prompt: "اعرض علي جولة موجّهة في قاعة المشاهير" },
      { id: "cvpage",   text: "أستطيع تلخيص هذا الملف بدقة لما تبحث عنه.",                cta: "لخّص لي ←",         prompt: "لخّص ملف خوان لما أبحث عنه" },
      { id: "match",    text: "أخبرني بما تبنيه — سأطابقه مع نظام سلّمه خوان من قبل.",     cta: "طابق فكرتي ←",       prompt: "لدي فكرة مشروع — طابقها مع أعمال خوان" },
      { id: "hiring",   text: "هل توظّف في الذكاء الاصطناعي؟ سأمشي بك عبر الأدلة مشروعاً تلو الآخر.", cta: "أرني الأدلة ←", prompt: "أنا أوظّف في هندسة الذكاء الاصطناعي — أرني الأدلة ذات الصلة" },
      { id: "cv",       text: "وقتك ضيق؟ سأفتح السيرة القابلة للطباعة لخوان هنا فوراً.",  cta: "افتح السيرة ←",      prompt: "افتح السيرة القابلة للطباعة" },
    ],
    thinking: [
      "أقرأ رسالتك…",
      "أراجع أنظمة خوان…",
      "أقابل الأدلة الحقيقية…",
      "أصوغ الرد…",
    ],
      popup: {
      hello: "مرحباً!",
      body: "أنا Orbe، ذكاء مختبر خوان. هل تريد أن أعرض عليك أقوى أنظمته — أو أن أطابقها مع ما تبنيه؟",
      ctaPrimary: "اعرض عليّ ←",
      ctaSecondary: "سأسأل بنفسي",
      dismissPreset: "ليس الآن",
      dismissAria: "إغلاق التحية",
      dialogAria: "تحية Orbe",
    },
      panel: {
      title: "Orbe",
      tagline: "متصل · إجابات من عمل خوان الحقيقي",
      closeAria: "إغلاق الدردشة",
      openAria: "افتح Orbe",
      launcherOpen: "افتح Orbe",
      launcherClose: "أغلق Orbe",
      dockAria: "Orbe · Amorosi Labs",
      messageAria: "راسل Orbe",
      newConversation: "+ محادثة جديدة",
      typing: "الدليل يكتب",
      removeAttachment: "إزالة المرفق",
      attachImage: "إرفاق صورة",
      lockedBody: "ثبّت مشروعاً أعلاه لتفعيل هذه المساحة — أو أنشئ مشروعاً جديداً عبر +",
      lockedAction: "افتح إعداد المشروع",
    },
      composer: {
      placeholder: "اسأل ما تشاء عن عمل خوان…",
      locked: "ابدأ بالأساسات — أنشئ مشروعك أعلاه 🏗",
      send: "إرسال",
    },
  },
};
