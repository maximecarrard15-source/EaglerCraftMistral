'use strict';
(function (global) {
  const CHUNK = 16;
  const WORLD_H = 64;
  const WATER_LEVEL = 22;
  const ATLAS_COLS = 8;

  const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, SAND = 4, LOG = 5, LEAVES = 6,
        WATER = 7, PLANKS = 8, COBBLE = 9, GLASS = 10, BRICK = 11, BEDROCK = 12,
        SNOW = 13, GRAVEL = 14, WOOL = 15, COAL_ORE = 16, IRON_ORE = 17,
        TABLE = 18, TORCH = 19,
        FLOWER_RED = 20, FLOWER_YELLOW = 21, TALLGRASS = 22,
        BED = 23, CHEST = 24, FURNACE = 25,
        DOOR_L = 26, DOOR_U = 27, SIGN = 28;

  const BLOCKS = {
    [GRASS]:    { name: 'Herbe',            top: 0,  bottom: 2,  side: 1,  opaque: true,  solid: true },
    [DIRT]:     { name: 'Terre',            top: 2,  bottom: 2,  side: 2,  opaque: true,  solid: true },
    [STONE]:    { name: 'Pierre',           top: 3,  bottom: 3,  side: 3,  opaque: true,  solid: true },
    [SAND]:     { name: 'Sable',            top: 4,  bottom: 4,  side: 4,  opaque: true,  solid: true },
    [LOG]:      { name: 'Bûche',            top: 6,  bottom: 6,  side: 5,  opaque: true,  solid: true },
    [LEAVES]:   { name: 'Feuilles',         top: 7,  bottom: 7,  side: 7,  opaque: true,  solid: true },
    [WATER]:    { name: 'Eau',              top: 8,  bottom: 8,  side: 8,  opaque: false, solid: false, fluid: true },
    [PLANKS]:   { name: 'Planches',         top: 9,  bottom: 9,  side: 9,  opaque: true,  solid: true },
    [COBBLE]:   { name: 'Pierre taillée',   top: 10, bottom: 10, side: 10, opaque: true,  solid: true },
    [GLASS]:    { name: 'Verre',            top: 11, bottom: 11, side: 11, opaque: false, solid: true },
    [BRICK]:    { name: 'Brique',           top: 12, bottom: 12, side: 12, opaque: true,  solid: true },
    [BEDROCK]:  { name: 'Bedrock',          top: 13, bottom: 13, side: 13, opaque: true,  solid: true, unbreakable: true },
    [SNOW]:     { name: 'Neige',            top: 14, bottom: 14, side: 14, opaque: true,  solid: true },
    [GRAVEL]:   { name: 'Gravier',          top: 15, bottom: 15, side: 15, opaque: true,  solid: true },
    [WOOL]:     { name: 'Laine',            top: 21, bottom: 21, side: 21, opaque: true,  solid: true },
    [COAL_ORE]: { name: 'Minerai de charbon', top: 16, bottom: 16, side: 16, opaque: true, solid: true },
    [IRON_ORE]: { name: 'Minerai de fer',   top: 17, bottom: 17, side: 17, opaque: true,  solid: true },
    [TABLE]:    { name: 'Établi',           top: 18, bottom: 9,  side: 19, opaque: true,  solid: true },
    [TORCH]:    { name: 'Torche',           top: 20, bottom: 20, side: 20, opaque: false, solid: false, torch: true },
    [FLOWER_RED]:    { name: 'Coquelicot',    top: 31, bottom: 31, side: 31, opaque: false, solid: false, plant: true },
    [FLOWER_YELLOW]: { name: 'Pissenlit',     top: 32, bottom: 32, side: 32, opaque: false, solid: false, plant: true },
    [TALLGRASS]:     { name: 'Herbe haute',   top: 33, bottom: 33, side: 33, opaque: false, solid: false, plant: true },
    [BED]:           { name: 'Lit',           top: 34, bottom: 35, side: 35, opaque: false, solid: false, bed: true, half: true },
    [FURNACE]:  { name: 'Four',             top: 39, bottom: 39, side: 41, opaque: true, solid: true, furnace: true },
    [CHEST]:         { name: 'Coffre',        top: 37, bottom: 36, side: 36, opaque: true,  solid: true, chest: true },
    [DOOR_L]:   { name: 'Porte',         top: 46, bottom: 46, side: 46, opaque: false, solid: true,  door: true, lower: true },
    [DOOR_U]:   { name: 'Porte',         top: 47, bottom: 47, side: 47, opaque: false, solid: true,  door: true, upper: true },
    [SIGN]:     { name: 'Pancarte',      top: 48, bottom: 48, side: 48, opaque: false, solid: false, sign: true }
  };

  for (let l = 8; l >= 1; l--) {
    BLOCKS[47 - l] = { name: 'Eau', top: 8, bottom: 8, side: 8, opaque: false, solid: false, fluid: true, level: l };
  }

  function isWater(id) { return id === WATER || (id >= 39 && id <= 46); }
  function waterLevel(id) { return id === WATER ? 8 : (id >= 39 && id <= 46 ? 47 - id : 0); }
  function isSolid(id) { const b = BLOCKS[id]; return !!(b && b.solid); }

  let SEED = 1337;
  function setSeed(s) { SEED = s | 0; }
  function getSeed() { return SEED; }

  function hash2(x, y, s) {
    let h = (s | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function hash3(x, y, z, s) {
    let h = (s | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  function noise3(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = smooth(xf), v = smooth(yf), w = smooth(zf);
    const c000 = hash3(xi, yi, zi, s), c100 = hash3(xi + 1, yi, zi, s);
    const c010 = hash3(xi, yi + 1, zi, s), c110 = hash3(xi + 1, yi + 1, zi, s);
    const c001 = hash3(xi, yi, zi + 1, s), c101 = hash3(xi + 1, yi, zi + 1, s);
    const c011 = hash3(xi, yi + 1, zi + 1, s), c111 = hash3(xi + 1, yi + 1, zi + 1, s);
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }

  function noise2(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
    const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    const u = smooth(xf), v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, s, octaves) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise2(x * freq, y * freq, (s + i * 1013) | 0);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  function fbm3(x, y, z, s, octaves) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise3(x * freq, y * freq, z * freq, (s + i * 1013) | 0);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  function biomeAt(wx, wz) {
    const m = fbm(wx * 0.0038, wz * 0.0038, (SEED ^ 0xB10) | 0, 2);
    if (m < 0.36) return 'desert';
    if (m > 0.64) return 'snow';
    if (m > 0.55) return 'forest';
    return 'plains';
  }

  function caveAt(wx, y, wz) {
    if (y < 5) return false;
    const a = fbm3(wx * 0.042, y * 0.06, wz * 0.042, (SEED ^ 0xCAFE) | 0, 2);
    if (Math.abs(a - 0.5) > 0.055) return false;
    const b = fbm3(wx * 0.042, y * 0.06, wz * 0.042, (SEED ^ 0xF00D) | 0, 2);
    return Math.abs(b - 0.5) < 0.055;
  }

  function terrainHeight(wx, wz) {
    const e = fbm(wx * 0.0075, wz * 0.0075, SEED, 4);
    const d = fbm(wx * 0.045, wz * 0.045, (SEED ^ 0x9e3779) | 0, 2);
    const h = 12 + Math.pow(e, 1.6) * 40 + d * 5;
    return Math.max(2, Math.min(WORLD_H - 12, Math.floor(h)));
  }

  function surfaceBlock(wx, wz, h) {
    if (h <= WATER_LEVEL + 1) return SAND;
    const biome = biomeAt(wx, wz);
    if (biome === 'desert') return SAND;
    if (biome === 'snow' || h >= 45) return SNOW;
    return GRASS;
  }

  function oreAt(wx, y, wz) {
    if (y < 44 && hash3(wx, y, wz, (SEED ^ 0x7777) | 0) < 0.012) return COAL_ORE;
    if (y < 26 && hash3(wx, y, wz, (SEED ^ 0xaaaa) | 0) < 0.007) return IRON_ORE;
    return STONE;
  }

  function treeAt(wx, wz) {
    const h = terrainHeight(wx, wz);
    if (h <= WATER_LEVEL + 1 || h >= 44) return false;
    const biome = biomeAt(wx, wz);
    if (biome === 'desert') return false;
    const chance = biome === 'forest' ? 0.05 : (biome === 'snow' ? 0.004 : 0.012);
    return hash2(wx, wz, (SEED ^ 0x51ab) | 0) < chance;
  }

  function blockIndex(x, y, z) { return y * 256 + z * 16 + x; }

  const FACES = [
    { dir: [-1, 0, 0], shade: 0.68, corners: [
      { pos: [0, 1, 0], uv: [0, 1] }, { pos: [0, 0, 0], uv: [0, 0] },
      { pos: [0, 1, 1], uv: [1, 1] }, { pos: [0, 0, 1], uv: [1, 0] } ] },
    { dir: [1, 0, 0], shade: 0.68, corners: [
      { pos: [1, 1, 1], uv: [0, 1] }, { pos: [1, 0, 1], uv: [0, 0] },
      { pos: [1, 1, 0], uv: [1, 1] }, { pos: [1, 0, 0], uv: [1, 0] } ] },
    { dir: [0, -1, 0], shade: 0.55, corners: [
      { pos: [1, 0, 1], uv: [1, 0] }, { pos: [0, 0, 1], uv: [0, 0] },
      { pos: [1, 0, 0], uv: [1, 1] }, { pos: [0, 0, 0], uv: [0, 1] } ] },
    { dir: [0, 1, 0], shade: 1.0, corners: [
      { pos: [0, 1, 1], uv: [1, 1] }, { pos: [1, 1, 1], uv: [0, 1] },
      { pos: [0, 1, 0], uv: [1, 0] }, { pos: [1, 1, 0], uv: [0, 0] } ] },
    { dir: [0, 0, -1], shade: 0.82, corners: [
      { pos: [1, 0, 0], uv: [0, 0] }, { pos: [0, 0, 0], uv: [1, 0] },
      { pos: [1, 1, 0], uv: [0, 1] }, { pos: [0, 1, 0], uv: [1, 1] } ] },
    { dir: [0, 0, 1], shade: 0.82, corners: [
      { pos: [0, 0, 1], uv: [0, 0] }, { pos: [1, 0, 1], uv: [1, 0] },
      { pos: [0, 1, 1], uv: [0, 1] }, { pos: [1, 1, 1], uv: [1, 1] } ] }
  ];

  function faceVisible(id, nid) {
    if (nid === AIR) return true;
    const nb = BLOCKS[nid];
    if (!nb) return true;
    if (nb.opaque) return false;
    return nid !== id;
  }

  function raycast(ox, oy, oz, dx, dy, dz, maxDist, isTarget) {
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
    const tdX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tdY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tdZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tmX = dx !== 0 ? Math.abs(dx > 0 ? x + 1 - ox : ox - x) * tdX : Infinity;
    let tmY = dy !== 0 ? Math.abs(dy > 0 ? y + 1 - oy : oy - y) * tdY : Infinity;
    let tmZ = dz !== 0 ? Math.abs(dz > 0 ? z + 1 - oz : oz - z) * tdZ : Infinity;
    let face = [0, 0, 0];
    for (let i = 0; i < 512; i++) {
      if (isTarget(x, y, z)) return { x, y, z, face };
      if (tmX < tmY && tmX < tmZ) {
        if (tmX > maxDist) return null;
        x += stepX; tmX += tdX; face = [-stepX, 0, 0];
      } else if (tmY < tmZ) {
        if (tmY > maxDist) return null;
        y += stepY; tmY += tdY; face = [0, -stepY, 0];
      } else {
        if (tmZ > maxDist) return null;
        z += stepZ; tmZ += tdZ; face = [0, 0, -stepZ];
      }
    }
    return null;
  }

  global.WebCraftEngine = {
    CHUNK, WORLD_H, WATER_LEVEL, ATLAS_COLS,
    AIR, GRASS, DIRT, STONE, SAND, LOG, LEAVES, WATER, PLANKS, COBBLE,
    GLASS, BRICK, BEDROCK, SNOW, GRAVEL, WOOL, COAL_ORE, IRON_ORE, TABLE, TORCH,
    FLOWER_RED, FLOWER_YELLOW, TALLGRASS, BED, CHEST, FURNACE, DOOR_L, DOOR_U, SIGN,
    BLOCKS, FACES,
    setSeed, getSeed, hash2, hash3, noise2, fbm,
    terrainHeight, surfaceBlock, oreAt, treeAt, blockIndex, faceVisible, raycast,
    biomeAt, caveAt, noise3, fbm3,
    isWater, waterLevel, isSolid
  };
})(typeof window !== 'undefined' ? window : globalThis);
