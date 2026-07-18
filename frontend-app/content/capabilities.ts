// content/capabilities.ts
// -----------------------------------------------------------------------------
// Amorosi Labs — evidence-based capability mapping.
// No skill percentage bars. Each capability is backed by proof projects.
// `projects` values are project slugs from content/projects.ts.
// -----------------------------------------------------------------------------

export type Capability = {
  capability: string;
  projects: string[]; // project slugs proving this capability
};

export const capabilities: Capability[] = [
  { capability: "Multi-model orchestration", projects: ["lumenscript"] },
  { capability: "Agent workflows", projects: ["bbn", "lumenscript", "piki", "delibot"] },
  { capability: "Cost-efficient AI architecture", projects: ["bbn", "ai-lab-runpod"] },
  { capability: "Marketplace / product execution", projects: ["buenpick", "delify"] },
  { capability: "Full-stack engineering", projects: ["buenpick", "bbn", "piki", "delibot"] },
  { capability: "Founder execution", projects: ["buenpick", "delify"] },
  { capability: "RAG / memory / reranking", projects: ["lumenscript", "piki", "delibot", "kaelos-legal"] },
  { capability: "Infrastructure / deployment", projects: ["bbn", "buenpick", "recapp-azure"] },
];
