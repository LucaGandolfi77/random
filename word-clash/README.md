# WORD CLASH — Librerie in Guerra

Un gioco stile *Clash of Clans* ma fatto di parole, in italiano, zero dipendenze, tutto vanilla JS.

## Cosa fai
- **🏛️ Libreria** — costruisci e potenzia 13 edifici su una griglia 6×8 con tempi reali: il Catalogo Centrale
  sblocca gli altri, i bibliotecari (fino a 4) lavorano in parallelo, i muri sono copie comprabili a parte.
- **🪙 Monete** — prodotte da Banco, Caffè Letterario ed Edicola (raccolta manuale), custodite nella Cassaforte.
- **💛 Dobloni d'Oro** — la moneta speciale: salta i tempi di costruzione (1 doblone = 1 minuto), assume
  bibliotecari, costruisci la Fontana di Inchiostro. Si vincono a 3 stelle e con l'Impiccato.
- **📓 Esercito** — parole-truppa stampate dalla Tipografia: ogni parola ha HP/DPS/velocità **calcolati dalle sue
  lettere** (vocali = danno, doppie = HP, lettere rare = danno, parole corte = veloci). Tratti e tipi:
  fast/tank/crit/swarm/double, melee/splash/ranged, potenziati dal Laboratorio Etimologico.
- **🎮 Minigiochi** — Anagramma Lampo, Catena di Parole, Dattilo-Fulmine, L'Impiccato del Bibliotecario.
- **⚔️ Attacca** — battaglie **in tempo reale** contro 8 librerie rivali: schieri le parole sul perimetro della
  mappa, le unità marciano, abbattono muri e torrette; **Parola Libera** = digiti tu una parola (2–12 lettere)
  e la sua forza nasce dalle lettere. Stelle a 50/75/100% distrutto; a 3 stelle prendi i dobloni.
- **🛡️ Difesa offline** — mentre sei via, Torrette e muri difendono la libreria: se perdono, vieni saccheggiato.

## File
- `data/` — balance, edifici, parole, rivali, minigiochi, dizionario (tutto data-driven).
- `js/` — state, time, audio, save, economy, build, army, minigame, battle, ui, main.
- `tools/check.js` — valida sintassi e schema dei dati.
- `tools/smoke.js` — simula una partita completa in Node (battaglia inclusa).

## Comandi
```
node tools/check.js   # integrità dei file e dei dati
node tools/smoke.js   # partita simulata end-to-end
```
Poi apri `index.html` nel browser (o con un server statico).

## Le formule delle parole
```
HP  = 20  + 15×lettere + 15×doppie
DPS = 4   + 3×vocali   + 7×rare
VEL = clamp(110 - 6×lettere, 40, 110)   (parole corte = più veloci)
```
Moltiplicate dal boost del Laboratorio; melee range 36, ranged 150, splash 48.