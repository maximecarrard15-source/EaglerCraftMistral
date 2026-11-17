'use strict';
(function () {
  const E = WebCraftEngine;
  const CHUNK = E.CHUNK, WORLD_H = E.WORLD_H, WATER_LEVEL = E.WATER_LEVEL;
  const AIR = E.AIR, WATER = E.WATER, BEDROCK = E.BEDROCK;
  const BLOCKS = E.BLOCKS, FACES = E.FACES;
  const GRASS = E.GRASS, DIRT = E.DIRT, STONE = E.STONE, SAND = E.SAND,
        LOG = E.LOG, LEAVES = E.LEAVES, PLANKS = E.PLANKS, COBBLE = E.COBBLE,
        GLASS = E.GLASS, BRICK = E.BRICK, WOOL = E.WOOL, COAL_ORE = E.COAL_ORE,
        IRON_ORE = E.IRON_ORE, TABLE = E.TABLE, TORCH = E.TORCH;

  const ITEMS = {
    100: { name: 'Charbon', tile: 22 },
    101: { name: 'Bâton', tile: 23 },
    102: { name: 'Épée en bois', tile: 24, sword: 2, maxStack: 1 },
    103: { name: 'Porc', tile: 25, food: 4 },
    104: { name: 'Mouton', tile: 26, food: 4 },
    105: { name: 'Fer', tile: 27 },
    106: { name: 'Épée en fer', tile: 28, sword: 3, maxStack: 1 }
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
    { shape: [[105], [101]], out: { id: 106, count: 1 } }
  ].map((r) => ({ rows: trimShape(r.shape), out: r.out }));

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

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 40, 80);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.rotation.order = 'YXZ';

  const atlasCanvas = buildAtlas();
  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

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

  function buildAtlas() {
    const T = 16, COLS = 8, SIZE = T * COLS;
    const cv = document.createElement('canvas');
    cv.width = SIZE; cv.height = SIZE;
    const ctx = cv.getContext('2d');
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

    tile(0, (x, y, r) => { const m = n(14, r); return [106 + m, 169 + m, 64 + m * 0.6]; });
    tile(1, (x, y, r) => {
      const strip = 2 + (E.hash2(x, 999, 55) > 0.5 ? 1 : 0);
      if (y < strip) { const m = n(14, r); return [106 + m, 169 + m, 64 + m * 0.6]; }
      const m = n(12, r); return [134 + m, 96 + m, 67 + m * 0.8];
    });
    tile(2, (x, y, r) => { const m = n(12, r); return [134 + m, 96 + m, 67 + m * 0.8]; });
    tile(3, (x, y, r) => {
      let g = 125 + n(12, r);
      if (E.hash2(x >> 1, y >> 1, 88) < 0.2) g -= 25;
      return [g, g, g];
    });
    tile(4, (x, y, r) => { const m = n(10, r); return [219 + m, 207 + m, 158 + m]; });
    tile(5, (x, y, r) => {
      const s = E.hash2(x, 0, 44) < 0.5 ? -18 : 8;
      const m = n(6, r);
      return [104 + s + m, 82 + s * 0.8 + m, 50 + s * 0.5 + m];
    });
    tile(6, (x, y, r) => {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) | 0;
      const m = n(6, r);
      return d % 2 === 0 ? [168 + m, 134 + m, 80 + m] : [120 + m, 94 + m, 55 + m];
    });
    tile(7, (x, y, r) => {
      if (r < 0.15) return [30, 70, 22];
      const m = n(22, r);
      return [60 + m, 124 + m, 42 + m * 0.7];
    });
    tile(8, (x, y, r) => { const m = n(8, r); return [47 + m, 93 + m, 209 + m]; });
    tile(9, (x, y, r) => {
      let g = 0;
      if (y % 4 === 0) g -= 35;
      if ((x + ((y >> 2) % 2) * 8) % 16 === 0) g -= 40;
      const m = n(10, r);
      return [160 + g + m, 130 + g + m, 78 + g + m];
    });
    tile(10, (x, y, r) => {
      let g = 105 + E.hash2((x / 4) | 0, (y / 3) | 0, 12) * 30 + n(10, r);
      if (x % 4 === 0 || y % 3 === 0) g -= 35;
      return [g, g, g];
    });
    tile(11, (x, y, r) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return [220, 235, 240, 255];
      if ((x - y + 32) % 8 < 1 && x > 2 && x < 13) return [235, 245, 250, 140];
      return [0, 0, 0, 0];
    });
    tile(12, (x, y, r) => {
      const mortar = y % 4 === 3 || (x + ((y >> 2) % 2) * 4) % 8 === 7;
      const m = n(8, r);
      if (mortar) { const g = 155 + m; return [g, g, g]; }
      return [148 + m, 66 + m * 0.6, 58 + m * 0.6];
    });
    tile(13, (x, y, r) => {
      const v = E.hash2(x >> 1, y >> 1, 33);
      const g = (v < 0.4 ? 40 : v < 0.7 ? 70 : 100) + n(6, r);
      return [g, g, g];
    });
    tile(14, (x, y, r) => { const m = n(6, r); return [235 + m, 240 + m, 248 + m]; });
    tile(15, (x, y, r) => {
      const v = E.hash2(x, y, 21);
      const m = n(8, r);
      if (v < 0.33) return [110 + m, 105 + m, 100 + m];
      if (v < 0.66) return [140 + m, 135 + m, 128 + m];
      return [95 + m, 90 + m, 88 + m];
    });
    tile(16, (x, y, r) => {
      const blob = E.hash3(x >> 1, y >> 1, 5, 91) < 0.3;
      let g = 125 + n(12, r);
      if (blob) return [30 + n(10, r), 30, 32];
      return [g, g, g];
    });
    tile(17, (x, y, r) => {
      const blob = E.hash3(x >> 1, y >> 1, 9, 92) < 0.28;
      let g = 125 + n(12, r);
      if (blob) return [216 + n(12, r), 170 + n(10, r), 140];
      return [g, g, g];
    });
    tile(18, (x, y, r) => {
      const border = x < 2 || y < 2 || x > 13 || y > 13;
      const m = n(8, r);
      if (border) return [120 + m, 88 + m, 48 + m];
      return [178 + m, 142 + m, 86 + m];
    });
    tile(19, (x, y, r) => {
      const window1 = (x > 2 && x < 7 && y > 3 && y < 8);
      const window2 = (x > 9 && x < 14 && y > 3 && y < 8);
      const top = y < 3;
      const m = n(8, r);
      if (top) return [150 + m, 112 + m, 62 + m];
      if (window1 || window2) return [96 + m, 68 + m, 36 + m];
      return [168 + m, 132 + m, 78 + m];
    });
    tile(20, (x, y, r) => {
      if (x < 6 || x > 9 || y > 10) return [0, 0, 0, 0];
      if (y < 3) return [255, 216 + n(20, r), 90 + n(30, r)];
      const m = n(10, r);
      return [120 + m, 88 + m, 46 + m];
    });
    tile(21, (x, y, r) => {
      const weave = ((x + y) % 4 < 2) ? 8 : -8;
      const m = n(6, r);
      return [228 + weave + m, 228 + weave + m, 224 + weave + m];
    });
    tile(22, (x, y, r) => {
      const d = Math.abs(x - 8) + Math.abs(y - 8);
      if (d > 7 || E.hash2(x, y, 71) < 0.2) return [0, 0, 0, 0];
      const g = 35 + n(14, r);
      return [g, g, g + 4];
    });
    tile(23, (x, y, r) => {
      const d = Math.abs(x - y);
      if (d > 2 || x < 3 || x > 12) return [0, 0, 0, 0];
      const m = n(10, r);
      return [140 + m, 104 + m, 56 + m];
    });
    tile(24, (x, y, r) => {
      const d = x - (15 - y);
      if (d < -1 || d > 2 || x < 6) return [0, 0, 0, 0];
      if (x < 9) { const m = n(10, r); return [104 + m, 82 + m, 50 + m]; }
      const m = n(8, r);
      return [170 + m, 134 + m, 80 + m];
    });
    tile(25, (x, y, r) => {
      const d = Math.abs(x - 8) + Math.abs(y - 8);
      if (d > 6) return [0, 0, 0, 0];
      const m = n(14, r);
      return d < 3 ? [240 + m, 170 + m, 170 + m] : [205 + m, 110 + m, 110 + m];
    });
    tile(26, (x, y, r) => {
      const d = Math.abs(x - 8) + Math.abs(y - 8);
      if (d > 6) return [0, 0, 0, 0];
      const m = n(12, r);
      return d < 2 ? [235 + m, 230 + m, 215 + m] : [190 + m, 80 + m, 70 + m];
    });
    tile(27, (x, y, r) => {
      const d = Math.abs(x - 8) + Math.abs(y - 8);
      if (d > 7 || E.hash2(x, y, 73) < 0.15) return [0, 0, 0, 0];
      const m = n(14, r);
      return [216 + m, 220 + m, 226 + m];
    });
    tile(28, (x, y, r) => {
      const d = x - (15 - y);
      if (d < -1 || d > 2 || x < 6) return [0, 0, 0, 0];
      if (x < 9) { const m = n(10, r); return [104 + m, 82 + m, 50 + m]; }
      const m = n(8, r);
      return [222 + m, 226 + m, 232 + m];
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
          else if (y < h - 3) id = E.oreAt(x0 + x, y, z0 + z);
          else if (y < h) id = DIRT;
          else id = E.surfaceBlock(h);
          data[E.blockIndex(x, y, z)] = id;
        }
        for (let y = h + 1; y <= WATER_LEVEL; y++) data[E.blockIndex(x, y, z)] = WATER;
      }
    }
    for (let wx = x0 - 2; wx < x0 + CHUNK + 2; wx++) {
      for (let wz = z0 - 2; wz < z0 + CHUNK + 2; wz++) {
        if (!E.treeAt(wx, wz)) continue;
        stampTree(data, x0, z0, wx, wz);
      }
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
    updateTorchRegistry(x, y, z, old, id);
    markDirty(cx, cz, lx, lz);
    scheduleWater(x, y, z);
    if (record) {
      recordEdit(cx, cz, lx, y, lz, id);
      flushDirty();
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
          const isW = E.isWater(id);
          const t = isW ? wat : opq;
          let topH = 1;
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
            for (const c of f.corners) {
              const cy = c.pos[1] === 1 ? topH : 0;
              t.pos.push(x + c.pos[0], y + cy, z + c.pos[2]);
              t.uv.push((tcol + c.uv[0]) / 8, 1 - (trow + 1 - c.uv[1]) / 8);
              t.shade.push(f.shade, f.shade, f.shade);
              t.torch.push(tl);
            }
            t.idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
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
          if (id !== AIR && BLOCKS[id] && BLOCKS[id].solid) return true;
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
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
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
      if (keys.has('Space') && player.onGround) { player.vel.y = JUMP_V; player.onGround = false; }
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
    if (moveEnt(player, 0, player.vel.x * dt)) player.vel.x = 0;
    if (moveEnt(player, 2, player.vel.z * dt)) player.vel.z = 0;

    if (player.fly && player.onGround) player.fly = false;
    if (player.pos.y < -20) {
      player.pos.y = WORLD_H;
      player.vel.set(0, 0, 0);
      player.fallStartY = null;
    }
  }

  function updateHealthUI() {
    let html = '';
    for (let i = 0; i < 10; i++) {
      const v = player.hp - i * 2;
      const cls = v >= 2 ? 'full' : (v >= 1 ? 'half' : 'empty');
      html += '<span class="heart ' + cls + '">' + (v >= 1 ? '\u2764' : '\u2661') + '</span>';
    }
    healthEl.innerHTML = html;
  }

  function damagePlayer(n, kx, kz) {
    if (player.dead || player.hurtCd > 0 || player.fly) return;
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
    player.regenT = 0;
    player.hurtCd = 0;
    player.pos.copy(spawnPoint);
    player.vel.set(0, 0, 0);
    player.fallStartY = null;
    updateHealthUI();
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

  function updateCamera() {
    camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
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
      drops: []
    }
  };

  function makeMobMesh(type) {
    const d = MOB_DEFS[type];
    const g = new THREE.Group();
    const parts = [];
    function box(w, h, dp, color, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, y, z);
      m.userData.base = color;
      g.add(m);
      parts.push(m);
      return m;
    }
    if (type === 'zombie') {
      box(0.5, 0.75, 0.3, d.body, 0, 1.05, 0);
      box(0.5, 0.5, 0.5, d.head, 0, 1.65, 0);
      box(0.2, 0.7, 0.2, d.leg, -0.13, 0.35, 0);
      box(0.2, 0.7, 0.2, d.leg, 0.13, 0.35, 0);
      box(0.2, 0.2, 0.7, d.body, -0.35, 1.2, -0.2);
      box(0.2, 0.2, 0.7, d.body, 0.35, 1.2, -0.2);
    } else {
      const bh = type === 'sheep' ? 0.7 : 0.6;
      box(0.7, bh, 1.1, d.body, 0, 0.75, 0);
      box(0.45, 0.45, 0.45, d.head, 0, 0.95, -0.7);
      box(0.18, 0.45, 0.18, d.leg, -0.22, 0.22, -0.35);
      box(0.18, 0.45, 0.18, d.leg, 0.22, 0.22, -0.35);
      box(0.18, 0.45, 0.18, d.leg, -0.22, 0.22, 0.35);
      box(0.18, 0.45, 0.18, d.leg, 0.22, 0.22, 0.35);
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

  function killMob(m, byPlayer) {
    const i = mobs.indexOf(m);
    if (i >= 0) mobs.splice(i, 1);
    scene.remove(m.mesh);
    if (byPlayer) {
      for (const d of m.def.drops) {
        const nDrops = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
        if (nDrops > 0) addItem(d.id, nDrops);
      }
    }
  }

  function updateMob(m, dt) {
    const distXZ = Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z);
    const distY = Math.abs(player.pos.y - m.pos.y);
    m.atkT -= dt;
    m.hurtT -= dt;
    const chase = m.type === 'zombie' && dayLight < 0.45 && !player.dead && distXZ < 16 && distY < 6;
    if (chase) {
      m.yaw = Math.atan2(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
      m.moving = true;
      if (distXZ < 1.6 && distY < 2 && m.atkT <= 0) {
        m.atkT = 1.2;
        damagePlayer(2, player.pos.x - m.pos.x, player.pos.z - m.pos.z);
      }
    } else {
      m.wanderT -= dt;
      if (m.wanderT <= 0) {
        m.wanderT = 2 + Math.random() * 3;
        m.moving = Math.random() < 0.6;
        m.yaw = Math.random() * Math.PI * 2;
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
      p.material.color.setHex(flash ? 0xff5555 : p.userData.base);
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
    const type = night && Math.random() < 0.7 ? 'zombie' : (Math.random() < 0.5 ? 'pig' : 'sheep');
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

  function renderSlotContent(el, stack) {
    el.innerHTML = '';
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

  let audioCtx = null;
  function playSound(freq, dur, vol) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
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

  function dropFor(id) {
    if (id === GRASS) return DIRT;
    if (id === STONE) return COBBLE;
    if (id === COAL_ORE) return 100;
    if (id === IRON_ORE) return 105;
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
    E.setSeed(seed);
    try { localStorage.setItem('webcraft_seed', String(seed)); } catch (e) {}
    loadEdits(seed);
    renderDist = parseInt(renderDistSelect.value, 10) || 4;
    applyRenderDistance();
    resetWorld();
    spawnPlayer();
    dayTime = 0.03;
    player.hp = 20;
    player.dead = false;
    player.hurtCd = 0;
    player.regenT = 0;
    player.fallStartY = null;
    for (let i = 0; i < 36; i++) inv[i] = null;
    for (let i = 0; i < 9; i++) craftCells[i] = null;
    cursorStack = null;
    craftResult = null;
    selectedSlot = 0;
    updateHealthUI();
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
      '<br>Chunks: ' + chunks.size + ' (file: ' + meshQueue.length + ', \u00e9dits: ' + editCount + ')' +
      '<br>Mobs: ' + mobs.length +
      '<br>Vie: ' + player.hp + ' / 20' +
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
        mob.hp -= dmg;
        mob.hurtT = 0.2;
        const kx = mob.pos.x - player.pos.x, kz = mob.pos.z - player.pos.z;
        const kd = Math.hypot(kx, kz) || 1;
        mob.vel.x += kx / kd * 6;
        mob.vel.z += kz / kd * 6;
        mob.vel.y = 4;
        playSound(220, 0.12, 0.14);
        if (mob.hp <= 0) killMob(mob, true);
        return;
      }
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      if (BLOCKS[id] && BLOCKS[id].unbreakable) return;
      applyBlock(currentHit.x, currentHit.y, currentHit.z, AIR, true);
      const drop = dropFor(id);
      if (drop !== null) addItem(drop, 1);
      playSound(170, 0.13, 0.12);
    } else if (e.button === 1) {
      e.preventDefault();
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      for (let i = 0; i < 9; i++) {
        if (inv[i] && inv[i].id === id) { selectSlot(i); return; }
      }
    } else if (e.button === 2) {
      if (getBlock(currentHit.x, currentHit.y, currentHit.z) === TABLE) {
        openInventory(3);
        return;
      }
      const held = inv[selectedSlot];
      if (!held) return;
      if (held.id >= 100) {
        const it = ITEMS[held.id];
        if (it.food && player.hp < 20) {
          player.hp = Math.min(20, player.hp + it.food);
          held.count--;
          if (held.count <= 0) inv[selectedSlot] = null;
          updateHealthUI();
          updateHotbarUI();
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
      if (E.isSolid(held.id) && blockIntersectsPlayer(px, py, pz)) return;
      applyBlock(px, py, pz, held.id, true);
      held.count--;
      if (held.count <= 0) inv[selectedSlot] = null;
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

  document.getElementById('btn-play').addEventListener('click', startGame);
  document.getElementById('btn-resume').addEventListener('click', () => canvas.requestPointerLock());
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

  try {
    const savedSeed = localStorage.getItem('webcraft_seed');
    if (savedSeed) seedInput.value = savedSeed;
  } catch (e) {}

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
      if (document.pointerLockElement === canvas && !invOpen && !player.dead) {
        updatePlayer(dt);
        computeHit();
      } else {
        currentHit = null;
      }
      player.hurtCd = Math.max(0, player.hurtCd - dt);
      if (player.hp < 20 && !player.dead && player.hurtCd <= 0) {
        player.regenT += dt;
        if (player.regenT >= 4) {
          player.regenT = 0;
          player.hp = Math.min(20, player.hp + 1);
          updateHealthUI();
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
      for (let i = mobs.length - 1; i >= 0; i--) {
        const m = mobs[i];
        const d = Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
        if (d > renderDist * 16 + 24) { killMob(m, false); continue; }
        updateMob(m, dt);
      }
      trySpawnMobs(dt);
      updateChunks(false);
      processMeshQueue(2);
      updateCamera();
      updateHighlight();
      updateUnderwater();
      updateDebug();
    }
    renderer.render(scene, camera);
  }

  animate();

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
    get craftResult() { return craftResult; },
    getState() {
      return {
        gameState, dayTime, dayLight, hp: player.hp,
        mobCount: mobs.length, invOpen, selectedSlot
      };
    }
  };
})();
