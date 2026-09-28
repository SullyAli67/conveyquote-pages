// Logo shapes (the hexagon outline and the stacked chevrons) drifting out of the house towards the viewer.
// Drawn in 2D on a canvas behind the 3D scene, so they never cover the house and cost almost nothing.
const HEX = [[0, -1], [0.866, -0.5], [0.866, 0.5], [0, 1], [-0.866, 0.5], [-0.866, -0.5]];
const FAR = 34, NEAR = 6, COUNT = 10, MAX_ALPHA = 0.34, MAX_SIZE = 52;

function distanceToRect(x, y, r) {
  const dx = Math.max(r.left - x, 0, x - r.right);
  const dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

export function createDrift(canvas) {
  const g = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, focal = 1;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  function spawn(item, z) {
    const a = rnd() * Math.PI * 2, r = 0.7 + rnd() * 2.6;
    item.kind = rnd() < 0.55 ? 'hex' : 'chevrons';
    item.x = Math.cos(a) * r;
    item.y = Math.sin(a) * r * 0.75;
    item.z = z;
    item.size = 0.28 + rnd() * 0.22;
    item.rot = (rnd() - 0.5) * 0.5;
    item.spin = (rnd() - 0.5) * 0.12;
    item.speed = 0.9 + rnd() * 0.5;
  }
  const items = Array.from({ length: COUNT }, () => { const it = {}; spawn(it, NEAR + 2 + rnd() * (FAR - NEAR - 2)); return it; });

  return {
    resize(width, height) {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = width; h = height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      focal = h / (2 * Math.tan((14 * Math.PI) / 180));
    },
    // vp: point the shapes stream out of (the house centre); avoid: rects the shapes fade out near (text, card, header).
    draw(dt, vp, avoid) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      for (const it of items) {
        it.z -= it.speed * dt;
        it.rot += it.spin * dt;
        if (it.z < NEAR || (it.size * focal) / it.z > MAX_SIZE) spawn(it, FAR);
        const s = focal / it.z, sx = vp.x + it.x * s, sy = vp.y + it.y * s, size = it.size * s;
        const life = Math.min(1, (FAR - it.z) / 6) * Math.min(1, (it.z - NEAR) / 5) * Math.max(0, Math.min(1, (MAX_SIZE - size) / (MAX_SIZE * 0.45)));
        let keep = 1;
        for (const r of avoid) keep = Math.min(keep, Math.min(1, distanceToRect(sx, sy, r) / (size + 48)));
        const alpha = MAX_ALPHA * life * keep * (it.kind === 'hex' ? 1 : 0.7);
        if (alpha < 0.01) continue;
        g.save();
        g.translate(sx, sy);
        g.rotate(it.rot);
        g.globalAlpha = alpha;
        g.lineWidth = Math.max(1, size * 0.13);
        g.lineJoin = 'miter';
        if (it.kind === 'hex') {
          g.strokeStyle = '#00A7B5';
          g.beginPath();
          HEX.forEach(([x, y], i) => (i ? g.lineTo(x * size, y * size) : g.moveTo(x * size, y * size)));
          g.closePath();
          g.stroke();
        } else {
          g.strokeStyle = '#073B70';
          for (let k = 0; k < 3; k++) {
            const oy = (k - 1) * size * 0.34;
            g.beginPath();
            g.moveTo(-size * 0.8, oy - size * 0.2);
            g.lineTo(0, oy + size * 0.14);
            g.lineTo(size * 0.8, oy - size * 0.2);
            g.stroke();
          }
        }
        g.restore();
      }
    },
    clear() {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
