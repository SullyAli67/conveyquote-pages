const MIN_SCALE = 0.45;

export function fitScale(box, safe) {
  const s = Math.min(1, (safe.right - safe.left) / (box.right - box.left), (safe.bottom - safe.top) / (box.bottom - box.top));
  return Math.max(MIN_SCALE, s);
}

export function shiftInto(box, safe) {
  const dx = box.left < safe.left ? safe.left - box.left : box.right > safe.right ? safe.right - box.right : 0;
  const dy = box.top < safe.top ? safe.top - box.top : box.bottom > safe.bottom ? safe.bottom - box.bottom : 0;
  return { dx, dy };
}

export function scaleAbout(box, s, cx, cy) {
  return {
    left: cx + (box.left - cx) * s,
    right: cx + (box.right - cx) * s,
    top: cy + (box.top - cy) * s,
    bottom: cy + (box.bottom - cy) * s,
  };
}

// Where the house may sit without running under the heading, the header or the card.
export function heroSafeRect(hero, header, copy, card) {
  const h = hero.getBoundingClientRect();
  const W = h.width, H = h.height;
  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left - h.left, top: r.top - h.top, right: r.right - h.left, bottom: r.bottom - h.top };
  };
  const hd = rel(header), cp = rel(copy);
  const top = hd.bottom + 12;
  const stacked = W / H < 0.8 || cp.right > W * 0.75;
  if (stacked) return { left: 12, right: W - 12, top, bottom: cp.top - 12 };
  const cardShown = card.getClientRects().length > 0;
  return { left: cp.right + 24, right: cardShown ? rel(card).left - 16 : W - 16, top, bottom: H + 24 };
}
