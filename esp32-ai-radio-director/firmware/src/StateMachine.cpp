/**
 * ESP32 AI Radio Station Director - State Machine Implementation
 */

#include "StateMachine.h"

RadioBrain::RadioBrain() 
    : currentState(STATE_CONNECTING), currentMode(MODE_AUTO_DJ),
      volume(VOLUME_DEFAULT), listeners(0), online(false) {
    
    // Inizializza taste profile
    taste.jazzAffinity = 50;
    taste.electronicAffinity = 50;
    taste.ambientAffinity = 50;
    taste.lofiAffinity = 50;
    taste.synthwaveAffinity = 50;
    
    // Energy curve predefinita
    energy.morningEnergy = 60;
    energy.afternoonEnergy = 80;
    energy.eveningEnergy = 70;
    energy.nightEnergy = 30;
}

void RadioBrain::setState(RadioState state) {
    currentState = state;
    Serial.printf("[State] Nuovo stato: %d\n", state);
}

void RadioBrain::setMode(RadioMode mode) {
    currentMode = mode;
    Serial.printf("[Mode] Nuova modalità: %d\n", mode);
}

void RadioBrain::setStationInfo(const String& name, const String& show, const String& item) {
    stationName = name;
    currentShow = show;
    currentItem = item;
}

void RadioBrain::setVolume(int vol) {
    volume = constrain(vol, VOLUME_MIN, VOLUME_MAX);
}

void RadioBrain::setStreamStatus(bool isOnline, const String& url, int listenerCount) {
    online = isOnline;
    streamUrl = url;
    listeners = listenerCount;
}

void RadioBrain::updateTaste(const String& genre, int feedback) {
    if (genre == "jazz") taste.jazzAffinity = constrain(taste.jazzAffinity + feedback, 0, 100);
    else if (genre == "electronic") taste.electronicAffinity = constrain(taste.electronicAffinity + feedback, 0, 100);
    else if (genre == "ambient") taste.ambientAffinity = constrain(taste.ambientAffinity + feedback, 0, 100);
    else if (genre == "lofi") taste.lofiAffinity = constrain(taste.lofiAffinity + feedback, 0, 100);
    else if (genre == "synthwave") taste.synthwaveAffinity = constrain(taste.synthwaveAffinity + feedback, 0, 100);
}

String RadioBrain::getPreferredGenres() {
    String result = "[]";
    // Restituisce generi preferiti in base al taste profile
    return result;
}

int RadioBrain::getCurrentEnergyLevel() {
    // Determina energia in base all'ora
    return energy.morningEnergy;  // Placeholder
}

void RadioBrain::updateEnergyCurve() {
    // Aggiorna energia in base a feedback e ora
}

String RadioBrain::toJson() {
    String json = "{";
    json += "\"state\":" + String(currentState) + ",";
    json += "\"mode\":" + String(currentMode) + ",";
    json += "\"station\":\"" + stationName + "\",";
    json += "\"show\":\"" + currentShow + "\",";
    json += "\"item\":\"" + currentItem + "\"";
    json += "}";
    return json;
}