/**
 * AI DJ Internet Radio - Firmware principale
 * ESP32/ESP32-S3 con streaming radio e commenti AI
 */

#include <Arduino.h>
#include <Preferences.h>
#include "config.h"
#include "stations.h"
#include "WifiManagerCustom.h"
#include "DisplayManager.h"
#include "AudioManager.h"
#include "EncoderManager.h"
#include "AiDjClient.h"

// Istanze componenti
WifiManagerCustom wifiManager;
DisplayManager displayManager;
AudioManager audioManager;
EncoderManager encoder(ENCODER_CLK, ENCODER_DT, ENCODER_SW);
AiDjClient aiClient;

// Preferences per salvataggio configurazione
Preferences preferences;

// Stato applicazione
int currentStationIndex = 0;
int volume = VOLUME_DEFAULT;
AppMode currentMode = MODE_MORNING;
unsigned long lastDjComment = 0;
bool ttsPlayed = false;

// ============================================
// Callback encoder
// ============================================
void onVolumeUp() {
    volume = min(volume + 5, VOLUME_MAX);
    audioManager.setVolume(volume);
    preferences.putInt("volume", volume);
    Serial.println("[Encoder] Volume: " + String(volume));
}

void onVolumeDown() {
    volume = max(volume - 5, VOLUME_MIN);
    audioManager.setVolume(volume);
    preferences.putInt("volume", volume);
    Serial.println("[Encoder] Volume: " + String(volume));
}

void onStationChange() {
    // Cambio stazione con pulsante
    currentStationIndex = (currentStationIndex + 1) % stationCount;
    preferences.putInt("station", currentStationIndex);
    
    // Ferma stream corrente e avvia nuovo
    audioManager.stop();
    delay(100);
    
    String url = radioStations[currentStationIndex].url;
    audioManager.playStream(url);
    
    // Mostra intro DJ
    String modeStr;
    switch (currentMode) {
        case MODE_MORNING: modeStr = "morning"; break;
        case MODE_FOCUS: modeStr = "focus"; break;
        case MODE_RELAX: modeStr = "relax"; break;
        case MODE_EVENING: modeStr = "evening"; break;
        case MODE_NIGHT: modeStr = "night"; break;
    }
    
    DjComment comment = aiClient.getComment(
        wifiManager.getCurrentTime(),
        radioStations[currentStationIndex].name,
        radioStations[currentStationIndex].genre,
        modeStr,
        "sunny",  // Weather placeholder
        "Milan",  // City placeholder
        "station_change"
    );
    
    displayManager.showDjMessage(comment.text, comment.color);
    displayManager.update();
    
    if (comment.ttsRecommended && !ttsPlayed) {
        String ttsUrl = aiClient.getTts(comment.text);
        if (ttsUrl.length() > 0) {
            audioManager.playTts(ttsUrl);
            ttsPlayed = true;
        }
    }
}

// ============================================
// Setup
// ============================================
void setup() {
    Serial.begin(115200);
    Serial.println("\n=== AI DJ Internet Radio ===");
    
    // Inizializza preferences
    preferences.begin("radio-config", false);
    volume = preferences.getInt("volume", VOLUME_DEFAULT);
    currentStationIndex = preferences.getInt("station", 0);
    
    // Inizializza componenti
    wifiManager.begin(WIFI_SSID, WIFI_PASSWORD);
    displayManager.begin();
    audioManager.begin();
    audioManager.setVolume(volume);
    
    // Configura encoder
    encoder.begin();
    encoder.setOnRotateRight(onVolumeUp);
    encoder.setOnRotateLeft(onVolumeDown);
    encoder.setOnPress(onStationChange);
    
    // Messaggio di benvenuto
    displayManager.showDjMessage("Avvio AI DJ Radio...");
    displayManager.update();
    
    delay(2000);
}

// ============================================
// Loop principale
// ============================================
void loop() {
    // Aggiorna WiFi
    wifiManager.update();
    
    // Aggiorna encoder
    encoder.update();
    
    // Aggiorna audio
    audioManager.loop();
    
    // Aggiorna display
    displayManager.showStation(radioStations[currentStationIndex].name);
    displayManager.showVolume(volume);
    displayManager.showWifiStatus(wifiManager.isConnected(), wifiManager.getIP());
    displayManager.showTime(wifiManager.getCurrentTime(), wifiManager.getCurrentDate());
    displayManager.update();
    
    // Genera commento DJ periodico
    unsigned long now = millis();
    if (now - lastDjComment > DJ_COMMENT_INTERVAL) {
        lastDjComment = now;
        
        String modeStr;
        switch (currentMode) {
            case MODE_MORNING: modeStr = "morning"; break;
            case MODE_FOCUS: modeStr = "focus"; break;
            case MODE_RELAX: modeStr = "relax"; break;
            case MODE_EVENING: modeStr = "evening"; break;
            case MODE_NIGHT: modeStr = "night"; break;
        }
        
        DjComment comment = aiClient.getComment(
            wifiManager.getCurrentTime(),
            radioStations[currentStationIndex].name,
            radioStations[currentStationIndex].genre,
            modeStr,
            "sunny",
            "Milan",
            "periodic"
        );
        
        displayManager.showDjMessage(comment.text, comment.color);
        displayManager.update();
    }
    
    delay(100);
}