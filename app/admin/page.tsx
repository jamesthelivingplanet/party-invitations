import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin-auth";
import { db, ensureSchema, type RsvpRow } from "@/lib/db";
import type { Guest } from "@/lib/guests";
import { eventStore, guestStore } from "@/lib/stores";
import { ReviewActions, UndoButton } from "./controls";
import { AdminShell } from "./shell";
import { Badge, Confidence, Empty, List, PartySize, Section, StatCard, When, formatAbsolute } from "./ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function Admin() {
  await requireAdminPage();

  const [allGuests, event] = await Promise.all([
    guestStore.list({ includeArchived: true }),
    eventStore.get(),
  ]);
  const guests = allGuests.filter((g) => !g.archived);
  const archivedIds = new Set(allGuests.filter((g) => g.archived).map((g) => g.id));

  await ensureSchema();
  const { rows } = await db.execute("SELECT * FROM rsvps ORDER BY id DESC");
  const rsvps = rows as unknown as RsvpRow[];
  const nameOf = (id: string | null) => allGuests.find((g) => g.id === id)?.name ?? "—";
  const now = new Date();

  // Apply the host's decisions on top of the AI matches (oldest first, so the latest reply wins).
  type Eff = { r: RsvpRow; key: string; name: string; by: "ai" | "assigned" | "new" };
  const latest = new Map<string, Eff>();
  const replyCount = new Map<string, number>();
  const review: RsvpRow[] = [];
  const dismissed: RsvpRow[] = [];
  for (const r of [...rsvps].reverse()) {
    let eff: Eff | null = null;
    if (r.decision === "dismissed") {
      dismissed.push(r);
      continue;
    } else if (r.decision === "assigned" && r.assigned_guest_id) {
      eff = { r, key: r.assigned_guest_id, name: nameOf(r.assigned_guest_id), by: "assigned" };
    } else if (r.decision === "new_guest" && r.new_guest_name) {
      eff = { r, key: `new:${r.id}`, name: r.new_guest_name, by: "new" };
    } else if (r.status === "matched" && r.matched_guest_id) {
      eff = { r, key: r.matched_guest_id, name: nameOf(r.matched_guest_id), by: "ai" };
    }
    if (!eff) {
      review.push(r);
      continue;
    }
    if (archivedIds.has(eff.key)) continue; // archived guests don't count
    latest.set(eff.key, eff);
    replyCount.set(eff.key, (replyCount.get(eff.key) ?? 0) + 1);
  }

  const byNewest = (a: { r: RsvpRow }, b: { r: RsvpRow }) => b.r.id - a.r.id;
  review.sort((a, b) => b.id - a.id);
  dismissed.sort((a, b) => b.id - a.id);
  const coming = [...latest.values()].filter((e) => e.r.attending).sort(byNewest);
  const declined = [...latest.values()].filter((e) => !e.r.attending).sort(byNewest);
  const headcount = coming.reduce((n, e) => n + e.r.party_size, 0);
  const noReply = guests.filter((g) => !latest.has(g.id));

  const repliedAs = (e: Eff) => (e.r.name.trim().toLowerCase() !== e.name.toLowerCase() ? e.r.name : null);
  const tagFor = (e: Eff) =>
    e.by === "new" ? "Added by you" : e.by === "assigned" ? "Confirmed by you" : null;
  const undo = (e: Eff) => (e.by === "ai" ? null : <UndoButton id={e.r.id} />);

  return (
    <AdminShell current="replies">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600">RSVP dashboard</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{event.name}</h1>
          <p className="text-sm text-zinc-600">
            {guests.length} invited · {rsvps.length} {rsvps.length === 1 ? "reply" : "replies"} received · as of{" "}
            {formatAbsolute(now)}
          </p>
        </header>

        {/* At-a-glance */}
        <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard
            emphasis
            label="People coming"
            value={headcount}
            hint="Total headcount incl. party sizes"
            className="col-span-2 lg:col-span-1"
          />
          <StatCard label="Confirmed RSVPs" value={coming.length} hint="Guests saying yes" />
          <StatCard label="Not replied yet" value={noReply.length} hint={`of ${guests.length} on the list`} />
          <StatCard label="Declined" value={declined.length} hint="Can't make it" />
          <StatCard
            label="Needs review"
            value={review.length}
            hint={review.length ? "Replies to check" : "All sorted"}
            tone={review.length ? "amber" : undefined}
          />
        </section>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <div className="min-w-0 space-y-10">
            {/* Coming */}
            <Section title="Coming" count={coming.length} description={`${headcount} people in total.`}>
              {coming.length === 0 ? (
                <Empty>No confirmed guests yet.</Empty>
              ) : (
                <List>
                  {coming.map((e) => (
                    <GuestRow
                      key={e.r.id}
                      name={e.name}
                      repliedAs={repliedAs(e)}
                      updated={(replyCount.get(e.key) ?? 0) > 1}
                      tag={tagFor(e)}
                      badge={<Badge tone="green">Coming</Badge>}
                      size={e.r.party_size}
                      createdAt={e.r.created_at}
                      now={now}
                      action={undo(e)}
                    />
                  ))}
                </List>
              )}
            </Section>
          </div>

          <div className="min-w-0 space-y-10">
            {/* Not replied */}
            <Section title="Not replied yet" count={noReply.length}>
              {noReply.length === 0 ? (
                <Empty>Everyone on the guest list has replied.</Empty>
              ) : (
                <List>
                  {noReply.map((g) => (
                    <li key={g.id} className="px-4 py-3">
                      <div className="font-semibold text-zinc-900">{g.name}</div>
                      {g.notes && <div className="mt-0.5 text-sm text-zinc-600">{g.notes}</div>}
                    </li>
                  ))}
                </List>
              )}
            </Section>

            {/* Declined */}
            <Section title="Declined" count={declined.length}>
              {declined.length === 0 ? (
                <Empty>No one has declined.</Empty>
              ) : (
                <List>
                  {declined.map((e) => (
                    <GuestRow
                      key={e.r.id}
                      name={e.name}
                      repliedAs={repliedAs(e)}
                      updated={(replyCount.get(e.key) ?? 0) > 1}
                      tag={tagFor(e)}
                      badge={<Badge tone="gray">Declined</Badge>}
                      createdAt={e.r.created_at}
                      now={now}
                      action={undo(e)}
                    />
                  ))}
                </List>
              )}
            </Section>
          </div>
        </div>

        {/* Needs review */}
        <Section
          title="Needs your review"
          count={review.length}
          description="The AI couldn't confidently match these replies to the guest list. Its guesses are suggestions only: you decide."
        >
          {review.length === 0 ? (
            <Empty>Nothing to review. Every reply was matched to the guest list.</Empty>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {review.map((r) => (
                <ReviewCard key={r.id} r={r} guess={nameOf(r.matched_guest_id)} now={now} guests={guests} />
              ))}
            </ul>
          )}
        </Section>

        {dismissed.length > 0 && (
          <details className="rounded-2xl bg-white ring-1 ring-zinc-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">
              Dismissed replies ({dismissed.length})
            </summary>
            <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
              {dismissed.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="break-words font-semibold text-zinc-900">{r.name}</div>
                    <div className="break-words text-sm text-zinc-600">&ldquo;{r.relation}&rdquo;</div>
                  </div>
                  <UndoButton id={r.id} label="Bring back" />
                </li>
              ))}
            </ul>
          </details>
        )}

        <footer className="border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          Times are shown in UTC. If a guest replied more than once, their latest matched reply counts. Your decisions on this page override the AI.
        </footer>
    </AdminShell>
  );
}

