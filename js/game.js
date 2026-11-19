'use strict';
(function () {
  const E = WebCraftEngine;
  const CHUNK = E.CHUNK, WORLD_H = E.WORLD_H, WATER_LEVEL = E.WATER_LEVEL;
  const AIR = E.AIR, WATER = E.WATER, BEDROCK = E.BEDROCK;
  const BLOCKS = E.BLOCKS, FACES = E.FACES;
  const GRASS = E.GRASS, DIRT = E.DIRT, STONE = E.STONE, SAND = E.SAND,
        LOG = E.LOG, LEAVES = E.LEAVES, PLANKS = E.PLANKS, COBBLE = E.COBBLE,
        GLASS = E.GLASS, BRICK = E.BRICK, SNOW = E.SNOW, GRAVEL = E.GRAVEL,
        WOOL = E.WOOL, COAL_ORE = E.COAL_ORE, IRON_ORE = E.IRON_ORE,
        TABLE = E.TABLE, TORCH = E.TORCH,
        FLOWER_RED = E.FLOWER_RED, FLOWER_YELLOW = E.FLOWER_YELLOW, TALLGRASS = E.TALLGRASS,
        BED = E.BED, CHEST = E.CHEST, FURNACE = E.FURNACE,
        DOOR_L = E.DOOR_L, DOOR_U = E.DOOR_U, SIGN = E.SIGN;

  const ITEMS = {
    100: { name: 'Charbon', tile: 22, fuel: 8 },
    101: { name: 'Bâton', tile: 23, fuel: 0.5 },
    102: { name: 'Épée en bois', tile: 24, sword: 2, maxStack: 1 },
    103: { name: 'Porc cru', tile: 25, food: 3 },
    104: { name: 'Mouton cru', tile: 26, food: 2 },
    105: { name: 'Lingot de fer', tile: 27 },
    106: { name: 'Épée en fer', tile: 28, sword: 3, maxStack: 1 },
    107: { name: 'Pioche en bois', tile: 29, pick: 2.6, maxStack: 1 },
    109: { name: 'Plastron en fer', tile: 38, armor: 5, maxStack: 1 },
    108: { name: 'Pioche en fer', tile: 30, pick: 4.5, maxStack: 1 },
    110: { name: 'Porc cuit', tile: 44, food: 8 },
    111: { name: 'Mouton cuit', tile: 45, food: 6 },
    112: { name: 'Flèche', tile: 42 },
    113: { name: 'Arc', tile: 43, bow: true, maxStack: 1 },
    114: { name: 'Bœuf cru', tile: 53, food: 3 },
    115: { name: 'Steak', tile: 54, food: 8 },
    116: { name: 'Seau', tile: 55, maxStack: 1 },
    117: { name: 'Seau de lait', tile: 56, milk: true, maxStack: 1 },
    118: { name: 'Œuf', tile: 57, egg: true, maxStack: 16 }
  };

  function trimShape(shape) {
    const rows = shape.map((r) => r.slice());
    while (rows.length && rows[0].every((c) => !c)) rows.shift();
    while (rows.length && rows[rows.length - 1].every((c) => !c)) rows.pop();
    while (rows.length && rows.every((r) => !r[0])) rows.forEach((r) => r.shift());
    while (rows.length && rows.every((r) => !r[r.length - 1])) rows.forEach((r) => r.pop());
    return rows;
  }

  const RECIPES = [
    { shape: [[LOG]], out: { id: PLANKS, count: 4 } },
    { shape: [[PLANKS], [PLANKS]], out: { id: 101, count: 4 } },
    { shape: [[PLANKS, PLANKS], [PLANKS, PLANKS]], out: { id: TABLE, count: 1 } },
    { shape: [[100], [101]], out: { id: TORCH, count: 4 } },
    { shape: [[SAND, SAND], [SAND, SAND]], out: { id: GLASS, count: 4 } },
    { shape: [[COBBLE, COBBLE], [COBBLE, COBBLE]], out: { id: BRICK, count: 4 } },
    { shape: [[LEAVES, LEAVES], [LEAVES, LEAVES]], out: { id: 101, count: 2 } },
    { shape: [[PLANKS], [101]], out: { id: 102, count: 1 } },
    { shape: [[105], [101]], out: { id: 106, count: 1 } },
    { shape: [[PLANKS, PLANKS, PLANKS], [null, 101, null], [null, 101, null]], out: { id: 107, count: 1 } },
    { shape: [[105, 105, 105], [null, 101, null], [null, 101, null]], out: { id: 108, count: 1 } },
    { shape: [[WOOL, WOOL, WOOL], [PLANKS, PLANKS, PLANKS]], out: { id: BED, count: 1 } },
    { shape: [[105, null, 105], [105, 105, 105], [105, 105, 105]], out: { id: 109, count: 1 } },
    { shape: [[COBBLE, COBBLE, COBBLE], [COBBLE, 0, COBBLE], [COBBLE, COBBLE, COBBLE]], out: { id: FURNACE, count: 1 } },
    { shape: [[0, 101, WOOL], [0, 101, 0], [0, 101, WOOL]], out: { id: 113, count: 1 } },
    { shape: [[GRAVEL], [101], [WOOL]], out: { id: 112, count: 4 } },
    { shape: [[PLANKS, PLANKS], [PLANKS, PLANKS], [PLANKS, PLANKS]], out: { id: DOOR_L, count: 3 } },
    { shape: [[PLANKS, PLANKS, PLANKS], [PLANKS, PLANKS, PLANKS], [null, 101, null]], out: { id: SIGN, count: 3 } },
    { shape: [[105, 0, 105], [0, 105, 0]], out: { id: 116, count: 1 } }
  ].map((r) => ({ rows: trimShape(r.shape).map((row) => row.map((c) => c || 0)), out: r.out }));

  const SMELT = { [IRON_ORE]: 105, [SAND]: GLASS, [COBBLE]: STONE, 103: 110, 104: 111, 114: 115 };
  const FUEL = { 100: 8, [LOG]: 1.5, [PLANKS]: 1.5, 101: 0.5, [WOOL]: 0.25 };

  const GRAVITY = 30, JUMP_V = 8.8, WALK_SPEED = 4.4, SPRINT_MULT = 1.55,
        FLY_SPEED = 11, MAX_FALL = 55;
  const PLAYER_W = 0.6, PLAYER_H = 1.8, EYE_HEIGHT = 1.62, REACH = 6;
  const AXES = ['x', 'y', 'z'];
  const DAY_LENGTH = 600;
  const SKY_DAY = new THREE.Color(0.53, 0.81, 0.91);
  const SKY_NIGHT = new THREE.Color(0.02, 0.03, 0.09);
  const SKY_SUNSET = new THREE.Color(1.0, 0.45, 0.2);
  const UNDERWATER_COLOR = new THREE.Color(0x1a4bb8);
  const skyColor = new THREE.Color();

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const debugEl = document.getElementById('debug');
  const hotbarEl = document.getElementById('hotbar');
  const healthEl = document.getElementById('health');
  const underwaterEl = document.getElementById('underwater');
  const hintEl = document.getElementById('hint');
  const loadingEl = document.getElementById('loading');
  const loadingFill = document.getElementById('loading-fill');
  const menuEl = document.getElementById('menu');
  const seedInput = document.getElementById('seed');
  const renderDistSelect = document.getElementById('render-dist');
  const pauseEl = document.getElementById('pause');
  const damageFlashEl = document.getElementById('damage-flash');
  const cursorStackEl = document.getElementById('cursor-stack');
  const invEl = document.getElementById('inventory');
  const invTitleEl = document.getElementById('inv-title');
  const craftGridEl = document.getElementById('craft-grid');
  const resultSlotEl = document.getElementById('result-slot');
  const invMainEl = document.getElementById('inv-main');
  const invHotbarEl = document.getElementById('inv-hotbar-row');
  const deathEl = document.getElementById('death');
  const breakBarEl = document.getElementById('break-bar');
  const breakFillEl = document.getElementById('break-fill');
  const modeSelect = document.getElementById('mode');
  const hungerEl = document.getElementById('hunger');
  const xpFillEl = document.getElementById('xp-fill');
  const xpLevelEl = document.getElementById('xp-level');
  const sleepFadeEl = document.getElementById('sleep-fade');
  const toastEl = document.getElementById('toast');
  const armorIndEl = document.getElementById('armor-ind');
  const chestRowEl = document.getElementById('inv-chest-row');
  const furnaceRowEl = document.getElementById('furnace-row');
  let furnProgFillEl = null, furnBurnFillEl = null, furnFlameEl = null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 40, 80);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.rotation.order = 'YXZ';

  let atlasCtx = null;

  const atlasCanvas = buildAtlas();
  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  // couleurs moyennes des blocs (minimap)
  const MINI_COLORS = {};
  for (const mid0 in BLOCKS) {
    try {
      const c3 = tileAvgColor(+mid0);
      MINI_COLORS[mid0] = [(c3 >> 16) & 255, (c3 >> 8) & 255, c3 & 255];
    } catch (err) { MINI_COLORS[mid0] = [130, 130, 130]; }
  }

  const chunkVert = [
    'attribute vec3 shade;',
    'attribute float torch;',
    'varying vec2 vUv;',
    'varying vec3 vShade;',
    'varying float vTorch;',
    'varying float vFogDepth;',
    'void main() {',
    '  vUv = uv;',
    '  vShade = shade;',
    '  vTorch = torch;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vFogDepth = -mv.z;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  const chunkFrag = [
    'uniform sampler2D map;',
    'uniform float dayLight;',
    'uniform vec3 fogColor;',
    'uniform float fogNear;',
    'uniform float fogFar;',
    'uniform float opacity;',
    'varying vec2 vUv;',
    'varying vec3 vShade;',
    'varying float vTorch;',
    'varying float vFogDepth;',
    'void main() {',
    '  vec4 tex = texture2D(map, vUv);',
    '  #ifdef USE_ALPHATEST',
    '  if (tex.a < 0.5) discard;',
    '  #endif',
    '  float light = clamp(vShade.r * dayLight + vTorch, 0.06, 1.0);',
    '  vec3 col = tex.rgb * light;',
    '  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);',
    '  col = mix(col, fogColor, fogFactor);',
    '  gl_FragColor = vec4(col, tex.a * opacity);',
    '}'
  ].join('\n');

  function makeChunkMaterial(water) {
    return new THREE.ShaderMaterial({
      vertexShader: chunkVert,
      fragmentShader: chunkFrag,
      uniforms: {
        map: { value: texture },
        dayLight: { value: 1 },
        fogColor: { value: new THREE.Color(0x87ceeb) },
        fogNear: { value: 40 },
        fogFar: { value: 80 },
        opacity: { value: water ? 0.68 : 1 }
      },
      transparent: water,
      depthWrite: !water,
      side: water ? THREE.DoubleSide : THREE.FrontSide,
      defines: water ? {} : { USE_ALPHATEST: 1 }
    });
  }

  const matOpaque = makeChunkMaterial(false);
  const matWater = makeChunkMaterial(true);

  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
  );
  highlight.visible = false;
  scene.add(highlight);
  scene.add(camera);
  const heldGroup = new THREE.Group();
  camera.add(heldGroup);
  let heldItemId = null, mineSwingT = 0, swingT = 0;

  function makeHeldBlockMesh(id) {
    const b = BLOCKS[id];
    const t = { pos: [], uv: [], col: [], idx: [] };
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi];
      const tile = f.dir[1] === 1 ? b.top : (f.dir[1] === -1 ? b.bottom : b.side);
      const tcol = tile % 8, trow = (tile / 8) | 0;
      const base = t.pos.length / 3;
      for (const c of f.corners) {
        t.pos.push(c.pos[0] - 0.5, c.pos[1] - 0.5, c.pos[2] - 0.5);
        t.uv.push((tcol + c.uv[0]) / 8, 1 - (trow + 1 - c.uv[1]) / 8);
        t.col.push(f.shade, f.shade, f.shade);
      }
      t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(t.col, 3));
    g.setIndex(t.idx);
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: texture }));
  }
  function makeHeldItemMesh(id) {
    const it = ITEMS[id];
    if (!it) return null;
    const tcol = it.tile % 8, trow = (it.tile / 8) | 0;
    const g = new THREE.PlaneGeometry(0.55, 0.55);
    const uvAttr = g.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setXY(i, (tcol + uvAttr.getX(i)) / 8, 1 - (trow + 1 - uvAttr.getY(i)) / 8);
    }
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
  }
  function rebuildHeld() {
    const held = inv[selectedSlot];
    const nid = held ? held.id : null;
    if (nid === heldItemId) return;
    heldItemId = nid;
    while (heldGroup.children.length) {
      const c = heldGroup.children.pop();
      if (c.geometry) c.geometry.dispose();
    }
    if (nid === null) return;
    let m;
    if (nid < 100 && BLOCKS[nid] && BLOCKS[nid].plant) {
      const tcol = BLOCKS[nid].side % 8, trow = (BLOCKS[nid].side / 8) | 0;
      const g = new THREE.PlaneGeometry(0.55, 0.55);
      const uvAttr = g.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setXY(i, (tcol + uvAttr.getX(i)) / 8, 1 - (trow + 1 - uvAttr.getY(i)) / 8);
      }
      m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    } else {
      m = (nid < 100 && BLOCKS[nid]) ? makeHeldBlockMesh(nid) : makeHeldItemMesh(nid);
    }
    if (!m) return;
    m.scale.set(0.42, 0.42, 0.42);
    m.material.depthTest = false;
    m.renderOrder = 30;
    heldGroup.add(m);
    swingT = 0.6;
  }
  function updateHeld(dt) {
    rebuildHeld();
    if (swingT > 0) swingT = Math.max(0, swingT - dt * 3.4);
    const s = swingT > 0 ? Math.sin(swingT * Math.PI) : 0;
    heldGroup.position.set(0.5, -0.46 - s * 0.22, -0.72);
    heldGroup.rotation.set(-0.3 - s * 1.1, 0.62, 0.18);
  }

  const skyGroup = new THREE.Group();
  scene.add(skyGroup);
  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshBasicMaterial({ color: 0xfff7c0, fog: false, depthTest: false })
  );
  sun.renderOrder = -9;
  skyGroup.add(sun);
  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(35, 35),
    new THREE.MeshBasicMaterial({ color: 0xdde4ff, fog: false, depthTest: false })
  );
  moon.renderOrder = -9;
  skyGroup.add(moon);
  const starPos = [];
  for (let i = 0; i < 350; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    starPos.push(420 * Math.sin(b) * Math.cos(a), 420 * Math.cos(b), 420 * Math.sin(b) * Math.sin(a));
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0, fog: false, depthTest: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -8;
  skyGroup.add(stars);
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, fog: false
  });
  const cloudGroup = new THREE.Group();
  scene.add(cloudGroup);
  for (let i = 0; i < 36; i++) {
    const cl = new THREE.Mesh(new THREE.BoxGeometry(14 + Math.random() * 22, 3, 10 + Math.random() * 16), cloudMat);
    cl.position.set((Math.random() - 0.5) * 380, 76 + Math.random() * 8, (Math.random() - 0.5) * 380);
    cloudGroup.add(cl);
  }
  function updateClouds(dt) {
    for (const cl of cloudGroup.children) {
      cl.position.x += dt * 1.4;
      if (cl.position.x - player.pos.x > 200) cl.position.x -= 400;
      else if (cl.position.x - player.pos.x < -200) cl.position.x += 400;
      if (cl.position.z - player.pos.z > 200) cl.position.z -= 400;
      else if (cl.position.z - player.pos.z < -200) cl.position.z += 400;
    }
  }

  function buildAtlas() {
    const T = 16, COLS = 8, SIZE = T * COLS;
    const cv = document.createElement('canvas');
    cv.width = SIZE; cv.height = SIZE;
    const ctx = cv.getContext('2d');
    atlasCtx = ctx;
    const rnd = (x, y, s) => E.hash2(x + s * 131, y, 777 + s);
    const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const n = (amt, r) => (r * 2 - 1) * amt;

    function tile(idx, fn) {
      const img = ctx.createImageData(T, T);
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const r = rnd(x, y, idx);
          const c = fn(x, y, r);
          const o = (y * T + x) * 4;
          img.data[o] = cl(c[0]); img.data[o + 1] = cl(c[1]);
          img.data[o + 2] = cl(c[2]);
          img.data[o + 3] = c.length > 3 ? c[3] : 255;
        }
      }
      ctx.putImageData(img, (idx % COLS) * T, ((idx / COLS) | 0) * T);
    }

    // --- terrain ---
    tile(0, (x, y, r) => {
      const m = n(13, r);
      const patch = E.hash2(x >> 2, y >> 2, 41) < 0.25 ? -11 : 0;
      return [106 + m + patch, 170 + m + patch, 64 + m * 0.7 + patch];
    });
    tile(1, (x, y, r) => {
      const edge = 3 + (E.hash2(x, 0, 51) < 0.5 ? 1 : 0);
      const m = n(12, r);
      if (y < edge) return [106 + m, 170 + m, 64 + m];
      return [134 + m, 96 + m, 67 + m];
    });
    tile(2, (x, y, r) => {
      const m = n(13, r);
      const dk = r > 0.86 ? -18 : 0;
      return [134 + m + dk, 96 + m + dk, 67 + m + dk];
    });
    tile(3, (x, y, r) => {
      const blot = (E.hash2(x >> 1, y >> 1, 91) - 0.5) * 16;
      const m = n(8, r);
      return [127 + m + blot, 127 + m + blot, 127 + m + blot];
    });
    tile(4, (x, y, r) => { const m = n(9, r); return [219 + m, 207 + m, 163 + m]; });
    tile(5, (x, y, r) => {
      const hcol = E.hash2(x, 0, 77);
      const stripe = hcol < 0.3 ? -22 : (hcol > 0.7 ? 12 : 0);
      const m = n(8, r);
      return [109 + stripe + m, 85 + stripe + m, 51 + stripe + m];
    });
    tile(6, (x, y, r) => {
      const ring = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)));
      const m = n(6, r);
      if (ring >= 7) return [109 + m, 85 + m, 51 + m];
      return ring % 2 === 0 ? [175 + m, 143 + m, 91 + m] : [152 + m, 121 + m, 73 + m];
    });
    tile(7, (x, y, r) => {
      const m = n(20, r);
      if (r < 0.12) return [28 + m * 0.4, 70 + m * 0.4, 20 + m * 0.4];
      return [60 + m, 124 + m, 38 + m];
    });
    tile(8, (x, y, r) => { const m = n(9, r); return [47 + m, 93 + m, 209 + m]; });
    tile(9, (x, y, r) => {
      const seam = (y % 4 === 3) || (x === ((y >> 2) * 5 + 3) % 16);
      const m = n(7, r);
      return seam ? [117 + m, 92 + m, 53 + m] : [162 + m, 130 + m, 78 + m];
    });
    tile(10, (x, y, r) => {
      const bx = E.hash2(x >> 2, y >> 2, 33);
      const edge = (x % 4 === 0) || (y % 4 === 0);
      const m = n(7, r);
      let v = 108 + bx * 36 + m;
      if (edge) v -= 34;
      return [v, v, v];
    });
    tile(11, (x, y, r) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return [210, 230, 235, 255];
      if (x - y === 4 || x - y === 5) return [235, 245, 250, 120];
      return [190, 220, 230, 22];
    });
    tile(12, (x, y, r) => {
      const row = y >> 2;
      const mortar = (y % 4 === 3) || ((x + (row % 2) * 4) % 8 === 7);
      const m = n(9, r);
      return mortar ? [188 + m, 180 + m, 172 + m] : [150 + m, 84 + m, 62 + m];
    });
    tile(13, (x, y, r) => {
      const b = E.hash2(x >> 2, y >> 2, 55) * 60 + 36 + n(8, r);
      return [b, b, b];
    });
    tile(14, (x, y, r) => { const m = n(5, r); return [240 + m, 250 + m, 250 + m]; });
    tile(15, (x, y, r) => {
      const b = E.hash2(x >> 1, y >> 1, 88) * 46 + 96 + n(8, r);
      return [b, b - 5, b - 10];
    });
    tile(16, (x, y, r) => {
      if (E.hash2(x >> 1, y >> 1, 66) > 0.76) { const m = n(6, r); return [30 + m, 30 + m, 33 + m]; }
      const blot = (E.hash2(x >> 1, y >> 1, 91) - 0.5) * 16, m = n(8, r);
      return [127 + m + blot, 127 + m + blot, 127 + m + blot];
    });
    tile(17, (x, y, r) => {
      if (E.hash2(x >> 1, y >> 1, 67) > 0.76) { const m = n(8, r); return [216 + m, 175 + m, 147 + m]; }
      const blot = (E.hash2(x >> 1, y >> 1, 91) - 0.5) * 16, m = n(8, r);
      return [127 + m + blot, 127 + m + blot, 127 + m + blot];
    });
    tile(18, (x, y, r) => {
      const border = x < 1 || y < 1 || x > 14 || y > 14;
      const seam = (y % 4 === 3);
      const grid = (x === 8 || y === 8);
      const m = n(7, r);
      if (border || grid) return [102 + m, 80 + m, 46 + m];
      return seam ? [117 + m, 92 + m, 53 + m] : [168 + m, 134 + m, 82 + m];
    });
    tile(19, (x, y, r) => {
      if (y < 3) { const m = n(7, r); return [94 + m, 73 + m, 42 + m]; }
      const tool = (x > 3 && x < 7 && y > 5 && y < 9) || (x > 9 && x < 13 && y > 5 && y < 8);
      if (tool) { const m = n(6, r); return [72 + m, 56 + m, 34 + m]; }
      const m = n(7, r);
      return [162 + m, 130 + m, 78 + m];
    });
    tile(20, (x, y, r) => {
      if (y > 4 && y < 15 && x > 6 && x < 9) { const m = n(8, r); return [112 + m, 85 + m, 48 + m]; }
      if (y >= 1 && y <= 4 && x > 5 && x < 10) {
        if (y <= 2) return [255, 245, 180];
        return [255, 205 + n(20, r), 80 + n(30, r)];
      }
      return [0, 0, 0, 0];
    });
    tile(21, (x, y, r) => {
      const weave = ((x + y) % 4 < 2) ? 5 : -5;
      const m = n(6, r);
      return [231 + weave + m, 233 + weave + m, 235 + weave + m];
    });
    // --- items (redessinés, lisibles) ---
    tile(22, (x, y, r) => { // Charbon
      const dx = Math.abs(x - 8), dy = Math.abs(y - 8);
      const d = dx * 0.85 + dy + (E.hash2(x, y, 5) < 0.3 ? 1 : 0);
      if (d > 5.4) return [0, 0, 0, 0];
      const m = n(6, r);
      const facet = (x + y) < 11 ? 30 : (x - y > 2 ? -12 : 0);
      return [36 + facet * 0.55 + m, 36 + facet * 0.55 + m, 42 + facet * 0.62 + m];
    });
    tile(23, (x, y, r) => { // Bâton
      const d = x - (15 - y);
      if (Math.abs(d) > 1 || x < 3 || x > 12) return [0, 0, 0, 0];
      const m = n(8, r);
      const hi = d === -1 ? 26 : (d === 1 ? -18 : 0);
      return [136 + hi + m, 98 + hi + m, 58 + hi + m];
    });
    const swordArt = (blade) => (x, y, r) => {
      const d = x - (15 - y);
      if (Math.abs(d) > 2 || x < 3 || x > 14) return [0, 0, 0, 0];
      const m = n(6, r);
      if (x >= 8) { // lame
        const edge = d === 2 ? -30 : (d === 1 ? -12 : 8);
        return [blade[0] + edge + m, blade[1] + edge + m, blade[2] + edge + m];
      }
      if ((x === 6 || x === 7) && Math.abs(d) <= 3) return [102 + m, 74 + m, 40 + m]; // garde
      if (x <= 5 && Math.abs(d) <= 1) return [126 + m, 88 + m, 46 + m]; // poignée
      return [0, 0, 0, 0];
    };
    tile(24, swordArt([170, 134, 80])); // épée bois
    tile(28, swordArt([224, 228, 234])); // épée fer
    tile(25, (x, y, r) => { // Porc cru
      const dx = (x - 8) / 5.4, dy = (y - 8) / 5.9;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(8, r);
      if (x < 6 && y > 10) return [244 + m, 236 + m, 224 + m]; // os
      return (y < 6 || x > 10) ? [248 + m, 196 + m, 186 + m] : [240 + m, 150 + m, 140 + m];
    });
    tile(26, (x, y, r) => { // Mouton cru
      const dx = (x - 8) / 5.4, dy = (y - 8) / 5.9;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(8, r);
      if (x < 6 && y > 10) return [244 + m, 236 + m, 224 + m];
      return (y < 6 || x > 10) ? [236 + m, 150 + m, 132 + m] : [210 + m, 90 + m, 74 + m];
    });
    tile(27, (x, y, r) => { // Lingot de fer
      if (y < 5 || y > 11) return [0, 0, 0, 0];
      const lim = 2 + Math.floor((y - 5) * 0.55);
      if (Math.abs(x - 8) > lim) return [0, 0, 0, 0];
      const m = n(5, r);
      let v = [202, 206, 214];
      if (y <= 6) v = [238, 240, 246];
      else if (y >= 10) v = [168, 172, 182];
      return [v[0] + m, v[1] + m, v[2] + m];
    });
    const pickArt = (head) => (x, y, r) => {
      const d = x - (15 - y);
      const m = n(7, r);
      const headOn = (y >= 2 && y <= 4 && x >= 5 && x <= 13) ||
        (x >= 12 && x <= 13 && y >= 3 && y <= 9) ||
        (x >= 5 && x <= 6 && y >= 2 && y <= 5);
      if (!headOn) {
        if (Math.abs(d) <= 1 && x >= 3 && x <= 10) return [126 + m, 92 + m, 50 + m]; // manche
        return [0, 0, 0, 0];
      }
      const edge = (y === 2 || x === 13) ? -24 : 0;
      return [head[0] + edge + m, head[1] + edge + m, head[2] + edge + m];
    };
    tile(29, pickArt([172, 134, 78]));  // pioche bois
    tile(30, pickArt([218, 220, 226])); // pioche fer
    tile(39, (x, y, r) => { // four : dessus
      const rim = x < 2 || x > 13 || y < 2 || y > 13;
      const m = n(7, r);
      return rim ? [88 + m, 86 + m, 86 + m] : [122 + m, 120 + m, 120 + m];
    });
    tile(40, (x, y, r) => { const m = n(8, r); return [110 + m, 108 + m, 108 + m]; }); // (réserve)
    tile(41, (x, y, r) => { // four : face/côtés (bouche + braises)
      if (x === 0 || y === 0 || x === 15 || y === 15) { const m = n(5, r); return [70 + m, 68 + m, 68 + m]; }
      if (x > 3 && x < 12 && y > 4 && y < 12) {
        if (y > 9) { const m = n(16, r); return y > 10 ? [206 + m, 112 + m, 30 + m] : [128 + m, 44 + m, 12 + m]; }
        return [26 + n(4, r), 22 + n(4, r), 22 + n(4, r)];
      }
      const m = n(8, r);
      return [108 + m, 106 + m, 106 + m];
    });
    tile(42, (x, y, r) => { // Flèche
      const d = x - (15 - y);
      if (x >= 10) {
        if (Math.abs(d) <= 2 && y <= 7) { const m = n(8, r); return d === 2 ? [122 + m, 122 + m, 128 + m] : [170 + m, 170 + m, 178 + m]; }
        return [0, 0, 0, 0];
      }
      if (x <= 5) {
        if (y >= 9 && Math.abs(d) <= 3) { const m = n(6, r); return d === 0 ? [242 + m, 242 + m, 246 + m] : [214 + m, 216 + m, 222 + m]; }
        return [0, 0, 0, 0];
      }
      if (Math.abs(d) <= 1 && y >= 3 && y <= 13) { const m = n(8, r); return [124 + m, 92 + m, 52 + m]; }
      return [0, 0, 0, 0];
    });
    tile(43, (x, y, r) => { // Arc (crosse à droite, corde à gauche)
      const dx = x - 5, dy = y - 8;
      const rr = Math.sqrt(dx * dx + dy * dy);
      if (x >= 6 && rr >= 6.1 && rr <= 7.6) { const m = n(9, r); return y > 6 && y < 10 ? [92 + m, 64 + m, 34 + m] : [118 + m, 84 + m, 44 + m]; }
      if (x === 5 && y >= 2 && y <= 13) { const m = n(4, r); return [218 + m, 218 + m, 222 + m]; }
      return [0, 0, 0, 0];
    });
    tile(44, (x, y, r) => { // Porc cuit
      const dx = (x - 8) / 5.4, dy = (y - 8) / 5.9;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(8, r);
      if (x < 6 && y > 10) return [240 + m, 232 + m, 220 + m];
      return (y < 6 || x > 10) ? [226 + m, 168 + m, 98 + m] : [196 + m, 124 + m, 62 + m];
    });
    tile(45, (x, y, r) => { // Mouton cuit
      const dx = (x - 8) / 5.4, dy = (y - 8) / 5.9;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(8, r);
      if (x < 6 && y > 10) return [240 + m, 232 + m, 220 + m];
      return (y < 6 || x > 10) ? [204 + m, 130 + m, 92 + m] : [164 + m, 88 + m, 60 + m];
    });
    // --- plantes ---
    tile(31, (x, y, r) => {
      const d = Math.abs(x - 8) + Math.abs(y - 8);
      if (y > 9 && x === 8) { const m = n(10, r); return [62 + m, 128 + m, 48 + m]; }
      if (d < 4) return [214 + n(16, r), 52 + n(14, r), 48 + n(14, r)];
      return [0, 0, 0, 0];
    });
    tile(32, (x, y, r) => {
      const d = Math.abs(x - 8) + Math.abs(y - 8);
      if (y > 9 && x === 8) { const m = n(10, r); return [62 + m, 128 + m, 48 + m]; }
      if (d < 4) return [244 + n(10, r), 222 + n(12, r), 60 + n(14, r)];
      return [0, 0, 0, 0];
    });
    tile(33, (x, y, r) => {
      const blade = Math.abs(Math.sin(x * 1.7)) * 4.5;
      if (y < 15 - blade) return [0, 0, 0, 0];
      const m = n(14, r);
      return [88 + m, 150 + m, 58 + m];
    });
    // --- lit / coffre / armure ---
    tile(34, (x, y, r) => {
      if (x === 0 || x === 15 || y === 0 || y === 15) return [107 + n(6, r), 84 + n(6, r), 52 + n(6, r)];
      if (y < 6) { const m = n(6, r); return [235 + m, 235 + m, 238 + m]; }
      const weave = ((x + y) % 4 < 2) ? 6 : -6;
      const m = n(7, r);
      return [176 + weave + m, 44 + weave * 0.4 + m * 0.4, 40 + weave * 0.4 + m * 0.4];
    });
    tile(35, (x, y, r) => {
      if (y < 9) { const weave = ((x + y) % 4 < 2) ? 6 : -6; const m = n(7, r); return [176 + weave + m, 44 + m, 40 + m]; }
      const m = n(8, r);
      return [112 + m, 85 + m, 48 + m];
    });
    tile(36, (x, y, r) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return [88 + n(6, r), 62 + n(6, r), 30 + n(6, r)];
      if (x > 6 && x < 9 && y > 4 && y < 10) return [122 + n(8, r), 122 + n(8, r), 128 + n(8, r)];
      if (y === 4) return [88 + n(6, r), 62 + n(6, r), 30 + n(6, r)];
      const m = n(8, r);
      return [152 + m, 110 + m, 58 + m];
    });
    tile(37, (x, y, r) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return [88 + n(6, r), 62 + n(6, r), 30 + n(6, r)];
      const m = n(8, r);
      return [152 + m, 110 + m, 58 + m];
    });
    tile(38, (x, y, r) => {
      const shoulder = ((x > 1 && x < 6) || (x > 9 && x < 14)) && y > 2 && y < 8;
      const torso = x > 3 && x < 12 && y > 4 && y < 13;
      const neck = x > 5 && x < 10 && y > 2 && y < 6;
      if (neck && !torso) return [0, 0, 0, 0];
      if (shoulder || torso) {
        const m = n(10, r);
        const shade = (x > 3 && x < 12) ? 0 : -25;
        return [216 + m + shade, 216 + m + shade, 222 + m + shade];
      }
      return [0, 0, 0, 0];
    });
    // --- porte / pancarte ---
    tile(46, (x, y, r) => { // porte basse : cadre bois + panneau creux
      const m = n(9, r);
      const edge = x === 0 || x === 15 || y === 0 || y === 15;
      if (edge) return [96 + m, 68 + m, 38 + m];
      if (x >= 6 && x <= 9 && y >= 5 && y <= 12) {
        const win = (x > 6 && x < 9 && y > 6 && y < 11);
        return win ? [70 + m, 90 + m, 110 + m] : [96 + m, 68 + m, 38 + m];
      }
      const plank = ((x + y * 2) % 5 === 0) ? -14 : 0;
      return [150 + plank + m, 108 + plank + m, 60 + plank + m];
    });
    tile(47, (x, y, r) => { // porte haute : panneau plein
      const m = n(9, r);
      const edge = x === 0 || x === 15 || y === 0 || y === 15;
      if (edge) return [96 + m, 68 + m, 38 + m];
      if (x > 6 && x < 9 && y > 2 && y < 13) return [110 + m, 78 + m, 44 + m,];
      const plank = ((x * 3 + y) % 5 === 0) ? -13 : 0;
      return [150 + plank + m, 108 + plank + m, 60 + plank + m];
    });
    tile(48, (x, y, r) => { // pancarte : planche sur poteau
      if (x >= 7 && x <= 8 && y >= 9 && y <= 15) { const m = n(8, r); return [104 + m, 78 + m, 44 + m]; }
      if (y >= 2 && y <= 8 && x >= 1 && x <= 14) {
        if (x === 1 || x === 14 || y === 2 || y === 8) { const m = n(7, r); return [92 + m, 66 + m, 36 + m]; }
        const m = n(10, r);
        return [168 + m, 128 + m, 76 + m];
      }
      return [0, 0, 0, 0];
    });
    // --- items v5 : viande de boeuf, seau, lait, oeuf ---
    tile(53, (x, y, r) => { // Boeuf cru
      const dx = (x - 8) / 5.4, dy = (y - 8) / 5.9;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(8, r);
      const ripple = (Math.sin((x + y) * 1.1) > 0.4) ? -22 : 0;
      if (x < 6 && y > 10) return [236 + m, 228 + m, 214 + m];
      return [186 + m + ripple, 70 + m + ripple, 66 + m + ripple];
    });
    tile(54, (x, y, r) => { // Steak
      const dx = (x - 8) / 5.4, dy = (y - 8) / 5.9;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(8, r);
      const ripple = (Math.sin((x + y) * 1.1) > 0.4) ? -20 : 0;
      if (x < 6 && y > 10) return [210 + m, 168 + m, 120 + m];
      return [116 + m + ripple, 60 + m + ripple, 38 + m + ripple];
    });
    tile(55, (x, y, r) => { // Seau : anse + cuve grise
      const ans = (y > 1 && y < 8 && Math.abs(x - 8) >= 4.6 && Math.abs(x - 8) <= 5.9 && Math.abs(Math.abs(x - 8) - (8 - Math.min(y, 8)) * 0.72) < 1.15);
      const body = y >= 8;
      if (body) {
        const dx = Math.abs(x - 8) / 6.2 - 0.6;
        if (y === 8 || y === 15 || Math.abs(x - 8) > 5.4) { const m = n(7, r); return [188 + m, 190 + m, 196 + m]; }
        if (dx > -0.18) { const m = n(6, r); return [222 + m, 224 + m, 230 + m]; }
        const m = n(8, r);
        return [138 + m, 140 + m, 148 + m];
      }
      if (ans) { const m = n(6, r); return [198 + m, 200 + m, 208 + m]; }
      return [0, 0, 0, 0];
    });
    tile(56, (x, y, r) => { // Seau de lait
      const body = y >= 7;
      if (body) {
        if (y === 7 || y === 15 || Math.abs(x - 8) > 5.4) { const m = n(7, r); return [188 + m, 190 + m, 196 + m]; }
        const m = n(7, r);
        return [232 + m, 232 + m, 234 + m];
      }
      const ans = (y > 0 && y < 7 && Math.abs(Math.abs(x - 8) - (7 - y) * 0.78) < 1.05 && Math.abs(x - 8) >= 4.2);
      if (ans) { const m = n(6, r); return [198 + m, 200 + m, 208 + m]; }
      return [0, 0, 0, 0];
    });
    tile(57, (x, y, r) => { // Oeuf blanc casse-tache
      const dx = (x - 8) / 4.4, dy = (y - 8.4) / 5.8;
      if (dx * dx + dy * dy > 1) return [0, 0, 0, 0];
      const m = n(7, r);
      const spot = E.hash2(x, y, 995) < 0.13;
      return spot ? [206 + m, 186 + m, 120 + m] : [238 + m, 230 + m, 204 + m];
    });
    return cv;
  }
  function chunkKey(cx, cz) { return cx + ',' + cz; }

  function getChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    let ch = chunks.get(key);
    if (!ch) {
      ch = { cx, cz, data: null, mesh: null, waterMesh: null, built: false };
      chunks.set(key, ch);
    }
    if (!ch.data) generateChunkData(ch);
    return ch;
  }

  function generateChunkData(ch) {
    const data = new Uint8Array(CHUNK * CHUNK * WORLD_H);
    const x0 = ch.cx * CHUNK, z0 = ch.cz * CHUNK;
    for (let x = 0; x < CHUNK; x++) {
      for (let z = 0; z < CHUNK; z++) {
        const h = E.terrainHeight(x0 + x, z0 + z);
        for (let y = 0; y <= h; y++) {
          let id;
          if (y === 0) id = BEDROCK;
          else if (y === 1 && E.hash2(x0 + x, z0 + z, 555) < 0.5) id = BEDROCK;
          else if (y < h - 3) {
            if (h > WATER_LEVEL + 1 && y >= 4 && E.caveAt(x0 + x, y, z0 + z)) id = AIR;
            else id = E.oreAt(x0 + x, y, z0 + z);
          }
          else if (y < h) id = DIRT;
          else id = E.surfaceBlock(x0 + x, z0 + z, h);
          data[E.blockIndex(x, y, z)] = id;
        }
        for (let y = h + 1; y <= WATER_LEVEL; y++) data[E.blockIndex(x, y, z)] = WATER;
        if (data[E.blockIndex(x, h, z)] === GRASS && h + 1 < WORLD_H && data[E.blockIndex(x, h + 1, z)] === AIR) {
          const biome = E.biomeAt(x0 + x, z0 + z);
          if (biome === 'plains' || biome === 'forest') {
            const pr = E.hash2(x0 + x, z0 + z, 9091);
            if (pr < 0.03) data[E.blockIndex(x, h + 1, z)] = FLOWER_RED;
            else if (pr < 0.06) data[E.blockIndex(x, h + 1, z)] = FLOWER_YELLOW;
            else if (pr < 0.16) data[E.blockIndex(x, h + 1, z)] = TALLGRASS;
          }
        }
      }
    }
    for (let wx = x0 - 2; wx < x0 + CHUNK + 2; wx++) {
      for (let wz = z0 - 2; wz < z0 + CHUNK + 2; wz++) {
        if (!E.treeAt(wx, wz)) continue;
        stampTree(data, x0, z0, wx, wz);
      }
    }
    if (E.hash2(ch.cx, ch.cz, 9001) < 0.05 && x0 >= -160 && x0 < 160 && z0 >= -160 && z0 < 160 &&
        E.biomeAt(x0 + 8, z0 + 8) === 'plains') {
      stampHouse(data, x0, z0, x0 + 8, z0 + 8);
    }
    const em = editsByChunk.get(chunkKey(ch.cx, ch.cz));
    if (em) {
      for (const k in em) {
        const p = k.split(',');
        data[E.blockIndex(+p[0], +p[1], +p[2])] = em[k];
      }
    }
    const torchList = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== TORCH) continue;
      const y = (i / 256) | 0;
      const lz = ((i % 256) / 16) | 0;
      torchList.push([x0 + (i % 16), y, z0 + lz]);
    }
    if (torchList.length) torchesByChunk.set(chunkKey(ch.cx, ch.cz), torchList);
    else torchesByChunk.delete(chunkKey(ch.cx, ch.cz));
    ch.data = data;
  }

  function stampHouse(data, x0, z0, hx, hz) {
    const hs = [];
    for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) hs.push(E.terrainHeight(hx + dx, hz + dz));
    const minH = Math.min.apply(null, hs), maxH = Math.max.apply(null, hs);
    if (maxH - minH > 2 || maxH <= WATER_LEVEL) return;
    const fy = maxH;
    const set = (x, y, z, id, onlyAir) => {
      const lx = x - x0, lz = z - z0;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 1 || y >= WORLD_H) return;
      const i = E.blockIndex(lx, y, lz);
      if (onlyAir && data[i] !== AIR) return;
      data[i] = id;
    };
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const th2 = E.terrainHeight(hx + dx, hz + dz);
        for (let y = th2 + 1; y <= fy; y++) set(hx + dx, y, hz + dz, DIRT, false);
        for (let y = fy + 1; y <= fy + 4; y++) set(hx + dx, y, hz + dz, AIR, false);
        set(hx + dx, fy, hz + dz, PLANKS, false);
      }
    }
    for (let y = fy + 1; y <= fy + 3; y++) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (Math.abs(dx) !== 3 && Math.abs(dz) !== 3) continue;
          set(hx + dx, y, hz + dz, y === fy + 1 ? COBBLE : PLANKS, false);
        }
      }
    }
    set(hx, fy + 1, hz - 3, AIR, false);
    set(hx, fy + 2, hz - 3, AIR, false);
    set(hx - 3, fy + 2, hz, GLASS, false);
    set(hx + 3, fy + 2, hz, GLASS, false);
    set(hx, fy + 2, hz + 3, GLASS, false);
    set(hx + 2, fy + 1, hz + 2, BED, false);
    set(hx - 2, fy + 1, hz + 2, CHEST, false);
    set(hx - 2, fy + 3, hz - 2, TORCH, false);
    const ck = (hx - 2) + ',' + (fy + 1) + ',' + (hz + 2);
    if (!chestData.has(ck)) {
      const arr = new Array(27).fill(null);
      arr[3] = { id: PLANKS, count: 12 };
      arr[5] = { id: 103, count: 2 };
      arr[7] = { id: 100, count: 4 };
      chestData.set(ck, arr);
    }
    villages.push([hx, fy, hz]);
  }

  function stampTree(data, x0, z0, wx, wz) {
    const h = E.terrainHeight(wx, wz);
    const th = 4 + Math.floor(E.hash2(wx, wz, 4242) * 2);
    const set = (x, y, z, id, onlyAir) => {
      const lx = x - x0, lz = z - z0;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 1 || y >= WORLD_H) return;
      const i = E.blockIndex(lx, y, lz);
      if (onlyAir && data[i] !== AIR) return;
      data[i] = id;
    };
    for (let dy = th - 2; dy <= th + 1; dy++) {
      const r = dy <= th - 1 ? 2 : 1;
      for (let ox = -r; ox <= r; ox++) {
        for (let oz = -r; oz <= r; oz++) {
          if (Math.abs(ox) === r && Math.abs(oz) === r && E.hash2(wx + ox, wz + oz, dy * 31) < 0.6) continue;
          set(wx + ox, h + 1 + dy, wz + oz, LEAVES, true);
        }
      }
    }
    for (let i = 0; i < th; i++) set(wx, h + 1 + i, wz, LOG, false);
  }

  function getBlock(x, y, z) {
    if (y < 0) return BEDROCK;
    if (y >= WORLD_H) return AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const ch = getChunk(cx, cz);
    return ch.data[E.blockIndex(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  function updateTorchRegistry(x, y, z, oldId, newId) {
    if (oldId !== TORCH && newId !== TORCH) return;
    const key = chunkKey(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    let list = torchesByChunk.get(key);
    if (newId === TORCH) {
      if (!list) { list = []; torchesByChunk.set(key, list); }
      list.push([x, y, z]);
    } else if (list) {
      const i = list.findIndex((t) => t[0] === x && t[1] === y && t[2] === z);
      if (i >= 0) list.splice(i, 1);
      if (!list.length) torchesByChunk.delete(key);
    }
  }

  function torchLightAt(x, y, z) {
    let light = 0;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = torchesByChunk.get(chunkKey(cx + dx, cz + dz));
        if (!list) continue;
        for (const t of list) {
          const d2 = (t[0] - x) * (t[0] - x) + (t[1] - y) * (t[1] - y) + (t[2] - z) * (t[2] - z);
          if (d2 < 64) light = Math.max(light, (1 - Math.sqrt(d2) / 8) * 0.95);
        }
      }
    }
    return light;
  }

  function markDirty(cx, cz, lx, lz) {
    dirtyChunks.add(chunkKey(cx, cz));
    if (lx === 0) dirtyChunks.add(chunkKey(cx - 1, cz));
    if (lx === CHUNK - 1) dirtyChunks.add(chunkKey(cx + 1, cz));
    if (lz === 0) dirtyChunks.add(chunkKey(cx, cz - 1));
    if (lz === CHUNK - 1) dirtyChunks.add(chunkKey(cx, cz + 1));
  }

  function flushDirty() {
    for (const key of dirtyChunks) {
      const ch = chunks.get(key);
      if (ch && ch.built) buildChunkMesh(ch);
    }
    dirtyChunks.clear();
  }

  function scheduleWater(x, y, z) {
    tickQueue.add(x + ',' + y + ',' + z);
    tickQueue.add(x + ',' + (y + 1) + ',' + z);
    tickQueue.add((x + 1) + ',' + y + ',' + z);
    tickQueue.add((x - 1) + ',' + y + ',' + z);
    tickQueue.add(x + ',' + y + ',' + (z + 1));
    tickQueue.add(x + ',' + y + ',' + (z - 1));
  }

  function applyBlock(x, y, z, id, record) {
    if (y < 1 || y >= WORLD_H) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const ch = getChunk(cx, cz);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    const idx = E.blockIndex(lx, y, lz);
    const old = ch.data[idx];
    if (old === id) return;
    ch.data[idx] = id;
    if (old === SIGN) signData.delete(x + ',' + y + ',' + z);
    if (old === DOOR_L || old === DOOR_U) doorOpen.delete(doorLowerKeyAt(x, y, z, old));
    if (id === CHEST) {
      const ck = x + ',' + y + ',' + z;
      if (!chestData.has(ck)) chestData.set(ck, new Array(27).fill(null));
    }
    updateTorchRegistry(x, y, z, old, id);
    markDirty(cx, cz, lx, lz);
    scheduleWater(x, y, z);
    if (id === SAND || id === GRAVEL) fallQueue.add(x + ',' + y + ',' + z);
    if (id === AIR || E.isWater(id)) {
      const aboveId = getBlock(x, y + 1, z);
      if (aboveId === SAND || aboveId === GRAVEL) fallQueue.add(x + ',' + (y + 1) + ',' + z);
      else if (E.BLOCKS[aboveId] && E.BLOCKS[aboveId].plant) applyBlock(x, y + 1, z, AIR, record);
    }
    if (record) {
      recordEdit(cx, cz, lx, y, lz, id);
      flushDirty();
      if (netState.active) netOutBlock(x, y, z, id);
    }
  }

  function recordEdit(cx, cz, lx, y, lz, id) {
    const key = chunkKey(cx, cz);
    let m = editsByChunk.get(key);
    if (!m) { m = {}; editsByChunk.set(key, m); }
    m[lx + ',' + y + ',' + lz] = id;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveEdits, 800);
  }

  function saveEdits() {
    try {
      const obj = {};
      for (const [k, m] of editsByChunk) obj[k] = m;
      localStorage.setItem('webcraft_edits_' + E.getSeed(), JSON.stringify(obj));
    } catch (e) {}
  }

  function loadEdits(seed) {
    editsByChunk.clear();
    try {
      const raw = localStorage.getItem('webcraft_edits_' + seed);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const k in obj) editsByChunk.set(k, obj[k]);
    } catch (e) {}
    loadSigns(seed);
  }

  function tickWater() {
    if (!tickQueue.size) return;
    const batch = Array.from(tickQueue).slice(0, 400);
    batch.forEach((k) => tickQueue.delete(k));
    for (const key of batch) {
      const p = key.split(',');
      const x = +p[0], y = +p[1], z = +p[2];
      const id = getBlock(x, y, z);
      if (!E.isWater(id)) continue;
      const lvl = E.waterLevel(id);
      if (y > 1 && getBlock(x, y - 1, z) === AIR) {
        applyBlock(x, y - 1, z, 39, false);
        continue;
      }
      const above = y + 1 < WORLD_H ? getBlock(x, y + 1, z) : AIR;
      const hasAbove = E.isWater(above);
      let maxNeighbor = 0;
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const s of sides) {
        const nid = getBlock(x + s[0], y, z + s[1]);
        if (E.isWater(nid)) maxNeighbor = Math.max(maxNeighbor, E.waterLevel(nid));
      }
      if (id !== WATER) {
        if (!hasAbove && maxNeighbor <= lvl) {
          const nl = lvl - 1;
          applyBlock(x, y, z, nl > 0 ? 47 - nl : AIR, false);
        }
        continue;
      }
      const below = y > 1 ? getBlock(x, y - 1, z) : BEDROCK;
      if (below !== AIR) {
        const nl = lvl - 1;
        if (nl >= 1) {
          for (const s of sides) {
            const nid = getBlock(x + s[0], y, z + s[1]);
            if (nid === AIR || (E.isWater(nid) && E.waterLevel(nid) < nl)) {
              applyBlock(x + s[0], y, z + s[1], 47 - nl, false);
            }
          }
        }
      }
    }
    flushDirty();
  }

  function tickFalls() {
    if (!fallQueue.size) return;
    const batch = Array.from(fallQueue).slice(0, 128);
    batch.forEach((k) => fallQueue.delete(k));
    for (const key of batch) {
      const p = key.split(',');
      const x = +p[0], y = +p[1], z = +p[2];
      const id = getBlock(x, y, z);
      if (id !== SAND && id !== GRAVEL) continue;
      if (y <= 1) continue;
      const below = getBlock(x, y - 1, z);
      if (below !== AIR && !E.isWater(below)) continue;
      applyBlock(x, y, z, AIR, true);
      applyBlock(x, y - 1, z, id, true);
      fallQueue.add(x + ',' + (y - 1) + ',' + z);
      playSound(90, 0.1, 0.05, 'triangle');
    }
    flushDirty();
  }

  function makeMesh(t, mat, ch, order) {
    if (t.idx.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
    g.setAttribute('shade', new THREE.Float32BufferAttribute(t.shade, 3));
    g.setAttribute('torch', new THREE.Float32BufferAttribute(t.torch, 1));
    g.setIndex(t.idx);
    const m = new THREE.Mesh(g, mat);
    m.position.set(ch.cx * CHUNK, 0, ch.cz * CHUNK);
    m.renderOrder = order;
    scene.add(m);
    return m;
  }

  function pushTorch(t, x, y, z) {
    const tcol = 20 % 8, trow = (20 / 8) | 0;
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi];
      const base = t.pos.length / 3;
      for (const c of f.corners) {
        t.pos.push(x + 0.4375 + c.pos[0] * 0.125, y + c.pos[1] * 0.625, z + 0.4375 + c.pos[2] * 0.125);
        const uu = 0.375 + c.uv[0] * 0.25;
        const vv = c.uv[1] * 0.625;
        t.uv.push((tcol + uu) / 8, 1 - (trow + 1 - vv) / 8);
        t.shade.push(1, 1, 1);
        t.torch.push(1);
      }
      t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }

  const AO_LEVELS = [0.45, 0.66, 0.84, 1.0];
  function occludesAO(id) {
    const b = BLOCKS[id];
    return !!(b && b.opaque);
  }
  function faceAO(f, nx, ny, nz) {
    const d = f.dir;
    const uc = d[0] !== 0 ? 1 : 0;
    const vc = d[1] !== 0 ? 2 : 1;
    const ao = [];
    for (const c of f.corners) {
      const su = c.pos[uc] ? 1 : -1;
      const sv = c.pos[vc] ? 1 : -1;
      const ou = [0, 0, 0]; ou[uc] = su;
      const ov = [0, 0, 0]; ov[vc] = sv;
      const s1 = occludesAO(getBlock(nx + ou[0], ny + ou[1], nz + ou[2]));
      const s2 = occludesAO(getBlock(nx + ov[0], ny + ov[1], nz + ov[2]));
      const cn = occludesAO(getBlock(nx + ou[0] + ov[0], ny + ou[1] + ov[1], nz + ou[2] + ov[2]));
      const occ = s1 && s2 ? 3 : (s1 ? 1 : 0) + (s2 ? 1 : 0) + (cn ? 1 : 0);
      ao.push(AO_LEVELS[3 - occ]);
    }
    return ao;
  }

  const doorOpen = new Set();
  function doorLowerKeyAt(x, y, z, id) {
    return x + ',' + (id === DOOR_U ? y - 1 : y) + ',' + z;
  }
  function isDoorOpenAt(x, y, z, id) {
    return doorOpen.has(doorLowerKeyAt(x, y, z, id));
  }
  function pushQuad(t, pts, uvw, tileIdx, tl) {
    const tcol = tileIdx % 8, trow = (tileIdx / 8) | 0;
    for (const w of [pts, pts.slice().reverse()]) {
      const base = t.pos.length / 3;
      for (let i = 0; i < 4; i++) {
        const c = w[i];
        t.pos.push(x0q + c[0], y0q + c[1], z0q + c[2]);
        t.uv.push((tcol + uvw[i][0]) / 8, 1 - (trow + 1 - uvw[i][1]) / 8);
        t.shade.push(1, 1, 1);
        t.torch.push(tl);
      }
      t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  let x0q = 0, y0q = 0, z0q = 0;

  function pushDoor(t, x, y, z, id, tl, wx, wy, wz) {
    const open = isDoorOpenAt(wx, wy, wz, id);
    x0q = x; y0q = y; z0q = z;
    if (!open) {
      // fermee : panneau face au nord (plan z), epaisseur fine
      pushQuad(t, [[0, 0, 0.86], [1, 0, 0.86], [1, 1, 0.86], [0, 1, 0.86]],
        [[0, 0], [1, 0], [1, 1], [0, 1]], BLOCKS[id].side, tl);
    } else {
      // ouverte : panneau tourne contre le mur (plan x)
      pushQuad(t, [[0.86, 0, 0], [0.86, 0, 1], [0.86, 1, 1], [0.86, 1, 0]],
        [[0, 0], [1, 0], [1, 1], [0, 1]], BLOCKS[id].side, tl);
    }
  }

  function pushSign(t, x, y, z, tileIdx, tl) {
    x0q = x; y0q = y; z0q = z;
    // poteau croise
    pushQuad(t, [[0.42, 0, 0.42], [0.58, 0, 0.58], [0.58, 0.55, 0.58], [0.42, 0.55, 0.42]],
      [[0.44, 0], [0.56, 0], [0.56, 0.55], [0.44, 0.55]], tileIdx, tl);
    // planche avant/arriere
    x0q = x; y0q = y; z0q = z;
    {
      const tcol = tileIdx % 8, trow = (tileIdx / 8) | 0;
      const v0 = 1 - (trow + 1 - 0.42) / 8, v1 = 1 - (trow + 1 - 0.86) / 8;
      const quad = [[0.06, 0.42, 0.5], [0.94, 0.42, 0.5], [0.94, 0.86, 0.5], [0.06, 0.86, 0.5]];
      for (const w of [quad, quad.slice().reverse()]) {
        const base = t.pos.length / 3;
        const us = [[0, 0.42], [1, 0.42], [1, 0.86], [0, 0.86]];
        for (let i = 0; i < 4; i++) {
          t.pos.push(x + w[i][0], y + w[i][1], z + w[i][2]);
          t.uv.push((tcol + us[i][0]) / 8, v0 + (v1 - v0) * us[i][1]);
          t.shade.push(1, 1, 1);
          t.torch.push(tl);
        }
        t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      }
    }
  }

  function pushCross(buf, x, y, z, tileIdx, tl) {
    const tcol = tileIdx % 8, trow = (tileIdx / 8) | 0;
    const q1 = [
      { p: [0.08, 0, 0.08], u: [0, 0] }, { p: [0.92, 0, 0.92], u: [1, 0] },
      { p: [0.92, 1, 0.92], u: [1, 1] }, { p: [0.08, 1, 0.08], u: [0, 1] }
    ];
    const quads = [q1, q1.slice().reverse().map((c) => ({ p: c.p, u: c.u })),
      [
        { p: [0.92, 0, 0.08], u: [0, 0] }, { p: [0.08, 0, 0.92], u: [1, 0] },
        { p: [0.08, 1, 0.92], u: [1, 1] }, { p: [0.92, 1, 0.08], u: [0, 1] }
      ],
      [
        { p: [0.08, 0, 0.92], u: [0, 0] }, { p: [0.92, 0, 0.08], u: [1, 0] },
        { p: [0.92, 1, 0.08], u: [1, 1] }, { p: [0.08, 1, 0.92], u: [0, 1] }
      ]];
    for (const q of quads) {
      const base = buf.pos.length / 3;
      for (const c of q) {
        buf.pos.push(x + c.p[0], y + c.p[1], z + c.p[2]);
        buf.uv.push((tcol + c.u[0]) / 8, 1 - (trow + 1 - c.u[1]) / 8);
        buf.shade.push(1, 1, 1);
        buf.torch.push(tl);
      }
      buf.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }

  function buildChunkMesh(ch) {
    unloadChunk(ch);
    const opq = { pos: [], uv: [], shade: [], torch: [], idx: [] };
    const wat = { pos: [], uv: [], shade: [], torch: [], idx: [] };
    const data = ch.data;
    const x0 = ch.cx * CHUNK, z0 = ch.cz * CHUNK;
    for (let y = 0; y < WORLD_H; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const id = data[E.blockIndex(x, y, z)];
          if (id === AIR) continue;
          const wx = x0 + x, wz = z0 + z;
          if (id === TORCH) { pushTorch(opq, x, y, z); continue; }
          const b = BLOCKS[id];
          if (b.plant) { pushCross(opq, x, y, z, b.side, torchLightAt(wx, y, wz)); continue; }
          if (b.door) { pushDoor(opq, x, y, z, id, torchLightAt(wx, y, wz), wx, y, wz); continue; }
          if (b.sign) { pushSign(opq, x, y, z, b.side, torchLightAt(wx, y, wz)); continue; }
          const isW = E.isWater(id);
          const t = isW ? wat : opq;
          let topH = 1;
          if (b.half) topH = 0.56;
          if (isW) {
            const above = y + 1 < WORLD_H ? data[E.blockIndex(x, y + 1, z)] : AIR;
            topH = E.isWater(above) ? 1 : (E.waterLevel(id) / 8) * 0.875;
          }
          for (let fi = 0; fi < 6; fi++) {
            const f = FACES[fi];
            const nx = wx + f.dir[0], ny = y + f.dir[1], nz = wz + f.dir[2];
            let nid;
            if (ny < 0) nid = BEDROCK;
            else if (ny >= WORLD_H) nid = AIR;
            else if (nx >= x0 && nx < x0 + CHUNK && nz >= z0 && nz < z0 + CHUNK) {
              nid = data[E.blockIndex(nx - x0, ny, nz - z0)];
            } else nid = getBlock(nx, ny, nz);
            if (isW && E.isWater(nid)) continue;
            if (!E.faceVisible(id, nid)) continue;
            const tile = f.dir[1] === 1 ? b.top : (f.dir[1] === -1 ? b.bottom : b.side);
            const tcol = tile % 8, trow = (tile / 8) | 0;
            const tl = isW ? 0 : torchLightAt(nx, ny, nz);
            const base = t.pos.length / 3;
            let ao = null, flip = false;
            if (!isW) {
              ao = faceAO(f, nx, ny, nz);
              if (ao) flip = ao[0] + ao[3] > ao[1] + ao[2];
            }
            for (let ci = 0; ci < 4; ci++) {
              const c = f.corners[ci];
              const cy = c.pos[1] === 1 ? topH : 0;
              t.pos.push(x + c.pos[0], y + cy, z + c.pos[2]);
              t.uv.push((tcol + c.uv[0]) / 8, 1 - (trow + 1 - c.uv[1]) / 8);
              const s = ao ? ao[ci] * f.shade : f.shade;
              t.shade.push(s, s, s);
              t.torch.push(tl);
            }
            if (flip) t.idx.push(base, base + 1, base + 3, base, base + 3, base + 2);
            else t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
          }
        }
      }
    }
    ch.mesh = makeMesh(opq, matOpaque, ch, 0);
    ch.waterMesh = makeMesh(wat, matWater, ch, 1);
    ch.built = true;
  }

  function unloadChunk(ch) {
    if (ch.mesh) { scene.remove(ch.mesh); ch.mesh.geometry.dispose(); ch.mesh = null; }
    if (ch.waterMesh) { scene.remove(ch.waterMesh); ch.waterMesh.geometry.dispose(); ch.waterMesh = null; }
    ch.built = false;
  }

  function updateChunks(force) {
    const pcx = Math.floor(player.pos.x / CHUNK), pcz = Math.floor(player.pos.z / CHUNK);
    const key = pcx + ',' + pcz;
    if (!force && key === lastScanKey) return;
    lastScanKey = key;
    const R = renderDist, R2 = R * R + 2;
    const needed = [];
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const d2 = dx * dx + dz * dz;
        if (d2 <= R2) needed.push([pcx + dx, pcz + dz, d2]);
      }
    }
    needed.sort((a, b) => a[2] - b[2]);
    for (const ch of chunks.values()) {
      if (!ch.built) continue;
      const dx = ch.cx - pcx, dz = ch.cz - pcz;
      if (dx * dx + dz * dz > (R + 2) * (R + 2)) unloadChunk(ch);
    }
    meshQueue = needed.filter(([cx, cz]) => {
      const ch = chunks.get(chunkKey(cx, cz));
      return !(ch && ch.built);
    });
  }

  function processMeshQueue(budget) {
    while (budget > 0 && meshQueue.length) {
      const entry = meshQueue.shift();
      const ch = getChunk(entry[0], entry[1]);
      if (ch.built) continue;
      buildChunkMesh(ch);
      budget--;
    }
  }

  function collidesBox(px, py, pz, hw, hh) {
    const x0 = Math.floor(px - hw), x1 = Math.ceil(px + hw) - 1;
    const y0 = Math.floor(py), y1 = Math.ceil(py + hh) - 1;
    const z0 = Math.floor(pz - hw), z1 = Math.ceil(pz + hw) - 1;
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const id = getBlock(x, y, z);
          if (id !== AIR && BLOCKS[id] && BLOCKS[id].solid) {
            if (BLOCKS[id].door && isDoorOpenAt(x, y, z, id)) continue;
            return true;
          }
        }
      }
    }
    return false;
  }

  function moveEnt(ent, axis, amount) {
    if (amount === 0) return false;
    const sign = amount > 0 ? 1 : -1;
    let rem = Math.abs(amount);
    const p = ent.pos;
    while (rem > 0) {
      const d = Math.min(0.05, rem) * sign;
      p[AXES[axis]] += d;
      if (collidesBox(p.x, p.y, p.z, ent.hw, ent.hh)) {
        p[AXES[axis]] -= d;
        return true;
      }
      rem -= Math.min(0.05, rem);
    }
    return false;
  }

  function updatePlayer(dt) {
    const rdown = keys.has('KeyR');
    const sprint = rdown && (player.fly || player.hunger > 6);
    let speed = player.fly ? FLY_SPEED * (sprint ? 1.8 : 1) : WALK_SPEED * (sprint ? SPRINT_MULT : 1);
    if (player.inWater && !player.fly) speed *= 0.55;
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    let fx = 0, fz = 0;
    if (keys.has('KeyW') || keys.has('KeyZ')) { fx += -sin; fz += -cos; }
    if (keys.has('KeyS')) { fx += sin; fz += cos; }
    if (keys.has('KeyA') || keys.has('KeyQ')) { fx += -cos; fz += sin; }
    if (keys.has('KeyD')) { fx += cos; fz += -sin; }
    const len = Math.hypot(fx, fz);
    let tvx = 0, tvz = 0;
    if (len > 0) { tvx = fx / len * speed; tvz = fz / len * speed; }
    const k = 1 - Math.exp(-dt * 14);
    player.vel.x += (tvx - player.vel.x) * k;
    player.vel.z += (tvz - player.vel.z) * k;

    player.inWater = E.isWater(getBlock(Math.floor(player.pos.x), Math.floor(player.pos.y + 0.2), Math.floor(player.pos.z)));

    if (player.fly) {
      let tvy = 0;
      if (keys.has('Space')) tvy += FLY_SPEED;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) tvy -= FLY_SPEED;
      player.vel.y += (tvy - player.vel.y) * k;
      player.fallStartY = null;
    } else if (player.inWater) {
      player.vel.y -= GRAVITY * 0.18 * dt;
      if (keys.has('Space')) player.vel.y = Math.min(player.vel.y + 30 * dt, 3.4);
      if (player.vel.y < -1.8) player.vel.y = -1.8;
      player.fallStartY = null;
    } else {
      player.vel.y -= GRAVITY * dt;
      if (player.vel.y < -MAX_FALL) player.vel.y = -MAX_FALL;
      if (keys.has('Space') && player.onGround) { player.vel.y = JUMP_V; player.onGround = false; addExhaustion(0.07); }
    }

    const wasOnGround = player.onGround;
    player.onGround = false;
    if (moveEnt(player, 1, player.vel.y * dt)) {
      if (player.vel.y < 0) {
        player.onGround = true;
        if (!wasOnGround && player.fallStartY !== null && !player.fly && !player.inWater) {
          const dist = player.fallStartY - player.pos.y;
          if (dist > 3.5) {
            const dmg = Math.floor((dist - 3.2) * 0.7);
            if (dmg > 0) damagePlayer(dmg);
          }
        }
        player.fallStartY = null;
      }
      player.vel.y = 0;
    } else if (!player.onGround && !player.fly && !player.inWater && player.vel.y < 0) {
      player.fallStartY = player.fallStartY === null ? player.pos.y : Math.max(player.fallStartY, player.pos.y);
    }
    const hitXp = moveEnt(player, 0, player.vel.x * dt);
    const hitZp = moveEnt(player, 2, player.vel.z * dt);
    if (hitXp) player.vel.x = 0;
    if (hitZp) player.vel.z = 0;
    // sortie d'eau way Minecraft : tant que les pieds sont dans l'eau et qu'on pousse
    // contre un bloc dont le sommet est a hauteur des pieds, on est propulse vers le haut
    if (!player.fly && len > 0 && (hitXp || hitZp) && !player.onGround &&
        E.isWater(getBlock(Math.floor(player.pos.x), Math.floor(player.pos.y + 0.2), Math.floor(player.pos.z))) &&
        !E.isWater(getBlock(Math.floor(player.pos.x), Math.floor(player.pos.y + 1.2), Math.floor(player.pos.z)))) {
      player.vel.y = Math.max(player.vel.y, 5.2);
    }
    const hSpeed = Math.hypot(player.vel.x, player.vel.z);
    if (player.onGround && hSpeed > 0.5 && !player.fly && !player.inWater) {
      addExhaustion(dt * (sprint ? 0.5 : 0.08));
      bobPhase += dt * (sprint ? 11.5 : 8.2);
      stepT -= dt * hSpeed;
      if (stepT <= 0) {
        stepT = 1.8;
        const below = getBlock(Math.floor(player.pos.x), Math.floor(player.pos.y - 0.2), Math.floor(player.pos.z));
        if (below !== AIR) { const bs = blockSound(below); playSound(bs[0] * 1.35, 0.05, 0.045, bs[1]); }
      }
    }
    if (!wasInWater && player.inWater) playSound(190, 0.35, 0.09, 'sine');
    wasInWater = player.inWater;

    if (player.fly && player.onGround) player.fly = false;
    if (player.pos.y < -20) {
      player.pos.y = WORLD_H;
      player.vel.set(0, 0, 0);
      player.fallStartY = null;
    }
  }

  let armorWorn = false;
  let sleepT = 0;
  let toastTimer = null;

  function updateArmorUI() {
    if (armorIndEl) armorIndEl.textContent = armorWorn ? '\u{1F6E1}' : '';
  }
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove('visible'); }, 2200);
  }

  const chestData = new Map();
  const villages = [];
  const chestSlotEls = [];
  let openChestArr = null;
  const furnaceData = new Map();
  let openFurnaceKey = null;
  const furnSlotEls = { inp: null, fuel: null, out: null };
  const SMELT_TIME = 6;
  let bowCharging = false, bowT = 0;
  function sleepAt(x, y, z) {
    spawnPoint.set(x + 0.5, y + 1.05, z + 0.5);
    if (dayLight < 0.35 && gameMode === 'survival') {
      sleepT = 1.6;
      if (sleepFadeEl) sleepFadeEl.style.opacity = '1';
      playSound(210, 0.5, 0.08, 'sine');
    } else {
      showToast(gameMode === 'creative' ? 'Point de r\u00e9apparition d\u00e9fini (cr\u00e9atif)' : 'Point de r\u00e9apparition d\u00e9fini');
    }
  }
  function spillChest(x, y, z) {
    const arr = chestData.get(x + ',' + y + ',' + z);
    if (!arr) return;
    for (const s of arr) if (s) addItem(s.id, Math.min(s.count, maxStack(s.id)));
    chestData.delete(x + ',' + y + ',' + z);
  }
  function furnaceAt(x, y, z) {
    const k = x + ',' + y + ',' + z;
    if (!furnaceData.has(k)) furnaceData.set(k, { inpA: [null], fuelA: [null], outA: [null], progress: 0, burn: 0, burnMax: 0 });
    return furnaceData.get(k);
  }
  function spillFurnace(x, y, z) {
    const f = furnaceData.get(x + ',' + y + ',' + z);
    if (!f) return;
    for (const a of [f.inpA, f.fuelA, f.outA]) if (a[0]) addItem(a[0].id, Math.min(a[0].count, maxStack(a[0].id)));
    furnaceData.delete(x + ',' + y + ',' + z);
  }
  function canSmelt(f) {
    const inp = f.inpA[0], out = f.outA[0];
    if (!inp || !(inp.id in SMELT)) return false;
    const res = SMELT[inp.id];
    return !out || (out.id === res && out.count < maxStack(res));
  }
  function tickFurnaces(dt) {
    let changed = false;
    for (const f of furnaceData.values()) {
      if (f.burn > 0) f.burn -= dt;
      if (canSmelt(f)) {
        if (f.burn <= 0 && f.fuelA[0] && ITEMS[f.fuelA[0].id] && ITEMS[f.fuelA[0].id].fuel) {
          f.burnMax = ITEMS[f.fuelA[0].id].fuel;
          f.burn = f.burnMax;
          f.fuelA[0].count -= 1;
          if (f.fuelA[0].count <= 0) f.fuelA[0] = null;
          changed = true;
        }
        if (f.burn > 0) {
          f.progress += dt;
          if (f.progress >= SMELT_TIME) {
            f.progress = 0;
            const res = SMELT[f.inpA[0].id];
            if (f.outA[0]) f.outA[0].count += 1;
            else f.outA[0] = { id: res, count: 1 };
            f.inpA[0].count -= 1;
            if (f.inpA[0].count <= 0) f.inpA[0] = null;
            playSound(210, 0.25, 0.05, 'sawtooth');
            changed = true;
          }
        }
      } else {
        f.progress = 0;
      }
    }
    if (openFurnaceKey) {
      updateFurnaceUI();
      if (changed) renderInventory();
    }
  }
  function updateFurnaceUI() {
    const f = openFurnaceKey ? furnaceData.get(openFurnaceKey) : null;
    if (!f) return;
    if (furnProgFillEl) furnProgFillEl.style.width = Math.round(Math.min(1, f.progress / SMELT_TIME) * 100) + '%';
    if (furnBurnFillEl) furnBurnFillEl.style.width = (f.burnMax > 0 ? Math.round(Math.max(0, f.burn / f.burnMax) * 100) : 0) + '%';
    if (furnFlameEl) furnFlameEl.textContent = f.burn > 0 ? '\u{1F525}' : ' ';
  }

  const signData = new Map();
  let editingSignKey = null;

  function toggleDoorAt(x, y, z, id) {
    const lk = doorLowerKeyAt(x, y, z, id);
    if (doorOpen.has(lk)) doorOpen.delete(lk);
    else doorOpen.add(lk);
    playSound(doorOpen.has(lk) ? 180 : 140, 0.16, 0.14, 'square');
    const p = lk.split(',');
    const ch = getChunk(Math.floor(+p[0] / CHUNK), Math.floor(+p[2] / CHUNK));
    if (ch && ch.built) buildChunkMesh(ch);
  }

  function signEditElements() {
    return { ov: document.getElementById('sign-edit'), inp: document.getElementById('sign-text'),
      ok: document.getElementById('sign-ok'), no: document.getElementById('sign-cancel') };
  }

  function openSignEdit(x, y, z) {
    editingSignKey = x + ',' + y + ',' + z;
    const el = signEditElements();
    if (!el.ov) return;
    el.inp.value = signData.get(editingSignKey) || '';
    signDataToSave = editingSignKey;
    el.ov.classList.remove('hidden');
    invOpen = true;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    setTimeout(() => { try { el.inp.focus(); } catch (err) {} }, 60);
  }

  let signDataToSave = null;

  function closeSignEdit(save) {
    const el = signEditElements();
    if (!el.ov || signDataToSave === null) return;
    if (save && editingSignKey) {
      signData.set(editingSignKey, el.inp.value.slice(0, 60));
      saveSigns();
      playSound(340, 0.12, 0.1, 'triangle');
    }
    editingSignKey = null;
    signDataToSave = null;
    el.ov.classList.add('hidden');
    invOpen = false;
    if (gameState === 'playing' && !player.dead) canvas.requestPointerLock();
  }

  function saveSigns() {
    try {
      const obj = {};
      for (const [k, v] of signData) obj[k] = v;
      localStorage.setItem('webcraft_signs_' + E.getSeed(), JSON.stringify(obj));
    } catch (e) {}
  }

  function loadSigns(seed) {
    signData.clear();
    try {
      const raw = localStorage.getItem('webcraft_signs_' + seed);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const k in obj) signData.set(k, String(obj[k]));
    } catch (e) {}
  }

  function openChestAt(x, y, z) {
    const k = x + ',' + y + ',' + z;
    if (!chestData.has(k)) chestData.set(k, new Array(27).fill(null));
    openChestArr = chestData.get(k);
    invOpen = true;
    invTitleEl.textContent = 'Coffre';
    craftGridEl.classList.add('hidden');
    resultSlotEl.classList.add('hidden');
    if (furnaceRowEl) furnaceRowEl.classList.add('hidden');
    chestRowEl.innerHTML = '';
    chestSlotEls.length = 0;
    for (let i = 0; i < 27; i++) chestSlotEls.push(makeInvSlot(chestRowEl, openChestArr, i));
    renderInventory();
    invEl.classList.remove('hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function openFurnaceAt(x, y, z) {
    const k = x + ',' + y + ',' + z;
    furnaceAt(x, y, z);
    openFurnaceKey = k;
    openChestArr = null;
    invOpen = true;
    invTitleEl.textContent = 'Four';
    craftGridEl.classList.add('hidden');
    resultSlotEl.classList.add('hidden');
    chestRowEl.classList.add('hidden');
    chestRowEl.innerHTML = '';
    const f = furnaceData.get(k);
    // colonne gauche : entrée / flamme / combustible — milieu : progression — droite : résultat
    furnaceRowEl.innerHTML = '';
    furnaceRowEl.classList.remove('hidden');
    const colL = document.createElement('div');
    colL.className = 'furn-col';
    const wInp = document.createElement('div'); wInp.className = 'furn-slot';
    furnSlotEls.inp = makeInvSlot(wInp, f.inpA, 0);
    const burn = document.createElement('div'); burn.className = 'f-burn';
    furnBurnFillEl = document.createElement('div'); furnBurnFillEl.className = 'f-burn-fill';
    burn.appendChild(furnBurnFillEl);
    const wFuel = document.createElement('div'); wFuel.className = 'furn-slot';
    furnSlotEls.fuel = makeInvSlot(wFuel, f.fuelA, 0);
    colL.appendChild(wInp); colL.appendChild(burn); colL.appendChild(wFuel);
    const mid = document.createElement('div');
    mid.className = 'furn-mid';
    furnFlameEl = document.createElement('span'); furnFlameEl.className = 'f-flame';
    const prog = document.createElement('div'); prog.className = 'f-prog';
    furnProgFillEl = document.createElement('div'); furnProgFillEl.className = 'f-prog-fill';
    prog.appendChild(furnProgFillEl);
    mid.appendChild(furnFlameEl); mid.appendChild(prog);
    const colR = document.createElement('div');
    colR.className = 'furn-col';
    const wOut = document.createElement('div'); wOut.className = 'furn-slot';
    furnSlotEls.out = makeInvSlot(wOut, f.outA, 0);
    colR.appendChild(wOut);
    furnaceRowEl.appendChild(colL);
    furnaceRowEl.appendChild(mid);
    furnaceRowEl.appendChild(colR);
    updateFurnaceUI();
    renderInventory();
    invEl.classList.remove('hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  let xp = 0, xpLevel = 0;
  function xpNeeded(l) { return 8 + l * 4; }
  function addXp(n) {
    xp += n;
    while (xp >= xpNeeded(xpLevel)) {
      xp -= xpNeeded(xpLevel);
      xpLevel++;
      playSound(660, 0.25, 0.2, 'triangle');
    }
    updateXpUI();
  }
  function updateXpUI() {
    if (!xpFillEl) return;
    xpFillEl.style.width = Math.min(100, Math.round((xp / xpNeeded(xpLevel)) * 100)) + '%';
    xpLevelEl.textContent = xpLevel > 0 ? String(xpLevel) : '';
  }

  function updateHungerUI() {
    if (gameMode === 'creative') { hungerEl.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i < 10; i++) {
      const v = player.hunger - i * 2;
      const cls = v >= 2 ? 'full' : (v >= 1 ? 'half' : 'empty');
      html += '<span class="food ' + cls + '">\u{1F357}</span>';
    }
    hungerEl.innerHTML = html;
  }

  function addExhaustion(v) {
    player.exhaust += v;
    while (player.exhaust >= 4) {
      player.exhaust -= 4;
      if (player.hunger > 0) { player.hunger--; updateHungerUI(); }
    }
  }

  function updateHealthUI() {
    if (gameMode === 'creative') { healthEl.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i < 10; i++) {
      const v = player.hp - i * 2;
      const cls = v >= 2 ? 'full' : (v >= 1 ? 'half' : 'empty');
      html += '<span class="heart ' + cls + '">' + (v >= 1 ? '\u2764' : '\u2661') + '</span>';
    }
    healthEl.innerHTML = html;
  }

  function damagePlayer(n, kx, kz) {
    if (gameMode === 'creative' || player.dead || player.hurtCd > 0 || player.fly) return;
    if (armorWorn) n = Math.ceil(n * 0.65);
    player.hp -= n;
    player.hurtCd = 0.5;
    player.regenT = 0;
    if (kx !== undefined && kz !== undefined) {
      const d = Math.hypot(kx, kz) || 1;
      player.vel.x += kx / d * 7;
      player.vel.z += kz / d * 7;
      player.vel.y = Math.max(player.vel.y, 4);
    }
    damageFlashEl.style.opacity = '0.45';
    setTimeout(() => { damageFlashEl.style.opacity = '0'; }, 60);
    playSound(140, 0.18, 0.16);
    updateHealthUI();
    if (player.hp <= 0) {
      player.hp = 0;
      player.dead = true;
      keys.clear();
      deathEl.classList.remove('hidden');
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    }
  }

  function respawn() {
    player.dead = false;
    player.hp = 20;
    player.hunger = 20;
    player.exhaust = 0;
    player.starveT = 0;
    player.regenT = 0;
    player.hurtCd = 0;
    xp = 0; xpLevel = 0;
    armorWorn = false;
    updateArmorUI();
    player.pos.copy(spawnPoint);
    player.vel.set(0, 0, 0);
    player.fallStartY = null;
    updateXpUI();
    updateHealthUI();
    updateHungerUI();
    deathEl.classList.add('hidden');
    canvas.requestPointerLock();
  }

  function computeHit() {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    currentHit = E.raycast(
      camera.position.x, camera.position.y, camera.position.z,
      dir.x, dir.y, dir.z, REACH,
      (x, y, z) => {
        const id = getBlock(x, y, z);
        return id !== AIR && !E.isWater(id);
      }
    );
  }

  function updateHighlight() {
    if (currentHit) {
      highlight.visible = true;
      highlight.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5);
    } else {
      highlight.visible = false;
    }
  }

  let bobPhase = 0, bobAmt = 0, fovCur = 70;
  function updateCamera() {
    const moving = Math.hypot(player.vel.x, player.vel.z) > 0.6;
    const wantBob = player.onGround && moving && !player.fly ? 1 : 0;
    bobAmt += (wantBob - bobAmt) * 0.12;
    const sprintNow = moving && !player.fly && keys.has('KeyR') && player.hunger > 6;
    const fovTarget = sprintNow ? 78 : 70;
    if (Math.abs(fovCur - fovTarget) > 0.05) {
      fovCur += (fovTarget - fovCur) * 0.14;
      camera.fov = fovCur;
      camera.updateProjectionMatrix();
    }
    const bob = Math.sin(bobPhase * 2) * 0.05 * bobAmt;
    camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT + bob, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, Math.sin(bobPhase) * 0.01 * bobAmt);
  }

  let dayTime = 0.03;
  let dayLight = 1;

  function updateSky() {
    const theta = dayTime * Math.PI * 2;
    const elev = Math.sin(theta);
    dayLight = 0.12 + 0.88 * clamp01(0.5 + elev * 3);
    skyColor.copy(SKY_NIGHT).lerp(SKY_DAY, clamp01(0.5 + elev * 3));
    const sunsetF = Math.max(0, 1 - Math.abs(elev) * 4) * 0.55;
    skyColor.lerp(SKY_SUNSET, sunsetF);
    matOpaque.uniforms.dayLight.value = dayLight;
    matWater.uniforms.dayLight.value = dayLight;
    sun.position.set(Math.cos(theta) * 400, Math.sin(theta) * 400, 0);
    sun.lookAt(skyGroup.position);
    moon.position.set(-Math.cos(theta) * 400, -Math.sin(theta) * 400, 0);
    moon.lookAt(skyGroup.position);
    stars.rotation.z = theta;
    starMat.opacity = clamp01((0.4 - dayLight) * 3.5);
    cloudMat.opacity = 0.16 + 0.38 * dayLight;
  }

  function updateUnderwater() {
    const id = getBlock(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
    const uw = E.isWater(id);
    underwaterEl.classList.toggle('hidden', !uw);
    const near = uw ? 2 : baseFogNear;
    const far = uw ? 24 : baseFogFar;
    const col = uw ? UNDERWATER_COLOR : skyColor;
    scene.fog.near = near;
    scene.fog.far = far;
    scene.fog.color.copy(col);
    scene.background.copy(col);
    matOpaque.uniforms.fogNear.value = near;
    matOpaque.uniforms.fogFar.value = far;
    matOpaque.uniforms.fogColor.value.copy(col);
    matWater.uniforms.fogNear.value = near;
    matWater.uniforms.fogFar.value = far;
    matWater.uniforms.fogColor.value.copy(col);
  }

  const mobs = [];
  const MOB_DEFS = {
    pig: {
      hp: 4, speed: 1.4, hw: 0.45, hh: 0.9,
      body: 0xeba3a3, head: 0xf3b8b8, leg: 0xd98f8f,
      drops: [{ id: 103, min: 1, max: 2 }]
    },
    sheep: {
      hp: 4, speed: 1.2, hw: 0.45, hh: 1.1,
      body: 0xe8e8e8, head: 0xdcd3c8, leg: 0xc9c2b8,
      drops: [{ id: 104, min: 1, max: 1 }, { id: WOOL, min: 1, max: 2 }]
    },
    zombie: {
      hp: 6, speed: 2.3, hw: 0.3, hh: 1.9,
      body: 0x3f7a3f, head: 0x4f9a4f, leg: 0x2f4f7a,
      drops: [], xp: 3
    },
    creeper: {
      hp: 8, speed: 2.4, hw: 0.3, hh: 1.6,
      body: 0x4fae4f, head: 0x60c060, leg: 0x3c8a3c,
      drops: [], xp: 5
    },
    skeleton: {
      hp: 6, speed: 1.9, hw: 0.3, hh: 1.9,
      body: 0xbfbfbf, head: 0xe4e4e4, leg: 0xa9a9a9,
      drops: [{ id: 112, min: 0, max: 2 }], xp: 5
    },
    cow: {
      hp: 10, speed: 1.3, hw: 0.45, hh: 1.35,
      body: 0x4a3728, head: 0x35251a, leg: 0x3a2a1e,
      drops: [{ id: 114, min: 1, max: 2 }], xp: 2
    },
    chicken: {
      hp: 4, speed: 1.5, hw: 0.21, hh: 0.72,
      body: 0xe6e6e6, head: 0xf0f0f0, leg: 0xd8a13a,
      drops: [{ id: 118, min: 0, max: 1 }], xp: 1
    },
    enderman: {
      hp: 12, speed: 2.6, hw: 0.22, hh: 2.7,
      body: 0x161016, head: 0x1a1520, leg: 0x120e12,
      drops: [], xp: 5
    }
  };

  // --- textures de mobs (peintes à la main, style MC) ---
  const MOBTEX = {};
  (function () {
    function tex8(paint) {
      const cv = document.createElement('canvas');
      cv.width = 8; cv.height = 8;
      const c = cv.getContext('2d');
      const img = c.createImageData(8, 8);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const px = paint(x, y);
          const o = (y * 8 + x) * 4;
          img.data[o] = Math.max(0, Math.min(255, px[0]));
          img.data[o + 1] = Math.max(0, Math.min(255, px[1]));
          img.data[o + 2] = Math.max(0, Math.min(255, px[2]));
          img.data[o + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(cv);
      t.magFilter = THREE.NearestFilter;
      return t;
    }
    const nz = (x, y, s, base, amt) => {
      const m = (E.hash2(x * 3 + s * 97, y * 7, 901 + s) - 0.5) * amt;
      return [base[0] + m, base[1] + m, base[2] + m];
    };
    const CAMO = [[44, 110, 38], [58, 140, 48], [72, 162, 56], [30, 82, 28]];
    MOBTEX.pigSkin = tex8((x, y) => nz(x, y, 1, [238, 163, 160], 16));
    MOBTEX.pigLeg = tex8((x, y) => nz(x, y, 2, [226, 138, 136], 12));
    MOBTEX.pigFace = tex8((x, y) => {
      if (x >= 2 && x <= 5 && y >= 4 && y <= 6) {
        if ((x === 2 || x === 5) && y >= 4 && y <= 5) return [180, 84, 82];
        return [248, 196, 188];
      }
      if ((x === 1 && y === 2) || (x === 6 && y === 2)) return [252, 252, 252];
      if ((x === 1 && y === 3) || (x === 6 && y === 3)) return [42, 36, 40];
      return nz(x, y, 1, [238, 163, 160], 16);
    });
    MOBTEX.wool = tex8((x, y) => {
      const wv = ((x + (y >> 1)) % 2) ? 8 : -8;
      return nz(x, y, 3, [230 + wv, 231 + wv, 233 + wv], 10);
    });
    MOBTEX.sheepSkin = tex8((x, y) => nz(x, y, 4, [224, 210, 192], 10));
    MOBTEX.sheepFace = tex8((x, y) => {
      if (x === 0 || x === 7 || y === 0) return nz(x, y, 3, [230, 231, 233], 10); // laine
      if ((x === 1 && y === 2) || (x === 6 && y === 2)) return [30, 26, 30];
      if (x >= 3 && x <= 4 && y === 5) return [188, 122, 122];
      return nz(x, y, 4, [224, 210, 192], 10);
    });
    MOBTEX.zSkin = tex8((x, y) => nz(x, y, 5, [96, 158, 88], 18));
    MOBTEX.zShirt = tex8((x, y) => nz(x, y, 6, [56, 124, 134], 14));
    MOBTEX.zPants = tex8((x, y) => nz(x, y, 7, [68, 82, 156], 12));
    MOBTEX.zFace = tex8((x, y) => {
      if ((x === 1 || x === 2) && y === 3) return [18, 22, 18];
      if ((x === 5 || x === 6) && y === 3) return [18, 22, 18];
      if ((x === 3 || x === 4) && y === 5) return [30, 40, 30];
      return nz(x, y, 5, [96, 158, 88], 18);
    });
    MOBTEX.creeperSkin = tex8((x, y) => {
      const c = CAMO[Math.floor(E.hash2(x >> 1, y >> 1, 4242) * 4) % 4];
      return [c[0] + (E.hash2(x, y, 43) - 0.5) * 10, c[1] + (E.hash2(x, y, 44) - 0.5) * 10, c[2] + (E.hash2(x, y, 45) - 0.5) * 10];
    });
    MOBTEX.creeperFace = tex8((x, y) => {
      const inMouth = ((x === 3 || x === 4) && y >= 4 && y <= 7) || ((x === 2 || x === 5) && y >= 5 && y <= 6);
      if (inMouth) return [12, 14, 12];
      if ((x === 1 || x === 2) && y >= 2 && y <= 3) return [12, 14, 12];
      if ((x === 5 || x === 6) && y >= 2 && y <= 3) return [12, 14, 12];
      const c = CAMO[Math.floor(E.hash2(x >> 1, y >> 1, 4242) * 4) % 4];
      return c;
    });
    MOBTEX.bone = tex8((x, y) => nz(x, y, 8, [204, 200, 190], 12));
    MOBTEX.ribs = tex8((x, y) => {
      if (y === 2 || y === 4 || y === 6) return [130, 126, 118];
      return nz(x, y, 8, [204, 200, 190], 12);
    });
    MOBTEX.skFace = tex8((x, y) => {
      if ((x === 1 || x === 2) && y === 3) return [16, 16, 18];
      if ((x === 5 || x === 6) && y === 3) return [16, 16, 18];
      if (x >= 3 && x <= 4 && y === 4) return [110, 106, 98];
      if (y === 6 && x >= 2 && x <= 5) return [120, 116, 108];
      return nz(x, y, 8, [204, 200, 190], 12);
    });
    MOBTEX.bowTex = tex8((x, y) => nz(x, y, 9, [118, 84, 44], 12));
    MOBTEX.cowSkin = tex8((x, y) => {
      const patch = Math.floor(E.hash2(x >> 1, y >> 1, 606) * 2);
      if (patch) return nz(x, y, 11, [46, 34, 26], 14);
      return nz(x, y, 12, [216, 210, 198], 12);
    });
    MOBTEX.cowFace = tex8((x, y) => {
      if (y >= 5 && ((x === 0 || x === 7) && y <= 6)) return nz(x, y, 11, [46, 34, 26], 14);
      if (y >= 4 && x >= 1 && x <= 6) {
        if ((x === 1 && y >= 4 && y <= 5) || (x === 6 && y >= 4 && y <= 5)) return [20, 16, 18];
        return nz(x, y, 13, [232, 176, 168], 10);
      }
      if ((x === 1 && y === 2) || (x === 6 && y === 2)) return [250, 250, 250];
      if ((x === 1 && y === 3) || (x === 6 && y === 3)) return [30, 26, 30];
      return nz(x, y, 12, [216, 210, 198], 12);
    });
    MOBTEX.cowLeg = tex8((x, y) => nz(x, y, 14, [88, 66, 48], 12));
    MOBTEX.chSkin = tex8((x, y) => nz(x, y, 15, [238, 236, 226], 10));
    MOBTEX.chFace = tex8((x, y) => {
      if (y >= 4 && x >= 1 && x <= 6) {
        if (x >= 3 && x <= 4 && y === 4) return [214, 150, 40]; // bec
        if ((x === 1 || x === 6) && y >= 5 && y <= 6) return [214, 60, 60]; // caroncules
        if ((x === 2 || x === 5) && y === 5) return [24, 20, 24];
        return nz(x, y, 15, [238, 236, 226], 10);
      }
      return nz(x, y, 15, [238, 236, 226], 10);
    });
    MOBTEX.chComb = tex8((x, y) => nz(x, y, 16, [212, 62, 54], 14));
    MOBTEX.chLeg = tex8((x, y) => nz(x, y, 17, [216, 161, 58], 12));
    MOBTEX.eSkin = tex8((x, y) => {
      if ((x * 7 + y * 5) % 11 === 0) return [62 + ((x * 13) % 28), 34, 96]; // mouchetis violet
      return nz(x, y, 18, [18, 16, 22], 9);
    });
    MOBTEX.eFace = tex8((x, y) => {
      if (y === 2 && (x === 1 || x === 2 || x === 5 || x === 6)) return [224, 121, 250]; // yeux violets
      if (y === 1 && (x === 1 || x === 2 || x === 5 || x === 6)) return [112, 40, 160];
      return [14, 12, 18];
    });
  })();

  function makeMobMesh(type) {
    const g = new THREE.Group();
    const parts = [];
    function part(w, h, dp, texAll, texFace, x, y, z, rotX) {
      let mat;
      if (texFace) {
        const mk = () => new THREE.MeshBasicMaterial({ map: texAll });
        const face = new THREE.MeshBasicMaterial({ map: texFace });
        // ordre BoxGeometry : +x, -x, +y, -y, +z (dos), -z (face visible de face)
        mat = [mk(), mk(), mk(), mk(), mk(), face];
      } else {
        mat = new THREE.MeshBasicMaterial({ map: texAll });
      }
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat);
      m.position.set(x, y, z);
      if (rotX) m.rotation.x = rotX;
      m.userData.base = 0xffffff;
      g.add(m);
      parts.push(m);
      return m;
    }
    const T = MOBTEX;
    if (type === 'pig') {
      part(0.625, 0.5, 1.0, T.pigSkin, null, 0, 0.62, 0.06);
      part(0.5, 0.5, 0.5, T.pigSkin, T.pigFace, 0, 0.65, -0.66);
      part(0.24, 0.36, 0.24, T.pigLeg, null, -0.19, 0.18, -0.33);
      part(0.24, 0.36, 0.24, T.pigLeg, null, 0.19, 0.18, -0.33);
      part(0.24, 0.36, 0.24, T.pigLeg, null, -0.19, 0.18, 0.41);
      part(0.24, 0.36, 0.24, T.pigLeg, null, 0.19, 0.18, 0.41);
    } else if (type === 'sheep') {
      part(0.68, 0.66, 1.05, T.wool, null, 0, 0.98, 0);
      part(0.42, 0.46, 0.5, T.sheepSkin, T.sheepFace, 0, 1.22, -0.7);
      part(0.2, 0.5, 0.2, T.sheepSkin, null, -0.16, 0.25, -0.33);
      part(0.2, 0.5, 0.2, T.sheepSkin, null, 0.16, 0.25, -0.33);
      part(0.2, 0.5, 0.2, T.sheepSkin, null, -0.16, 0.25, 0.33);
      part(0.2, 0.5, 0.2, T.sheepSkin, null, 0.16, 0.25, 0.33);
    } else if (type === 'zombie') {
      part(0.5, 0.5, 0.5, T.zSkin, T.zFace, 0, 1.72, 0);
      part(0.5, 0.75, 0.26, T.zShirt, null, 0, 1.1, 0);
      part(0.22, 0.75, 0.22, T.zSkin, null, -0.36, 1.28, -0.3, -Math.PI / 2); // bras tendus
      part(0.22, 0.75, 0.22, T.zSkin, null, 0.36, 1.28, -0.3, -Math.PI / 2);
      part(0.24, 0.74, 0.24, T.zPants, null, -0.13, 0.37, 0);
      part(0.24, 0.74, 0.24, T.zPants, null, 0.13, 0.37, 0);
    } else if (type === 'creeper') {
      part(0.5, 0.5, 0.5, T.creeperSkin, T.creeperFace, 0, 1.44, 0);
      part(0.46, 0.86, 0.3, T.creeperSkin, null, 0, 0.86, 0);
      part(0.24, 0.34, 0.24, T.creeperSkin, null, -0.14, 0.17, -0.22);
      part(0.24, 0.34, 0.24, T.creeperSkin, null, 0.14, 0.17, -0.22);
      part(0.24, 0.34, 0.24, T.creeperSkin, null, -0.14, 0.17, 0.22);
      part(0.24, 0.34, 0.24, T.creeperSkin, null, 0.14, 0.17, 0.22);
    } else if (type === 'cow') {
      part(0.78, 0.68, 1.2, T.cowSkin, null, 0, 0.9, 0.05);
      part(0.55, 0.52, 0.5, T.cowSkin, T.cowFace, 0, 1.18, -0.72);
      part(0.24, 0.56, 0.24, T.cowLeg, null, -0.24, 0.28, -0.38);
      part(0.24, 0.56, 0.24, T.cowLeg, null, 0.24, 0.28, -0.38);
      part(0.24, 0.56, 0.24, T.cowLeg, null, -0.24, 0.28, 0.44);
      part(0.24, 0.56, 0.24, T.cowLeg, null, 0.24, 0.28, 0.44);
    } else if (type === 'chicken') {
      part(0.4, 0.42, 0.55, T.chSkin, null, 0, 0.52, 0.02);
      part(0.26, 0.3, 0.26, T.chSkin, T.chFace, 0, 0.82, -0.3);
      part(0.16, 0.12, 0.14, T.chComb, null, 0, 0.98, -0.3);
      part(0.06, 0.34, 0.06, T.chSkin, null, -0.24, 0.62, 0.08, -0.5); // ailes
      part(0.06, 0.34, 0.06, T.chSkin, null, 0.24, 0.62, 0.08, -0.5);
      part(0.06, 0.3, 0.06, T.chLeg, null, -0.08, 0.15, 0);
      part(0.06, 0.3, 0.06, T.chLeg, null, 0.08, 0.15, 0);
    } else if (type === 'enderman') {
      part(0.44, 0.44, 0.44, T.eSkin, T.eFace, 0, 2.48, 0);
      part(0.42, 0.85, 0.24, T.eSkin, null, 0, 1.85, 0);
      part(0.12, 1.3, 0.12, T.eSkin, null, -0.28, 1.55, 0);
      part(0.12, 1.3, 0.12, T.eSkin, null, 0.28, 1.55, 0);
      part(0.12, 1.35, 0.12, T.eSkin, null, -0.11, 0.68, 0);
      part(0.12, 1.35, 0.12, T.eSkin, null, 0.11, 0.68, 0);
    } else { // squelette
      part(0.5, 0.5, 0.5, T.bone, T.skFace, 0, 1.72, 0);
      part(0.4, 0.75, 0.16, T.ribs, null, 0, 1.1, 0);
      part(0.12, 0.72, 0.12, T.bone, null, -0.3, 1.3, -0.32, -Math.PI / 2);
      part(0.12, 0.72, 0.12, T.bone, null, 0.3, 1.3, -0.32, -Math.PI / 2);
      part(0.12, 0.74, 0.12, T.bone, null, -0.11, 0.37, 0);
      part(0.12, 0.74, 0.12, T.bone, null, 0.11, 0.37, 0);
      part(0.08, 0.5, 0.08, T.bowTex, null, 0.3, 1.3, -0.6); // petit arc
    }
    g.userData.parts = parts;
    return g;
  }

  function spawnMob(type, x, y, z) {
    const def = MOB_DEFS[type];
    const m = {
      type, def,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      yaw: Math.random() * Math.PI * 2,
      hp: def.hp, onGround: false, hw: def.hw, hh: def.hh,
      wanderT: 0, moving: false, atkT: 0, hurtT: 0
    };
    m.mesh = makeMobMesh(type);
    m.mesh.position.set(x, y, z);
    scene.add(m.mesh);
    mobs.push(m);
    return m;
  }

  function rollDrops(def) {
    const out = [];
    for (const d of def.drops) {
      const nDrops = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
      if (nDrops > 0) out.push([d.id, nDrops]);
    }
    return out;
  }

  function killMob(m, byPlayer) {
    const i = mobs.indexOf(m);
    if (i >= 0) mobs.splice(i, 1);
    scene.remove(m.mesh);
    if (byPlayer) {
      for (const d of rollDrops(m.def)) addItem(d[0], d[1]);
      addXp(m.def.xp || 1);
    }
  }

  function updateMob(m, dt) {
    if (m.hp <= 0) { killMob(m, false); return; }
    const distXZ = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
    m.atkT -= dt;
    m.hurtT -= dt;
    if (m.type === 'enderman' && E.isWater(getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y), Math.floor(m.pos.z)))) {
      m.hp -= 4 * dt; // l'eau le blesse
      m.hurtT = Math.max(m.hurtT, 0.06);
    }
    const hostile = gameMode === 'survival' && !player.dead &&
      ((m.type === 'enderman' && (m.mad || dayLight < 0.45)) ||
        (m.type === 'zombie' ? dayLight < 0.45 : m.type === 'creeper' || m.type === 'skeleton'));
    if (hostile) {
      const tDist = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
      m.yaw = Math.atan2(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
      if (m.type === 'skeleton') {
        m.moving = tDist > 9 || tDist < 4;
        if (tDist < 4) m.yaw = Math.atan2(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
        if (tDist < 14 && m.atkT <= 0) {
          m.atkT = 2.2;
          spawnArrow(m);
          playSound(320, 0.2, 0.14, 'square');
        }
      } else {
        m.moving = true;
        if (tDist < 1.6 && Math.abs(player.pos.y - m.pos.y) < 2 && m.atkT <= 0) {
          m.atkT = 1.2;
          damagePlayer(2, player.pos.x - m.pos.x, player.pos.z - m.pos.z);
        }
      }
      if (m.type === 'creeper') {
        if (tDist < 2.6) {
          if (!m.fusing) { m.fusing = true; playSound(880 + Math.random() * 120, 0.35, 0.16, 'sawtooth'); }
          m.fuseT = (m.fuseT || 0) + dt;
          if (m.fuseT >= 1.3) {
            explodeAt(m.pos.x, m.pos.y + 0.8, m.pos.z);
            killMob(m, false);
            return;
          }
        } else {
          m.fusing = false;
          m.fuseT = Math.max(0, (m.fuseT || 0) - dt * 2);
        }
      } else if (m.type === 'zombie' && Math.random() < dt * 0.12) {
        playSound(55 + Math.random() * 25, 0.6, 0.07, 'sawtooth');
      } else if (m.type === 'enderman' && Math.random() < dt * 0.06) {
        playSound(95, 0.45, 0.08, 'sawtooth');
      }
    } else {
      if (m.type === 'enderman' && gameMode === 'survival' && !player.dead) {
        const ex2 = m.pos.x - player.pos.x;
        const ey2 = (m.pos.y + 1.8) - (player.pos.y + 1.62);
        const ez2 = m.pos.z - player.pos.z;
        const ed2 = Math.sqrt(ex2 * ex2 + ey2 * ey2 + ez2 * ez2);
        if (ed2 < 20) {
          const cp2 = Math.cos(player.pitch);
          const fdx2 = -Math.sin(player.yaw) * cp2, fdy2 = Math.sin(player.pitch), fdz2 = -Math.cos(player.yaw) * cp2;
          const dot2 = (ex2 * fdx2 + ey2 * fdy2 + ez2 * fdz2) / (ed2 || 1);
          if (dot2 > 0.985) {
            if (!m.mad) playSound(60, 0.5, 0.1, 'sawtooth');
            m.mad = true;
          }
        }
      }
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2 + Math.random() * 3;
        m.moving = Math.random() < 0.6;
        m.yaw = Math.random() * Math.PI * 2;
      }
      if (m.type === 'pig' || m.type === 'sheep' || m.type === 'cow' || m.type === 'chicken') {
        if (Math.random() < dt * 0.05) {
          if (m.type === 'cow') playSound(85 + Math.random() * 22, 0.7, 0.09, 'sawtooth');
          else if (m.type === 'chicken') playSound(640 + Math.random() * 120, 0.13, 0.07, 'square');
          else playSound(m.type === 'pig' ? 175 + Math.random() * 45 : 235 + Math.random() * 45, 0.3, 0.07, 'square');
        }
      }
    }
    const speed = m.moving ? m.def.speed : 0;
    const dx = -Math.sin(m.yaw) * speed, dz = -Math.cos(m.yaw) * speed;
    const k = 1 - Math.exp(-dt * 8);
    m.vel.x += (dx - m.vel.x) * k;
    m.vel.z += (dz - m.vel.z) * k;
    const feetId = getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.1), Math.floor(m.pos.z));
    if (E.isWater(feetId)) {
      m.vel.y += (2.2 - m.vel.y) * dt * 3;
    } else {
      m.vel.y -= GRAVITY * dt;
      if (m.vel.y < -MAX_FALL) m.vel.y = -MAX_FALL;
    }
    m.onGround = false;
    if (moveEnt(m, 1, m.vel.y * dt)) {
      if (m.vel.y < 0) m.onGround = true;
      m.vel.y = 0;
    }
    const hitX = moveEnt(m, 0, m.vel.x * dt);
    const hitZ = moveEnt(m, 2, m.vel.z * dt);
    if ((hitX || hitZ) && m.onGround) m.vel.y = JUMP_V * 0.8;
    if (m.type === 'zombie' && dayLight > 0.4) {
      m.hp -= 3 * dt;
      m.hurtT = 0.1;
      if (m.hp <= 0) { killMob(m, false); return; }
    }
    if (m.pos.y < -20) { killMob(m, false); return; }
    m.mesh.position.set(m.pos.x, m.pos.y, m.pos.z);
    m.mesh.rotation.y = m.yaw;
    const flash = m.hurtT > 0;
    for (const p of m.mesh.userData.parts) {
      if (Array.isArray(p.material)) {
        for (const mm of p.material) mm.color.setHex(flash ? 0xff5555 : 0xffffff);
      } else {
        p.material.color.setHex(flash ? 0xff5555 : p.userData.base);
      }
    }
  }

  const arrows = [];
  function throwEgg() {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xf1e6c8 }));
    scene.add(mesh);
    arrows.push({
      pos: new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z),
      v: dir.multiplyScalar(19),
      life: 4, mesh, from: 'player', dmg: 1, egg: true
    });
    arrows[arrows.length - 1].v.y += 2.2;
    playSound(520, 0.1, 0.09, 'sine');
  }

  function spawnTpParticles(x, y, z) {
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color: 0xb76ce8 }));
      m.position.set(x - 0.4 + Math.random() * 0.8, y - 0.2 + Math.random() * 2.2, z - 0.4 + Math.random() * 0.8);
      scene.add(m);
      particles.push({
        m, life: 0.8,
        vx: (Math.random() - 0.5) * 2.4, vy: 1.2 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 2.4
      });
    }
  }
  function teleportMob(m3) {
    spawnTpParticles(m3.pos.x, m3.pos.y, m3.pos.z);
    for (let t3 = 0; t3 < 8; t3++) {
      const ang3 = Math.random() * Math.PI * 2;
      const d3 = 6 + Math.random() * 14;
      const tx3 = Math.floor(player.pos.x + Math.cos(ang3) * d3);
      const tz3 = Math.floor(player.pos.z + Math.sin(ang3) * d3);
      for (let y3 = E.WORLD_H - 2; y3 >= 1; y3--) {
        const id3 = getBlock(tx3, y3, tz3);
        if (BLOCKS[id3] && BLOCKS[id3].solid && !BLOCKS[id3].door) {
          const a1 = getBlock(tx3, y3 + 1, tz3), a2 = getBlock(tx3, y3 + 2, tz3);
          if ((!a1 || !BLOCKS[a1].solid) && (!a2 || !BLOCKS[a2].solid)) {
            m3.pos.set(tx3 + 0.5, y3 + 1.01, tz3 + 0.5);
            m3.vel.x = 0; m3.vel.y = 0; m3.vel.z = 0;
            spawnTpParticles(m3.pos.x, m3.pos.y, m3.pos.z);
            playSound(720, 0.4, 0.09, 'sine');
            playSound(360, 0.5, 0.07, 'sine');
            return true;
          }
          break;
        }
      }
    }
    return false;
  }

  function spawnArrow(shooter) {
    const dx = player.pos.x - shooter.pos.x, dy = (player.pos.y + 1.2) - (shooter.pos.y + 1.5),
          dz = player.pos.z - shooter.pos.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), new THREE.MeshBasicMaterial({ color: 0x8a6b45 }));
    scene.add(mesh);
    arrows.push({
      pos: new THREE.Vector3(shooter.pos.x, shooter.pos.y + 1.5, shooter.pos.z),
      v: new THREE.Vector3(dx / d * 16, dy / d * 16 + 1.6, dz / d * 16),
      life: 5, mesh, from: 'mob', dmg: 3
    });
  }
  function updateArrows(dt) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      const ax0 = a.pos.x, ay0 = a.pos.y, az0 = a.pos.z;
      a.life -= dt;
      a.v.y -= 14 * dt;
      a.pos.x += a.v.x * dt; a.pos.y += a.v.y * dt; a.pos.z += a.v.z * dt;
      const bid = getBlock(Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z));
      const hitBlock = bid !== AIR && E.isSolid(bid);
      const d2p = Math.hypot(player.pos.x - a.pos.x, (player.pos.y + 0.9) - a.pos.y, player.pos.z - a.pos.z);
      a.mesh.position.set(a.pos.x, a.pos.y, a.pos.z);
      if (a.life <= 0 || hitBlock) {
        scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose();
        arrows.splice(i, 1);
        if (hitBlock) playSound(90, 0.06, 0.08);
        continue;
      }
      if (a.from !== 'player' && d2p < 0.9 && !player.dead) {
        damagePlayer(a.dmg || 3, a.v.x, a.v.z);
        scene.remove(a.mesh); arrows.splice(i, 1);
        continue;
      }
      if (hitBlock && !a.egg && a.from === 'player' && Math.random() < 0.4) addItem(112, 1); // flèche parfois récupérée
      if (a.from === 'player') {
        // balayage le long du déplacement de la frame (évite de traverser les mobs à grande vitesse)
        let hitM = null;
        for (const m of mobs) {
          for (let ss = 0; ss <= 4 && !hitM; ss++) {
            const sx = ax0 + (a.pos.x - ax0) * ss / 4;
            const sy = ay0 + (a.pos.y - ay0) * ss / 4;
            const sz = az0 + (a.pos.z - az0) * ss / 4;
            const dm = Math.hypot(m.pos.x - sx, (m.pos.y + m.hh * 0.5) - sy, m.pos.z - sz);
            if (dm < m.hw + 0.35) hitM = m;
          }
          if (hitM) break;
        }
        if (hitM) {
          if (hitM.type === 'enderman' && !hitM.dead && hitM.hp > 0) {
            hitM.mad = true;
            teleportMob(hitM);
            scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); arrows.splice(i, 1);
            continue;
          }
          hitM.hp -= a.dmg || 3;
          hitM.hurtT = 0.25;
          const kx = hitM.pos.x - a.pos.x, kz = hitM.pos.z - a.pos.z, kd = Math.hypot(kx, kz) || 1;
          hitM.vel.x += kx / kd * 5; hitM.vel.z += kz / kd * 5; hitM.vel.y = 3;
          playSound(200, 0.12, 0.12);
          scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); arrows.splice(i, 1);
          if (hitM.hp <= 0) killMob(hitM, true);
          continue;
        }
      }
    }
  }
  function releaseBow() {
    const power = Math.min(1, bowT / 1.1);
    bowCharging = false;
    bowT = 0;
    if (power < 0.12) return;
    if (gameMode === 'survival' && countItem(112) <= 0) { showToast('Plus de flèches !'); return; }
    if (gameMode === 'survival') takeItem(112, 1);
    spawnPlayerArrow(power);
    swingT = 1;
  }
  function spawnPlayerArrow(power) {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), new THREE.MeshBasicMaterial({ color: 0x8a6b45 }));
    scene.add(mesh);
    arrows.push({
      pos: new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z),
      v: dir.multiplyScalar(26 * power),
      life: 6, mesh, from: 'player', dmg: Math.round(1 + 8 * power)
    });
    playSound(480, 0.16, 0.11, 'square');
  }
  function explodeAt(x, y, z) {
    const R = 2.8;
    const broken = [];
    for (let bx = Math.floor(x - R); bx <= Math.floor(x + R); bx++) {
      for (let by = Math.floor(y - R); by <= Math.floor(y + R); by++) {
        for (let bz = Math.floor(z - R); bz <= Math.floor(z + R); bz++) {
          const d = Math.hypot(bx + 0.5 - x, by + 0.5 - y, bz + 0.5 - z);
          if (d > R) continue;
          const id = getBlock(bx, by, bz);
          if (id === AIR || id === BEDROCK || E.isWater(id)) continue;
          if (id === CHEST) spillChest(bx, by, bz);
          if (id === FURNACE) spillFurnace(bx, by, bz);
          applyBlock(bx, by, bz, AIR, true);
          broken.push([bx, by, bz, id]);
        }
      }
    }
    for (let i = 0; i < Math.min(broken.length, 10); i++) {
      const bk = broken[(i * 3) % broken.length];
      spawnBlockParticles(bk[0], bk[1], bk[2], bk[3]);
    }
    playSound(70, 0.6, 0.5, 'sawtooth');
    const dp = Math.hypot(player.pos.x - x, (player.pos.y + 0.9) - y, player.pos.z - z);
    if (dp < 7) damagePlayer(Math.round(14 * (1 - dp / 7)), player.pos.x - x, player.pos.z - z);
    for (const m2 of mobs.slice()) {
      const dm = Math.hypot(m2.pos.x - x, (m2.pos.y + 0.6) - y, m2.pos.z - z);
      if (dm < 7) { m2.hp -= Math.round(12 * (1 - dm / 7)); m2.hurtT = 0.3; }
    }
  }

  let spawnTimer = 0;
  function trySpawnMobs(dt) {
    spawnTimer -= dt;
    if (spawnTimer > 0) return;
    spawnTimer = 1.5;
    if (mobs.length >= 14) return;
    const night = dayLight < 0.45;
    if (Math.random() > (night ? 0.7 : 0.4)) return;
    const pool = night
      ? ['zombie', 'zombie', 'skeleton', 'skeleton', 'creeper', 'pig', 'sheep', 'enderman']
      : ['pig', 'sheep', 'cow', 'cow', 'chicken'];
    const type = pool[(Math.random() * pool.length) | 0];
    let count = 0;
    for (const m of mobs) if (m.type === type) count++;
    if (count >= 8) return;
    const ang = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 20;
    const x = Math.floor(player.pos.x + Math.cos(ang) * dist);
    const z = Math.floor(player.pos.z + Math.sin(ang) * dist);
    for (let y = WORLD_H - 2; y > 1; y--) {
      const id = getBlock(x, y, z);
      if (id === AIR) continue;
      if (!E.isSolid(id) || E.isWater(id)) return;
      if (getBlock(x, y + 1, z) !== AIR) return;
      spawnMob(type, x + 0.5, y + 1, z + 0.5);
      return;
    }
  }

  function pickMob() {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    let best = null, bestD = 3.6;
    for (const m of mobs) {
      const c = new THREE.Vector3(m.pos.x, m.pos.y + m.def.hh / 2, m.pos.z).sub(camera.position);
      const d = c.length();
      if (d > bestD) continue;
      c.normalize();
      if (c.dot(dir) < 0.88) continue;
      best = m;
      bestD = d;
    }
    return best;
  }

  const inv = new Array(36).fill(null);
  const craftCells = new Array(9).fill(null);
  let craftSize = 2;
  let craftResult = null;
  let cursorStack = null;
  let invOpen = false;
  let selectedSlot = 0;

  function itemName(id) { return id >= 100 ? ITEMS[id].name : (BLOCKS[id] ? BLOCKS[id].name : '?'); }
  function maxStack(id) { return id >= 100 && ITEMS[id].maxStack ? ITEMS[id].maxStack : 64; }
  function itemTile(id) { return id >= 100 ? ITEMS[id].tile : BLOCKS[id].side; }

  function addItem(id, count) {
    let left = count;
    for (let pass = 0; pass < 2 && left > 0; pass++) {
      for (let i = 0; i < 36 && left > 0; i++) {
        const s = inv[i];
        if (pass === 0) {
          if (s && s.id === id && s.count < maxStack(id)) {
            const add = Math.min(left, maxStack(id) - s.count);
            s.count += add;
            left -= add;
          }
        } else if (!s) {
          const add = Math.min(left, maxStack(id));
          inv[i] = { id, count: add };
          left -= add;
        }
      }
    }
    updateHotbarUI();
    if (invOpen) renderInventory();
    return left;
  }

  function currentGrid() {
    const g = [];
    for (let r = 0; r < craftSize; r++) {
      const row = [];
      for (let c = 0; c < craftSize; c++) {
        const s = craftCells[r * 3 + c];
        row.push(s ? s.id : 0);
      }
      g.push(row);
    }
    return trimShape(g);
  }

  function matchRecipe() {
    const g = currentGrid();
    if (!g.length) return null;
    outer: for (const r of RECIPES) {
      if (r.rows.length !== g.length || r.rows[0].length !== g[0].length) continue;
      for (let y = 0; y < g.length; y++) {
        for (let x = 0; x < g[0].length; x++) {
          if (r.rows[y][x] !== g[y][x]) continue outer;
        }
      }
      return { id: r.out.id, count: r.out.count };
    }
    return null;
  }

  function updateCraftResult() {
    craftResult = matchRecipe();
    if (invOpen) renderSlotContent(resultSlotEl, craftResult);
  }

  function takeResult() {
    if (!craftResult) return;
    if (cursorStack && (cursorStack.id !== craftResult.id ||
        cursorStack.count + craftResult.count > maxStack(craftResult.id))) return;
    if (cursorStack) cursorStack.count += craftResult.count;
    else cursorStack = { id: craftResult.id, count: craftResult.count };
    for (let i = 0; i < 9; i++) {
      const s = craftCells[i];
      if (s) {
        s.count--;
        if (s.count <= 0) craftCells[i] = null;
      }
    }
    playSound(500, 0.08, 0.1);
    updateCraftResult();
    renderInventory();
    updateHotbarUI();
  }

  function slotClick(arr, i, button) {
    const s = arr[i];
    if (button === 2) {
      if (cursorStack) {
        if (!s) {
          arr[i] = { id: cursorStack.id, count: 1 };
          cursorStack.count--;
        } else if (s.id === cursorStack.id && s.count < maxStack(s.id)) {
          s.count++;
          cursorStack.count--;
        }
        if (cursorStack.count <= 0) cursorStack = null;
      } else if (s) {
        const take = Math.ceil(s.count / 2);
        cursorStack = { id: s.id, count: take };
        s.count -= take;
        if (s.count <= 0) arr[i] = null;
      }
    } else {
      if (cursorStack) {
        if (!s) {
          arr[i] = cursorStack;
          cursorStack = null;
        } else if (s.id === cursorStack.id) {
          const add = Math.min(cursorStack.count, maxStack(s.id) - s.count);
          s.count += add;
          cursorStack.count -= add;
          if (cursorStack.count <= 0) cursorStack = null;
        } else {
          arr[i] = cursorStack;
          cursorStack = s;
        }
      } else if (s) {
        cursorStack = s;
        arr[i] = null;
      }
    }
    updateCraftResult();
    renderInventory();
    updateHotbarUI();
  }

  function drawItemIcon(ctx, id) {
    const t = itemTile(id);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(atlasCanvas, (t % 8) * 16, ((t / 8) | 0) * 16, 16, 16, 0, 0, 32, 32);
  }

  function nameFor(id) {
    if (id >= 100) return ITEMS[id] ? ITEMS[id].name : '';
    return E.BLOCKS[id] ? E.BLOCKS[id].name : '';
  }
  function countItem(id) {
    let n = 0;
    for (let i = 0; i < 36; i++) if (inv[i] && inv[i].id === id) n += inv[i].count;
    return n;
  }
  function takeItem(id, nn) {
    for (let i = 0; i < 36 && nn > 0; i++) {
      const st = inv[i];
      if (st && st.id === id) {
        const t = Math.min(nn, st.count);
        st.count -= t; nn -= t;
        if (st.count <= 0) inv[i] = null;
      }
    }
    updateHotbarUI();
  }
  function renderSlotContent(el, stack) {
    el.innerHTML = '';
    if (el.setAttribute) {
      if (stack && nameFor(stack.id)) el.setAttribute('data-tip', nameFor(stack.id));
      else el.setAttribute('data-tip', '');
    }
    if (!stack) return;
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 32;
    drawItemIcon(cv.getContext('2d'), stack.id);
    el.appendChild(cv);
    if (stack.count > 1) {
      const cnt = document.createElement('span');
      cnt.className = 'cnt';
      cnt.textContent = stack.count;
      el.appendChild(cnt);
    }
  }

  const invMainSlotEls = [];
  const invHotbarSlotEls = [];
  const craftSlotEls = [];
  const hotbarSlotEls = [];

  function makeInvSlot(parent, arr, i) {
    const el = document.createElement('div');
    el.className = 'slot';
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      slotClick(arr, i, e.button);
    });
    parent.appendChild(el);
    return el;
  }

  function buildInventoryDom() {
    invMainEl.innerHTML = '';
    for (let i = 9; i < 36; i++) invMainSlotEls[i] = makeInvSlot(invMainEl, inv, i);
    invHotbarEl.innerHTML = '';
    for (let i = 0; i < 9; i++) invHotbarSlotEls[i] = makeInvSlot(invHotbarEl, inv, i);
    resultSlotEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (e.button === 0) takeResult();
    });
  }

  function rebuildCraftGrid() {
    craftGridEl.innerHTML = '';
    craftSlotEls.length = 0;
    craftGridEl.style.gridTemplateColumns = 'repeat(' + craftSize + ', 54px)';
    for (let r = 0; r < craftSize; r++) {
      for (let c = 0; c < craftSize; c++) {
        const i = r * 3 + c;
        const el = document.createElement('div');
        el.className = 'slot';
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          slotClick(craftCells, i, e.button);
        });
        craftGridEl.appendChild(el);
        craftSlotEls.push({ el, i });
      }
    }
  }

  function renderInventory() {
    for (let i = 0; i < 27; i++) { if (openChestArr && chestSlotEls[i]) renderSlotContent(chestSlotEls[i], openChestArr[i]); }
    if (openFurnaceKey) {
      const ff = furnaceData.get(openFurnaceKey);
      if (ff && furnSlotEls.inp) {
        renderSlotContent(furnSlotEls.inp, ff.inpA[0]);
        renderSlotContent(furnSlotEls.fuel, ff.fuelA[0]);
        renderSlotContent(furnSlotEls.out, ff.outA[0]);
      }
    }
    for (let i = 9; i < 36; i++) renderSlotContent(invMainSlotEls[i], inv[i]);
    for (let i = 0; i < 9; i++) renderSlotContent(invHotbarSlotEls[i], inv[i]);
    for (const cs of craftSlotEls) renderSlotContent(cs.el, craftCells[cs.i]);
    renderSlotContent(resultSlotEl, craftResult);
    renderCursorStack();
  }

  function renderCursorStack() {
    if (cursorStack) {
      cursorStackEl.classList.remove('hidden');
      renderSlotContent(cursorStackEl, cursorStack);
    } else {
      cursorStackEl.classList.add('hidden');
      cursorStackEl.innerHTML = '';
    }
  }

  function openInventory(size) {
    craftSize = size || 2;
    openChestArr = null;
    craftGridEl.classList.remove('hidden');
    resultSlotEl.classList.remove('hidden');
    invOpen = true;
    invTitleEl.textContent = craftSize === 3 ? '\u00c9tabli' : 'Inventaire';
    rebuildCraftGrid();
    updateCraftResult();
    renderInventory();
    invEl.classList.remove('hidden');
    keys.clear();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function closeInventory() {
    invOpen = false;
    for (let i = 0; i < 9; i++) {
      if (craftCells[i]) {
        addItem(craftCells[i].id, craftCells[i].count);
        craftCells[i] = null;
      }
    }
    if (cursorStack) {
      addItem(cursorStack.id, cursorStack.count);
      cursorStack = null;
    }
    craftResult = null;
    openChestArr = null;
    openFurnaceKey = null;
    furnSlotEls.inp = furnSlotEls.fuel = furnSlotEls.out = null;
    if (furnaceRowEl) { furnaceRowEl.classList.add('hidden'); furnaceRowEl.innerHTML = ''; }
    craftGridEl.classList.remove('hidden');
    resultSlotEl.classList.remove('hidden');
    invEl.classList.add('hidden');
    renderCursorStack();
    updateHotbarUI();
    if (gameState === 'playing' && !player.dead) canvas.requestPointerLock();
  }

  function buildHotbar() {
    hotbarEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const el = document.createElement('div');
      el.className = 'slot' + (i === 0 ? ' selected' : '');
      el.addEventListener('mousedown', () => selectSlot(i));
      hotbarEl.appendChild(el);
      hotbarSlotEls.push(el);
    }
  }

  function updateHotbarUI() {
    for (let i = 0; i < 9; i++) renderSlotContent(hotbarSlotEls[i], inv[i]);
  }

  function selectSlot(i) {
    selectedSlot = i;
    for (let j = 0; j < 9; j++) hotbarSlotEls[j].classList.toggle('selected', j === i);
  }

  const chunks = new Map();
  let meshQueue = [];
  let lastScanKey = null;
  const editsByChunk = new Map();
  let saveTimer = null;
  const torchesByChunk = new Map();
  const tickQueue = new Set();
  const dirtyChunks = new Set();
  let waterTimer = 0;

  const player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    yaw: 0, pitch: 0, onGround: false, fly: false,
    hw: PLAYER_W / 2, hh: PLAYER_H,
    hp: 20, maxHp: 20, dead: false, hurtCd: 0, regenT: 0,
    hunger: 20, exhaust: 0, starveT: 0,
    fallStartY: null, inWater: false
  };
  const spawnPoint = new THREE.Vector3();
  const keys = new Set();
  let renderDist = 4;
  let baseFogNear = 40, baseFogFar = 80;
  let gameState = 'menu';
  let loadingTotal = 1;
  let currentHit = null;
  let debugVisible = false;
  let fpsFrames = 0, fpsTime = 0, fpsValue = 0;

  const HARDNESS = {
    [LEAVES]: 0.4, [GRASS]: 0.75, [DIRT]: 0.75, [SAND]: 0.75, [GRAVEL]: 0.9,
    [SNOW]: 0.6, [LOG]: 1.5, [PLANKS]: 1.5, [TABLE]: 1.5, [WOOL]: 1.0,
    [GLASS]: 0.5, [TORCH]: 0.1,
    [FLOWER_RED]: 0.05, [FLOWER_YELLOW]: 0.05, [TALLGRASS]: 0.05, [BED]: 0.2, [CHEST]: 1.6,
    [DOOR_L]: 1.2, [DOOR_U]: 1.2, [SIGN]: 0.8,
    [STONE]: 2.4, [COBBLE]: 2.4, [BRICK]: 2.4,
    [COAL_ORE]: 2.8, [IRON_ORE]: 3.2, [FURNACE]: 3.5
  };
  function hardnessFor(id) { return HARDNESS[id] || 1.5; }

  let gameMode = 'survival';
  let mining = null;
  let mouseLeftDown = false;
  let stepT = 1.5, wasInWater = false, fallTimer = 0;
  const fallQueue = new Set();

  const particles = [];
  const particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  function blockSound(id) {
    if (id === STONE || id === COBBLE || id === BRICK || id === COAL_ORE || id === IRON_ORE || id === BEDROCK) return [95, 'square'];
    if (id === LOG || id === PLANKS || id === TABLE) return [170, 'square'];
    if (id === GLASS) return [430, 'triangle'];
    if (id === LEAVES || id === WOOL) return [250, 'triangle'];
    return [105, 'triangle'];
  }
  function heldTool() {
    const held = inv[selectedSlot];
    const it = held && held.id >= 100 ? ITEMS[held.id] : null;
    return it && it.pick ? it.pick : null;
  }
  function isStoneLike(id) {
    return id === STONE || id === COBBLE || id === BRICK || id === COAL_ORE || id === IRON_ORE || id === FURNACE;
  }
  function breakBlockAt(x, y, z, id, canDrop) {
    if (id === CHEST) spillChest(x, y, z);
    if (id === FURNACE) spillFurnace(x, y, z);
    if (id === DOOR_L && getBlock(x, y + 1, z) === DOOR_U) applyBlock(x, y + 1, z, AIR, true);
    if (id === DOOR_U && getBlock(x, y - 1, z) === DOOR_L) applyBlock(x, y - 1, z, AIR, true);
    doorOpen.delete(doorLowerKeyAt(x, y, z, id));
    if (id === SIGN) signData.delete(x + ',' + y + ',' + z);
    applyBlock(x, y, z, AIR, true);
    spawnBlockParticles(x, y, z, id);
    const bs = blockSound(id);
    playSound(bs[0], 0.14, 0.13, bs[1]);
    if (canDrop === false || gameMode === 'creative') return;
    const drop = dropFor(id, heldTool());
    if (drop !== null) addItem(drop, 1);
    if (gameMode === 'survival' && id === COAL_ORE) addXp(1);
    if (gameMode === 'survival' && id === IRON_ORE) addXp(2);
  }
  function spawnBlockParticles(x, y, z, id) {
    const b = BLOCKS[id];
    if (!b) return;
    let col = 0x888888;
    try { col = tileAvgColor(b.side); } catch (err) {}
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(particleGeo, new THREE.MeshBasicMaterial({ color: col }));
      m.position.set(x + 0.2 + Math.random() * 0.6, y + 0.25 + Math.random() * 0.5, z + 0.2 + Math.random() * 0.6);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      scene.add(m);
      particles.push({
        m, life: 0.5 + Math.random() * 0.25,
        vx: (Math.random() - 0.5) * 3.2, vy: 2.2 + Math.random() * 2.4, vz: (Math.random() - 0.5) * 3.2
      });
    }
  }
  function tileAvgColor(tile) {
    const d = atlasCtx.getImageData((tile % 8) * 16 + 8, ((tile / 8) | 0) * 16 + 8, 3, 3).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < 9; i++) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; }
    return (Math.round(r / 9) << 16) | (Math.round(g / 9) << 8) | Math.round(b / 9);
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { scene.remove(p.m); p.m.material.dispose(); particles.splice(i, 1); continue; }
      p.vy -= 20 * dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y += p.vy * dt;
      p.m.position.z += p.vz * dt;
      const s = Math.max(0.25, p.life * 1.8);
      p.m.scale.set(s, s, s);
    }
  }

  function updateMining(dt) {
    if (!mouseLeftDown || !mining) {
      breakBarEl.classList.add('hidden');
      return;
    }
    if (document.pointerLockElement !== canvas || invOpen || player.dead) {
      mining = null;
      mouseLeftDown = false;
      breakBarEl.classList.add('hidden');
      return;
    }
    if (!currentHit || currentHit.x !== mining.x || currentHit.y !== mining.y || currentHit.z !== mining.z) {
      mining = currentHit ? { x: currentHit.x, y: currentHit.y, z: currentHit.z, progress: 0 } : null;
      if (!mining) return;
    }
    const id = getBlock(mining.x, mining.y, mining.z);
    if (id === AIR || (BLOCKS[id] && BLOCKS[id].unbreakable)) {
      mining = null;
      breakBarEl.classList.add('hidden');
      return;
    }
    mining.progress += dt * (heldTool() && isStoneLike(id) ? heldTool() : 1) / hardnessFor(id);
    breakBarEl.classList.remove('hidden');
    mineSwingT -= dt;
    if (mineSwingT <= 0) { mineSwingT = 0.3; swingT = 1; }
    breakFillEl.style.width = Math.min(100, Math.round(mining.progress * 100)) + '%';
    if (mining.progress >= 1) {
      breakBlockAt(mining.x, mining.y, mining.z, id);
      mining = null;
      breakBarEl.classList.add('hidden');
    }
  }

  let audioCtx = null;
  function playSound(freq, dur, vol, type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (err) {}
  }

  // --- musique d'ambiance calme ---
  let musicOn = true;
  let musicTimer = 4;
  const MUS_DAY = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [196.0, 246.9, 293.7], [174.6, 220.0, 261.6]];
  const MUS_NIGHT = [[220.0, 261.6, 311.1], [196.0, 233.1, 293.7], [164.8, 196.0, 246.9], [185.0, 220.0, 277.2]];
  let musicChord = 0;
  function tickMusic(dt) {
    if (!musicOn || gameState !== 'playing') return;
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 9 + Math.random() * 6;
    const chords = dayLight < 0.4 ? MUS_NIGHT : MUS_DAY;
    const ch = chords[musicChord % chords.length];
    musicChord++;
    const arp = [ch[0], ch[1], ch[2], ch[1], ch[0], ch[2], ch[1], ch[0]];
    arp.forEach((f, i) => {
      setTimeout(() => playSound(f * 2, 1.6, 0.018, 'sine'), i * 420);
      setTimeout(() => playSound(f, 1.6, 0.012, 'triangle'), i * 420);
    });
  }
  function toggleMusic() {
    musicOn = !musicOn;
    showToast('Musique : ' + (musicOn ? 'ON' : 'OFF'));
    return musicOn;
  }

  function hashString(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h | 0;
  }

  function applyRenderDistance() {
    const d = renderDist * CHUNK;
    baseFogNear = Math.max(16, d - 30);
    baseFogFar = d - 2;
    camera.far = Math.max(500, d + 80);
    camera.updateProjectionMatrix();
  }

  function dropFor(id, tool) {
    if (id === GRASS) return DIRT;
    if (id === TALLGRASS) return null;
    if (id === DOOR_U) return DOOR_L;
    if (id === DOOR_L) return DOOR_L;
    if (isStoneLike(id)) {
      if (!tool) return null;
      if (id === IRON_ORE && tool < 2.6) return null; // une pioche en bois suffit (comme MC)
      if (id === STONE) return COBBLE;
      if (id === COAL_ORE) return 100;
      if (id === IRON_ORE) return 105;
    }
    if (id === LEAVES) return Math.random() < 0.12 ? 101 : null;
    return id;
  }

  function blockIntersectsPlayer(x, y, z) {
    const hw = PLAYER_W / 2, p = player.pos;
    return x + 1 > p.x - hw && x < p.x + hw &&
           y + 1 > p.y && y < p.y + PLAYER_H &&
           z + 1 > p.z - hw && z < p.z + hw;
  }

  function startGame() {
    const raw = seedInput.value.trim();
    let seed = parseInt(raw, 10);
    if (!Number.isFinite(seed) || String(seed) !== raw) seed = hashString(raw || String(Date.now()));
    if (netState.active && netState.role === 'guest' && netState.seedOverride !== null) {
      seed = netState.seedOverride; // le monde doit matcher celui de l'hôte
    }
    E.setSeed(seed);
    try { localStorage.setItem('webcraft_seed', String(seed)); } catch (e) {}
    loadEdits(seed);
    gameMode = modeSelect.value;
    renderDist = parseInt(renderDistSelect.value, 10) || 4;
    applyRenderDistance();
    resetWorld();
    spawnPlayer();
    dayTime = 0.03;
    if (guestStartDayTime !== null) {
      dayTime = guestStartDayTime;
      guestStartDayTime = null;
      updateSky();
    }
    player.hp = 20;
    player.dead = false;
    player.hurtCd = 0;
    player.regenT = 0;
    player.fallStartY = null;
    player.hunger = 20;
    player.exhaust = 0;
    player.starveT = 0;
    swingT = 0;
    for (let i = 0; i < 36; i++) inv[i] = null;
    for (let i = 0; i < 9; i++) craftCells[i] = null;
    cursorStack = null;
    craftResult = null;
    selectedSlot = 0;
    if (gameMode === 'creative') {
      [GRASS, DIRT, STONE, SAND, LOG, LEAVES, PLANKS, COBBLE, GLASS, BRICK,
       SNOW, GRAVEL, WOOL, COAL_ORE, IRON_ORE, TABLE, TORCH,
       FLOWER_RED, FLOWER_YELLOW, TALLGRASS, BED, CHEST, FURNACE, DOOR_L, SIGN].forEach((id, i) => {
        inv[i] = { id, count: 64 };
      });
      inv[22] = { id: 107, count: 1 };
      inv[23] = { id: 108, count: 1 };
      inv[24] = { id: 109, count: 1 };
      inv[25] = { id: 113, count: 1 };
      inv[26] = { id: 112, count: 64 };
      inv[27] = { id: 116, count: 1 };
      inv[28] = { id: 118, count: 16 };
    }
    xp = 0; xpLevel = 0;
    updateHealthUI();
    updateHungerUI();
    updateXpUI();
    updateHotbarUI();
    gameState = 'loading';
    loadingTotal = meshQueue.length || 1;
    menuEl.classList.add('hidden');
    pauseEl.classList.add('hidden');
    deathEl.classList.add('hidden');
    hud.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
  }

  function resetWorld() {
    villages.length = 0;
    chestData.clear();
    furnaceData.clear();
    openFurnaceKey = null;
    doorOpen.clear();
    signData.clear();
    for (const ch of chunks.values()) unloadChunk(ch);
    chunks.clear();
    meshQueue = [];
    lastScanKey = null;
    torchesByChunk.clear();
    tickQueue.clear();
    dirtyChunks.clear();
    waterTimer = 0;
    while (mobs.length) killMob(mobs[0], false);
  }

  function spawnPlayer() {
    let sx = 0.5, sz = 0.5, sy = E.terrainHeight(0, 0) + 2;
    for (let i = 0; i < 300; i++) {
      const x = (i * 5) % 120 - 60;
      const h = E.terrainHeight(x, 0);
      if (h > WATER_LEVEL + 1) { sx = x + 0.5; sz = 0.5; sy = h + 2; break; }
    }
    player.pos.set(sx, sy, sz);
    player.vel.set(0, 0, 0);
    player.yaw = Math.PI * 0.25;
    player.pitch = 0;
    player.onGround = false;
    player.fly = false;
    spawnPoint.copy(player.pos);
    updateChunks(true);
  }

  function finishLoading() {
    gameState = 'playing';
    loadingEl.classList.add('hidden');
    hintEl.classList.remove('hidden');
  }

  function quitToMenu() {
    saveEdits();
    if (netState.active) netPublish({ t: 'bye', from: netState.id });
    gameState = 'menu';
    pauseEl.classList.add('hidden');
    hud.classList.add('hidden');
    hintEl.classList.add('hidden');
    invEl.classList.add('hidden');
    deathEl.classList.add('hidden');
    invOpen = false;
    menuEl.classList.remove('hidden');
  }

  function setDirtBackground() {
    const cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 16;
    const c = cv.getContext('2d');
    c.drawImage(atlasCanvas, 32, 0, 16, 16, 0, 0, 16, 16);
    c.fillStyle = 'rgba(0,0,0,0.62)';
    c.fillRect(0, 0, 16, 16);
    const url = 'url(' + cv.toDataURL() + ')';
    document.querySelectorAll('.dirt-bg').forEach((el) => { el.style.backgroundImage = url; });
  }

  let signReadEl = null;
  function updateSignRead() {
    if (!signReadEl) signReadEl = document.getElementById('sign-read');
    let text = null;
    if (currentHit && gameState === 'playing' && !invOpen && !player.dead) {
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      if (id === SIGN) text = signData.get(currentHit.x + ',' + currentHit.y + ',' + currentHit.z) || null;
    }
    if (signReadEl) {
      if (text) {
        signReadEl.textContent = text;
        signReadEl.classList.remove('hidden');
      } else signReadEl.classList.add('hidden');
    }
  }

  // ==================== MINIMAP ====================
  const miniCanvas = document.getElementById('minimap');
  const mctx = miniCanvas ? miniCanvas.getContext('2d') : null;
  const miniTemp = document.createElement('canvas');
  miniTemp.width = 64; miniTemp.height = 64;
  const miniCtx = miniTemp.getContext('2d');
  let miniTimer = 0;
  function updateMinimap() {
    if (gameState !== 'playing' || !mctx || !miniCtx) return;
    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    const ox = px - 32, oz = pz - 32;
    const img = miniCtx.createImageData(64, 64);
    const data = img.data;
    for (let j = 0; j < 64; j++) {
      for (let i = 0; i < 64; i++) {
        const wx = ox + i, wz = oz + j;
        let r = 0, g = 0, b = 0, got = false;
        for (let y = E.WORLD_H - 2; y >= 1; y--) {
          const id = getBlock(wx, y, wz);
          if (!id) continue;
          if (E.isWater(id)) { r = 26; g = 75; b = 184; }
          else {
            const c3 = MINI_COLORS[id] || [130, 130, 130];
            const shade = y <= py - 6 ? 0.62 : (y >= py + 6 ? 1.18 : 0.92);
            r = Math.min(255, c3[0] * shade); g = Math.min(255, c3[1] * shade); b = Math.min(255, c3[2] * shade);
          }
          got = true;
          break;
        }
        const o = (j * 64 + i) * 4;
        data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = got ? 255 : 0;
      }
    }
    miniCtx.putImageData(img, 0, 0);
    mctx.imageSmoothingEnabled = false;
    mctx.clearRect(0, 0, 132, 132);
    mctx.drawImage(miniTemp, 0, 0, 64, 64, 0, 0, 132, 132);
    // points des mobs (rouge = hostile, blanc = passif)
    if (typeof mobs !== 'undefined') {
      for (const m of mobs) {
        if (!m || m.dead) continue;
        const mxp = (m.pos.x - ox) * (132 / 64), mzp = (m.pos.z - oz) * (132 / 64);
        if (mxp < 0 || mxp > 132 || mzp < 0 || mzp > 132) continue;
        mctx.fillStyle = (m.type === 'zombie' || m.type === 'skeleton' || m.type === 'creeper' ||
          (m.type === 'enderman' && m.mad)) ? '#ff3d3d' : '#f5f5f5';
        mctx.fillRect(Math.round(mxp) - 2, Math.round(mzp) - 2, 3, 3);
      }
    }
    // flèche du joueur au centre (nord en haut — fillRect uniquement)
    mctx.fillStyle = '#ffffff';
    mctx.fillRect(64, 64, 4, 4);
    const fdx2 = -Math.sin(player.yaw), fdz2 = -Math.cos(player.yaw);
    mctx.fillStyle = '#ffffdd';
    mctx.fillRect(Math.round(66 + fdx2 * 6) - 2, Math.round(66 + fdz2 * 6) - 2, 4, 4);
    mctx.fillStyle = '#2b2b2b';
    mctx.fillRect(Math.round(66 - fdx2 * 6) - 1, Math.round(66 - fdz2 * 6) - 1, 3, 3);
  }

  function updateDebug() {
    if (!debugVisible) return;
    const p = player.pos;
    const dx = -Math.sin(player.yaw), dz = -Math.cos(player.yaw);
    const facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'Est' : 'Ouest') : (dz > 0 ? 'Sud' : 'Nord');
    const theta = dayTime * Math.PI * 2;
    const elev = Math.sin(theta);
    let phase;
    if (elev > 0.25) phase = 'Jour';
    else if (elev < -0.25) phase = 'Nuit';
    else phase = dayTime < 0.5 ? 'Aube' : 'Cr\u00e9puscule';
    const hour = (Math.floor(dayTime * 24) + 6) % 24;
    let editCount = 0;
    for (const m of editsByChunk.values()) editCount += Object.keys(m).length;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    const bid = getBlock(bx, by, bz);
    debugEl.innerHTML = 'WebCraft \u2014 F3' +
      '<br>FPS: ' + fpsValue +
      '<br>XYZ: ' + p.x.toFixed(2) + ' / ' + p.y.toFixed(2) + ' / ' + p.z.toFixed(2) +
      '<br>Bloc: ' + bx + ' ' + by + ' ' + bz + ' (' + bid + ' \u2014 ' + (BLOCKS[bid] ? BLOCKS[bid].name : 'Air') + ')' +
      '<br>Chunk: ' + Math.floor(bx / CHUNK) + ' ' + Math.floor(bz / CHUNK) +
      '<br>Direction: ' + facing +
      '<br>Temps: ' + phase + ' (' + hour + 'h, lumi\u00e8re ' + dayLight.toFixed(2) + ')' +
      '<br>Biome: ' + E.biomeAt(bx, bz) +
      '<br>Chunks: ' + chunks.size + ' (file: ' + meshQueue.length + ', \u00e9dits: ' + editCount + ')' +
      '<br>Mobs: ' + mobs.length +
      '<br>Mode: ' + (gameMode === 'creative' ? 'Cr\u00e9atif' : 'Survie') +
      '<br>Vie: ' + (gameMode === 'creative' ? '\u221e' : player.hp + ' / 20 \u00b7 Faim ' + player.hunger + ' / 20') +
      '<br>Graine: ' + E.getSeed() +
      '<br>Vol: ' + (player.fly ? 'oui' : 'non');
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (locked) {
      hintEl.classList.add('hidden');
      pauseEl.classList.add('hidden');
    } else if (gameState === 'playing' && !invOpen && !player.dead) {
      pauseEl.classList.remove('hidden');
      keys.clear();
      mining = null;
      mouseLeftDown = false;
      saveEdits();
    }
  });

  document.addEventListener('mousemove', (e) => {
    cursorStackEl.style.left = (e.clientX + 8) + 'px';
    cursorStackEl.style.top = (e.clientY + 8) + 'px';
    if (document.pointerLockElement !== canvas) return;
    player.yaw -= e.movementX * 0.0023;
    player.pitch -= e.movementY * 0.0023;
    const lim = Math.PI / 2 - 0.01;
    player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
  });

  document.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    keys.add(e.code);
    if (gameState !== 'playing') return;
    if (e.code === 'KeyE') {
      e.preventDefault();
      if (player.dead) return;
      if (invOpen) closeInventory();
      else openInventory(2);
      return;
    }
    if (e.code === 'Escape' && invOpen) {
      closeInventory();
      return;
    }
    if (invOpen || player.dead) return;
    if (e.code === 'KeyF') { player.fly = !player.fly; player.vel.y = 0; }
    if (e.code === 'F3') {
      e.preventDefault();
      debugVisible = !debugVisible;
      debugEl.classList.toggle('hidden', !debugVisible);
    }
    if (e.code === 'Space') e.preventDefault();
    if (e.code.indexOf('Digit') === 0) {
      const nb = parseInt(e.code.slice(5), 10);
      if (nb >= 1 && nb <= 9) selectSlot(nb - 1);
    }
  });

  document.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('wheel', (e) => {
    if (gameState !== 'playing' || document.pointerLockElement !== canvas) return;
    selectSlot((selectedSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9);
  }, { passive: true });

  canvas.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing' || invOpen || player.dead) return;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      return;
    }
    if (!currentHit) return;
    if (e.button === 0) {
      const mob = pickMob();
      if (mob) {
        const held = inv[selectedSlot];
        const dmg = held && held.id >= 100 && ITEMS[held.id].sword ? ITEMS[held.id].sword : 1;
        mob.hurtT = 0.2;
        playSound(220, 0.12, 0.14);
        mob.hp -= dmg;
        if (mob.type === 'enderman' && !mob.dead) {
          mob.mad = true;
          if (Math.random() < 0.5) { teleportMob(mob); swingT = 1; return; }
        }
        const kx = mob.pos.x - player.pos.x, kz = mob.pos.z - player.pos.z;
        const kd = Math.hypot(kx, kz) || 1;
        mob.vel.x += kx / kd * 6;
        mob.vel.z += kz / kd * 6;
        mob.vel.y = 4;
        if (mob.hp <= 0) killMob(mob, true);
        swingT = 1;
        return;
      }
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      if (BLOCKS[id] && BLOCKS[id].unbreakable) return;
      if (gameMode === 'creative') {
        breakBlockAt(currentHit.x, currentHit.y, currentHit.z, id, false);
        swingT = 1;
      } else {
        mining = { x: currentHit.x, y: currentHit.y, z: currentHit.z, progress: 0 };
        mouseLeftDown = true;
      }
    } else if (e.button === 1) {
      e.preventDefault();
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      for (let i = 0; i < 9; i++) {
        if (inv[i] && inv[i].id === id) { selectSlot(i); return; }
      }
    } else if (e.button === 2) {
      const hitId2 = getBlock(currentHit.x, currentHit.y, currentHit.z);
      if (hitId2 === TABLE) {
        openInventory(3);
        return;
      }
      if (BLOCKS[hitId2] && BLOCKS[hitId2].bed) {
        sleepAt(currentHit.x, currentHit.y, currentHit.z);
        return;
      }
      if (BLOCKS[hitId2] && BLOCKS[hitId2].chest) {
        openChestAt(currentHit.x, currentHit.y, currentHit.z);
        return;
      }
      if (BLOCKS[hitId2] && BLOCKS[hitId2].furnace) {
        openFurnaceAt(currentHit.x, currentHit.y, currentHit.z);
        return;
      }
      if (BLOCKS[hitId2] && BLOCKS[hitId2].door) {
        toggleDoorAt(currentHit.x, currentHit.y, currentHit.z, hitId2);
        return;
      }
      if (BLOCKS[hitId2] && BLOCKS[hitId2].sign) {
        openSignEdit(currentHit.x, currentHit.y, currentHit.z);
        return;
      }
      const held = inv[selectedSlot];
      if (!held) return;
      if (held.id >= 100) {
        const it = ITEMS[held.id];
        if (held.id === 116) {
          const mob = pickMob();
          if (mob && mob.type === 'cow') {
            held.count--;
            if (held.count <= 0) inv[selectedSlot] = null;
            addItem(117, 1);
            swingT = 1;
            playSound(85, 0.5, 0.08, 'sawtooth');
            showToast('Seau de lait rempli !');
          }
          return;
        }
        if (it.bow) {
          if (gameMode === 'creative' || countItem(112) > 0) {
            bowCharging = true;
            bowT = 0;
          } else {
            showToast('Il faut des flèches !');
          }
          return;
        }
        if (it.armor) {
          armorWorn = !armorWorn;
          updateArmorUI();
          swingT = 1;
          playSound(360, 0.15, 0.12);
        }
        if (it.milk) {
          player.hunger = 20;
          player.health = Math.min(20, player.health + 4);
          updateHealthUI(); updateHungerUI();
          held.count--;
          if (held.count <= 0) inv[selectedSlot] = null;
          addItem(116, 1); // le seau revient vide
          updateHotbarUI();
          swingT = 1;
          playSound(300, 0.3, 0.1, 'sine');
        }
        if (it.egg) {
          throwEgg();
          held.count--;
          if (held.count <= 0) inv[selectedSlot] = null;
          updateHotbarUI();
        }
        if (it.food && player.hunger < 20) {
          player.hunger = Math.min(20, player.hunger + it.food);
          held.count--;
          if (held.count <= 0) inv[selectedSlot] = null;
          updateHungerUI();
          updateHotbarUI();
          swingT = 1;
          playSound(320, 0.15, 0.12);
        }
        return;
      }
      const px = currentHit.x + currentHit.face[0];
      const py = currentHit.y + currentHit.face[1];
      const pz = currentHit.z + currentHit.face[2];
      if (py < 1 || py >= WORLD_H) return;
      const cur = getBlock(px, py, pz);
      if (cur !== AIR && !E.isWater(cur)) return;
      if (held.id === DOOR_L) {
        if (py + 1 >= WORLD_H) return;
        const above = getBlock(px, py + 1, pz);
        if (above !== AIR && !E.isWater(above)) return;
        swingT = 1;
        applyBlock(px, py, pz, DOOR_L, true);
        applyBlock(px, py + 1, pz, DOOR_U, true);
        if (gameMode === 'survival') {
          held.count--;
          if (held.count <= 0) inv[selectedSlot] = null;
        }
        updateHotbarUI();
        playSound(170, 0.12, 0.13, 'square');
        return;
      }
      if (E.isSolid(held.id) && blockIntersectsPlayer(px, py, pz)) return;
      if (E.BLOCKS[held.id] && E.BLOCKS[held.id].plant && !E.isSolid(getBlock(px, py - 1, pz))) return;
      swingT = 1;
      applyBlock(px, py, pz, held.id, true);
      if (gameMode === 'survival') {
        held.count--;
        if (held.count <= 0) inv[selectedSlot] = null;
      }
      updateHotbarUI();
      playSound(300, 0.09, 0.1);
    }
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.getElementById('btn-solo').addEventListener('click', startGame);
  const btnHost = document.getElementById('btn-host');
  const btnJoin = document.getElementById('btn-join');
  if (btnHost) btnHost.addEventListener('click', () => startNet('host'));
  if (btnJoin) btnJoin.addEventListener('click', () => startNet('join'));
  const roomCodeInput = document.getElementById('room-code');
  if (roomCodeInput) roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.code === 'Enter') { e.preventDefault(); startNet('join'); }
    if (e.code === 'KeyW' || e.code === 'KeyZ') e.stopPropagation();
  });
  const signEditEls = signEditElements();
  if (signEditEls.ok) signEditEls.ok.addEventListener('click', () => closeSignEdit(true));
  if (signEditEls.no) signEditEls.no.addEventListener('click', () => closeSignEdit(false));
  if (signEditEls.inp) signEditEls.inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.code === 'Enter') { e.preventDefault(); closeSignEdit(true); }
    if (e.key === 'Escape' || e.code === 'Escape') { e.preventDefault(); closeSignEdit(false); }
  });
  document.getElementById('btn-resume').addEventListener('click', () => canvas.requestPointerLock());
  const btnStatsEl = document.getElementById('btn-stats');
  if (btnStatsEl) btnStatsEl.addEventListener('click', () => { debugVisible = !debugVisible; updateDebug(); });
  const btnOptionsEl = document.getElementById('btn-options');
  if (btnOptionsEl) btnOptionsEl.addEventListener('click', () => {
    document.getElementById('pause-options').classList.toggle('hidden');
  });
  const rdPause = document.getElementById('render-dist-pause');
  if (rdPause) {
    rdPause.value = String(renderDist);
    rdPause.addEventListener('change', () => {
      renderDist = parseInt(rdPause.value, 10) || 4;
      if (renderDistSelect) renderDistSelect.value = String(renderDist);
      applyRenderDistance();
      updateChunks(true);
    });
  }
  const musicPauseBtn = document.getElementById('btn-music-pause');
  if (musicPauseBtn) {
    musicPauseBtn.addEventListener('click', () => {
      toggleMusic();
      musicPauseBtn.textContent = 'Musique : ' + (musicOn ? 'ON' : 'OFF');
    });
  }
  document.getElementById('btn-quit').addEventListener('click', quitToMenu);
  document.getElementById('btn-respawn').addEventListener('click', respawn);
  document.getElementById('btn-reset').addEventListener('click', () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.indexOf('webcraft_') === 0) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    location.reload();
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) { mouseLeftDown = false; mining = null; }
    if (e.button === 2 && bowCharging) releaseBow();
  });

  document.addEventListener('mousemove', (e) => {
    const tipEl = document.getElementById('item-tip');
    const tgt = e.target;
    const src = tgt && tgt.closest ? tgt.closest('[data-tip]') : null;
    const tip = src ? src.getAttribute('data-tip') : null;
    if (tipsAreHidden(tipEl) || !tip) { if (tipEl && !tipsAreHidden(tipEl)) tipEl.classList.add('hidden'); return; }
    tipEl.textContent = tip;
    tipEl.classList.remove('hidden');
    tipEl.style.left = Math.min(window.innerWidth - 140, e.clientX + 14) + 'px';
    tipEl.style.top = (e.clientY + 14) + 'px';
  });
  function tipsAreHidden(tipEl) {
    if (!tipEl) return true;
    if (tipEl.classList.contains('hidden')) return true;
    return false;
  }

  try {
    const savedSeed = localStorage.getItem('webcraft_seed');
    if (savedSeed) seedInput.value = savedSeed;
  } catch (e) {}

  const SPLASHES = ['100 % fait main !', '\u00c9dition navigateur !', 'Attention aux zombies !',
    'Creuse plus loin !', 'Aussi en fran\u00e7ais !', 'Pioche requise !', 'Fait de vrai bruit !',
    'Les pioches acc\u00e9l\u00e8rent tout !', ' Compatible Vercel !', 'Ne regarde pas les Endermen !'];
  document.getElementById('splash').textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
  setDirtBackground();
  buildHotbar();
  buildInventoryDom();
  updateHealthUI();
  applyRenderDistance();

  let lastTime = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 0.5) {
      fpsValue = Math.round(fpsFrames / fpsTime);
      fpsFrames = 0;
      fpsTime = 0;
    }

    if (gameState === 'loading') {
      updateChunks(true);
      processMeshQueue(6);
      const done = Math.max(0, loadingTotal - meshQueue.length);
      loadingFill.style.width = Math.min(100, Math.round((done / loadingTotal) * 100)) + '%';
      if (meshQueue.length === 0) finishLoading();
    } else if (gameState === 'playing') {
      if (sleepT > 0) {
        sleepT -= dt;
        if (sleepT <= 0) {
          if (sleepFadeEl) sleepFadeEl.style.opacity = '0';
          dayTime = 0.03;
          updateSky();
          showToast('Bien dormi !');
        }
      }
      if (document.pointerLockElement === canvas && !invOpen && !player.dead) {
        updatePlayer(dt);
        computeHit();
      } else {
        currentHit = null;
      }
      player.hurtCd = Math.max(0, player.hurtCd - dt);
      if (gameMode === 'survival' && !player.dead) {
        if (player.hunger >= 18 && player.hp < 20 && player.hurtCd <= 0) {
          player.regenT += dt;
          if (player.regenT >= 3) {
            player.regenT = 0;
            player.hp = Math.min(20, player.hp + 1);
            addExhaustion(1.5);
            updateHealthUI();
          }
        }
        if (player.hunger <= 0) {
          player.starveT += dt;
          if (player.starveT >= 4) {
            player.starveT = 0;
            if (player.hp > 1) { player.hp -= 1; updateHealthUI(); playSound(110, 0.2, 0.1, 'sine'); }
          }
        }
      }
      dayTime = (dayTime + dt / DAY_LENGTH) % 1;
      updateSky();
      skyGroup.position.copy(camera.position);
      waterTimer += dt;
      if (waterTimer >= 0.25) {
        waterTimer = 0;
        tickWater();
      }
      fallTimer += dt;
      if (fallTimer >= 0.15) { fallTimer = 0; tickFalls(); }
      if (bowCharging && gameMode === 'survival' && countItem(112) <= 0) { bowCharging = false; bowT = 0; }
      if (bowCharging) bowT += dt;
      tickFurnaces(dt);
      for (let i = mobs.length - 1; i >= 0; i--) {
        const m = mobs[i];
        const d = Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
        if (d > renderDist * 16 + 24) { killMob(m, false); continue; }
        updateMob(m, dt);
      }
      trySpawnMobs(dt);
      updateArrows(dt);
      updateMining(dt);
      updateChunks(false);
      processMeshQueue(2);
      updateCamera();
      updateHighlight();
      updateUnderwater();
      updateParticles(dt);
      updateClouds(dt);
      updateHeld(dt);
      updateDebug();
      updateSignRead();
      miniTimer -= dt;
      if (miniTimer <= 0) { miniTimer = 0.25; updateMinimap(); }
      tickMusic(dt);
      netTick(dt);
    }
    renderer.render(scene, camera);
  }

  animate();

  // ==================== MULTIOUEUEUR (paresseux, isole) ====================
  const netState = {
    active: false, role: 'solo', client: null, room: null, seedOverride: null,
    id: Math.random().toString(36).slice(2, 10), players: new Map(),
    outBlocks: [], posTimer: 0, joinTimer: null, joining: false
  };
  function currentNetRole() { return netState.active ? netState.role : 'solo'; }
  function netPublish(obj) {
    if (netState.client && netState.room) {
      try { netState.client.publish('webcraft/v1/' + netState.room, JSON.stringify(obj)); } catch (err) {}
    }
  }
  function playerName() {
    try { return localStorage.getItem('webcraft_name') || 'Joueur' + (netState.id % 97); }
    catch (e) { return 'Joueur'; }
  }
  function makeRoomCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = ''; for (let i = 0; i < 5; i++) c += A[(Math.random() * A.length) | 0];
    return c;
  }
  function netStatusEl() { return document.getElementById('net-status'); }
  function netStatus(msg, isError) {
    const el = netStatusEl();
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.remove('hidden');
  }
  function netEnd() {
    if (netState.client) { try { netState.client.end(true); } catch (err) {} }
    netState.client = null;
    netState.room = null;
    netState.active = false;
    for (const p of netState.players.values()) scene.remove(p.mesh);
    netState.players.clear();
  }
  function upsertPlayer(pid, name, x, y, z, yaw, pitch) {
    const AV = [0x3b6fd4, 0xd43b3b, 0x3bd46f, 0xd4b23b, 0x9b3bd4, 0x3bc9d4];
    let p = netState.players.get(pid);
    if (!p) {
      const g = new THREE.Group();
      const col = AV[netState.players.size % AV.length];
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.3), new THREE.MeshBasicMaterial({ color: col }));
      body.position.y = 1.15;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xd8a380 }));
      head.position.y = 1.85;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.24), new THREE.MeshBasicMaterial({ color: 0x2f4f7a }));
      legs.position.y = 0.37;
      g.add(body); g.add(head); g.add(legs);
      scene.add(g);
      p = { mesh: g, name: name || pid };
      netState.players.set(pid, p);
      showToast(p.name + ' a rejoint la partie');
    }
    p.mesh.position.set(x, y, z);
    p.mesh.rotation.y = yaw || 0;
  }
  function onNetMessage(topic, payload) {
    let msg;
    try { msg = JSON.parse(payload.toString ? payload.toString() : String(payload)); } catch (err) { return; }
    if (!msg || msg.from === netState.id) return;
    if (msg.t === 'hello') {
      if (currentNetRole() !== 'host' || gameState !== 'playing') return;
      upsertPlayer(msg.from, msg.name, player.pos.x, player.pos.y, player.pos.z, 0, 0);
      const ed = {};
      for (const [k, m] of editsByChunk) ed[k] = m;
      const sg = {};
      for (const [k, v] of signData) sg[k] = v;
      netPublish({ t: 'welcome', from: netState.id, seed: E.getSeed(), mode: gameMode, edits: ed, signs: sg, dayTime });
      return;
    }
    if (msg.t === 'welcome') {
      if (!netState.joining) return;
      netState.joining = false;
      if (netState.joinTimer) { clearTimeout(netState.joinTimer); netState.joinTimer = null; }
      modeSelect.value = msg.mode === 'creative' ? 'creative' : 'survival';
      E.setSeed(msg.seed | 0);
      netState.seedOverride = msg.seed | 0;
      try {
        localStorage.setItem('webcraft_seed', String(msg.seed | 0));
        seedInput.value = String(msg.seed | 0);
      } catch (e) {}
      editsByChunk.clear();
      for (const k in (msg.edits || {})) editsByChunk.set(k, msg.edits[k]);
      try { localStorage.setItem('webcraft_edits_' + (msg.seed | 0), JSON.stringify(msg.edits || {})); } catch (e) {}
      signData.clear();
      for (const k in (msg.signs || {})) signData.set(k, String(msg.signs[k]));
      guestStartDayTime = typeof msg.dayTime === 'number' ? msg.dayTime : 0.03;
      startGame();
      netStatus('Connect\u00e9 au salon ' + netState.room);
      return;
    }
    if (gameState !== 'playing') return;
    if (msg.t === 'pos') {
      upsertPlayer(msg.from, msg.name, msg.x, msg.y, msg.z, msg.yaw, msg.pitch);
    } else if (msg.t === 'blocks') {
      for (const c of (msg.changes || [])) applyBlock(c[0], c[1], c[2], c[3], false);
      flushDirty();
    } else if (msg.t === 'bye') {
      const p = netState.players.get(msg.from);
      if (p) {
        scene.remove(p.mesh);
        netState.players.delete(msg.from);
        showToast(p.name + ' a quitté la partie');
      }
    }
  }
  let guestStartDayTime = null;
  function startNet(role) {
    if (typeof mqtt === 'undefined') {
      netStatus('Multijoueur indisponible (mqtt.min.js manquant)', true);
      return;
    }
    netEnd();
    const codeInput = document.getElementById('room-code');
    if (role === 'join') {
      const code = (codeInput && codeInput.value ? codeInput.value : '').trim().toUpperCase();
      if (code.length < 4) { netStatus('Entre le code du salon (5 caractères)', true); return; }
      netState.room = code;
      netState.joining = true;
    } else {
      netState.room = makeRoomCode();
      if (codeInput) codeInput.value = netState.room;
    }
    netStatus('Connexion au serveur…');
    netState.active = true;
    netState.role = role === 'host' ? 'host' : 'guest';
    try {
      netState.client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: 'webcraft_' + netState.id, keepalive: 30, reconnectPeriod: 0, connectTimeout: 10000
      });
    } catch (err) {
      netStatus('Erreur de connexion', true);
      netState.active = false;
      return;
    }
    netState.client.on('connect', () => {
      netState.client.subscribe('webcraft/v1/' + netState.room);
      if (role === 'host') {
        netStatus('Salon créé : ' + netState.room + ' — partage le code !');
        startGame();
      } else {
        netPublish({ t: 'hello', from: netState.id, name: playerName() });
        netStatus('Recherche de la partie ' + netState.room + '…');
        netState.joinTimer = setTimeout(() => {
          if (gameState === 'menu' && netState.joining) {
            netState.joining = false;
            netStatus('Partie introuvable. Vérifie le code.', true);
            netEnd();
          }
        }, 10000);
      }
    });
    netState.client.on('message', onNetMessage);
    netState.client.on('error', () => { if (gameState === 'menu') netStatus('Erreur de connexion au serveur', true); });
    netState.client.on('close', () => { if (gameState === 'menu' && netState.joining) { netState.joining = false; netStatus('Déconnecté', true); } });
  }
  function netTick(dt) {
    if (!netState.active || !netState.client || gameState !== 'playing') return;
    if (netState.slowTimer === undefined) netState.slowTimer = 0;
    netState.slowTimer -= dt;
    if (netState.slowTimer <= 0) {
      netState.slowTimer = 0.3;
      if (netState.outBlocks.length) {
        const changes = netState.outBlocks.splice(0, netState.outBlocks.length);
        netPublish({ t: 'blocks', from: netState.id, changes });
      }
    }
    netState.posTimer -= dt;
    if (netState.posTimer <= 0) {
      netState.posTimer = 0.12;
      netPublish({
        t: 'pos', from: netState.id, name: playerName(),
        x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2), z: +player.pos.z.toFixed(2),
        yaw: +player.yaw.toFixed(2), pitch: +player.pitch.toFixed(2)
      });
    }
  }
  function netOutBlock(x, y, z, id) {
    if (!netState.active) return;
    netState.outBlocks.push([x, y, z, id]);
    if (netState.outBlocks.length >= 12) {
      const changes = netState.outBlocks.splice(0, netState.outBlocks.length);
      netPublish({ t: 'blocks', from: netState.id, changes });
    }
  }
  window.addEventListener('beforeunload', () => {
    if (netState.active) netPublish({ t: 'bye', from: netState.id });
  });

  window.WebCraftDebug = {
    addItem,
    inv,
    craftCells,
    player,
    mobs,
    openInventory,
    closeInventory,
    updateCraftResult,
    applyBlock,
    getBlock,
    tickWater,
    spawnMob,
    damage: damagePlayer,
    setMode(m) { gameMode = m; updateHealthUI(); },
    hardnessFor,
    particles,
    arrows,
    addXp,
    explode: explodeAt,
    toggleArmor(v) { armorWorn = v === undefined ? !armorWorn : !!v; updateArmorUI(); },
    setDay(t) { dayTime = t; updateSky(); },
    openChestAt,
    openFurnaceAt,
    chestData,
    furnaceData,
    getFurnace: furnaceAt,
    tickFurnaces,
    nameFor,
    countItem,
    takeItem,
    SMELT,
    spawnPlayerArrow,
    toggleDoorAt, doorOpen, signData, openSignEdit, closeSignEdit, throwEgg,
    toggleMusic,
    updateMinimap, MINI_COLORS,
    get musicOn() { return musicOn; },
    netStart: (r) => startNet(r), netEnd, netOutBlock, currentNetRole, netState,
    villages,
    get openChestArr() { return openChestArr; },
    get armorWorn() { return armorWorn; },
    get spawnPos() { return [spawnPoint.x, spawnPoint.y, spawnPoint.z]; },
    get gameMode() { return gameMode; },
    get craftResult() { return craftResult; },
    get currentHit() { return currentHit; },
    get mining() { return mining; },
    get xp() { return xp; },
    get xpLevel() { return xpLevel; },
    getState() {
      return {
        gameState, dayTime, dayLight, hp: player.hp,
        mobCount: mobs.length, invOpen, selectedSlot
      };
    }
  };
})();
