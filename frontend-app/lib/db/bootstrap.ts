// lib/db/bootstrap.ts
// -----------------------------------------------------------------------------
// Idempotent schema bootstrap. Runs at most once per process (cached promise),
// invoked lazily by whichever feature touches the DB first. CREATE ... IF NOT
// EXISTS everywhere — safe to run on every boot, no migration tool needed at
// this scale. When the schema outgrows this, promote to real migration files.
//
// Tables:
//   projects          jsonb document store behind ProjectRepository (driver
//                     "postgres"); doc is the zod-validated Project.
//   visitor_sessions  one row per assistant visitor (cookie uuid). meta jsonb
//                     accumulates lightweight signals (referrer, pages, etc.).
//   agent_messages    conversation memory (Delibot conversation_service
//                     pattern: persist per-session, inject history pre-LLM).
//   leads             qualified leads captured by the agent or contact form.
// -----------------------------------------------------------------------------

import { query } from "./pool";

const DDL = `
CREATE TABLE IF NOT EXISTS projects (
  slug        text PRIMARY KEY,
  tier        text NOT NULL,
  published   boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 100,
  doc         jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id          uuid PRIMARY KEY,
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now(),
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id          bigserial PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user','assistant')),
  content     text NOT NULL,
  intent      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_messages_session_idx
  ON agent_messages (session_id, id);

CREATE TABLE IF NOT EXISTS leads (
  id          bigserial PRIMARY KEY,
  session_id  uuid REFERENCES visitor_sessions(id) ON DELETE SET NULL,
  name        text,
  email       text,
  phone       text,
  company     text,
  budget      text,
  need        text,
  notes       text,
  source      text NOT NULL DEFAULT 'assistant',
  status      text NOT NULL DEFAULT 'new',
  stage       text NOT NULL DEFAULT 'discover',
  score       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS leads_session_uidx
  ON leads (session_id) WHERE session_id IS NOT NULL;

-- sales-brain columns (scheme005) for leads tables created before them
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'discover';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;
-- heartbeat autonomy: one polite follow-up per lead, ever (NULL = not yet)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followed_up_at timestamptz;

-- conversation tabs: up to 5 parallel threads per visitor session
ALTER TABLE agent_messages ADD COLUMN IF NOT EXISTS thread integer NOT NULL DEFAULT 0;

-- pre-projects: the ORBIT. Everything a visitor co-creates with the agent
-- (name, concept, stack, palette, logo) lives here, per loginless session —
-- the funnel revolves around something they don't want to lose.
CREATE TABLE IF NOT EXISTS session_projects (
  id          bigserial PRIMARY KEY,
  session_id  uuid NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'app',
  concept     text,
  stack       jsonb NOT NULL DEFAULT '[]'::jsonb,
  palette     jsonb NOT NULL DEFAULT '[]'::jsonb,
  logo_url    text,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_projects_session_idx
  ON session_projects (session_id, id DESC);

-- internal event bus (MVP: a table, not a broker). Source of truth for the
-- future Amorosi Labs ecosystem to consume.
CREATE TABLE IF NOT EXISTS events (
  id          bigserial PRIMARY KEY,
  source      text NOT NULL DEFAULT 'portfolio',
  type        text NOT NULL,
  actor_id    text,
  project     text NOT NULL DEFAULT 'amorosi-portfolio',
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_type_idx ON events (type, id DESC);

-- one row per LLM call (latency, model, outcome) — the agent's observability
CREATE TABLE IF NOT EXISTS ai_logs (
  id          bigserial PRIMARY KEY,
  session_id  uuid,
  model       text,
  ok          boolean NOT NULL,
  latency_ms  integer,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- one row per email attempt (sent or skipped/failed) — never stores secrets
CREATE TABLE IF NOT EXISTS email_logs (
  id           bigserial PRIMARY KEY,
  template     text NOT NULL,
  to_email     text NOT NULL,
  subject      text NOT NULL,
  ok           boolean NOT NULL,
  provider_id  text,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- single-use tracking for admin magic links (tokens themselves are stateless
-- HMAC-signed; this table only enforces one-time redemption when DB is up)
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id          bigserial PRIMARY KEY,
  email       text NOT NULL,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- content translation cache (lib/i18n/translate.ts). One row per translated
-- unit (project doc, capabilities list) per language; source_hash invalidates
-- the entry automatically when the canonical EN content changes.
CREATE TABLE IF NOT EXISTS content_translations (
  cache_key    text NOT NULL,
  lang         text NOT NULL,
  source_hash  text NOT NULL,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cache_key, lang)
);

-- outbound prospecting funnel: raw catches from the scout's serper dragnets
-- and admin-dropped emails advance stage by stage (ingest -> filter -> enrich
-- -> qualify -> contact -> contacted | discarded). The kanban in
-- /admin/prospects is a VIEW of this table; code moves the cards.
CREATE TABLE IF NOT EXISTS prospects (
  id            bigserial PRIMARY KEY,
  stage         text NOT NULL DEFAULT 'ingest',
  source        text NOT NULL DEFAULT 'scout',
  title         text,
  company       text,
  contact_name  text,
  email         text,
  url           text,
  snippet       text,
  enrichment    text,
  fit_reason    text,
  next_action   text,
  score         integer NOT NULL DEFAULT 0,
  raw           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospects_stage_idx ON prospects (stage, updated_at DESC);
-- the dragnet re-catches the same pages every sweep; URL is the dedupe key
CREATE UNIQUE INDEX IF NOT EXISTS prospects_url_uidx ON prospects (url) WHERE url IS NOT NULL;

-- trackable outbound links (email marketing / follow-up). Each row is one
-- opaque token that redirects to target_url and records the click, tying an
-- outbound touch to a lead/prospect (and, via the click, to a loginless
-- session). Lets the admin know a company we emailed actually engaged.
CREATE TABLE IF NOT EXISTS tracked_links (
  token       text PRIMARY KEY,
  lead_id     bigint,
  prospect_id bigint,
  campaign    text NOT NULL DEFAULT 'outreach',
  target_url  text NOT NULL,
  clicks      integer NOT NULL DEFAULT 0,
  clicked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracked_links_lead_idx ON tracked_links (lead_id);
CREATE INDEX IF NOT EXISTS tracked_links_prospect_idx ON tracked_links (prospect_id);

-- agent long-term memory items. Plain text + ILIKE keyword search for the MVP;
-- when pgvector + an embedding provider land, add an "embedding vector" column
-- (docs/pgvector-memory.md) — the API surface (write/search) stays the same.
CREATE TABLE IF NOT EXISTS memory_items (
  id          bigserial PRIMARY KEY,
  session_id  uuid,
  kind        text NOT NULL DEFAULT 'note',
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memory_items_session_idx ON memory_items (session_id, id DESC);

-- =========================================================================
-- Unified Project + Brand Foundation (T04, docs/final-refactor/04_DATA_AND_
-- PERSISTENCE_CONTRACTS). session_projects IS the Project — we EXTEND it and
-- attach BrandDNA / Assets / StackDecisions / VisualPlans rather than building
-- a parallel model. Project Room, Branding, Omni promotion and the admin
-- dossier all read this same truth. All additive (safe on existing volumes).
-- =========================================================================

-- brand-foundation fields on the session project (nullable, backfilled by use)
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS problem text;
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS audience text;
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS product_type text;
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS brand_vision text;
-- palette confirmation gate (heavy generation only after colors are confirmed)
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS palette_confirmed_at timestamptz;
-- guided-flow state machine: drives what the Project Room offers at each step.
-- created -> branding -> decisions -> consolidated -> generating -> ready.
-- The wizard leaves a project at 'created' (name+kind+concept+colors done).
ALTER TABLE session_projects ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'created';

-- BrandDNA: exactly one per project (personality, tone, keywords, do/dont...).
CREATE TABLE IF NOT EXISTS brand_dna (
  project_id        bigint PRIMARY KEY REFERENCES session_projects(id) ON DELETE CASCADE,
  personality       text,
  tone              text,
  keywords          jsonb NOT NULL DEFAULT '[]'::jsonb,
  do_list           jsonb NOT NULL DEFAULT '[]'::jsonb,
  dont_list         jsonb NOT NULL DEFAULT '[]'::jsonb,
  visual_direction  text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Asset: one contract for EVERY generated/uploaded visual (was: loose files +
-- a single logo_url). role = logo|reference|storyboard|screen:*|campaign|other.
CREATE TABLE IF NOT EXISTS assets (
  id              bigserial PRIMARY KEY,
  project_id      bigint NOT NULL REFERENCES session_projects(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'other',
  source          text NOT NULL DEFAULT 'generated',
  storage_key     text,
  url             text,
  mime_type       text,
  width           integer,
  height          integer,
  prompt_summary  text,
  parent_ids      jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          text NOT NULL DEFAULT 'ready',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_project_idx ON assets (project_id, id DESC);

-- StackDecision: structured, confirmable stack choices (source user|ai|inferred).
CREATE TABLE IF NOT EXISTS stack_decisions (
  id            bigserial PRIMARY KEY,
  project_id    bigint NOT NULL REFERENCES session_projects(id) ON DELETE CASCADE,
  category      text NOT NULL,
  option        text NOT NULL,
  reason        text,
  source        text NOT NULL DEFAULT 'ai',
  confidence    integer,
  confirmed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stack_decisions_project_idx ON stack_decisions (project_id, id DESC);

-- VisualPlan: declared BEFORE multi-image generation (PLAN FIRST, max 9 default).
CREATE TABLE IF NOT EXISTS visual_plans (
  id              bigserial PRIMARY KEY,
  project_id      bigint NOT NULL REFERENCES session_projects(id) ON DELETE CASCADE,
  product_surface text,
  items           jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_items       integer NOT NULL DEFAULT 9,
  rationale       text,
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visual_plans_project_idx ON visual_plans (project_id, id DESC);
`;

let ready: Promise<void> | null = null;
let vectorAvailable = false;

/** True once the pgvector extension was successfully enabled this process. */
export function isVectorAvailable(): boolean {
  return vectorAvailable;
}

/** Best-effort pgvector enable. The compose image (pgvector/pgvector:pg16)
 *  ships the extension; on a plain postgres this fails and we log ONCE and
 *  carry on — nothing in the MVP requires vectors yet. */
async function tryEnableVector(): Promise<void> {
  try {
    await query("CREATE EXTENSION IF NOT EXISTS vector");
    vectorAvailable = true;
  } catch (err) {
    console.warn(
      "[db] pgvector extension unavailable (keyword memory only):",
      (err as Error).message.slice(0, 120),
    );
  }
}

/** Ensure the schema exists (once per process). Throws if the DB is down. */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = query(DDL)
      .then(() => tryEnableVector())
      .then(
        () => undefined,
        (err) => {
          ready = null; // allow retry on next call
          throw err;
        },
      );
  }
  return ready;
}
