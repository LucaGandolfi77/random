import random

PHRASES: dict[str, list[str]] = {
    "food": [
        "Umano! La mia ciotola è vuota. È una situazione critica. Intervieni.",
        "Ho fame. Il tuo ritardo è ingiustificato. Mi aspetto cibo, ora.",
        "La legge felina articolo 1: la ciotola deve sempre contenere cibo. Stai violando la legge.",
        "Sento odore di tonno e tu mi fai aspettare? Questo è oltraggio.",
        "Miao. (Tradotto: il gatto ha fame. Come sempre. Muoviti.)",
    ],
    "brushing": [
        "Sì, proprio lì. Non fermarti. Continua, servo fedele.",
        "Mmmh. Tollererò le tue attenzioni per altri 3 minuti. Poi bado io.",
        "Le mie orecchie non si spazzoleranno da sole. Bravo, così.",
        "Hai la mia approvazione. Per ora. Non deludermi.",
        "Ahhh... questo è il momento che rende sopportabile averti come umano.",
    ],
    "isolation": [
        "DOVE SONO?! Esigo un passaggio di ritorno. IMMEDIATAMENTE.",
        "Questa non è casa mia. Non c'è il mio divano. Questa è una prigione di lusso e io la disprezzo.",
        "Mi hai abbandonato in questa strana terra. Ti perdonerò solo con tonno. TANTO tonno.",
        "Sto valutando se questa stanza merita la mia presenza. Spoiler: no.",
        "Il silenzio è assordante. E la ciotola non c'è. 0 stelle, non consiglio.",
    ],
}

LOW_CONFIDENCE: list[str] = [
    "Miao. (Tradurre da felino è difficile, ma ho fatto del mio meglio.)",
    "Mmm... il tuo gatto sta parlando, ma la mia intelligenza artificiale è confusa. Prova a registrare meglio.",
    "Non sono sicuro di cosa voglia dire, ma probabilmente è colpa tua.",
    "Il tuo gatto ha parlato. Io non ho capito. Lui ti giudica.",
]


def get_phrase(intent: str, confidence: float) -> str:
    if confidence < 0.4:
        return random.choice(LOW_CONFIDENCE)
    return random.choice(PHRASES[intent])
