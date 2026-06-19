/**
 * AI DJ Internet Radio - Implementazione gestione display
 */

#include "DisplayManager.h"
#include <Wire.h>

DisplayManager::DisplayManager() 
    : display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1), displayInitialized(false) {
}

void DisplayManager::begin() {
    Wire.begin(I2C_SDA, I2C_SCL);
    
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
        Serial.println("[Display] Errore inizializzazione!");
        displayInitialized = false;
        return;
    }
    
    displayInitialized = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("AI DJ Radio");
    display.display();
}

void DisplayManager::showStation(const String& name, const String& track) {
    if (!displayInitialized) return;
    
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Stazione:");
    display.setTextSize(2);
    display.println(name.substring(0, min(name.length(), (size_t)16)));
    display.setTextSize(1);
    
    if (track.length() > 0) {
        display.println("Track:");
        display.println(track.substring(0, min(track.length(), (size_t)16)));
    }
}

void DisplayManager::showVolume(int volume) {
    if (!displayInitialized) return;
    
    display.setCursor(0, 56);
    display.print("Vol: ");
    display.print(volume);
    display.print("% ");
}

void DisplayManager::showWifiStatus(bool connected, const String& ip) {
    if (!displayInitialized) return;
    
    display.setCursor(64, 56);
    if (connected) {
        display.print("WiFi OK");
    } else {
        display.print("WiFi --");
    }
}

void DisplayManager::showTime(const String& time, const String& date) {
    if (!displayInitialized) return;
    
    display.setCursor(0, 0);
    display.println(time);
}

void DisplayManager::showDjMessage(const String& text, const String& color) {
    if (!displayInitialized) return;
    
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.println("DJ:");
    display.setTextSize(1);
    
    // Suddividi il testo in righe per il display
    int y = 20;
    for (int i = 0; i < text.length() && y < 56; i += 21) {
        String line = text.substring(i, min(i + 21, (int)text.length()));
        display.setCursor(0, y);
        display.println(line);
        y += 10;
    }
}

void DisplayManager::showError(const String& message) {
    if (!displayInitialized) return;
    
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.println("ERRORE:");
    display.println(message.substring(0, min(message.length(), (size_t)32)));
}

void DisplayManager::update() {
    if (displayInitialized) {
        display.display();
    }
}

void DisplayManager::clear() {
    if (displayInitialized) {
        display.clearDisplay();
    }
}