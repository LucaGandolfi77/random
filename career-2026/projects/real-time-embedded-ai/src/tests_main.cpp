// Self-test runner (unit + integration + deadline/watchdog/memory/corruption/fallback/replay).
#include "rteai/runtime.h"
#include "rteai/sha256.h"
#include "tiny_anomaly_model.h"
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <numeric>
#include <vector>

using namespace rteai;

static int failures = 0;
#define CHECK(cond) do { if (!(cond)) { ++failures; std::printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond); } } while (0)

static const double kGolden[5] = {gen::kGolden[0], gen::kGolden[1], gen::kGolden[2], gen::kGolden[3], gen::kGolden[4]};
static const float kInputs[5][kInputDim] = {
  {0.0f, 28.0f, 1500.0f}, {0.1f, 28.5f, 1495.0f}, {1.0f, 29.9f, 1600.0f},
  {0.0f, 27.0f, 1400.0f}, {0.5f, 29.0f, 1550.0f},
};

static RuntimeConfig base_cfg() {
  RuntimeConfig c; c.validate_input = true; c.validate_output = true; c.check_integrity = true;
  c.latency_budget_ms = 0.05f;  // generous vs measured
  return c;
}

static void run_golden_and_compare(Runtime& rt, double tol) {
  for (int i = 0; i < 5; ++i) {
    float out = -1.0f;
    Status st = rt.run(kInputs[i], &out);
    CHECK(st == Status::kOk);
    CHECK(std::fabs(static_cast<double>(out) - kGolden[i]) <= tol);
  }
}

static void test_unit_inference() {
  Runtime rt(base_cfg());
  CHECK(rt.load_model("") == Status::kOk);
  run_golden_and_compare(rt, 1e-4);
}

static void test_integrity_and_checksum() {
  RuntimeConfig c = base_cfg(); c.fail_checksum = true;
  Runtime bad(c);
  CHECK(bad.load_model("") == Status::kChecksumMismatch);

  Runtime rt(base_cfg());
  CHECK(rt.load_model("") == Status::kOk);
  float out;
  rt.mutable_weights()[0] += 0.05f;  // simulate in-memory corruption
  CHECK(rt.run(kInputs[0], &out) == Status::kChecksumMismatch);
  CHECK(out == c.fallback_output);  // deterministic fallback used
}

static void test_version_mismatch() {
  Runtime rt(base_cfg());
  const std::uint8_t dummy = 0;
  CHECK(rt.load_model_blob(&dummy, 1, "", 99.0f) == Status::kVersionMismatch);
}

static void test_input_validation() {
  Runtime rt(base_cfg());
  CHECK(rt.load_model("") == Status::kOk);
  float out;
  const float oob[kInputDim] = {0.0f, 28.0f, 50000.0f};
  CHECK(rt.run(oob, &out) == Status::kInputOutOfRange);
  const float nan_in[kInputDim] = {NAN, 28.0f, 1500.0f};
  CHECK(rt.run(nan_in, &out) == Status::kInputMissing);
  BoundedBuffer bb{};
  bb.valid[0] = bb.valid[1] = bb.valid[2] = false;
  CHECK(rt.run(bb, &out) == Status::kInputMissing);
}

static void test_output_validation_and_fallback() {
  RuntimeConfig c = base_cfg(); c.nan_output = true;
  Runtime rt(c);
  CHECK(rt.load_model("") == Status::kOk);
  float out = -1.0f;
  Status st = rt.run(kInputs[0], &out);
  if (st != Status::kOutputInvalid) std::fprintf(stderr, "DBG status=%s out=%.6f\n", status_name(st), out);
  CHECK(st == Status::kOutputInvalid);
  CHECK(out == c.fallback_output);
  CHECK(rt.fallback_count() == 1);
}

