import type { NightExchange } from "@/lib/game/types";
import { AGENT_META } from "@/lib/game/agents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function NightRumors({
  open,
  day,
  exchanges,
  loading,
  onClose,
}: {
  open: boolean;
  day: number;
  exchanges: NightExchange[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl text-primary">
            Night falls on Day {day}
          </DialogTitle>
          <p className="text-sm text-muted-foreground italic">
            Whispers travel between them while you sleep.
          </p>
        </DialogHeader>

        {loading ? (
          <p className="italic text-muted-foreground py-6 text-center">The candles flicker. Voices in the corridors…</p>
        ) : exchanges.length === 0 ? (
          <p className="italic text-muted-foreground py-6 text-center">A quiet night. No one spoke of you.</p>
        ) : (
          <ul className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {exchanges.map((e, i) => {
              const fromM = AGENT_META[e.from];
              const toM = AGENT_META[e.to];
              const effects: string[] = [];
              if (e.effects.suspicionDelta) effects.push(`Bishop's suspicion +${e.effects.suspicionDelta}`);
              if (e.effects.proofDelta) effects.push(`Bishop's proof +${e.effects.proofDelta}`);
              if (e.effects.trustDeltas) {
                for (const [k, v] of Object.entries(e.effects.trustDeltas)) {
                  if (typeof v === "number" && v !== 0)
                    effects.push(`${AGENT_META[k as keyof typeof AGENT_META].name} trust ${v > 0 ? "+" : ""}${v}`);
                }
              }
              return (
                <li key={i} className="border-l-2 border-primary/50 pl-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    {fromM.emoji} {fromM.name} → {toM.emoji} {toM.name}
                  </div>
                  <p className="italic font-display text-base text-foreground/95">"{e.line}"</p>
                  <p className="italic font-display text-base text-foreground/75 mt-1">"{e.reply}"</p>
                  {effects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {effects.map((ef, j) => (
                        <span key={j} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-accent/60 text-accent">
                          {ef}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button onClick={onClose} disabled={loading} className="font-display">
            Dawn breaks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
