import { levelBg, levelFromScore } from '../utils/risk';

export default function RiskBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label} <span className="text-muted">· weight {Math.round(weight * 100)}%</span></span>
        <span className="num font-semibold">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${levelBg[levelFromScore(value)]}`} style={{ width: `${value}%`, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}
