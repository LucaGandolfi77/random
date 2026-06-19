/**
 * AI DJ Internet Radio - Implementazione gestione encoder
 */

#include "EncoderManager.h"

EncoderManager::EncoderManager(int clk, int dt, int sw) 
    : pinClk(clk), pinDt(dt), pinSw(sw), 
      lastClk(HIGH), lastDt(HIGH), currentPosition(0),
      lastDebounceTime(0),
      onRotateLeft(nullptr), onRotateRight(nullptr), onPress(nullptr) {
}

void EncoderManager::begin() {
    pinMode(pinClk, INPUT_PULLUP);
    pinMode(pinDt, INPUT_PULLUP);
    pinMode(pinSw, INPUT_PULLUP);
    
    lastClk = digitalRead(pinClk);
    lastDt = digitalRead(pinDt);
    
    Serial.println("[Encoder] Inizializzato");
}

void EncoderManager::setOnRotateLeft(EncoderCallback callback) {
    onRotateLeft = callback;
}

void EncoderManager::setOnRotateRight(EncoderCallback callback) {
    onRotateRight = callback;
}

void EncoderManager::setOnPress(EncoderCallback callback) {
    onPress = callback;
}

void EncoderManager::update() {
    int clkReading = digitalRead(pinClk);
    int dtReading = digitalRead(pinDt);
    
    // Rileva rotazione
    if (clkReading != lastClk) {
        if (clkReading == LOW) {
            if (dtReading == LOW) {
                currentPosition--;
                if (onRotateLeft) onRotateLeft();
            } else {
                currentPosition++;
                if (onRotateRight) onRotateRight();
            }
        }
        lastClk = clkReading;
    }
    
    // Rileva pressione pulsante
    if (digitalRead(pinSw) == LOW) {
        unsigned long now = millis();
        if (now - lastDebounceTime > debounceDelay) {
            lastDebounceTime = now;
            if (onPress) onPress();
        }
        delay(50);  // Debounce aggiuntivo
    }
}

void EncoderManager::resetPosition() {
    currentPosition = 0;
}