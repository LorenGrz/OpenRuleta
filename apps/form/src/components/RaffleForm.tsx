"use client";

import { useId, useState } from "react";

import { siteConfig } from "@openruleta/config";
import {
  maskDoc,
  validateParticipant,
  type FieldErrors,
} from "@openruleta/core";
import { Wordmark } from "@openruleta/ui";

import { submitParticipant } from "@/lib/api";

type Fields = { name: string; email: string; docLast3: string };
type Stored = { name: string; docLast3: string };

const EMPTY: Fields = { name: "", email: "", docLast3: "" };
const STORAGE_KEY = `${siteConfig.slug}-form-entry`;
const m = siteConfig.form.messages;
const doc = siteConfig.form.docField;

// Soft "one entry per device" guard: we remember in localStorage that this
// device already registered someone. It only hides the form (the real control
// is the unique email index in the database).
function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Stored>;
    if (typeof p.name === "string" && typeof p.docLast3 === "string") {
      return { name: p.name, docLast3: p.docLast3 };
    }
  } catch {
    // localStorage unavailable (private mode, blocked): fail open.
  }
  return null;
}

function writeStored(s: Stored): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignored
  }
}

export function RaffleForm() {
  const uid = useId();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Stored | null>(() => readStored());
  // Honeypot anti-bot field: invisible to people, bots fill it in.
  const [website, setWebsite] = useState("");

  function update<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = validateParticipant(fields, {
      nameMinLength: siteConfig.form.nameMinLength,
      docField: { enabled: doc.enabled, pattern: doc.pattern },
      messages: {
        nameError: m.nameError,
        emailError: m.emailError,
        docError: m.docError,
      },
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (!terms) {
      setFormError(m.termsRequired);
      return;
    }

    setSubmitting(true);
    const res = await submitParticipant({ ...result.data, website });
    setSubmitting(false);

    if (res.ok) {
      const stored: Stored = {
        name: res.participant.name || result.data.name,
        docLast3: res.participant.docLast3 || result.data.docLast3,
      };
      writeStored(stored);
      setDone(stored);
      return;
    }
    if (res.fields) setErrors(res.fields);
    setFormError(res.message);
  }

  if (done) {
    return <SuccessTicket name={done.name} docLast3={done.docLast3} />;
  }

  return (
    <div className="w-full max-w-[480px] rounded-3xl bg-surface p-6 shadow-[0_20px_60px_rgba(0,30,80,0.25)] md:p-7">
      <Wordmark
        src={siteConfig.assets.logo}
        alt={m.logoAlt}
        className="mx-auto mb-4 h-12 md:h-14"
      />
      <header className="mb-4 text-center">
        <h1 className="text-xl font-bold text-primary md:text-2xl">
          {m.heading}
        </h1>
        <p className="mt-1 text-xs text-slate-600">{m.subtitle}</p>
      </header>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden"
        >
          <label htmlFor={`${uid}-website`}>{m.honeypotLabel}</label>
          <input
            id={`${uid}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <Field id={`${uid}-name`} label={m.nameLabel} error={errors.name}>
          <input
            id={`${uid}-name`}
            type="text"
            autoComplete="name"
            placeholder={m.namePlaceholder}
            value={fields.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass(errors.name)}
          />
        </Field>

        <Field id={`${uid}-email`} label={m.emailLabel} error={errors.email}>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            placeholder={m.emailPlaceholder}
            value={fields.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass(errors.email)}
          />
        </Field>

        {doc.enabled && (
          <Field
            id={`${uid}-doc`}
            label={doc.label}
            error={errors.docLast3}
            hint={doc.hint}
          >
            <input
              id={`${uid}-doc`}
              type="text"
              inputMode="numeric"
              maxLength={doc.maxLength}
              placeholder={doc.placeholder}
              value={fields.docLast3}
              onChange={(e) =>
                update(
                  "docLast3",
                  e.target.value.replace(/\D/g, "").slice(0, doc.maxLength),
                )
              }
              className={inputClass(errors.docLast3)}
            />
          </Field>
        )}

        <label className="flex items-start gap-2.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input-border text-primary focus:ring-primary"
          />
          <span>{m.consent}</span>
        </label>

        {formError && (
          <p
            role="alert"
            className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-pill bg-primary py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-md transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? m.submitting : m.submit}
        </button>
      </form>
    </div>
  );
}

function inputClass(error?: string) {
  return [
    "w-full rounded-lg border bg-white px-4 py-2.5 text-ink outline-none transition",
    "focus:border-primary focus:ring-2 focus:ring-primary/40",
    error ? "border-error" : "border-input-border",
  ].join(" ");
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-sm font-medium text-error">{error}</span>
      ) : hint ? (
        <span className="text-xs text-slate-500">{hint}</span>
      ) : null}
    </div>
  );
}

function SuccessTicket({ name, docLast3 }: { name: string; docLast3: string }) {
  return (
    <div className="flex w-full max-w-[480px] flex-col items-center rounded-3xl bg-surface p-7 text-center shadow-[0_20px_60px_rgba(0,30,80,0.25)]">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-primary" fill="none">
          <path
            d="m5 13 4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-primary">{m.successHeading}</h2>

      <div className="relative mt-6 w-full overflow-hidden rounded-2xl border border-dashed border-input-border bg-tint p-6">
        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-surface" />
        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-surface" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {m.ticketLabel}
        </p>
        <p className="mt-2 text-xl font-bold text-primary">{name}</p>
        {doc.enabled && docLast3 && (
          <p className="font-mono text-sm text-slate-600">
            {doc.displayLabel} {maskDoc(docLast3, doc.maskGlyph)}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-input-border pt-4">
          <span className="text-sm text-slate-500">{m.statusLabel}</span>
          <span className="rounded-md bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
            {m.statusValue}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">{m.deviceNote}</p>
    </div>
  );
}
