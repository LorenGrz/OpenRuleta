/**
 * Winner email: message shape, a sender port and a mock adapter.
 *
 * There is NO real delivery in OpenRuleta. `MockEmailSender` stands in for a
 * provider (Resend, SES, SMTP…) behind the `EmailSender` interface, so swapping
 * in a real one later touches only the route that constructs the sender.
 *
 * Framework-agnostic and free of `node:*` imports: `@openruleta/core`'s index is
 * also imported by client components, so this module must stay browser-safe.
 * Copy (from / subject / body) is passed in by the app — never read from config
 * here.
 */

export type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  /** Plain-text body (always present). */
  text: string;
  /** Optional HTML alternative. Every interpolated value is HTML-escaped. */
  html?: string;
};

export type EmailSendResult = {
  /** Provider message id. Mock ids start with `mock-`. */
  id: string;
  /** true when nothing was actually delivered. */
  simulated: boolean;
};

export interface EmailSender {
  send(msg: EmailMessage): Promise<EmailSendResult>;
}

/** Copy for the winner email. `{name}` and `{prize}` are substituted. */
export type WinnerEmailTemplate = {
  from: string;
  subject: string;
  body: string;
};

export type WinnerEmailRecipient = {
  name: string;
  email: string;
  prize: string;
};

function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Sends nothing. Resolves with a `mock-…` id and `simulated: true`. */
export class MockEmailSender implements EmailSender {
  private readonly newId: () => string;

  /** @param newId id generator (injectable for deterministic tests). */
  constructor(newId: () => string = randomId) {
    this.newId = newId;
  }

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    void msg; // Intentionally unused: a real adapter would deliver it.
    return { id: `mock-${this.newId()}`, simulated: true };
  }
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Single-pass `{name}` / `{prize}` substitution. A function replacer, so a name
 * containing `{prize}` or `$&` is inserted literally and never re-expanded.
 */
function fillTemplate(
  template: string,
  vars: { name: string; prize: string },
): string {
  return template.replace(
    /\{(name|prize)\}/g,
    (_match, key: "name" | "prize") => vars[key],
  );
}

/** Plain text -> minimal HTML: escaped, blank lines = paragraphs, \n = <br>. */
function textToHtml(text: string): string {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((para) => `<p>${escapeHtml(para).replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n");
}

/** Builds the winner email from the app-provided template. Pure. */
export function buildWinnerEmail(
  recipient: WinnerEmailRecipient,
  template: WinnerEmailTemplate,
): EmailMessage {
  const vars = { name: recipient.name.trim(), prize: recipient.prize.trim() };
  const text = fillTemplate(template.body, vars);
  return {
    to: recipient.email.trim(),
    from: template.from,
    // Header value: a stray line break would be a header-injection vector.
    subject: fillTemplate(template.subject, vars).replace(
      /\s*[\r\n]+\s*/g,
      " ",
    ),
    text,
    html: textToHtml(text),
  };
}
