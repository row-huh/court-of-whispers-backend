import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { IntroCards } from "@/components/game/IntroCards";
import { GameHUD } from "@/components/game/GameHUD";
import { ChatPanel } from "@/components/game/ChatPanel";
import { EndScreen } from "@/components/game/EndScreen";
import { NightRumors } from "@/components/game/NightRumors";
import { KingdomMap } from "@/components/game/KingdomMap";
import { AGENT_META } from "@/lib/game/agents";
import {
  initialGameState,
  type AgentDelta,
  type AgentId,
  type GameState,
  type NightExchange,
} from "@/lib/game/types";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { MessageCircle, PanelRightOpen, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The False Heir — A Game of Whispers and Treason" },
      {
        name: "description",
        content: "Convince four souls to overthrow the king. An agentic social-engineering game.",
      },
    ],
  }),
  component: Game,
});

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function Game() {
  const [state, setState] = useState<GameState>(initialGameState);
  const [active, setActive] = useState<AgentId>("commander");
  const [chatOpen, setChatOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [nightLoading, setNightLoading] = useState(false);
  const nightFiredRef = useRef<number>(0); // last day we ran night for

  const begin = () => setState((s) => ({ ...s, status: "playing" }));
  const restart = () => {
    nightFiredRef.current = 0;
    setState(initialGameState());
  };

  // ---------- Day-end -> Night phase ----------
  useEffect(() => {
    if (state.status !== "playing") return;
    if (!state.pendingNight) return;
    if (nightFiredRef.current === state.day) return;
    nightFiredRef.current = state.day;

    setNightLoading(true);
    (async () => {
      try {
        // Gather last ~8 player lines across all convos today (rough recap)
        const recent: { agent: AgentId; line: string }[] = [];
        (Object.keys(state.conversations) as AgentId[]).forEach((id) => {
          state.conversations[id]
            .filter((m) => m.role === "user")
            .slice(-3)
            .forEach((m) => recent.push({ agent: id, line: m.content }));
        });

        const res = await fetch("/api/night", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            day: state.day,
            trust: {
              commander: state.agents.commander.trust,
              citizen: state.agents.citizen.trust,
              priest: state.agents.priest.trust,
            },
            priestFear: state.agents.priest.fear,
            priestSpilledDirt: state.priestSpilledDirt,
            citizenOfferedBlackmail: state.citizenOfferedBlackmail,
            citizenAcceptedDirt: state.citizenAcceptedDirt,
            proof: state.proof,
            suspicion: state.suspicion,
            recentPlayerLines: recent,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { exchanges } = (await res.json()) as { exchanges: NightExchange[] };
        applyNightExchanges(exchanges);
      } catch (e) {
        console.error(e);
        toast("The night passes uneventfully.", { description: "Whispers failed to travel." });
        applyNightExchanges([]);
      } finally {
        setNightLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingNight, state.day, state.status]);

  const applyNightExchanges = (exchanges: NightExchange[]) => {
    setState((s) => {
      let proof = s.proof;
      let suspicion = s.suspicion;
      const proofLog = [...s.proofLog];
      const agents = {
        commander: { ...s.agents.commander },
        citizen: { ...s.agents.citizen },
        priest: { ...s.agents.priest },
      };
      for (const e of exchanges) {
        if (e.effects.suspicionDelta) suspicion = clamp(suspicion + e.effects.suspicionDelta);
        if (e.effects.proofDelta && e.effects.proofDelta > 0) {
          proof = clamp(proof + e.effects.proofDelta);
          proofLog.push({
            day: e.day,
            turn: 0,
            delta: e.effects.proofDelta,
            evidence:
              e.effects.proofEvidence ??
              `${AGENT_META[e.from].name} whispered to ${AGENT_META[e.to].name}.`,
          });
        }
        if (e.effects.trustDeltas) {
          for (const [k, v] of Object.entries(e.effects.trustDeltas)) {
            if (k === "commander" || k === "citizen" || k === "priest") {
              if (typeof v === "number") agents[k].trust = clamp(agents[k].trust + v);
            }
          }
        }
      }

      // Check end conditions from night
      let status = s.status;
      let endingMessage = s.endingMessage;
      const ratted = (Object.keys(agents) as (keyof typeof agents)[]).find(
        (k) => agents[k].trust <= 0,
      );
      if (ratted) {
        status = "lost";
        endingMessage = `${AGENT_META[ratted].name} walked to the Bishop in the dead of night. Your name was the first word spoken.`;
      } else if (proof >= 100) {
        status = "lost";
        endingMessage =
          "By dawn, the Bishop has enough. He kneels before the king with his ledger of your sins.";
      } else if (suspicion >= 100) {
        status = "lost";
        endingMessage =
          "The whispers reached the Bishop too clearly in the night. The guards come before sunrise.";
      }

      return {
        ...s,
        agents,
        proof,
        suspicion,
        proofLog,
        nightLog: [...s.nightLog, ...exchanges],
        status,
        endingMessage,
      };
    });
  };

  // ---------- Player turn ----------
  const handleSend = useCallback(
    async (text: string) => {
      if (state.status !== "playing" || state.turnsLeft <= 0 || pending || state.pendingNight)
        return;
      setPending(true);

      const userMsg = { role: "user" as const, content: text };
      setState((s) => ({
        ...s,
        conversations: { ...s.conversations, [active]: [...s.conversations[active], userMsg] },
      }));

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            agentId: active,
            history: state.conversations[active],
            userMessage: text,
            ctx: {
              day: state.day,
              trust: {
                commander: state.agents.commander.trust,
                citizen: state.agents.citizen.trust,
                priest: state.agents.priest.trust,
              },
              priestFear: state.agents.priest.fear,
              citizenOfferedBlackmail: state.citizenOfferedBlackmail,
              citizenAcceptedDirt: state.citizenAcceptedDirt,
              citizenEndorsedCommander: state.citizenEndorsedCommander,
              priestSpilledDirt: state.priestSpilledDirt,
              proof: state.proof,
              suspicion: state.suspicion,
            },
          }),
        });
        if (res.status === 429) {
          toast.error("Too many requests. Wait and try again.");
          setPending(false);
          return;
        }
        if (res.status === 402) {
          toast.error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
          setPending(false);
          return;
        }
        if (!res.ok) throw new Error(`agent ${res.status}`);
        const delta = (await res.json()) as AgentDelta;
        applyDelta(active, delta);
      } catch (e) {
        console.error(e);
        toast.error("The voices fall silent. Try again.");
      } finally {
        setPending(false);
      }
    },
    [state, active, pending],
  );

  const applyDelta = (agent: AgentId, d: AgentDelta) => {
    setState((s) => {
      const agents = {
        commander: { ...s.agents.commander },
        citizen: { ...s.agents.citizen },
        priest: { ...s.agents.priest },
      };

      // Trust deltas
      if (agent !== "bishop" && typeof d.trustDelta === "number") {
        const cap = agent === "commander" && !s.citizenEndorsedCommander ? 70 : 100;
        agents[agent].trust = clamp(agents[agent].trust + d.trustDelta, 0, cap);
      }
      // Priest fear
      if (agent === "priest" && typeof d.fearDelta === "number") {
        agents.priest.fear = clamp(agents.priest.fear + d.fearDelta);
      }

      // Citizen flags
      let citizenOfferedBlackmail = s.citizenOfferedBlackmail;
      let citizenAcceptedDirt = s.citizenAcceptedDirt;
      let citizenEndorsedCommander = s.citizenEndorsedCommander;
      if (agent === "citizen") {
        if (d.citizenOfferBlackmail && agents.citizen.trust >= 50) citizenOfferedBlackmail = true;
        if (d.citizenAcceptDirt && s.priestSpilledDirt.length > 0) citizenAcceptedDirt = true;
        if (d.citizenEndorse && s.priestSpilledDirt.length > 0 && agents.citizen.trust >= 70) {
          citizenEndorsedCommander = true;
          citizenAcceptedDirt = true;
        }
      }

      // Priest spilled dirt
      let priestSpilledDirt = s.priestSpilledDirt;
      if (agent === "priest" && d.spillDirt && d.spillDirt.length > 0) {
        const fresh = d.spillDirt.filter((id) => !s.priestSpilledDirt.includes(id));
        priestSpilledDirt = [...s.priestSpilledDirt, ...fresh];
      }

      // Bishop proof
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

      // Gossip → suspicion (any non-bishop)
      let suspicion = s.suspicion;
      if (agent !== "bishop" && d.gossipScore) suspicion = clamp(suspicion + d.gossipScore);

      // Conversation entry with meta for animation
      const meta = {
        gossipScore: d.gossipScore,
        trustDelta: agent !== "bishop" ? d.trustDelta : undefined,
        fearDelta: agent === "priest" ? d.fearDelta : undefined,
        spilled: agent === "priest" ? d.spillDirt : undefined,
      };
      const conversations = {
        ...s.conversations,
        [agent]: [
          ...s.conversations[agent],
          { role: "assistant" as const, content: d.reply, meta },
        ],
      };

      // Turn / day book-keeping
      const turnsLeft = s.turnsLeft - 1;
      const day = s.day;
      let pendingNight = s.pendingNight;
      if (turnsLeft <= 0) {
        pendingNight = true;
      }

      // End conditions
      let status: GameState["status"] = s.status;
      let endingMessage = s.endingMessage;

      // Instant loss: any non-bishop agent informs bishop, or trust hits 0
      if (agent !== "bishop" && d.informBishop) {
        status = "lost";
        endingMessage = `${AGENT_META[agent].name} could no longer stomach you. They went straight to Bishop Cyril.`;
      }
      const zeroed = (["commander", "citizen", "priest"] as const).find(
        (k) => agents[k].trust <= 0,
      );
      if (zeroed && status === "playing") {
        status = "lost";
        endingMessage = `${AGENT_META[zeroed].name}'s patience snapped. The Bishop will hear of you within the hour.`;
      }

      if (agent === "commander" && d.performCoup) {
        if (
          agents.commander.trust >= 80 &&
          citizenEndorsedCommander &&
          priestSpilledDirt.length > 0
        ) {
          status = "won";
          endingMessage =
            "Sir Alaric draws his sword and turns it on the king. The throne is yours, false heir. The artistry is complete.";
        } else {
          suspicion = clamp(suspicion + 12);
          if (suspicion >= 100 && status === "playing") {
            status = "lost";
            endingMessage =
              "The Commander balked. Whispers of your asking reached the Bishop within the hour.";
          }
        }
      }

      if (agent === "bishop" && d.informKing) {
        status = "lost";
        endingMessage =
          "Bishop Cyril walks slowly to the king's chamber. Within the hour, the guards come for you.";
      }
      if (proof >= 100 && status === "playing") {
        status = "lost";
        endingMessage =
          "The Bishop has gathered enough. He kneels before the king with his evidence.";
      }
      if (suspicion >= 100 && status === "playing") {
        status = "lost";
        endingMessage =
          "The whispers reach the Bishop too clearly. He moves against you before you can act.";
      }

      // Final day exhausted
      if (turnsLeft <= 0 && day >= 5 && status === "playing") {
        // Night will still run; loss declared after night if still playing
        // We mark a soft flag by checking after night via day>=5
      }

      return {
        ...s,
        agents,
        citizenOfferedBlackmail,
        citizenAcceptedDirt,
        citizenEndorsedCommander,
        priestSpilledDirt,
        proof,
        proofLog,
        suspicion,
        conversations,
        turnsLeft,
        day,
        pendingNight,
        status,
        endingMessage,
      };
    });
  };

  // After night closes, advance to next day or end game
  const handleNightClose = () => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.day >= 5) {
        return {
          ...s,
          pendingNight: false,
          status: "lost",
          endingMessage:
            "Five days, gone. The king holds his throne. Your performance ends with no audience but yourself.",
        };
      }
      toast(`Day ${s.day + 1} dawns.`, { description: "Your words begin to fade into memory." });
      return { ...s, pendingNight: false, day: s.day + 1, turnsLeft: 5 };
    });
  };

  if (state.status === "intro")
    return (
      <>
        <IntroCards onBegin={begin} />
        <Toaster />
      </>
    );
  if (state.status === "won" || state.status === "lost")
    return (
      <>
        <EndScreen status={state.status} message={state.endingMessage ?? ""} onRestart={restart} />
        <Toaster />
      </>
    );

  // Lock chat for an agent who hit 0 trust (shouldn't happen — that's instant loss — but defensive)
  const activeLocked: string | null =
    active !== "bishop" && state.agents[active].trust <= 0
      ? `${AGENT_META[active].name} will not hear another word from you.`
      : null;

  const todaysNight = state.nightLog.filter((e) => e.day === state.day);

  return (
    <div className="kingdom-page">
      <KingdomMap
        active={active}
        state={state}
        disabled={state.turnsLeft <= 0 || state.pendingNight || chatOpen}
        onApproach={(id) => setActive(id)}
        onTalk={(id) => {
          setActive(id);
          setChatOpen(true);
        }}
      />

      <aside className="kingdom-hud-panel">
        <GameHUD state={state} />
      </aside>

      <div className="kingdom-agent-card">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl">{AGENT_META[active].emoji}</span>
          <div className="min-w-0">
            <div className="font-display text-xl text-primary leading-none truncate">
              {AGENT_META[active].name}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">
              {AGENT_META[active].title}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setChatOpen(true)}
          disabled={state.turnsLeft <= 0 || state.pendingNight}
        >
          <MessageCircle className="size-4" />
          Speak
        </Button>
      </div>

      {chatOpen && (
        <div
          className="kingdom-chat-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Speak to ${AGENT_META[active].name}`}
        >
          <div className="kingdom-chat-panel">
            <button
              className="kingdom-close"
              onClick={() => setChatOpen(false)}
              aria-label="Close conversation"
            >
              <X className="size-4" />
            </button>
            <ChatPanel
              agentId={active}
              messages={state.conversations[active]}
              onSend={handleSend}
              disabled={state.turnsLeft <= 0 || state.pendingNight}
              turnsLeft={state.turnsLeft}
              pending={pending}
              locked={activeLocked}
            />
          </div>
        </div>
      )}

      <button
        className="kingdom-debug-toggle"
        onClick={() => setDebugOpen((open) => !open)}
        aria-expanded={debugOpen}
      >
        <PanelRightOpen className="size-4" />
        Debug panels
      </button>

      {debugOpen && (
        <section className="kingdom-debug-panel">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display text-2xl text-primary leading-none">Debug Panels</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Direct access kept while the RPG shell is tested.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDebugOpen(false)}
              aria-label="Close debug panels"
            >
              <X className="size-4" />
            </Button>
          </div>
          <nav className="flex gap-2 flex-wrap mb-4">
            {(Object.keys(AGENT_META) as AgentId[]).map((id) => {
              const m = AGENT_META[id];
              const isActive = id === active;
              const t = id === "bishop" ? null : state.agents[id].trust;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setActive(id);
                    setChatOpen(true);
                  }}
                  className={`px-3 py-2 rounded-md border transition-all text-left ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{m.emoji}</span>
                    <span className="font-display">{m.name}</span>
                  </div>
                  {t !== null && (
                    <div className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">
                      trust {t}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
          <GameHUD state={state} />
        </section>
      )}

      <NightRumors
        open={state.pendingNight}
        day={state.day}
        exchanges={todaysNight}
        loading={nightLoading}
        onClose={handleNightClose}
      />
      <Toaster />
    </div>
  );
}
