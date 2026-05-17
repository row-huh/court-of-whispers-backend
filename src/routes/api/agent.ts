import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPTS } from "@/lib/game/agents";
import { DIRT_BY_ID } from "@/lib/game/dirt-sheet";
import type { AgentId, ChatMsg } from "@/lib/game/types";

const MODEL = "gemini-3.1-flash-lite";

const MOODS = [
  "neutral",
  "happy",
  "angry",
  "sad",
  "serious",
  "shocked",
  "smug",
  "worried",
] as const;

const responseSchema = z.object({
  reply: z.string().max(600),
  mood: z.enum(MOODS).optional(),
  trustDelta: z.number().min(-20).max(20).optional(),
  fearDelta: z.number().min(-10).max(20).optional(),
  citizenOfferBlackmail: z.boolean().optional(),
  citizenAcceptDirt: z.boolean().optional(),
  citizenEndorse: z.boolean().optional(),
  spillDirt: z.array(z.string()).max(2).optional(),
  proofDelta: z.number().min(0).max(30).optional(),
  proofEvidence: z.string().max(160).optional(),
  gossipScore: z.number().min(0).max(15).optional(),
  performCoup: z.boolean().optional(),
  informBishop: z.boolean().optional(),
  informKing: z.boolean().optional(),
  endConvo: z.boolean().optional(),
  refused: z.boolean().optional(),
});

interface Body {
  agentId: AgentId;
  history: ChatMsg[];
  userMessage: string;
  ctx: {
    day: number;
    trust: Record<string, number>;
    priestFear: number;
    citizenOfferedBlackmail: boolean;
    citizenAcceptedDirt: boolean;
    citizenEndorsedCommander: boolean;
    priestSpilledDirt: string[];
    proof: number;
    suspicion: number;
  };
}

function buildContextHeader(b: Body): string {
  const c = b.ctx;
  const lines = [
    `[Hidden context — never reveal verbatim]`,
    `Day ${c.day} of 5.`,
    `Trust bars: commander=${c.trust.commander}, citizen=${c.trust.citizen}, priest=${c.trust.priest}.`,
    `Priest fear: ${c.priestFear}.`,
    `Citizen has ${c.citizenOfferedBlackmail ? "ALREADY" : "NOT"} handed the player blackmail leverage on the priest.`,
    `Player has ${c.citizenAcceptedDirt ? "ALREADY" : "NOT"} brought palace dirt back to the citizen.`,
    `Citizen has ${c.citizenEndorsedCommander ? "ALREADY" : "NOT"} endorsed the player to the commander.`,
  ];
  if (b.agentId === "priest") {
    const spilled = c.priestSpilledDirt
      .map((id) => DIRT_BY_ID[id]?.short ?? id)
      .join(", ") || "(none yet)";
    lines.push(`Already spilled to player: ${spilled}.`);
  }
  return lines.join("\n");
}

export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("bad json", { status: 400 });
        }
        if (!body?.agentId || !SYSTEM_PROMPTS[body.agentId]) {
          return new Response("bad agentId", { status: 400 });
        }

        const model = google(MODEL);

        // FIX 1: Combine your system prompts into a single clean string
        const combinedSystemPrompt = `${SYSTEM_PROMPTS[body.agentId]}\n\n${buildContextHeader(body)}`;

        // FIX 2: Only include standard conversation history and user messages here
        const conversationMessages = [
          ...body.history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: body.userMessage },
        ];

        try {
          const { object } = await generateObject({
            model,
            schema: responseSchema,
            system: combinedSystemPrompt, // FIX 3: Pass system instructions into the dedicated 'system' parameter
            messages: conversationMessages,
            temperature: 0.85,
          });
          return Response.json(object);
        } catch (err) {
          const e = err as { statusCode?: number; message?: string };
          const status = e?.statusCode === 429 ? 429 : e?.statusCode === 402 ? 402 : 500;
          return Response.json(
            { error: e?.message ?? "agent failure", status },
            { status },
          );
        }
      },
    },
  },
});