import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildWinnerEmail,
  escapeHtml,
  MockEmailSender,
  type EmailMessage,
} from "./email.ts";

const TEMPLATE = {
  from: "Raffle <no-reply@example.com>",
  subject: "Congratulations {name}!",
  body: "Hi {name},\n\nYou won {prize}.\nSee you soon.",
};

// Happy path: both placeholders substituted, recipient + sender carried over.
test("buildWinnerEmail: should fill {name} and {prize} in subject and text", () => {
  const msg = buildWinnerEmail(
    { name: "Ada", email: "ada@example.com", prize: "Keyboard" },
    TEMPLATE,
  );
  assert.equal(msg.to, "ada@example.com");
  assert.equal(msg.from, TEMPLATE.from);
  assert.equal(msg.subject, "Congratulations Ada!");
  assert.equal(msg.text, "Hi Ada,\n\nYou won Keyboard.\nSee you soon.");
});

// Happy path: HTML alternative keeps paragraph and line-break structure.
test("buildWinnerEmail: should render paragraphs and <br> in html", () => {
  const msg = buildWinnerEmail(
    { name: "Ada", email: "ada@example.com", prize: "Keyboard" },
    TEMPLATE,
  );
  assert.equal(
    msg.html,
    "<p>Hi Ada,</p>\n<p>You won Keyboard.<br>See you soon.</p>",
  );
});

// Security: participant-controlled values must never become markup.
test("buildWinnerEmail: should escape HTML from name and prize", () => {
  const msg = buildWinnerEmail(
    {
      name: `<script>alert("x")</script>`,
      email: "x@example.com",
      prize: "Tom & Jerry's <b>",
    },
    TEMPLATE,
  );
  assert.ok(msg.html);
  assert.ok(!msg.html.includes("<script>"));
  assert.ok(!msg.html.includes("<b>"));
  assert.match(
    msg.html,
    /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/,
  );
  assert.match(msg.html, /Tom &amp; Jerry&#39;s &lt;b&gt;/);
  // The plain-text part stays literal.
  assert.match(msg.text, /Tom & Jerry's <b>/);
});

// Edge: a value containing a placeholder or `$&` is inserted literally (single pass).
test("buildWinnerEmail: should not re-expand placeholders or $ patterns inside values", () => {
  const msg = buildWinnerEmail(
    { name: "{prize} $& $1", email: "a@example.com", prize: "Mug" },
    { from: "f", subject: "{name}", body: "{name} won {prize}" },
  );
  assert.equal(msg.subject, "{prize} $& $1");
  assert.equal(msg.text, "{prize} $& $1 won Mug");
});

// Edge: every occurrence replaced; unknown placeholders left alone.
test("buildWinnerEmail: should replace repeated placeholders and keep unknown ones", () => {
  const msg = buildWinnerEmail(
    { name: "Ada", email: "a@example.com", prize: "Mug" },
    { from: "f", subject: "{name} {name}", body: "{prize}/{prize} {other}" },
  );
  assert.equal(msg.subject, "Ada Ada");
  assert.equal(msg.text, "Mug/Mug {other}");
});

// Edge: a line break in the subject (header injection) collapses to a space;
// surrounding whitespace in inputs is trimmed.
test("buildWinnerEmail: should strip line breaks from subject and trim inputs", () => {
  const msg = buildWinnerEmail(
    {
      name: "  Ada\r\nBcc: evil@example.com ",
      email: " a@example.com ",
      prize: " Mug ",
    },
    { from: "f", subject: "Hi {name}", body: "{prize}" },
  );
  assert.equal(msg.subject, "Hi Ada Bcc: evil@example.com");
  assert.equal(msg.to, "a@example.com");
  assert.equal(msg.text, "Mug");
});

test("escapeHtml: should escape the five significant characters", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
  assert.equal(escapeHtml(""), "");
});

const MESSAGE: EmailMessage = {
  to: "a@example.com",
  from: "f@example.com",
  subject: "s",
  text: "t",
};

// Contract: mock ids are prefixed and the result is always flagged simulated.
test("MockEmailSender: should resolve with a mock- id and simulated: true", async () => {
  const result = await new MockEmailSender().send(MESSAGE);
  assert.equal(result.simulated, true);
  assert.match(result.id, /^mock-.+/);
});

// Uniqueness: two sends never share an id with the default generator.
test("MockEmailSender: should return a different id per send", async () => {
  const sender = new MockEmailSender();
  const a = await sender.send(MESSAGE);
  const b = await sender.send(MESSAGE);
  assert.notEqual(a.id, b.id);
});

// Determinism: the id generator is injectable for tests.
test("MockEmailSender: should use the injected id generator", async () => {
  const result = await new MockEmailSender(() => "fixed").send(MESSAGE);
  assert.deepEqual(result, { id: "mock-fixed", simulated: true });
});

// No side effects: send must not mutate the message it was given.
test("MockEmailSender: should not mutate the message", async () => {
  const msg = { ...MESSAGE };
  await new MockEmailSender().send(msg);
  assert.deepEqual(msg, MESSAGE);
});
