import type { RiskLevel } from '../types';
import { levelText } from '../utils/risk';

export default function RiskGauge({ score, level, inverse = false }: { score: number; level: RiskLevel; inverse?: boolean }) {
  const R = 88, C = 2 * Math.PI * R;
  return (
    <div className={`relative size-44 sm:size-48 ${inverse ? 'text-white' : levelText[level]}`} role="img" aria-label={`Current signal score ${score} out of 100, ${level}`}>
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" stroke={inverse ? 'rgba(255,255,255,.22)' : 'var(--line)'} strokeWidth="12" />
        <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s ease, stroke .4s' }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className={`text-xs ${inverse ? 'text-white/70' : 'text-muted'}`}>Signal score</span>
        <span className="num text-6xl font-bold leading-none">{score}</span>
        <span className="mt-1 font-semibold">{level}</span>
      </div>
    </div>
  );
}
