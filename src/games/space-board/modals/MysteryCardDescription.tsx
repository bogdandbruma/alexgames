import { Coins } from "lucide-react";

export function MysteryCardDescription({ text }: { text: string }) {
  const coinWord = /\s*coins\b/i;
  if (!coinWord.test(text)) {
    return <>{text}</>;
  }

  const segments = text.split(coinWord);

  return (
    <>
      {segments.map((segment, index) => (
        <span key={`${index}-${segment}`}>
          {segment}
          {index < segments.length - 1 ? (
            <Coins
              className="mystery-inline-coin"
              aria-hidden="true"
              size={14}
            />
          ) : null}
        </span>
      ))}
    </>
  );
}
