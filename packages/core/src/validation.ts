import type { FieldErrors, ParticipantInput } from "./types.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidateOptions = {
  /** Minimum length for the name field. Default 2. */
  nameMinLength?: number;
  docField?: {
    /** When false, the document value is not validated or required. */
    enabled: boolean;
    /** Regex source (no slashes) the value must match when enabled. */
    pattern: string;
  };
  messages?: {
    nameError?: string;
    emailError?: string;
    docError?: string;
  };
};

export type ValidationResult =
  { ok: true; data: ParticipantInput } | { ok: false; errors: FieldErrors };

const DEFAULTS = {
  nameError: "Please enter your name.",
  emailError: "Please enter a valid email address.",
  docError: "Invalid document value.",
};

export function validateParticipant(
  raw: { name?: unknown; email?: unknown; docLast3?: unknown },
  options: ValidateOptions = {},
): ValidationResult {
  const nameMinLength = options.nameMinLength ?? 2;
  const docEnabled = options.docField?.enabled ?? true;
  const docPattern = options.docField?.pattern ?? "^\\d{3}$";
  const msg = { ...DEFAULTS, ...options.messages };

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const docLast3 = typeof raw.docLast3 === "string" ? raw.docLast3.trim() : "";

  const errors: FieldErrors = {};

  if (name.length < nameMinLength) {
    errors.name = msg.nameError;
  }
  if (!EMAIL_RE.test(email)) {
    errors.email = msg.emailError;
  }
  if (docEnabled && !new RegExp(docPattern).test(docLast3)) {
    errors.docLast3 = msg.docError;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      email: email.toLowerCase(),
      docLast3: docEnabled ? docLast3 : "",
    },
  };
}

/** "492" -> "••• 492" for display. The full document is never collected. */
export function maskDoc(docLast3: string, glyph = "•••"): string {
  return `${glyph} ${docLast3}`;
}
