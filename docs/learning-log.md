# Learning log

One short section per build step: what we built, why, and the one thing most likely to break.

<!-- Claude: append "## Step X.Y — <name>" at the end of each step. -->

---

## 0.4 — the admin console, and why the browser never calls the backend

Next 16 on port 3001, TanStack Query, and a sign-in that actually works:
`http://localhost:3001/login`, email and password, scan the key, enter the
code, land on a dashboard, sign out.

**The browser talks to this app; this app talks to the backend.** Every request
goes through `src/app/api/[...path]/route.ts`, which forwards server-side.

The reason is cookies, not tidiness. This app on Vercel and the backend on
Railway are **cross-site**, so a `Set-Cookie` from the API origin is a
third-party cookie — already blocked by Safari's ITP and being phased out by
Chrome. Login would **fail silently** for a large share of users with nothing
in the logs. Proxying makes the session first-party. Verified: the cookie
survives the hop with `HttpOnly` and `SameSite=Strict` intact, and `/me`
through the proxy returns the signed-in admin.

Two things the proxy has to get right, both of which look like details and are
not:

- **`x-forwarded-for` is passed through.** Without it every audit row and every
  rate-limit bucket says "the Next app" — the IP column becomes useless and the
  limiter becomes global rather than per-user.
- **An unreachable backend is a 502, not a 500.** This app is fine; the thing
  behind it is not, and the distinction is what tells you where to look.

**The thing most likely to break:** `Socket.io cannot come through here.** A
WebSocket upgrade is not something a route handler can forward, so it connects
to the backend directly — and therefore **cannot use this cookie**, because the
cookie is first-party to *this* origin. That is why the socket uses a ticket
(`DECISIONS.md` I22), and it is also what closed that open `TODO(human)`.

### Lint found a hole in the API contract

`if (error)` in the auth hooks reported **"value is always falsy"**. The cause
was real: `errors.ts` declared the error envelope in zod for the *runtime*, but
no `@ApiResponse` named it in the spec — so `openapi-typescript` generated a
client whose `error` was `never`. Every error check in every hook was dead code
the compiler believed unreachable, and a failed request would have fallen
through to "success with no data".

Fixed in the backend with `ApiErrorDto` and an `@ApiErrors(400, 401)`
decorator, then `bun run api:gen` in both front-ends. The spec now declares
`400`, `401` and `503` where they apply, and the hooks narrow properly.

Worth remembering: **a spec that documents only the happy path is not
complete**, and nothing notices until something tries to consume it.

---

## 1.2 (admin UI) — access controls you can review before applying

Added a shared protected console shell and `/users`, connected to generated API
types through the existing proxy. The screen has server-side pagination, status
filters, timestamp sort, loading/empty/error states, and reason-required in-page
suspend/reinstate confirmations. Only admins see those controls; backend role
checks remain the enforcement. Times are shown in Africa/Lagos.

**Masking is a response contract, not CSS.** The list never contains a full phone
number. Reveal is a separate audited POST. Its mutation returns no phone data;
the component alone holds the value until hidden or unmounted, and logout clears
protected query and mutation caches. The next admin should never see the last
admin's cached rows.

**The thing most likely to break:** treating every API failure as an expired
session. Only 401 redirects to login. A 403 remains a permission error, and a 502
remains retryable. Logout failure is visible rather than pretending the server
session was revoked.

27 tests pass, covering UI controls, confirmation, privacy, session cleanup and
proxy forwarding. Typecheck and lint pass. The normal production build could not
complete here: Turbopack's internal port binding was denied, and webpack could
not fetch Inter from Google Fonts. Live browser/Postgres acceptance remains in
STATUS; the build-plan checkbox stays open.

TanStack Table was unavailable and its download failed on restricted DNS. The
screen uses a semantic native table with server-driven controls for now; all
requests still use TanStack Query. No dependency or lockfile was fabricated.

Questions to try while reviewing:

1. Why would masking a phone only in rendered text still expose it?
2. Why does hiding a suspend button not enforce the permission?
3. Which data should disappear when signing out, and what should happen if the
   logout request fails?
