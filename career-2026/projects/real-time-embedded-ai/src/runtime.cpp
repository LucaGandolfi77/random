#include "rteai/runtime.h"
#include "rteai/sha256.h"
#include "tiny_anomaly_model.h"  // generated weights (repo model dir)
#include <algorithm>
#include <cmath>
#include <cstring>
#include <thread>

namespace rteai {

namespace {
std::string fingerprint(const float* w1, const std::size_t n1, const float* w2, const std::size_t n2) {
  std::string buf = "rteai-model:v1.2";
  buf.append(reinterpret_cast<const char*>(w1), n1 * sizeof(float));
  buf.append(reinterpret_cast<const char*>(w2), n2 * sizeof(float));
  return sha256_hex(reinterpret_cast<const std::uint8_t*>(buf.data()), buf.size());
}
}  // namespace

const char* status_name(Status s) {
  switch (s) {
    case Status::kOk: return "OK";
    case Status::kModelMissing: return "MODEL_MISSING";
    case Status::kChecksumMismatch: return "CHECKSUM_MISMATCH";
    case Status::kVersionMismatch: return "VERSION_MISMATCH";
    case Status::kInputOutOfRange: return "INPUT_OUT_OF_RANGE";
    case Status::kInputMissing: return "INPUT_MISSING";
    case Status::kTimeout: return "TIMEOUT";
    case Status::kOutputInvalid: return "OUTPUT_INVALID";
    case Status::kMemoryError: return "MEMORY_ERROR";
    case Status::kWatchdog: return "WATCHDOG";
  }
  return "UNKNOWN";
}

Runtime::Runtime(const RuntimeConfig& cfg) : cfg_(cfg) {}

float Runtime::now_ms() const {
  using clock = std::chrono::steady_clock;
  return std::chrono::duration<double, std::milli>(clock::now().time_since_epoch()).count();
}

void Runtime::record(float ms) {
  stats_.runs++;
  stats_.sum_ms += ms;
  if (stats_.runs == 1) { stats_.min_ms = stats_.max_ms = ms; }
  else { stats_.min_ms = std::min(stats_.min_ms, static_cast<double>(ms));
    stats_.max_ms = std::max(stats_.max_ms, static_cast<double>(ms)); }
  if (stats_.samples.size() < 20000) stats_.samples.push_back(ms);
}

void Runtime::reset_stats() {
  stats_ = InferenceStats{};
}

bool Runtime::output_plausible(float out) const {
  return std::isfinite(out) && out >= -0.02f && out <= 1.02f;  // logistic anomaly score
}

Status Runtime::load_model(const std::string& expected_sha256_hex) {
  expected_sha_ = expected_sha256_hex;
  // copy embedded model into writable runtime memory (enables integrity re-check + fault tests)
  for (std::size_t i = 0; i < 3 * 8; ++i) w1_[i] = gen::kWeights1[i];
  for (std::size_t i = 0; i < 8; ++i) { b1_[i] = gen::kBias1[i]; w2_[i] = gen::kWeights2[i]; }
  fp_ = fingerprint(w1_, 3 * 8, w2_, 8);
  if (cfg_.fail_checksum || (!expected_sha256_hex.empty() && expected_sha256_hex != fp_))
    return (last_status_ = Status::kChecksumMismatch);
  version_ = gen::kModelVersion;
  model_loaded_ = true;
  return (last_status_ = Status::kOk);
}

Status Runtime::load_model_blob(const std::uint8_t* blob, std::size_t size, const std::string& expected,
                                float model_version) {
  (void)blob; (void)size;
  if (std::fabs(model_version - gen::kModelVersion) > 1e-4f) return (last_status_ = Status::kVersionMismatch);
  return load_model(expected);
}

void Runtime::supervise() {
  if (!cfg_.watchdog_enabled) return;
  ++watchdog_.heartbeats;
  if (!watchdog_.alive()) { ++watchdog_triggers_; last_status_ = Status::kWatchdog; }
}

float* Runtime::mutable_weights() { return w1_; }

Status Runtime::forward_impl(const float* in, float* out) {
  // deterministic forward on generated weights; zero dynamic allocation
  float hidden[gen::kHiddenDim];
  for (std::size_t j = 0; j < gen::kHiddenDim; ++j) {
    float acc = b1_[j];
    for (std::size_t i = 0; i < gen::kInputDim; ++i) acc += gen::kInputScale[i] * in[i] * w1_[i * gen::kHiddenDim + j];
    hidden[j] = acc > 0.0f ? acc : 0.0f;  // ReLU
  }
  float z = 0.0f;
  for (std::size_t j = 0; j < gen::kHiddenDim; ++j) z += hidden[j] * w2_[j];
  z = std::max(-30.0f, std::min(30.0f, z));
  *out = 1.0f / (1.0f + std::exp(-z));
  return Status::kOk;
}

Status Runtime::run(const BoundedBuffer& in, float* out) {
  float tmp[kInputDim];
  for (std::size_t i = 0; i < kInputDim; ++i) {
    if (!in.valid[i]) return (last_status_ = Status::kInputMissing);
    if (in.data[i] < in.lower[i] || in.data[i] > in.upper[i]) return (last_status_ = Status::kInputOutOfRange);
    if (!std::isfinite(in.data[i])) return (last_status_ = Status::kInputMissing);
    tmp[i] = in.data[i];
  }
  return run(tmp, out);
}

Status Runtime::run(const float in[kInputDim], float* out) {
  auto fail = [&](Status status) {
    last_status_ = status;
    ++fallback_count_;
    *out = cfg_.fallback_output;
    return status;
  };
  if (!model_loaded_) return fail(Status::kModelMissing);
  if (cfg_.check_integrity) {
    if (cfg_.fail_checksum) return fail(Status::kChecksumMismatch);
    if (fingerprint(w1_, 3 * 8, w2_, 8) != fp_) return fail(Status::kChecksumMismatch);
  }
  if (cfg_.validate_input) {
    for (std::size_t i = 0; i < kInputDim; ++i) {
      if (!std::isfinite(in[i])) return fail(Status::kInputMissing);
      if (cfg_.force_timeout) return fail(Status::kTimeout);
      if (in[i] < -kAbsInputLimit || in[i] > kAbsInputLimit) return fail(Status::kInputOutOfRange);
    }
  }
  double t0 = now_ms();
  if (cfg_.sleep_override_us > 0) std::this_thread::sleep_for(std::chrono::microseconds(cfg_.sleep_override_us));
  float raw = 0.0f;
  Status st = forward_impl(in, &raw);
  if (cfg_.nan_output) raw = std::numeric_limits<float>::quiet_NaN();
  if (cfg_.force_alloc) { volatile float* leak = new float[8]; leak[0] = raw; raw += leak[0] * 0.0f; delete[] leak; }
  double dt = now_ms() - t0;

  if (st == Status::kOk && cfg_.validate_output && !output_plausible(raw)) {
    last_status_ = Status::kOutputInvalid;
  } else if (st == Status::kOk) {
    last_status_ = Status::kOk;
    *out = raw;
  }
  ++cycles_;
  record(static_cast<float>(dt));
  if (dt > static_cast<double>(cfg_.latency_budget_ms)) ++stats_.deadline_misses;
  if (last_status_ != Status::kOk) {
    ++fallback_count_;
    *out = cfg_.fallback_output;  // deterministic fallback
    return last_status_;
  }
  return last_status_;
}

}  // namespace rteai