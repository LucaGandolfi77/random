# EV personale

Dashboard offline per la revisione settimanale dei KPI esistenziali.

Comprende anche:

- piano obiettivi e training da 30 minuti, con corpo libero, pavimento e due manubri da 13 kg;
- monitoraggio di sessioni, proteine, sonno, girovita, cyclette e cocktail;
- dieta indicativa per ricomposizione corporea, con pasti preparabili la sera prima e riscaldabili al microonde;
- profilo fisico modificabile, target calorici, macro, pasti per allenamento/riposo/serata sociale e lista della spesa.

## Avvio

```sh
python3 -m http.server 8124
```

Apri `http://localhost:8124` dalla directory `ev-personale/`.

I punteggi e le note restano nel `localStorage` del browser. Il pulsante `Esporta` scarica un JSON della review corrente.
