/**
 * AI DJ Internet Radio - Implementazione gestione WiFi
 */

#include "WifiManagerCustom.h"

WifiManagerCustom::WifiManagerCustom() 
    : connected(false), lastReconnectAttempt(0) {
}

void WifiManagerCustom::begin(const String& wifiSsid, const String& wifiPassword) {
    ssid = wifiSsid;
    password = wifiPassword;
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    
    // Configura timezone NTP
    configTzTime(NTP_TIMEZONE, NTP_SERVER);
}

void WifiManagerCustom::update() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!connected) {
            connected = true;
            Serial.println("[WiFi] Connesso! IP: " + getIP());
        }
    } else {
        connected = false;
        unsigned long now = millis();
        if (now - lastReconnectAttempt > reconnectInterval) {
            lastReconnectAttempt = now;
            Serial.println("[WiFi] Tentativo riconnessione...");
            WiFi.reconnect();
        }
    }
}

String WifiManagerCustom::getCurrentTime() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "--:--";
    }
    char timeStr[9];
    sprintf(timeStr, "%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min);
    return String(timeStr);
}

String WifiManagerCustom::getCurrentDate() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "--/--/--";
    }
    char dateStr[11];
    sprintf(dateStr, "%02d/%02d/%04d", timeinfo.tm_mday, timeinfo.tm_mon + 1, timeinfo.tm_year + 1900);
    return String(dateStr);
}

void WifiManagerCustom::reconnect() {
    WiFi.disconnect();
    delay(100);
    WiFi.begin(ssid.c_str(), password.c_str());
}

String WifiManagerCustom::getIP() const {
    return WiFi.localIP().toString();
}