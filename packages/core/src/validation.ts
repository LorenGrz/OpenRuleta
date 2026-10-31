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
  raw: { name?: unknown; email?: unknown; document?: unknown },
  options: ValidateOptions = {},
): ValidationResult {
  const nameMinLength = options.nameMinLength ?? 2;
  const docEnabled = options.docField?.enabled ?? true;
  const docPattern = options.docField?.pattern ?? "^[0-9A-Z]{6,20}$";
  const msg = { ...DEFAULTS, ...options.messages };

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const document =
    typeof raw.document === "string" ? normalizeDoc(raw.document) : "";

  const errors: FieldErrors = {};

  if (name.length < nameMinLength) {
    errors.name = msg.nameError;
  }
  if (!EMAIL_RE.test(email)) {
    errors.email = msg.emailError;
  }
  if (docEnabled && !new RegExp(docPattern).test(document)) {
    errors.document = msg.docError;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      email: email.toLowerCase(),
      document: docEnabled ? document : "",
    },
  };
}

/** Strips dots, spaces and dashes and uppercases: "30.123.456" -> "30123456". */
function normalizeDoc(value: string): string {
  return value.replace(/[.\s-]/g, "").toUpperCase();
}

/**
 * "30123456" -> "••• 456". Shows only the last 3 characters: the full document
 * is stored, but screens that get projected to an audience must not show it.
 */
export function maskDoc(document: string, glyph = "•••"): string {
  return `${glyph} ${document.slice(-3)}`;
}
