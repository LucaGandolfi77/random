SEEDS = {
    "lattuga": {
        "key": "lattuga", "name": "Lattuga", "emoji": "\U0001F96C",
        "growth": 120, "sell": 20, "cost": 0, "lvl": 1, "tree": False,
        "kind": "foglia", "color": "#9ad179",
        "shop": "La classica. Cresce in fretta, perfetta per chi ha pollice verde pigro.",
    },
    "carota": {
        "key": "carota", "name": "Carota", "emoji": "\U0001F955",
        "growth": 300, "sell": 55, "cost": 30, "lvl": 1, "tree": False,
        "kind": "radice", "color": "#e89c4a",
        "shop": "Arancione, croccante e un po' timida sotto terra.",
    },
    "fragola": {
        "key": "fragola", "name": "Fragola", "emoji": "\U0001F353",
        "growth": 900, "sell": 130, "cost": 80, "lvl": 3, "tree": False,
        "kind": "frutto", "color": "#e85a7d",
        "shop": "Dolce come un abbraccio di Nonna Ortensia.",
    },
    "pomodoro": {
        "key": "pomodoro", "name": "Pomodoro", "emoji": "\U0001F345",
        "growth": 1800, "sell": 220, "cost": 130, "lvl": 3, "tree": False,
        "kind": "frutto", "color": "#d83f3f",
        "shop": "Rosso, tondo e un po' permaloso se lo prendi in giro.",
    },
    "girasole": {
        "key": "girasole", "name": "Girasole", "emoji": "\U0001F33B",
        "growth": 3600, "sell": 420, "cost": 260, "lvl": 6, "tree": False,
        "kind": "fiore", "color": "#f2c641",
        "shop": "Segue sempre il sole. \u00C8 il romanticone dell'orto.",
    },
    "rosa": {
        "key": "rosa", "name": "Rosa", "emoji": "\U0001F339",
        "growth": 7200, "sell": 850, "cost": 520, "lvl": 6, "tree": False,
        "kind": "fiore", "color": "#e3508e",
        "shop": "Bellissima e con le spine: guarda ma non toccare troppo.",
    },
    "zucca": {
        "key": "zucca", "name": "Zucca di Halloween", "emoji": "\U0001F383",
        "growth": 14400, "sell": 2200, "cost": 1300, "lvl": 10, "tree": False,
        "kind": "orto", "color": "#e07b1f", "seasonal": "Halloween",
        "shop": "\U0001F383 Coltivabile tutto l'anno! \"Ho il permesso nella serra stagionale\" dice Nonna Ortensia.",
    },
    "melo": {
        "key": "melo", "name": "Melo", "emoji": "\U0001F34E",
        "growth": 43200, "sell": 1500, "cost": 2000, "lvl": 10,
        "tree": True, "kind": "albero", "color": "#b03b2a",
        "shop": "Albero ricorrente: ogni raccolto non lo abbatte, riparte da solo. Una melita infinita!",
    },
    "fungo": {
        "key": "fungo", "name": "Fungo Magico", "emoji": "\U0001F344",
        "growth": 28800, "sell": 1100, "cost": 850, "lvl": 12, "tree": False,
        "kind": "orto", "color": "#d63f6a",
        "shop": "Non mangiarlo. Guardalo e basta. Canticchia di notte.",
    },
    "limone": {
        "key": "limone", "name": "Melo di Limoni", "emoji": "\U0001F34B",
        "growth": 86400, "sell": 3200, "cost": 4500, "lvl": 15,
        "tree": True, "kind": "albero", "color": "#ead54a",
        "shop": "Limonata infinita a portata di mano. Albero ricorrente.",
    },
    "natalizio": {
        "key": "natalizio", "name": "Albero di Natale", "emoji": "\U0001F384",
        "growth": 259200, "sell": 6000, "cost": 4000, "lvl": 20, "tree": False,
        "kind": "albero", "color": "#2a7d4a", "seasonal": "Natale",
        "shop": "\U0001F384 Tre giorni di pazienza... ma che magia quando \u00E8 pronto!",
    },
    "rosa_arcobaleno": {
        "key": "rosa_arcobaleno", "name": "Rosa Arcobaleno Leggendaria", "emoji": "\U0001F308",
        "growth": 604800, "sell": 60000, "cost": 24000, "lvl": 30, "tree": False,
        "kind": "leggendaria", "color": "#c08aff",
        "shop": "\U0001F308 Sette giorni. Una leggenda. Il traguardo finale dei giardinieri eroici.",
    },
}

for _, s in SEEDS.items():
    s.setdefault("seasonal", None)

STARTER_SEEDS = {"lattuga": 5, "carota": 3}

WATER_DECAY = 100.0 / (8 * 3600)
WATER_PER_DRINK = 100.0
PLOT_COSTS = [50, 200, 500, 1200, 2500, 5000, 9000, 15000, 25000, 40000,
              65000, 100000, 150000, 220000, 320000, 450000, 620000, 850000]
INITIAL_PLOTS = 2

LEVEL_XP = lambda lvl: 100 * (lvl ** 1.5)

SEASONAL_TIP = {
    "Halloween": "\U0001F383 Stagione delle zucche! Non guardare nelle orbite scavate...",
    "Natale": "\U0001F384 Tempo di alberi di Natale! Profumo di resina e miracoli.",
}