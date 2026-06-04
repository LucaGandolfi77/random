"""
World Statistics Atlas — Flask API Server
Serves 120+ countries with real demographic & economic data,
supports search, comparison, sorting, filtering, and CSV export.
"""

import csv
import io
import json
import os
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Comprehensive country dataset (120+ countries)
# Sources: World Bank / UN approximations for a 2025-2026 snapshot.
# Fields: code, name, population, gdpUsd, areaKm2, continent, capital,
#         language, currency, hdi, lifeExpectancy, internetPct, sourceLabel, sourceUrl, note
# ---------------------------------------------------------------------------
COUNTRIES = {
    "IT": {
        "name": "Italy", "population": 58997201, "gdpUsd": 2250000000000,
        "areaKm2": 301340, "continent": "Europe", "capital": "Rome",
        "language": "Italian", "currency": "Euro",
        "hdi": 0.906, "lifeExpectancy": 83.6, "internetPct": 75.0,
        "sourceLabel": "World Bank — Italy", "sourceUrl": "https://data.worldbank.org/country/italy",
        "note": "G7 economy with strong manufacturing, design, tourism, and luxury-goods sectors."
    },
    "US": {
        "name": "United States", "population": 335893238, "gdpUsd": 27720000000000,
        "areaKm2": 9833520, "continent": "North America", "capital": "Washington, D.C.",
        "language": "English", "currency": "US Dollar",
        "hdi": 0.927, "lifeExpectancy": 78.9, "internetPct": 91.0,
        "sourceLabel": "World Bank — USA", "sourceUrl": "https://data.worldbank.org/country/united-states",
        "note": "Largest nominal economy; global leader in technology, finance, and innovation."
    },
    "CN": {
        "name": "China", "population": 1409670000, "gdpUsd": 17790000000000,
        "areaKm2": 9596960, "continent": "Asia", "capital": "Beijing",
        "language": "Chinese (Mandarin)", "currency": "Renminbi (Yuan)",
        "hdi": 0.788, "lifeExpectancy": 78.6, "internetPct": 73.0,
        "sourceLabel": "World Bank — China", "sourceUrl": "https://data.worldbank.org/country/china",
        "note": "World's second-largest economy; dominant in manufacturing, exports, and infrastructure."
    },
    "BR": {
        "name": "Brazil", "population": 203080756, "gdpUsd": 2170000000000,
        "areaKm2": 8515767, "continent": "South America", "capital": "Brasília",
        "language": "Portuguese", "currency": "Brazilian Real",
        "hdi": 0.760, "lifeExpectancy": 76.3, "internetPct": 81.0,
        "sourceLabel": "World Bank — Brazil", "sourceUrl": "https://data.worldbank.org/country/brazil",
        "note": "Largest South American economy; key exporter of agriculture, minerals, and energy."
    },
    "NG": {
        "name": "Nigeria", "population": 227882945, "gdpUsd": 477400000000,
        "areaKm2": 923768, "continent": "Africa", "capital": "Abuja",
        "language": "English", "currency": "Nigerian Naira",
        "hdi": 0.548, "lifeExpectancy": 55.8, "internetPct": 36.0,
        "sourceLabel": "World Bank — Nigeria", "sourceUrl": "https://data.worldbank.org/country/nigeria",
        "note": "Africa's most populous country and largest economy; major oil and gas producer."
    },
    "DE": {
        "name": "Germany", "population": 83294633, "gdpUsd": 4456000000000,
        "areaKm2": 357022, "continent": "Europe", "capital": "Berlin",
        "language": "German", "currency": "Euro",
        "hdi": 0.950, "lifeExpectancy": 80.9, "internetPct": 93.0,
        "sourceLabel": "World Bank — Germany", "sourceUrl": "https://data.worldbank.org/country/germany",
        "note": "Europe's industrial powerhouse; leader in automotive, chemicals, and machinery."
    },
    "FR": {
        "name": "France", "population": 64756584, "gdpUsd": 3130000000000,
        "areaKm2": 640679, "continent": "Europe", "capital": "Paris",
        "language": "French", "currency": "Euro",
        "hdi": 0.905, "lifeExpectancy": 82.9, "internetPct": 87.0,
        "sourceLabel": "World Bank — France", "sourceUrl": "https://data.worldbank.org/country/france",
        "note": "Leading EU economy with strengths in aerospace, luxury goods, tourism, and agriculture."
    },
    "GB": {
        "name": "United Kingdom", "population": 67508936, "gdpUsd": 3340000000000,
        "areaKm2": 243610, "continent": "Europe", "capital": "London",
        "language": "English", "currency": "Pound Sterling",
        "hdi": 0.929, "lifeExpectancy": 80.7, "internetPct": 95.0,
        "sourceLabel": "World Bank — UK", "sourceUrl": "https://data.worldbank.org/country/united-kingdom",
        "note": "Global financial hub; diversified economy with services, technology, and creative industries."
    },
    "JP": {
        "name": "Japan", "population": 125124989, "gdpUsd": 4230000000000,
        "areaKm2": 377975, "continent": "Asia", "capital": "Tokyo",
        "language": "Japanese", "currency": "Japanese Yen",
        "hdi": 0.920, "lifeExpectancy": 84.8, "internetPct": 84.0,
        "sourceLabel": "World Bank — Japan", "sourceUrl": "https://data.worldbank.org/country/japan",
        "note": "Third-largest economy; leader in robotics, automobiles, electronics, and precision engineering."
    },
    "IN": {
        "name": "India", "population": 1428627663, "gdpUsd": 3550000000000,
        "areaKm2": 3287263, "continent": "Asia", "capital": "New Delhi",
        "language": "Hindi / English", "currency": "Indian Rupee",
        "hdi": 0.644, "lifeExpectancy": 70.8, "internetPct": 48.0,
        "sourceLabel": "World Bank — India", "sourceUrl": "https://data.worldbank.org/country/india",
        "note": "Fastest-growing major economy; massive IT services, pharma, and startup ecosystem."
    },
    "CA": {
        "name": "Canada", "population": 38781291, "gdpUsd": 2140000000000,
        "areaKm2": 9984670, "continent": "North America", "capital": "Ottawa",
        "language": "English / French", "currency": "Canadian Dollar",
        "hdi": 0.935, "lifeExpectancy": 82.7, "internetPct": 94.0,
        "sourceLabel": "World Bank — Canada", "sourceUrl": "https://data.worldbank.org/country/canada",
        "note": "Resource-rich G7 economy; strong in energy, mining, technology, and finance."
    },
    "AU": {
        "name": "Australia", "population": 26141369, "gdpUsd": 1720000000000,
        "areaKm2": 7692024, "continent": "Oceania", "capital": "Canberra",
        "language": "English", "currency": "Australian Dollar",
        "hdi": 0.946, "lifeExpectancy": 83.4, "internetPct": 90.0,
        "sourceLabel": "World Bank — Australia", "sourceUrl": "https://data.worldbank.org/country/australia",
        "note": "Stable OECD economy; major exporter of natural resources, education, and services."
    },
    "KR": {
        "name": "South Korea", "population": 51784059, "gdpUsd": 1870000000000,
        "areaKm2": 100210, "continent": "Asia", "capital": "Seoul",
        "language": "Korean", "currency": "South Korean Won",
        "hdi": 0.929, "lifeExpectancy": 83.5, "internetPct": 97.0,
        "sourceLabel": "World Bank — South Korea", "sourceUrl": "https://data.worldbank.org/country/korea-republic",
        "note": "Tech and innovation leader; home to Samsung, Hyundai, and cutting-edge digital infrastructure."
    },
    "RU": {
        "name": "Russia", "population": 144236933, "gdpUsd": 2020000000000,
        "areaKm2": 17098246, "continent": "Europe / Asia", "capital": "Moscow",
        "language": "Russian", "currency": "Russian Ruble",
        "hdi": 0.822, "lifeExpectancy": 72.6, "internetPct": 88.0,
        "sourceLabel": "World Bank — Russia", "sourceUrl": "https://data.worldbank.org/country/russia",
        "note": "Largest country by land area; major energy and natural resource exporter."
    },
    "MX": {
        "name": "Mexico", "population": 128455567, "gdpUsd": 1460000000000,
        "areaKm2": 1964375, "continent": "North America", "capital": "Mexico City",
        "language": "Spanish", "currency": "Mexican Peso",
        "hdi": 0.781, "lifeExpectancy": 75.4, "internetPct": 72.0,
        "sourceLabel": "World Bank — Mexico", "sourceUrl": "https://data.worldbank.org/country/mexico",
        "note": "Major manufacturing hub with strong automotive, electronics, and energy sectors."
    },
    "ID": {
        "name": "Indonesia", "population": 277534122, "gdpUsd": 1370000000000,
        "areaKm2": 1904569, "continent": "Asia", "capital": "Jakarta",
        "language": "Indonesian", "currency": "Indonesian Rupiah",
        "hdi": 0.713, "lifeExpectancy": 71.5, "internetPct": 54.0,
        "sourceLabel": "World Bank — Indonesia", "sourceUrl": "https://data.worldbank.org/country/indonesia",
        "note": "Southeast Asia's largest economy; rich in natural resources and growing digital sector."
    },
    "TR": {
        "name": "Turkey", "population": 85279553, "gdpUsd": 1080000000000,
        "areaKm2": 783562, "continent": "Europe / Asia", "capital": "Ankara",
        "language": "Turkish", "currency": "Turkish Lira",
        "hdi": 0.838, "lifeExpectancy": 77.4, "internetPct": 78.0,
        "sourceLabel": "World Bank — Turkey", "sourceUrl": "https://data.worldbank.org/country/turkey",
        "note": "Strategic transcontinental economy; strong in construction, textiles, and agriculture."
    },
    "SA": {
        "name": "Saudi Arabia", "population": 36408820, "gdpUsd": 1070000000000,
        "areaKm2": 2149690, "continent": "Asia", "capital": "Riyadh",
        "language": "Arabic", "currency": "Saudi Riyal",
        "hdi": 0.875, "lifeExpectancy": 75.4, "internetPct": 96.0,
        "sourceLabel": "World Bank — Saudi Arabia", "sourceUrl": "https://data.worldbank.org/country/saudi-arabia",
        "note": "Largest Arab economy; top oil exporter with ambitious Vision 2030 diversification plan."
    },
    "CH": {
        "name": "Switzerland", "population": 8796669, "gdpUsd": 905000000000,
        "areaKm2": 41285, "continent": "Europe", "capital": "Bern",
        "language": "German / French / Italian", "currency": "Swiss Franc",
        "hdi": 0.962, "lifeExpectancy": 84.0, "internetPct": 96.0,
        "sourceLabel": "World Bank — Switzerland", "sourceUrl": "https://data.worldbank.org/country/switzerland",
        "note": "Highest HDI globally; leader in finance, pharma, precision machinery, and watches."
    },
    "NL": {
        "name": "Netherlands", "population": 17564014, "gdpUsd": 1110000000000,
        "areaKm2": 41543, "continent": "Europe", "capital": "Amsterdam",
        "language": "Dutch", "currency": "Euro",
        "hdi": 0.941, "lifeExpectancy": 81.7, "internetPct": 94.0,
        "sourceLabel": "World Bank — Netherlands", "sourceUrl": "https://data.worldbank.org/country/netherlands",
        "note": "Highly competitive EU economy; major logistics, agriculture, and semiconductor hub."
    },
    "SE": {
        "name": "Sweden", "population": 10549347, "gdpUsd": 593000000000,
        "areaKm2": 450295, "continent": "Europe", "capital": "Stockholm",
        "language": "Swedish", "currency": "Swedish Krona",
        "hdi": 0.947, "lifeExpectancy": 83.0, "internetPct": 96.0,
        "sourceLabel": "World Bank — Sweden", "sourceUrl": "https://data.worldbank.org/country/sweden",
        "note": "Innovation-driven Nordic economy; home to Spotify, IKEA, and Ericsson."
    },
    "NO": {
        "name": "Norway", "population": 5474360, "gdpUsd": 485000000000,
        "areaKm2": 385207, "continent": "Europe", "capital": "Oslo",
        "language": "Norwegian", "currency": "Norwegian Krone",
        "hdi": 0.961, "lifeExpectancy": 83.2, "internetPct": 97.0,
        "sourceLabel": "World Bank — Norway", "sourceUrl": "https://data.worldbank.org/country/norway",
        "note": "High-income welfare state with large sovereign wealth fund and oil revenues."
    },
    "ZA": {
        "name": "South Africa", "population": 60414495, "gdpUsd": 399000000000,
        "areaKm2": 1221037, "continent": "Africa", "capital": "Pretoria",
        "language": "11 official languages", "currency": "South African Rand",
        "hdi": 0.713, "lifeExpectancy": 65.3, "internetPct": 56.0,
        "sourceLabel": "World Bank — South Africa", "sourceUrl": "https://data.worldbank.org/country/south-africa",
        "note": "Most industrialized African economy; rich in minerals with advanced financial sector."
    },
    "AR": {
        "name": "Argentina", "population": 46234830, "gdpUsd": 641000000000,
        "areaKm2": 2780400, "continent": "South America", "capital": "Buenos Aires",
        "language": "Spanish", "currency": "Argentine Peso",
        "hdi": 0.849, "lifeExpectancy": 76.8, "internetPct": 83.0,
        "sourceLabel": "World Bank — Argentina", "sourceUrl": "https://data.worldbank.org/country/argentina",
        "note": "Rich in agricultural resources; major exporter of soy, beef, and wine."
    },
    "EG": {
        "name": "Egypt", "population": 110990103, "gdpUsd": 398000000000,
        "areaKm2": 1002450, "continent": "Africa", "capital": "Cairo",
        "language": "Arabic", "currency": "Egyptian Pound",
        "hdi": 0.728, "lifeExpectancy": 72.1, "internetPct": 58.0,
        "sourceLabel": "World Bank — Egypt", "sourceUrl": "https://data.worldbank.org/country/egypt",
        "note": "Largest Arab population; strategic Suez Canal and growing natural gas sector."
    },
    "DK": {
        "name": "Denmark", "population": 5910913, "gdpUsd": 420000000000,
        "areaKm2": 43094, "continent": "Europe", "capital": "Copenhagen",
        "language": "Danish", "currency": "Danish Krone",
        "hdi": 0.948, "lifeExpectancy": 81.6, "internetPct": 97.0,
        "sourceLabel": "World Bank — Denmark", "sourceUrl": "https://data.worldbank.org/country/denmark",
        "note": "Green energy leader; strong in pharmaceuticals, wind power, and maritime shipping."
    },
    "FI": {
        "name": "Finland", "population": 5548241, "gdpUsd": 305000000000,
        "areaKm2": 338424, "continent": "Europe", "capital": "Helsinki",
        "language": "Finnish / Swedish", "currency": "Euro",
        "hdi": 0.942, "lifeExpectancy": 82.1, "internetPct": 95.0,
        "sourceLabel": "World Bank — Finland", "sourceUrl": "https://data.worldbank.org/country/finland",
        "note": "Top education and digital society; leader in tech, forestry, and design."
    },
    "PT": {
        "name": "Portugal", "population": 10247605, "gdpUsd": 287000000000,
        "areaKm2": 92212, "continent": "Europe", "capital": "Lisbon",
        "language": "Portuguese", "currency": "Euro",
        "hdi": 0.874, "lifeExpectancy": 81.8, "internetPct": 84.0,
        "sourceLabel": "World Bank — Portugal", "sourceUrl": "https://data.worldbank.org/country/portugal",
        "note": "Growing Southern European economy; major tourism and renewable energy destination."
    },
    "GR": {
        "name": "Greece", "population": 10341277, "gdpUsd": 242000000000,
        "areaKm2": 131957, "continent": "Europe", "capital": "Athens",
        "language": "Greek", "currency": "Euro",
        "hdi": 0.887, "lifeExpectancy": 81.8, "internetPct": 80.0,
        "sourceLabel": "World Bank — Greece", "sourceUrl": "https://data.worldbank.org/country/greece",
        "note": "Historical and tourism-rich nation; growing in shipping, energy, and technology."
    },
    "IE": {
        "name": "Ireland", "population": 5123536, "gdpUsd": 545000000000,
        "areaKm2": 70273, "continent": "Europe", "capital": "Dublin",
        "language": "English / Irish", "currency": "Euro",
        "hdi": 0.945, "lifeExpectancy": 82.6, "internetPct": 93.0,
        "sourceLabel": "World Bank — Ireland", "sourceUrl": "https://data.worldbank.org/country/ireland",
        "note": "Major hub for tech and pharma multinationals; high GDP per capita."
    },
    "PL": {
        "name": "Poland", "population": 37950802, "gdpUsd": 842000000000,
        "areaKm2": 312696, "continent": "Europe", "capital": "Warsaw",
        "language": "Polish", "currency": "Polish Zloty",
        "hdi": 0.881, "lifeExpectancy": 78.5, "internetPct": 85.0,
        "sourceLabel": "World Bank — Poland", "sourceUrl": "https://data.worldbank.org/country/poland",
        "note": "Fast-growing Central European economy; strong in manufacturing, IT, and logistics."
    },
    "AT": {
        "name": "Austria", "population": 9104772, "gdpUsd": 516000000000,
        "areaKm2": 83871, "continent": "Europe", "capital": "Vienna",
        "language": "German", "currency": "Euro",
        "hdi": 0.926, "lifeExpectancy": 81.6, "internetPct": 90.0,
        "sourceLabel": "World Bank — Austria", "sourceUrl": "https://data.worldbank.org/country/austria",
        "note": "Highly developed export-oriented economy; strong in machinery, tourism, and services."
    },
    "NZ": {
        "name": "New Zealand", "population": 5185288, "gdpUsd": 245000000000,
        "areaKm2": 268838, "continent": "Oceania", "capital": "Wellington",
        "language": "English / Maori", "currency": "New Zealand Dollar",
        "hdi": 0.937, "lifeExpectancy": 82.6, "internetPct": 92.0,
        "sourceLabel": "World Bank — NZ", "sourceUrl": "https://data.worldbank.org/country/new-zealand",
        "note": "Strong agricultural exporter; leader in dairy, wool, wine, and film production."
    },
    "MY": {
        "name": "Malaysia", "population": 34308525, "gdpUsd": 430000000000,
        "areaKm2": 330803, "continent": "Asia", "capital": "Kuala Lumpur",
        "language": "Malay", "currency": "Malaysian Ringgit",
        "hdi": 0.807, "lifeExpectancy": 76.4, "internetPct": 89.0,
        "sourceLabel": "World Bank — Malaysia", "sourceUrl": "https://data.worldbank.org/country/malaysia",
        "note": "Diversified Southeast Asian economy; strong in electronics, palm oil, and petroleum."
    },
    "SG": {
        "name": "Singapore", "population": 5917648, "gdpUsd": 501000000000,
        "areaKm2": 728, "continent": "Asia", "capital": "Singapore City",
        "language": "English / Chinese / Malay / Tamil", "currency": "Singapore Dollar",
        "hdi": 0.949, "lifeExpectancy": 84.2, "internetPct": 96.0,
        "sourceLabel": "World Bank — Singapore", "sourceUrl": "https://data.worldbank.org/country/singapore",
        "note": "Global financial hub and high-income city-state; top in ease of doing business."
    },
    "TH": {
        "name": "Thailand", "population": 71766858, "gdpUsd": 512000000000,
        "areaKm2": 513120, "continent": "Asia", "capital": "Bangkok",
        "language": "Thai", "currency": "Thai Baht",
        "hdi": 0.803, "lifeExpectancy": 79.0, "internetPct": 78.0,
        "sourceLabel": "World Bank — Thailand", "sourceUrl": "https://data.worldbank.org/country/thailand",
        "note": "Major tourism and manufacturing destination; top exporter of automobiles and electronics."
    },
    "VN": {
        "name": "Vietnam", "population": 98858950, "gdpUsd": 433000000000,
        "areaKm2": 331212, "continent": "Asia", "capital": "Hanoi",
        "language": "Vietnamese", "currency": "Vietnamese Dong",
        "hdi": 0.726, "lifeExpectancy": 75.6, "internetPct": 73.0,
        "sourceLabel": "World Bank — Vietnam", "sourceUrl": "https://data.worldbank.org/country/vietnam",
        "note": "Rapidly industrializing Southeast Asian economy; major textile and electronics exporter."
    },
    "PH": {
        "name": "Philippines", "population": 115843670, "gdpUsd": 435000000000,
        "areaKm2": 300000, "continent": "Asia", "capital": "Manila",
        "language": "Filipino / English", "currency": "Philippine Peso",
        "hdi": 0.710, "lifeExpectancy": 71.6, "internetPct": 60.0,
        "sourceLabel": "World Bank — Philippines", "sourceUrl": "https://data.worldbank.org/country/philippines",
        "note": "Fast-growing service-driven economy; leader in BPO, remittances, and digital services."
    },
    "CO": {
        "name": "Colombia", "population": 52085168, "gdpUsd": 363000000000,
        "areaKm2": 1141748, "continent": "South America", "capital": "Bogotá",
        "language": "Spanish", "currency": "Colombian Peso",
        "hdi": 0.770, "lifeExpectancy": 77.4, "internetPct": 70.0,
        "sourceLabel": "World Bank — Colombia", "sourceUrl": "https://data.worldbank.org/country/colombia",
        "note": "Key Latin American economy; strong in oil, coffee, flowers, and ecotourism."
    },
    "CL": {
        "name": "Chile", "population": 19603733, "gdpUsd": 335000000000,
        "areaKm2": 756102, "continent": "South America", "capital": "Santiago",
        "language": "Spanish", "currency": "Chilean Peso",
        "hdi": 0.860, "lifeExpectancy": 80.2, "internetPct": 88.0,
        "sourceLabel": "World Bank — Chile", "sourceUrl": "https://data.worldbank.org/country/chile",
        "note": "Most developed South American economy; top copper producer with strong services sector."
    },
    "PE": {
        "name": "Peru", "population": 34049588, "gdpUsd": 267000000000,
        "areaKm2": 1285216, "continent": "South America", "capital": "Lima",
        "language": "Spanish", "currency": "Peruvian Sol",
        "hdi": 0.762, "lifeExpectancy": 76.9, "internetPct": 65.0,
        "sourceLabel": "World Bank — Peru", "sourceUrl": "https://data.worldbank.org/country/peru",
        "note": "Rich in mineral resources; major exporter of copper, gold, and agricultural products."
    },
    "UA": {
        "name": "Ukraine", "population": 37000000, "gdpUsd": 178000000000,
        "areaKm2": 603628, "continent": "Europe", "capital": "Kyiv",
        "language": "Ukrainian", "currency": "Ukrainian Hryvnia",
        "hdi": 0.773, "lifeExpectancy": 72.1, "internetPct": 79.0,
        "sourceLabel": "World Bank — Ukraine", "sourceUrl": "https://data.worldbank.org/country/ukraine",
        "note": "Large agricultural producer ('breadbasket of Europe'); growing IT and defense sectors."
    },
    "CZ": {
        "name": "Czech Republic", "population": 10827529, "gdpUsd": 330000000000,
        "areaKm2": 78865, "continent": "Europe", "capital": "Prague",
        "language": "Czech", "currency": "Czech Koruna",
        "hdi": 0.895, "lifeExpectancy": 79.5, "internetPct": 88.0,
        "sourceLabel": "World Bank — Czechia", "sourceUrl": "https://data.worldbank.org/country/czech-republic",
        "note": "Highly industrialized Central European economy; automotive and engineering powerhouse."
    },
    "RO": {
        "name": "Romania", "population": 19031235, "gdpUsd": 351000000000,
        "areaKm2": 238397, "continent": "Europe", "capital": "Bucharest",
        "language": "Romanian", "currency": "Romanian Leu",
        "hdi": 0.827, "lifeExpectancy": 76.0, "internetPct": 79.0,
        "sourceLabel": "World Bank — Romania", "sourceUrl": "https://data.worldbank.org/country/romania",
        "note": "Fast-growing EU economy; strong in IT, automotive, and agriculture."
    },
    "HU": {
        "name": "Hungary", "population": 9597085, "gdpUsd": 212000000000,
        "areaKm2": 93028, "continent": "Europe", "capital": "Budapest",
        "language": "Hungarian", "currency": "Hungarian Forint",
        "hdi": 0.851, "lifeExpectancy": 76.9, "internetPct": 85.0,
        "sourceLabel": "World Bank — Hungary", "sourceUrl": "https://data.worldbank.org/country/hungary",
        "note": "Central European manufacturing hub; strong in automotive, electronics, and pharma."
    },
    "IL": {
        "name": "Israel", "population": 9364000, "gdpUsd": 510000000000,
        "areaKm2": 22072, "continent": "Asia", "capital": "Jerusalem",
        "language": "Hebrew / Arabic", "currency": "Israeli Shekel",
        "hdi": 0.919, "lifeExpectancy": 83.2, "internetPct": 91.0,
        "sourceLabel": "World Bank — Israel", "sourceUrl": "https://data.worldbank.org/country/israel",
        "note": "Startup Nation; global leader in cybersecurity, agritech, and medical devices."
    },
    "AE": {
        "name": "United Arab Emirates", "population": 9518000, "gdpUsd": 504000000000,
        "areaKm2": 83600, "continent": "Asia", "capital": "Abu Dhabi",
        "language": "Arabic", "currency": "UAE Dirham",
        "hdi": 0.911, "lifeExpectancy": 79.2, "internetPct": 99.0,
        "sourceLabel": "World Bank — UAE", "sourceUrl": "https://data.worldbank.org/country/united-arab-emirates",
        "note": "Diversified Gulf economy; global hub for trade, tourism, aviation, and finance."
    },
    "HK": {
        "name": "Hong Kong", "population": 7488649, "gdpUsd": 382000000000,
        "areaKm2": 1106, "continent": "Asia", "capital": "Hong Kong",
        "language": "Chinese / English", "currency": "Hong Kong Dollar",
        "hdi": 0.956, "lifeExpectancy": 85.5, "internetPct": 93.0,
        "sourceLabel": "World Bank — Hong Kong", "sourceUrl": "https://data.worldbank.org/country/hong-kong",
        "note": "Major international financial center; highest life expectancy globally."
    },
    "QA": {
        "name": "Qatar", "population": 2930524, "gdpUsd": 235000000000,
        "areaKm2": 11586, "continent": "Asia", "capital": "Doha",
        "language": "Arabic", "currency": "Qatari Riyal",
        "hdi": 0.855, "lifeExpectancy": 80.4, "internetPct": 99.0,
        "sourceLabel": "World Bank — Qatar", "sourceUrl": "https://data.worldbank.org/country/qatar",
        "note": "Highest GDP per capita globally; top LNG exporter with massive sovereign wealth fund."
    },
    "KW": {
        "name": "Kuwait", "population": 4772000, "gdpUsd": 164000000000,
        "areaKm2": 17818, "continent": "Asia", "capital": "Kuwait City",
        "language": "Arabic", "currency": "Kuwaiti Dinar",
        "hdi": 0.831, "lifeExpectancy": 79.2, "internetPct": 99.0,
        "sourceLabel": "World Bank — Kuwait", "sourceUrl": "https://data.worldbank.org/country/kuwait",
        "note": "Oil-rich Gulf state; highest-value currency with extensive social welfare system."
    },
    "KE": {
        "name": "Kenya", "population": 55100586, "gdpUsd": 113000000000,
        "areaKm2": 580367, "continent": "Africa", "capital": "Nairobi",
        "language": "Swahili / English", "currency": "Kenyan Shilling",
        "hdi": 0.601, "lifeExpectancy": 67.0, "internetPct": 40.0,
        "sourceLabel": "World Bank — Kenya", "sourceUrl": "https://data.worldbank.org/country/kenya",
        "note": "East Africa's innovation hub; leader in mobile money (M-Pesa) and tech startups."
    },
    "ET": {
        "name": "Ethiopia", "population": 126527060, "gdpUsd": 155000000000,
        "areaKm2": 1104300, "continent": "Africa", "capital": "Addis Ababa",
        "language": "Amharic", "currency": "Ethiopian Birr",
        "hdi": 0.492, "lifeExpectancy": 67.2, "internetPct": 24.0,
        "sourceLabel": "World Bank — Ethiopia", "sourceUrl": "https://data.worldbank.org/country/ethiopia",
        "note": "Fastest-growing African economy; large agricultural sector and infrastructure push."
    },
    "GH": {
        "name": "Ghana", "population": 33475870, "gdpUsd": 76000000000,
        "areaKm2": 238533, "continent": "Africa", "capital": "Accra",
        "language": "English", "currency": "Ghanaian Cedi",
        "hdi": 0.632, "lifeExpectancy": 64.8, "internetPct": 58.0,
        "sourceLabel": "World Bank — Ghana", "sourceUrl": "https://data.worldbank.org/country/ghana",
        "note": "Stable West African democracy; major gold, cocoa, and oil producer."
    },
    "TZ": {
        "name": "Tanzania", "population": 65497748, "gdpUsd": 75000000000,
        "areaKm2": 947300, "continent": "Africa", "capital": "Dodoma",
        "language": "Swahili / English", "currency": "Tanzanian Shilling",
        "hdi": 0.549, "lifeExpectancy": 66.2, "internetPct": 30.0,
        "sourceLabel": "World Bank — Tanzania", "sourceUrl": "https://data.worldbank.org/country/tanzania",
        "note": "Fast-growing East African economy; tourism (Serengeti, Kilimanjaro) and mining."
    },
    "MA": {
        "name": "Morocco", "population": 37457971, "gdpUsd": 147000000000,
        "areaKm2": 710850, "continent": "Africa", "capital": "Rabat",
        "language": "Arabic / Berber", "currency": "Moroccan Dirham",
        "hdi": 0.698, "lifeExpectancy": 77.2, "internetPct": 75.0,
        "sourceLabel": "World Bank — Morocco", "sourceUrl": "https://data.worldbank.org/country/morocco",
        "note": "North African gateway; strong in agriculture, phosphates, automotive, and renewables."
    },
    "DZ": {
        "name": "Algeria", "population": 45606480, "gdpUsd": 195000000000,
        "areaKm2": 2381741, "continent": "Africa", "capital": "Algiers",
        "language": "Arabic / Berber", "currency": "Algerian Dinar",
        "hdi": 0.745, "lifeExpectancy": 77.2, "internetPct": 63.0,
        "sourceLabel": "World Bank — Algeria", "sourceUrl": "https://data.worldbank.org/country/algeria",
        "note": "Largest African country by area; major natural gas and oil exporter."
    },
    "AO": {
        "name": "Angola", "population": 35588987, "gdpUsd": 93000000000,
        "areaKm2": 1246700, "continent": "Africa", "capital": "Luanda",
        "language": "Portuguese", "currency": "Angolan Kwanza",
        "hdi": 0.591, "lifeExpectancy": 62.4, "internetPct": 36.0,
        "sourceLabel": "World Bank — Angola", "sourceUrl": "https://data.worldbank.org/country/angola",
        "note": "Major African oil producer; diversifying into agriculture, mining, and infrastructure."
    },
    "BD": {
        "name": "Bangladesh", "population": 172954319, "gdpUsd": 446000000000,
        "areaKm2": 147570, "continent": "Asia", "capital": "Dhaka",
        "language": "Bengali", "currency": "Bangladeshi Taka",
        "hdi": 0.661, "lifeExpectancy": 74.7, "internetPct": 39.0,
        "sourceLabel": "World Bank — Bangladesh", "sourceUrl": "https://data.worldbank.org/country/bangladesh",
        "note": "Ready-made garment export powerhouse; rapid poverty reduction and digital transformation."
    },
    "PK": {
        "name": "Pakistan", "population": 241499431, "gdpUsd": 376000000000,
        "areaKm2": 881913, "continent": "Asia", "capital": "Islamabad",
        "language": "Urdu / English", "currency": "Pakistani Rupee",
        "hdi": 0.544, "lifeExpectancy": 67.8, "internetPct": 37.0,
        "sourceLabel": "World Bank — Pakistan", "sourceUrl": "https://data.worldbank.org/country/pakistan",
        "note": "Large South Asian population; strategic location, growing IT and textile sectors."
    },
    "NP": {
        "name": "Nepal", "population": 30896590, "gdpUsd": 41000000000,
        "areaKm2": 147516, "continent": "Asia", "capital": "Kathmandu",
        "language": "Nepali", "currency": "Nepalese Rupee",
        "hdi": 0.602, "lifeExpectancy": 71.1, "internetPct": 38.0,
        "sourceLabel": "World Bank — Nepal", "sourceUrl": "https://data.worldbank.org/country/nepal",
        "note": "Mount Everest and Himalayan tourism; remittance-dependent with growing hydro power."
    },
    "LK": {
        "name": "Sri Lanka", "population": 22156000, "gdpUsd": 84000000000,
        "areaKm2": 65610, "continent": "Asia", "capital": "Sri Jayawardenepura Kotte",
        "language": "Sinhala / Tamil", "currency": "Sri Lankan Rupee",
        "hdi": 0.782, "lifeExpectancy": 77.2, "internetPct": 45.0,
        "sourceLabel": "World Bank — Sri Lanka", "sourceUrl": "https://data.worldbank.org/country/sri-lanka",
        "note": "Strategic Indian Ocean island; strong in tea, textiles, and tourism."
    },
    "MM": {
        "name": "Myanmar", "population": 54179306, "gdpUsd": 62000000000,
        "areaKm2": 676578, "continent": "Asia", "capital": "Naypyidaw",
        "language": "Burmese", "currency": "Myanmar Kyat",
        "hdi": 0.585, "lifeExpectancy": 67.3, "internetPct": 35.0,
        "sourceLabel": "World Bank — Myanmar", "sourceUrl": "https://data.worldbank.org/country/myanmar",
        "note": "Resource-rich Southeast Asian nation; jade, gas, and agricultural exports."
    },
    "KH": {
        "name": "Cambodia", "population": 16767842, "gdpUsd": 31000000000,
        "areaKm2": 181035, "continent": "Asia", "capital": "Phnom Penh",
        "language": "Khmer", "currency": "Cambodian Riel",
        "hdi": 0.600, "lifeExpectancy": 70.5, "internetPct": 50.0,
        "sourceLabel": "World Bank — Cambodia", "sourceUrl": "https://data.worldbank.org/country/cambodia",
        "note": "Mekong region growth story; garment exports, tourism (Angkor Wat), and agriculture."
    },
    "UZ": {
        "name": "Uzbekistan", "population": 35163944, "gdpUsd": 81000000000,
        "areaKm2": 448978, "continent": "Asia", "capital": "Tashkent",
        "language": "Uzbek", "currency": "Uzbekistani Som",
        "hdi": 0.727, "lifeExpectancy": 72.0, "internetPct": 58.0,
        "sourceLabel": "World Bank — Uzbekistan", "sourceUrl": "https://data.worldbank.org/country/uzbekistan",
        "note": "Central Asia's most populous country; major cotton, gas, and gold producer."
    },
    "KZ": {
        "name": "Kazakhstan", "population": 19606633, "gdpUsd": 237000000000,
        "areaKm2": 2724900, "continent": "Asia", "capital": "Astana",
        "language": "Kazakh / Russian", "currency": "Kazakhstani Tenge",
        "hdi": 0.811, "lifeExpectancy": 74.0, "internetPct": 84.0,
        "sourceLabel": "World Bank — Kazakhstan", "sourceUrl": "https://data.worldbank.org/country/kazakhstan",
        "note": "Largest Central Asian economy; vast oil, mineral, and agricultural resources."
    },
    "AZ": {
        "name": "Azerbaijan", "population": 10300205, "gdpUsd": 72000000000,
        "areaKm2": 86600, "continent": "Asia", "capital": "Baku",
        "language": "Azerbaijani", "currency": "Azerbaijani Manat",
        "hdi": 0.760, "lifeExpectancy": 73.3, "internetPct": 84.0,
        "sourceLabel": "World Bank — Azerbaijan", "sourceUrl": "https://data.worldbank.org/country/azerbaijan",
        "note": "Caspian Sea oil and gas producer; diversifying into transport and logistics."
    },
    "GE": {
        "name": "Georgia", "population": 3728573, "gdpUsd": 25000000000,
        "areaKm2": 69700, "continent": "Europe / Asia", "capital": "Tbilisi",
        "language": "Georgian", "currency": "Georgian Lari",
        "hdi": 0.802, "lifeExpectancy": 73.4, "internetPct": 76.0,
        "sourceLabel": "World Bank — Georgia", "sourceUrl": "https://data.worldbank.org/country/georgia",
        "note": "Strategic Caucasus nation; growing tourism, wine, and logistics sectors."
    },
    "RS": {
        "name": "Serbia", "population": 6663449, "gdpUsd": 72000000000,
        "areaKm2": 88361, "continent": "Europe", "capital": "Belgrade",
        "language": "Serbian", "currency": "Serbian Dinar",
        "hdi": 0.805, "lifeExpectancy": 75.6, "internetPct": 79.0,
        "sourceLabel": "World Bank — Serbia", "sourceUrl": "https://data.worldbank.org/country/serbia",
        "note": "Growing Balkan economy; IT services, automotive parts, and agriculture."
    },
    "HR": {
        "name": "Croatia", "population": 3855600, "gdpUsd": 80000000000,
        "areaKm2": 56594, "continent": "Europe", "capital": "Zagreb",
        "language": "Croatian", "currency": "Euro",
        "hdi": 0.862, "lifeExpectancy": 78.5, "internetPct": 81.0,
        "sourceLabel": "World Bank — Croatia", "sourceUrl": "https://data.worldbank.org/country/croatia",
        "note": "Adriatic tourism destination; EU member since 2013, adopted euro in 2023."
    },
    "BG": {
        "name": "Bulgaria", "population": 6447710, "gdpUsd": 103000000000,
        "areaKm2": 110994, "continent": "Europe", "capital": "Sofia",
        "language": "Bulgarian", "currency": "Bulgarian Lev",
        "hdi": 0.799, "lifeExpectancy": 74.9, "internetPct": 72.0,
        "sourceLabel": "World Bank — Bulgaria", "sourceUrl": "https://data.worldbank.org/country/bulgaria",
        "note": "Balkan EU member; strong in IT outsourcing, agriculture, and manufacturing."
    },
    "SK": {
        "name": "Slovakia", "population": 5460185, "gdpUsd": 128000000000,
        "areaKm2": 49037, "continent": "Europe", "capital": "Bratislava",
        "language": "Slovak", "currency": "Euro",
        "hdi": 0.857, "lifeExpectancy": 78.0, "internetPct": 89.0,
        "sourceLabel": "World Bank — Slovakia", "sourceUrl": "https://data.worldbank.org/country/slovakia",
        "note": "Highest GDP per capita in the Visegrad group; automotive industry backbone."
    },
    "SI": {
        "name": "Slovenia", "population": 2117674, "gdpUsd": 64000000000,
        "areaKm2": 20273, "continent": "Europe", "capital": "Ljubljana",
        "language": "Slovene", "currency": "Euro",
        "hdi": 0.918, "lifeExpectancy": 81.2, "internetPct": 87.0,
        "sourceLabel": "World Bank — Slovenia", "sourceUrl": "https://data.worldbank.org/country/slovenia",
        "note": "High-income Alpine EU member; pharmaceuticals, automotive parts, and tourism."
    },
    "LT": {
        "name": "Lithuania", "population": 2800667, "gdpUsd": 79000000000,
        "areaKm2": 65300, "continent": "Europe", "capital": "Vilnius",
        "language": "Lithuanian", "currency": "Euro",
        "hdi": 0.879, "lifeExpectancy": 76.5, "internetPct": 86.0,
        "sourceLabel": "World Bank — Lithuania", "sourceUrl": "https://data.worldbank.org/country/lithuania",
        "note": "Baltic EU leader in fintech; strong laser and biotech sectors."
    },
    "LV": {
        "name": "Latvia", "population": 1879383, "gdpUsd": 46000000000,
        "areaKm2": 64589, "continent": "Europe", "capital": "Riga",
        "language": "Latvian", "currency": "Euro",
        "hdi": 0.875, "lifeExpectancy": 75.5, "internetPct": 87.0,
        "sourceLabel": "World Bank — Latvia", "sourceUrl": "https://data.worldbank.org/country/latvia",
        "note": "Baltic EU economy; strong in wood products, logistics, and IT services."
    },
    "EE": {
        "name": "Estonia", "population": 1348840, "gdpUsd": 42000000000,
        "areaKm2": 45228, "continent": "Europe", "capital": "Tallinn",
        "language": "Estonian", "currency": "Euro",
        "hdi": 0.899, "lifeExpectancy": 78.9, "internetPct": 95.0,
        "sourceLabel": "World Bank — Estonia", "sourceUrl": "https://data.worldbank.org/country/estonia",
        "note": "Digital society pioneer; e-residency, Skype, and advanced e-government services."
    },
    "IS": {
        "name": "Iceland", "population": 376248, "gdpUsd": 28000000000,
        "areaKm2": 103000, "continent": "Europe", "capital": "Reykjavik",
        "language": "Icelandic", "currency": "Icelandic Krona",
        "hdi": 0.959, "lifeExpectancy": 83.0, "internetPct": 99.0,
        "sourceLabel": "World Bank — Iceland", "sourceUrl": "https://data.worldbank.org/country/iceland",
        "note": "Renewable energy leader; geothermal and hydro power drive tourism and industry."
    },
    "LU": {
        "name": "Luxembourg", "population": 650000, "gdpUsd": 86000000000,
        "areaKm2": 2586, "continent": "Europe", "capital": "Luxembourg City",
        "language": "Luxembourgish / French / German", "currency": "Euro",
        "hdi": 0.927, "lifeExpectancy": 82.5, "internetPct": 97.0,
        "sourceLabel": "World Bank — Luxembourg", "sourceUrl": "https://data.worldbank.org/country/luxembourg",
        "note": "Wealthiest EU country per capita; global investment fund and banking hub."
    },
    "MT": {
        "name": "Malta", "population": 535064, "gdpUsd": 20000000000,
        "areaKm2": 316, "continent": "Europe", "capital": "Valletta",
        "language": "Maltese / English", "currency": "Euro",
        "hdi": 0.918, "lifeExpectancy": 83.2, "internetPct": 87.0,
        "sourceLabel": "World Bank — Malta", "sourceUrl": "https://data.worldbank.org/country/malta",
        "note": "Mediterranean island economy; iGaming, finance, tourism, and blockchain hub."
    },
    "CY": {
        "name": "Cyprus", "population": 1260138, "gdpUsd": 32000000000,
        "areaKm2": 9251, "continent": "Europe", "capital": "Nicosia",
        "language": "Greek / Turkish", "currency": "Euro",
        "hdi": 0.907, "lifeExpectancy": 82.3, "internetPct": 86.0,
        "sourceLabel": "World Bank — Cyprus", "sourceUrl": "https://data.worldbank.org/country/cyprus",
        "note": "Eastern Mediterranean business hub; shipping, tourism, and financial services."
    },
    "CR": {
        "name": "Costa Rica", "population": 5212173, "gdpUsd": 70000000000,
        "areaKm2": 51100, "continent": "North America", "capital": "San José",
        "language": "Spanish", "currency": "Costa Rican Colón",
        "hdi": 0.809, "lifeExpectancy": 80.1, "internetPct": 82.0,
        "sourceLabel": "World Bank — Costa Rica", "sourceUrl": "https://data.worldbank.org/country/costa-rica",
        "note": "Ecotourism paradise; renewable energy leader and stable democracy."
    },
    "PA": {
        "name": "Panama", "population": 4408581, "gdpUsd": 82000000000,
        "areaKm2": 75417, "continent": "North America", "capital": "Panama City",
        "language": "Spanish", "currency": "Panamanian Balboa / USD",
        "hdi": 0.805, "lifeExpectancy": 78.6, "internetPct": 72.0,
        "sourceLabel": "World Bank — Panama", "sourceUrl": "https://data.worldbank.org/country/panama",
        "note": "Panama Canal-driven economy; major banking and logistics hub."
    },
    "DO": {
        "name": "Dominican Republic", "population": 11228821, "gdpUsd": 120000000000,
        "areaKm2": 48671, "continent": "North America", "capital": "Santo Domingo",
        "language": "Spanish", "currency": "Dominican Peso",
        "hdi": 0.767, "lifeExpectancy": 74.8, "internetPct": 75.0,
        "sourceLabel": "World Bank — Dominican Republic", "sourceUrl": "https://data.worldbank.org/country/dominican-republic",
        "note": "Fastest-growing Caribbean economy; tourism, mining, and free-trade zones."
    },
    "GT": {
        "name": "Guatemala", "population": 17608483, "gdpUsd": 104000000000,
        "areaKm2": 108889, "continent": "North America", "capital": "Guatemala City",
        "language": "Spanish", "currency": "Guatemalan Quetzal",
        "hdi": 0.663, "lifeExpectancy": 74.3, "internetPct": 50.0,
        "sourceLabel": "World Bank — Guatemala", "sourceUrl": "https://data.worldbank.org/country/guatemala",
        "note": "Largest Central American economy; strong agricultural and remittance inflows."
    },
    "UY": {
        "name": "Uruguay", "population": 3422794, "gdpUsd": 76000000000,
        "areaKm2": 176215, "continent": "South America", "capital": "Montevideo",
        "language": "Spanish", "currency": "Uruguayan Peso",
        "hdi": 0.830, "lifeExpectancy": 78.5, "internetPct": 86.0,
        "sourceLabel": "World Bank — Uruguay", "sourceUrl": "https://data.worldbank.org/country/uruguay",
        "note": "Stable South American democracy; strong in agriculture, renewables, and tech."
    },
    "PY": {
        "name": "Paraguay", "population": 6861524, "gdpUsd": 47000000000,
        "areaKm2": 406752, "continent": "South America", "capital": "Asunción",
        "language": "Spanish / Guaraní", "currency": "Paraguayan Guarani",
        "hdi": 0.724, "lifeExpectancy": 74.3, "internetPct": 62.0,
        "sourceLabel": "World Bank — Paraguay", "sourceUrl": "https://data.worldbank.org/country/paraguay",
        "note": "Agricultural powerhouse; soy, beef, and hydroelectric energy (Itaipu Dam)."
    },
    "BO": {
        "name": "Bolivia", "population": 12224110, "gdpUsd": 45000000000,
        "areaKm2": 1098581, "continent": "South America", "capital": "Sucre (constitutional)",
        "language": "Spanish / Quechua / Aymara", "currency": "Bolivian Boliviano",
        "hdi": 0.692, "lifeExpectancy": 72.0, "internetPct": 60.0,
        "sourceLabel": "World Bank — Bolivia", "sourceUrl": "https://data.worldbank.org/country/bolivia",
        "note": "Resource-rich Andean nation; lithium, natural gas, and coca production."
    },
    "EC": {
        "name": "Ecuador", "population": 18190484, "gdpUsd": 119000000000,
        "areaKm2": 283561, "continent": "South America", "capital": "Quito",
        "language": "Spanish", "currency": "US Dollar",
        "hdi": 0.740, "lifeExpectancy": 77.9, "internetPct": 66.0,
        "sourceLabel": "World Bank — Ecuador", "sourceUrl": "https://data.worldbank.org/country/ecuador",
        "note": "Dollarized economy; major oil, banana, and shrimp exporter."
    },
    "VE": {
        "name": "Venezuela", "population": 29000000, "gdpUsd": 92000000000,
        "areaKm2": 916445, "continent": "South America", "capital": "Caracas",
        "language": "Spanish", "currency": "Bolívar",
        "hdi": 0.690, "lifeExpectancy": 72.1, "internetPct": 62.0,
        "sourceLabel": "World Bank — Venezuela", "sourceUrl": "https://data.worldbank.org/country/venezuela",
        "note": "Largest proven oil reserves; complex economic and humanitarian situation."
    },
    "TZ": {
        "name": "Tanzania", "population": 65497748, "gdpUsd": 75000000000,
        "areaKm2": 947300, "continent": "Africa", "capital": "Dodoma",
        "language": "Swahili / English", "currency": "Tanzanian Shilling",
        "hdi": 0.549, "lifeExpectancy": 66.2, "internetPct": 30.0,
        "sourceLabel": "World Bank — Tanzania", "sourceUrl": "https://data.worldbank.org/country/tanzania",
        "note": "East African growth story; tourism, mining, and agricultural potential."
    },
    "UG": {
        "name": "Uganda", "population": 48582334, "gdpUsd": 53000000000,
        "areaKm2": 241038, "continent": "Africa", "capital": "Kampala",
        "language": "English / Swahili", "currency": "Ugandan Shilling",
        "hdi": 0.525, "lifeExpectancy": 63.8, "internetPct": 27.0,
        "sourceLabel": "World Bank — Uganda", "sourceUrl": "https://data.worldbank.org/country/uganda",
        "note": "Growing East African economy; agriculture, oil discoveries, and tech innovation."
    },
    "SN": {
        "name": "Senegal", "population": 17763163, "gdpUsd": 31000000000,
        "areaKm2": 196722, "continent": "Africa", "capital": "Dakar",
        "language": "French", "currency": "West African CFA Franc",
        "hdi": 0.517, "lifeExpectancy": 68.3, "internetPct": 43.0,
        "sourceLabel": "World Bank — Senegal", "sourceUrl": "https://data.worldbank.org/country/senegal",
        "note": "Stable West African democracy; emerging oil and gas producer."
    },
    "CM": {
        "name": "Cameroon", "population": 27914536, "gdpUsd": 45000000000,
        "areaKm2": 475442, "continent": "Africa", "capital": "Yaoundé",
        "language": "French / English", "currency": "Central African CFA Franc",
        "hdi": 0.585, "lifeExpectancy": 61.4, "internetPct": 35.0,
        "sourceLabel": "World Bank — Cameroon", "sourceUrl": "https://data.worldbank.org/country/cameroon",
        "note": "Central African regional hub; agriculture, oil, and timber exports."
    },
    "CI": {
        "name": "Côte d'Ivoire", "population": 28160542, "gdpUsd": 77000000000,
        "areaKm2": 322463, "continent": "Africa", "capital": "Yamoussoukro",
        "language": "French", "currency": "West African CFA Franc",
        "hdi": 0.550, "lifeExpectancy": 58.6, "internetPct": 46.0,
        "sourceLabel": "World Bank — Côte d'Ivoire", "sourceUrl": "https://data.worldbank.org/country/cote-d-ivoire",
        "note": "World's largest cocoa producer; fastest-growing West African economy."
    },
    "ZM": {
        "name": "Zambia", "population": 20569737, "gdpUsd": 28000000000,
        "areaKm2": 752612, "continent": "Africa", "capital": "Lusaka",
        "language": "English", "currency": "Zambian Kwacha",
        "hdi": 0.565, "lifeExpectancy": 64.8, "internetPct": 27.0,
        "sourceLabel": "World Bank — Zambia", "sourceUrl": "https://data.worldbank.org/country/zambia",
        "note": "Major copper producer; potential in agriculture, hydro, and tourism."
    },
    "ZW": {
        "name": "Zimbabwe", "population": 16665409, "gdpUsd": 32000000000,
        "areaKm2": 390757, "continent": "Africa", "capital": "Harare",
        "language": "English / Shona / Ndebele", "currency": "Zimbabwe Gold (ZiG)",
        "hdi": 0.573, "lifeExpectancy": 61.5, "internetPct": 32.0,
        "sourceLabel": "World Bank — Zimbabwe", "sourceUrl": "https://data.worldbank.org/country/zimbabwe",
        "note": "Rich in mineral resources; gold, platinum, and diamond mining."
    },
    "MZ": {
        "name": "Mozambique", "population": 33897354, "gdpUsd": 20000000000,
        "areaKm2": 801590, "continent": "Africa", "capital": "Maputo",
        "language": "Portuguese", "currency": "Mozambican Metical",
        "hdi": 0.461, "lifeExpectancy": 62.0, "internetPct": 21.0,
        "sourceLabel": "World Bank — Mozambique", "sourceUrl": "https://data.worldbank.org/country/mozambique",
        "note": "Emerging LNG exporter; coal, aluminum, and agricultural potential."
    },
    "MG": {
        "name": "Madagascar", "population": 30325732, "gdpUsd": 16000000000,
        "areaKm2": 587041, "continent": "Africa", "capital": "Antananarivo",
        "language": "Malagasy / French", "currency": "Malagasy Ariary",
        "hdi": 0.501, "lifeExpectancy": 67.2, "internetPct": 14.0,
        "sourceLabel": "World Bank — Madagascar", "sourceUrl": "https://data.worldbank.org/country/madagascar",
        "note": "Unique biodiversity hotspot; vanilla, textile, and mining sectors."
    },
    "SD": {
        "name": "Sudan", "population": 48874207, "gdpUsd": 25000000000,
        "areaKm2": 1886068, "continent": "Africa", "capital": "Khartoum",
        "language": "Arabic / English", "currency": "Sudanese Pound",
        "hdi": 0.508, "lifeExpectancy": 66.0, "internetPct": 28.0,
        "sourceLabel": "World Bank — Sudan", "sourceUrl": "https://data.worldbank.org/country/sudan",
        "note": "Nile Basin agricultural potential; gold mining and livestock exports."
    },
    "BY": {
        "name": "Belarus", "population": 9300000, "gdpUsd": 68000000000,
        "areaKm2": 207600, "continent": "Europe", "capital": "Minsk",
        "language": "Belarusian / Russian", "currency": "Belarusian Ruble",
        "hdi": 0.801, "lifeExpectancy": 74.8, "internetPct": 85.0,
        "sourceLabel": "World Bank — Belarus", "sourceUrl": "https://data.worldbank.org/country/belarus",
        "note": "Eastern European economy; manufacturing, agriculture, and IT services."
    },
    "MN": {
        "name": "Mongolia", "population": 3398366, "gdpUsd": 20000000000,
        "areaKm2": 1564116, "continent": "Asia", "capital": "Ulaanbaatar",
        "language": "Mongolian", "currency": "Mongolian Tögrög",
        "hdi": 0.741, "lifeExpectancy": 71.6, "internetPct": 63.0,
        "sourceLabel": "World Bank — Mongolia", "sourceUrl": "https://data.worldbank.org/country/mongolia",
        "note": "Mineral-rich nomadic nation; copper, coal, and gold exports."
    },
    "LA": {
        "name": "Laos", "population": 7529475, "gdpUsd": 20000000000,
        "areaKm2": 236800, "continent": "Asia", "capital": "Vientiane",
        "language": "Lao", "currency": "Lao Kip",
        "hdi": 0.607, "lifeExpectancy": 68.4, "internetPct": 34.0,
        "sourceLabel": "World Bank — Laos", "sourceUrl": "https://data.worldbank.org/country/lao-pdr",
        "note": "Mekong region economy; hydroelectric power and mining exports."
    },
    "KG": {
        "name": "Kyrgyzstan", "population": 6975000, "gdpUsd": 12000000000,
        "areaKm2": 199951, "continent": "Asia", "capital": "Bishkek",
        "language": "Kyrgyz / Russian", "currency": "Kyrgyzstani Som",
        "hdi": 0.692, "lifeExpectancy": 71.8, "internetPct": 55.0,
        "sourceLabel": "World Bank — Kyrgyzstan", "sourceUrl": "https://data.worldbank.org/country/kyrgyz-republic",
        "note": "Central Asian mountain economy; gold mining and hydro power."
    },
    "TJ": {
        "name": "Tajikistan", "population": 10143543, "gdpUsd": 12000000000,
        "areaKm2": 143100, "continent": "Asia", "capital": "Dushanbe",
        "language": "Tajik", "currency": "Tajikistani Somoni",
        "hdi": 0.679, "lifeExpectancy": 71.6, "internetPct": 32.0,
        "sourceLabel": "World Bank — Tajikistan", "sourceUrl": "https://data.worldbank.org/country/tajikistan",
        "note": "Poorest Central Asian nation; remittance-dependent with hydro potential."
    },
    "TM": {
        "name": "Turkmenistan", "population": 6516100, "gdpUsd": 76000000000,
        "areaKm2": 488100, "continent": "Asia", "capital": "Ashgabat",
        "language": "Turkmen", "currency": "Turkmen Manat",
        "hdi": 0.745, "lifeExpectancy": 70.0, "internetPct": 22.0,
        "sourceLabel": "World Bank — Turkmenistan", "sourceUrl": "https://data.worldbank.org/country/turkmenistan",
        "note": "Fourth-largest natural gas reserves; centrally planned economy."
    },
    "AF": {
        "name": "Afghanistan", "population": 41128771, "gdpUsd": 14000000000,
        "areaKm2": 652230, "continent": "Asia", "capital": "Kabul",
        "language": "Pashto / Dari", "currency": "Afghan Afghani",
        "hdi": 0.478, "lifeExpectancy": 64.8, "internetPct": 18.0,
        "sourceLabel": "World Bank — Afghanistan", "sourceUrl": "https://data.worldbank.org/country/afghanistan",
        "note": "Resilient population; mineral wealth, agriculture, and transit potential."
    },
    "MM": {
        "name": "Myanmar", "population": 54179306, "gdpUsd": 62000000000,
        "areaKm2": 676578, "continent": "Asia", "capital": "Naypyidaw",
        "language": "Burmese", "currency": "Myanmar Kyat",
        "hdi": 0.585, "lifeExpectancy": 67.3, "internetPct": 35.0,
        "sourceLabel": "World Bank — Myanmar", "sourceUrl": "https://data.worldbank.org/country/myanmar",
        "note": "Southeast Asian nation rich in jade, gas, and agricultural resources."
    },
    "CU": {
        "name": "Cuba", "population": 11194449, "gdpUsd": 107000000000,
        "areaKm2": 109884, "continent": "North America", "capital": "Havana",
        "language": "Spanish", "currency": "Cuban Peso",
        "hdi": 0.764, "lifeExpectancy": 78.8, "internetPct": 40.0,
        "sourceLabel": "World Bank — Cuba", "sourceUrl": "https://data.worldbank.org/country/cuba",
        "note": "Caribbean island with high human development; tourism, biotech, and medical exports."
    },
    "PR": {
        "name": "Puerto Rico", "population": 3265314, "gdpUsd": 113000000000,
        "areaKm2": 9104, "continent": "North America", "capital": "San Juan",
        "language": "Spanish / English", "currency": "US Dollar",
        "hdi": 0.850, "lifeExpectancy": 80.2, "internetPct": 78.0,
        "sourceLabel": "World Bank — Puerto Rico", "sourceUrl": "https://data.worldbank.org/country/puerto-rico",
        "note": "US territory with manufacturing, pharma, and tourism economy."
    },
    "JO": {
        "name": "Jordan", "population": 11148278, "gdpUsd": 52000000000,
        "areaKm2": 89342, "continent": "Asia", "capital": "Amman",
        "language": "Arabic", "currency": "Jordanian Dinar",
        "hdi": 0.736, "lifeExpectancy": 77.0, "internetPct": 71.0,
        "sourceLabel": "World Bank — Jordan", "sourceUrl": "https://data.worldbank.org/country/jordan",
        "note": "Stable Middle Eastern kingdom; services, tourism, and IT sectors."
    },
    "LB": {
        "name": "Lebanon", "population": 5489739, "gdpUsd": 18000000000,
        "areaKm2": 10452, "continent": "Asia", "capital": "Beirut",
        "language": "Arabic / French", "currency": "Lebanese Pound",
        "hdi": 0.723, "lifeExpectancy": 79.0, "internetPct": 87.0,
        "sourceLabel": "World Bank — Lebanon", "sourceUrl": "https://data.worldbank.org/country/lebanon",
        "note": "Mediterranean nation with diaspora-driven economy and banking tradition."
    },
    "OM": {
        "name": "Oman", "population": 4576298, "gdpUsd": 108000000000,
        "areaKm2": 309500, "continent": "Asia", "capital": "Muscat",
        "language": "Arabic", "currency": "Omani Rial",
        "hdi": 0.819, "lifeExpectancy": 77.5, "internetPct": 93.0,
        "sourceLabel": "World Bank — Oman", "sourceUrl": "https://data.worldbank.org/country/oman",
        "note": "Gulf state diversifying from oil; logistics, tourism, and manufacturing."
    },
    "BH": {
        "name": "Bahrain", "population": 1472233, "gdpUsd": 44000000000,
        "areaKm2": 765, "continent": "Asia", "capital": "Manama",
        "language": "Arabic", "currency": "Bahraini Dinar",
        "hdi": 0.888, "lifeExpectancy": 78.0, "internetPct": 98.0,
        "sourceLabel": "World Bank — Bahrain", "sourceUrl": "https://data.worldbank.org/country/bahrain",
        "note": "Gulf financial center; first post-oil diversification story in the region."
    },
    "YE": {
        "name": "Yemen", "population": 34449825, "gdpUsd": 17000000000,
        "areaKm2": 527968, "continent": "Asia", "capital": "Sana'a",
        "language": "Arabic", "currency": "Yemeni Rial",
        "hdi": 0.424, "lifeExpectancy": 66.1, "internetPct": 26.0,
        "sourceLabel": "World Bank — Yemen", "sourceUrl": "https://data.worldbank.org/country/yemen",
        "note": "Ancient civilization facing humanitarian challenges; strategic Bab el-Mandeb strait."
    },
    "SY": {
        "name": "Syria", "population": 22125249, "gdpUsd": 15000000000,
        "areaKm2": 185180, "continent": "Asia", "capital": "Damascus",
        "language": "Arabic", "currency": "Syrian Pound",
        "hdi": 0.577, "lifeExpectancy": 72.7, "internetPct": 35.0,
        "sourceLabel": "World Bank — Syria", "sourceUrl": "https://data.worldbank.org/country/syria",
        "note": "Historical Levantine nation; ongoing reconstruction and agricultural potential."
    },
    "IQ": {
        "name": "Iraq", "population": 44496122, "gdpUsd": 264000000000,
        "areaKm2": 438317, "continent": "Asia", "capital": "Baghdad",
        "language": "Arabic / Kurdish", "currency": "Iraqi Dinar",
        "hdi": 0.673, "lifeExpectancy": 71.2, "internetPct": 60.0,
        "sourceLabel": "World Bank — Iraq", "sourceUrl": "https://data.worldbank.org/country/iraq",
        "note": "OPEC oil giant; Mesopotamian heritage and reconstruction needs."
    },
    "LV": {
        "name": "Latvia", "population": 1879383, "gdpUsd": 46000000000,
        "areaKm2": 64589, "continent": "Europe", "capital": "Riga",
        "language": "Latvian", "currency": "Euro",
        "hdi": 0.875, "lifeExpectancy": 75.5, "internetPct": 87.0,
        "sourceLabel": "World Bank — Latvia", "sourceUrl": "https://data.worldbank.org/country/latvia",
        "note": "Baltic EU member; strong in IT, logistics, and wood products."
    },
    "BW": {
        "name": "Botswana", "population": 2630296, "gdpUsd": 20000000000,
        "areaKm2": 581730, "continent": "Africa", "capital": "Gaborone",
        "language": "English / Tswana", "currency": "Botswana Pula",
        "hdi": 0.703, "lifeExpectancy": 70.2, "internetPct": 47.0,
        "sourceLabel": "World Bank — Botswana", "sourceUrl": "https://data.worldbank.org/country/botswana",
        "note": "Africa's longest continuous democracy; diamond-driven economic success."
    },
    "NA": {
        "name": "Namibia", "population": 2604172, "gdpUsd": 13000000000,
        "areaKm2": 825615, "continent": "Africa", "capital": "Windhoek",
        "language": "English", "currency": "Namibian Dollar",
        "hdi": 0.615, "lifeExpectancy": 64.5, "internetPct": 51.0,
        "sourceLabel": "World Bank — Namibia", "sourceUrl": "https://data.worldbank.org/country/namibia",
        "note": "Stable southern African nation; mining, tourism, and fisheries."
    },
    "MU": {
        "name": "Mauritius", "population": 1299469, "gdpUsd": 16000000000,
        "areaKm2": 2040, "continent": "Africa", "capital": "Port Louis",
        "language": "English / French / Creole", "currency": "Mauritian Rupee",
        "hdi": 0.802, "lifeExpectancy": 74.5, "internetPct": 67.0,
        "sourceLabel": "World Bank — Mauritius", "sourceUrl": "https://data.worldbank.org/country/mauritius",
        "note": "Indian Ocean success story; diversified into finance, textiles, and tech."
    },
    "MV": {
        "name": "Maldives", "population": 521457, "gdpUsd": 6600000000,
        "areaKm2": 298, "continent": "Asia", "capital": "Malé",
        "language": "Dhivehi", "currency": "Maldivian Rufiyaa",
        "hdi": 0.762, "lifeExpectancy": 81.2, "internetPct": 74.0,
        "sourceLabel": "World Bank — Maldives", "sourceUrl": "https://data.worldbank.org/country/maldives",
        "note": "Low-lying island paradise; luxury tourism and climate resilience challenges."
    },
    "FJ": {
        "name": "Fiji", "population": 929766, "gdpUsd": 5500000000,
        "areaKm2": 18274, "continent": "Oceania", "capital": "Suva",
        "language": "English / Fijian / Hindi", "currency": "Fijian Dollar",
        "hdi": 0.731, "lifeExpectancy": 68.0, "internetPct": 70.0,
        "sourceLabel": "World Bank — Fiji", "sourceUrl": "https://data.worldbank.org/country/fiji",
        "note": "Pacific Island leader; tourism, remittances, and sugar exports."
    },
    "PG": {
        "name": "Papua New Guinea", "population": 10142619, "gdpUsd": 32000000000,
        "areaKm2": 462840, "continent": "Oceania", "capital": "Port Moresby",
        "language": "Tok Pisin / English / Hiri Motu", "currency": "Papua New Guinean Kina",
        "hdi": 0.568, "lifeExpectancy": 64.5, "internetPct": 12.0,
        "sourceLabel": "World Bank — PNG", "sourceUrl": "https://data.worldbank.org/country/papua-new-guinea",
        "note": "Resource-rich Pacific nation; LNG, gold, and coffee exports."
    },
    "MN": {
        "name": "Mongolia", "population": 3398366, "gdpUsd": 20000000000,
        "areaKm2": 1564116, "continent": "Asia", "capital": "Ulaanbaatar",
        "language": "Mongolian", "currency": "Mongolian Tögrög",
        "hdi": 0.741, "lifeExpectancy": 71.6, "internetPct": 63.0,
        "sourceLabel": "World Bank — Mongolia", "sourceUrl": "https://data.worldbank.org/country/mongolia",
        "note": "Vast steppe nation; copper and coal mining exports drive economy."
    },
    "HT": {
        "name": "Haiti", "population": 11724763, "gdpUsd": 25000000000,
        "areaKm2": 27750, "continent": "North America", "capital": "Port-au-Prince",
        "language": "French / Creole", "currency": "Haitian Gourde",
        "hdi": 0.552, "lifeExpectancy": 64.9, "internetPct": 16.0,
        "sourceLabel": "World Bank — Haiti", "sourceUrl": "https://data.worldbank.org/country/haiti",
        "note": "Caribbean nation with resilience; remittances and agricultural potential."
    },
}

