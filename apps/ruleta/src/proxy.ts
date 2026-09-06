import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional HTTP Basic Auth gate for the whole wheel app (pages + API routes).
 *
 * Next 16 file convention: this is `proxy.ts` (the former `middleware.ts`),
 * exporting a `proxy` function. It runs on the server before every matched
 * request.
 *
 * - Local use: leave `RULETA_BASIC_AUTH` unset — every request passes through,
 *   exactly like before.
 * - Hosted use: set `RULETA_BASIC_AUTH="username:password"` in the deployment's
 *   environment. The browser then prompts for credentials on first load and
 *   sends them on every request, so the service_role-backed API is never open
 *   to the public URL.
 *
 * This is a shared-secret gate, not real user management. Pair it with a
 * strong password and, ideally, your host's own protections (rate limiting,
 * IP allow-lists). For anything more, put a real auth proxy in front.
 */

const CREDENTIALS = process.env.RULETA_BASIC_AUTH?.trim();

const REALM = 'Basic realm="OpenRuleta wheel", charset="UTF-8"';

/** Length-independent comparison so a wrong guess can't be timed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

function decodeBasic(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    return atob(header.slice(6));
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest): NextResponse {
  if (!CREDENTIALS) return NextResponse.next();

  const provided = decodeBasic(request.headers.get("authorization"));
  if (provided !== null && safeEqual(provided, CREDENTIALS)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export const config = {
  // Guard everything except Next's internal assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
