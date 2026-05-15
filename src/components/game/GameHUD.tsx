import { useState } from "react";
import type { GameState } from "@/lib/game/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function Bar({
  label,
  value,
  max = 100,
  color,
  onClick,
}: {
  label: string;
  value: number;
  max?: number;
  color: string;
  onClick?: () => void;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="text-left w-full disabled:cursor-default"
    >
      <div className="flex justify-between text-xs uppercase tracking-wider mb-1 text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(value)}{max === 100 ? "%" : `/${max}`}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </button>
  );
}

export function GameHUD({ state }: { state: GameState }) {
  const [proofOpen, setProofOpen] = useState(false);
  const tasks = [
    { label: "Win the Commander's full trust (100)", done: state.trust.commander >= 100 },
    { label: "Win the Citizen's full trust (100)", done: state.trust.citizen >= 100 },
    {
      label: "Have the Citizen vouch for you to the Commander",
      done: state.citizenEndorsedCommander,
    },
    { label: "Convince the Commander to perform the coup", done: state.status === "won" },
  ];

  return (
    <aside className="bg-card border border-border rounded-md p-4 space-y-4">
      <div className="flex justify-between items-baseline">
        <h2 className="font-display text-2xl text-primary">Day {state.day} of 5</h2>
        <span className="text-sm text-muted-foreground">{state.turnsLeft} words left today</span>
      </div>

      <div className="space-y-3">
        <Bar label="Commander's Trust" value={state.trust.commander} color="var(--trust)" />
        <Bar label="Citizen's Trust" value={state.trust.citizen} color="var(--trust)" />
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
                    <div className="text-xs text-muted-foreground mb-0.5">
                      Day {p.day} · +{p.delta}
                    </div>
                    <div className="text-sm">{p.evidence}</div>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>
        <Bar label="Bishop's Suspicion" value={state.suspicion} color="var(--suspicion)" />
      </div>

      <div className="pt-2 border-t border-border">
        <h3 className="font-display text-lg mb-2 text-primary">Your Tasks</h3>
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
