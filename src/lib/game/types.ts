export type AgentId = "commander" | "citizen" | "bishop";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface ProofEntry {
  day: number;
  turn: number;
  evidence: string;
  delta: number;
}

export interface GameState {
  day: number;          // 1..5
  turnsLeft: number;    // resets to 5 each day
  proof: number;        // 0..100
  suspicion: number;    // 0..100 (bishop suspicion)
  trust: { commander: number; citizen: number }; // 0..100, commander capped at 70 unless endorsed
  citizenEndorsedCommander: boolean;
  proofLog: ProofEntry[];
  conversations: Record<AgentId, ChatMsg[]>;
  status: "intro" | "playing" | "won" | "lost";
  endingMessage?: string;
}

export const initialGameState = (): GameState => ({
  day: 1,
  turnsLeft: 5,
  proof: 0,
  suspicion: 0,
  trust: { commander: 0, citizen: 0 },
  citizenEndorsedCommander: false,
  proofLog: [],
  conversations: { commander: [], citizen: [], bishop: [] },
  status: "intro",
});

export interface AgentDelta {
  reply: string;
  trustDelta?: number;     // commander/citizen
  citizenEndorse?: boolean; // citizen only
  proofDelta?: number;     // bishop only
  proofEvidence?: string;  // bishop only
  gossipScore?: number;    // commander/citizen only -> bishop suspicion
  performCoup?: boolean;   // commander only
  informKing?: boolean;    // bishop only
  endConvo?: boolean;
  refused?: boolean;
}
