import type { ReactNode } from "react";

/* ---------- time helpers (server-rendered; created_at is UTC "YYYY-MM-DD HH:MM:SS") ---------- */

export function parseUtc(createdAt: string): Date | null {
  const d = new Date(createdAt.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const absFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatAbsolute(d: Date) {
  return `${absFmt.format(d)} UTC`;
}

export function formatRelative(d: Date, now: Date) {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  return absFmt.format(d).split(",")[0];
}

export function When({ createdAt, now }: { createdAt: string; now: Date }) {
  const d = parseUtc(createdAt);
  if (!d) return <span className="text-sm text-zinc-500">{createdAt}</span>;
  return (
    <time dateTime={d.toISOString()} title={formatAbsolute(d)} className="text-sm text-zinc-600">
      <span className="font-medium text-zinc-700">{formatRelative(d, now)}</span>
      <span className="text-zinc-500"> · {formatAbsolute(d)}</span>
    </time>
  );
}

/* ---------- small building blocks ---------- */

type Tone = "green" | "gray" | "amber" | "red" | "blue";

const toneClass: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
  gray: "bg-zinc-100 text-zinc-700 ring-zinc-500/25",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/30",
  red: "bg-rose-50 text-rose-800 ring-rose-600/25",
  blue: "bg-sky-50 text-sky-800 ring-sky-600/25",
};

const dotClass: Record<Tone, string> = {
  green: "bg-emerald-500",
  gray: "bg-zinc-400",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-sky-500",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClass[tone]}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${dotClass[tone]}`} />
      {children}
    </span>
  );
}

export function PartySize({ n }: { n: number }) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-sm font-semibold tabular-nums text-zinc-800">
      {n} {n === 1 ? "person" : "people"}
    </span>
  );
}

export function Confidence({ value }: { value: number | null }) {
  if (value == null) return <span className="text-sm text-zinc-500">No confidence score</span>;
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const bar = pct >= 75 ? "bg-emerald-500" : pct >= 55 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-2" title={`AI confidence ${pct}%`}>
      <span
        className="h-2 w-20 overflow-hidden rounded-full bg-zinc-200"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="AI confidence"
      >
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-sm font-semibold tabular-nums text-zinc-700">{pct}%</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  emphasis = false,
  tone,
  className = "",
}: {
  label: string;
  value: number;
  hint?: string;
  emphasis?: boolean;
  tone?: "amber";
  className?: string;
}) {
  const base = emphasis
    ? "bg-zinc-900 text-white ring-zinc-900"
    : tone === "amber"
      ? "bg-amber-50 text-zinc-900 ring-amber-300"
      : "bg-white text-zinc-900 ring-zinc-200";
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 ring-1 sm:p-5 ${base} ${className}`}>
      {emphasis && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400"
        />
      )}
      <div className={`text-sm font-medium ${emphasis ? "text-zinc-300" : "text-zinc-600"}`}>{label}</div>
      <div className={`mt-1 font-bold tabular-nums tracking-tight ${emphasis ? "text-5xl" : "text-3xl sm:text-4xl"}`}>
        {value}
      </div>
      {hint && <div className={`mt-1 text-xs ${emphasis ? "text-zinc-400" : "text-zinc-500"}`}>{hint}</div>}
    </div>
  );
}

export function Section({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
          {title}
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700">
            {count}
          </span>
        </h2>
        {description && <p className="mt-0.5 text-sm text-zinc-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
      {children}
    </ul>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}
