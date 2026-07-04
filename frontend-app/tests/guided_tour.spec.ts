// tests/guided_tour.spec.ts
// The Guided Tour is Layer A: the STANDARD path must make zero LLM calls. This
// suite guards that property structurally (primary action of every state is a
// navigation, never an exit) plus graph/i18n integrity across all 7 locales.
// (A component-level test would also mock fetch and assert 0 calls while
//  clicking through — the engine here is pure, so no network is even possible.)

import { describe, it, expect } from "vitest";
import {
  TOUR_GRAPH,
  resolveTourState,
  type TourStateId,
} from "@/lib/assistant/guided-tour";

const LOCALES = ["en", "es", "pt", "fr", "ru", "zh", "ar"] as const;
const IDS = Object.keys(TOUR_GRAPH) as TourStateId[];

describe("guided tour engine", () => {
  it("every state has a message and one label per effect, in every locale", () => {
    for (const lang of LOCALES) {
      for (const id of IDS) {
        const s = resolveTourState(id, lang);
        expect(s.message.length, `${lang}/${id} message`).toBeGreaterThan(0);
        expect(s.actions.length, `${lang}/${id} action count`).toBe(TOUR_GRAPH[id].effects.length);
        for (const a of s.actions) expect(a.label.length, `${lang}/${id} label`).toBeGreaterThan(0);
      }
    }
  });

  it("all navigation targets are valid state ids", () => {
    for (const node of Object.values(TOUR_GRAPH)) {
      for (const e of node.effects) {
        if ("to" in e) expect(TOUR_GRAPH[e.to]).toBeDefined();
      }
    }
  });

  it("scroll targets reference real home section ids", () => {
    const known = new Set([
      "before-the-systems", "hall-of-fame", "inside-the-proof",
      "featured", "living-layer", "lab-archive", "contact",
    ]);
    for (const node of Object.values(TOUR_GRAPH)) {
      if (node.scrollTo) expect(known.has(node.scrollTo)).toBe(true);
    }
  });

  it("the STANDARD path never exits (zero LLM) until route_choice", () => {
    let id: TourStateId = "welcome";
    const visited: TourStateId[] = [id];
    for (let i = 0; i < 5; i++) {
      const primary = TOUR_GRAPH[id].effects[0];
      expect("to" in primary, `${id} primary action must navigate, not exit`).toBe(true);
      id = (primary as { to: TourStateId }).to;
      visited.push(id);
    }
    expect(visited).toEqual(["welcome", "builder", "proof", "portfolio", "living", "route"]);
    // only at route does the tour hand off to the adaptive agent
    for (const e of TOUR_GRAPH.route.effects) expect("exit" in e).toBe(true);
  });
});
