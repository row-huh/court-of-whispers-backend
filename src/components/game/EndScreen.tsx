import { Button } from "@/components/ui/button";

export function EndScreen({
  status,
  message,
  onRestart,
}: {
  status: "won" | "lost";
  message: string;
  onRestart: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-2xl mx-auto text-center">
      <h1 className="font-display text-7xl mb-6" style={{ color: status === "won" ? "var(--trust)" : "var(--accent)" }}>
        {status === "won" ? "Long live the King." : "The blade falls."}
      </h1>
      <p className="text-xl text-foreground/90 italic mb-8 leading-relaxed">{message}</p>
      <Button onClick={onRestart} size="lg" className="font-display text-lg px-10">
        Begin Anew
      </Button>
    </div>
  );
}
