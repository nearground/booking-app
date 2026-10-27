// Delivery wave = 1 + deepest dependency wave, so Epics with no dependencies start in wave 1.
// Accepts [{ id, dependsOn }] and returns Map<id, wave>. Unknown or cyclic dependencies count as 0.
function computeWaves(items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const waves = new Map();
  const visit = (id, trail = new Set()) => {
    if (waves.has(id)) return waves.get(id);
    if (trail.has(id) || !byId.has(id)) return 0;
    trail.add(id);
    const wave = 1 + Math.max(0, ...(byId.get(id).dependsOn || []).map((dep) => visit(dep, trail)));
    waves.set(id, wave);
    return wave;
  };
  items.forEach((item) => visit(item.id));
  return waves;
}

module.exports = { computeWaves };
