import * as THREE from 'three';
import { fitScale, shiftInto } from './fit.js';

// Scene, lens mask and frame() are verbatim from design/redesign-2026/reference/hero-xray.html so behaviour matches the tested reference.
export function mountXrayHero(container, options) {
  var hero = container;
  var glCanvas = options.canvas;
  var lensEl = options.lens, dotEl = options.dot;
  var renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  var ANISO = renderer.capabilities.getMaxAnisotropy();
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
  var hemi = new THREE.HemisphereLight(0xffffff, 0xa9b0b5, 0.58); scene.add(hemi);
  var key = new THREE.DirectionalLight(0xfff3e2, 0.8); key.position.set(6, 10, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8; key.shadow.bias = -0.0006; key.shadow.radius = 3; scene.add(key);
  var fill = new THREE.DirectionalLight(0xe2f2ff, 0.35); fill.position.set(-7, 4, 5); scene.add(fill);

  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function canvasTex(size, draw) {
    var c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; return t;
  }
  var brickTex = canvasTex(512, function (g, s) {
    g.fillStyle = '#d9d0c0'; g.fillRect(0, 0, s, s);
    var rows = 16, rh = s / rows, bw = s / 4;
    for (var r = 0; r < rows; r++) { var off = (r % 2) * bw / 2;
      for (var i = -1; i < 5; i++) {
        var hue = 38 + rnd() * 8, sat = 30 + rnd() * 18, lit = 54 + rnd() * 12;
        if (rnd() < 0.14) { lit -= 16; hue -= 8; sat -= 6; }
        if (rnd() < 0.03) { hue = 22; sat = 28; lit = 50; }
        g.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + lit + '%)';
        g.fillRect(i * bw + off + 3, r * rh + 3, bw - 6, rh - 6);
      } }
  });
  var slateTex = canvasTex(256, function (g, s) {
    g.fillStyle = '#2f3438'; g.fillRect(0, 0, s, s);
    var rows = 8, rh = s / rows, w = s / 6;
    for (var r = 0; r < rows; r++) { var off = (r % 2) * w / 2;
      for (var i = -1; i < 7; i++) { g.fillStyle = 'hsl(205,8%,' + (30 + rnd() * 9) + '%)'; g.fillRect(i * w + off + 1.5, r * rh + 1.5, w - 3, rh - 2); } }
  });
  var tileTex = canvasTex(256, function (g, s) {
    g.fillStyle = '#6e3222'; g.fillRect(0, 0, s, s);
    var rows = 8, rh = s / rows, w = s / 8;
    for (var r = 0; r < rows; r++) { var off = (r % 2) * w / 2;
      for (var i = -1; i < 9; i++) { g.fillStyle = 'hsl(' + (12 + rnd() * 8) + ',50%,' + (36 + rnd() * 10) + '%)'; g.fillRect(i * w + off + 1.5, r * rh + 1.5, w - 3, rh - 3); } }
  });
  var checkTex = canvasTex(64, function (g, s) {
    g.fillStyle = '#efece4'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2);
  });
  checkTex.magFilter = THREE.NearestFilter;
  var paveTex = canvasTex(256, function (g, s) {
    g.fillStyle = '#9d9a94'; g.fillRect(0, 0, s, s);
    for (var r = 0; r < 2; r++) for (var i = 0; i < 2; i++) { g.fillStyle = 'hsl(40,5%,' + (70 + rnd() * 6) + '%)'; g.fillRect(i * s / 2 + 2, r * s / 2 + 2, s / 2 - 4, s / 2 - 4); }
  });

  var BRICK = 0.72;
  function brickMat(u, v) { var t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(u, v); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }
  function std(c, r, m) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0 }); }
  var WARM = new THREE.Color(0xFFB45E);
  var M = {
    stucco: std(0xF4F2EC, 0.8), stone: std(0xE3DED3, 0.85), white: std(0xFBFBF8, 0.5), recess: std(0x1d2327, 0.9),
    hall: new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9, emissive: WARM, emissiveIntensity: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x3E5563, roughness: 0.05, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, emissive: WARM, emissiveIntensity: 0 }),
    shutter: new THREE.MeshStandardMaterial({ color: 0xEDEBE4, roughness: 0.7, emissive: new THREE.Color(0xFFD7A0), emissiveIntensity: 0 }),
    slat: std(0xC8C4BA, 0.8), navy: std(0x0B2E55, 0.45, 0.1), navyDark: std(0x082442, 0.5, 0.1),
    brass: std(0xE7B85C, 0.25, 0.85), iron: std(0x1a1b1d, 0.5, 0.55), pot: std(0xA05C44, 0.85), potGrey: std(0x4b4f52, 0.7),
    leaf: std(0x355c2e, 0.9), gravel: std(0x8f8a82, 1), kerb: std(0x8b8883, 0.9),
    lamp: new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.3, emissive: new THREE.Color(0xFFC26B), emissiveIntensity: 0 })
  };

  var house = new THREE.Group(); scene.add(house);
  var parts = {}, cur = null, ORDER = [];
  function part(name) { if (!parts[name]) { var g = new THREE.Group(); house.add(g); parts[name] = g; ORDER.push(name); } cur = parts[name]; }
  function add(mesh, parent) { mesh.castShadow = true; mesh.receiveShadow = true; (parent || cur).add(mesh); return mesh; }
  function box(w, h, d, mat, x, y, z, parent) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, parent); }
  function cyl(rt, rb, h, mat, x, y, z, parent) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), mat); m.position.set(x, y, z); return add(m, parent); }

  var W = 3.0, D = 3.0, H = 3.5, FRONT = D / 2, DX = -0.85, WALLZ = 3.15;
  var E = H, RT = H + 1.05;

  // ---------- Ground ----------
  part('ground');
  var gd = WALLZ - FRONT;
  box(W, 0.05, gd, M.gravel, 0, 0.025, FRONT + gd / 2);
  var pathLen = WALLZ - (FRONT + 0.37);
  var ct = checkTex.clone(); ct.needsUpdate = true; ct.repeat.set(3.5, pathLen / 0.2);
  var path = new THREE.Mesh(new THREE.PlaneGeometry(0.7, pathLen), new THREE.MeshStandardMaterial({ map: ct, roughness: 0.4 }));
  path.rotation.x = -Math.PI / 2; path.position.set(DX, 0.052, FRONT + 0.37 + pathLen / 2); add(path);
  box(0.03, 0.03, pathLen, M.stone, DX - 0.365, 0.06, FRONT + 0.37 + pathLen / 2);
  box(0.03, 0.03, pathLen, M.stone, DX + 0.365, 0.06, FRONT + 0.37 + pathLen / 2);
  var pt = paveTex.clone(); pt.needsUpdate = true; pt.repeat.set(W / 0.9, 1.1 / 0.9);
  var pave = new THREE.Mesh(new THREE.BoxGeometry(W, 0.06, 1.1), [M.kerb, M.kerb, new THREE.MeshStandardMaterial({ map: pt, roughness: 0.95 }), M.kerb, M.kerb, M.kerb]);
  pave.position.set(0, 0, WALLZ + 0.65); add(pave);
  box(W, 0.1, 0.12, M.kerb, 0, -0.02, WALLZ + 1.21);

  // ---------- Walls ----------
  part('walls');
  var sideM = brickMat(D / BRICK, H / BRICK), faceM = brickMat(W / BRICK, H / BRICK), plain = std(0xcdb88f, 0.95);
  add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [sideM, sideM, plain, plain, faceM, faceM])).position.set(0, H / 2, 0);
  function gableGeo(x) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, E, FRONT, x, E, -FRONT, x, RT - 0.02, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([FRONT / BRICK, 0, -FRONT / BRICK, 0, 0, (RT - E) / BRICK], 2));
    g.computeVertexNormals(); return g;
  }
  var gm = brickMat(1, 1); gm.side = THREE.DoubleSide;
  add(new THREE.Mesh(gableGeo(W / 2), gm)); add(new THREE.Mesh(gableGeo(-W / 2), gm));
  box(W + 0.02, 0.07, 0.06, M.stucco, 0, 2.02, FRONT + 0.03);
  cyl(0.035, 0.035, E, M.iron, -W / 2 + 0.08, E / 2, FRONT + 0.08);
  box(0.12, 0.12, 0.12, M.iron, -W / 2 + 0.08, E - 0.12, FRONT + 0.1);

  // ---------- Roof ----------
  part('roof');
  var ov = 0.14, hw = W / 2 + 0.03, zf = FRONT + ov, zb = -FRONT - ov, slopeLen = Math.hypot(zf, RT - E);
  (function () {
    var P = { FL: [-hw, E, zf], FR: [hw, E, zf], RL: [-hw, RT, 0], RR: [hw, RT, 0], BL: [-hw, E, zb], BR: [hw, E, zb] };
    var tris = [['FL','FR','RR'],['FL','RR','RL'],['BR','BL','RL'],['BR','RL','RR']], pos = [], uv = [];
    tris.forEach(function (t) { t.forEach(function (k) { var p = P[k]; pos.push(p[0], p[1], p[2]); uv.push(p[0] / 0.5, (p[1] > E ? slopeLen : 0) / 0.32); }); });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    var st = slateTex.clone(); st.needsUpdate = true;
    add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: st, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide })));
  })();
  box(W + 0.1, 0.06, 0.1, M.recess, 0, RT + 0.01, 0);
  var gutter = cyl(0.055, 0.055, W + 0.1, M.iron, 0, E - 0.02, zf + 0.02); gutter.rotation.z = Math.PI / 2;
  box(W + 0.06, 0.12, 0.04, M.white, 0, E - 0.02, zf - 0.03);

  // ---------- Chimneys and pots ----------
  part('chimneys');
  var TOP = RT + 0.55;
  [-1, 1].forEach(function (s) {
    var cx = s * (W / 2 - 0.3);
    box(0.55, 1.2, 0.75, brickMat(0.55 / BRICK, 1.2 / BRICK), cx, TOP - 0.6, 0);
    box(0.65, 0.08, 0.85, M.stone, cx, TOP + 0.04, 0);
  });
  part('pots');
  [-1, 1].forEach(function (s) {
    var cx = s * (W / 2 - 0.3);
    [-0.16, 0, 0.16].forEach(function (o, i) { cyl(0.055, 0.075, 0.26 + (i % 2) * 0.05, M.pot, cx + o, TOP + 0.21 + (i % 2) * 0.025, 0); });
  });

  // ---------- Windows ----------
  function sash(cx, cy, w, h, zfc, parent, shutters, noHood) {
    var p = parent || cur;
    box(w + 0.16, h + 0.14, 0.05, M.stucco, cx, cy, zfc + 0.025, p);
    box(w, h, 0.02, M.glass, cx, cy, zfc + 0.055, p);
    var fz = zfc + 0.07;
    box(0.04, h, 0.03, M.white, cx - w / 2 + 0.02, cy, fz, p); box(0.04, h, 0.03, M.white, cx + w / 2 - 0.02, cy, fz, p);
    box(w, 0.045, 0.03, M.white, cx, cy + h / 2 - 0.022, fz, p); box(w, 0.06, 0.03, M.white, cx, cy - h / 2 + 0.03, fz, p);
    box(w, 0.04, 0.035, M.white, cx, cy + (shutters ? h * 0.22 : 0), fz + 0.004, p);
    if (!shutters) box(0.022, h, 0.025, M.white, cx, cy, fz, p);
    if (shutters) {
      var sh = h * 0.72 - 0.08, sy = cy - h / 2 + 0.06 + sh / 2;
      box(w - 0.08, sh, 0.02, M.shutter, cx, sy, fz - 0.005, p);
      for (var yy = sy - sh / 2 + 0.03; yy < sy + sh / 2 - 0.02; yy += 0.032) box(w - 0.1, 0.008, 0.012, M.slat, cx, yy, fz + 0.006, p);
      box(0.02, sh, 0.02, M.white, cx, sy, fz + 0.01, p);
    }
    box(w + 0.24, 0.05, 0.14, M.stone, cx, cy - h / 2 - 0.095, zfc + 0.07, p);
    if (!noHood) {
      box(w + 0.3, 0.06, 0.15, M.stucco, cx, cy + h / 2 + 0.15, zfc + 0.075, p);
      box(w + 0.22, 0.05, 0.1, M.stucco, cx, cy + h / 2 + 0.1, zfc + 0.05, p);
      box(0.05, 0.13, 0.09, M.stucco, cx - w / 2 - 0.1, cy + h / 2 + 0.04, zfc + 0.045, p);
      box(0.05, 0.13, 0.09, M.stucco, cx + w / 2 + 0.1, cy + h / 2 + 0.04, zfc + 0.045, p);
    }
  }
  part('windows');
  sash(DX, 2.7, 0.56, 0.92, FRONT);
  sash(0.62, 2.7, 0.62, 0.92, FRONT);

  // ---------- Bay ----------
  part('bay');
  var bx = 0.62, fw = 1.0, p = 0.58, ang = THREE.MathUtils.degToRad(60), bwh = fw / 2 + p / Math.tan(ang);
  function trap(g, y0, h, mat) {
    var s = new THREE.Shape();
    s.moveTo(bx - bwh - g * 0.6, -(FRONT - 0.005)); s.lineTo(bx - fw / 2 - g * 0.55, -(FRONT + p + g));
    s.lineTo(bx + fw / 2 + g * 0.55, -(FRONT + p + g)); s.lineTo(bx + bwh + g * 0.6, -(FRONT - 0.005)); s.lineTo(bx - bwh - g * 0.6, -(FRONT - 0.005));
    var geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0);
    return add(new THREE.Mesh(geo, mat));
  }
  trap(0, 0.02, 1.62, M.stucco); trap(0.035, 0.02, 0.1, M.stone); trap(0.06, 1.6, 0.1, M.stucco); trap(0.1, 1.7, 0.06, M.stucco);
  [{ cx: bx, cz: FRONT + p, ry: 0, len: fw },
   { cx: bx - (fw / 2 + bwh) / 2, cz: FRONT + p / 2, ry: -ang, len: p / Math.sin(ang) },
   { cx: bx + (fw / 2 + bwh) / 2, cz: FRONT + p / 2, ry: ang, len: p / Math.sin(ang) }].forEach(function (f) {
    var g = new THREE.Group(); g.position.set(f.cx, 0, f.cz); g.rotation.y = f.ry; cur.add(g);
    sash(0, 1.02, f.len - 0.22, 0.98, 0, g, true, true);
  });
  [[bx - fw / 2, FRONT + p], [bx + fw / 2, FRONT + p], [bx - bwh, FRONT + 0.02], [bx + bwh, FRONT + 0.02]].forEach(function (c) {
    cyl(0.045, 0.05, 1.05, M.white, c[0], 1.02, c[1] + 0.02);
    box(0.13, 0.08, 0.13, M.stucco, c[0], 1.58, c[1] + 0.02); box(0.12, 0.1, 0.12, M.stucco, c[0], 0.45, c[1] + 0.02);
  });

  part('bayRoof');
  (function () {
    var g = 0.12, y0 = 1.76, yt = 2.2;
    var BL = [bx - bwh - g, y0, FRONT], FL = [bx - fw / 2 - g, y0, FRONT + p + g], FR = [bx + fw / 2 + g, y0, FRONT + p + g], BR = [bx + bwh + g, y0, FRONT];
    var TL = [bx - bwh * 0.45, yt, FRONT], TR = [bx + bwh * 0.45, yt, FRONT];
    var tris = [FL, FR, TR, FL, TR, TL, BL, FL, TL, FR, BR, TR], pos = [], uv = [];
    tris.forEach(function (v) { pos.push(v[0], v[1], v[2]); uv.push((v[0] + v[2]) * 2.2, (v[1] - y0) * 9 + (FRONT + p + g - v[2]) * 2); });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    var tt = tileTex.clone(); tt.needsUpdate = true;
    add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tt, roughness: 0.75, side: THREE.DoubleSide })));
  })();

  // ---------- Porch, door, lantern ----------
  part('porch');
  var DB = 0.18;
  box(0.95, 0.09, 0.22, M.stone, DX, 0.045, FRONT + 0.26); box(0.95, 0.09, 0.22, M.stone, DX, 0.135, FRONT + 0.1);
  box(0.62, 1.42, 0.02, M.hall, DX, DB + 0.71, FRONT + 0.005);
  box(0.52, 0.04, 0.04, M.white, DX, DB + 1.14, FRONT + 0.035);
  box(0.5, 0.2, 0.02, M.glass, DX, DB + 1.26, FRONT + 0.02);
  box(0.02, 0.2, 0.03, M.white, DX - 0.12, DB + 1.26, FRONT + 0.035); box(0.02, 0.2, 0.03, M.white, DX + 0.12, DB + 1.26, FRONT + 0.035);
  [-1, 1].forEach(function (s) {
    var px = DX + s * 0.37;
    box(0.13, 1.44, 0.1, M.stucco, px, DB + 0.72, FRONT + 0.05); box(0.17, 0.18, 0.13, M.stucco, px, DB + 0.09, FRONT + 0.065); box(0.19, 0.1, 0.14, M.stucco, px, DB + 1.47, FRONT + 0.07);
  });
  box(0.96, 0.2, 0.13, M.stucco, DX, DB + 1.62, FRONT + 0.065); box(1.08, 0.07, 0.21, M.stucco, DX, DB + 1.755, FRONT + 0.105); box(0.98, 0.04, 0.16, M.stucco, DX, DB + 1.81, FRONT + 0.08);
  // Porch lantern
  box(0.1, 0.16, 0.1, M.lamp, DX - 0.6, 1.35, FRONT + 0.1); box(0.13, 0.03, 0.13, M.iron, DX - 0.6, 1.445, FRONT + 0.1); box(0.03, 0.03, 0.08, M.iron, DX - 0.6, 1.35, FRONT + 0.03);
  var porchLight = new THREE.PointLight(0xFFB45E, 0, 3.2, 2); porchLight.position.set(DX - 0.6, 1.35, FRONT + 0.35); cur.add(porchLight);

  part('door');
  box(0.52, 1.12, 0.05, M.navy, DX, DB + 0.56, FRONT + 0.03);
  [[-0.12, 0.83, 0.42], [0.12, 0.83, 0.42], [-0.12, 0.3, 0.32], [0.12, 0.3, 0.32]].forEach(function (q) { box(0.17, q[2], 0.02, M.navyDark, DX + q[0], DB + q[1], FRONT + 0.064); });
  box(0.17, 0.04, 0.02, M.brass, DX, DB + 0.58, FRONT + 0.068);
  var knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), M.brass); knob.position.set(DX + 0.17, DB + 0.55, FRONT + 0.075); add(knob);
  var knock = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 8, 20), M.brass); knock.position.set(DX, DB + 0.86, FRONT + 0.075); add(knock);
  var hallLight = new THREE.PointLight(0xFFB45E, 0, 2.6, 2); hallLight.position.set(DX, 0.9, FRONT + 0.4); parts.porch.add(hallLight);
  var hinge = new THREE.Vector3(DX - 0.26, 0, FRONT + 0.03);
  parts.door.children.forEach(function (c) { c.position.sub(hinge); }); parts.door.position.copy(hinge);

  // ---------- Front wall, railings, gate ----------
  part('wall');
  var WH = 0.5, WT = 0.2;
  function wallSeg(x0, x1) { var w = x1 - x0; box(w, WH, WT, brickMat(w / BRICK, WH / BRICK), (x0 + x1) / 2, WH / 2, WALLZ); box(w + 0.02, 0.05, WT + 0.06, M.stone, (x0 + x1) / 2, WH + 0.025, WALLZ); }
  function pier(x) { box(0.26, 0.74, 0.26, brickMat(0.26 / BRICK, 0.74 / BRICK), x, 0.37, WALLZ); box(0.32, 0.06, 0.32, M.stone, x, 0.77, WALLZ); box(0.2, 0.05, 0.2, M.stone, x, 0.825, WALLZ); }
  var gL = DX - 0.42, gR = DX + 0.42;
  pier(gL - 0.13); pier(gR + 0.13); pier(W / 2 - 0.13); wallSeg(gR + 0.26, W / 2 - 0.26);
  [-1, 1].forEach(function (s) {
    box(0.14, WH * 0.9, gd - 0.1, brickMat((gd - 0.1) / BRICK, WH / BRICK), s * (W / 2 - 0.07), WH * 0.45, FRONT + (gd - 0.1) / 2);
    box(0.18, 0.04, gd - 0.1, M.stone, s * (W / 2 - 0.07), WH * 0.9 + 0.02, FRONT + (gd - 0.1) / 2);
  });
  part('railings');
  var r0 = gR + 0.3, r1 = W / 2 - 0.3, ry0 = WH + 0.05, ry1 = WH + 0.42;
  for (var x = r0; x <= r1 + 0.001; x += 0.075) box(0.016, ry1 - ry0, 0.016, M.iron, x, (ry0 + ry1) / 2, WALLZ);
  box(r1 - r0 + 0.02, 0.025, 0.03, M.iron, (r0 + r1) / 2, ry1, WALLZ); box(r1 - r0 + 0.02, 0.02, 0.025, M.iron, (r0 + r1) / 2, ry0 + 0.04, WALLZ);
  for (var x2 = r0 + 0.0375; x2 < r1; x2 += 0.075) { var ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 18), M.iron); ring.position.set(x2, ry1 - 0.06, WALLZ); add(ring); }
  var gy0 = 0.08, gy1 = 0.78;
  box(0.03, gy1 - gy0, 0.03, M.iron, gL + 0.02, (gy0 + gy1) / 2, WALLZ); box(0.03, gy1 - gy0, 0.03, M.iron, gR - 0.02, (gy0 + gy1) / 2, WALLZ);
  for (var gx = gL + 0.09; gx < gR - 0.05; gx += 0.07) box(0.014, gy1 - gy0, 0.014, M.iron, gx, (gy0 + gy1) / 2, WALLZ);
  box(gR - gL, 0.025, 0.025, M.iron, DX, gy0 + 0.04, WALLZ); box(gR - gL, 0.025, 0.025, M.iron, DX, gy1 - 0.12, WALLZ); box(gR - gL, 0.025, 0.025, M.iron, DX, gy1, WALLZ);
  var arch = new THREE.Mesh(new THREE.TorusGeometry((gR - gL) / 2 - 0.02, 0.013, 8, 32, Math.PI), M.iron); arch.scale.set(1, 0.3, 1); arch.position.set(DX, gy1, WALLZ); add(arch);
  for (var gx2 = gL + 0.125; gx2 < gR - 0.08; gx2 += 0.07) { var gr = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 18), M.iron); gr.position.set(gx2, gy1 - 0.06, WALLZ); add(gr); }

  // ---------- Planting and ivy ----------
  part('plants');
  cyl(0.11, 0.08, 0.24, M.potGrey, -0.32, 0.17, FRONT + 0.28);
  cyl(0.012, 0.012, 0.2, M.pot, -0.32, 0.38, FRONT + 0.28);
  var ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 2), M.leaf); ball.position.set(-0.32, 0.6, FRONT + 0.28); add(ball);
  [0.0, 0.45, 0.9, 1.3].forEach(function (x, i) { var sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 + (i % 2) * 0.03, 1), M.leaf); sh.position.set(x, 0.17, WALLZ - 0.28); add(sh); });
  part('ivy');
  var IVY = 190, ivy;
  (function () {
    ivy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), IVY);
    var list = [];
    for (var i = 0; i < IVY; i++) {
      var t = rnd(), y = 1.85 + t * 1.45, spread = 0.1 + 0.12 * Math.pow(Math.sin(t * 9), 2);
      list.push({ y: y, x: W / 2 - 0.16 + (rnd() - 0.5) * spread * 2, z: FRONT + 0.03 + rnd() * 0.07, s: 0.025 + rnd() * 0.03, e: new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3), c: new THREE.Color().setHSL(0.26 + rnd() * 0.05, 0.3 + rnd() * 0.15, 0.16 + rnd() * 0.1) });
    }
    list.sort(function (a, b) { return a.y - b.y; });
    var m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    list.forEach(function (l, i) { q.setFromEuler(l.e); m4.compose(new THREE.Vector3(l.x, l.y, l.z), q, new THREE.Vector3(l.s, l.s, l.s)); ivy.setMatrixAt(i, m4); ivy.setColorAt(i, l.c); });
    ivy.castShadow = true; cur.add(ivy);
  })();

  // ---------- Street lamp ----------
  part('lamp');
  var LX = -W / 2 + 0.12, LZ = WALLZ + 1.0;
  cyl(0.045, 0.07, 0.18, M.iron, LX, 0.09, LZ); cyl(0.028, 0.035, 2.5, M.iron, LX, 1.3, LZ);
  box(0.2, 0.28, 0.2, M.lamp, LX, 2.66, LZ); box(0.28, 0.04, 0.28, M.iron, LX, 2.82, LZ);
  var cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 4), M.iron); cone.rotation.y = Math.PI / 4; cone.position.set(LX, 2.91, LZ); add(cone);
  box(0.24, 0.03, 0.24, M.iron, LX, 2.51, LZ);
  var streetLight = new THREE.PointLight(0xFFC26B, 0, 7, 2); streetLight.position.set(LX, 2.55, LZ); cur.add(streetLight);

  // ---------- SOLD board ----------
  part('board');
  (function () {
    var c = document.createElement('canvas'); c.width = 512; c.height = 320; var g = c.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 512, 320);
    g.fillStyle = '#073B70'; g.fillRect(0, 0, 512, 12); g.fillRect(0, 308, 512, 12);
    g.fillStyle = '#00A7B5'; g.fillRect(0, 240, 512, 68);
    g.fillStyle = '#073B70'; g.font = '800 170px Manrope, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SOLD', 256, 130);
    var t = new THREE.CanvasTexture(c); t.anisotropy = ANISO;
    var face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    box(0.06, 1.55, 0.06, M.white, 1.12, 0.78, 2.72);
    var b = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.55, 0.03), [M.white, M.white, M.white, M.white, face, M.white]);
    b.position.set(1.12, 1.52, 2.76); add(b);
  })();

  var catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.12 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = -0.07; catcher.receiveShadow = true; house.add(catcher);


  parts.board.visible = false;

  // ---------- Blueprint twin (layer 1): navy fill with clean architectural linework ----------
  var bpFill = new THREE.MeshBasicMaterial({ color: 0x0B3A6E, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide });
  var bpLine = new THREE.LineBasicMaterial({ color: 0x9BEFF2, transparent: true, opacity: 0.95 });
  var bpLineDim = new THREE.LineBasicMaterial({ color: 0x4FC9D3, transparent: true, opacity: 0.55 });
  var meshes = [];
  house.traverse(function (o) { if (o.isMesh && !o.isInstancedMesh && !(o.material && o.material.isShadowMaterial)) meshes.push(o); });
  meshes.forEach(function (m) {
    var f = new THREE.Mesh(m.geometry, bpFill); f.layers.set(1); m.add(f);
    var big = m.geometry.boundingSphere || (m.geometry.computeBoundingSphere(), m.geometry.boundingSphere);
    var e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 28), big.radius > 0.6 ? bpLine : bpLineDim); e.layers.set(1); m.add(e);
  });
  // Brick coursing hint on the facade in blueprint
  (function () {
    var pts = [];
    for (var y = 0.35; y < H; y += 0.35) { pts.push(-W / 2, y, FRONT + 0.004, W / 2, y, FRONT + 0.004); pts.push(W / 2 + 0.004, y, FRONT, W / 2 + 0.004, y, -FRONT); }
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    var l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2E7FA8, transparent: true, opacity: 0.5 })); l.layers.set(1); parts.walls.add(l);
  })();

  // ---------- Pieces that pull apart near the lens ----------
  var PULL = { roof: [0, 1, 0, 0.34], chimneys: [0, 1, 0, 0.32], pots: [0, 1, 0, 0.5], windows: [0, 0.05, 1, 0.34],
    bay: [0.15, 0, 1, 0.3], bayRoof: [0.1, 0.8, 0.6, 0.38], porch: [0, 0, 1, 0.26], door: [0, 0, 1, 0.34],
    wall: [0, 0, 1, 0.22], railings: [0, 0.3, 1, 0.3], plants: [0, 1, 0.3, 0.3] };
  var pieces = [], pullBroken = false;
  function resetPieces() { pieces.forEach(function (P) { P.cur = 0; P.o.position.copy(P.p0); P.o.rotation.copy(P.r0); }); }
  function initPieces() {
    house.updateMatrixWorld(true);
    var inv = new THREE.Matrix4();
    Object.keys(PULL).forEach(function (pn) {
      var cfg = PULL[pn], dirH = new THREE.Vector3(cfg[0], cfg[1], cfg[2]).normalize();
      parts[pn].traverse(function (o) {
        if (!o.isMesh || o.isInstancedMesh || o.layers.mask !== 1) return;
        var g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        var c = o.localToWorld(g.boundingSphere.center.clone()); house.worldToLocal(c);
        var s = new THREE.Vector3(); o.getWorldScale(s);
        // direction expressed in the parent's own frame
        var pm = new THREE.Matrix4().extractRotation(o.parent.matrixWorld), hm = new THREE.Matrix4().extractRotation(house.matrixWorld);
        var dirL = dirH.clone().applyMatrix4(hm).applyMatrix4(pm.transpose()).normalize();
        if (!isFinite(dirL.x) || !isFinite(dirL.y) || !isFinite(dirL.z)) dirL.copy(dirH);
        var r = 0.5 + rnd() * 0.9;
        pieces.push({ o: o, p0: o.position.clone(), r0: o.rotation.clone(), anchor: c, rad: g.boundingSphere.radius * Math.max(s.x, s.y, s.z),
          dir: dirL, mag: cfg[3] * r, spin: (g.boundingSphere.radius * Math.max(s.x, s.y, s.z) > 0.45) ? 0 : (rnd() - 0.5) * (pn === 'pots' ? 1.2 : 0.25), cur: 0 });
      });
    });
  }

  // ---------- Loose bricks that pop out around the lens ----------
  var bricks = [], brickMesh, brickBlue, BR_W = 0.17, BR_H = 0.036, BR_D = 0.06;
  function initBricks() {
    var holes = [[DX - 0.42, DX + 0.42, 2.08, 3.42], [0.17, 1.07, 2.08, 3.42], [DX - 0.58, DX + 0.58, -1, 2.08], [bx - bwh - 0.1, bx + bwh + 0.1, -1, 2.35], [-9, 9, 1.96, 2.08], [-1.52, -1.34, -1, 9]];
    function free(x, y) { for (var i = 0; i < holes.length; i++) { var h = holes[i]; if (x > h[0] - BR_W / 2 && x < h[1] + BR_W / 2 && y > h[2] - BR_H && y < h[3] + BR_H) return false; } return true; }
    var course = BRICK / 16, len = BRICK / 4;
    for (var row = 0, y = 0.06 + course / 2; y < H - 0.02; row++, y += course) {
      var off = (row % 2) * len / 2;
      for (var x = -W / 2 + len / 2 - off; x < W / 2; x += len) {
        if (x < -W / 2 + 0.06 || x > W / 2 - 0.06) continue;
        if (free(x, y)) bricks.push({ p: new THREE.Vector3(x, y, FRONT - BR_D / 2 - 0.003), n: new THREE.Vector3(0, 0, 1), side: 0 });
      }
      for (var z = -D / 2 + len / 2 - off; z < D / 2; z += len) {
        if (z < -D / 2 + 0.06 || z > D / 2 - 0.06) continue;
        bricks.push({ p: new THREE.Vector3(W / 2 - BR_D / 2 - 0.003, y, z), n: new THREE.Vector3(1, 0, 0), side: 1 });
      }
    }
    var geo = new THREE.BoxGeometry(BR_W, BR_H, BR_D);
    brickMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.92 }), bricks.length);
    brickMesh.castShadow = true; brickMesh.receiveShadow = true;
    brickBlue = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x1F5E9E }), bricks.length);
    brickBlue.layers.set(1);
    var col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    bricks.forEach(function (b, i) {
      b.cur = 0; b.mag = 0.12 + rnd() * 0.32; b.drift = new THREE.Vector3((rnd() - 0.5) * 0.12, (rnd() - 0.3) * 0.12, (rnd() - 0.5) * 0.12);
      b.rot = new THREE.Vector3((rnd() - 0.5) * 1.4, (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 1.0);
      if (b.side) { var t = b.p.z; b.q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); } else b.q = new THREE.Quaternion();
      var hue = 38 + rnd() * 8, sat = 30 + rnd() * 18, lit = 54 + rnd() * 12; if (rnd() < 0.14) { lit -= 16; hue -= 8; }
      col.setHSL(hue / 360, sat / 100, lit / 100); brickMesh.setColorAt(i, col);
      m4.compose(b.p, b.q, one); brickMesh.setMatrixAt(i, m4); brickBlue.setMatrixAt(i, m4);
    });
    parts.walls.add(brickMesh); parts.walls.add(brickBlue);
  }

  // Cost labels, visible only through the lens
  function label(text, pos) {
    var fs = 40, pad = 24, h = 86, mc = document.createElement('canvas').getContext('2d');
    mc.font = '700 ' + fs + 'px Manrope, Arial, sans-serif';
    var w = Math.ceil(mc.measureText(text).width) + pad * 2 + 30;
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d');
    g.fillStyle = '#20D5D0'; var r = 16;
    g.beginPath(); g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r); g.lineTo(w, h - r); g.quadraticCurveTo(w, h, w - r, h); g.lineTo(r, h); g.quadraticCurveTo(0, h, 0, h - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.fill();
    g.fillStyle = '#062A52'; g.beginPath(); g.arc(pad + 6, h / 2, 7, 0, Math.PI * 2); g.fill();
    g.font = '700 ' + fs + 'px Manrope, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText(text, pad + 24, h / 2 + 2);
    var t = new THREE.CanvasTexture(c); t.anisotropy = ANISO;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.renderOrder = 20;
    var sh = 0.3; s.scale.set(sh * w / h, sh, 1); s.position.copy(pos); s.layers.set(1); house.add(s);
  }

  // ---------- Two render passes composited through a fluid mask ----------
  var isGL2 = renderer.capabilities.isWebGL2;
  function makeRT() { var o = { format: THREE.RGBAFormat }; return isGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(1, 1, o) : new THREE.WebGLRenderTarget(1, 1, o); }
  var rtBase = makeRT(), rtBlue = makeRT();
  var maskCanvas = document.createElement('canvas'), mg = maskCanvas.getContext('2d');
  var maskTex = new THREE.CanvasTexture(maskCanvas); maskTex.minFilter = THREE.LinearFilter;
  var quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var comp = new THREE.ShaderMaterial({
    uniforms: { tBase: { value: rtBase.texture }, tBlue: { value: rtBlue.texture }, tMask: { value: maskTex } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tBase, tBlue, tMask; varying vec2 vUv;',
      'void main(){',
      '  vec4 a = texture2D(tBase, vUv); vec4 b = texture2D(tBlue, vUv);',
      '  float m = smoothstep(0.08, 0.6, texture2D(tMask, vUv).r);',
      '  vec4 o = mix(a, b, m);',
      '  float rim = smoothstep(0.0, 0.5, m) * (1.0 - smoothstep(0.5, 1.0, m)) * 2.0;',
      '  o.rgb = mix(o.rgb, vec3(0.125, 0.835, 0.816) * o.a, 0.55 * rim * max(a.a, b.a));',
      '  gl_FragColor = o;',
      '}'].join('\n'),
    depthTest: false, depthWrite: false, blending: THREE.NoBlending
  });
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp));

  var camDir = new THREE.Vector3(0.42, 0.16, 0.89).normalize(), target = new THREE.Vector3();
  // Corners of every visible solid mesh in house space, projected to find the house's on-screen box.
  var hull = [];
  function buildHull() {
    house.updateMatrixWorld(true);
    var inv = new THREE.Matrix4().copy(house.matrixWorld).invert(), m = new THREE.Matrix4();
    house.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || o.layers.mask !== 1 || o === catcher) return;
      for (var a = o; a && a !== house; a = a.parent) if (!a.visible) return;
      var g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
      var bb = g.boundingBox; m.multiplyMatrices(inv, o.matrixWorld);
      for (var i = 0; i < 8; i++) hull.push(new THREE.Vector3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(m));
    });
  }
  function projectHull(w, h) {
    house.updateMatrixWorld(true); camera.updateMatrixWorld();
    var v = new THREE.Vector3(), box = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    hull.forEach(function (p) {
      v.copy(p).applyMatrix4(house.matrixWorld).project(camera);
      var sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      box.left = Math.min(box.left, sx); box.right = Math.max(box.right, sx); box.top = Math.min(box.top, sy); box.bottom = Math.max(box.bottom, sy);
    });
    return box;
  }
  function placeCamera(dist) {
    camera.position.copy(target).addScaledVector(camDir, dist); camera.lookAt(target); camera.near = dist * 0.55; camera.far = dist * 1.6; camera.updateProjectionMatrix();
  }
  function panCamera(dx, dy, dist, h) {
    camera.updateMatrixWorld();
    var ppu = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist);
    var move = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-dx / ppu)
      .add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(dy / ppu));
    target.add(move); camera.position.add(move);
  }

  var drift = { x: 0.56, y: 0.47, s: 1 };
  function layout() {
    var w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2));
    var aspect = w / h, dpr = renderer.getPixelRatio();
    renderer.setSize(w, h, false);
    rtBase.setSize(w * dpr, h * dpr); rtBlue.setSize(w * dpr, h * dpr);
    camera.aspect = aspect;
    var dist = aspect < 0.8 ? 27 : 17.5;
    target.set(aspect < 0.8 ? -0.2 : -0.9, aspect < 0.8 ? 0.2 : 0.55, 0);
    placeCamera(dist);
    drift.x = aspect < 0.8 ? 0.5 : 0.56; drift.y = aspect < 0.8 ? 0.42 : 0.47; drift.s = 1;
    var safe = options.getSafeRect && options.getSafeRect();
    if (safe && hull.length) {
      var ry = house.rotation.y; house.rotation.y = 0.12 + tilt;
      var base = projectHull(w, h), s = fitScale(base, safe);
      if (s < 1) { dist /= s; placeCamera(dist); }
      for (var i = 0; i < 3; i++) {
        var d = shiftInto(projectHull(w, h), safe);
        if (Math.abs(d.dx) < 0.5 && Math.abs(d.dy) < 0.5) break;
        panCamera(d.dx, d.dy, dist, h);
      }
      var fitted = projectHull(w, h);
      drift.x += ((fitted.left + fitted.right) - (base.left + base.right)) / 2 / w;
      drift.y += ((fitted.top + fitted.bottom) - (base.top + base.bottom)) / 2 / h;
      drift.s = s;
      house.rotation.y = ry;
    }
    var mw = 360; maskCanvas.width = mw; maskCanvas.height = Math.round(mw / aspect);
    mg.fillStyle = '#000'; mg.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  }

  // ---------- Lens input (mouse and pen only; touch gets the idle drift) ----------
  var ptr = { x: -1, y: -1, active: false, last: 0 }, lens = { x: 0.5, y: 0.5 }, prev = null;
  function setPtr(e) {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var r = hero.getBoundingClientRect(); ptr.x = (e.clientX - r.left) / r.width; ptr.y = (e.clientY - r.top) / r.height; ptr.active = true; ptr.last = performance.now(); dotEl.style.left = (e.clientX - r.left) + 'px'; dotEl.style.top = (e.clientY - r.top) + 'px';
  }
  function clearPtr() { ptr.active = false; }
  hero.addEventListener('pointermove', setPtr);
  hero.addEventListener('pointerdown', setPtr);
  hero.addEventListener('pointerleave', clearPtr);

  function stamp(x, y, rad, alpha) {
    var mw = maskCanvas.width, mh = maskCanvas.height, px = x * mw, py = y * mh, R = rad * mh;
    var g = mg.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, 'rgba(255,255,255,' + alpha + ')'); g.addColorStop(0.62, 'rgba(255,255,255,' + alpha * 0.92 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    mg.fillStyle = g; mg.beginPath(); mg.arc(px, py, R, 0, Math.PI * 2); mg.fill();
  }

  var clock = new THREE.Clock(), tilt = 0, mobile = false;
  function frame() {
    var t = clock.getElapsedTime();
    var w = hero.clientWidth, h = hero.clientHeight; mobile = w / h < 0.8;
    var idle = !ptr.active || performance.now() - ptr.last > 2600;
    var gx, gy;
    if (idle) { gx = drift.x + (mobile ? 0.2 : 0.09) * drift.s * Math.sin(t * 0.55); gy = drift.y + 0.2 * drift.s * Math.sin(t * 0.83 + 0.6); }
    else { gx = ptr.x; gy = ptr.y; }
    lens.x += (gx - lens.x) * (idle ? 0.06 : 0.22); lens.y += (gy - lens.y) * (idle ? 0.06 : 0.22);
    // fade the trail, then stamp along the path for a fluid wake
    mg.globalCompositeOperation = 'source-over'; mg.fillStyle = 'rgba(0,0,0,0.075)'; mg.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    var rad = mobile ? 0.1 : 0.15;
    if (prev) { var steps = 6; for (var i = 1; i <= steps; i++) { var k = i / steps; stamp(prev.x + (lens.x - prev.x) * k, prev.y + (lens.y - prev.y) * k, rad * (0.92 + 0.08 * Math.sin(t * 3 + k)), 0.5); } }
    prev = { x: lens.x, y: lens.y };
    maskTex.needsUpdate = true;
    var R = rad * h * 2 * 0.86;
    lensEl.style.width = lensEl.style.height = R + 'px';
    lensEl.style.left = lens.x * w + 'px'; lensEl.style.top = lens.y * h + 'px';
    lensEl.style.opacity = 1;
    // gentle tilt toward the lens
    tilt += ((lens.x - 0.55) * 0.35 - tilt) * 0.04;
    house.rotation.y = 0.12 + tilt + 0.04 * Math.sin(t * 0.3);
    // pull pieces and bricks apart around the lens, and let them settle back
    if (!pullBroken && pieces.length) { try {
    var dt = Math.max(0, Math.min(0.05, t - (frame.prevT || t))); frame.prevT = t;
    var kIn = 1 - Math.exp(-dt * 9), kOut = 1 - Math.exp(-dt * 3.2);
    var Rs = rad * h * 0.86, lx = lens.x * w, ly = lens.y * h, pxPerUnit = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(target));
    house.updateMatrixWorld(true);
    var pv = frame.pv || (frame.pv = new THREE.Vector3());
    function influence(localPt, extra) {
      pv.copy(localPt).applyMatrix4(house.matrixWorld).project(camera);
      var sx = (pv.x * 0.5 + 0.5) * w, sy = (-pv.y * 0.5 + 0.5) * h;
      var d = Math.max(0, Math.hypot(sx - lx, sy - ly) - extra);
      if (!(Rs > 0) || !isFinite(sx) || !isFinite(sy)) return 0;
      var a = Rs * 0.55, b = Rs * 1.55; return d <= a ? 1 : d >= b ? 0 : 1 - (d - a) / (b - a);
    }
    pieces.forEach(function (P) {
      var inf = influence(P.anchor, Math.min(P.rad * pxPerUnit * 0.6, Rs));
      var tgt = inf * inf * (3 - 2 * inf); if (!isFinite(tgt)) tgt = 0;
      P.cur += (tgt - P.cur) * (tgt > P.cur ? kIn : kOut); if (!isFinite(P.cur)) P.cur = 0;
      P.o.position.copy(P.p0).addScaledVector(P.dir, P.cur * P.mag);
      P.o.rotation.set(P.r0.x + P.spin * P.cur * 0.6, P.r0.y, P.r0.z + P.spin * P.cur);
    });
    var bm = frame.bm || (frame.bm = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), one: new THREE.Vector3(1, 1, 1) });
    var dirty = false;
    for (var bi = 0; bi < bricks.length; bi++) {
      var B = bricks[bi], inf2 = influence(B.p, 0), tg = inf2 * inf2 * (3 - 2 * inf2); if (!isFinite(tg)) tg = 0;
      if (tg < 0.002 && B.cur < 0.002) { if (B.cur !== 0) { B.cur = 0; dirty = true; bm.m.compose(B.p, B.q, bm.one); brickMesh.setMatrixAt(bi, bm.m); brickBlue.setMatrixAt(bi, bm.m); } continue; }
      B.cur += (tg - B.cur) * (tg > B.cur ? kIn : kOut);
      var c = B.cur;
      bm.v.copy(B.p).addScaledVector(B.n, c * B.mag).addScaledVector(B.drift, c);
      bm.e.set(B.rot.x * c, B.rot.y * c, B.rot.z * c); bm.q.setFromEuler(bm.e).premultiply(B.q);
      if (!isFinite(c)) { B.cur = 0; continue; }
      bm.m.compose(bm.v, bm.q, bm.one); brickMesh.setMatrixAt(bi, bm.m); brickBlue.setMatrixAt(bi, bm.m); dirty = true;
    }
    if (dirty) { brickMesh.instanceMatrix.needsUpdate = true; brickBlue.instanceMatrix.needsUpdate = true; }
    } catch (err) { pullBroken = true; resetPieces(); if (window.console) console.warn('Pull-apart effect disabled:', err); }
    }
    camera.layers.set(0); renderer.setRenderTarget(rtBase); renderer.clear(); renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = false;
    camera.layers.set(1); renderer.setRenderTarget(rtBlue); renderer.clear(); renderer.render(scene, camera);
    renderer.shadowMap.autoUpdate = true;
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(quadScene, quadCam);
  }

  house.position.set(0, -2.2, -1.1);

  var alive = true, disposed = false, started = false, running = false, onScreen = true, rafId = 0, fontTimer = 0;
  function loop() { rafId = 0; if (!running) return; frame(); rafId = requestAnimationFrame(loop); }
  function sync() {
    var should = started && alive && onScreen && document.visibilityState !== 'hidden';
    if (should && !running) { running = true; rafId = requestAnimationFrame(loop); }
    else if (!should && running) { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
  }
  function fail(err) {
    alive = false; sync();
    lensEl.style.opacity = '';
    if (err && window.console) console.warn('X-ray hero disabled:', err);
    if (options.onFail) options.onFail();
  }
  function onLost() { fail(); }

  var ro = new ResizeObserver(function () { if (!started) return; layout(); if (running) frame(); });
  ro.observe(hero);
  (options.watch || []).forEach(function (el) { ro.observe(el); });
  var io = new IntersectionObserver(function (es) { onScreen = es[es.length - 1].isIntersecting; sync(); });
  io.observe(hero);
  document.addEventListener('visibilitychange', sync);
  glCanvas.addEventListener('webglcontextlost', onLost);

  var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('700 40px Manrope').catch(function () {}) : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { fontTimer = setTimeout(r, 1500); })]).then(function () {
    clearTimeout(fontTimer);
    if (!alive) return;
    label('Land Registry fee', V3(-0.55, RT - 0.3, 0.75));
    label('Searches', V3(1.2, TOP + 0.05, 0.3));
    label('ID checks', V3(0.62, 2.72, FRONT + 0.3));
    label('Legal fee', V3(DX, 1.05, FRONT + 0.35));
    label('Stamp Duty Land Tax', V3(bx, 1.05, FRONT + p + 0.3));
    label('Bank transfer fee', V3(0.35, 0.5, WALLZ + 0.35));
    try { initPieces(); initBricks(); } catch (err) { pullBroken = true; resetPieces(); if (window.console) console.warn('Pull-apart effect disabled:', err); }
    try { buildHull(); layout(); frame(); } catch (err) { fail(err); return; }
    started = true;
    if (options.onFirstFrame) options.onFirstFrame();
    sync();
  });
  function V3(x, y, z) { return new THREE.Vector3(x, y, z); }

  return function dispose() {
    if (disposed) return;
    disposed = true; alive = false; sync(); clearTimeout(fontTimer);
    ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', sync);
    glCanvas.removeEventListener('webglcontextlost', onLost);
    hero.removeEventListener('pointermove', setPtr);
    hero.removeEventListener('pointerdown', setPtr);
    hero.removeEventListener('pointerleave', clearPtr);
    var seen = new Set();
    function free(x) { if (x && typeof x.dispose === 'function' && !seen.has(x)) { seen.add(x); x.dispose(); } }
    [scene, quadScene].forEach(function (s) {
      s.traverse(function (o) {
        free(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m) { free(m.map); free(m); } });
        if (o.isInstancedMesh) free(o);
        if (o.shadow && o.shadow.map) free(o.shadow.map);
      });
    });
    [rtBase, rtBlue, maskTex, brickTex, slateTex, tileTex, checkTex, paveTex].forEach(free);
    renderer.dispose();
  };
}
