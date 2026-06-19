/**
 * AI DJ Internet Radio - Gestione audio streaming
 * Riproduce stream MP3/AAC tramite I2S
 */

#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

#include <Arduino.h>
#include "Audio.h"
#include "config.h"

class AudioManager {
private:
    Audio audio;
    int currentVolume;
    bool isPlaying;
    String currentUrl;
    
public:
    AudioManager();
    
    /**
     * Inizializza l'audio
     */
    void begin();
    
    /**
     * Riproduce uno stream
     */
    bool playStream(const String& url);
    
    /**
     * Ferma la riproduzione
     */
    void stop();
    
    /**
     * Imposta il volume (0-100)
     */
    void setVolume(int volume);
    
    /**
     * Ottiene il volume corrente
     */
    int getVolume() const { return currentVolume; }
    
    /**
     * Verifica se sta riproducendo
     */
    bool isPlayingStream() const { return isPlaying; }
    
    /**
     * Riproduce file TTS temporaneo
     */
    void playTts(const String& url);
    
    /**
     * Loop audio (da chiamare nel main loop)
     */
    void loop();
};

#endif