import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("container-app py-6 sm:py-8 lg:py-10", className)}>{children}</div>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-brand-100 bg-white p-4 shadow-soft sm:p-6", className)}>{children}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  description
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p> : null}
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
      {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}
