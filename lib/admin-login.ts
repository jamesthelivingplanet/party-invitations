import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "./admin-session";

export function createLoginHandler(opts: { password: string; now: () => number }) {
  return async function login(request: Request): Promise<Response> {
    const form = await request.formData().catch(() => null);
    const given = String(form?.get("password") ?? "");

    if (!passwordMatches(given, opts.password)) {
      return new Response(null, {
        status: 303,
        headers: { Location: new URL("/admin/login?error=1", request.url).toString() },
      });
    }

    const token = createSessionToken(opts.password, opts.now());
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL("/admin", request.url).toString(),
        "Set-Cookie": `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
      },
    });
  };
}
