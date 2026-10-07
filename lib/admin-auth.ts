import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./admin-session";

export async function isAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, process.env.ADMIN_PASSWORD ?? "", Date.now());
}

/** For admin pages: send visitors who are not logged in to the login screen. */
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** For server actions, which can be called directly: refuse unless logged in. */
export async function requireAdminAction() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
