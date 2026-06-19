/**
 * TFT_eSPI User Setup per ST7789
 * Configurazione pin per ESP32-S3
 */

#define USER_SETUP_INFO "User_Setup for ESP32-S3 + ST7789"

// ST7789 display
#define ST7789_DRIVER

// Pin TFT
#define TFT_CS   10
#define TFT_DC    9
#define TFT_RST   8
#define TFT_SCLK 12
#define TFT_MOSI 11

// Font
#define LOAD_GLCD
#define LOAD_FONT2
#define LOAD_FONT4
#define LOAD_FONT6
#define LOAD_FONT7

// SPI
#define TFT_SPI_PORT 1
#define TFT_SPI_HOST SPI2_HOST

// Velocità
#define TFT_INVERSION_OFF
#define TFT_RGB_ORDER TFT_BGR