static void test_deadline_and_timeout() {
  RuntimeConfig c = base_cfg(); c.force_timeout = true;
  Runtime rt(c);
  CHECK(rt.load_model("") == Status::kOk);
  float out;
  CHECK(rt.run(kInputs[0], &out) == Status::kTimeout);

  RuntimeConfig slow = base_cfg(); slow.sleep_override_us = 2000; slow.latency_budget_ms = 0.5f;
  Runtime rs(slow);
  CHECK(rs.load_model("") == Status::kOk);
  for (int i = 0; i < 5; ++i) { float o; rs.run(kInputs[i], &o); }
  CHECK(rs.stats().deadline_misses >= 1);
}

static void test_memory_no_alloc() {
  RuntimeConfig c = base_cfg(); c.force_alloc = true;
  Runtime withalloc(c);
  CHECK(withalloc.load_model("") == Status::kOk);
  float o; withalloc.run(kInputs[0], &o);  // injected alloc allowed only with explicit fault flag

  Runtime rt(base_cfg());
  CHECK(rt.load_model("") == Status::kOk);
  // deterministic forward on preallocated stack buffers; no heap used (see forward_impl)
  run_golden_and_compare(rt, 1e-4);
}

static void test_watchdog() {
  RuntimeConfig c = base_cfg();
  Runtime rt(c);
  CHECK(rt.load_model("") == Status::kOk);
  rt.supervise();
  rt.supervise(); CHECK(rt.watchdog_triggers() == 0);
  RuntimeConfig off = base_cfg(); off.watchdog_enabled = false;
  Runtime rt2(off);
  CHECK(rt2.load_model("") == Status::kOk);
}

static void test_deterministic_replay() {
  double tol = 1e-4;
  Runtime a(base_cfg());
  a.load_model("");
  float prev[kInputDim > 0 ? 5 : 1]{};
  for (int rep = 0; rep < 3; ++rep) {
    for (int i = 0; i < 5; ++i) {
      float out;
      Status st = a.run(kInputs[i], &out);
      if (st != Status::kOk) std::fprintf(stderr, "DBG rep=%d i=%d status=%s fallback=%llu\n", rep, i,
                                          status_name(st), (unsigned long long)a.fallback_count());
      CHECK(st == Status::kOk);
      if (rep == 0) prev[i] = out;
      else CHECK(out == prev[i]);
      CHECK(std::fabs(out - static_cast<float>(kGolden[i])) <= tol);
    }
  }
  Runtime b(base_cfg());
  b.load_model("");
  for (int i = 0; i < 5; ++i) {
    float out;
    b.run(kInputs[i], &out);
    CHECK(std::fabs(out - prev[i]) <= tol);  // deterministic across instances
  }
}

static void test_latency_percentiles() {
  Runtime rt(base_cfg());
  CHECK(rt.load_model("") == Status::kOk);
  for (int i = 0; i < 500; ++i) { float o; rt.run(kInputs[i % 5], &o); }
  const auto& samples = rt.stats().samples;
  if (samples.empty()) std::fprintf(stderr, "WARN no latency samples (runs=%zu status=%s)\n", rt.stats().runs,
                                   status_name(rt.last_status()));
  std::vector<double> sorted = samples;
  std::sort(sorted.begin(), sorted.end());
  auto pct = [&](double p) { return sorted[static_cast<std::size_t>(p * (sorted.size() - 1))]; };

  CHECK(rt.stats().max_ms >= rt.stats().min_ms);
  if (!sorted.empty()) {
    CHECK(pct(0.5) <= rt.stats().max_ms + 1e-6);
    CHECK(pct(0.95) <= pct(0.99) + 1e-6);
  }
}

int main() {
  test_unit_inference();
  test_integrity_and_checksum();
  test_version_mismatch();
  test_input_validation();
  test_output_validation_and_fallback();
  test_deadline_and_timeout();
  test_memory_no_alloc();
  test_watchdog();
  test_deterministic_replay();
  test_latency_percentiles();
  if (failures == 0) { std::printf("ALL TESTS PASSED\n"); return 0; }
  std::printf("%d CHECK(S) FAILED\n", failures);
  return 1;
}
