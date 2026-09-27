// functions/lib/shared-ownership/sdlt.js
//
// Stamp Duty Land Tax on staircasing.
//
// Unlike most of this engine's SDLT work, staircasing is genuinely
// rule-driven rather than a rate calculation, so it can be answered
// properly rather than dumped into manual review. Three rules decide it:
//
//   1. A MARKET VALUE ELECTION at the original purchase settles it.
//      Where the first purchaser elected to pay SDLT on the full market
//      value of the property up front, no further SDLT arises on any
//      later staircasing, however far it goes. The benefit runs with the
//      lease, so a later buyer inherits it — provided the lease contains
//      the statement confirming the election was made.
//
//   2. WITHOUT an election, nothing is payable until ownership passes
//      80%. Staircasing up to and including 80% attracts no further
//      SDLT and, in the ordinary case, nothing to notify.
//
//   3. ABOVE 80%, SDLT becomes payable — and HMRC treats the
//      transactions taking ownership past 80% as LINKED, charging on the
//      combined consideration of the linked transactions rather than on
//      each step in isolation. That can push the whole lot into a higher
//      band, and it depends on the history of every earlier step, which
//      this engine does not hold. So this case routes to a fee earner.
//
// An election can only be made on a FIRST purchase, never on a resale.
//
// ⚠ Confirm the position against HMRC guidance before relying on it for
//   a client; the thresholds are stable but the detail around linked
//   transactions repays checking on the facts.

export const STAIRCASING_SDLT_THRESHOLD_PERCENT = 80;

export const STAIRCASING_SDLT_OUTCOME = {
  NOT_PAYABLE: "not_payable",
  MANUAL_REVIEW: "manual_review",
  UNKNOWN: "unknown",
};

function pct(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).replace(/[%,\s]/g, "");
  if (str === "") return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

function isYes(value) {
  if (value === true) return true;
  return ["yes", "true"].includes(String(value ?? "").trim().toLowerCase());
}

function isNo(value) {
  if (value === false) return true;
  return ["no", "false"].includes(String(value ?? "").trim().toLowerCase());
}

/**
 * @param {object} input
 * @param {number|string} input.currentSharePercent    share owned now
 * @param {number|string} input.additionalSharePercent share being bought
 * @param {string}        input.marketValueElection    "yes" | "no" | ""
 * @returns {{outcome: string, resultingSharePercent: number|null,
 *            note: string, statutoryRef: string|null}}
 */
export function assessStaircasingSdlt(input = {}) {
  const current = pct(input.currentSharePercent);
  const additional = pct(input.additionalSharePercent);
  const resulting =
    current != null && additional != null ? current + additional : null;

  const REF = "Finance Act 2003, Schedule 9 (shared ownership leases)";

  // Rule 1 — an election settles it outright.
  if (isYes(input.marketValueElection)) {
    return {
      outcome: STAIRCASING_SDLT_OUTCOME.NOT_PAYABLE,
      resultingSharePercent: resulting,
      note:
        "No further Stamp Duty Land Tax is expected. A market value election was made " +
        "when the property was first bought, meaning the tax was paid up front on the " +
        "full value of the home. That covers all later staircasing, however far you go. " +
        "We will confirm the election is recorded in your lease.",
      statutoryRef: REF,
    };
  }

  if (resulting == null) {
    return {
      outcome: STAIRCASING_SDLT_OUTCOME.UNKNOWN,
      resultingSharePercent: null,
      note:
        "We need to know the share you own now and the share you are buying before we " +
        "can tell you whether Stamp Duty Land Tax arises.",
      statutoryRef: REF,
    };
  }

  // Rule 2 — at or below the threshold, nothing arises.
  if (resulting <= STAIRCASING_SDLT_THRESHOLD_PERCENT) {
    return {
      outcome: STAIRCASING_SDLT_OUTCOME.NOT_PAYABLE,
      resultingSharePercent: resulting,
      note:
        `This purchase takes you to ${resulting}%. No further Stamp Duty Land Tax is ` +
        `expected, because none arises on staircasing up to ` +
        `${STAIRCASING_SDLT_THRESHOLD_PERCENT}% where no market value election was made. ` +
        "We will confirm the position from your original purchase.",
      statutoryRef: REF,
    };
  }

  // Rule 3 — above the threshold, linked transactions apply.
  const crossing = current != null && current <= STAIRCASING_SDLT_THRESHOLD_PERCENT;
  return {
    outcome: STAIRCASING_SDLT_OUTCOME.MANUAL_REVIEW,
    resultingSharePercent: resulting,
    note:
      `This purchase takes you to ${resulting}%, which is above the ` +
      `${STAIRCASING_SDLT_THRESHOLD_PERCENT}% threshold` +
      (crossing ? " for the first time" : "") +
      ". Stamp Duty Land Tax can become payable at that point, and HMRC treats the " +
      "transactions that take you past the threshold as linked — charging on their " +
      "combined value rather than on this step alone. Working that out needs the history " +
      "of your earlier purchases, so one of our solicitors will review it and confirm " +
      "the figure before you commit. It is not included in this quote.",
    statutoryRef: REF,
  };
}

// True where the engine can state the SDLT position without a fee earner.
export function sdltIsSettled(assessment) {
  return assessment?.outcome === STAIRCASING_SDLT_OUTCOME.NOT_PAYABLE;
}
