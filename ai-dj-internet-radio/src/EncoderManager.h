/**
 * AI DJ Internet Radio - Gestione encoder rotativo
 * Controllo volume e cambio stazione
 */

#ifndef ENCODER_MANAGER_H
#define ENCODER_MANAGER_H

#include <Arduino.h>
#include "config.h"

// Callback per eventi encoder
typedef void (*EncoderCallback)();

class EncoderManager {
private:
    int pinClk;
    int pinDt;
    int pinSw;
    
    int lastClk;
    int lastDt;
    int currentPosition;
    
    unsigned long lastDebounceTime;
    const int debounceDelay = 50;
    
    EncoderCallback onRotateLeft;
    EncoderCallback onRotateRight;
    EncoderCallback onPress;
    
public:
    EncoderManager(int clk, int dt, int sw);
    
    /**
     * Inizializza l'encoder
     */
    void begin();
    
    /**
     * Imposta callback per rotazione sinistra
     */
    void setOnRotateLeft(EncoderCallback callback);
    
    /**
     * Imposta callback per rotazione destra
     */
    void setOnRotateRight(EncoderCallback callback);
    
    /**
     * Imposta callback per pressione pulsante
     */
    void setOnPress(EncoderCallback callback);
    
    /**
     * Aggiorna lo stato dell'encoder (da chiamare nel loop)
     */
    void update();
    
    /**
     * Ottiene la posizione corrente
     */
    int getPosition() const { return currentPosition; }
    
    /**
     * Resetta la posizione
     */
    void resetPosition();
};

#endif