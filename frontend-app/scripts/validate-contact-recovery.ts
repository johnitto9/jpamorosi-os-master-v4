// scripts/validate-contact-recovery.ts
// Run the deep contact dig against REAL qualified prospects (exported as JSON:
// [{id, company, url, title}]) WITHOUT touching any DB — pure network dry-run.
// Usage:
//   SEARXNG_ENABLED=true SEARXNG_BASE_URL=http://127.0.0.1:8890 \
//     pnpm tsx scripts/validate-contact-recovery.ts /path/cards.json
// (8890 = ssh -L tunnel to the VPS searxng container)
import { readFileSync } from "node:fs";
import { deepHarvestContact } from "../lib/agent/prospects";

type Card = { id: number; company: string | null; url: string | null; title?: string | null };

async function main() {
  const cards: Card[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
  let found = 0;
  for (const c of cards) {
    const t0 = Date.now();
    const hit = await deepHarvestContact(c).catch((e) => {
      console.log(`#${c.id} ${c.company ?? "?"} -> ERROR ${(e as Error).message.slice(0, 80)}`);
      return null;
    });
    const ms = Date.now() - t0;
    if (hit) {
      found++;
      console.log(`#${c.id} ${(c.company ?? "?").padEnd(22)} -> ${hit.email}  [${hit.method}] (${ms}ms)`);
    } else {
      console.log(`#${c.id} ${(c.company ?? "?").padEnd(22)} -> (seco) (${ms}ms)`);
    }
  }
  console.log(`\nRECOVERED ${found}/${cards.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
