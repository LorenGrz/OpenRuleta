/**
 * SMTP settings for the real winner email, read from the server env.
 *
 * Kept free of `nodemailer` so it can be unit-tested with `node --test`.
 * Defaults target Gmail: smtp.gmail.com:465 over TLS, authenticated with the
 * Gmail address and an app password (Google account → Security → 2-Step
 * Verification → App passwords).
 */

export type SmtpConfig = {
  host: string;
  port: number;
  /** true for implicit TLS (465); false upgrades with STARTTLS (587). */
  secure: boolean;
  user: string;
  pass: string;
  /** Address the mail is sent from. Gmail rewrites any other address to `user`. */
  fromAddress: string;
};

type Env = Record<string, string | undefined>;

/** null when SMTP_USER / SMTP_PASS are missing: the route stays simulated. */
export function readSmtpConfig(env: Env): SmtpConfig | null {
  const user = env.SMTP_USER?.trim();
  // App passwords are shown as "abcd efgh ijkl mnop"; Gmail wants them joined.
  const pass = env.SMTP_PASS?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  const port = Number(env.SMTP_PORT?.trim() || 465);
  return {
    host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number.isFinite(port) && port > 0 ? port : 465,
    secure: (Number.isFinite(port) ? port : 465) === 465,
    user,
    pass,
    fromAddress: env.SMTP_FROM?.trim() || user,
  };
}

/**
 * Keeps the display name of a configured "Name <address>" sender but swaps in
 * the address SMTP can actually send from, so Gmail does not rewrite it and
 * the mail is not flagged for a spoofed domain.
 */
export function withSenderAddress(from: string, address: string): string {
  const match = /^\s*(.*?)\s*<[^>]*>\s*$/.exec(from);
  const name = match?.[1]?.replace(/^"|"$/g, "").trim();
  if (!name) return address;
  // Quote names with characters that RFC 5322 only allows inside quotes.
  const safe = /[(),:;<>@[\]\\"]/.test(name)
    ? `"${name.replace(/["\\]/g, "\\$&")}"`
    : name;
  return `${safe} <${address}>`;
}
