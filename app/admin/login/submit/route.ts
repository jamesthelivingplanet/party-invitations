import { createLoginHandler } from "@/lib/admin-login";

export async function POST(request: Request) {
  return createLoginHandler({ password: process.env.ADMIN_PASSWORD ?? "", now: Date.now })(request);
}
