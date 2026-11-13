import { requireAdminPage } from "@/lib/admin-auth";
import { guestStore, replyStore } from "@/lib/stores";
import { ActionForm } from "../action-form";
import { AdminShell } from "../shell";
import { decideRequest } from "./actions";
import { Badge, Empty, List, PartySize, Section, When } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Requests", robots: { index: false } };

const sourceLabel = { shared: "Shared link", personal_forward: "Forwarded Personal link" } as const;

export default async function Requests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  await requireAdminPage();
  const [requests, guests] = await Promise.all([replyStore.listRequests(), guestStore.list()]);
  const now = new Date();
  const unlinked = guests.filter((g) => !g.partnerId);

  return (
    <AdminShell current="requests">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Requests</h1>
        <p className="text-sm text-zinc-600">
          People who are not on the guest list and left their details. They are not counted in the headcount.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      )}
      <Section title="Requests" count={requests.length}>
        {requests.length === 0 ? (
          <Empty>No requests yet.</Empty>
        ) : (
          <List>
            {requests.map((r) => {
              const contacts = (
                [
                  ["Phone", r.contacts.phone],
                  ["Email", r.contacts.email],
                  ["WhatsApp", r.contacts.whatsapp],
                  ["Messenger", r.contacts.messenger],
                  ["Other", r.contacts.other],
                ] as const
              ).filter(([, v]) => v);
              return (
                <li key={r.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="break-words font-semibold text-zinc-900">{r.name}</span>
                    {r.attending === true && <Badge tone="green">Says coming</Badge>}
                    {r.attending === false && <Badge tone="gray">Says not coming</Badge>}
                    {r.attending && <PartySize n={r.partySize} />}
                    <Badge tone="blue">{sourceLabel[r.source]}</Badge>
                  </div>
                  {(r.guess || r.jevUnavailable) && (
                    <p className="text-sm text-zinc-700">
                      {r.jevUnavailable ? (
                        <Badge tone="amber">Jev unavailable</Badge>
                      ) : (
                        r.guess && (
                          <>
                            Possibly <span className="font-semibold text-zinc-900">{r.guess.guestName}</span>,{" "}
                            {Math.round(r.guess.confidence * 100)}%
                          </>
                        )
                      )}
                    </p>
                  )}
                  {r.companions.length > 0 && (
                    <ul aria-label="Companions" className="text-sm text-zinc-600">
                      {r.companions.map((c, i) => (
                        <li key={i}>
                          {c.name} · {c.kind}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.ownWords && <p className="break-words text-sm text-zinc-700">&ldquo;{r.ownWords}&rdquo;</p>}
                  <dl className="grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[auto_1fr]">
                    {contacts.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="font-semibold text-zinc-600">{k}</dt>
                        <dd className="break-words text-zinc-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <When createdAt={r.createdAt} now={now} />
                  <div className="grid gap-2 pt-1 sm:grid-cols-2">
                    <ActionForm
                      id={r.id}
                      intent="existing"
                      label="This is an existing Guest"
                      variant="secondary"
                      guestNames={{}}
                      action={decideRequest}
                      className="sm:col-span-2"
                      confirm={{
                        text: "Give this reply to the chosen guest?",
                        detail: "Their answer, party size and companions become that guest's reply, and the request is removed. This cannot be undone.",
                      }}
                    >
                      <label htmlFor={`eg-${r.id}`} className="mb-1.5 block text-sm font-semibold text-zinc-800">
                        Which guest is this?
                      </label>
                      <select
                        id={`eg-${r.id}`}
                        name="guest_id"
                        defaultValue={r.guess?.guestId && guests.some((g) => g.id === r.guess?.guestId) ? r.guess.guestId : ""}
                        required
                        className="block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm sm:text-sm"
                      >
                        <option value="" disabled>
                          Choose a guest…
                        </option>
                        {guests.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </ActionForm>
                    <ActionForm
                      id={r.id}
                      intent="accept"
                      label="Add as new guest"
                      variant="primary"
                      guestNames={{}}
                      action={decideRequest}
                      confirm={{
                        text: "Add this person as a new guest?",
                        detail: "They'll get a Personal link and any answer they gave will be counted in your headcount.",
                      }}
                    >
                      <label htmlFor={`rn-${r.id}`} className="mb-1.5 block text-sm font-semibold text-zinc-800">
                        Name
                      </label>
                      <input
                        id={`rn-${r.id}`}
                        name="name"
                        defaultValue={r.name}
                        required
                        maxLength={200}
                        className="mb-3 block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm sm:text-sm"
                      />
                      <label htmlFor={`rp-${r.id}`} className="mb-1.5 block text-sm font-semibold text-zinc-800">
                        Partner <span className="font-normal text-zinc-500">(optional, also a guest with their own link)</span>
                      </label>
                      <select
                        id={`rp-${r.id}`}
                        name="partner_id"
                        defaultValue=""
                        className="mb-3 block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm sm:text-sm"
                      >
                        <option value="">No partner</option>
                        {unlinked.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <label className="mb-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-800">
                        <input type="checkbox" name="has_children" className="size-5" />
                        Has children
                      </label>
                      <label htmlFor={`rl-${r.id}`} className="mb-1.5 block text-sm font-semibold text-zinc-800">
                        Language for their invitation
                      </label>
                      <select
                        id={`rl-${r.id}`}
                        name="language"
                        defaultValue="en"
                        className="block min-h-11 w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm sm:text-sm"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </ActionForm>
                    <ActionForm
                      id={r.id}
                      intent="decline"
                      label="Decline request"
                      variant="danger"
                      guestNames={{}}
                      action={decideRequest}
                      confirm={{
                        text: `Decline ${r.name}'s request?`,
                        detail: "The request is removed and nothing is counted. This cannot be undone.",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </List>
        )}
      </Section>
    </AdminShell>
  );
}
