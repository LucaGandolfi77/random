/**
 * ESP32 AI Radio Station Director - Encoder Manager Implementation
 */

#include "EncoderManager.h"

EncoderManager::EncoderManager(int a, int b, int sw) 
    : pinA(a), pinB(b), pinSw(sw), lastA(HIGH), lastB(HIGH), position(0),
      lastDebounce(0), onLeft(nullptr), onRight(nullptr), onClick(nullptr), onLongPress(nullptr) {
}

void EncoderManager::begin() {
    pinMode(pinA, INPUT_PULLUP);
    pinMode(pinB, INPUT_PULLUP);
    pinMode(pinSw, INPUT_PULLUP);
    
    lastA = digitalRead(pinA);
    lastB = digitalRead(pinB);
}

void EncoderManager::update() {
    int aReading = digitalRead(pinA);
    int bReading = digitalRead(pinB);
    
    // Rileva rotazione
    if (aReading != lastA) {
        if (aReading == LOW) {
            if (bReading == LOW) {
                position--;
                if (onLeft) onLeft();
            } else {
                position++;
                if (onRight) onRight();
            }
        }
        lastA = aReading;
    }
    
    // Rileva click
    if (digitalRead(pinSw) == LOW) {
        unsigned long now = millis();
        if (now - lastDebounce > debounceMs) {
            lastDebounce = now;
            if (onClick) onClick();
        }
        delay(50);
    }
}