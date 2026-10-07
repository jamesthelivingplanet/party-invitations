import { requireAdminPage } from "@/lib/admin-auth";
import { replyDeadlineDate } from "@/lib/event";
import { formatDate } from "@/lib/party";
import { eventStore } from "@/lib/stores";
import { AdminShell } from "../shell";
import { Section } from "../ui";
import { saveEventSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Event settings", robots: { index: false } };

const label = "mb-1.5 block text-sm font-semibold text-zinc-800";
const hint = "mt-1.5 text-xs leading-relaxed text-zinc-500";
const field =
  "block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 sm:text-sm";

export default async function Settings(props: PageProps<"/admin/settings">) {
  await requireAdminPage();
  const { error, saved } = await props.searchParams;
  const event = await eventStore.get();
  const deadline = replyDeadlineDate(event);

  return (
    <AdminShell current="settings">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">Event</p>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Event settings</h1>
        <p className="text-sm text-zinc-600">These details appear on the invitation page and in invitations.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          Saved. The invitation page now shows these details.
        </p>
      )}

      <Section title="Details">
        <form action={saveEventSettings} className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={label}>Event name</label>
            <input id="name" name="name" defaultValue={event.name} required maxLength={100} className={field} />
          </div>
          <div>
            <label htmlFor="date" className={label}>Date</label>
            <input id="date" name="date" type="date" defaultValue={event.date} required className={field} />
          </div>
          <div>
            <label htmlFor="time" className={label}>Time</label>
            <input id="time" name="time" defaultValue={event.time ?? ""} maxLength={200} className={field} placeholder="e.g. 2:00 PM - 5:00 PM" />
            <p className={hint}>Leave empty until it&apos;s decided; guests see &ldquo;To be announced&rdquo;.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="place" className={label}>Place</label>
            <input id="place" name="place" defaultValue={event.place ?? ""} maxLength={200} className={field} placeholder="e.g. 123 Main St, Springfield" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="days" className={label}>Reply deadline</label>
            <div className="flex items-center gap-3">
              <input
                id="days"
                name="replyDeadlineDays"
                type="number"
                min={0}
                max={365}
                step={1}
                inputMode="numeric"
                defaultValue={event.replyDeadlineDays ?? ""}
                className={`${field} max-w-28`}
              />
              <span className="text-sm text-zinc-700">days before the event</span>
            </div>
            <p className={hint}>
              {deadline
                ? `Replies close on ${formatDate(deadline, "en")}.`
                : "Leave empty to keep replies open. Guests see this date as “RSVP by”."}
            </p>
          </div>
          <div className="sm:col-span-2">
            <button className="inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700">
              Save settings
            </button>
          </div>
        </form>
      </Section>
    </AdminShell>
  );
}
