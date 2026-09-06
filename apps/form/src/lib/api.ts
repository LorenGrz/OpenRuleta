import type {
  FieldErrors,
  Participant,
  ParticipantInput,
  SubmitResult,
} from "@openruleta/core";
import { siteConfig } from "@openruleta/config";

const m = siteConfig.form.messages;

export async function submitParticipant(
  input: ParticipantInput & { website?: string },
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, message: m.offline };
  }

  const data: unknown = await res.json().catch(() => ({}));
  const payload = (data ?? {}) as {
    participant?: Participant;
    error?: string;
    fields?: FieldErrors;
  };

  if (res.ok && payload.participant) {
    return { ok: true, participant: payload.participant };
  }
  return {
    ok: false,
    message: payload.error ?? m.genericError,
    fields: payload.fields,
  };
}
