// Seeded random numbers (mulberry32) so a screenshot seed always
// reproduces the same patrol jitter and the same staged frame.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a value in [min, max) from a seeded rng.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Small deterministic wobble so patrols do not look clockwork-perfect.
export function jitter(rng, amount) {
  return (rng() - 0.5) * 2 * amount;
}
