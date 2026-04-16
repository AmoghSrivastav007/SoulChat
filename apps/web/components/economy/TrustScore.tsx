type TrustScoreProps = {
  value: number;
};

export function TrustScore({ value }: TrustScoreProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--text-secondary)]">Trust Score</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
