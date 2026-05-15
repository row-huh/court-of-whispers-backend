import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { IntroCards } from "@/components/game/IntroCards";
import { GameHUD } from "@/components/game/GameHUD";
import { ChatPanel } from "@/components/game/ChatPanel";
import { EndScreen } from "@/components/game/EndScreen";
import { AGENT_META } from "@/lib/game/agents";
import { initialGameState, type AgentDelta, type AgentId, type GameState } from "@/lib/game/types";
import { generateEndOfDayGossip, applyGossipEffects } from "@/lib/game/agentGossip";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The False Heir — A Game of Whispers and Treason" },
      { name: "description", content: "Convince three souls to overthrow the king. An agentic social-engineering game." },
    ],
  }),
  component: Game,
});

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function Game() {
  const [state, setState] = useState<GameState>(initialGameState);
  const [active, setActive] = useState<AgentId>("commander");
  const [pending, setPending] = useState(false);

  const begin = () => setState((s) => ({ ...s, status: "playing" }));
  const restart = () => setState(initialGameState());

  const handleSend = useCallback(
    async (text: string) => {
      if (state.status !== "playing" || state.turnsLeft <= 0 || pending) return;

      setPending(true);
      // Optimistically add user message
      const optimistic: GameState = {
        ...state,
        conversations: {
          ...state.conversations,
          [active]: [...state.conversations[active], { role: "user", content: text }],
        },
      };
      setState(optimistic);

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            agentId: active,
            history: state.conversations[active],
            userMessage: text,
            gameState: {
              day: state.day,
              trust: state.trust,
              citizenEndorsedCommander: state.citizenEndorsedCommander,
              proof: state.proof,
              suspicion: state.suspicion,
            },
          }),
        });

        if (res.status === 429) {
          toast.error("Too many requests. Wait a moment and try again.");
          setPending(false);
          // rollback turn (don't consume)
          setState(state);
          return;
        }
        if (res.status === 402) {
          toast.error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
          setPending(false);
          setState(state);
          return;
        }
        if (!res.ok) throw new Error(`agent ${res.status}`);

        const delta = (await res.json()) as AgentDelta;
        applyDelta(active, text, delta);
      } catch (e) {
        console.error(e);
        toast.error("The voices fall silent. Try again.");
        setState(state); // rollback
      } finally {
        setPending(false);
      }
    },
    [state, active, pending],
  );

  const applyDelta = (agent: AgentId, _userText: string, d: AgentDelta) => {
    setState((s) => {
      // Compute new trust (commander capped at 70 unless endorsed)
      let trust = { ...s.trust };
      if (agent === "commander" && typeof d.trustDelta === "number") {
        const cap = s.citizenEndorsedCommander || d.performCoup ? 100 : 70;
        trust.commander = clamp(trust.commander + d.trustDelta, 0, cap);
      }
      if (agent === "citizen" && typeof d.trustDelta === "number") {
        trust.citizen = clamp(trust.citizen + d.trustDelta);
      }
      if (agent === "priest" && typeof d.trustDelta === "number") {
        trust.priest = clamp(trust.priest + d.trustDelta);
      }

      const citizenEndorsedCommander =
        s.citizenEndorsedCommander ||
        (agent === "citizen" && d.citizenEndorse === true && s.trust.citizen >= 80);

      // Handle Priest blackmail and palace secrets
      let priestBlackmailed = s.priestBlackmailed;
      let priestPalaceSecrets = s.priestPalaceSecrets;
      if (agent === "priest" && d.priestBlackmailed === true) {
        priestBlackmailed = true;
      }
      if (agent === "priest" && d.palaceSecrets && d.palaceSecrets.length > 0) {
        priestPalaceSecrets = d.palaceSecrets;
      }

      // If newly endorsed, allow commander trust to climb past 70 next turn.
      let proof = s.proof;
      const proofLog = [...s.proofLog];
      if (agent === "bishop" && d.proofDelta && d.proofDelta > 0 && d.proofEvidence) {
        proof = clamp(proof + d.proofDelta);
        proofLog.push({
          day: s.day,
          turn: 6 - s.turnsLeft,
          delta: d.proofDelta,
          evidence: d.proofEvidence,
        });
      }

      // Bishop hears gossip when player talks to others
      let suspicion = s.suspicion;
      if ((agent === "commander" || agent === "citizen") && d.gossipScore) {
        suspicion = clamp(suspicion + d.gossipScore);
      }

      const conversations = {
        ...s.conversations,
        [agent]: [...s.conversations[agent], { role: "assistant" as const, content: d.reply }],
      };

      let turnsLeft = s.turnsLeft - 1;
      let day = s.day;
      let agentConversations = [...s.agentConversations];
      
      if (turnsLeft <= 0 && day < 5) {
        day += 1;
        turnsLeft = 5;
        
        // Generate end-of-day agent gossip
        const gossip = generateEndOfDayGossip({ ...s, day: day - 1, turnsLeft: 0 });
        agentConversations = [...agentConversations, ...gossip];
        
        const gossipEffects = applyGossipEffects({ ...s, day: day - 1, turnsLeft: 0 }, gossip);
        if (gossipEffects.suspicion !== undefined) {
          suspicion = gossipEffects.suspicion;
        }
        
        toast(`Day ${day} dawns.`, { description: "Whispers spread through the kingdom." });
      }

      // End conditions
      let status: GameState["status"] = s.status;
      let endingMessage = s.endingMessage;

      if (agent === "commander" && d.performCoup) {
        if (trust.commander >= 95 && citizenEndorsedCommander) {
          status = "won";
          endingMessage =
            "Sir Alaric draws his sword and turns it on the king. The throne is yours, false heir. The artistry is complete.";
        } else {
          // commander tried but not enough — treat as a refusal that may spike suspicion
          suspicion = clamp(suspicion + 8);
        }
      }

      if (agent === "bishop" && d.informKing) {
        status = "lost";
        endingMessage =
          "Bishop Cyril walks slowly to the king's chamber. Within the hour, the guards come for you. The masterpiece dies in its frame.";
      }

      // Check if any agent's trust reached 0 (they inform the bishop)
      if (trust.commander <= 0) {
        status = "lost";
        endingMessage =
          "Sir Alaric's patience is exhausted. He walks to the Bishop with words of your treachery. The game is over.";
      }
      if (trust.citizen <= 0) {
        status = "lost";
        endingMessage =
          "Mira turns away from you, her face hard. She seeks out the Bishop that very night. Your words have condemned you.";
      }
      if (trust.priest <= 0) {
        status = "lost";
        endingMessage =
          "Father Cassius kneels in the Bishop's chamber, his conscience unburdened. The clergy now hunt you with righteous fervor.";
      }

      if (proof >= 100 && status === "playing") {
        status = "lost";
        endingMessage =
          "The Bishop has gathered enough. He kneels before the king with his evidence. You are not given a chance to speak.";
      }
      if (suspicion >= 100 && status === "playing") {
        status = "lost";
        endingMessage =
          "The whispers reach the Bishop's ear too clearly. He moves against you before you can act. The kingdom never knew your name.";
      }
      if (turnsLeft <= 0 && day >= 5 && status === "playing") {
        status = "lost";
        endingMessage =
          "Five days, gone. The king holds his throne. Your performance ends with no audience but yourself.";
      }

      return {
        ...s,
        trust,
        citizenEndorsedCommander,
        proof,
        proofLog,
        suspicion,
        conversations,
        agentConversations,
        priestBlackmailed,
        priestPalaceSecrets,
        turnsLeft,
        day,
        status,
        endingMessage,
        lastGossipScore: d.gossipScore,
      };
    });
  };

  if (state.status === "intro") return <><IntroCards onBegin={begin} /><Toaster /></>;
  if (state.status === "won" || state.status === "lost")
    return (
      <>
        <EndScreen status={state.status} message={state.endingMessage ?? ""} onRestart={restart} />
        <Toaster />
      </>
    );

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-4xl text-primary">The False Heir</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          <nav className="flex gap-2 flex-wrap">
            {(Object.keys(AGENT_META) as AgentId[]).map((id) => {
              const m = AGENT_META[id];
              const isActive = id === active;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`px-4 py-2 rounded-md border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <span className="mr-2">{m.emoji}</span>
                  <span className="font-display">{m.name}</span>
                </button>
              );
            })}
          </nav>
          <div className="min-h-[60vh]">
            <ChatPanel
              agentId={active}
              messages={state.conversations[active]}
              onSend={handleSend}
              disabled={state.turnsLeft <= 0}
              turnsLeft={state.turnsLeft}
              pending={pending}
              lastGossipScore={state.lastGossipScore}
            />
          </div>
        </div>

        <GameHUD state={state} />
      </div>
      <Toaster />
    </div>
  );
}