function GuestRow({
  name,
  repliedAs,
  updated,
  tag,
  badge,
  size,
  createdAt,
  now,
  action,
}: {
  name: string;
  repliedAs: string | null;
  updated: boolean;
  tag?: string | null;
  badge: ReactNode;
  size?: number;
  createdAt: string;
  now: Date;
  action?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-zinc-900">{name}</span>
          {updated && <Badge tone="blue">Updated reply</Badge>}
          {tag && <Badge tone="amber">{tag}</Badge>}
        </div>
        {repliedAs && (
          <div className="mt-0.5 break-words text-sm text-zinc-600">Replied as &ldquo;{repliedAs}&rdquo;</div>
        )}
        <div className="mt-0.5">
          <When createdAt={createdAt} now={now} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {size != null && <PartySize n={size} />}
        {badge}
        {action}
      </div>
    </li>
  );
}

function ReviewCard({ r, guess, now, guests }: { r: RsvpRow; guess: string; now: Date; guests: Guest[] }) {
  const isGuess = r.status === "review" && r.matched_guest_id;
  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="break-words font-semibold text-zinc-900">{r.name}</div>
          <When createdAt={r.created_at} now={now} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r.attending ? <PartySize n={r.party_size} /> : null}
          {r.attending ? <Badge tone="green">Says coming</Badge> : <Badge tone="gray">Says not coming</Badge>}
        </div>
      </div>

      <figure className="mt-3 border-l-4 border-zinc-300 pl-3">
        <figcaption className="text-xs font-semibold uppercase tracking-wide text-zinc-500">In their words</figcaption>
        <blockquote className="mt-0.5 break-words text-zinc-800">&ldquo;{r.relation}&rdquo;</blockquote>
      </figure>

      {isGuess ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="amber">Needs review</Badge>
              <span className="text-xs font-medium text-amber-900">AI suggestion</span>
            </div>
            <div className="mt-1 text-sm text-zinc-800">
              Possibly <span className="font-semibold text-zinc-900">{guess}</span>
            </div>
          </div>
          <Confidence value={r.confidence} />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-200">
          <Badge tone="red">Unmatched</Badge>
          <span className="text-sm text-zinc-800">No likely match on the guest list.</span>
        </div>
      )}

      <ReviewActions
        guests={guests}
        id={r.id}
        suggestedGuestId={isGuess ? r.matched_guest_id : null}
        repliedName={r.name}
      />
    </li>
  );
}
