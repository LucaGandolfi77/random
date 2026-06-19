/**
 * ESP32 AI Radio Station Director - API Client
 * Comunica con il backend senza esporre API key
 */

#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "Config.h"

struct ScheduleItem {
    String type;
    String id;
    String title;
    int duration;
};

struct RadioStatus {
    bool online;
    String currentShow;
    String currentItem;
    String nextItem;
    int listeners;
    String streamUrl;
};

struct DjSpeakResponse {
    String text;
    String tone;
    bool ttsRecommended;
    String ledColor;
};

class ApiClient {
private:
    String baseUrl;
    String token;

public:
    ApiClient();
    
    void setBaseUrl(const String& url) { baseUrl = url; }
    void setToken(const String& t) { token = t; }
    
    // Richiedi palinsesto
    bool getSchedule(JsonDocument& schedule);
    
    // Richiedi prossimo contenuto
    bool getNextItem(JsonDocument& item);
    
    // Richiedi intervento DJ
    DjSpeakResponse getDjSpeak(const String& event, const String& show, 
                              const String& currentItem, const String& nextItem,
                              const String& mood);
    
    // Invia comando
    bool sendCommand(const String& command);
    
    // Ottieni stato radio
    RadioStatus getStatus();
    
    // Feedback like/dislike
    bool sendFeedback(const String& itemId, const String& feedback);
};

#endif