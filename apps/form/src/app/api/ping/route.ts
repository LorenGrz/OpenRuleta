import { NextResponse } from "next/server";

import { ping } from "@openruleta/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keep-alive. A cron (see vercel.json) hits this so Supabase's free tier does
 * not pause the project after 7 idle days. It runs a real Postgres round-trip
 * through the `app_ping()` function (touches no table, exposes no data).
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await ping();
    return NextResponse.json(
      {
        ok: true,
        db: true,
        ts: new Date().toISOString(),
        ms: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: false,
        ts: new Date().toISOString(),
        ms: Date.now() - startedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
