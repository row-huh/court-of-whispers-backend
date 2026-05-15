import { useEffect, useState } from "react";

export function GossipPopup({
  score,
  statChange,
}: {
  score: number;
  statChange?: { stat: string; direction: "up" | "down" };
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [score]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 animate-in fade-in slide-in-from-bottom-2 pointer-events-none">
      <div className="bg-card border border-accent rounded-md px-4 py-3 shadow-lg space-y-1">
        <div className="text-sm font-bold text-accent flex items-center gap-2">
          <span>🗣️ Gossip Score</span>
          <span className="text-lg">+{score}</span>
        </div>
        {statChange && (
          <div
            className={`text-xs ${
              statChange.direction === "up"
                ? "text-red-400"
                : statChange.direction === "down"
                  ? "text-green-400"
                  : "text-gray-400"
            }`}
          >
            {statChange.direction === "up" ? "↑" : "↓"} {statChange.stat}
          </div>
        )}
      </div>
    </div>
  );
}
