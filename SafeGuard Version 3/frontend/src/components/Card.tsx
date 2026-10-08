import type { ReactNode } from 'react';

export default function Card({ title, icon, children, className = '' }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 shadow-[0_3px_16px_rgba(27,40,36,.035)] sm:p-6 ${className}`}>
      <h2 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-muted">{icon && <span className="text-primary">{icon}</span>}{title}</h2>
      {children}
    </section>
  );
}
