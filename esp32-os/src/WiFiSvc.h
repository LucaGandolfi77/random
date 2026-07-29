#pragma once
#include <Arduino.h>

void WiFiSvc_init();
bool WiFiSvc_scan(String& out);
bool WiFiSvc_connect(const char* ssid, const char* pass);
void WiFiSvc_disconnect();
String WiFiSvc_status();
bool WiFiSvc_isConnected();
