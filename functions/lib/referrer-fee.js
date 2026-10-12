// functions/lib/referrer-fee.js
//
// Which of a referrer's fees applies to a referral, by transaction type:
//   - purchase, sale, sale & purchase      → referrers.referral_fee
//   - remortgage, transfer of equity,
//     remortgage & transfer of equity      → referrers.remortgage_referral_fee
//   - anything else (lease extensions, enfranchisement, staircasing …)
//                                          → no automatic fee; admin sets it
// A sale & purchase is one enquiry, so it carries one main fee.

const MAIN_FEE_TYPES = new Set(["purchase", "sale", "sale_purchase"]);
const REMORTGAGE_FEE_TYPES = new Set(["remortgage", "transfer", "remortgage_transfer"]);

export function referrerFeeFor(referrer, transactionType) {
  const type = String(transactionType || "");
  if (MAIN_FEE_TYPES.has(type)) return Number(referrer?.referral_fee) || 0;
  if (REMORTGAGE_FEE_TYPES.has(type)) return Number(referrer?.remortgage_referral_fee) || 0;
  return 0;
}

// The default FIRM fee (what the panel firm pays ConveyQuote) for a case,
// from the firm's record: panel_firms.remortgage_referral_fee for the
// remortgage / transfer types when it is set (migration 0022), otherwise
// panel_firms.default_referral_fee. It only pre-fills the allocation and
// Fees boxes; the figure saved on the case is whatever admin confirms.
export function firmDefaultFeeFor(firm, transactionType) {
  const type = String(transactionType || "");
  const remortgageDefault = Number(firm?.remortgage_referral_fee) || 0;
  if (REMORTGAGE_FEE_TYPES.has(type) && remortgageDefault > 0) return remortgageDefault;
  return Number(firm?.default_referral_fee) || 0;
}
