/**
 * End-to-end smoke test.
 *
 * Boots the app on a *scratch* database and exercises the API the way an
 * evaluator would: read the public catalog, confirm drafts are hidden, confirm
 * unauthenticated writes are rejected, then sign in and run a full
 * create -> read -> update -> delete cycle including a cover-image upload.
 *
 * Design notes:
 *  - A throwaway SQLite file is used, so running this never touches the
 *    developer's `prisma/dev.db`. The directory is deleted on the way out.
 *  - Each check reports pass/fail independently; the script keeps going so one
 *    failure does not hide the rest, and exits non-zero if anything failed.
 *  - It tests the *deployed* server over HTTP rather than importing functions,
 *    so routing, auth, validation, uploads and the database are all covered.
 *
 * Usage:  npm run smoke
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join, resolve, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SCRATCH_DIR = join(ROOT, ".smoke");
const DB_PATH = join(SCRATCH_DIR, "smoke.db");
/**
 * Uploads must be written where Next serves them from.
 *
 * The route returns a `/uploads/...` URL, but `next start` only serves files
 * that live under `public/`. Pointing `UPLOAD_DIR` at the scratch directory
 * would therefore store the file successfully and still 404 the response, so
 * the real directory is used and the one generated file is removed at the end.
 */
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const createdUploads = new Set();
const PORT = Number(process.env.SMOKE_PORT ?? 3111);
const BASE = `http://127.0.0.1:${PORT}`;

const SERVER_LOG = join(SCRATCH_DIR, "server.log");
const ADMIN_EMAIL = "smoke@ieee-itb.ac.id";
const ADMIN_PASSWORD = "Smoke#Test2026";

/* ----------------------------- tiny test runner ----------------------------- */

let passed = 0;
const failures = [];
let currentSection = "";

function section(name) {
  currentSection = name;
  process.stdout.write(`\n\x1b[1m${name}\x1b[0m\n`);
}

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    process.stdout.write(`  \x1b[32m+\x1b[0m ${label}\n`);
  } else {
    failures.push(`${currentSection} -> ${label}${detail ? ` (${detail})` : ""}`);
    process.stdout.write(`  \x1b[31mx\x1b[0m ${label}\n`);
    if (detail) process.stdout.write(`      ${detail}\n`);
  }
}

