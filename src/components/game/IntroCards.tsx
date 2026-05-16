import { Button } from "@/components/ui/button";

const cards = [
  {
    title: "You are a con-artist.",
    body: "Not a thief — an artist. Your masterpiece begins tonight: convince this kingdom that the sitting king is a fraud, and that you are the true heir.",
  },
  {
    title: "Five days. Five words a day.",
    body: "Each day you may speak to five people, in any combination. Choose your audience as carefully as your words.",
  },
  {
    title: "Four souls. Four uses.",
    body: "Sir Alaric the Commander can carry out the coup. Mira the Citizen can sway him — but only if you bring her dirt on the king. Father Edran the palace priest holds that dirt — if you can frighten him into talking. Bishop Cyril is the hunter; speak to him only if you must.",
  },
  {
    title: "Trust begins at thirty.",
    body: "Every soul you speak with watches you. If their trust in you breaks completely, they will walk straight to the Bishop. And the Bishop hears the gossip of his flock — every careless word may reach him.",
  },
  {
    title: "Nights belong to them.",
    body: "After each day, the others whisper among themselves. You will see what they said of you in the morning — and feel its consequences.",
  },
];

export function IntroCards({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-5xl md:text-6xl font-display text-primary mb-2 text-center">The False Heir</h1>
      <p className="text-muted-foreground italic mb-10 text-center">A game of whispers and treason</p>

      <div className="grid gap-5 w-full">
        {cards.map((c, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-md p-6 shadow-lg"
            style={{ animation: `fadeIn 0.5s ${i * 0.12}s both` }}
          >
            <h2 className="font-display text-2xl text-primary mb-2">{c.title}</h2>
            <p className="text-foreground/90 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      <Button onClick={onBegin} size="lg" className="mt-10 px-10 font-display text-lg">
        Begin the Deception
      </Button>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
