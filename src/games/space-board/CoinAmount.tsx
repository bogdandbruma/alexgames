import { Coins } from "lucide-react";

export function CoinAmount({
  amount,
  className = "",
  signed = false,
}: {
  amount: number;
  className?: string;
  signed?: boolean;
}) {
  const displayAmount = signed && amount > 0 ? `+${amount}` : `${amount}`;

  return (
    <span
      className={className ? `coin-amount ${className}` : "coin-amount"}
      aria-label={`${displayAmount} coins`}
    >
      <Coins aria-hidden="true" size={16} />
      <strong>{displayAmount}</strong>
      <span>coins</span>
    </span>
  );
}
