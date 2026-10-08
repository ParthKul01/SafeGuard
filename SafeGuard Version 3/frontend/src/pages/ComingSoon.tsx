import { Construction } from 'lucide-react';

export default function ComingSoon({ title, phase, description }: { title: string; phase: number; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-10 text-center">
      <Construction className="mx-auto mb-3 text-muted" />
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      <p className="mt-4 text-sm font-medium text-primary">Planned for Phase {phase}</p>
    </div>
  );
}
