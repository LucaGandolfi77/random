/**
 * ESP32 AI Radio Station Director - Firmware principale
 * Direttore artistico AI per radio online
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>
#include "Config.h"
#include "StateMachine.h"
#include "DisplayManager.h"
#include "EncoderManager.h"
#include "LedMood.h"
#include "ApiClient.h"

// Istanze componenti
RadioBrain radioBrain;
DisplayManager display;
EncoderManager encoder(ENCODER_A, ENCODER_B, ENCODER_SW);
LedMood ledMood(LED_PIN, LED_COUNT);
ApiClient api;
Preferences prefs;

// Timing
unsigned long lastPoll = 0;
unsigned long lastDjSpeak = 0;

// Callback encoder
void onVolumeUp() {
    int vol = radioBrain.getVolume() + 5;
    radioBrain.setVolume(vol);
    prefs.putInt("volume", vol);
}

void onVolumeDown() {
    int vol = radioBrain.getVolume() - 5;
    radioBrain.setVolume(vol);
    prefs.putInt("volume", vol);
}

void onEncoderClick() {
    // Cambia modalità
    RadioMode newMode = (RadioMode)((radioBrain.getMode() + 1) % 7);
    radioBrain.setMode(newMode);
    display.showMode(newMode);
}

void onSkip() {
    api.sendCommand("skip");
}

void onLike() {
    api.sendCommand("like");
}

void onDislike() {
    api.sendCommand("dislike");
}

void onEmergency() {
    radioBrain.setMode(MODE_EMERGENCY_CALM);
    api.sendCommand("emergency_calm");
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n=== ESP32 AI Radio Station Director ===");
    
    // Preferences
    prefs.begin("radio", false);
    int savedVolume = prefs.getInt("volume", VOLUME_DEFAULT);
    radioBrain.setVolume(savedVolume);
    
    // WiFi
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    // Componenti
    display.begin();
    encoder.begin();
    ledMood.begin();
    
    // Encoder callbacks
    encoder.setOnRight(onVolumeUp);
    encoder.setOnLeft(onVolumeDown);
    encoder.setOnClick(onEncoderClick);
    
    // Pulsanti
    pinMode(BTN_SKIP, INPUT_PULLUP);
    pinMode(BTN_LIKE, INPUT_PULLUP);
    pinMode(BTN_DISLIKE, INPUT_PULLUP);
    pinMode(BTN_EMERGENCY, INPUT_PULLUP);
    
    // Stato iniziale
    radioBrain.setState(STATE_CONNECTING);
    ledMood.setConnecting();
    display.showStatus("Connecting WiFi...", TFT_YELLOW);
}

void loop() {
    // Aggiorna WiFi
    if (WiFi.status() == WL_CONNECTED) {
        if (radioBrain.getState() == STATE_CONNECTING) {
            radioBrain.setState(STATE_IDLE);
            ledMood.setIdle();
        }
    } else {
        if (millis() % 5000 == 0) {
            WiFi.reconnect();
        }
    }
    
    // Polling backend
    if (millis() - lastPoll > POLL_INTERVAL) {
        lastPoll = millis();
        
        RadioStatus status = api.getStatus();
        radioBrain.setStreamStatus(status.online, status.streamUrl, status.listeners);
        
        if (status.online) {
            radioBrain.setStationInfo("Radio Gandolfi", status.currentShow, status.currentItem);
            radioBrain.setNextItem(status.nextItem);
            
            display.showMainScreen(
                "Radio Gandolfi",
                status.currentShow,
                status.currentItem,
                status.nextItem,
                radioBrain.getVolume(),
                status.listeners,
                true
            );
        }
    }
    
    // DJ speak periodico
    if (millis() - lastDjSpeak > DJ_SPEAK_INTERVAL) {
        lastDjSpeak = millis();
        
        DjSpeakResponse dj = api.getDjSpeak(
            "periodic",
            radioBrain.getMode() == MODE_AUTO_DJ ? "Auto DJ" : "Curated",
            "Current Track",
            "Next Track",
            "calm"
        );
        
        display.showDjMessage(dj.text, dj.ledColor);
        ledMood.setMood(dj.tone, dj.ledColor);
    }
    
    // Pulsanti
    if (digitalRead(BTN_SKIP) == LOW) {
        onSkip();
        delay(200);
    }
    if (digitalRead(BTN_LIKE) == LOW) {
        onLike();
        delay(200);
    }
    if (digitalRead(BTN_DISLIKE) == LOW) {
        onDislike();
        delay(200);
    }
    if (digitalRead(BTN_EMERGENCY) == LOW) {
        onEmergency();
        delay(200);
    }
    
    // Encoder
    encoder.update();
    
    delay(50);
}