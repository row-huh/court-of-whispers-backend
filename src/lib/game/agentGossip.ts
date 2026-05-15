import type { GameState, AgentId, AgentConversation } from "./types";

/**
 * Simulates end-of-day agent conversations.
 * Agents gossip about the player and may influence each other's trust/suspicion.
 * Returns the new agent conversations to be stored in GameState.
 */
export function generateEndOfDayGossip(
  state: GameState,
): AgentConversation[] {
  const conversations: AgentConversation[] = [];

  // Simple rule-based gossip system:
  // - If any agent's trust is low, they might warn others
  // - Bishop will try to convince others if proof/suspicion is high
  // - Commander and Citizen might reassure each other if trust is good
  // - Priest will stay quiet unless blackmailed

  // Example: Citizen warns others if player trust is low
  if (state.trust.citizen < 40) {
    conversations.push({
      from: "citizen",
      to: "commander",
      day: state.day,
      messages: [
        {
          sender: "citizen",
          content:
            "I have concerns about this player. Something feels off. Be careful what you believe.",
        },
        {
          sender: "commander",
          content: "Noted. I do my own judging. But I appreciate the warning.",
        },
      ],
    });
  }

  // Bishop will share proof concerns with others if proof is high
  if (state.proof >= 50) {
    conversations.push({
      from: "bishop",
      to: "citizen",
      day: state.day,
      messages: [
        {
          sender: "bishop",
          content:
            "I have gathered troubling evidence of seditious intent. We must be cautious.",
        },
        {
          sender: "citizen",
          content:
            "That aligns with my instincts. I will keep my distance from this player.",
        },
      ],
    });
  }

  // Commander might reassure allies if things are going well
  if (state.trust.commander >= 80) {
    conversations.push({
      from: "commander",
      to: "citizen",
      day: state.day,
      messages: [
        {
          sender: "commander",
          content:
            "I believe this player may have merit. Their words ring of truth and honor.",
        },
        {
          sender: "citizen",
          content: "Interesting. Coming from you, that carries weight.",
        },
      ],
    });
  }

  // Priest stays hidden and quiet unless blackmailed
  if (state.priestBlackmailed && state.priestPalaceSecrets) {
    conversations.push({
      from: "priest",
      to: "bishop",
      day: state.day,
      messages: [
        {
          sender: "priest",
          content:
            "I have been coerced into revealing the crown's secrets. This player is dangerous.",
        },
        {
          sender: "bishop",
          content:
            "A grave offense. The player's actions grow more treasonous by the hour.",
        },
      ],
    });
  }

  return conversations;
}

/**
 * Applies the effects of agent-to-agent conversations to the game state.
 * This is called when the gossip is generated to immediately update stats.
 */
export function applyGossipEffects(
  state: GameState,
  gossip: AgentConversation[],
): Partial<GameState> {
  let trust = { ...state.trust };
  let suspicion = state.suspicion;

  for (const conv of gossip) {
    // If Bishop and Citizen converse negatively, increase suspicion
    if (conv.from === "bishop" && conv.to === "citizen" && state.proof >= 50) {
      suspicion = Math.min(100, suspicion + 5);
    }
    // If Priest gossiped about blackmail, suspicion increases
    if (conv.from === "priest" && conv.to === "bishop" && state.priestBlackmailed) {
      suspicion = Math.min(100, suspicion + 10);
    }
  }

  return { trust, suspicion };
}
