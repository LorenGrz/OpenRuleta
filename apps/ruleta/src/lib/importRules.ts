import { siteConfig } from "@openruleta/config";
import { validateParticipant } from "@openruleta/core";

import type { ImportRules } from "./importParticipants.ts";

const form = siteConfig.form;

const MAX_NAME_LENGTH = 200;
// RFC 5321 maximum length of an address.
const MAX_EMAIL_LENGTH = 254;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const tooLongOrControl = (value: unknown, max: number): boolean =>
  typeof value === "string" &&
  (value.length > max || CONTROL_CHARS.test(value));

/** Same validation as the public form, shared by the CSV preview (client) and
 *  the import route (server). Adds length and control-character limits that
 *  the form does not need. */
export const importRules: ImportRules = {
  aliases: siteConfig.ruleta.csv.importAliases,
  documentRequired: form.docField.enabled,
  validate: (raw) => {
    const errors: { name?: string; email?: string } = {};
    if (tooLongOrControl(raw.name, MAX_NAME_LENGTH)) {
      errors.name = form.messages.nameError;
    }
    if (tooLongOrControl(raw.email, MAX_EMAIL_LENGTH)) {
      errors.email = form.messages.emailError;
    }
    if (errors.name || errors.email) return { ok: false, errors };

    return validateParticipant(raw, {
      nameMinLength: form.nameMinLength,
      docField: {
        enabled: form.docField.enabled,
        pattern: form.docField.pattern,
      },
      messages: {
        nameError: form.messages.nameError,
        emailError: form.messages.emailError,
        docError: form.messages.docError,
      },
    });
  },
};
