import { useState } from "react";
import { AGENT_META } from "@/lib/game/agents";
import type { AgentConversation } from "@/lib/game/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AgentGossipPanel({
  conversations,
  dayNumber,
}: {
  conversations: AgentConversation[];
  dayNumber: number;
}) {
  const [open, setOpen] = useState(false);

  const dayConversations = conversations.filter((c) => c.day === dayNumber);

  if (dayConversations.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-accent hover:text-accent/80 transition-colors underline">
          👥 View Whispers ({dayConversations.length})
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Whispers of Day {dayNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {dayConversations.map((conv, i) => {
            const fromMeta = AGENT_META[conv.from];
            const toMeta = AGENT_META[conv.to];
            return (
              <div key={i} className="border-l-4 border-accent pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{fromMeta.emoji}</span>
                  <span className="font-display text-sm font-bold">{fromMeta.name}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <span className="text-lg">{toMeta.emoji}</span>
                  <span className="font-display text-sm font-bold">{toMeta.name}</span>
                </div>
                <div className="space-y-1.5 bg-secondary/20 rounded p-3">
                  {conv.messages.map((msg, j) => {
                    const sender = AGENT_META[msg.sender];
                    return (
                      <div key={j} className="text-sm">
                        <span className="text-muted-foreground">— {sender.name}:</span>
                        <p className="ml-4 text-foreground/90 italic">{msg.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
