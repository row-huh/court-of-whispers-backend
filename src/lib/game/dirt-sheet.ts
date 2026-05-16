// Canonical palace dirt the Priest can spill once leveraged.
// Each item has an id (used in the priest's spillDirt array) and a body
// (what the priest actually says when spilling, plus what the player
// can later wield against the Commander or Citizen).

export interface DirtItem {
  id: string;
  short: string;       // one-line label for the UI
  spillLine: string;   // what the Priest mutters when forced to talk
  useAgainst: "commander" | "citizen" | "both";
}

export const DIRT_SHEET: DirtItem[] = [
  {
    id: "bastard",
    short: "The bastard of Vell",
    spillLine:
      "The king fathered a boy with the Duchess of Vell. The child is hidden as a stableboy in the southern keep — the queen still does not know.",
    useAgainst: "both",
  },
  {
    id: "fratricide",
    short: "Nightshade for the elder brother",
    spillLine:
      "His brother did not die of plague. Nightshade in the wine. I gave the man who poured it last rites — and a purse, on the king's order.",
    useAgainst: "both",
  },
  {
    id: "orsa-pact",
    short: "The Orsa river-mines pact",
    spillLine:
      "He has pledged the river-mines to the Khaganate of Orsa for gold — gold to feed his spring war. The mines our soldiers bleed for are already sold.",
    useAgainst: "commander",
  },
  {
    id: "granary-forgery",
    short: "Forged harvest tallies",
    spillLine:
      "The granaries are half-empty. He had the harvest tallies forged so the council would not see. The people will starve come winter and not know whose hand it was.",
    useAgainst: "citizen",
  },
  {
    id: "ghost-blade",
    short: "The blade beneath the pillow",
    spillLine:
      "He sleeps with a blade beneath the pillow. He hears his brother's ghost at night. The court physician is paid to call it 'a humour of the cold.'",
    useAgainst: "both",
  },
  {
    id: "stolen-heir",
    short: "The bought heir",
    spillLine:
      "The queen is barren. Prince Theron was bought from a Vellish midwife and presented as a miracle. The true bloodline ended with his brother.",
    useAgainst: "both",
  },
];

export const DIRT_BY_ID: Record<string, DirtItem> = Object.fromEntries(
  DIRT_SHEET.map((d) => [d.id, d]),
);
