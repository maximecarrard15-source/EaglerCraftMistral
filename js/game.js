'use strict';
(function () {
  const E = WebCraftEngine;
  const CHUNK = E.CHUNK, WORLD_H = E.WORLD_H, WATER_LEVEL = E.WATER_LEVEL;
  const AIR = E.AIR, WATER = E.WATER, BEDROCK = E.BEDROCK;
  const BLOCKS = E.BLOCKS, FACES = E.FACES;

  const GRAVITY = 30, JUMP_V = 8.8, WALK_SPEED = 4.4, SPRINT_MULT = 1.55,
        FLY_SPEED = 11, MAX_FALL = 55;
  const PLAYER_W = 0.6, PLAYER_H = 1.8, EYE_HEIGHT = 1.62, REACH = 6;
  const AXES = ['x', 'y', 'z'];
  const HOTBAR_BLOCKS = [E.GRASS, E.DIRT, E.STONE, E.PLANKS, E.LOG, E.LEAVES,
                         E.GLASS, E.BRICK, E.SAND];
  const SKY_HEX = 0x87ceeb;

  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const debugEl = document.getElementById('debug');
  const hotbarEl = document.getElementById('hotbar');
  const underwaterEl = document.getElementById('underwater');
  const hintEl = document.getElementById('hint');
  const loadingEl = document.getElementById('loading');
  const loadingFill = document.getElementById('loading-fill');
  const menuEl = document.getElementById('menu');
  const seedInput = document.getElementById('seed');
  const renderDistSelect = document.getElementById('render-dist');
  const pauseEl = document.getElementById('pause');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_HEX);
  scene.fog = new THREE.Fog(SKY_HEX, 40, 80);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.rotation.order = 'YXZ';

  const atlasCanvas = buildAtlas();
  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;

  const matOpaque = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true, alphaTest: 0.5 });
  const matWater = new THREE.MeshBasicMaterial({
    map: texture, vertexColors: true, transparent: true,
    opacity: 0.68, depthWrite: false, side: THREE.DoubleSide
  });

  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
  );
  highlight.visible = false;
  scene.add(highlight);

  const chunks = new Map();
  let meshQueue = [];
  let lastScanKey = null;
  const editsByChunk = new Map();
  let saveTimer = null;

  const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, onGround: false, fly: false };
  const keys = new Set();
  let selectedSlot = 0;
  let renderDist = 4;
  let baseFogNear = 40, baseFogFar = 80;
  let gameState = 'menu';
  let loadingTotal = 1;
  let currentHit = null;
  let debugVisible = false;
  let fpsFrames = 0, fpsTime = 0, fpsValue = 0;

  function buildAtlas() {
    const T = 16, COLS = 4, SIZE = T * COLS;
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
          else if (y < h - 3) id = E.STONE;
          else if (y < h) id = E.DIRT;
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
          set(wx + ox, h + 1 + dy, wz + oz, E.LEAVES, true);
        }
      }
    }
    for (let i = 0; i < th; i++) set(wx, h + 1 + i, wz, E.LOG, false);
  }

  function getBlock(x, y, z) {
    if (y < 0) return BEDROCK;
    if (y >= WORLD_H) return AIR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const ch = getChunk(cx, cz);
    return ch.data[E.blockIndex(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  function setBlock(x, y, z, id) {
    if (y < 1 || y >= WORLD_H) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const ch = getChunk(cx, cz);
    const lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    ch.data[E.blockIndex(lx, y, lz)] = id;
    recordEdit(cx, cz, lx, y, lz, id);
    if (ch.built) buildChunkMesh(ch);
    if (lx === 0) rebuildAt(cx - 1, cz);
    if (lx === CHUNK - 1) rebuildAt(cx + 1, cz);
    if (lz === 0) rebuildAt(cx, cz - 1);
    if (lz === CHUNK - 1) rebuildAt(cx, cz + 1);
  }

  function rebuildAt(cx, cz) {
    const ch = chunks.get(chunkKey(cx, cz));
    if (ch && ch.built) buildChunkMesh(ch);
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

  function makeMesh(t, mat, ch, order) {
    if (t.idx.length === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(t.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(t.col, 3));
    g.setIndex(t.idx);
    const m = new THREE.Mesh(g, mat);
    m.position.set(ch.cx * CHUNK, 0, ch.cz * CHUNK);
    m.renderOrder = order;
    scene.add(m);
    return m;
  }

  function buildChunkMesh(ch) {
    unloadChunk(ch);
    const opq = { pos: [], uv: [], col: [], idx: [] };
    const wat = { pos: [], uv: [], col: [], idx: [] };
    const data = ch.data;
    const x0 = ch.cx * CHUNK, z0 = ch.cz * CHUNK;
    for (let y = 0; y < WORLD_H; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const id = data[E.blockIndex(x, y, z)];
          if (id === AIR) continue;
          const b = BLOCKS[id];
          const wx = x0 + x, wz = z0 + z;
          const t = id === WATER ? wat : opq;
          for (let fi = 0; fi < 6; fi++) {
            const f = FACES[fi];
            const nx = wx + f.dir[0], ny = y + f.dir[1], nz = wz + f.dir[2];
            let nid;
            if (ny < 0) nid = BEDROCK;
            else if (ny >= WORLD_H) nid = AIR;
            else if (nx >= x0 && nx < x0 + CHUNK && nz >= z0 && nz < z0 + CHUNK) {
              nid = data[E.blockIndex(nx - x0, ny, nz - z0)];
            } else nid = getBlock(nx, ny, nz);
            if (!E.faceVisible(id, nid)) continue;
            const tile = f.dir[1] === 1 ? b.top : (f.dir[1] === -1 ? b.bottom : b.side);
            const tcol = tile % 4, trow = (tile / 4) | 0;
            const base = t.pos.length / 3;
            for (const c of f.corners) {
              t.pos.push(x + c.pos[0], y + c.pos[1], z + c.pos[2]);
              t.uv.push((tcol + c.uv[0]) / 4, 1 - (trow + 1 - c.uv[1]) / 4);
              t.col.push(f.shade, f.shade, f.shade);
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

  function collidesAt(px, py, pz) {
    const hw = PLAYER_W / 2;
    const x0 = Math.floor(px - hw), x1 = Math.ceil(px + hw) - 1;
    const y0 = Math.floor(py), y1 = Math.ceil(py + PLAYER_H) - 1;
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

  function moveAxis(axis, amount) {
    if (amount === 0) return false;
    const sign = amount > 0 ? 1 : -1;
    let rem = Math.abs(amount);
    const p = player.pos;
    while (rem > 0) {
      const d = Math.min(0.05, rem) * sign;
      p[AXES[axis]] += d;
      if (collidesAt(p.x, p.y, p.z)) {
        p[AXES[axis]] -= d;
        return true;
      }
      rem -= Math.min(0.05, rem);
    }
    return false;
  }

  function updatePlayer(dt) {
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = player.fly ? FLY_SPEED * (sprint ? 1.8 : 1) : WALK_SPEED * (sprint ? SPRINT_MULT : 1);
    const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
    let fx = 0, fz = 0;
    if (keys.has('KeyW')) { fx += -sin; fz += -cos; }
    if (keys.has('KeyS')) { fx += sin; fz += cos; }
    if (keys.has('KeyA')) { fx += -cos; fz += sin; }
    if (keys.has('KeyD')) { fx += cos; fz += -sin; }
    const len = Math.hypot(fx, fz);
    let tvx = 0, tvz = 0;
    if (len > 0) { tvx = fx / len * speed; tvz = fz / len * speed; }
    const k = 1 - Math.exp(-dt * 14);
    player.vel.x += (tvx - player.vel.x) * k;
    player.vel.z += (tvz - player.vel.z) * k;

    if (player.fly) {
      let tvy = 0;
      if (keys.has('Space')) tvy += FLY_SPEED;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) tvy -= FLY_SPEED;
      player.vel.y += (tvy - player.vel.y) * k;
    } else {
      player.vel.y -= GRAVITY * dt;
      if (player.vel.y < -MAX_FALL) player.vel.y = -MAX_FALL;
      if (keys.has('Space') && player.onGround) { player.vel.y = JUMP_V; player.onGround = false; }
    }

    player.onGround = false;
    if (moveAxis(1, player.vel.y * dt)) {
      if (player.vel.y < 0) player.onGround = true;
      player.vel.y = 0;
    }
    if (moveAxis(0, player.vel.x * dt)) player.vel.x = 0;
    if (moveAxis(2, player.vel.z * dt)) player.vel.z = 0;

    if (player.fly && player.onGround) player.fly = false;
    if (player.pos.y < -20) {
      player.pos.y = WORLD_H;
      player.vel.set(0, 0, 0);
    }
  }

  function computeHit() {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    currentHit = E.raycast(
      camera.position.x, camera.position.y, camera.position.z,
      dir.x, dir.y, dir.z, REACH,
      (x, y, z) => {
        const id = getBlock(x, y, z);
        return id !== AIR && id !== WATER;
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

  function updateUnderwater() {
    const id = getBlock(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
    const uw = id === WATER;
    underwaterEl.classList.toggle('hidden', !uw);
    if (uw) {
      scene.fog.near = 2; scene.fog.far = 24;
      scene.fog.color.setHex(0x1a4bb8);
      scene.background.setHex(0x1a4bb8);
    } else {
      scene.fog.near = baseFogNear; scene.fog.far = baseFogFar;
      scene.fog.color.setHex(SKY_HEX);
      scene.background.setHex(SKY_HEX);
    }
  }

  function updateDebug() {
    if (!debugVisible) return;
    const p = player.pos;
    const dx = -Math.sin(player.yaw), dz = -Math.cos(player.yaw);
    const facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'Est' : 'Ouest') : (dz > 0 ? 'Sud' : 'Nord');
    debugEl.innerHTML = 'FPS: ' + fpsValue +
      '<br>XYZ: ' + p.x.toFixed(1) + ' / ' + p.y.toFixed(1) + ' / ' + p.z.toFixed(1) +
      '<br>Direction: ' + facing +
      '<br>Chunks: ' + chunks.size + ' (file: ' + meshQueue.length + ')' +
      '<br>Vol: ' + (player.fly ? 'oui' : 'non');
  }

  function blockIntersectsPlayer(x, y, z) {
    const hw = PLAYER_W / 2, p = player.pos;
    return x + 1 > p.x - hw && x < p.x + hw &&
           y + 1 > p.y && y < p.y + PLAYER_H &&
           z + 1 > p.z - hw && z < p.z + hw;
  }

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
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + dur);
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
    camera.far = d + 80;
    camera.updateProjectionMatrix();
    scene.fog.near = baseFogNear;
    scene.fog.far = baseFogFar;
  }

  function buildHotbar() {
    hotbarEl.innerHTML = '';
    HOTBAR_BLOCKS.forEach((id, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot' + (i === 0 ? ' selected' : '');
      const cv = document.createElement('canvas');
      cv.width = 32; cv.height = 32;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      const t = BLOCKS[id].side;
      c.drawImage(atlasCanvas, (t % 4) * 16, ((t / 4) | 0) * 16, 16, 16, 0, 0, 32, 32);
      slot.appendChild(cv);
      slot.addEventListener('mousedown', () => selectSlot(i));
      hotbarEl.appendChild(slot);
    });
  }

  function selectSlot(i) {
    selectedSlot = i;
    Array.prototype.forEach.call(hotbarEl.children, (el, j) => el.classList.toggle('selected', j === i));
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
    gameState = 'loading';
    loadingTotal = meshQueue.length || 1;
    menuEl.classList.add('hidden');
    pauseEl.classList.add('hidden');
    hud.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
  }

  function resetWorld() {
    for (const ch of chunks.values()) unloadChunk(ch);
    chunks.clear();
    meshQueue = [];
    lastScanKey = null;
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
    menuEl.classList.remove('hidden');
  }

  function setDirtBackground() {
    const cv = document.createElement('canvas');
    cv.width = 16; cv.height = 16;
    const c = cv.getContext('2d');
    c.drawImage(atlasCanvas, 32, 0, 16, 16, 0, 0, 16, 16);
    c.fillStyle = 'rgba(0,0,0,0.62)';
    c.fillRect(0, 0, 16, 16);
    const url = 'url(' + cv.toDataURL() + ')';
    document.querySelectorAll('.dirt-bg').forEach((el) => { el.style.backgroundImage = url; });
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (locked) {
      hintEl.classList.add('hidden');
      pauseEl.classList.add('hidden');
    } else if (gameState === 'playing') {
      pauseEl.classList.remove('hidden');
      keys.clear();
      saveEdits();
    }
  });

  document.addEventListener('mousemove', (e) => {
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
    if (gameState !== 'playing') return;
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      return;
    }
    if (!currentHit) return;
    if (e.button === 0) {
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      if (BLOCKS[id] && BLOCKS[id].unbreakable) return;
      setBlock(currentHit.x, currentHit.y, currentHit.z, AIR);
      playSound(170, 0.13, 0.12);
    } else if (e.button === 1) {
      e.preventDefault();
      const id = getBlock(currentHit.x, currentHit.y, currentHit.z);
      const slot = HOTBAR_BLOCKS.indexOf(id);
      if (slot >= 0) selectSlot(slot);
    } else if (e.button === 2) {
      const px = currentHit.x + currentHit.face[0];
      const py = currentHit.y + currentHit.face[1];
      const pz = currentHit.z + currentHit.face[2];
      if (py < 1 || py >= WORLD_H) return;
      const cur = getBlock(px, py, pz);
      if (cur !== AIR && cur !== WATER) return;
      if (blockIntersectsPlayer(px, py, pz)) return;
      setBlock(px, py, pz, HOTBAR_BLOCKS[selectedSlot]);
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
  applyRenderDistance();

  let lastTime = performance.now();
  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    fpsFrames++; fpsTime += dt;
    if (fpsTime >= 0.5) { fpsValue = Math.round(fpsFrames / fpsTime); fpsFrames = 0; fpsTime = 0; }

    if (gameState === 'loading') {
      updateChunks(true);
      processMeshQueue(6);
      const done = Math.max(0, loadingTotal - meshQueue.length);
      loadingFill.style.width = Math.min(100, Math.round((done / loadingTotal) * 100)) + '%';
      if (meshQueue.length === 0) finishLoading();
    } else if (gameState === 'playing') {
      if (document.pointerLockElement === canvas) {
        updatePlayer(dt);
        computeHit();
      } else {
        currentHit = null;
      }
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
})();
