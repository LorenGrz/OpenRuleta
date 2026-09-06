import { NextResponse } from "next/server";

import { siteConfig } from "@openruleta/config";
import {
  markWinner,
  ParticipantNotFoundError,
  setPrize,
  unmarkWinner,
} from "@openruleta/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const m = siteConfig.ruleta.messages;

type Body = { id?: unknown; prize?: unknown };

async function readBody(request: Request): Promise<Body> {
  try {
    return (await request.json()) as Body;
  } catch {
    return {};
  }
}

function readId(body: Body): string | null {
  return typeof body.id === "string" && body.id ? body.id : null;
}

function readPrize(body: Body): string | null {
  return typeof body.prize === "string" ? body.prize : null;
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const id = readId(body);
  if (!id) return NextResponse.json({ error: m.missingId }, { status: 400 });

  try {
    const participant = await markWinner(id, readPrize(body));
    return NextResponse.json({ participant });
  } catch (err) {
    if (err instanceof ParticipantNotFoundError) {
      return NextResponse.json({ error: m.notFound }, { status: 404 });
    }
    console.error("markWinner failed", err);
    return NextResponse.json({ error: m.markFailed }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await readBody(request);
  const id = readId(body);
  if (!id) return NextResponse.json({ error: m.missingId }, { status: 400 });

  try {
    await setPrize(id, readPrize(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("setPrize failed", err);
    return NextResponse.json({ error: m.prizeRouteFailed }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = readId(await readBody(request));
  if (!id) return NextResponse.json({ error: m.missingId }, { status: 400 });

  try {
    await unmarkWinner(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("unmarkWinner failed", err);
    return NextResponse.json({ error: m.undoRouteFailed }, { status: 500 });
  }
}
