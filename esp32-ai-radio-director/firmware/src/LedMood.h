/**
 * ESP32 AI Radio Station Director - LED Mood Manager
 * WS2812B per feedback visivo stato radio
 */

#ifndef LED_MOOD_H
#define LED_MOOD_H

#include <Arduino.h>
#include "Config.h"

class LedMood {
private:
    int pin;
    int count;
    
public:
    LedMood(int gpio, int numLeds);
    
    void begin();
    
    // Imposta colore in base al mood
    void setMood(const String& mood, const String& colorHex);
    
    // Stati specifici
    void setPlaying();
    void setSpeaking();
    void setError();
    void setConnecting();
    void setIdle();
    
    // Utility
    void setColor(uint32_t color);
    void off();
};

#endif