# CLAUDE.md — companion-admin

The **admin console** for the companion platform (Next.js App Router), served on the `admin.` subdomain. One of four separate repos (`companion-contracts`, `companion-backend`, `companion-web`, `companion-admin`); it talks to `companion-backend` only through its `/admin/*` endpoints. No code is shared with other repos. It never holds keys and never signs blockchain transactions.

Read `docs/architecture.md` (a copy of the backend's master) before designing anything. The current step is in `docs/build-plan.md` (synced from the backend). Jaco is learning as this is built, so explain what you did and why.

## What admins do here
Users and KYC review · media and profile moderation · flagged messages · bookings and escrow status · live sessions · reports, SOS events and disputes (propose `resolve()` to the Safe multisig) · refunds and payouts view · reviews moderation · platform settings (fees, categories, limits) · admin users and roles · audit log.

## Stack
Next.js (App Router) · TypeScript strict · **Bun** (never npm/pnpm/yarn) · Tailwind · TanStack Query + TanStack Table · `openapi-typescript` + `openapi-fetch` (generated client) · react-hook-form + zod · Vitest + Playwright.

## Commands
- `bun install` · `bun run dev` (port 3001) · `bun run build` · `bun run lint` · `bun run typecheck` · `bun run test`
- `bun run api:gen` — regenerate `src/lib/api/schema.d.ts` from `${NEXT_PUBLIC_API_URL}/docs-json`. Run after every backend API change. Never hand-edit it.

## Layout
```
src/
  app/
    login/  2fa/
    (console)/          # sidebar layout, requires admin session
      dashboard/ users/ kyc/ media/ messages/ bookings/ sessions/
      reports/ disputes/ refunds/ reviews/ settings/ admins/ audit/
  features/<area>/      # tables, detail drawers, actions, hooks
  lib/api/              # client.ts, schema.d.ts (generated)
  components/ui/        # this app's own components
```

## Rules
1. Only call `/admin/*` endpoints, through `lib/api/client.ts` with generated types.
2. Admin session is an httpOnly cookie from the backend (email + password + TOTP). Redirect to `/login` on 401, and to `/2fa` when 2FA is pending.
3. Show and hide actions by role (`admin`, `moderator`), but the backend is the real enforcement; never rely on the UI alone.
4. Every destructive action (suspend, refund, delete media, resolve dispute) needs an in-page confirmation step with a required reason, which the backend records in the audit log.
5. Disputes: the admin chooses a split; the backend creates a Safe proposal. The UI shows the proposal status; it never signs.
6. Tables: server-side pagination, filters and sort; show timestamps in Africa/Lagos time; money in USDC from micro-USDC values.
7. Keep personal data minimal on screen; mask phone numbers by default with a "reveal" action that is audit-logged.
8. Desktop-first, but usable on a tablet.
9. After each change: `bun run typecheck && bun run lint && bun run test`.
10. Conventional commits. **Commit each implementation and each fix as it lands**, once `typecheck`, `lint` and `test` pass — one commit per coherent change, not one per session. Never add a remote or push without being asked.
