/**
 * AI DJ Internet Radio - Gestione display OLED/TFT
 * Visualizza informazioni radio, volume, ora e messaggi DJ
 */

#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "config.h"

class DisplayManager {
private:
    Adafruit_SSD1306 display;
    bool displayInitialized;
    
public:
    DisplayManager();
    
    /**
     * Inizializza il display
     */
    void begin();
    
    /**
     * Mostra informazioni stazione
     */
    void showStation(const String& name, const String& track = "");
    
    /**
     * Mostra volume
     */
    void showVolume(int volume);
    
    /**
     * Mostra stato WiFi
     */
    void showWifiStatus(bool connected, const String& ip = "");
    
    /**
     * Mostra ora e data
     */
    void showTime(const String& time, const String& date);
    
    /**
     * Mostra messaggio DJ
     */
    void showDjMessage(const String& text, const String& color = "#ffffff");
    
    /**
     * Mostra errore
     */
    void showError(const String& message);
    
    /**
     * Aggiorna display completo
     */
    void update();
    
    /**
     * Pulisce il display
     */
    void clear();
};

#endif