import { useEffect, useState } from 'react';
import { Activity, Gauge } from 'lucide-react';
import Card from './Card';
import { fuse, levelFromScore, levelText, WEIGHTS } from '../utils/risk';
import type { Signals } from '../types';

const SCENARIOS: { id: string; label: string; hint: string; values: Signals }[] = [
  { id: 'routine', label: 'Routine commute', hint: 'Mostly quiet sample inputs with normal movement.', values: { crime: 18, threat: 6, fall: 4, geofence: 0 } },
  { id: 'area', label: 'Reported-area entry', hint: 'A danger-area report is nearby while other signals stay low.', values: { crime: 54, threat: 12, fall: 7, geofence: 100 } },
  { id: 'voice', label: 'Distress phrase', hint: 'A high transcript signal with otherwise calm sample inputs.', values: { crime: 20, threat: 82, fall: 8, geofence: 0 } },
  { id: 'combined', label: 'Multiple raised signals', hint: 'Several sample inputs rise together.', values: { crime: 78, threat: 84, fall: 76, geofence: 100 } },
];

const LABELS: { key: keyof Signals; title: string }[] = [
  { key: 'crime', title: 'Area signal' },
  { key: 'threat', title: 'Voice transcript' },
  { key: 'fall', title: 'Movement' },
  { key: 'geofence', title: 'Reported zone' },
];

function vary(value: number, phase: number, index: number) {
  const change = Math.round(Math.sin((phase + index * 2) / 2.6) * 4 + Math.cos((phase + index) / 4) * 2);
  return Math.max(0, Math.min(100, value + change));
}

export default function RiskSimulationPanel() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [phase, setPhase] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0];
  const signals: Signals = {
    crime: vary(scenario.values.crime, phase, 0),
    threat: vary(scenario.values.threat, phase, 1),
    fall: vary(scenario.values.fall, phase, 2),
    geofence: vary(scenario.values.geofence, phase, 3),
  };
  const score = fuse(signals);
  const level = levelFromScore(score);

  useEffect(() => {
    setPhase(0);
    const timer = window.setInterval(() => setPhase((value) => value + 1), 3500);
    return () => window.clearInterval(timer);
  }, [scenarioId]);

  useEffect(() => {
    setHistory((values) => [...values, score].slice(-18));
  }, [score]);

  return (
    <Card title="Risk engine simulation" icon={<Activity size={16} />}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm font-medium">Scenario
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} className="mt-1 block min-w-56 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            {SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <div className="rounded-lg bg-bg px-4 py-2 text-right">
          <p className="text-xs uppercase tracking-wider text-muted">Simulated score</p>
          <p className={'num text-2xl font-bold ' + levelText[level]}><Gauge size={17} className="mr-1 inline" />{score}<span className="text-sm"> / 100</span></p>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{scenario.hint} Current band: <b className={levelText[level]}>{level}</b>.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          {LABELS.map(({ key, title }) => <div key={key}>
            <div className="mb-1 flex justify-between text-xs"><span>{title} <span className="text-muted">weight {Math.round(WEIGHTS[key] * 100)}%</span></span><b className="num">{signals[key]}</b></div>
            <div className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: signals[key] + '%' }} /></div>
          </div>)}
        </div>
        <div className="rounded-lg bg-bg p-3">
          <div className="flex items-end gap-1" role="img" aria-label="Recent simulated risk score trend">
            {history.map((sample, index) => <span key={index} className="min-h-1 flex-1 rounded-t bg-primary/70 transition-all duration-700" style={{ height: Math.max(5, sample) + 'px', maxHeight: '100px' }} title={'Sample score ' + sample} />)}
          </div>
          <p className="mt-2 text-xs text-muted">Recent simulated score samples</p>
        </div>
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">SIMULATION ONLY. These changing values are synthetic examples, not live GPS, voice, movement, or crime readings. They do not affect your real score or send alerts.</p>
    </Card>
  );
}
