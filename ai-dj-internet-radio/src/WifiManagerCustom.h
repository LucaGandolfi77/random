/**
 * AI DJ Internet Radio - Gestione connessione WiFi
 * Si occupa della connessione, riconnessione e sincronizzazione NTP
 */

#ifndef WIFI_MANAGER_CUSTOM_H
#define WIFI_MANAGER_CUSTOM_H

#include <WiFi.h>
#include <time.h>
#include "config.h"

class WifiManagerCustom {
private:
    String ssid;
    String password;
    bool connected;
    unsigned long lastReconnectAttempt;
    const int reconnectInterval = 5000;  // 5 secondi tra tentativi

public:
    WifiManagerCustom();
    
    /**
     * Inizializza la connessione WiFi
     */
    void begin(const String& wifiSsid, const String& wifiPassword);
    
    /**
     * Aggiorna lo stato della connessione
     */
    void update();
    
    /**
     * Verifica se connesso
     */
    bool isConnected() const { return connected; }
    
    /**
     * Ottiene l'ora corrente formattata
     */
    String getCurrentTime();
    
    /**
     * Ottiene la data formattata
     */
    String getCurrentDate();
    
    /**
     * Forza la riconnessione
     */
    void reconnect();
    
    /**
     * Ottiene l'indirizzo IP
     */
    String getIP() const;
};

#endif