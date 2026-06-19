/**
 * ESP32 AI Radio Station Director - LED Mood Implementation
 */

#include "LedMood.h"

#if LED_COUNT > 0
#include <Adafruit_NeoPixel.h>
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
#endif

LedMood::LedMood(int gpio, int numLeds) : pin(gpio), count(numLeds) {
}

void LedMood::begin() {
#if LED_COUNT > 0
    strip.begin();
    strip.show();  // Spegni tutti
#endif
}

void LedMood::setMood(const String& mood, const String& colorHex) {
#if LED_COUNT > 0
    uint32_t color = strip.Color(
        strtol(colorHex.substring(1, 3).c_str(), NULL, 16),
        strtol(colorHex.substring(3, 5).c_str(), NULL, 16),
        strtol(colorHex.substring(5, 7).c_str(), NULL, 16)
    );
    setColor(color);
#endif
}

void LedMood::setPlaying() {
#if LED_COUNT > 0
    setColor(strip.Color(0, 128, 255));  // Blu brillante
#endif
}

void LedMood::setSpeaking() {
#if LED_COUNT > 0
    setColor(strip.Color(255, 170, 68));  // Arancione
#endif
}

void LedMood::setError() {
#if LED_COUNT > 0
    setColor(strip.Color(255, 0, 0));  // Rosso
#endif
}

void LedMood::setConnecting() {
#if LED_COUNT > 0
    setColor(strip.Color(128, 128, 128));  // Grigio lampeggiante
#endif
}

void LedMood::setIdle() {
#if LED_COUNT > 0
    setColor(strip.Color(64, 64, 64));  // Grigio scuro
#endif
}

void LedMood::setColor(uint32_t color) {
#if LED_COUNT > 0
    for (int i = 0; i < count; i++) {
        strip.setPixelColor(i, color);
    }
    strip.show();
#endif
}

void LedMood::off() {
#if LED_COUNT > 0
    strip.clear();
    strip.show();
#endif
}