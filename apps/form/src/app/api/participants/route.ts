import { NextResponse } from "next/server";

import { siteConfig } from "@openruleta/config";
import {
  addParticipant,
  DuplicateParticipantError,
  validateParticipant,
} from "@openruleta/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const m = siteConfig.form.messages;
const doc = siteConfig.form.docField;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: m.invalidJson }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field. Return a fake success
  // without saving anything.
  const raw = (body ?? {}) as Record<string, unknown>;
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return NextResponse.json(
      {
        participant: {
          id: "",
          name: "",
          email: "",
          docLast3: "",
          createdAt: "",
        },
      },
      { status: 201 },
    );
  }

  const result = validateParticipant(raw, {
    nameMinLength: siteConfig.form.nameMinLength,
    docField: { enabled: doc.enabled, pattern: doc.pattern },
    messages: {
      nameError: m.nameError,
      emailError: m.emailError,
      docError: m.docError,
    },
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: m.invalidData, fields: result.errors },
      { status: 422 },
    );
  }

  try {
    const participant = await addParticipant(result.data);
    return NextResponse.json({ participant }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateParticipantError) {
      return NextResponse.json(
        { error: m.duplicate, fields: { email: m.duplicate } },
        { status: 409 },
      );
    }
    console.error("addParticipant failed", err);
    if (err instanceof Error && err.message.includes("environment variables")) {
      return NextResponse.json(
        { error: m.serverMisconfigured },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: m.saveFailed }, { status: 500 });
  }
}
