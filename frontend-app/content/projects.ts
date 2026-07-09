// content/projects.ts
// -----------------------------------------------------------------------------
// Amorosi Labs — content-driven project model (Phase 1 static seed).
//
// This file is the single source of truth for the public Hall of Fame home.
// A future phase will move this behind lib/projects/repository.ts and later a
// database, without changing the public UI components (they consume the
// selectors exported at the bottom of this file).
// -----------------------------------------------------------------------------

export type ProjectTier = "hall_of_fame" | "featured" | "archive";

export type ProjectStatus =
  | "Live"
  | "Platformizing"
  | "R&D"
  | "Prototype"
  | "Paused";

export type ProjectTheme = {
  /** primary accent (borders, glow, key text) */
  accent: string;
  /** secondary accent */
  secondary: string;
  /** rgba/hex glow used for radial background bloom */
  glow: string;
  mood: "ai-engine" | "commerce" | "media" | "ops" | "archive";
};

export type ProjectAssets = {
  logo?: string;
  heroImage?: string;
  backgroundImage?: string;
  screenshots?: string[];
  /** Loop video for the Hall of Fame room background when this project is
   *  selected. Local path today; resolves through lib/media/resolve.ts so it
   *  can move to Cloudflare Stream/R2 by env switch without touching UI. */
  heroVideo?: string;
  heroVideoPoster?: string;
};

export type Project = {
  id: string;
  slug: string;
  tier: ProjectTier;
  status: ProjectStatus;
  published: boolean;
  sortOrder: number;

  title: string;
  labTitle: string;
  category: string;
  oneLiner: string;
  proof: string;
  role: string[];
  stack: string[];
  highlights: string[];

  architecture?: {
    nodes: string[];
    flow: string[];
  };

  assets: ProjectAssets;
  theme: ProjectTheme;

  aiSummary: string;
  links?: {
    demo?: string;
    github?: string;
    /** Store / distribution links shown on the project room. */
    playstore?: string;
    appstore?: string;
    website?: string;
    /** Social presence (optional, shown as pills in the room). */
    instagram?: string;
    facebook?: string;
  };

  createdAt?: string;
  updatedAt?: string;
};

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

