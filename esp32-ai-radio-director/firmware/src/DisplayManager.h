/**
 * ESP32 AI Radio Station Director - Display Manager
 * TFT ST7789 con informazioni radio
 */

#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <TFT_eSPI.h>
#include <SPI.h>
#include "Config.h"

class DisplayManager {
private:
    TFT_eSPI tft;
    bool initialized;
    
public:
    DisplayManager();
    
    void begin();
    
    // Visualizzazione principale
    void showMainScreen(const String& stationName, const String& showName,
                       const String& currentItem, const String& nextItem,
                       int volume, int listeners, bool online);
    
    // Visualizzazione messaggi DJ
    void showDjMessage(const String& text, const String& colorHex);
    
    // Visualizzazione stato
    void showStatus(const String& status, uint16_t color);
    
    // Visualizzazione errore
    void showError(const String& error);
    
    // Visualizzazione modalità
    void showMode(RadioMode mode);
    
    // Utility
    void clear();
    void update();
    uint16_t hexToRgb565(const String& hex);
};

#endif