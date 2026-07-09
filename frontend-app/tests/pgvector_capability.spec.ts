// tests/pgvector_capability.spec.ts
// Regression for the 2026-07-09 prod bug: a transient CREATE EXTENSION
// failure (pg_restore lock window) poisoned the process-local pgvector flag
// to false forever, while the extension actually existed. The capability
// check must (a) fall back to a pg_extension existence probe and (b)
// self-heal on later calls without a process restart.

import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db/pool", () => ({
  query: (...args: unknown[]) => queryMock(...args),
  isDbConfigured: () => true,
  tryQuery: vi.fn(),
}));

async function freshBootstrap() {
  vi.resetModules();
  return import("@/lib/db/bootstrap");
}

beforeEach(() => {
  queryMock.mockReset();
});

describe("pgvector capability", () => {
  it("survives a transient CREATE EXTENSION failure when the extension exists", async () => {
    const { ensureSchema, checkVectorAvailable, isVectorAvailable } = await freshBootstrap();
    queryMock.mockImplementation(async (raw?: unknown) => {
      const sql = String(raw ?? "");
      if (sql.includes("CREATE EXTENSION")) throw new Error("tuple concurrently updated");
      if (sql.includes("pg_extension")) return { rows: [{ one: 1 }] };
      return { rows: [] }; // DDL etc.
    });
    await ensureSchema();
    expect(await checkVectorAvailable()).toBe(true);
    expect(isVectorAvailable()).toBe(true);
  });

  it("reports false when the extension truly does not exist", async () => {
    const { ensureSchema, checkVectorAvailable } = await freshBootstrap();
    queryMock.mockImplementation(async (raw?: unknown) => {
      const sql = String(raw ?? "");
      if (sql.includes("CREATE EXTENSION")) throw new Error("extension not available");
      if (sql.includes("pg_extension")) return { rows: [] };
      return { rows: [] };
    });
    await ensureSchema();
    expect(await checkVectorAvailable()).toBe(false);
  });

  it("SELF-HEALS: false at boot, true once the extension appears later", async () => {
    const { ensureSchema, checkVectorAvailable } = await freshBootstrap();
    let extensionExists = false;
    queryMock.mockImplementation(async (raw?: unknown) => {
      const sql = String(raw ?? "");
      if (sql.includes("CREATE EXTENSION")) throw new Error("locked");
      if (sql.includes("pg_extension")) return { rows: extensionExists ? [{ one: 1 }] : [] };
      return { rows: [] };
    });
    await ensureSchema();
    expect(await checkVectorAvailable()).toBe(false); // honest at boot
    extensionExists = true; // restore finished / extension created
    expect(await checkVectorAvailable()).toBe(true); // no restart needed
    // positive result is cached
    extensionExists = false;
    expect(await checkVectorAvailable()).toBe(true);
  });
});
