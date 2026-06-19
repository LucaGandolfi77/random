/**
 * ESP32 AI Radio Station Director - Configurazione hardware
 * Codice commentato in italiano
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================
// PINOUT ESP32-S3 (senza conflitti)
// ============================================

// MAX98357A DAC I2S - Audio
#define I2S_BCLK    17    // Bit Clock
#define I2S_LRC     18    // Word Select / Left-Right Clock  
#define I2S_DIN     16    // Data In

// TFT ST7789 SPI
#define TFT_SCLK    12    // Clock SPI
#define TFT_MOSI    11    // Data SPI
#define TFT_CS      10    // Chip Select
#define TFT_DC       9    // Data/Command
#define TFT_RST      8    // Reset
#define TFT_BL       7    // Backlight (opzionale)

// Encoder rotativo
#define ENCODER_A     4    // Clock
#define ENCODER_B     5    // Data
#define ENCODER_SW    6    // Pulsante

// LED RGB WS2812B
#define LED_PIN       48   // LED mood (GPIO disponibile su S3)
#define LED_COUNT     1    // Singolo LED o anello

// Pulsanti opzionali
#define BTN_SKIP      3    // Salta contenuto
#define BTN_LIKE      47   // Mi piace
#define BTN_DISLIKE   46   // Non mi piace
#define BTN_EMERGENCY 45   // Emergency calm
#define BTN_MODE      44   // Cambia modalità

// ============================================
// CONFIGURAZIONE WIFI & BACKEND
// ============================================
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define BACKEND_URL   "http://192.168.1.100:8000"  // Cambiare con IP backend
#define BACKEND_TOKEN "YOUR_DEVICE_TOKEN"           // Token univoco ESP32

// ============================================
// PARAMETRI APPLICATIVI
// ============================================
#define DISPLAY_WIDTH   240
#define DISPLAY_HEIGHT  240
#define VOLUME_MIN      0
#define VOLUME_MAX      100
#define VOLUME_DEFAULT  70

#define HTTP_TIMEOUT    10000  // 10 secondi
#define POLL_INTERVAL   5000   // 5 secondi polling backend
#define DJ_SPEAK_INTERVAL 180000  // 3 minuti

// ============================================
// STATI RADIO
// ============================================
enum RadioMode {
    MODE_AUTO_DJ,        // AI decide tutto
    MODE_HUMAN_CURATOR,  // Utente guida, AI organizza
    MODE_FOCUS,          // Zero talk, solo musica
    MODE_NIGHT_PIRATE,   // Mood notte synthwave
    MODE_CITY,           // Interventi meteo/ora
    MODE_SERENDIPITY,    // Contenuti inaspettati
    MODE_EMERGENCY_CALM  // Playlist rilassante
};

enum RadioState {
    STATE_CONNECTING,
    STATE_IDLE,
    STATE_PLAYING_MUSIC,
    STATE_PLAYING_PODCAST,
    STATE_SPEAKER_INTRO,
    STATE_ERROR
};

#endif