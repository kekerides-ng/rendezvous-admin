import { type NextRequest, NextResponse } from 'next/server';

/**
 * The proxy every browser request to the backend goes through
 * (architecture.md §2).
 *
 * **Why this exists is cookies, not tidiness.** This app on Vercel and the
 * backend on Railway are cross-site, so a `Set-Cookie` from the API origin is
 * a third-party cookie — already blocked by Safari's ITP and being phased out
 * by Chrome. The session would silently stop working for a large share of
 * users, with nothing in the logs. Forwarding server-side makes the cookie
 * first-party to this origin.
 *
 * Two things fall out: CORS stops mattering for HTTP, and `API_URL` is never
 * shipped to a browser.
 *
 * **Socket.io cannot come through here** — a WebSocket upgrade is not
 * something a route handler can forward. It connects to the backend directly
 * and authenticates with a ticket instead (`DECISIONS.md` I22).
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Headers that must not be copied in either direction.
 *
 * `host` would tell the backend it is being addressed as the Next app.
 * `content-length` and the encoding headers describe a body that has already
 * been decoded by the time we see it, so repeating them makes `fetch` send a
 * length that does not match what it writes.
 */
const DROP_FROM_REQUEST = new Set(['host', 'connection', 'content-length']);
const DROP_FROM_RESPONSE = new Set([
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
]);

async function proxy(request: NextRequest, path: string[]): Promise<Response> {
  const target = new URL(`${API_URL}/${path.join('/')}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_FROM_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });

  // The backend sees the real client, not this server — otherwise every audit
  // row and every rate-limit bucket says "the Next app", which makes the IP
  // column useless and the limiter global.
  const clientIp = request.headers.get('x-forwarded-for') ?? '';
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      // Required by Node when streaming a request body through.
      ...(request.body ? { duplex: 'half' } : {}),
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    // The backend being down is a 502 from here, not a 500: this app is fine,
    // the thing behind it is not, and the distinction matters when reading logs.
    return NextResponse.json(
      { code: 'UPSTREAM_UNAVAILABLE', message: 'The API is not reachable right now.' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_FROM_RESPONSE.has(key.toLowerCase())) responseHeaders.append(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/**
 * `Set-Cookie` passes through untouched, which is the whole point: the backend
 * sets `httpOnly`, `sameSite: strict`, `path: /admin`, and because the
 * response reaches the browser from THIS origin, the browser stores it as
 * first-party.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await context.params).path);
}
