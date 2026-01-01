// Simple seeded RNG (deterministic) so the same seed always draws the same cards
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawCards({ seed, deck, count }) {
  const rng = mulberry32(seed);
  const pool = [...deck];

  const result = [];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break;
    const idx = Math.floor(rng() * pool.length);
    const picked = pool.splice(idx, 1)[0];

    // Upright / Reversed
    const reversed = rng() < 0.45;
    result.push({
      ...picked,
      orientation: reversed ? "Reversed" : "Upright",
      keywords: reversed ? picked.keywordsReversed : picked.keywordsUpright
    });
  }
  return result;
}
