#include "WiFiSvc.h"
#include <WiFi.h>

void WiFiSvc_init() {
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true);
    delay(100);
}

bool WiFiSvc_scan(String& out) {
    int n = WiFi.scanNetworks();
    if (n == 0) {
        out = "Nessuna rete trovata.\n";
        return true;
    }
    out = String(n) + " reti trovate:\n";
    for (int i = 0; i < n; i++) {
        const char* enc = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "Aperta" : "Protetta";
        out += "  " + String(i + 1) + ". " + WiFi.SSID(i) + " ("
             + String(WiFi.RSSI(i)) + " dBm) [" + enc + "]\n";
    }
    WiFi.scanDelete();
    return true;
}

bool WiFiSvc_connect(const char* ssid, const char* pass) {
    if (WiFi.isConnected()) {
        WiFi.disconnect(true);
        delay(100);
    }
    WiFi.begin(ssid, pass);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        attempts++;
    }
    return WiFi.isConnected();
}

void WiFiSvc_disconnect() {
    WiFi.disconnect(true);
}

String WiFiSvc_status() {
    if (WiFi.isConnected()) {
        return "Connesso | SSID: " + WiFi.SSID()
             + " | IP: " + WiFi.localIP().toString()
             + " | RSSI: " + String(WiFi.RSSI()) + " dBm";
    }
    if (WiFi.status() == WL_CONNECT_FAILED) return "Connessione fallita";
    if (WiFi.status() == WL_DISCONNECTED) return "Disconnesso";
    return "Stato: " + String(WiFi.status());
}

bool WiFiSvc_isConnected() {
    return WiFi.isConnected();
}
