/**
 * AI DJ Internet Radio - Configurazione hardware e parametri
 * Codice commentato in italiano
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// PINOUT HARDWARE - EVITA CONFLITTI I2S/I2C
// ============================================

// MAX98357A DAC I2S (usato per l'audio)
// Nota: GPIO 22 è usato sia da I2S (DIN) che da I2C (SCL) - scegliamo pin alternativi
#define I2S_BCLK    26    // Bit Clock
#define I2S_LRC     25    // Word Select / Left-Right Clock
#define I2S_DIN     22    // Data In (potrebbe conflitto con I2C - vedi sotto)

// OLED SSD1306 I2C - usiamo SDA/SCL alternativi per evitare conflitti
#define I2C_SDA     18    // SDA pin (non usare GPIO 21 se conflitti con I2S)
#define I2C_SCL     19    // SCL pin (non usare GPIO 22 se conflitti con I2S)
#define OLED_ADDRESS 0x3C  // Indirizzo I2C display SSD1306

// Encoder rotativo con pulsante
#define ENCODER_CLK   32    // Clock encoder
#define ENCODER_DT    33    // Data encoder
#define ENCODER_SW    27    // Pulsante encoder

// Pulsanti opzionali
#define BTN_FAVORITE  34    // Pulsante preferiti
#define BTN_MUTE      35    // Pulsante mute
#define BTN_MODE      36    // Pulsante modalità

// ============================================
// CONFIGURAZIONE WIFI
// ============================================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ============================================
// CONFIGURAZIONE SERVER AI
// ============================================
#define AI_SERVER_URL "http://192.168.1.100:8000"  // Cambiare con IP del server AI
#define AI_ENDPOINT_COMMENT "/dj/comment"
#define AI_ENDPOINT_TTS "/tts"

// ============================================
// CONFIGURAZIONE NTP
// ============================================
#define NTP_SERVER    "pool.ntp.org"
#define NTP_TIMEZONE  "CET-1CEST,M3.5.0,M10.5.0/3"  // Europa/CET

// ============================================
// PARAMETRI APPLICATIVI
// ============================================
#define VOLUME_MIN    0
#define VOLUME_MAX    100
#define VOLUME_DEFAULT 70

#define DJ_COMMENT_INTERVAL 900000  // 15 minuti in ms
#define DISPLAY_WIDTH       128
#define DISPLAY_HEIGHT      64

#define MAX_STATIONS        20
#define HTTP_TIMEOUT        10000   // 10 secondi

// ============================================
// STATI DELL'APPLICAZIONE
// ============================================
enum AppMode {
    MODE_MORNING,
    MODE_FOCUS,
    MODE_RELAX,
    MODE_EVENING,
    MODE_NIGHT
};

enum EventType {
    EVENT_STARTUP,
    EVENT_STATION_CHANGE,
    EVENT_PERIODIC
};

#endif