// content/profile.ts
// -----------------------------------------------------------------------------
// Amorosi Labs — profile / identity content for the public home hero.
// -----------------------------------------------------------------------------

export type Profile = {
  name: string;
  lab: string;
  role: string;
  location: string;
  tagline: string;
  thesis: string;
  bio: string[];
  languages: string[];
  avatar: string;
  links: {
    github?: string;
    email?: string;
    os?: string;
  };
};

export const profile: Profile = {
  name: "Juan Pablo Amorosi",
  lab: "Amorosi Labs",
  role: "AI Product Engineer · Systems Architect · Founder",
  location: "Argentina",
  tagline: "I build AI-powered products that survive contact with reality.",
  thesis:
    "From multi-model orchestration engines to production agent workflows and live founder-built products — AI architecture that ships and holds up under real constraints.",
  bio: [
    "AI Developer and Architect operating from first principles to build full-cycle intelligence systems, forged in an arena where resource efficiency and iteration speed are a working philosophy.",
    "Turns constraints into strategic advantages — designing AI architectures that use lightweight, low-cost models for specialized tasks.",
    "An orchestrator of complex systems: translating abstract business visions into resilient, scalable software architectures.",
  ],
  languages: ["Spanish (Native)", "English (Fluent)"],
  avatar: "/imgs/avif/profile-cvimage.webp",
  links: {
    github: "https://github.com/johnitto9",
    // Public-facing contact (Cloudflare Email Routing -> admin inbox). The
    // superadmin address lives ONLY in env (RESEND_ADMIN_TO_EMAIL/ADMIN_EMAIL).
    email: "contact@jpamorosi.dev",
    os: "/os",
  },
};
