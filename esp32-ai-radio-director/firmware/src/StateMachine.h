/**
 * ESP32 AI Radio Station Director - State Machine
 * Gestisce stati della radio e transizioni
 */

#ifndef STATE_MACHINE_H
#define STATE_MACHINE_H

#include "Config.h"

class RadioBrain {
private:
    RadioState currentState;
    RadioMode currentMode;
    String stationName;
    String currentShow;
    String currentItem;
    String nextItem;
    int volume;
    String streamUrl;
    int listeners;
    bool online;
    
    // Taste profile - memoria editoriale
    struct TasteProfile {
        int jazzAffinity;
        int electronicAffinity;
        int ambientAffinity;
        int lofiAffinity;
        int synthwaveAffinity;
    } taste;
    
    // Energy curve giornaliera
    struct EnergyCurve {
        int morningEnergy;   // 07:00-12:00
        int afternoonEnergy; // 12:00-18:00
        int eveningEnergy;   // 18:00-24:00
        int nightEnergy;     // 24:00-07:00
    } energy;

public:
    RadioBrain();
    
    void setState(RadioState state);
    RadioState getState() const { return currentState; }
    
    void setMode(RadioMode mode);
    RadioMode getMode() const { return currentMode; }
    
    void setStationInfo(const String& name, const String& show, const String& item);
    void setNextItem(const String& item) { nextItem = item; }
    
    void setVolume(int vol);
    int getVolume() const { return volume; }
    
    void setStreamStatus(bool isOnline, const String& url, int listenerCount);
    
    // Taste profile management
    void updateTaste(const String& genre, int feedback); // +1 like, -1 dislike
    String getPreferredGenres();
    
    // Energy curve
    int getCurrentEnergyLevel();
    void updateEnergyCurve();
    
    // Serializzazione per debug
    String toJson();
};

#endif