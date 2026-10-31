# 0002. Store the full document

## Status

Accepted

## Date

2026-10-30

## Context

The form collected only the last 3 digits of the participant's ID. That is too weak to tell apart two people at an event, or to verify that the winner is who they say they are when they collect the prize. Operators asked for the full document. It is personal data, so the trade-off has to be explicit.

## Decision

The form collects the full document, normalized (dots, spaces and dashes removed, uppercase), and stores it in a new `participants.document` column (max 32 characters). The legacy `doc_last3` column stays, is no longer written, and `toWinnerParticipant` falls back to it for old rows. The anon key keeps `INSERT`-only access, now on `document`.

Exposure is limited, not zero: the full document travels through the local API (`/api/participants`) to the operator's browser, so the wheel must stay on `127.0.0.1` or behind `RULETA_BASIC_AUTH`. It is only rendered in the two CSV exports; the projected screens (`WinnerModal`, `ParticipantsPanel`, the form ticket) show only the last 3 characters via `maskDoc`, and `localStorage` keeps only the last 3 characters. The schema must be applied before deploying, and participants must be deleted after the event.

## Alternatives considered

- **Keep only the last 3 characters** — minimal personal data, but not enough to identify a winner reliably; ruled out by the need to verify prize collection.
- **Store a hash of the document** — avoids keeping the raw value, but the operator then cannot read it for the CSV or for verification, which defeats the purpose.

## Consequences

- The database now holds personal data: delete participants after the event and pause the projects.
- Existing databases need `schema.sql` run before the new version is deployed; otherwise the form insert and the wheel list fail. The script moves the anon insert grant from `doc_last3` to `document`, so the old form stops accepting sign-ups between the SQL and the deploy: do not migrate while sign-ups are open. A rollback requires restoring the `doc_last3` grant.
- Old mock-store files and rows keep working through the `doc_last3` fallback.
- Revisit if events need to retain data longer (retention policy) or if a legal basis beyond the raffle is required.
