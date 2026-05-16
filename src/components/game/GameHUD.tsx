import { useState } from "react";
import type { GameState, AgentId } from "@/lib/game/types";
import { AGENT_META } from "@/lib/game/agents";
import { DIRT_BY_ID } from "@/lib/game/dirt-sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function Bar({
  label,
  value,
  max = 100,
  color,
  warn,
  onClick,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  warn?: boolean;
  onClick?: () => void;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <button onClick={onClick} disabled={!onClick} className="text-left w-full disabled:cursor-default">
      <div className="flex justify-between text-xs uppercase tracking-wider mb-1 text-muted-foreground">
        <span className={warn ? "text-accent" : ""}>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </button>
  );
}

export function GameHUD({ state }: { state: GameState }) {
  const [proofOpen, setProofOpen] = useState(false);
  const tasks: { label: string; done: boolean }[] = [
    { label: "Earn Mira's faith — she offers leverage on the priest", done: state.citizenOfferedBlackmail },
    { label: "Press Father Edran for palace dirt", done: state.priestSpilledDirt.length > 0 },
    { label: "Bring the dirt back to Mira — she endorses you", done: state.citizenAcceptedDirt },
    { label: "Use the dirt to turn Sir Alaric", done: state.agents.commander.trust >= 80 },
    { label: "Convince the Commander to perform the coup", done: state.status === "won" },
  ];

  const trustBar = (id: Exclude<AgentId, "bishop">) => {
    const v = state.agents[id].trust;
    return (
      <Bar
        key={id}
        label={`${AGENT_META[id].name}'s Trust`}
        value={v}
        color="var(--trust)"
        warn={v <= 15}
      />
    );
  };

  return (
    <aside className="bg-card border border-border rounded-md p-4 space-y-4">
      <div className="flex justify-between items-baseline">
        <h2 className="font-display text-2xl text-primary">Day {state.day} of 5</h2>
        <span className="text-sm text-muted-foreground">{state.turnsLeft} words left today</span>
      </div>

      <div className="space-y-3">
        {trustBar("commander")}
        {trustBar("citizen")}
        {trustBar("priest")}
        <Bar label="Father Edran's Fear of You" value={state.agents.priest.fear} color="var(--accent)" />
        <Dialog open={proofOpen} onOpenChange={setProofOpen}>
          <DialogTrigger asChild>
            <div>
              <Bar
                label="Bishop's Proof Against You"
                value={state.proof}
                color="var(--proof)"
                onClick={() => setProofOpen(true)}
              />
            </div>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Evidence the Bishop has gathered</DialogTitle>
            </DialogHeader>
            {state.proofLog.length === 0 ? (
              <p className="text-muted-foreground italic">No evidence yet. Keep it that way.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto">
                {state.proofLog.map((p, i) => (
                  <li key={i} className="border-l-2 border-accent pl-3 py-1">
                    <div className="text-xs text-muted-foreground mb-0.5">Day {p.day} · +{p.delta}</div>
                    <div className="text-sm">{p.evidence}</div>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>
        <Bar label="Bishop's Suspicion" value={state.suspicion} color="var(--suspicion)" />
      </div>

      {state.priestSpilledDirt.length > 0 && (
        <div className="pt-2 border-t border-border">
          <h3 className="font-display text-lg mb-2 text-primary">Dirt You Hold</h3>
          <ul className="space-y-1 text-xs text-foreground/85">
            {state.priestSpilledDirt.map((id) => (
              <li key={id} className="flex gap-2"><span className="text-accent">✦</span>{DIRT_BY_ID[id]?.short ?? id}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <h3 className="font-display text-lg mb-2 text-primary">Your Path</h3>
        <ul className="space-y-1.5 text-sm">
          {tasks.map((t, i) => (
            <li key={i} className={t.done ? "text-primary" : "text-foreground/80"}>
              <span className="mr-2">{t.done ? "✓" : "○"}</span>
              {t.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
