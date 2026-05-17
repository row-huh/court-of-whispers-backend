export type AgentId = "commander" | "citizen" | "priest" | "bishop";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  meta?: { gossipScore?: number; trustDelta?: number; fearDelta?: number; spilled?: string[] };
}

export interface ProofEntry {
  day: number;
  turn: number;
  evidence: string;
  delta: number;
}

export interface NightExchange {
  day: number;
  from: AgentId;
  to: AgentId;
  line: string;
  reply: string;
  effects: {
    suspicionDelta?: number;
    proofDelta?: number;
    proofEvidence?: string;
    trustDeltas?: Partial<Record<AgentId, number>>;
  };
}

export interface AgentBars {
  trust: number; // 0..100 (start 30). Hit 0 -> instant loss.
  fear: number;  // 0..100 (priest mainly): blackmail leverage
}

export interface GameState {
  day: number;             // 1..5
  turnsLeft: number;       // resets each day
  proof: number;           // 0..100
  suspicion: number;       // 0..100
  agents: Record<Exclude<AgentId, "bishop">, AgentBars>; // bishop has no trust bar (he's the threat)
  citizenOfferedBlackmail: boolean; // citizen handed you leverage on the priest
  citizenAcceptedDirt: boolean;     // you brought dirt back to citizen -> she endorses
  citizenEndorsedCommander: boolean;
  priestSpilledDirt: string[];      // ids from DIRT_SHEET the priest has spilled
  proofLog: ProofEntry[];
  conversations: Record<AgentId, ChatMsg[]>;
  nightLog: NightExchange[];
  pendingNight: boolean;            // true when a day just ended; show modal
  status: "intro" | "playing" | "won" | "lost";
  endingMessage?: string;
}

export const initialGameState = (): GameState => ({
  day: 1,
  turnsLeft: 5,
  proof: 0,
  suspicion: 0,
  agents: {
    commander: { trust: 30, fear: 0 },
    citizen: { trust: 30, fear: 0 },
    priest: { trust: 30, fear: 0 },
  },
  citizenOfferedBlackmail: false,
  citizenAcceptedDirt: false,
  citizenEndorsedCommander: false,
  priestSpilledDirt: [],
  proofLog: [],
  conversations: { commander: [], citizen: [], priest: [], bishop: [] },
  nightLog: [],
  pendingNight: false,
  status: "intro",
});

export interface AgentDelta {
  reply: string;
  mood?: "neutral" | "happy" | "angry" | "sad" | "serious" | "shocked" | "smug" | "worried";
  trustDelta?: number;
  fearDelta?: number;          // priest
  citizenOfferBlackmail?: boolean; // citizen: hands player leverage
  citizenAcceptDirt?: boolean;     // citizen: dirt brought back, she's satisfied
  citizenEndorse?: boolean;        // citizen: full endorsement of player to commander
  spillDirt?: string[];            // priest: ids from DIRT_SHEET spilled this turn
  proofDelta?: number;             // bishop
  proofEvidence?: string;          // bishop
  gossipScore?: number;            // 0..15, raises bishop suspicion (commander/citizen/priest)
  performCoup?: boolean;           // commander
  informBishop?: boolean;          // any non-bishop agent: rats you out -> loss
  informKing?: boolean;            // bishop
  endConvo?: boolean;
  refused?: boolean;
}
