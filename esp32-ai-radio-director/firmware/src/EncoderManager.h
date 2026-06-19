/**
 * ESP32 AI Radio Station Director - Encoder Manager
 * Gestione encoder rotativo con pulsante
 */

#ifndef ENCODER_MANAGER_H
#define ENCODER_MANAGER_H

#include <Arduino.h>
#include "Config.h"

typedef void (*EncoderCallback)();

class EncoderManager {
private:
    int pinA, pinB, pinSw;
    int lastA, lastB;
    int position;
    unsigned long lastDebounce;
    const int debounceMs = 50;
    
    EncoderCallback onLeft;
    EncoderCallback onRight;
    EncoderCallback onClick;
    EncoderCallback onLongPress;

public:
    EncoderManager(int a, int b, int sw);
    
    void begin();
    void update();
    
    void setOnLeft(EncoderCallback cb) { onLeft = cb; }
    void setOnRight(EncoderCallback cb) { onRight = cb; }
    void setOnClick(EncoderCallback cb) { onClick = cb; }
    void setOnLongPress(EncoderCallback cb) { onLongPress = cb; }
    
    int getPosition() const { return position; }
    void resetPosition() { position = 0; }
};

#endif