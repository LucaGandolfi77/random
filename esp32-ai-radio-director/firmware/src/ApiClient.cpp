/**
 * ESP32 AI Radio Station Director - API Client Implementation
 */

#include "ApiClient.h"

ApiClient::ApiClient() : baseUrl(BACKEND_URL), token(BACKEND_TOKEN) {
}

bool ApiClient::getSchedule(JsonDocument& schedule) {
    if (WiFi.status() != WL_CONNECTED) return false;
    
    HTTPClient http;
    String url = baseUrl + "/api/schedule/generate";
    http.begin(url);
    http.addHeader("Authorization", "Bearer " + token);
    http.setTimeout(HTTP_TIMEOUT);
    
    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        DeserializationError err = deserializeJson(schedule, payload);
        http.end();
        return !err;
    }
    
    http.end();
    return false;
}

bool ApiClient::getNextItem(JsonDocument& item) {
    if (WiFi.status() != WL_CONNECTED) return false;
    
    HTTPClient http;
    String url = baseUrl + "/api/playlist/next";
    http.begin(url);
    http.addHeader("Authorization", "Bearer " + token);
    http.setTimeout(HTTP_TIMEOUT);
    
    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        DeserializationError err = deserializeJson(item, payload);
        http.end();
        return !err;
    }
    
    http.end();
    return false;
}

DjSpeakResponse ApiClient::getDjSpeak(const String& event, const String& show,
                                    const String& currentItem, const String& nextItem,
                                    const String& mood) {
    DjSpeakResponse response;
    response.text = "Buona musica!";
    response.tone = "neutral";
    response.ttsRecommended = false;
    response.ledColor = "#ffffff";
    
    if (WiFi.status() != WL_CONNECTED) return response;
    
    HTTPClient http;
    String url = baseUrl + "/api/dj/speak";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + token);
    http.setTimeout(HTTP_TIMEOUT);
    
    StaticJsonDocument<300> doc;
    doc["event"] = event;
    doc["show"] = show;
    doc["current_item"] = currentItem;
    doc["next_item"] = nextItem;
    doc["mood"] = mood;
    
    String json;
    serializeJson(doc, json);
    
    int code = http.POST(json);
    if (code == 200) {
        String payload = http.getString();
        StaticJsonDocument<300> resp;
        DeserializationError err = deserializeJson(resp, payload);
        
        if (!err) {
            response.text = resp["text"] | "Buona musica!";
            response.tone = resp["tone"] | "neutral";
            response.ttsRecommended = resp["tts_recommended"] | false;
            response.ledColor = resp["led_color"] | "#ffffff";
        }
    }
    
    http.end();
    return response;
}

bool ApiClient::sendCommand(const String& command) {
    if (WiFi.status() != WL_CONNECTED) return false;
    
    HTTPClient http;
    String url = baseUrl + "/api/radio/command";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + token);
    http.setTimeout(HTTP_TIMEOUT);
    
    StaticJsonDocument<200> doc;
    doc["command"] = command;
    doc["source"] = "esp32";
    doc["timestamp"] = "";  // Aggiungere timestamp NTP
    
    String json;
    serializeJson(doc, json);
    
    int code = http.POST(json);
    bool success = (code == 200);
    http.end();
    return success;
}

RadioStatus ApiClient::getStatus() {
    RadioStatus status;
    status.online = false;
    status.currentShow = "Connecting...";
    status.currentItem = "N/A";
    status.nextItem = "N/A";
    status.listeners = 0;
    status.streamUrl = "";
    
    if (WiFi.status() != WL_CONNECTED) return status;
    
    HTTPClient http;
    String url = baseUrl + "/api/radio/status";
    http.begin(url);
    http.addHeader("Authorization", "Bearer " + token);
    http.setTimeout(HTTP_TIMEOUT);
    
    int code = http.GET();
    if (code == 200) {
        String payload = http.getString();
        StaticJsonDocument<500> doc;
        DeserializationError err = deserializeJson(doc, payload);
        
        if (!err) {
            status.online = doc["online"] | false;
            status.currentShow = doc["current_show"] | "N/A";
            status.currentItem = doc["current_item"] | "N/A";
            status.nextItem = doc["next_item"] | "N/A";
            status.listeners = doc["listeners"] | 0;
            status.streamUrl = doc["stream_url"] | "";
        }
    }
    
    http.end();
    return status;
}

bool ApiClient::sendFeedback(const String& itemId, const String& feedback) {
    if (WiFi.status() != WL_CONNECTED) return false;
    
    HTTPClient http;
    String url = baseUrl + "/api/feedback";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + token);
    http.setTimeout(HTTP_TIMEOUT);
    
    StaticJsonDocument<200> doc;
    doc["item_id"] = itemId;
    doc["feedback"] = feedback;
    
    String json;
    serializeJson(doc, json);
    
    int code = http.POST(json);
    bool success = (code == 200);
    http.end();
    return success;
}