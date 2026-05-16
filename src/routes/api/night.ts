import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import type { AgentId, NightExchange } from "@/lib/game/types";
import { DIRT_BY_ID } from "@/lib/game/dirt-sheet";

const MODEL = "google/gemini-3.1-flash-lite-preview";

const exchangeSchema = z.object({
  from: z.enum(["commander", "citizen", "priest"]),
  to: z.enum(["commander", "citizen", "priest", "bishop"]),
  line: z.string().max(220),
  reply: z.string().max(220),
  suspicionDelta: z.number().min(0).max(20).optional(),
  proofDelta: z.number().min(0).max(20).optional(),
  proofEvidence: z.string().max(140).optional(),
  trustDeltas: z
    .object({
      commander: z.number().min(-15).max(15).optional(),
      citizen: z.number().min(-15).max(15).optional(),
      priest: z.number().min(-15).max(15).optional(),
    })
    .optional(),
});

const nightSchema = z.object({
  exchanges: z.array(exchangeSchema).max(6),
});

interface Body {
  day: number;
  trust: Record<string, number>;
  priestFear: number;
  priestSpilledDirt: string[];
  citizenOfferedBlackmail: boolean;
  citizenAcceptedDirt: boolean;
  proof: number;
  suspicion: number;
  recentPlayerLines: { agent: AgentId; line: string }[];
}

const NIGHT_SYSTEM = `
You simulate the NIGHT PHASE of a court intrigue game. Three NPCs may each
send up to 2 short private messages to ANY other NPC (commander, citizen,
priest, or the antagonist bishop). The PLAYER is not present.

NPCs:
- Sir Alaric (commander): gruff, loyal to peace not king
- Mira (citizen): sharp, working-class, suspicious
- Father Edran (priest): nervous, knows palace dirt, addicted to dice
- Bishop Cyril (bishop): hunter, loyal to king. Only RECEIVES messages.

Each NPC decides who to talk to based on their CURRENT TRUST in the player
and what the player did today. Low trust => more likely to whisper concerns
to the Bishop. High trust => may share info with other allies, or warn each
other. Father Edran with high fear may keep quiet OR vent to Mira.

Output 2-6 short exchanges in chronological order. Each exchange = one
message + one reply. Effects:
- suspicionDelta: if Bishop heard something alarming about the player
- proofDelta + proofEvidence: if Bishop received concrete evidence
- trustDeltas: how the participants' trust in the PLAYER shifts after the
  conversation (e.g., Mira tells Alaric the player is genuine -> Alaric +5)

Keep lines short, in-period, and FOCUSED on the player. No fourth wall.
`;

export const Route = createFileRoute("/api/night")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("bad json", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(MODEL);

        const spilled =
          body.priestSpilledDirt.map((id) => DIRT_BY_ID[id]?.short ?? id).join(", ") ||
          "(none)";
        const recap =
          body.recentPlayerLines
            .slice(-8)
            .map((l) => `  to ${l.agent}: "${l.line}"`)
            .join("\n") || "  (player was silent)";

        const context = [
          `Day ${body.day} just ended.`,
          `Trust in player — commander:${body.trust.commander}, citizen:${body.trust.citizen}, priest:${body.trust.priest}.`,
          `Priest fear of player: ${body.priestFear}.`,
          `Dirt the priest has spilled to player: ${spilled}.`,
          `Citizen offered blackmail leverage: ${body.citizenOfferedBlackmail}.`,
          `Citizen accepted dirt back: ${body.citizenAcceptedDirt}.`,
          `Bishop's proof so far: ${body.proof}, suspicion: ${body.suspicion}.`,
          `Recent things the player said today:`,
          recap,
        ].join("\n");

        try {
          const { object } = await generateObject({
            model,
            schema: nightSchema,
            messages: [
              { role: "system", content: NIGHT_SYSTEM },
              { role: "user", content: context },
            ],
            temperature: 0.9,
          });

          const exchanges: NightExchange[] = object.exchanges.map((e) => ({
            day: body.day,
            from: e.from,
            to: e.to,
            line: e.line,
            reply: e.reply,
            effects: {
              suspicionDelta: e.suspicionDelta,
              proofDelta: e.proofDelta,
              proofEvidence: e.proofEvidence,
              trustDeltas: e.trustDeltas,
            },
          }));
          return Response.json({ exchanges });
        } catch (err) {
          const e = err as { statusCode?: number; message?: string };
          const status = e?.statusCode === 429 ? 429 : e?.statusCode === 402 ? 402 : 500;
          return Response.json({ error: e?.message ?? "night failure", status }, { status });
        }
      },
    },
  },
});