export const projects: Project[] = [
  // ---------------------------------------------------------------- HALL OF FAME
  {
    id: "lumenscript",
    slug: "lumenscript",
    tier: "hall_of_fame",
    status: "Platformizing",
    published: true,
    sortOrder: 10,
    title: "LumenScript",
    labTitle: "LumenScript — AI Writing Platform & Orchestration Engine",
    category: "AI Systems Architecture",
    oneLiner:
      "An AI-native writing platform and multi-model orchestration engine — routing intent across models with memory, canon and evaluation loops.",
    proof:
      "Not a prompt wrapper. Real AI architecture: multi-model orchestration, project memory and canon, and evaluation loops that judge output before it ships — heading toward BYOK via OpenRouter.",
    role: ["AI Architect", "Systems Design", "Full-Stack"],
    // Real stack (verified against the repo/compose 2026-07)
    stack: [
      "Next.js",
      "React",
      "TypeScript",
      "OpenRouter",
      "Drizzle ORM",
      "PostgreSQL",
      "Redis",
      "BullMQ",
      "MinIO",
      "Docker",
    ],
    highlights: [
      "Multi-model orchestration routes each task to the right model by capability, cost and latency",
      "Project memory + canon keep long-form generation consistent instead of drifting",
      "Evaluation loops score and refine output instead of trusting a single pass",
      "Platform direction: OpenRouter/BYOK so teams bring their own keys and models",
    ],
    architecture: {
      nodes: ["Intent Router", "Model Selector", "Memory / Canon", "Evaluation Loop", "RAG"],
      flow: ["Request", "Route intent", "Select model", "Generate", "Evaluate & refine"],
    },
    assets: {
      backgroundImage: undefined,
      heroImage: undefined,
    },
    theme: {
      accent: "#f0a500",
      secondary: "#8b5cf6",
      glow: "rgba(240, 165, 0, 0.22)",
      mood: "ai-engine",
    },
    aiSummary:
      "LumenScript is the flagship: a multi-model orchestration engine with memory, canon and evaluation loops — AI architecture, not a prompt wrapper, built toward a BYOK platform.",
  },
  {
    id: "buenpick",
    slug: "buenpick",
    tier: "hall_of_fame",
    status: "Live",
    published: true,
    sortOrder: 20,
    title: "BuenPick",
    labTitle: "BuenPick — Live Local-Commerce Startup",
    category: "Live Startup · Local Commerce",
    oneLiner:
      "A live local-commerce startup — a food-rescue marketplace connecting merchants and buyers, with mobile, admin and product all shipped under real friction.",
    proof:
      "Proof of shipping beyond prototypes: a running marketplace with active merchants, built and operated end-to-end — marketplace, mobile app, admin and the product calls that come with real users.",
    role: ["Founder", "Full-Stack", "Product"],
    // Real stack (verified against the API package/env 2026-07)
    stack: ["Next.js", "TypeScript", "Fastify", "Prisma", "PostgreSQL", "Redis", "BullMQ", "Mercado Pago", "Resend", "Cloudflare R2", "Capacitor/PWA", "Docker"],
    highlights: [
      "Live food-rescue marketplace with active merchants and real buyers",
      "Marketplace + mobile app + admin executed and operated end-to-end",
      "Product decisions forged under real local-commerce friction, not a demo",
    ],
    architecture: {
      nodes: ["Storefront", "Catalog", "Orders", "Merchant Console", "Payments"],
      flow: ["Browse", "Reserve", "Checkout", "Pick up", "Settle"],
    },
    assets: {
      backgroundImage: undefined,
      heroImage: undefined,
    },
    theme: {
      accent: "#00e0a4",
      secondary: "#00ff88",
      glow: "rgba(0, 224, 164, 0.20)",
      mood: "commerce",
    },
    aiSummary:
      "BuenPick is a live food-rescue local-commerce startup with active merchants — founder-level execution across marketplace, mobile and admin, shipped beyond prototype.",
  },
  {
    id: "bbn",
    slug: "bbn",
    tier: "hall_of_fame",
    status: "Live",
    published: true,
    sortOrder: 30,
    title: "BBN",
    labTitle: "BBN — AI-Assisted Local Media Platform",
    category: "Production AI · Local Media",
    oneLiner:
      "An AI-assisted local media platform — lightweight production agent workflows handling editorial automation and content ranking at low cost.",
    proof:
      "Low-cost applied AI in production: lightweight agent workflows doing real editorial automation and ranking on local media infrastructure — cost and reliability treated as first-class constraints.",
    role: ["AI Architect", "Automation", "Ops"],
    // Real stack (verified against README/architecture 2026-07)
    stack: ["Next.js", "Strapi", "Python", "FastAPI", "OpenRouter", "PostgreSQL", "Redis", "Cloudflare R2", "Docker", "GraphQL"],
    highlights: [
      "Lightweight, cost-efficient agent workflows running in production",
      "Editorial automation and content ranking for a local media platform",
      "AI publishing infrastructure with real reliability and cost constraints",
    ],
    architecture: {
      nodes: ["Ingest", "Ranking Agent", "Editorial Agent", "Guardrails", "Publish"],
      flow: ["Source", "Rank", "Draft/curate", "Validate", "Publish"],
    },
    assets: {
      backgroundImage: undefined,
      heroImage: undefined,
    },
    theme: {
      accent: "#4f7cff",
      secondary: "#ff4d4d",
      glow: "rgba(79, 124, 255, 0.20)",
      mood: "media",
    },
    aiSummary:
      "BBN is an AI-assisted local media platform: lightweight production agents for editorial automation and ranking, proving low-cost applied AI that stays reliable.",
  },

  // ------------------------------------------------------------------- FEATURED
  {
    id: "delify",
    slug: "delify",
    tier: "featured",
    status: "Live",
    published: true,
    sortOrder: 40,
    title: "Delify",
    labTitle: "Delify — Commerce Platform",
    category: "Product & Startup Execution",
    oneLiner:
      "A commerce platform powering WhatsApp-first storefronts for real businesses.",
    proof: "Founder execution: a live commerce platform serving real businesses.",
    role: ["Founder", "Full-Stack"],
    stack: ["Next.js", "PostgreSQL", "WhatsApp API", "Commerce"],
    highlights: [
      "Live platform serving real merchants",
      "WhatsApp-first commerce experience",
      "Full-stack ownership from infra to UX",
    ],
    assets: { heroImage: "/imgs/avif/delibot1.avif" },
    theme: {
      accent: "#00ff88",
      secondary: "#00f2ff",
      glow: "rgba(0, 255, 136, 0.18)",
      mood: "commerce",
    },
    aiSummary:
      "Delify is a live WhatsApp-first commerce platform, reinforcing Juan's founder execution track record.",
    links: { demo: "https://delify.com.ar" },
  },
  {
    id: "delibot",
    slug: "delibot",
    tier: "featured",
    status: "Live",
    published: true,
    sortOrder: 50,
    title: "Delibot",
    labTitle: "Delibot — Production Resilience",
    category: "Production AI Automation",
    oneLiner:
      "A full-stack WhatsApp e-commerce agent using a Tool-First Architecture to eradicate hallucinations.",
    proof:
      "Production reliability: an LLM acts as an intent router selecting deterministic tools, so every operation is predictable and fact-based.",
    role: ["AI Architect", "Full-Stack"],
    // Real stack (verified against the repo/compose 2026-07)
    stack: ["Python", "FastAPI", "Node.js", "WhatsApp/Baileys", "PostgreSQL", "ChromaDB", "Redis", "Docker", "React"],
    highlights: [
      "Tool-First Architecture eliminates AI hallucinations in actions",
      "LLM as intent router selecting deterministic tools (e.g. AddToCart)",
      "RAG over product catalog with ChromaDB",
    ],
    architecture: {
      nodes: ["Intent Router", "Tool Registry", "Catalog RAG", "Cart Engine", "WhatsApp Gateway"],
      flow: ["Message", "Route intent", "Select tool", "Execute", "Reply"],
    },
    assets: { heroImage: "/imgs/avif/delibot1.avif" },
    theme: {
      accent: "#00ff88",
      secondary: "#8b5cf6",
      glow: "rgba(0, 255, 136, 0.18)",
      mood: "commerce",
    },
    aiSummary:
      "Delibot proves Juan's anti-hallucination Tool-First Architecture for reliable production AI agents.",
    links: { demo: "https://delify.com.ar" },
  },
  {
    id: "trading-ecosystem",
    slug: "trading-ecosystem",
    tier: "featured",
    status: "R&D",
    published: true,
    sortOrder: 60,
    title: "Trading Ecosystem",
    labTitle: "Trading Ecosystem — Financial AI R&D",
    category: "Trading & Fintech",
    oneLiner:
      "Core R&D in financial AI: a modular framework for dataset enrichment, backtesting and governed LLM strategies.",
    proof:
      "Systems design under a strategic pivot: an LLM strategy generates trading signals governed by a strict Risk Manager.",
    role: ["Systems Design", "AI/ML", "Research"],
    stack: ["LLM Strategy", "Backtesting", "Risk Management", "ETL", "FinTech"],
    highlights: [
      "Dataset Creator enriches market data with an LLM for fine-tuning",
      "Modular backtesting framework",
      "LLMStrategy signals governed by a strict Risk Manager",
    ],
    architecture: {
      nodes: ["Dataset Creator", "Backtest Framework", "LLM Strategy", "Risk Manager"],
      flow: ["Ingest", "Enrich", "Backtest", "Signal", "Risk gate"],
    },
    assets: { heroImage: "/imgs/avif/tradnbot.avif" },
    theme: {
      accent: "#0070f3",
      secondary: "#00f2ff",
      glow: "rgba(0, 112, 243, 0.18)",
      mood: "ai-engine",
    },
    aiSummary:
      "The Trading Ecosystem shows Juan's depth in financial AI systems design and disciplined R&D pivots.",
    links: { github: "https://github.com/johnitto9/Trading-bot" },
  },
  {
    id: "recapp-azure",
    slug: "recapp-azure",
    tier: "featured",
    status: "Prototype",
    published: true,
    sortOrder: 70,
    title: "RecApp / Azure PoC",
    labTitle: "RecApp — AI Orchestrator (Azure)",
    category: "Cloud & Enterprise",
    oneLiner:
      "Enterprise-grade AI Orchestrator PoC on Microsoft Azure with an Intent Router over specialized agents.",
    proof:
      "Cloud/enterprise AI: an Intent Router directs tasks to specialized agents to solve complex business workflows on Azure.",
    role: ["AI Orchestrator", "Cloud Architecture"],
    stack: ["Microsoft Azure", "AI Orchestration", "Intent Router", "Multi-Agent Systems"],
    highlights: [
      "Intent Router directs tasks to specialized AI agents",
      "Enterprise cloud architecture on Microsoft Azure",
      "Case study in scaling AI architectures to a corporate environment",
    ],
    architecture: {
      nodes: ["Intent Router", "Agent Pool", "Azure Services", "Workflow Engine"],
      flow: ["Request", "Route", "Dispatch agents", "Orchestrate", "Respond"],
    },
    assets: { heroImage: "/imgs/avif/recapp1.avif" },
    theme: {
      accent: "#0070f3",
      secondary: "#00f2ff",
      glow: "rgba(0, 112, 243, 0.16)",
      mood: "ops",
    },
    aiSummary:
      "RecApp is Juan's enterprise AI Orchestrator PoC on Azure, proving cloud multi-agent architecture skills.",
    links: { github: "https://github.com/johnitto9/RecApp-Premium" },
  },

  // -------------------------------------------------------------------- ARCHIVE
  {
    id: "ai-lab-runpod",
    slug: "ai-lab-runpod",
    tier: "archive",
    status: "R&D",
    published: true,
    sortOrder: 80,
    title: "AI Lab (RunPod)",
    labTitle: "AI Lab — Distributed Inference R&D",
    category: "Personal R&D",
    oneLiner:
      "A 'Brain & Muscle' distributed inference lab on RunPod GPUs for rapid, cost-efficient experimentation.",
    proof:
      "MLOps discipline: distributed architecture with 4-bit quantized models for efficient heavy inference.",
    role: ["MLOps", "Research"],
    stack: ["MLOps", "RunPod", "NVIDIA 3090", "4-bit Quantization", "RAG"],
    highlights: [
      "'Brain & Muscle' distributed architecture",
      "4-bit quantized model stack for heavy inference",
      "Cost-efficient rapid experimentation pipeline",
    ],
    assets: { heroImage: "/imgs/avif/chatbotdock1.avif" },
    theme: {
      accent: "#8b5cf6",
      secondary: "#00f2ff",
      glow: "rgba(139, 92, 246, 0.16)",
      mood: "archive",
    },
    aiSummary:
      "The RunPod AI Lab shows Juan's MLOps approach to cost-efficient distributed inference.",
    links: { github: "https://github.com/johnitto9/RunPod-IA-lab" },
  },
  {
    id: "kaelos-legal",
    slug: "kaelos-legal",
    tier: "archive",
    status: "R&D",
    published: true,
    sortOrder: 90,
    title: "Kaelos",
    labTitle: "Kaelos — Legal Agentic System",
    category: "AI Systems",
    oneLiner:
      "A RAG-based agentic system performing semantic analysis over large volumes of legal documents.",
    proof:
      "Domain agility: repurposing a mastered AI stack to solve high-impact problems in the legal domain.",
    role: ["AI Architect"],
    stack: ["RAG", "Vector Databases", "AI Agents", "Semantic Analysis"],
    highlights: [
      "RAG architecture over large legal document sets",
      "Semantic analysis for high-impact legal problems",
      "Fast repurposing of an existing tech stack to a new domain",
    ],
    assets: { heroImage: "/imgs/avif/kaelos1.avif" },
    theme: {
      accent: "#ffd400",
      secondary: "#ff00aa",
      glow: "rgba(255, 212, 0, 0.14)",
      mood: "archive",
    },
    aiSummary:
      "Kaelos shows Juan applying RAG agentic systems to the legal domain with fast stack reuse.",
  },
  {
    id: "code-saver",
    slug: "code-saver",
    tier: "archive",
    status: "Live",
    published: true,
    sortOrder: 100,
    title: "Code Saver",
    labTitle: "Code Saver — AI-Dev Meta Tool",
    category: "Developer Tools",
    oneLiner:
      "A GUI tool that consolidates a whole codebase into a single prompt to accelerate AI-assisted development.",
    proof:
      "Meta-efficiency: removes a key bottleneck in AI-assisted analysis, debugging and refactoring.",
    role: ["Tool Builder"],
    stack: ["Developer Tools", "PySide6", "Prompt Optimization"],
    highlights: [
      "Extracts and consolidates an entire codebase into one prompt",
      "Accelerates analysis, debugging and refactoring cycles",
      "Desktop GUI built with PySide6",
    ],
    assets: { heroImage: "/imgs/avif/banner_codext1.avif" },
    theme: {
      accent: "#ff8a00",
      secondary: "#ff00aa",
      glow: "rgba(255, 138, 0, 0.14)",
      mood: "archive",
    },
    aiSummary:
      "Code Saver is Juan's meta-efficiency tool for faster AI-assisted development workflows.",
    links: { github: "https://github.com/johnitto9/CodeExtractor-PySide6" },
  },
];

// -----------------------------------------------------------------------------
// Selectors (phase-1 stand-in for lib/projects/repository.ts)
// -----------------------------------------------------------------------------

const bySortOrder = (a: Project, b: Project) => a.sortOrder - b.sortOrder;

export function getProjects(): Project[] {
  return projects.filter((p) => p.published).sort(bySortOrder);
}

export function getProjectsByTier(tier: ProjectTier): Project[] {
  return getProjects().filter((p) => p.tier === tier);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug && p.published);
}

export const getHallOfFame = () => getProjectsByTier("hall_of_fame");
export const getFeatured = () => getProjectsByTier("featured");
export const getArchive = () => getProjectsByTier("archive");
