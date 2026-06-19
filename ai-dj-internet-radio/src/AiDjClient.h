/**
 * AI DJ Internet Radio - Client per server AI intermedio
 * Richiede commenti DJ e TTS
 */

#ifndef AI_DJ_CLIENT_H
#define AI_DJ_CLIENT_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"

// Struttura per il commento DJ
struct DjComment {
    String text;
    String mood;
    String color;
    bool ttsRecommended;
};

class AiDjClient {
private:
    String serverUrl;
    
public:
    AiDjClient();
    
    /**
     * Imposta l'URL del server
     */
    void setServerUrl(const String& url);
    
    /**
     * Richiede un commento DJ al server
     */
    DjComment getComment(const String& time, const String& stationName, 
                        const String& genre, const String& mode,
                        const String& weather, const String& city,
                        const String& event);
    
    /**
     * Richiede TTS al server
     */
    String getTts(const String& text);
    
    /**
     * Verifica se il server è raggiungibile
     */
    bool isServerAvailable();
};

#endif