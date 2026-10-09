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
