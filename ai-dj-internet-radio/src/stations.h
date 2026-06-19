/**
 * AI DJ Internet Radio - Lista stazioni radio
 * Configurabile nel firmware
 */

#ifndef STATIONS_H
#define STATIONS_H

#include <Arduino.h>

// Struttura per rappresentare una stazione radio
struct RadioStation {
    String name;
    String url;
    String genre;
    String mode_hint;
};

// Lista stazioni predefinite
const RadioStation radioStations[] = {
    {
        "Jazz Lounge",
        "http://stream.radiojazz.it:8000/jazz",
        "jazz",
        "morning"
    },
    {
        "Deep Focus",
        "http://stream.focusambient.com:8000/ambient",
        "ambient",
        "focus"
    },
    {
        "Tech News Radio",
        "http://stream.technews.fm:8000/news",
        "news",
        "work"
    },
    {
        "Classic Rock",
        "http://stream.classicrock.com:8000/rock",
        "rock",
        "evening"
    },
    {
        "Chill Out",
        "http://stream.chillout.com:8000/chill",
        "electronic",
        "relax"
    }
};

const int stationCount = sizeof(radioStations) / sizeof(RadioStation);

#endif