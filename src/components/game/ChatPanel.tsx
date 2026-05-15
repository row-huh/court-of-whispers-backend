import { useState, useRef, useEffect } from "react";
import { AGENT_META } from "@/lib/game/agents";
import type { AgentId, ChatMsg } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatPanel({
  agentId,
  messages,
  onSend,
  disabled,
  turnsLeft,
  pending,
}: {
  agentId: AgentId;
  messages: ChatMsg[];
  onSend: (text: string) => void;
  disabled: boolean;
  turnsLeft: number;
  pending: boolean;
}) {
  const meta = AGENT_META[agentId];
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled || pending) return;
    onSend(t.slice(0, 100));
    setText("");
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-md overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <h3 className="font-display text-2xl text-primary leading-none">{meta.name}</h3>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{meta.title}</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[300px]">
        {messages.length === 0 && (
          <p className="text-muted-foreground italic text-sm">
            {meta.name} watches you, waiting for you to speak.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-md px-3 py-2 max-w-[80%] text-sm"
                  : "text-foreground/95 max-w-[85%] italic font-display text-base leading-snug"
              }
            >
              {m.role === "assistant" && <span className="text-muted-foreground not-italic font-body text-xs mr-2">— {meta.name}:</span>}
              {m.content}
            </div>
          </div>
        ))}
        {pending && (
          <div className="text-muted-foreground italic text-sm">{meta.name} considers your words…</div>
        )}
      </div>

      <div className="border-t border-border p-3 bg-secondary/20">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 100))}
          placeholder={disabled ? "The day is spent." : `Speak to ${meta.name}… (max 100 chars)`}
          rows={2}
          disabled={disabled || pending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="resize-none bg-input/50 border-border"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">
            {text.length}/100 · {turnsLeft} left today
          </span>
          <Button onClick={submit} disabled={disabled || pending || !text.trim()} size="sm">
            Speak
          </Button>
        </div>
      </div>
    </div>
  );
}
