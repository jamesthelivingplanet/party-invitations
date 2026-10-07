import { createClient } from "@libsql/client";

/** A fresh, empty, in-memory SQLite database for one test. */
export function testDb() {
  return createClient({ url: ":memory:" });
}
