import assert from "node:assert/strict";
import { test } from "node:test";

import { readSmtpConfig, withSenderAddress } from "./smtpConfig.ts";

// No credentials means no real delivery: the route must stay on the mock.
test("readSmtpConfig is null without user and password", () => {
  assert.equal(readSmtpConfig({}), null);
  assert.equal(readSmtpConfig({ SMTP_USER: "a@gmail.com" }), null);
  assert.equal(readSmtpConfig({ SMTP_PASS: "x" }), null);
});

test("readSmtpConfig defaults to Gmail over TLS and joins the app password", () => {
  const c = readSmtpConfig({
    SMTP_USER: " ops@gmail.com ",
    SMTP_PASS: "abcd efgh ijkl mnop",
  });
  assert.deepEqual(c, {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    user: "ops@gmail.com",
    pass: "abcdefghijklmnop",
    fromAddress: "ops@gmail.com",
  });
});

test("readSmtpConfig honours host, STARTTLS port and an explicit from", () => {
  const c = readSmtpConfig({
    SMTP_USER: "u",
    SMTP_PASS: "p",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_FROM: "raffle@example.com",
  });
  assert.equal(c?.host, "smtp.example.com");
  assert.equal(c?.port, 587);
  assert.equal(c?.secure, false);
  assert.equal(c?.fromAddress, "raffle@example.com");
});

// Gmail only sends as the authenticated account: keep the configured display
// name, swap the address.
test("withSenderAddress keeps the display name and swaps the address", () => {
  assert.equal(
    withSenderAddress("Raffle Team <no-reply@event.org>", "ops@gmail.com"),
    "Raffle Team <ops@gmail.com>",
  );
  assert.equal(
    withSenderAddress(
      "Cloud Security Space · Ekoparty <no-reply@x.org>",
      "a@gmail.com",
    ),
    "Cloud Security Space · Ekoparty <a@gmail.com>",
  );
  assert.equal(
    withSenderAddress("Team, Ops <x@y.z>", "a@gmail.com"),
    '"Team, Ops" <a@gmail.com>',
  );
  assert.equal(
    withSenderAddress("no-reply@event.org", "a@gmail.com"),
    "a@gmail.com",
  );
});
