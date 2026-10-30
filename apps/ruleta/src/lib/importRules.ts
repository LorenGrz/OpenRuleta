import { siteConfig } from "@openruleta/config";
import { validateParticipant } from "@openruleta/core";

import type { ImportRules } from "./importParticipants.ts";

const form = siteConfig.form;

/** Same validation as the public form, shared by the CSV preview (client) and
 *  the import route (server). */
export const importRules: ImportRules = {
  aliases: siteConfig.ruleta.csv.importAliases,
  documentRequired: form.docField.enabled,
  validate: (raw) =>
    validateParticipant(raw, {
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
    }),
};
