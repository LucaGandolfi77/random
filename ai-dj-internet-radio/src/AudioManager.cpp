/**
 * AI DJ Internet Radio - Implementazione gestione audio
 */

#include "AudioManager.h"

AudioManager::AudioManager() 
    : currentVolume(VOLUME_DEFAULT), isPlaying(false) {
}

void AudioManager::begin() {
    audio.setVolume(currentVolume);
    audio.setBalance(0);  // Bilanciamento centrale
    Serial.println("[Audio] Inizializzato");
}

bool AudioManager::playStream(const String& url) {
    if (url.length() == 0) {
        Serial.println("[Audio] URL vuoto!");
        return false;
    }
    
    Serial.println("[Audio] Connessione stream: " + url);
    
    if (audio.connecttohost(url.c_str())) {
        currentUrl = url;
        isPlaying = true;
        Serial.println("[Audio] Stream connesso");
        return true;
    }
    
    Serial.println("[Audio] Errore connessione stream");
    isPlaying = false;
    return false;
}

void AudioManager::stop() {
    audio.stop();
    isPlaying = false;
    Serial.println("[Audio] Stop");
}

void AudioManager::setVolume(int volume) {
    currentVolume = constrain(volume, VOLUME_MIN, VOLUME_MAX);
    audio.setVolume(currentVolume);
}

void AudioManager::playTts(const String& url) {
    Serial.println("[Audio] Riproduco TTS: " + url);
    // Riproduce il file TTS, poi ritorna allo stream
    audio.connecttohost(url.c_str());
}

void AudioManager::loop() {
    audio.loop();
}