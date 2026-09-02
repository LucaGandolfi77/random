#pragma once
#include <array>
#include <cstddef>
#include <cstdint>
#include <string>
namespace rteai {
std::array<uint8_t, 32> sha256(const uint8_t* data, size_t len);
inline std::string sha256_hex(const uint8_t* data, size_t len) {
  auto d = sha256(data, len);
  const char* hex = "0123456789abcdef";
  std::string out; out.reserve(64);
  for (uint8_t b : d) { out += hex[b >> 4]; out += hex[b & 0xF]; }
  return out;
}
}  // namespace rteai
