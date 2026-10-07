export const metadata = { title: "Admin login", robots: { index: false } };

export default async function Login(props: PageProps<"/admin/login">) {
  const { error } = await props.searchParams;
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 font-sans text-zinc-900">
      <main className="w-full max-w-sm">
        <div aria-hidden className="mb-6 h-1.5 rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400" />
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">RSVP dashboard</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Host login</h1>
        <form action="/admin/login/submit" method="post" className="mt-6 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-zinc-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              className="block min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200">
              That password isn&apos;t right. Try again.
            </p>
          )}
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700">
            Log in
          </button>
        </form>
      </main>
    </div>
  );
}
