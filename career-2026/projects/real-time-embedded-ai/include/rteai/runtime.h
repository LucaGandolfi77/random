// Deterministic ML runtime interface (embedded, preallocated, no-alloc inference).
#pragma once
#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <limits>
#include <string>
#include <vector>

namespace rteai {

constexpr std::size_t kInputDim = 3;
constexpr std::size_t kOutputDim = 1;
constexpr float kDefaultLatencyBudgetMs = 5.0f;
constexpr float kAbsInputLimit = 10000.0f;

enum class Status { kOk = 0, kModelMissing, kChecksumMismatch, kVersionMismatch, kInputOutOfRange,
                    kInputMissing, kTimeout, kOutputInvalid, kMemoryError, kWatchdog };

const char* status_name(Status s);

struct InferenceStats {
  std::size_t runs = 0;
  std::size_t deadline_misses = 0;
  double min_ms = 0.0, max_ms = 0.0, sum_ms = 0.0;
  std::vector<double> samples;  // ring buffer (capped) for percentiles
};

// Simple preallocated tensor with explicit bounds.
struct BoundedBuffer {
  float data[kInputDim]{};
  float lower[kInputDim]{};
  float upper[kInputDim]{};
  bool valid[kInputDim]{};
};

// Minimal watchdog: an optional monitor invoked per cycle with a heartbeat.
struct Watchdog {
  std::uint64_t heartbeats = 0;
  std::uint64_t missed_cycles = 0;
  std::uint64_t expected_cycle_us = 0;
  std::function<bool()> alive = [] { return true; };
};

// Execution configuration incl. controllable failure injection.
struct RuntimeConfig {
  float latency_budget_ms = kDefaultLatencyBudgetMs;
  bool validate_input = true;
  bool validate_output = true;
  bool check_integrity = true;
  bool fail_checksum = false;   // fault injection: corrupt model
  bool force_timeout = false;   // fault injection: pretend deadline overshoot
  bool nan_output = false;      // fault injection: poison output
  bool force_alloc = false;     // fault injection: memory pressure (alloc in inference)
  int sleep_override_us = 0;    // deterministic delay injection
  bool watchdog_enabled = true;
  float fallback_output = 0.5f;
};

// Deterministic fallback: constant safe output when ML path fails.
struct DeterministicModel {
  float weights[kInputDim]{};
  float bias = 0.0f;
  Status forward(const float in[kInputDim], float* out) const {
    float acc = bias;
    for (std::size_t i = 0; i < kInputDim; ++i) acc += weights[i] * in[i];
    *out = acc;
    return Status::kOk;
  }
};

class Runtime {
 public:
  explicit Runtime(const RuntimeConfig& cfg = {});

  // Load embedded model (always) and verify integrity fingerprint.
  Status load_model(const std::string& expected_sha256_hex);
  Status load_model_blob(const std::uint8_t* blob, std::size_t size, const std::string& expected_sha256_hex,
                         float model_version);

  // One inference cycle: validate -> preprocess -> forward -> post -> plausibility.
  Status run(const float in[kInputDim], float* out);
  Status run(const BoundedBuffer& in, float* out);

  const InferenceStats& stats() const { return stats_; }
  Status last_status() const { return last_status_; }
  std::uint64_t cycles() const { return cycles_; }
  std::uint64_t fallback_count() const { return fallback_count_; }
  std::uint64_t watchdog_triggers() const { return watchdog_triggers_; }
  void reset_stats();

  // Watchdog supervision (call from a supervisory loop/thread).
  void supervise();
  // test hook: returns writable pointer to embedded weights
  float* mutable_weights();

 private:
  Status forward_impl(const float* in, float* out);
  bool output_plausible(float out) const;
  float now_ms() const;
  void record(float ms);

  RuntimeConfig cfg_;
  InferenceStats stats_;
  Status last_status_ = Status::kOk;
  std::uint64_t cycles_ = 0;
  std::uint64_t fallback_count_ = 0;
  std::uint64_t watchdog_triggers_ = 0;
  Watchdog watchdog_;  // owned by Runtime; supervise() uses it
  std::string expected_sha_;
  std::string fp_;
  bool model_loaded_ = false;
  float version_ = 0.0f;
  float w1_[3 * 8]{}; float b1_[8]{}; float w2_[8]{};
};

}  // namespace rteai
