#include "rteai/runtime.h"
#include "rteai/sha256.h"
#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <vector>

using namespace rteai;

int main(int argc, char** argv) {
  std::size_t runs = 100000;
  if (argc > 1) runs = static_cast<std::size_t>(std::atoll(argv[1]));
  RuntimeConfig cfg;
  cfg.latency_budget_ms = 0.02f;  // budget used only for deadline accounting
  Runtime rt(cfg);
  if (rt.load_model("") != Status::kOk) { std::fprintf(stderr, "model load failed\n"); return 2; }

  // reference inputs
  static const float inputs[5][kInputDim] = {
    {0.0f, 28.0f, 1500.0f}, {0.1f, 28.5f, 1495.0f}, {1.0f, 29.9f, 1600.0f},
    {0.0f, 27.0f, 1400.0f}, {0.5f, 29.0f, 1550.0f}};
  for (std::size_t i = 0; i < runs; ++i) {
    float out;
    rt.run(inputs[i % 5], &out);
  }
  const auto& samples = rt.stats().samples;
  std::vector<double> sorted = samples;
  std::sort(sorted.begin(), sorted.end());
  auto pct = [&](double p) { return sorted[static_cast<std::size_t>(p * (sorted.size() - 1))]; };
  std::printf("runs=%zu\n", rt.stats().runs);
  std::printf("min_ms=%.4f max_ms=%.4f mean_ms=%.4f\n", rt.stats().min_ms, rt.stats().max_ms,
              rt.stats().sum_ms / std::max<std::size_t>(1, rt.stats().runs));
  std::printf("p50_ms=%.4f p95_ms=%.4f p99_ms=%.4f\n", pct(0.50), pct(0.95), pct(0.99));
  std::printf("deadline_misses=%zu jitter_ms(max-min)=%.4f\n", rt.stats().deadline_misses,
              rt.stats().max_ms - rt.stats().min_ms);
  std::printf("cycles=%llu fallback=%llu\n", (unsigned long long)rt.cycles(),
              (unsigned long long)rt.fallback_count());
  return 0;
}
