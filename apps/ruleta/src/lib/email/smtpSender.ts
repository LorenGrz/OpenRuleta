import nodemailer from "nodemailer";

import {
  MockEmailSender,
  type EmailMessage,
  type EmailSender,
  type EmailSendResult,
} from "@openruleta/core";

import { readSmtpConfig, type SmtpConfig } from "./smtpConfig.ts";

/** Real delivery over SMTP (Gmail by default). Server-only. */
export class SmtpEmailSender implements EmailSender {
  private readonly transport: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const info = await this.transport.sendMail({
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    return { id: info.messageId, simulated: false };
  }
}

/**
 * The SMTP sender when SMTP_USER / SMTP_PASS are set, otherwise the mock, so a
 * fresh clone keeps working with nothing configured.
 */
export function emailSenderFromEnv(env: NodeJS.ProcessEnv = process.env): {
  sender: EmailSender;
  /** Address to send from, or null to keep siteConfig's `from` (mock). */
  fromAddress: string | null;
} {
  const config = readSmtpConfig(env);
  if (!config) return { sender: new MockEmailSender(), fromAddress: null };
  return {
    sender: new SmtpEmailSender(config),
    fromAddress: config.fromAddress,
  };
}