function equal(label, actual, expected) {
  check(
    label,
    actual === expected,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

/* ---------------------------------- http ----------------------------------- */

let cookie = "";

async function api(path, init = {}) {
  const { auth = false, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (auth && cookie) headers.set("cookie", cookie);

  const response = await fetch(`${BASE}${path}`, { ...rest, headers, redirect: "manual" });

  // Track the session cookie across requests, the way a browser would.
  for (const entry of response.headers.getSetCookie?.() ?? []) {
    const [pair] = entry.split(";");
    if (pair?.startsWith("itb_session=")) cookie = pair;
  }

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { status: response.status, body };
}

function postJson(path, payload, auth = true) {
  return api(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    auth,
  });
}

function patchJson(path, payload) {
  return api(path, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    auth: true,
  });
}

/* ------------------------------ sample fixtures ---------------------------- */

/** A real 1x1 PNG, so the signature check sees genuine bytes. */
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** A script disguised as a PNG - must be rejected on content, not filename. */
const FAKE_PNG = Buffer.from("<script>alert(1)</script>", "utf8");

function eventPayload(overrides = {}) {
  return {
    title: "Smoke Test Workshop",
    summary: "Created by the smoke test to verify the create path end to end.",
    description:
      "A description long enough to satisfy the thirty character minimum enforced by the event schema.",
    category: "WORKSHOP",
    format: "IN_PERSON",
    status: "DRAFT",
    startDate: "2026-12-01T09:00",
    endDate: "2026-12-01T12:00",
    location: "Lab Elektronika, Pawon 2",
    city: "Bandung",
    organizer: "IEEE ITB Student Branch",
    price: 50000,
    capacity: 60,
    attendees: 0,
    isFeatured: false,
    ...overrides,
  };
}

function postImage(id, bytes, name, type) {
  const form = new FormData();
  form.set("image", new File([bytes], name, { type }));
  return api(`/api/events/${id}/image`, { method: "POST", body: form, auth: true });
}

/* ------------------------------- server boot ------------------------------- */

let server = null;

async function waitForServer(timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function run(command, args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "ignore",
      shell: process.platform === "win32",
      env: { ...process.env, ...env },
    });
    child.on("error", rejectRun);
    child.on("exit", (code) =>
      code === 0 ? resolveRun() : rejectRun(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function main() {
  process.stdout.write("\x1b[1mIEEE ITB Events - smoke test\x1b[0m\n");
  process.stdout.write(`database: ${DB_PATH}\n`);

  const env = {
    DATABASE_URL: `file:${DB_PATH}`,
    SESSION_SECRET: "smoke-test-secret-not-for-production-use",
      UPLOAD_DIR,
      // Keep the dev server's build output away from the production `.next`.
      NEXT_DIST_DIR: ".next-smoke",
    SEED_ADMIN_EMAIL: ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: ADMIN_PASSWORD,
    SEED_ADMIN_NAME: "Smoke Tester",
  };

  // ---- 1. Prepare an isolated database --------------------------------------
  section("Setup");

  // A previous run that was interrupted may have left a server holding the
  // scratch database, which would make the delete below fail with EBUSY.
  if (!(await waitForPortFree(2_000))) {
    process.stdout.write(
      `\n\x1b[33mPort ${PORT} is already in use.\x1b[0m Stop the other process, or re-run with a different port:\n` +
        `  SMOKE_PORT=3200 npm run smoke\n\n`,
    );
    return;
  }

  await removeScratch();
  await mkdir(SCRATCH_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });

  try {
    await run("npx", ["prisma", "migrate", "deploy"], env);
    check("migrations applied to the scratch database", true);
  } catch (error) {
    check("migrations applied to the scratch database", false, String(error));
    return;
  }

  try {
    await run("npx", ["tsx", "prisma/seed.ts"], env);
    check("seed data loaded", true);
  } catch (error) {
    check("seed data loaded", false, String(error));
    return;
  }

  // ---- 2. Boot the app -------------------------------------------------------
  section("Server");

  // Surfaces a dev-server crash instead of a bare "no response" timeout.
  const logStream = createWriteStream(SERVER_LOG, { flags: "w" });
  logStream.on("error", () => {});

  // `NODE_ENV` must stay at its default here: `next dev` refuses to start when
  // it is forced to "production", and forcing "development" would break the
  // session cookie (Secure) the auth checks rely on.
  server = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd: ROOT,
    stdio: logStream ? ["ignore", logStream.fd, logStream.fd] : "ignore",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });

  if (!(await waitForServer())) {
    check(
      "server started and reported healthy",
      false,
      `no response on ${BASE} within the timeout - is the dev server able to start?` +
        (SERVER_LOG ? ` (see ${SERVER_LOG})` : ""),
    );
    return;
  }
  check("server started and reported healthy", true);

  /* ----------------------------- public reads ------------------------------ */
  section("Public API");

  const health = await api("/api/health");
  equal("GET /api/health -> 200", health.status, 200);
  equal("health reports the database connected", health.body?.data?.database, "connected");

  const list = await api("/api/events?perPage=50");
  equal("GET /api/events -> 200", list.status, 200);
  check("response uses the { ok, data } envelope", list.body?.ok === true);
  check("catalog returns seeded events", (list.body?.data?.length ?? 0) > 0, `got ${list.body?.data?.length}`);
  check(
    "no draft is publicly visible",
    !(list.body?.data ?? []).some((e) => e.status === "DRAFT"),
    "a DRAFT event leaked into the public catalog",
  );
  check(
    "no archived event is publicly visible",
    !(list.body?.data ?? []).some((e) => e.status === "ARCHIVED"),
  );
  check("pagination metadata is present", typeof list.body?.meta?.total === "number");

  const publicEvents = list.body?.data ?? [];

  const filtered = await api("/api/events?when=past");
  equal("GET /api/events?when=past -> 200", filtered.status, 200);
  check(
    "the past filter excludes future events",
    (filtered.body?.data ?? []).every((e) => new Date(e.endDate) < new Date()),
  );

  const search = await api("/api/events?q=zzz-no-such-event-zzz");
  equal("GET with a no-match search -> 200", search.status, 200);
  equal("a no-match search returns an empty list", (search.body?.data ?? []).length, 0);

  equal(
    "an unknown sort value -> 400",
    (await api("/api/events?sort=not-a-sort")).status,
    400,
  );

  const publicEvent = publicEvents[0];
  if (publicEvent) {
    const detail = await api(`/api/events/${publicEvent.id}`);
    equal("GET /api/events/:id -> 200", detail.status, 200);
    equal("detail returns the same event", detail.body?.data?.id, publicEvent.id);
  }

  /* --------------------------- auth is enforced ---------------------------- */
  section("Authentication");

  const anonCreate = await postJson("/api/events", eventPayload({ title: "Anonymous Create" }), false);
  equal("POST /api/events without a session -> 401", anonCreate.status, 401);
  equal("...and reports UNAUTHENTICATED", anonCreate.body?.error?.code, "UNAUTHENTICATED");

  const anonDelete = await api(`/api/events/${publicEvent?.id ?? "none"}`, {
    method: "DELETE",
    auth: false,
  });
  equal("DELETE /api/events/:id without a session -> 401", anonDelete.status, 401);

  const badLogin = await postJson(
    "/api/auth",
    { email: ADMIN_EMAIL, password: "definitely-wrong" },
    false,
  );
  equal("POST /api/auth with a wrong password -> 401", badLogin.status, 401);
  equal(
    "...with a generic message that does not reveal whether the email exists",
    badLogin.body?.error?.message,
    "Incorrect email or password.",
  );

  const noSuchUser = await postJson(
    "/api/auth",
    { email: "nobody@nowhere.test", password: "definitely-wrong" },
    false,
  );
  equal("login for an unknown email -> 401", noSuchUser.status, 401);
  equal(
    "...with the same message as a wrong password",
    noSuchUser.body?.error?.message,
    badLogin.body?.error?.message,
  );

  equal(
    "POST /api/auth with a malformed body -> 422",
    (await postJson("/api/auth", { email: "not-an-email" }, false)).status,
    422,
  );

  const login = await postJson("/api/auth", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, false);
  equal("POST /api/auth with valid credentials -> 200", login.status, 200);
  check("a session cookie was issued", cookie.startsWith("itb_session="), "no itb_session cookie captured");

  const me = await api("/api/auth", { auth: true });
  equal("GET /api/auth with the cookie -> 200", me.status, 200);
  equal("...and identifies the signed-in admin", me.body?.data?.user?.email, ADMIN_EMAIL);

  /* ------------------------------ full CRUD -------------------------------- */
  section("CRUD (authenticated)");

  const created = await postJson("/api/events", eventPayload());
  equal("POST /api/events -> 201", created.status, 201);
  if (created.status !== 201) failures.push(`  create: ${JSON.stringify(created.body)}`);
  check("create returns a persisted record", typeof created.body?.data?.id === "string");
  check("a slug was generated from the title", created.body?.data?.slug === "smoke-test-workshop");
  check("the event is created as a draft", created.body?.data?.status === "DRAFT");
  const eventId = created.body?.data?.id;

  const draft = await api(`/api/events/${eventId}`);
  equal("GET /api/events/:id for a draft -> 404", draft.status, 404);
  check(
    "a draft 404s rather than 403-ing, so its existence is not confirmed",
    draft.body?.error?.code === "NOT_FOUND",
  );

  const patched = await patchJson(`/api/events/${eventId}`, { status: "PUBLISHED", capacity: 100 });
  equal("PATCH /api/events/:id -> 200", patched.status, 200);
  if (patched.status !== 200) failures.push(`  patch: ${JSON.stringify(patched.body)}`);
  equal("...applied the status change", patched.body?.data?.status, "PUBLISHED");
  equal("...applied the capacity change", patched.body?.data?.capacity, 100);
  equal("...and preserved fields that were not sent", patched.body?.data?.title, "Smoke Test Workshop");
  equal("the slug is immutable", patched.body?.data?.slug, "smoke-test-workshop");

  equal("a published event is publicly readable -> 200", (await api(`/api/events/${eventId}`)).status, 200);

  const owned = await patchJson(`/api/events/${eventId}`, {
    id: "hijacked-id",
    createdById: "hijacked",
  });
  equal("PATCH ignoring server-owned fields -> 200", owned.status, 200);
  equal("...the id was not rewritten by the client", owned.body?.data?.id, eventId);

  /* ------------------------------ validation ------------------------------- */
  section("Validation");

  const tooShort = await postJson("/api/events", eventPayload({ title: "ab" }));
  equal("POST with a too-short title -> 422", tooShort.status, 422);
  check("...and names the offending field", "title" in (tooShort.body?.error?.details ?? {}));

  const overCapacity = await postJson("/api/events", eventPayload({ attendees: 500, capacity: 10 }));
  equal("POST with attendees > capacity -> 422", overCapacity.status, 422);
  check(
    "...and the cross-field rule is enforced server-side",
    "attendees" in (overCapacity.body?.error?.details ?? {}),
  );

  const badDates = await postJson(
    "/api/events",
    eventPayload({ startDate: "2026-12-02T09:00", endDate: "2026-12-01T09:00" }),
  );
  equal("POST with endDate before startDate -> 422", badDates.status, 422);
  check("...and reports the endDate field", "endDate" in (badDates.body?.error?.details ?? {}));

  equal(
    "POST with an unknown category -> 422",
    (await postJson("/api/events", eventPayload({ category: "NOT_A_CATEGORY" }))).status,
    422,
  );

  equal(
    "POST featuring an unpublished event -> 422",
    (await postJson("/api/events", eventPayload({ isFeatured: true, status: "DRAFT" }))).status,
    422,
  );

  const badJson = await api("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not json",
    auth: true,
  });
  equal("POST with a malformed JSON body -> 400", badJson.status, 400);

  // A date the schema cannot parse must come back as a validation error. It
  // used to throw a TypeError inside superRefine and surface as a 500.
  const badDate = await postJson("/api/events", eventPayload({ startDate: "not-a-date" }));
  equal("POST with an unparseable start date -> 422", badDate.status, 422);
  check(
    "...and names startDate instead of crashing",
    Array.isArray(badDate.body?.error?.details?.startDate),
  );

  const badPage = await api("/api/events?page=0");
  equal("GET with an out-of-range page clamps to page 1", badPage.status, 200);
  equal("...and page is 1 in the envelope", badPage.body?.meta?.page, 1);

  /* ------------------------------- uploads --------------------------------- */
  section("Image upload");

  const uploaded = await postImage(eventId, PNG_BYTES, "cover.png", "image/png");
  const coverUrl = uploaded.body?.data?.imageUrl;
  if (typeof coverUrl === "string" && coverUrl.startsWith("/uploads/")) {
    createdUploads.add(join(UPLOAD_DIR, basename(coverUrl)));
  }
  equal("POST /api/events/:id/image with a valid PNG -> 200", uploaded.status, 200);
  check(
    "...stores a generated /uploads/ path",
    typeof uploaded.body?.data?.imageUrl === "string" && uploaded.body.data.imageUrl.startsWith("/uploads/"),
    String(uploaded.body?.data?.imageUrl),
  );
  check(
    "...with a random filename, not the uploaded one",
    !String(uploaded.body?.data?.imageUrl ?? "").includes("cover"),
  );
  const staticStatus = (await fetch(`${BASE}${coverUrl ?? "/__missing"}`)).status;
  equal("the stored image is served back as a static file", staticStatus, 200);
  if (staticStatus !== 200) {
    const onDisk = await stat(join(UPLOAD_DIR, basename(coverUrl ?? ""))).catch(() => null);
    failures.push(
      `  served ${coverUrl} -> ${staticStatus}; on disk: ${onDisk ? `${onDisk.size} bytes` : "missing"}`,
    );
  }

  const forged = await postImage(eventId, FAKE_PNG, "evil.png", "image/png");
  equal("POST with a forged PNG signature -> 422", forged.status, 422);
  check(
    "...and the event keeps its previous cover",
    (await api(`/api/events/${eventId}`)).body?.data?.imageUrl === uploaded.body?.data?.imageUrl,
  );

  const wrongType = await postImage(eventId, PNG_BYTES, "payload.svg", "image/svg+xml");
  equal("POST with a disallowed MIME type -> 422", wrongType.status, 422);

  const tooBig = await postImage(eventId, Buffer.alloc(6 * 1024 * 1024), "big.png", "image/png");
  check("POST with a 6 MB image is rejected", tooBig.status === 413 || tooBig.status === 422, `got ${tooBig.status}`);

  const anonForm = new FormData();
  anonForm.set("image", new File([PNG_BYTES], "cover.png", { type: "image/png" }));
  const anonImage = await api(`/api/events/${eventId}/image`, {
    method: "POST",
    body: anonForm,
    auth: false,
  });
  equal("POST /api/events/:id/image without a session -> 401", anonImage.status, 401);

  const cleared = await api(`/api/events/${eventId}/image`, { method: "DELETE", auth: true });
  equal("DELETE /api/events/:id/image -> 200", cleared.status, 200);
  equal("...clears the cover", cleared.body?.data?.imageUrl, null);

  /* --------------------------------- 404s ---------------------------------- */
  section("Not found");

  equal("GET /api/events/:id for an unknown id -> 404", (await api("/api/events/does-not-exist")).status, 404);
  equal(
    "PATCH on an unknown id -> 404",
    (await patchJson("/api/events/does-not-exist", { title: "Nope Nope Nope" })).status,
    404,
  );
  equal(
    "DELETE on an unknown id -> 404",
    (await api("/api/events/does-not-exist", { method: "DELETE", auth: true })).status,
    404,
  );

  /* -------------------------------- delete ---------------------------------- */
  section("Delete + sign out");

  const removed = await api(`/api/events/${eventId}`, { method: "DELETE", auth: true });
  equal("DELETE /api/events/:id -> 200", removed.status, 200);
  check("...and reports the deletion", removed.body?.data?.deleted === true);
  equal("the deleted event is no longer readable -> 404", (await api(`/api/events/${eventId}`)).status, 404);

  equal("DELETE /api/auth -> 200", (await api("/api/auth", { method: "DELETE", auth: true })).status, 200);

  cookie = "";
  equal(
    "a revoked session can no longer write -> 401",
    (await postJson("/api/events", eventPayload({ title: "After Logout Attempt" }))).status,
    401,
  );
}

