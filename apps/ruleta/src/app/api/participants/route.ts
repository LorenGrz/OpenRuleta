import { NextResponse } from "next/server";

import { siteConfig } from "@openruleta/config";
import {
  deleteAllParticipants,
  deleteParticipant,
  listParticipants,
} from "@openruleta/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const m = siteConfig.ruleta.messages;

export async function GET() {
  try {
    const participants = await listParticipants();
    return NextResponse.json(
      { participants, count: participants.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("listParticipants failed", err);
    return NextResponse.json({ error: m.listFailed }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let body: { id?: unknown; all?: unknown } = {};
  try {
    body = (await request.json()) as { id?: unknown; all?: unknown };
  } catch {
    body = {};
  }

  try {
    if (body.all === true) {
      const removed = await deleteAllParticipants();
      return NextResponse.json({ ok: true, removed });
    }
    const id = typeof body.id === "string" && body.id ? body.id : null;
    if (!id) return NextResponse.json({ error: m.missingId }, { status: 400 });
    await deleteParticipant(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete participants failed", err);
    return NextResponse.json({ error: m.deleteRouteFailed }, { status: 500 });
  }
}
