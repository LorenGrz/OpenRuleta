import { NextResponse } from "next/server";

import { siteConfig } from "@openruleta/config";
import {
  addParticipantsBatch,
  deleteAllParticipants,
  deleteParticipant,
  listParticipants,
  MAX_IMPORT_ROWS,
  type ParticipantInput,
} from "@openruleta/core";

import { importRules } from "@/lib/importRules";

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

/** CSV import: `{ rows }` -> `{ inserted, duplicates, invalid }`. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.importInvalidBody }, { status: 400 });
  }
  const rows: unknown =
    typeof body === "object" && body !== null
      ? (body as { rows?: unknown }).rows
      : undefined;
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: m.importInvalidBody }, { status: 400 });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      {
        error: m.importRouteTooMany.replace("{n}", String(MAX_IMPORT_ROWS)),
      },
      { status: 400 },
    );
  }

  // Revalidate every row; only name/email/document ever reach the database.
  const valid: ParticipantInput[] = [];
  let invalid = 0;
  for (const row of rows as unknown[]) {
    const fields =
      typeof row === "object" && row !== null
        ? (row as Record<string, unknown>)
        : {};
    const result = importRules.validate({
      name: fields.name,
      email: fields.email,
      document: fields.document,
    });
    if (result.ok) valid.push(result.data);
    else invalid++;
  }

  try {
    const { inserted, duplicates } = await addParticipantsBatch(valid);
    return NextResponse.json({ inserted, duplicates, invalid });
  } catch (err) {
    console.error("addParticipantsBatch failed", err);
    return NextResponse.json({ error: m.importRouteFailed }, { status: 500 });
  }
}
