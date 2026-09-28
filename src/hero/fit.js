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

// Mirrors the street fade in xrayScene.js: the street dissolves widely near the heading (first rect) and narrowly near the card.
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export function streetTextFade(x, y, rects) {
  let k = 1;
  rects.slice(0, 2).forEach((r, i) => {
    const dx = Math.max(r.left - x, x - r.right, 0), dy = Math.max(r.top - y, y - r.bottom, 0);
    k *= smooth(10, i ? 70 : 190, Math.hypot(dx, dy));
  });
  return k;
}

// Paints that fade as an alpha mask at a reduced resolution (white where the street shows); CSS stretches it over the hero.
export function drawStreetMask(canvas, w, h, rects, step = 6) {
  const cw = Math.max(1, Math.ceil(w / step)), ch = Math.max(1, Math.ceil(h / step));
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d"), img = g.createImageData(cw, ch);
  for (let j = 0; j < ch; j++)
    for (let i = 0; i < cw; i++) {
      const o = (j * cw + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(255 * streetTextFade(((i + 0.5) * w) / cw, ((j + 0.5) * h) / ch, rects));
    }
  g.putImageData(img, 0, 0);
}

// Areas the drifting logo shapes fade away from: the heading and copy, the card and the header.
export function heroAvoidRects(hero, header, copy, card) {
  const h = hero.getBoundingClientRect();
  return [header, copy, card]
    .filter((el) => el && el.getClientRects().length > 0)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - h.left, top: r.top - h.top, right: r.right - h.left, bottom: r.bottom - h.top };
    });
}