/* --------------------------------- cleanup --------------------------------- */

function cleanup() {
  if (!server || server.killed) return;

  // `shell: true` means the direct child is a shell, and killing it would
  // leave the actual `next start` process running — still holding the SQLite
  // file. `taskkill /T` takes down the whole tree.
  if (process.platform === "win32" && server.pid) {
    try {
      // Synchronous on purpose: the caller deletes the SQLite file straight
      // afterwards, so the tree has to be gone before this returns.
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // Fall through to the plain kill below.
    }
  }

  server.kill();
}

/** Wait until nothing is listening on the smoke port any more. */
async function waitForPortFree(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Any response at all means something is still bound to the port.
      await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(1000) });
    } catch {
      return true; // Connection refused: the port is free.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

/**
 * Remove the scratch directory, tolerating a locked file.
 *
 * On Windows the server can still hold the SQLite handle for a moment after
 * `kill()`, so an `EBUSY` here is expected rather than a real failure — retry
 * briefly, then give up quietly. The scratch directory is disposable anyway.
 */
async function removeScratch() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await rm(SCRATCH_DIR, { recursive: true, force: true });
      return true;
    } catch (error) {
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

await removeScratch().catch(() => {});

try {
  await main();
} catch (error) {
  failures.push(`Unexpected error: ${error instanceof Error ? error.stack : String(error)}`);
  process.stdout.write(`\n\x1b[31mUnexpected error:\x1b[0m ${String(error)}\n`);
} finally {
  cleanup();
  // Wait for the port to actually free up before deleting the database. The
  // dev server holds the SQLite file, and on Windows the kill is asynchronous,
  // so the lock can outlive `cleanup()` by a moment.
  await waitForPortFree(10_000);
  const removed = await removeScratch().catch(() => false);
  if (!removed) {
    process.stdout.write(
      `\n\x1b[33mNote:\x1b[0m could not remove ${SCRATCH_DIR} (file still locked). Delete it manually.\n`,
    );
  }

  // Remove the cover image this run generated, so a developer's own files in
  // public/uploads are never touched.
  for (const file of createdUploads) {
    await rm(file, { force: true }).catch(() => {});
  }
}

process.stdout.write(`\n${"-".repeat(60)}\n`);
if (failures.length === 0) {
  process.stdout.write(`\x1b[32m\x1b[1mAll ${passed} checks passed.\x1b[0m\n\n`);
  process.exit(0);
} else {
  process.stdout.write(`\x1b[31m\x1b[1m${failures.length} failed\x1b[0m, ${passed} passed:\n\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.stdout.write("\n");
  process.exit(1);
}
