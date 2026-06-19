/**
 * ESP32 AI Radio Station Director - Display Manager Implementation
 */

#include "DisplayManager.h"

DisplayManager::DisplayManager() : initialized(false) {
}

void DisplayManager::begin() {
    tft.init();
    tft.setRotation(1);  // Ruota display
    tft.fillScreen(TFT_BLACK);
    initialized = true;
    
    tft.setTextSize(2);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setCursor(20, 50);
    tft.println("AI Radio");
    tft.setTextSize(1);
    tft.setCursor(30, 80);
    tft.println("Initializing...");
}

void DisplayManager::showMainScreen(const String& stationName, const String& showName,
                                   const String& currentItem, const String& nextItem,
                                   int volume, int listeners, bool online) {
    if (!initialized) return;
    
    tft.fillScreen(TFT_BLACK);
    
    // Header - nome stazione
    tft.setTextSize(2);
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.setCursor(10, 5);
    tft.print(stationName.substring(0, min(stationName.length(), (size_t)16)));
    
    // Show corrente
    tft.setTextSize(1);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.setCursor(10, 30);
    tft.print("Show: ");
    tft.print(showName.substring(0, min(showName.length(), (size_t)14)));
    
    // Item corrente
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setCursor(10, 50);
    tft.print("Now: ");
    tft.println(currentItem.substring(0, min(currentItem.length(), (size_t)16)));
    
    // Prossimo item
    tft.setCursor(10, 70);
    tft.print("Next: ");
    tft.println(nextItem.substring(0, min(nextItem.length(), (size_t)16)));
    
    // Status bar
    tft.drawFastHLine(0, 90, 240, TFT_GRAY);
    
    // Volume e listeners
    tft.setCursor(10, 100);
    tft.setTextColor(TFT_GREEN, TFT_BLACK);
    tft.print("Vol: ");
    tft.print(volume);
    tft.print("%  ");
    
    tft.setTextColor(online ? TFT_BLUE : TFT_RED, TFT_BLACK);
    tft.print(online ? "LIVE" : "OFF");
    tft.print(" ");
    tft.print(listeners);
    tft.print(" lis");
}

void DisplayManager::showDjMessage(const String& text, const String& colorHex) {
    if (!initialized) return;
    
    tft.fillScreen(TFT_BLACK);
    
    tft.setTextSize(2);
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.setCursor(10, 10);
    tft.println("AI DJ:");
    
    tft.setTextSize(1);
    tft.setTextColor(hexToRgb565(colorHex), TFT_BLACK);
    
    // Suddividi testo in righe
    int y = 35;
    for (int i = 0; i < text.length() && y < 200; i += 20) {
        String line = text.substring(i, min(i + 20, (int)text.length()));
        tft.setCursor(10, y);
        tft.println(line);
        y += 15;
    }
}

void DisplayManager::showStatus(const String& status, uint16_t color) {
    if (!initialized) return;
    
    tft.setTextSize(1);
    tft.setTextColor(color, TFT_BLACK);
    tft.setCursor(10, 110);
    tft.println(status);
}

void DisplayManager::showError(const String& error) {
    if (!initialized) return;
    
    tft.fillScreen(TFT_BLACK);
    tft.setTextSize(2);
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.setCursor(20, 50);
    tft.println("ERROR");
    
    tft.setTextSize(1);
    tft.setCursor(10, 80);
    tft.println(error.substring(0, min(error.length(), (size_t)30)));
}

void DisplayManager::showMode(RadioMode mode) {
    if (!initialized) return;
    
    const char* modeNames[] = {
        "Auto DJ", "Curator", "Focus", "Night", "City", "Serendipity", "Emergency"
    };
    
    tft.setTextSize(1);
    tft.setTextColor(TFT_MAGENTA, TFT_BLACK);
    tft.setCursor(10, 120);
    tft.print("Mode: ");
    tft.print(modeNames[mode]);
}

void DisplayManager::clear() {
    if (initialized) tft.fillScreen(TFT_BLACK);
}

void DisplayManager::update() {
    // TFT aggiorna automaticamente
}

uint16_t DisplayManager::hexToRgb565(const String& hex) {
    // Converte #RRGGBB in RGB565
    if (hex.length() < 7) return TFT_WHITE;
    
    long r = strtol(hex.substring(1, 3).c_str(), NULL, 16);
    long g = strtol(hex.substring(3, 5).c_str(), NULL, 16);
    long b = strtol(hex.substring(5, 7).c_str(), NULL, 16);
    
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}