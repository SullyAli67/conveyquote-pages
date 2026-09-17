#!/usr/bin/env node
//
// scripts/verify-inbound-email.js
//
// Exercises functions/api/inbound-email.js — the endpoint that pauses the
// automated follow-up sequence when a client replies — against a mock D1
// database. No network, no credentials, no live data.
//
// Why: the endpoint silently switches off a revenue-generating nudge
// sequence. The two failure modes that cost money are both quiet ones —
// treating an out-of-office as a genuine reply (kills a live sequence),
// and failing to match a real reply (client keeps getting nudged after
// they have been in touch). Neither is visible in normal use, so they
// need a harness.
//
// Run with: npm run verify-inbound-email
//
// Exit code: 0 if every check passes, 1 otherwise.

import {
  extractAddress,
  readSender,
  normaliseHeaders,
  isAutomatedMail,
  onRequestPost,
} from "../functions/api/inbound-email.js";

let pass = 0;
let fail = 0;
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n       got      ${a}\n       expected ${e}`); }
};

console.log("\n-- extractAddress --");
check("bare", extractAddress("jane@example.com"), "jane@example.com");
check("angled", extractAddress("Jane Smith <Jane@Example.com>"), "jane@example.com");
check("junk", extractAddress("not an address"), "");
check("empty", extractAddress(null), "");

console.log("\n-- readSender --");
check("string", readSender({ from: "A B <a@b.com>" }), "a@b.com");
check("object", readSender({ from: { address: "c@d.com", name: "C" } }), "c@d.com");
check("array", readSender({ from: [{ email: "e@f.com" }] }), "e@f.com");
check("envelope fallback", readSender({ envelope: { from: "g@h.com" } }), "g@h.com");
check("none", readSender({ subject: "hi" }), "");

console.log("\n-- normaliseHeaders --");
check("object", normaliseHeaders({ "Auto-Submitted": "auto-replied" }), { "auto-submitted": "auto-replied" });
check("array", normaliseHeaders([{ name: "Precedence", value: "bulk" }]), { precedence: "bulk" });
check("undefined", normaliseHeaders(undefined), {});

console.log("\n-- isAutomatedMail --");
check("ooo subject", isAutomatedMail({}, "Out of Office: your quote"), true);
check("re ooo subject", isAutomatedMail({}, "Re: Automatic reply: quote"), true);
check("bounce", isAutomatedMail({}, "Undeliverable: Your conveyancing quote"), true);
check("auto-submitted header", isAutomatedMail({ "auto-submitted": "auto-replied" }, "hello"), true);
check("auto-submitted no", isAutomatedMail({ "auto-submitted": "no" }, "hello"), false);
check("precedence bulk", isAutomatedMail({ precedence: "bulk" }, "hello"), true);
check("newsletter", isAutomatedMail({ "list-unsubscribe": "<http://x>" }, "News"), true);
check("genuine reply", isAutomatedMail({}, "Re: Your conveyancing quote CQ-20260910-1234"), false);
check("genuine no subject", isAutomatedMail({}, ""), false);

// ── Mock D1 ────────────────────────────────────────────────────────────
function makeDb(enquiries) {
  const state = { enquiries, updates: [], audits: [] };
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              if (!/SELECT/.test(sql)) throw new Error("all() on non-select");
              const [email, ref] = args;
              return {
                results: state.enquiries
                  .filter(r => r.disabled === 0 && r.quoteSentAt !== null)
                  .filter(r => r.clientEmail.toLowerCase() === email || r.reference === ref)
                  .map(r => ({ reference: r.reference })),
              };
            },
            async run() {
              if (/UPDATE followup_state/.test(sql)) {
                state.updates.push(args);
                for (const r of state.enquiries) if (args.includes(r.reference)) r.disabled = 1;
              } else if (/INSERT INTO audit_log/.test(sql)) {
                state.audits.push(args);
              }
              return { meta: { changes: args.length } };
            },
          };
        },
      };
    },
  };
  return { db, state };
}

const SECRET = "s3cret";
const post = (db, body, auth = `Bearer ${SECRET}`) =>
  onRequestPost({
    env: { DB: db, INBOUND_EMAIL_SECRET: SECRET },
    request: {
      headers: { get: (h) => (h === "Authorization" ? auth : null) },
      json: async () => {
        if (body === "__bad__") throw new Error("bad json");
        return body;
      },
    },
  });

const rows = () => ([
  { reference: "CQ-20260901-1111", clientEmail: "jane@example.com", disabled: 0, quoteSentAt: "2026-09-01" },
  { reference: "CQ-20260902-2222", clientEmail: "bob@example.com",  disabled: 0, quoteSentAt: "2026-09-02" },
  { reference: "CQ-20260903-3333", clientEmail: "old@example.com",  disabled: 1, quoteSentAt: "2026-09-03" },
  { reference: "CQ-20260904-4444", clientEmail: "nq@example.com",   disabled: 0, quoteSentAt: null },
]);

console.log("\n-- handler --");
{
  const { db, state } = makeDb(rows());
  const res = await post(db, { from: "Jane <jane@example.com>", subject: "Re: your quote" });
  check("match by email: status", res.status, 200);
  check("match by email: body", await res.json(), {
    success: true, matched: 1, references: ["CQ-20260901-1111"], matchedBy: "email",
  });
  check("match by email: paused", state.enquiries[0].disabled, 1);
  check("match by email: audited", state.audits.length, 1);
  check("audit action row", state.audits[0][0], "CQ-20260901-1111");
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { from: "personal@gmail.com", subject: "Re: quote CQ-20260902-2222 question" });
  check("match by subject reference", await res.json(), {
    success: true, matched: 1, references: ["CQ-20260902-2222"], matchedBy: "email_or_reference",
  });
}
{
  const { db, state } = makeDb(rows());
  const res = await post(db, { from: "jane@example.com", subject: "Out of office" });
  check("out-of-office skipped", await res.json(), { success: true, matched: 0, skipped: "automated" });
  check("out-of-office: nothing paused", state.enquiries[0].disabled, 0);
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { from: "sully@conveyquote.uk", subject: "Re: quote CQ-20260901-1111" });
  check("own domain skipped", await res.json(), { success: true, matched: 0, skipped: "own_domain" });
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { from: "stranger@example.com", subject: "Hello" });
  check("no match", await res.json(), { success: true, matched: 0, skipped: "no_match" });
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { from: "old@example.com", subject: "Re: quote" });
  check("already paused -> no match", await res.json(), { success: true, matched: 0, skipped: "no_match" });
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { from: "nq@example.com", subject: "Re: quote" });
  check("no quote sent -> no match", await res.json(), { success: true, matched: 0, skipped: "no_match" });
}
{
  const { db, state } = makeDb(rows());
  await post(db, { from: "jane@example.com", subject: "Re: quote" });
  const res = await post(db, { from: "jane@example.com", subject: "Re: quote" });
  check("idempotent replay", await res.json(), { success: true, matched: 0, skipped: "no_match" });
  check("idempotent: one audit only", state.audits.length, 1);
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { from: "jane@example.com" }, "Bearer wrong");
  check("bad token -> 401", res.status, 401);
}
{
  const { db } = makeDb(rows());
  const res = await onRequestPost({
    env: { DB: db },
    request: { headers: { get: () => `Bearer ${SECRET}` }, json: async () => ({}) },
  });
  check("unset secret fails closed -> 401", res.status, 401);
}
{
  const { db } = makeDb(rows());
  const res = await post(db, "__bad__");
  check("invalid json -> 400", res.status, 400);
}
{
  const { db } = makeDb(rows());
  const res = await post(db, { subject: "no sender" });
  check("no sender -> 400", res.status, 400);
}
{
  const { db, state } = makeDb(rows());
  const res = await post(db, {
    from: "jane@example.com",
    subject: "x".repeat(200),
  });
  check("long subject truncated", state.audits[0][1].includes("..."), true);
  check("long subject still pauses", (await res.json()).matched, 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
