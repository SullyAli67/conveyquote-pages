// functions/lib/pass-through-costs.js
//
// Pass-through disbursement amounts shared by every quoting rail.
//
// These previously lived in ./calculate-quote.js. They were extracted
// here so that engines which need them do not have to import the
// conveyancing engine to get them — ./calculate-enfranchisement-quote.js
// needs ID_CHECKS_PER_BUYER, and importing calculate-quote.js for it
// would create an import cycle once calculate-quote.js dispatches to the
// enfranchisement engine.
//
// ./calculate-quote.js re-exports every name below, so existing imports
// such as
//
//   import { SEARCH_PACK_FEE } from "./calculate-quote.js";
//
// in the firm and referrer engines continue to work unchanged. There is
// still exactly one definition of each value.
//
// Office copy entries and HM Land Registry fees are deliberately NOT
// here — they are functions of tenure and transaction type and live in
// ./disbursement-constants.js.

export const SEARCH_PACK_FEE = 350;
export const ID_CHECKS_PER_BUYER = 14.4;
export const OS1_SEARCH_FEE = 8.8;
export const BANKRUPTCY_SEARCH_PER_BUYER = 7.6;
export const SDLT_SUBMISSION_FEE = 6;
export const AP1_SUBMISSION_FEE = 6;