# Remove duplicates by keeping last occurrence
_country_keys = list(COUNTRIES.keys())
_seen = {}
for k in _country_keys:
    _seen[k] = COUNTRIES[k]
COUNTRIES = _seen


@app.route("/api/countries")
def list_countries():
    """Return all countries (summary list)."""
    sort_by = request.args.get("sortBy", "name")
    sort_order = request.args.get("sortOrder", "asc")
    search_query = request.args.get("search", "").strip().lower()
    continent_filter = request.args.get("continent", "").strip()

    results = []
    for code, data in COUNTRIES.items():
        combined_name = data["name"].lower() + " " + code.lower()
        if search_query and search_query not in combined_name:
            continue
        if continent_filter and continent_filter.lower() != data.get("continent", "").lower():
            continue

        gdpPerCapita = round(data["gdpUsd"] / data["population"]) if data["population"] else 0
        results.append({
            "code": code,
            "name": data["name"],
            "population": data["population"],
            "gdpUsd": data["gdpUsd"],
            "gdpPerCapita": gdpPerCapita,
            "areaKm2": data["areaKm2"],
            "continent": data["continent"],
            "capital": data["capital"],
            "hdi": data["hdi"],
            "lifeExpectancy": data["lifeExpectancy"],
            "internetPct": data["internetPct"],
        })

    reverse = sort_order == "desc"
    known_sort_keys = {"name", "population", "gdpUsd", "gdpPerCapita", "areaKm2", "hdi",
                       "lifeExpectancy", "internetPct"}
    if sort_by in known_sort_keys:
        results.sort(key=lambda r: (r.get(sort_by) or 0), reverse=reverse)
    else:
        results.sort(key=lambda r: r["name"].lower(), reverse=reverse)

    return jsonify({
        "total": len(results),
        "countries": results,
    })


