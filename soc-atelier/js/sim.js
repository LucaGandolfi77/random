// Engine: pure domain functions for SoC simulation. No DOM, no globals.
// Models simplified-but-correct relationships:
//  - serial: time = instructions / (IPC * clock * cores_used)
//  - parallel: Amdahl speedup = 1 / ((1 - p) + p / N)
//  - dataparallel / ai: throughput vs workUnits / TOPS / shader units
//  - cache hit rate ~ capacity vs working set
//  - bandwidth-limited: time = bytes / effective_bandwidth
//  - power ~ C * V^2 * f (per core), throttle above budget (gentle)
// Returns { perf, latency, power, cost, balance, bottleneck, throughput }
export const SIM = Object.freeze({
  VERSION: 1,
});

function kindOf(comp) { return comp && comp.stats; }

export function cacheHitRate(cache, workingSet) {
  if (!cache) return 0;
  const cap = cache.capacity || 0;
  if (cap <= 0) return 0;
  const ideal = Math.min(1, cap / Math.max(workingSet || 64, 8));
  return Math.max(0, Math.min(1, ideal));
}

export function effectiveBandwidth(ram, bus) {
  const ramBw = (ram && ram.bandwidth) || 0;
  const busBw = (bus && bus.bandwidth) || Infinity;
  return Math.min(ramBw, busBw);
}

function throttleFactor(power, budget) {
  if (budget == null || budget <= 0 || power <= budget) return 1;
  return Math.max(0.35, budget / power);
}

export function evaluate(board, workload, budget) {
  const cores = board.filter((c) => c && c.kind === 'cpu');
  const cache = board.find((c) => c && c.kind === 'cache');
  const ram = board.find((c) => c && c.kind === 'ram');
  const bus = board.find((c) => c && c.kind === 'bus');
  const gpu = board.find((c) => c && c.kind === 'gpu');
  const npu = board.find((c) => c && c.kind === 'npu');

  let power = 0, cost = 0, area = 0;
  for (const c of board) {
    if (!c) continue;
    power += (c.stats.power || 0);
    cost += (c.stats.cost || 0);
    area += (c.stats.area || 0);
  }

  const clock = cores.length ? cores.reduce((a, c) => Math.min(a, c.stats.clock || 1), Infinity) : 0;
  const ipc = cores.length ? cores.reduce((a, c) => Math.min(a, c.stats.ipc || 1), Infinity) : 0;
  const totalCores = cores.reduce((a, c) => a + (c.stats.cores || 1), 0);
  const parallelFraction = workload ? (workload.parallelFraction || 0) : 0;

  let serialTime = Infinity;
  if (workload && workload.type === 'serial' && workload.instructions > 0 && totalCores > 0) {
    serialTime = workload.instructions / (ipc * clock * Math.min(totalCores, 1)) / 1000;
  }

  let parallelTime = Infinity;
  if (workload && totalCores > 0) {
    const speedup = 1 / ((1 - parallelFraction) + parallelFraction / totalCores);
    if (workload.instructions > 0) {
      parallelTime = (workload.instructions / (ipc * clock * totalCores)) / 1000 / speedup;
    }
  }

  let cacheLatency = 1;
  if (cache) {
    const hr = cacheHitRate(cache, workload && workload.workingSet);
    cacheLatency = 1 - hr * 0.85;
  }
  const effectiveBw = Math.max(0.001, effectiveBandwidth(ram, bus));

  let memoryTime = Infinity;
  if (workload && workload.bytes > 0 && effectiveBw > 0) {
    memoryTime = (workload.bytes / 1024) / effectiveBw * cacheLatency;
  }

  let gpuTime = Infinity;
  if (workload && gpu && workload.workUnits && workload.workUnits > 0) {
    gpuTime = workload.workUnits / (gpu.stats.units * (gpu.stats.clock || 1));
  }

  let npuTime = Infinity;
  if (workload && npu && workload.ops && workload.ops > 0) {
    npuTime = (workload.ops / 1000) / (npu.stats.tops || 0);
  }

  let rawTime;
  switch (workload && workload.type) {
    case 'dataparallel': rawTime = Math.min(serialTime, gpuTime, parallelTime); break;
    case 'ai': rawTime = Math.min(serialTime, npuTime, parallelTime); break;
    case 'memory': rawTime = Math.min(serialTime, memoryTime, parallelTime); break;
    case 'cached': rawTime = Math.min(serialTime, parallelTime, memoryTime); break;
    case 'parallel': rawTime = parallelTime; break;
    default: rawTime = Math.min(serialTime, parallelTime, memoryTime);
  }

  const throttle = throttleFactor(power, budget);
  const perf = clamp((1 / Math.max(rawTime, 0.0001)) * throttle, 0, 10);
  const latency = rawTime * cacheLatency / throttle;
  const balance = cores.length > 0 ? clamp(1 - Math.abs(parallelFraction - (cores.length > 2 ? 0.8 : 0)) * 0.5, 0, 1) : 0;

  let bottleneck = 'none';
  if (budget && power > budget * 1.05) bottleneck = 'power';
  else if (workload && (workload.type === 'memory' || workload.bytes > 0) && (!ram || !bus)) bottleneck = 'memory';
  else if (workload && workload.type === 'ai' && !npu) bottleneck = 'compute';
  else if (workload && workload.type === 'dataparallel' && !gpu) bottleneck = 'compute';
  else if (workload && (workload.type === 'parallel' || workload.type === 'cached') && parallelFraction > 0.3 && totalCores < 4) bottleneck = 'cores';
  else if (cache && cacheHitRate(cache, workload && workload.workingSet) < 0.5) bottleneck = 'cache';

  return {
    perf: round(perf),
    latency: round(Math.max(0.01, latency)),
    power: round(power),
    cost: round(cost),
    area: round(area),
    balance: round(balance),
    throughput: round(rawTime > 0 ? 1 / rawTime : 0),
    bottleneck,
    throttle: round(throttle),
  };
}

function round(v) { return Math.round(v * 100) / 100; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export function meetsGoal(metrics, goal) {
  if (!goal) return false;
  if (goal.perfMin != null && metrics.perf < goal.perfMin) return false;
  if (goal.powerMax != null && metrics.power > goal.powerMax) return false;
  if (goal.latencyMax != null && metrics.latency > goal.latencyMax) return false;
  return true;
}

export function powerBudgetFor(chapterId) {
  return 80 + chapterId * 6;
}
