import { requireAdminPage } from "@/lib/admin-auth";
import type { Guest } from "@/lib/guests";
import { guestStore } from "@/lib/stores";
import { Badge, Empty, List, Section } from "../ui";
import { AdminShell } from "../shell";
import { CopyLinkButton } from "./copy-link-button";
import { addGuest, archiveGuest, restoreGuest, updateGuest } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guests", robots: { index: false } };

const label = "mb-1.5 block text-sm font-semibold text-zinc-800";
const field =
  "block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 sm:text-sm";
const primary =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700";
const secondary =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50";

export default async function Guests(props: PageProps<"/admin/guests">) {
  await requireAdminPage();
  const { error } = await props.searchParams;
  const all = await guestStore.list({ includeArchived: true });
  const active = all.filter((g) => !g.archived);
  const archived = all.filter((g) => g.archived);

  return (
    <AdminShell current="guests">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Guest list</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Guests</h1>
        <p className="text-sm text-zinc-600">
          {active.length} {active.length === 1 ? "guest" : "guests"} on the list. The language decides which version of
          the invitation they get.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}

      <Section title="Add a guest">
        <form action={addGuest} className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2">
          <div>
            <label htmlFor="new-name" className={label}>Name</label>
            <input id="new-name" name="name" required maxLength={100} autoComplete="off" className={field} placeholder="e.g. Sarah Johnson" />
          </div>
          <div>
            <label htmlFor="new-language" className={label}>Language</label>
            <select id="new-language" name="language" defaultValue="en" className={field}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="new-notes" className={label}>Notes <span className="font-normal text-zinc-500">(helps match replies, e.g. nicknames, parents)</span></label>
            <textarea id="new-notes" name="notes" rows={2} maxLength={500} className={field} placeholder="e.g. Alex's classmate, goes by Mikey. Parents: Sarah and Tom" />
          </div>
          <div className="sm:col-span-2">
            <button className={primary}>Add guest</button>
          </div>
        </form>
      </Section>

      <Section title="On the list" count={active.length}>
        {active.length === 0 ? (
          <Empty>No guests yet. Add the first one above.</Empty>
        ) : (
          <List>
            {active.map((g) => (
              <GuestRow key={g.id} guest={g} />
            ))}
          </List>
        )}
      </Section>

      {archived.length > 0 && (
        <details className="rounded-2xl bg-white ring-1 ring-zinc-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-700">
            Archived guests ({archived.length})
          </summary>
          <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
            {archived.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="break-words font-semibold text-zinc-900">{g.name}</div>
                  <div className="text-sm text-zinc-500">Not counted while archived. Their replies are kept.</div>
                </div>
                <form action={restoreGuest}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className={secondary}>Restore</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </AdminShell>
  );
}

function GuestRow({ guest }: { guest: Guest }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-900">{guest.name}</span>
            <Badge tone={guest.language === "es" ? "amber" : "blue"}>
              {guest.language === "es" ? "Spanish" : "English"}
            </Badge>
          </div>
          {guest.notes && <div className="mt-0.5 break-words text-sm text-zinc-600">{guest.notes}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end">
        <CopyLinkButton code={guest.personalLinkCode} />
        <form action={archiveGuest}>
          <input type="hidden" name="id" value={guest.id} />
          <button className="rounded-md px-1.5 py-1 text-sm font-semibold text-zinc-500 hover:text-rose-700 hover:underline">
            Archive
          </button>
        </form>
        </div>
      </div>
      <details className="group mt-2">
        <summary className="inline-flex cursor-pointer list-none items-center text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
          Edit
        </summary>
        <form action={updateGuest} className="mt-3 grid gap-4 rounded-xl bg-zinc-50 p-4 ring-1 ring-inset ring-zinc-200 sm:grid-cols-2">
          <input type="hidden" name="id" value={guest.id} />
          <div>
            <label htmlFor={`n-${guest.id}`} className={label}>Name</label>
            <input id={`n-${guest.id}`} name="name" defaultValue={guest.name} required maxLength={100} className={field} />
          </div>
          <div>
            <label htmlFor={`l-${guest.id}`} className={label}>Language</label>
            <select id={`l-${guest.id}`} name="language" defaultValue={guest.language} className={field}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`t-${guest.id}`} className={label}>Notes</label>
            <textarea id={`t-${guest.id}`} name="notes" defaultValue={guest.notes} rows={2} maxLength={500} className={field} />
          </div>
          <div className="sm:col-span-2">
            <button className={primary}>Save changes</button>
          </div>
        </form>
      </details>
    </li>
  );
}