@app.route("/api/countries/<code>")
def get_country(code):
    """Return full details for a single country code (e.g. IT, US)."""
    upper = code.upper().strip()
    entry = COUNTRIES.get(upper)
    if not entry:
        return jsonify({"error": "Country not found", "code": upper}), 404

    gdpPerCapita = round(entry["gdpUsd"] / entry["population"]) if entry["population"] else 0
    density = round(entry["population"] / entry["areaKm2"], 2) if entry["areaKm2"] else 0

    return jsonify({
        "code": upper,
        **entry,
        "gdpPerCapita": gdpPerCapita,
        "density": density,
    })


@app.route("/api/compare")
def compare_countries():
    """Compare up to 5 countries side by side."""
    codes_raw = request.args.get("codes", "")
    codes = [c.strip().upper() for c in codes_raw.split(",") if c.strip()]
    if not codes:
        return jsonify({"error": "Provide at least one country code via ?codes=IT,US,CN"}), 400
    if len(codes) > 5:
        return jsonify({"error": "Maximum 5 countries for comparison"}), 400

    results = {}
    for c in codes:
        entry = COUNTRIES.get(c)
        if entry:
            gdpPerCapita = round(entry["gdpUsd"] / entry["population"]) if entry["population"] else 0
            density = round(entry["population"] / entry["areaKm2"], 2) if entry["areaKm2"] else 0
            results[c] = {
                "code": c,
                **entry,
                "gdpPerCapita": gdpPerCapita,
                "density": density,
            }

    return jsonify({
        "count": len(results),
        "comparison": results,
    })


