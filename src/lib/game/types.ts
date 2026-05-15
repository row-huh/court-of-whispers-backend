export type AgentId = "commander" | "citizen" | "bishop" | "priest";

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

export interface AgentConversation {
  from: AgentId;
  to: AgentId;
  day: number;
  messages: Array<{ sender: AgentId; content: string }>;
}

export interface GameState {
  day: number;          // 1..5
  turnsLeft: number;    // resets to 5 each day
  proof: number;        // 0..100
  suspicion: number;    // 0..100 (bishop suspicion)
  trust: { commander: number; citizen: number; priest: number }; // 0..100, commander capped at 70 unless endorsed
  citizenEndorsedCommander: boolean;
  proofLog: ProofEntry[];
  conversations: Record<AgentId, ChatMsg[]>;
  agentConversations: AgentConversation[]; // end-of-day gossip between agents
  priestPalaceSecrets: string; // the "dirt sheet" revealed by priest
  priestBlackmailed: boolean;  // whether priest has been blackmailed
  status: "intro" | "playing" | "won" | "lost";
  endingMessage?: string;
  lastGossipScore?: number; // for display
}

export const initialGameState = (): GameState => ({
  day: 1,
  turnsLeft: 5,
  proof: 0,
  suspicion: 0,
  trust: { commander: 30, citizen: 30, priest: 30 },
  citizenEndorsedCommander: false,
  proofLog: [],
  conversations: { commander: [], citizen: [], bishop: [], priest: [] },
  agentConversations: [],
  priestPalaceSecrets: "",
  priestBlackmailed: false,
  status: "intro",
});

export interface AgentDelta {
  reply: string;
  trustDelta?: number;      // commander/citizen/priest
  citizenEndorse?: boolean;  // citizen only
  priestBlackmailed?: boolean; // priest only
  palaceSecrets?: string;    // priest only
  proofDelta?: number;       // bishop only
  proofEvidence?: string;    // bishop only
  gossipScore?: number;      // commander/citizen/priest -> bishop suspicion
  performCoup?: boolean;     // commander only
  informKing?: boolean;      // bishop only
  endConvo?: boolean;
  refused?: boolean;
}
