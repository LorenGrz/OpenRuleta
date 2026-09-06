import { NextResponse } from "next/server";

import { siteConfig } from "@openruleta/config";
import { resetWinners } from "@openruleta/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await resetWinners();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resetWinners failed", err);
    return NextResponse.json(
      { error: siteConfig.ruleta.messages.resetRouteFailed },
      { status: 500 },
    );
  }
}
