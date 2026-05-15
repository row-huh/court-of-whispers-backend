import { Button } from "@/components/ui/button";

const cards = [
  {
    title: "You are a con-artist.",
    body: "Not a thief — an artist. And tonight you begin your masterpiece. You will convince this kingdom that the sitting king is a fraud, and that you are the true heir to the throne.",
  },
  {
    title: "You have five days.",
    body: "Each day you may speak five times. Choose your words, and your audience, with care. Once a day is spent, it is gone.",
  },
  {
    title: "Three souls hold the realm.",
    body: "Sir Alaric — the Army Commander — can carry out the coup, but only if he believes you. Mira — the Citizen Representative — can sway him on your behalf. Bishop Cyril — loyal to the king — is watching.",
  },
  {
    title: "Beware the Bishop.",
    body: "He hears the gossip of his flock. Every careless word you speak to others may reach him. If his suspicion fills, he will tell the king — and you will not see another sunrise.",
  },
];

export function IntroCards({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-5xl md:text-6xl font-display text-primary mb-2 text-center">
        The False Heir
      </h1>
      <p className="text-muted-foreground italic mb-10 text-center">A game of whispers and treason</p>

      <div className="grid gap-5 w-full">
        {cards.map((c, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-md p-6 shadow-lg"
            style={{ animation: `fadeIn 0.5s ${i * 0.15}s both` }}
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
