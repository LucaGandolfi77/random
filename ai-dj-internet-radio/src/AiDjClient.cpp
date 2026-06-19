/**
 * AI DJ Internet Radio - Implementazione client AI
 */

#include "AiDjClient.h"

AiDjClient::AiDjClient() : serverUrl(AI_SERVER_URL) {
}

void AiDjClient::setServerUrl(const String& url) {
    serverUrl = url;
}

DjComment AiDjClient::getComment(const String& time, const String& stationName,
                                const String& genre, const String& mode,
                                const String& weather, const String& city,
                                const String& event) {
    
    DjComment fallback = {"Buona musica!", "neutral", "#ffffff", false};
    
    if (!WiFi.status() == WL_CONNECTED) {
        Serial.println("[AI] WiFi non connesso");
        return fallback;
    }
    
    HTTPClient http;
    String url = serverUrl + AI_ENDPOINT_COMMENT;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Prepara JSON request
    StaticJsonDocument<500> doc;
    doc["time"] = time;
    doc["station_name"] = stationName;
    doc["genre"] = genre;
    doc["mode"] = mode;
    doc["weather"] = weather;
    doc["city"] = city;
    doc["event"] = event;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
        String payload = http.getString();
        
        StaticJsonDocument<500> response;
        DeserializationError error = deserializeJson(response, payload);
        
        if (!error) {
            DjComment comment;
            comment.text = response["text"] | "Buona musica!";
            comment.mood = response["mood"] | "neutral";
            comment.color = response["color"] | "#ffffff";
            comment.ttsRecommended = response["tts_recommended"] | false;
            http.end();
            return comment;
        }
    }
    
    Serial.println("[AI] Errore richiesta commento: " + String(httpResponseCode));
    http.end();
    return fallback;
}

String AiDjClient::getTts(const String& text) {
    if (!WiFi.status() == WL_CONNECTED) {
        return "";
    }
    
    HTTPClient http;
    String url = serverUrl + AI_ENDPOINT_TTS;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<300> doc;
    doc["text"] = text;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
        String payload = http.getString();
        
        StaticJsonDocument<300> response;
        DeserializationError error = deserializeJson(response, payload);
        
        if (!error) {
            String audioUrl = response["audio_url"] | "";
            http.end();
            return audioUrl;
        }
    }
    
    Serial.println("[AI] Errore TTS: " + String(httpResponseCode));
    http.end();
    return "";
}

bool AiDjClient::isServerAvailable() {
    HTTPClient http;
    String url = serverUrl + "/health";
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT);
    
    int httpResponseCode = http.GET();
    bool available = (httpResponseCode == 200);
    http.end();
    
    return available;
}