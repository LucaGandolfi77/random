ACHIEVEMENTS = [
    {"id": "primo_germoglio", "name": "Primo Germoglio", "emoji": "\U0001F331",
     "desc": "Raccogli la tua prima pianta.", "metric": "harvests", "goal": 1, "reward_coins": 50, "reward_gems": 1},
    {"id": "mani_di_terra", "name": "Mani di Terra", "emoji": "\u270B",
     "desc": "Pianta 10 semi in totale.", "metric": "plants", "goal": 10, "reward_coins": 100, "reward_gems": 0},
    {"id": "innaffiatoio", "name": "Innaffiatoio Doc", "emoji": "\U0001F4A7",
     "desc": "Annaffia le piante 50 volte.", "metric": "waters", "goal": 50, "reward_coins": 80, "reward_gems": 0},
    {"id": "zucca_mania", "name": "Zucca-mania", "emoji": "\U0001F383",
     "desc": "Raccogli 5 zucche di Halloween.", "metric": "harvest_seed", "metric_seed": "zucca", "goal": 5, "reward_coins": 1000, "reward_gems": 3},
    {"id": "bianco_natale", "name": "Bianco Natale", "emoji": "\U0001F384",
     "desc": "Fai crescere 3 alberi di Natale.", "metric": "harvest_seed", "metric_seed": "natalizio", "goal": 3, "reward_coins": 5000, "reward_gems": 5},
    {"id": "latifondista", "name": "Il Latifondista", "emoji": "\U0001F9ED",
     "desc": "Possiedi 8 campi sbloccati.", "metric": "plots_owned", "goal": 8, "reward_coins": 500, "reward_gems": 0},
    {"id": "collezionista", "name": "Collezionista Botanico", "emoji": "\U0001F4D5",
     "desc": "Scopri 8 variet\u00E0 diverse nell'album.", "metric": "collection_size", "goal": 8, "reward_coins": 5000, "reward_gems": 10, "final": True},
    {"id": "arcobaleno", "name": "Giardiniere Eroico", "emoji": "\U0001F39E\uFE0F",
     "desc": "Fai crescere la leggendaria Rosa Arcobaleno.", "metric": "harvest_seed", "metric_seed": "rosa_arcobaleno", "goal": 1, "reward_coins": 20000, "reward_gems": 50, "final": True},
]

BY_ID = {a["id"]: a for a in ACHIEVEMENTS}

def all_ids():
    return [a["id"] for a in ACHIEVEMENTS]