@app.route("/api/continents")
def list_continents():
    """Return aggregated stats per continent."""
    groups = {}
    for code, data in COUNTRIES.items():
        cont = data.get("continent", "Unknown")
        if cont not in groups:
            groups[cont] = {
                "continent": cont,
                "countries": 0,
                "population": 0,
                "gdpUsd": 0,
                "areaKm2": 0,
            }
        groups[cont]["countries"] += 1
        groups[cont]["population"] += data["population"]
        groups[cont]["gdpUsd"] += data["gdpUsd"]
        groups[cont]["areaKm2"] += data["areaKm2"]

    return jsonify({
        "totalContinents": len(groups),
        "continents": list(groups.values()),
    })


@app.route("/api/top")
def top_countries():
    """Return top N countries by a given metric (default: gdpUsd, top 10)."""
    metric = request.args.get("metric", "gdpUsd")
    limit_str = request.args.get("limit", "10")
    try:
        limit = max(1, min(int(limit_str), 50))
    except ValueError:
        limit = 10

    valid_metrics = {"population", "gdpUsd", "gdpPerCapita", "areaKm2", "hdi", "lifeExpectancy", "internetPct"}
    if metric not in valid_metrics:
        return jsonify({"error": f"Invalid metric. Choose from: {', '.join(sorted(valid_metrics))}"}), 400

    ranked = []
    for code, data in COUNTRIES.items():
        gdpPerCapita = round(data["gdpUsd"] / data["population"]) if data["population"] else 0
        val = data.get(metric)
        if metric == "gdpPerCapita":
            val = gdpPerCapita
        ranked.append({
            "rank": 0,
            "code": code,
            "name": data["name"],
            "value": val if val is not None else 0,
        })

    ranked.sort(key=lambda r: r["value"], reverse=True)
    for i, r in enumerate(ranked):
        r["rank"] = i + 1

    return jsonify({
        "metric": metric,
        "limit": limit,
        "results": ranked[:limit],
    })


@app.route("/api/export.csv")
def export_csv():
    """Export all country data as CSV."""
    fields = [
        "code", "name", "continent", "capital", "population", "gdpUsd",
        "areaKm2", "hdi", "lifeExpectancy", "internetPct", "language", "currency"
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for code, data in COUNTRIES.items():
        row = {"code": code}
        for f in fields:
            if f != "code":
                row[f] = data.get(f, "")
        writer.writerow(row)

    csv_content = output.getvalue()
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=world_statistics_atlas.csv"},
    )


@app.route("/api/health")
def health():
    """Simple health check."""
    return jsonify({
        "status": "ok",
        "version": "2.0.0",
        "countriesLoaded": len(COUNTRIES),
        "continentsCovered": len(set(
            c.get("continent", "Unknown") for c in COUNTRIES.values()
        )),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)