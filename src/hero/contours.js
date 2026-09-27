function field(x, y) {
  const u = x / 420, v = y / 420;
  return Math.sin(u * 1.7 + Math.sin(v * 1.3) * 1.6) + Math.cos(v * 1.9 - Math.sin(u * 0.9) * 1.8) + 0.6 * Math.sin((u + v) * 2.6 + 1.3) + 0.35 * Math.cos(u * 3.9 - v * 1.4);
}

export function drawContours(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const step = 7, cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1, f = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[j * cols + i] = field(i * step, j * step);
  g.strokeStyle = 'rgba(16,36,58,0.075)'; g.lineWidth = 1.2; g.lineCap = 'round';
  for (let L = -2.4; L <= 2.4; L += 0.3) {
    g.beginPath();
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = f[j * cols + i] - L, b = f[j * cols + i + 1] - L, c = f[(j + 1) * cols + i + 1] - L, d = f[(j + 1) * cols + i] - L;
      const x = i * step, y = j * step, pts = [];
      if ((a > 0) !== (b > 0)) pts.push([x + step * a / (a - b), y]);
      if ((b > 0) !== (c > 0)) pts.push([x + step, y + step * b / (b - c)]);
      if ((d > 0) !== (c > 0)) pts.push([x + step * d / (d - c), y + step]);
      if ((a > 0) !== (d > 0)) pts.push([x, y + step * a / (a - d)]);
      if (pts.length >= 2) { g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); }
      if (pts.length === 4) { g.moveTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); }
    }
    g.stroke();
  }
}
