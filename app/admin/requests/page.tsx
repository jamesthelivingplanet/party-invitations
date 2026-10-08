import { requireAdminPage } from "@/lib/admin-auth";
import { replyStore } from "@/lib/stores";
import { AdminShell } from "../shell";
import { Badge, Empty, List, PartySize, Section, When } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Requests", robots: { index: false } };

const sourceLabel = { shared: "Shared link", personal_forward: "Forwarded Personal link" } as const;

export default async function Requests() {
  await requireAdminPage();
  const requests = await replyStore.listRequests();
  const now = new Date();

  return (
    <AdminShell current="requests">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Requests</h1>
        <p className="text-sm text-zinc-600">
          People who are not on the guest list and left their details. They are not counted in the headcount.
        </p>
      </header>
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
                </li>
              );
            })}
          </List>
        )}
      </Section>
    </AdminShell>
  );
}
